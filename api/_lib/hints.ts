import type { PrivateMovie } from './data.js';
import { obfuscateTitle } from './obfuscate.js';

export interface RevealedHints {
  genres?: string[];
  year?: number;
  runtimeSeconds?: number | null;
  rating?: { aggregateRating: number; voteCount: number };
  posterUrl?: string | null;
  /** Title with only first letters + word lengths shown (final hint). */
  obfuscatedTitle?: string;
}

export const HINT_LEVELS = 6;

/**
 * Build the cumulative hint set unlocked after `wrongGuesses` wrong guesses.
 * Ladder: genres → year → runtime → rating → poster → obfuscated title. Hints are
 * derived server-side from the answer; the obfuscated title reveals only first
 * letters + word lengths, never the full title/id.
 */
export function buildHints(movie: PrivateMovie, wrongGuesses: number): RevealedHints {
  const n = Math.max(0, Math.min(wrongGuesses, HINT_LEVELS));
  const hints: RevealedHints = {};
  if (n >= 1) hints.genres = movie.genres;
  if (n >= 2) hints.year = movie.startYear;
  if (n >= 3) hints.runtimeSeconds = movie.runtimeSeconds;
  if (n >= 4 && movie.rating) hints.rating = movie.rating;
  if (n >= 5) hints.posterUrl = movie.posterUrl;
  if (n >= 6) hints.obfuscatedTitle = obfuscateTitle(movie.primaryTitle);
  return hints;
}
