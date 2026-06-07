import { useEffect, useRef, useState } from 'react';
import type { PublicMovie } from '../lib/types';
import { useRound } from '../hooks/useRound';
import { scoreForGuess } from '../lib/scoring';
import { getEndlessHigh, setEndlessHigh } from '../lib/storage';
import { RoundBoard } from '../components/RoundBoard';

const STARTING_LIVES = 3;

interface Props {
  movies: PublicMovie[];
  moviesById: Map<string, PublicMovie>;
}

export function EndlessMode({ movies, moviesById }: Props) {
  const [roundKey, setRoundKey] = useState(0);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(STARTING_LIVES);
  const [high, setHigh] = useState(() => getEndlessHigh());
  const recordedKey = useRef(-1);

  const { state, guess, giveUp, reload } = useRound('endless', moviesById, roundKey);

  // Apply each round's outcome exactly once.
  useEffect(() => {
    if (state.status !== 'won' && state.status !== 'lost') return;
    if (recordedKey.current === roundKey) return;
    recordedKey.current = roundKey;

    if (state.status === 'won') {
      setScore((s) => {
        const next = s + scoreForGuess(state.guessesMade, true);
        setHigh(setEndlessHigh(next));
        return next;
      });
    } else {
      setLives((l) => Math.max(0, l - 1));
    }
  }, [state.status, state.guessesMade, roundKey]);

  const sessionOver = lives === 0 && (state.status === 'won' || state.status === 'lost');

  function nextRound() {
    setRoundKey((k) => k + 1);
  }
  function playAgain() {
    setScore(0);
    setLives(STARTING_LIVES);
    recordedKey.current = -1;
    setRoundKey((k) => k + 1);
  }

  return (
    <div className="space-y-5">
      <div className="card flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-1.5" aria-label={`${lives} lives left`}>
          {Array.from({ length: STARTING_LIVES }).map((_, i) => (
            <span key={i} className={`text-lg ${i < lives ? '' : 'opacity-25 grayscale'}`}>
              {i < lives ? '❤️' : '🤍'}
            </span>
          ))}
        </div>
        <div className="flex items-center gap-5 text-sm">
          <Stat label="Score" value={score} />
          <Stat label="Best" value={high} accent />
        </div>
      </div>

      <RoundBoard
        round={state}
        movies={movies}
        moviesById={moviesById}
        onGuess={guess}
        onGiveUp={giveUp}
        onRetry={reload}
        resultActions={({ solved, points }) => (
          <div className="space-y-3">
            <p className="text-center text-sm text-muted">
              {solved ? (
                <>
                  Nice — <span className="font-bold text-good">+{points}</span> points.
                </>
              ) : (
                <>That cost you a life.</>
              )}
            </p>
            {sessionOver ? (
              <div className="space-y-3 text-center">
                <p className="font-display text-lg font-bold text-text">
                  Game over · {score} points
                </p>
                <button type="button" onClick={playAgain} className="btn-primary w-full">
                  Play again
                </button>
              </div>
            ) : (
              <button type="button" onClick={nextRound} className="btn-primary w-full">
                Next round →
              </button>
            )}
          </div>
        )}
      />
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div className="text-right">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-faint">{label}</div>
      <div className={`font-display text-lg font-bold leading-none ${accent ? 'text-brand' : 'text-text'}`}>
        {value}
      </div>
    </div>
  );
}
