import { useCallback, useEffect, useState } from 'react';
import type { Snapshot, PublicMovie } from '../lib/types';

const CACHE_KEY = 'pg:snapshot';
const SNAPSHOT_URL = '/data/movies.public.json';

type Status = 'loading' | 'ready' | 'error';

interface SnapshotState {
  status: Status;
  snapshot: Snapshot | null;
  moviesById: Map<string, PublicMovie>;
  reload: () => void;
}

function readCache(): Snapshot | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? (JSON.parse(raw) as Snapshot) : null;
  } catch {
    return null;
  }
}

function writeCache(snap: Snapshot): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(snap));
  } catch {
    /* ignore quota */
  }
}

/**
 * Loads the static plotless snapshot. Uses a localStorage cache keyed by
 * `generatedAt` for instant repeat loads, then revalidates against the CDN in the
 * background and swaps in a newer version if the snapshot was rebuilt.
 *
 * (Isolated behind this hook so it can move to IndexedDB when the file grows.)
 */
export function useSnapshot(): SnapshotState {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(() => readCache());
  const [status, setStatus] = useState<Status>(() => (readCache() ? 'ready' : 'loading'));
  const [nonce, setNonce] = useState(0);

  const reload = useCallback(() => setNonce((n) => n + 1), []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(SNAPSHOT_URL, { cache: 'no-cache' });
        if (!res.ok) throw new Error(`snapshot ${res.status}`);
        const fresh = (await res.json()) as Snapshot;
        if (cancelled) return;
        setSnapshot((prev) => {
          if (prev && prev.generatedAt === fresh.generatedAt) return prev;
          writeCache(fresh);
          return fresh;
        });
        setStatus('ready');
      } catch {
        if (cancelled) return;
        // Network failed but we have a cached copy → stay usable.
        setStatus(readCache() ? 'ready' : 'error');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [nonce]);

  const moviesById = new Map((snapshot?.movies ?? []).map((m) => [m.id, m]));

  return { status, snapshot, moviesById, reload };
}

/**
 * Substring autocomplete over primaryTitle + originalTitle. Exact prefix matches
 * rank first, then earlier substring position, then vote count.
 */
export function searchMovies(movies: PublicMovie[], query: string, limit = 8): PublicMovie[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const scored: { m: PublicMovie; rank: number }[] = [];
  for (const m of movies) {
    const p = m.primaryTitle.toLowerCase();
    const o = m.originalTitle.toLowerCase();
    const ip = p.indexOf(q);
    const io = o.indexOf(q);
    if (ip === -1 && io === -1) continue;
    const pos = Math.min(ip === -1 ? Infinity : ip, io === -1 ? Infinity : io);
    const prefix = p.startsWith(q) || o.startsWith(q) ? 0 : 1;
    // Lower rank = better. Prefix beats position beats popularity.
    const votes = m.rating?.voteCount ?? 0;
    scored.push({ m, rank: prefix * 1e9 + pos * 1e5 - votes / 1e3 });
  }
  scored.sort((a, b) => a.rank - b.rank);
  return scored.slice(0, limit).map((s) => s.m);
}
