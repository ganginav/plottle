# 🎬 Plottle

Guess the movie from its IMDb plot. Each wrong guess reveals another hint
(genres → year → runtime → rating → a blurred poster → the title with its first
letters revealed); the fewer guesses you take, the higher your score. You get **7
guesses**. Two modes — a shared **Daily** puzzle and an endless **score-attack** run.
Dark and light themes, mobile-first.

**Scope: US-origin movies released 2023–2026.** The year span and origin-country
filter are config constants, so widening them later is a config + data-refresh change,
not a rewrite.

- **Frontend:** Vite + React + TypeScript + Tailwind (class-based dark mode, CSS-variable palettes).
- **Backend:** Vercel Functions in `/api` — they own the answers, scrub plots, and validate guesses.
- **No database.** Daily answers come from a committed schedule; endless answers ride in a signed token.
- **Stats** persist in `localStorage`. No login.

---

## Run it locally

```bash
npm install

# Both the Vite app AND the /api functions on one origin:
vercel dev
```

`vercel dev` serves the SPA and the serverless functions together at
`http://localhost:3000`. The functions need an HMAC secret:

```bash
cp .env.example .env.local        # then edit HMAC_SECRET
# or pull from your linked Vercel project:
vercel env pull .env.local
```

> Plain `npm run dev` runs only the Vite app — `/api/*` returns 404, so the game
> can't fetch rounds. Use `vercel dev` for the full experience.

The committed data snapshot is enough to play immediately; you only need to run the
data script (below) if you want to refresh it.

---

## Deploy to Vercel

1. Push the repo to GitHub and **Import Project** in Vercel (framework auto-detects as Vite).
2. Add an env var **`HMAC_SECRET`** (Production + Preview). Generate one with
   `openssl rand -hex 32`.
3. *(Optional)* Add a **KV / Upstash Redis** store in the Vercel **Storage** tab to turn
   on the "Today worldwide" daily stats. It auto-injects `KV_REST_API_URL` /
   `KV_REST_API_TOKEN`. Without it, the feature is simply hidden.
4. Deploy. Vercel runs `npm run build` (app only — see note) and auto-routes `/api/*.ts`.

The build command is **app-only** on purpose: deploys never call imdbapi.dev, so a
flaky upstream API can't break a deploy. Data is committed and refreshed out-of-band
(below).

---

## Data pipeline — the browser never calls imdbapi.dev

The only consumer of [imdbapi.dev](https://imdbapi.dev) is the build script. It runs
once, produces static JSON, and those files ship with the site / bundle with the
functions. Every visitor reading the API directly would be slow, fragile, and abusive
to a free API — so we don't.

### `scripts/build-data.ts` (`npm run build:data`)

- Paginates `https://api.imdbapi.dev/titles?types=MOVIE&startYear=<Y>&endYear=<Y>&minVoteCount=<FETCH_MIN_VOTES>`
  across every year in the canonical span, following `nextPageToken`, with a polite delay.
- Two vote-count floors (config constants):
  - **`FETCH_MIN_VOTES = 10000`** — the API query floor. Kept low so the autocomplete /
    valid-guess universe is broad and near-miss titles exist.
  - **`DAILY_MIN_VOTES = 25000`** — only films at/above this are eligible to be a **daily
    answer**, keeping the shared puzzle recognizable. Endless uses the full `FETCH_MIN_VOTES` pool.
- Strips each record, discards titles with no plot or title, and writes **two** snapshots
  plus the daily schedule:

| File | Contains | Where it lives | Why |
|---|---|---|---|
| `public/data/movies.public.json` | id, titles, poster, year, runtime, genres, rating — **no plot** | served from the CDN | autocomplete, hint values, end-of-round reveal |
| `server/data/movies.private.json` | everything **including `plot`** | bundled into the functions (never in `/public`) | the only place plots live |
| `server/data/daily.json` | date → id schedule | server-only | the shared daily; never reaches the browser |

### Why plots live server-side

If the browser had the plots, a cheater could match the shown plot to a title with a
quick string search. So the client snapshot is **plotless**, and the plot for a round is
fetched from the function — already **scrubbed** (title words redacted with `▮▮▮▮`) by
the server. (Character names are deliberately *not* scrubbed — that's the easy mode for
franchise fans.)

### The daily schedule stays globally consistent

`daily.json` is an **append-only** date→id list: a stable seeded shuffle of the
daily-eligible ids assigned to consecutive dates. Past dates are never reordered or
removed — only extended forward — so the schedule is reproducible and everyone provably
gets the same movie each day. `GET /api/round?mode=daily` resolves today's UTC date
against it and is edge-cached for the rest of the day (`s-maxage`), so it's effectively
one origin invocation per day.

### Scheduled refresh (GitHub Action, not Vercel Cron)

`.github/workflows/refresh-data.yml` runs weekly (and on demand). It runs `build:data`,
verifies the app still builds, and **commits** any changed JSON. The push then triggers
Vercel's auto-deploy. It's a GitHub Action rather than Vercel Cron precisely because the
refresh must commit regenerated files to the repo.

---

## Anti-cheat model — the server owns the answer

The browser can never read the answer, even with devtools open:

- The client snapshot has **no plots** and **no daily schedule**.
- `GET /api/round` returns the **scrubbed plot** and a round handle — **no id, no title**.
  - Daily → `roundId` is the date (resolved server-side, edge-cached).
  - Endless → `roundToken` is an **opaque, HMAC-signed** token encoding the answer id,
    signed with `HMAC_SECRET`. The client can't read or forge it.
- `POST /api/guess` recovers the answer (date lookup / HMAC verify), compares ids, and
  returns only `correct` / `gameOver`. The **answer (id + title) is included only once the
  round is over** — a correct guess, or the client signaling it gave up / used all 7 guesses.
- Future daily dates are rejected (the schedule is pre-populated ahead of today).
- Light in-memory **rate limiting** on `/api/guess` blunts brute-forcing the title list.

**Honest limits (same as Wordle):**

- Without accounts, a player's *self-reported* streak / share text is spoofable.
- The 7-guess cap and hint gating are **not hard-enforced server-side** — there's no
  per-round state without a store. Hint values are delivered progressively by the server
  (gated by a client-supplied guess number), so a determined devtools user could request a
  later hint early and, e.g., reverse-map a revealed poster. This only spoils that user's
  own game; it doesn't expose answers to anyone else.
- Add a **KV store** (still not a relational DB) only if you later want to hard-enforce the
  7-guess cap, guarantee one-play-per-day, or run a shared leaderboard.
- The **community daily stats** (below) use such a KV store, but only as an aggregate
  counter — the tallies are self-reported and unauthenticated (each client submits once
  per day, deduped locally), so they could be inflated, like any account-less Wordle stat.

### Community daily stats (`/api/stats`, optional)

Once the daily is decided, the result screen shows a **"Today worldwide"** panel: how many
people played, what % solved it, and the distribution of solves by guess number (your row
highlighted). This is the one feature that needs shared state, so it's backed by an
optional **Upstash Redis** store (a hash per date: `g1..g7` for a solve on that guess,
`fail` for a loss). If no store is configured, `/api/stats` reports `enabled: false` and the
panel is hidden — nothing else changes. See **Deploy → step 3**.

---

## Changing scope / tuning difficulty

All in `scripts/build-data.ts`, then re-run `npm run build:data`:

```ts
const CANONICAL_START_YEAR = 2023;   // widen the span, e.g. 2000
const CANONICAL_END_YEAR   = 2026;
const FETCH_MIN_VOTES      = 30_000; // guess/autocomplete universe floor
const DAILY_MIN_VOTES      = 30_000; // daily-answer eligibility floor
const ALLOWED_ORIGIN_COUNTRIES = new Set(['US']); // add 'GB', 'CA', … to widen
```

When the span widens and the snapshot grows, swap the `useSnapshot` localStorage cache
for IndexedDB — it's isolated behind that one hook. (The Endless year-range picker is
deferred; both modes draw from the full pool.)

---

## Project structure

```
api/
  round.ts            GET  /api/round?mode=daily|endless   (scrubbed plot, no answer)
  guess.ts            POST /api/guess                      (validates, owns the answer)
  stats.ts            GET/POST /api/stats                  (optional worldwide daily tally)
  _lib/               scrub · token (HMAC) · data · hints · obfuscate · ratelimit · kv
scripts/build-data.ts the only imdbapi.dev consumer → JSON snapshots + daily schedule
public/data/          movies.public.json (no plots, CDN-served)
server/data/          movies.private.json + daily.json (server-only, bundled)
src/
  hooks/              useSnapshot · useRound · useTheme
  components/         GuessInput · HintPanel · ResultCard · RoundBoard · Modal · …
  modes/              Home · DailyMode · EndlessMode
  lib/                types · format · scoring · share · storage · api
tests/                scrub · token · scoring/share (vitest)
```

## Scripts

| Command | What it does |
|---|---|
| `vercel dev` | Run the app + functions locally |
| `npm run build` | App-only production build (used by Vercel) |
| `npm run build:data` | Refetch from imdbapi.dev → regenerate snapshots + schedule |
| `npm run build:all` | `build:data` then `build` |
| `npm test` | Unit tests for the pure utils |
| `npm run lint` | Typecheck |

---

Data from [imdbapi.dev](https://imdbapi.dev).
