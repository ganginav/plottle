import type { DailyResult } from './types';

/**
 * Build the Wordle-style shareable summary.
 *   🟩 = the solving guess, 🟥 = a wrong guess (each = one revealed hint).
 *
 *   Plottle 2026-06-07
 *   🟥🟥🟩  (solved on guess 3)
 */
export function buildShareText(result: DailyResult, maxGuesses = 6): string {
  const squares: string[] = [];
  const wrong = result.solved ? result.guessUsed - 1 : result.guessUsed;
  for (let i = 0; i < wrong; i++) squares.push('🟥');
  if (result.solved) squares.push('🟩');

  const tail = result.solved
    ? `(solved on guess ${result.guessUsed})`
    : `(X/${maxGuesses} — not solved)`;

  return `Plottle ${result.date}\n${squares.join('')}  ${tail}\nhttps://plottle.vercel.app`;
}
