import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getDailyId, getMovie, randomMovie, todayUTC, secondsUntilUtcMidnight } from './_lib/data.js';
import { scrubPlot } from './_lib/scrub.js';
import { signRoundToken } from './_lib/token.js';

const GUESSES_ALLOWED = 6;

/**
 * GET /api/round?mode=daily|endless
 *
 * Returns the server-scrubbed plot and a round handle — never the id or title.
 *  - daily:   roundId = today's UTC date (resolved against the server schedule);
 *             response is identical for everyone all day, so it is edge-cached.
 *  - endless: roundToken = opaque HMAC token encoding the answer; not cached.
 */
export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const mode = req.query.mode === 'endless' ? 'endless' : 'daily';

  if (mode === 'daily') {
    const date = todayUTC();
    const id = getDailyId(date);
    const movie = id ? getMovie(id) : undefined;
    if (!movie) {
      return res.status(503).json({ error: 'No daily puzzle scheduled for today.' });
    }
    // Everyone gets the same daily all day → let the edge cache absorb the load.
    const ttl = secondsUntilUtcMidnight();
    res.setHeader('Cache-Control', `public, s-maxage=${ttl}, stale-while-revalidate=60`);
    return res.status(200).json({
      mode: 'daily',
      roundId: date,
      plot: scrubPlot(movie.plot, movie.primaryTitle, movie.originalTitle),
      guessesAllowed: GUESSES_ALLOWED,
    });
  }

  // Endless — random movie, answer rides in a signed token.
  const movie = randomMovie();
  res.setHeader('Cache-Control', 'no-store');
  return res.status(200).json({
    mode: 'endless',
    roundToken: signRoundToken(movie.id),
    plot: scrubPlot(movie.plot, movie.primaryTitle, movie.originalTitle),
    guessesAllowed: GUESSES_ALLOWED,
  });
}
