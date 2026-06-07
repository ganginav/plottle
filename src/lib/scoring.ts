/**
 * Scoring is purely a function of how few guesses a solve took. Pure +
 * unit-testable. Hints are tied to wrong guesses, so there is no hint accounting.
 */
export const GUESSES_ALLOWED = 7;

/** points[i] = score for solving on guess (i + 1). */
const POINTS = [100, 85, 70, 55, 40, 25, 10];

/** Score for solving on guess N (1-based). Unsolved → 0. */
export function scoreForGuess(guessNumber: number, solved: boolean): number {
  if (!solved) return 0;
  return POINTS[guessNumber - 1] ?? 0;
}

/** The hint ladder revealed by wrong guesses, in fixed order. */
export const HINT_LADDER = ['genres', 'year', 'runtime', 'rating', 'poster', 'title'] as const;

/** How many hints are visible after `wrongGuesses` wrong guesses (0–5). */
export function revealedHintCount(wrongGuesses: number): number {
  return Math.min(wrongGuesses, HINT_LADDER.length);
}
