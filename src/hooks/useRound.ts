import { useCallback, useEffect, useRef, useState } from 'react';
import type { Mode, PublicMovie, RevealedHints } from '../lib/types';
import { fetchRound, submitGuess } from '../lib/api';
import { GUESSES_ALLOWED, revealedHintCount } from '../lib/scoring';

export type RoundStatus = 'loading' | 'playing' | 'won' | 'lost' | 'error';

export interface RoundState {
  status: RoundStatus;
  plot: string;
  guessesAllowed: number;
  guessedIds: string[];
  /** Number of guesses made so far. */
  guessesMade: number;
  /** Hints unlocked so far (0–5). */
  hintsRevealed: number;
  /** Hint values delivered by the server as wrong guesses unlock them. */
  hints: RevealedHints;
  /** Full movie record once the round is over (from the snapshot). */
  answer: PublicMovie | null;
  error: string | null;
  submitting: boolean;
}

interface UseRound {
  state: RoundState;
  guess: (movie: PublicMovie) => Promise<void>;
  giveUp: () => Promise<void>;
  reload: () => void;
}

/**
 * Drives a single round: fetches the server-scrubbed plot, submits guesses to the
 * server (which owns the answer), unlocks hints on wrong guesses, and resolves the
 * full answer card from the snapshot once the round ends.
 *
 * `roundKey` lets a parent force a brand-new round (e.g. Endless "next").
 */
export function useRound(
  mode: Mode,
  moviesById: Map<string, PublicMovie>,
  roundKey: number,
  enabled = true,
): UseRound {
  const [state, setState] = useState<RoundState>(initial);
  const stateRef = useRef(state);
  stateRef.current = state;

  const handle = useRef<{ roundId?: string; roundToken?: string }>({});
  const [nonce, setNonce] = useState(0);
  const reload = useCallback(() => setNonce((n) => n + 1), []);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    setState(initial);
    handle.current = {};
    (async () => {
      try {
        const round = await fetchRound(mode);
        if (cancelled) return;
        handle.current = { roundId: round.roundId, roundToken: round.roundToken };
        setState({
          ...initial,
          status: 'playing',
          plot: round.plot,
          guessesAllowed: round.guessesAllowed ?? GUESSES_ALLOWED,
        });
      } catch {
        if (!cancelled) setState((s) => ({ ...s, status: 'error', error: 'Could not load the round.' }));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [mode, roundKey, nonce, enabled]);

  const guess = useCallback(
    async (movie: PublicMovie) => {
      const cur = stateRef.current;
      if (cur.status !== 'playing' || cur.submitting || cur.guessedIds.includes(movie.id)) return;

      const guessNumber = cur.guessesMade + 1;
      const isFinal = guessNumber >= cur.guessesAllowed;
      setState((s) => ({ ...s, submitting: true }));

      try {
        const res = await submitGuess({
          roundId: handle.current.roundId,
          roundToken: handle.current.roundToken,
          guessId: movie.id,
          guessNumber,
          reveal: isFinal, // ask for the answer only if this is the last guess
        });
        setState((s) => {
          const guessedIds = [...s.guessedIds, movie.id];
          const guessesMade = s.guessesMade + 1;
          if (res.correct) {
            return {
              ...s,
              submitting: false,
              guessedIds,
              guessesMade,
              status: 'won',
              answer: resolveAnswer(res.answer?.id, moviesById),
            };
          }
          const lost = guessesMade >= s.guessesAllowed;
          return {
            ...s,
            submitting: false,
            guessedIds,
            guessesMade,
            hintsRevealed: revealedHintCount(guessesMade),
            hints: { ...s.hints, ...res.hints },
            status: lost ? 'lost' : 'playing',
            answer: lost ? resolveAnswer(res.answer?.id, moviesById) : s.answer,
          };
        });
      } catch (e) {
        setState((s) => ({
          ...s,
          submitting: false,
          error: e instanceof Error ? e.message : 'Guess failed.',
        }));
      }
    },
    [moviesById],
  );

  const giveUp = useCallback(async () => {
    const cur = stateRef.current;
    if (cur.status !== 'playing' || cur.submitting) return;
    setState((s) => ({ ...s, submitting: true }));
    try {
      const res = await submitGuess({
        roundId: handle.current.roundId,
        roundToken: handle.current.roundToken,
        reveal: true,
      });
      setState((s) => ({
        ...s,
        submitting: false,
        status: 'lost',
        hintsRevealed: revealedHintCount(s.guessesAllowed - 1),
        answer: resolveAnswer(res.answer?.id, moviesById),
      }));
    } catch (e) {
      setState((s) => ({
        ...s,
        submitting: false,
        error: e instanceof Error ? e.message : 'Failed to reveal answer.',
      }));
    }
  }, [moviesById]);

  return { state, guess, giveUp, reload };
}

const initial: RoundState = {
  status: 'loading',
  plot: '',
  guessesAllowed: GUESSES_ALLOWED,
  guessedIds: [],
  guessesMade: 0,
  hintsRevealed: 0,
  hints: {},
  answer: null,
  error: null,
  submitting: false,
};

function resolveAnswer(id: string | undefined, moviesById: Map<string, PublicMovie>): PublicMovie | null {
  return id ? moviesById.get(id) ?? null : null;
}
