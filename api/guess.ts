import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getDailyId, getMovie, todayUTC } from './_lib/data.js';
import { verifyRoundToken } from './_lib/token.js';
import { rateLimit, clientIp } from './_lib/ratelimit.js';
import { buildHints } from './_lib/hints.js';

/**
 * POST /api/guess  { roundId?, roundToken?, guessId?, reveal? }
 *
 * The server owns the answer. It recovers the answer id (daily: date lookup;
 * endless: HMAC verify), compares it to guessId, and returns only correct/gameOver.
 * The answer (id + title) is included ONLY once the round is over — a correct
 * guess, or the client signaling reveal=true (used all 6 guesses / gave up).
 */
export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Light brute-force speed bump.
  if (!rateLimit(`guess:${clientIp(req)}`, 40, 10_000)) {
    return res.status(429).json({ error: 'Too many guesses, slow down.' });
  }

  const body = (typeof req.body === 'string' ? safeParse(req.body) : req.body) ?? {};
  const { roundId, roundToken, guessId, guessNumber, reveal } = body as {
    roundId?: string;
    roundToken?: string;
    guessId?: string;
    guessNumber?: number;
    reveal?: boolean;
  };

  // Recover the answer id from the round handle.
  let answerId: string | undefined;
  if (typeof roundToken === 'string') {
    answerId = verifyRoundToken(roundToken) ?? undefined;
  } else if (typeof roundId === 'string') {
    // Daily: never resolve a future date (the schedule is pre-populated ahead).
    if (roundId <= todayUTC()) answerId = getDailyId(roundId);
  }

  const answerMovie = answerId ? getMovie(answerId) : undefined;
  if (!answerMovie) {
    return res.status(400).json({ error: 'Invalid or expired round.' });
  }

  const correct = typeof guessId === 'string' && guessId === answerMovie.id;
  const gameOver = correct || reveal === true;

  // On a wrong guess, unlock the next hint. `guessNumber` (this guess, 1-based)
  // equals the count of wrong guesses so far, since a correct guess ends the round.
  // It only gates hints, never correctness — the answer id/title stays hidden
  // until the round is over (an accepted, documented soft limit, like Wordle).
  const wrongGuesses = correct ? 0 : Math.max(0, Number(guessNumber) || 0);

  res.setHeader('Cache-Control', 'no-store');
  return res.status(200).json({
    correct,
    gameOver,
    hints: buildHints(answerMovie, wrongGuesses),
    ...(gameOver ? { answer: { id: answerMovie.id, title: answerMovie.primaryTitle } } : {}),
  });
}

function safeParse(s: string): unknown {
  try {
    return JSON.parse(s);
  } catch {
    return undefined;
  }
}
