# CLAUDE.md

Guidance for Claude Code working in this repo. Engineering principles (KISS/DRY/YAGNI,
worktree workflow, design standards) live in [AGENTS.md](./AGENTS.md) — follow those too.

## What this is

**Plottle** — a movie-guessing game. Players see a movie's IMDb plot (US releases,
2023–2026) and guess the title in 7 tries; wrong guesses unlock hints (genres → year →
runtime → rating → blurred poster → obfuscated title).
Vite + React + TS + Tailwind frontend; Vercel Functions backend. Full architecture in
[README.md](./README.md).

## Run / check

```bash
vercel dev          # app + /api functions together (needs HMAC_SECRET in .env.local)
npm run dev         # Vite only — /api is 404, game can't fetch rounds
npm test            # vitest (pure utils)
npm run lint        # tsc -b typecheck
npm run build       # app-only prod build (what Vercel runs)
npm run build:data  # refetch imdbapi.dev → regenerate JSON snapshots
```

## The one rule that shapes everything: the server owns the answer

The browser must never read the answer, even with devtools.

- **Plots live only in `server/data/movies.private.json`** (bundled into the functions).
  The client snapshot `public/data/movies.public.json` has **no `plot` field**. Never add
  plots to the public snapshot.
- **`daily.json` is server-only and append-only.** Don't reorder/remove entries; only the
  build script extends it forward.
- `/api/round` returns a scrubbed plot + a handle (daily date, or HMAC `roundToken`) — never
  id/title. `/api/guess` validates and returns the answer only once the round is over.
- Plot **scrubbing is server-side** (`api/_lib/scrub.ts`) — title words → `▮▮▮▮`, character
  names left intact.

## Data flow

`scripts/build-data.ts` is the **only** thing that calls imdbapi.dev. It writes the three
data files (committed). The GitHub Action refreshes them weekly and commits; Vercel deploys
on push. App code never fetches imdbapi.dev. To change year span / vote floors / origin
filter, edit the constants at the top of `build-data.ts` and re-run `build:data`. Current:
2023–2026, US-origin, both vote floors at 30k (`FETCH_MIN_VOTES` / `DAILY_MIN_VOTES`).

## Community daily stats (optional)

`/api/stats` keeps a worldwide tally of daily outcomes in an optional Upstash Redis store
(`api/_lib/kv.ts`; enabled only if `KV_REST_API_URL`/`KV_REST_API_TOKEN` are set — else the
"Today worldwide" panel hides). Self-reported/unauthenticated; the client submits once per
day (deduped in localStorage). The daily has **no give-up** button (`allowGiveUp={false}`).

## Conventions

- Tailwind colors are CSS-variable tokens (`bg`, `surface`, `text`, `brand`, …) defined for
  both themes in `src/index.css`. Use the tokens, not raw colors, so both themes stay correct.
- Pure, testable logic in `src/lib` (client) and `api/_lib` (server). Keep new pure helpers
  there with a test in `tests/`.
- After changes: `npm run lint && npm test`, and build before committing.
