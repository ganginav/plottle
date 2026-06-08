import type { VercelRequest, VercelResponse } from '@vercel/node';
import { kv } from './_lib/kv.js';
import { todayUTC } from './_lib/data.js';
import { rateLimit, clientIp } from './_lib/ratelimit.js';

/**
 * GET  /api/stats?date=YYYY-MM-DD   → today's worldwide aggregate
 * POST /api/stats { date, solved, guessUsed } → record an outcome, return aggregate
 *
 * Counts are kept in a Redis hash per date (field `g1..g7` for a solve on that guess,
 * `fail` for a loss). Self-reported and unauthenticated — like a Wordle-style stat,
 * a determined user could inflate it; the client submits once per day. If no KV store
 * is configured the endpoint reports `enabled: false` and the UI hides the section.
 */
const MAX_GUESSES = 7;

interface Aggregate {
  enabled: boolean;
  played: number;
  solved: number;
  byGuess: number[]; // length MAX_GUESSES; byGuess[i] = solves on guess i+1
  fails: number;
}

const empty = (enabled: boolean): Aggregate => ({
  enabled,
  played: 0,
  solved: 0,
  byGuess: Array<number>(MAX_GUESSES).fill(0),
  fails: 0,
});

async function readAggregate(date: string): Promise<Aggregate> {
  if (!kv) return empty(false);
  const h = (await kv.hgetall<Record<string, number | string>>(`pg:daily:${date}`)) ?? {};
  const byGuess = Array.from({ length: MAX_GUESSES }, (_, i) => Number(h[`g${i + 1}`] ?? 0));
  const fails = Number(h.fail ?? 0);
  const solved = byGuess.reduce((a, b) => a + b, 0);
  return { enabled: true, played: solved + fails, solved, byGuess, fails };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'no-store');

  const date = String(req.method === 'GET' ? req.query.date : (parseBody(req).date ?? ''));
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date > todayUTC()) {
    return res.status(400).json({ error: 'Invalid date.' });
  }

  if (req.method === 'GET') {
    return res.status(200).json(await readAggregate(date));
  }

  if (req.method === 'POST') {
    if (!rateLimit(`stats:${clientIp(req)}`, 20, 10_000)) {
      return res.status(429).json({ error: 'Too many requests.' });
    }
    if (kv) {
      const { solved, guessUsed } = parseBody(req) as { solved?: boolean; guessUsed?: number };
      const g = Number(guessUsed);
      const field = solved === true && Number.isInteger(g) && g >= 1 && g <= MAX_GUESSES ? `g${g}` : 'fail';
      await kv.hincrby(`pg:daily:${date}`, field, 1);
    }
    return res.status(200).json(await readAggregate(date));
  }

  res.setHeader('Allow', 'GET, POST');
  return res.status(405).json({ error: 'Method not allowed' });
}

function parseBody(req: VercelRequest): Record<string, unknown> {
  if (!req.body) return {};
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body) as Record<string, unknown>;
    } catch {
      return {};
    }
  }
  return req.body as Record<string, unknown>;
}
