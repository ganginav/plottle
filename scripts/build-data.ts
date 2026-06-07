/**
 * build-data.ts — the ONLY consumer of imdbapi.dev.
 *
 * Run with `npm run build:data`. It paginates the public IMDb API across the
 * canonical year span, strips each title to the fields the game needs, and writes:
 *
 *   - public/data/movies.public.json   client snapshot, NO plot (CDN-served)
 *   - server/data/movies.private.json  server-only, includes plot
 *   - server/data/daily.json           server-only date→id schedule (append-only)
 *
 * Plots never reach the browser: they live only in the private file, which the
 * serverless functions import directly (so Vercel bundles it, not /public).
 *
 * To expand beyond v1 (2026-only), change CANONICAL_START_YEAR / END_YEAR below.
 */
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// ─── Config (one-line changes to expand scope) ───────────────────────────────
const CANONICAL_START_YEAR = 2026;
const CANONICAL_END_YEAR = 2026;

/** API query floor — kept low so the guess/autocomplete universe is broad. */
const FETCH_MIN_VOTES = 10_000;
/** Daily-answer floor — only well-known films become the shared daily puzzle. */
const DAILY_MIN_VOTES = 25_000;

/** First date in the daily schedule. Past dates are never changed (append-only). */
const DAILY_EPOCH = '2026-06-01';
/** How many days past "today" to pre-schedule, so the daily never runs dry. */
const DAILY_LOOKAHEAD_DAYS = 30;
/** Stable seed for the daily shuffle. */
const DAILY_SEED = 0x50_6c_6f_74; // "Plot"

const REQUEST_DELAY_MS = 350;
const API_BASE = 'https://api.imdbapi.dev/titles';

// ─── Paths ───────────────────────────────────────────────────────────────────
const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const PUBLIC_OUT = resolve(root, 'public/data/movies.public.json');
const PRIVATE_OUT = resolve(root, 'server/data/movies.private.json');
const DAILY_OUT = resolve(root, 'server/data/daily.json');

// ─── API types (verified response shape) ─────────────────────────────────────
interface ApiTitle {
  id: string;
  primaryTitle?: string;
  originalTitle?: string;
  primaryImage?: { url?: string };
  startYear?: number;
  runtimeSeconds?: number;
  genres?: string[];
  rating?: { aggregateRating?: number; voteCount?: number };
  plot?: string;
}
interface ApiResponse {
  titles?: ApiTitle[];
  totalCount?: number;
  nextPageToken?: string;
}

/** Full record kept server-side (includes plot). */
interface PrivateMovie {
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

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function fetchYear(year: number): Promise<ApiTitle[]> {
  const out: ApiTitle[] = [];
  let pageToken: string | undefined;
  let page = 0;
  do {
    const url = new URL(API_BASE);
    url.searchParams.set('types', 'MOVIE');
    url.searchParams.set('startYear', String(year));
    url.searchParams.set('endYear', String(year));
    url.searchParams.set('minVoteCount', String(FETCH_MIN_VOTES));
    if (pageToken) url.searchParams.set('pageToken', pageToken);

    const res = await fetch(url);
    if (!res.ok) throw new Error(`API ${res.status} for ${year} page ${page}: ${await res.text()}`);
    const data = (await res.json()) as ApiResponse;
    const batch = data.titles ?? [];
    out.push(...batch);
    pageToken = data.nextPageToken;
    page += 1;
    console.log(`  ${year} page ${page}: +${batch.length} (total ${out.length}/${data.totalCount ?? '?'})`);
    if (pageToken) await sleep(REQUEST_DELAY_MS);
  } while (pageToken);
  return out;
}

function toPrivate(t: ApiTitle): PrivateMovie | null {
  const plot = t.plot?.trim();
  const primaryTitle = t.primaryTitle?.trim();
  if (!plot || !primaryTitle) return null; // discard titles missing a plot or title
  return {
    id: t.id,
    primaryTitle,
    originalTitle: t.originalTitle?.trim() || primaryTitle,
    posterUrl: t.primaryImage?.url ?? null,
    startYear: t.startYear ?? CANONICAL_START_YEAR,
    runtimeSeconds: typeof t.runtimeSeconds === 'number' ? t.runtimeSeconds : null,
    genres: t.genres ?? [],
    rating:
      t.rating && typeof t.rating.aggregateRating === 'number' && typeof t.rating.voteCount === 'number'
        ? { aggregateRating: t.rating.aggregateRating, voteCount: t.rating.voteCount }
        : null,
    plot,
  };
}

// ─── Deterministic seeded shuffle (mulberry32) ───────────────────────────────
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d_2b_79_f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
  };
}
function seededShuffle<T>(arr: T[], seed: number): T[] {
  const a = [...arr];
  const rand = mulberry32(seed);
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const addDays = (iso: string, n: number): string => {
  const d = new Date(iso + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};
const todayUTC = (): string => new Date().toISOString().slice(0, 10);

interface DailySchedule {
  generatedAt: string;
  canonicalYearSpan: [number, number];
  entries: { date: string; id: string }[];
}

/**
 * Append-only daily schedule. Existing date→id entries are NEVER reordered or
 * removed; we only extend forward. Newly eligible movies enter the future deck.
 */
function buildDaily(eligibleIds: string[]): DailySchedule {
  let existing: { date: string; id: string }[] = [];
  if (existsSync(DAILY_OUT)) {
    try {
      existing = (JSON.parse(readFileSync(DAILY_OUT, 'utf8')) as DailySchedule).entries ?? [];
    } catch {
      existing = [];
    }
  }
  existing.sort((a, b) => a.date.localeCompare(b.date));
  const byDate = new Map(existing.map((e) => [e.date, e.id]));
  const usedIds = new Set(existing.map((e) => e.id));

  // Future deck: eligible ids not yet scheduled, in a stable shuffled order.
  const remaining = seededShuffle(
    eligibleIds.filter((id) => !usedIds.has(id)),
    DAILY_SEED,
  );
  // Full deck reused for subsequent cycles once `remaining` is exhausted.
  const fullDeck = seededShuffle(eligibleIds, DAILY_SEED ^ 0x9e_37_79_b9);

  const lastDate = existing.length ? existing[existing.length - 1].date : addDays(DAILY_EPOCH, -1);
  const endDate = addDays(todayUTC(), DAILY_LOOKAHEAD_DAYS);

  let deckPos = 0;
  const nextId = (): string => {
    if (deckPos < remaining.length) return remaining[deckPos++];
    return fullDeck[(deckPos++ - remaining.length) % fullDeck.length];
  };

  // Fill any gaps from the epoch (covers a fresh schedule) plus forward to endDate.
  let date = existing.length ? addDays(lastDate, 1) : DAILY_EPOCH;
  const entries = [...existing];
  while (date <= endDate) {
    if (!byDate.has(date)) entries.push({ date, id: nextId() });
    date = addDays(date, 1);
  }
  entries.sort((a, b) => a.date.localeCompare(b.date));

  return {
    generatedAt: new Date().toISOString(),
    canonicalYearSpan: [CANONICAL_START_YEAR, CANONICAL_END_YEAR],
    entries,
  };
}

function writeJson(path: string, data: unknown) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(data, null, 2) + '\n');
}

async function main() {
  console.log(`Fetching ${CANONICAL_START_YEAR}–${CANONICAL_END_YEAR} (minVoteCount=${FETCH_MIN_VOTES})…`);
  const raw: ApiTitle[] = [];
  for (let y = CANONICAL_START_YEAR; y <= CANONICAL_END_YEAR; y++) {
    raw.push(...(await fetchYear(y)));
    if (y < CANONICAL_END_YEAR) await sleep(REQUEST_DELAY_MS);
  }

  // De-dupe by id, strip, discard incomplete records.
  const seen = new Set<string>();
  const movies: PrivateMovie[] = [];
  for (const t of raw) {
    if (seen.has(t.id)) continue;
    const m = toPrivate(t);
    if (m) {
      seen.add(t.id);
      movies.push(m);
    }
  }
  movies.sort((a, b) => (b.rating?.voteCount ?? 0) - (a.rating?.voteCount ?? 0));
  console.log(`Kept ${movies.length} titles with plot + title.`);

  const generatedAt = new Date().toISOString();
  const canonicalYearSpan: [number, number] = [CANONICAL_START_YEAR, CANONICAL_END_YEAR];

  // Private snapshot — everything, plots included.
  writeJson(PRIVATE_OUT, { generatedAt, canonicalYearSpan, movies });

  // Public snapshot — strip the plot. This is all the browser ever sees.
  const publicMovies = movies.map(({ plot: _plot, ...rest }) => rest);
  writeJson(PUBLIC_OUT, { generatedAt, canonicalYearSpan, movies: publicMovies });

  // Daily schedule — only recognizable films (>= DAILY_MIN_VOTES) are eligible.
  const eligibleIds = movies
    .filter((m) => (m.rating?.voteCount ?? 0) >= DAILY_MIN_VOTES)
    .map((m) => m.id);
  console.log(`${eligibleIds.length} titles eligible as daily answers (>= ${DAILY_MIN_VOTES} votes).`);
  const daily = buildDaily(eligibleIds);
  writeJson(DAILY_OUT, daily);

  console.log('Done:');
  console.log(`  ${PUBLIC_OUT} (${publicMovies.length} movies, no plots)`);
  console.log(`  ${PRIVATE_OUT} (${movies.length} movies, with plots)`);
  console.log(`  ${DAILY_OUT} (${daily.entries.length} scheduled days)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
