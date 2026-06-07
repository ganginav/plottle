import { describe, it, expect } from 'vitest';
import { scoreForGuess, revealedHintCount } from '../src/lib/scoring';
import { buildShareText } from '../src/lib/share';
import type { DailyResult } from '../src/lib/types';

describe('scoreForGuess', () => {
  it('matches the scoring table', () => {
    expect([1, 2, 3, 4, 5, 6, 7].map((g) => scoreForGuess(g, true))).toEqual([100, 85, 70, 55, 40, 25, 10]);
  });
  it('is zero when unsolved', () => {
    expect(scoreForGuess(3, false)).toBe(0);
  });
});

describe('revealedHintCount', () => {
  it('caps at 6 hints', () => {
    expect(revealedHintCount(0)).toBe(0);
    expect(revealedHintCount(3)).toBe(3);
    expect(revealedHintCount(7)).toBe(6);
  });
});

describe('buildShareText', () => {
  it('renders a solved-on-3 summary', () => {
    const r: DailyResult = {
      date: '2026-06-07',
      solved: true,
      guessUsed: 3,
      guessedIds: ['a', 'b', 'c'],
      answerId: 'c',
    };
    const text = buildShareText(r);
    expect(text).toContain('Plottle 2026-06-07');
    expect(text).toContain('🟥🟥🟩');
    expect(text).toContain('solved on guess 3');
  });

  it('renders a loss', () => {
    const r: DailyResult = {
      date: '2026-06-07',
      solved: false,
      guessUsed: 7,
      guessedIds: [],
      answerId: 'x',
    };
    expect(buildShareText(r)).toContain('🟥🟥🟥🟥🟥🟥🟥');
  });
});
