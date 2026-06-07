import type { PrivateMovie } from './data.js';

export interface RevealedHints {
  genres?: string[];
  year?: number;
  runtimeSeconds?: number | null;
  rating?: { aggregateRating: number; voteCount: number };
  posterUrl?: string | null;
}

/**
 * Build the cumulative hint set unlocked after `wrongGuesses` wrong guesses.
 * Ladder order: genres → year → runtime → rating → poster. Hints are derived
 * server-side from the answer and never include the title/id.
 */
export function buildHints(movie: PrivateMovie, wrongGuesses: number): RevealedHints {
  const n = Math.max(0, Math.min(wrongGuesses, 5));
  const hints: RevealedHints = {};
  if (n >= 1) hints.genres = movie.genres;
  if (n >= 2) hints.year = movie.startYear;
  if (n >= 3) hints.runtimeSeconds = movie.runtimeSeconds;
  if (n >= 4 && movie.rating) hints.rating = movie.rating;
  if (n >= 5) hints.posterUrl = movie.posterUrl;
  return hints;
}
