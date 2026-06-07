/**
 * Server-only data access. These JSON files are imported directly so Vercel
 * bundles them with the function — they live in /server, never in /public, so
 * the browser can never fetch plots or tomorrow's answer.
 */
import privateData from '../../server/data/movies.private.json';
import dailyData from '../../server/data/daily.json';

export interface PrivateMovie {
  id: string;
  primaryTitle: string;
  originalTitle: string;
  posterUrl: string | null;
  startYear: number;
  runtimeSeconds: number | null;
  genres: string[];
  rating: { aggregateRating: number; voteCount: number } | null;
  plot: string;
}

interface DailySchedule {
  generatedAt: string;
  canonicalYearSpan: [number, number];
  entries: { date: string; id: string }[];
}

const movies: PrivateMovie[] = (privateData as { movies: PrivateMovie[] }).movies;
const byId = new Map(movies.map((m) => [m.id, m]));
const daily = dailyData as DailySchedule;
const dailyByDate = new Map(daily.entries.map((e) => [e.date, e.id]));

export const todayUTC = (): string => new Date().toISOString().slice(0, 10);

export function getMovie(id: string): PrivateMovie | undefined {
  return byId.get(id);
}

/** Daily answer id for a date, or undefined if that date isn't scheduled. */
export function getDailyId(date: string): string | undefined {
  return dailyByDate.get(date);
}

/** Endless pool is the full fetched universe (FETCH_MIN_VOTES floor). */
export function randomMovie(): PrivateMovie {
  return movies[Math.floor(Math.random() * movies.length)];
}

/** Seconds until the next UTC midnight — used for the daily edge-cache TTL. */
export function secondsUntilUtcMidnight(): number {
  const now = new Date();
  const next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
  return Math.max(1, Math.floor((next.getTime() - now.getTime()) / 1000));
}
