import type { DailyStats, DailyResult } from './types';

/** Thin, typed localStorage wrapper. Never throws (private-mode safe). */
function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
function write(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* quota / private mode — ignore */
  }
}

const K = {
  stats: 'pg:dailyStats',
  result: 'pg:dailyResult',
  endlessHigh: 'pg:endlessHigh',
  theme: 'pg:theme',
  seenHowTo: 'pg:seenHowTo',
} as const;

const EMPTY_STATS: DailyStats = {
  played: 0,
  wins: 0,
  currentStreak: 0,
  maxStreak: 0,
  distribution: [0, 0, 0, 0, 0, 0, 0],
};

export const getDailyStats = (): DailyStats => read(K.stats, EMPTY_STATS);

export const getDailyResult = (): DailyResult | null => read<DailyResult | null>(K.result, null);

/** Record a finished daily round once (idempotent per date). */
export function recordDailyResult(result: DailyResult): DailyStats {
  const prev = getDailyResult();
  if (prev?.date === result.date) {
    write(K.result, result);
    return getDailyStats(); // already counted today
  }

  const stats = getDailyStats();
  const yesterday = previousDate(result.date);
  const continuingStreak = prev?.date === yesterday && prev.solved;

  const next: DailyStats = {
    played: stats.played + 1,
    wins: stats.wins + (result.solved ? 1 : 0),
    currentStreak: result.solved ? (continuingStreak ? stats.currentStreak + 1 : 1) : 0,
    maxStreak: stats.maxStreak,
    distribution: [...stats.distribution],
  };
  if (result.solved) {
    next.maxStreak = Math.max(stats.maxStreak, next.currentStreak);
    next.distribution[result.guessUsed - 1] += 1;
  }

  write(K.stats, next);
  write(K.result, result);
  return next;
}

export const getEndlessHigh = (): number => read(K.endlessHigh, 0);
export function setEndlessHigh(score: number): number {
  const high = Math.max(getEndlessHigh(), score);
  write(K.endlessHigh, high);
  return high;
}

export const getTheme = (): 'dark' | 'light' | null => read<'dark' | 'light' | null>(K.theme, null);
export const setTheme = (t: 'dark' | 'light'): void => write(K.theme, t);

export const hasSeenHowTo = (): boolean => read(K.seenHowTo, false);
export const markSeenHowTo = (): void => write(K.seenHowTo, true);

/** Whether this player's outcome for `date` was already sent to the community tally. */
export const hasSubmittedCommunity = (date: string): boolean => read(`pg:submitted:${date}`, false);
export const markSubmittedCommunity = (date: string): void => write(`pg:submitted:${date}`, true);

function previousDate(date: string): string {
  const d = new Date(date + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}
