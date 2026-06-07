import { useEffect, useRef, useState } from 'react';
import type { PublicMovie, DailyResult, DailyStats } from '../lib/types';
import { useRound } from '../hooks/useRound';
import { scoreForGuess } from '../lib/scoring';
import { getDailyResult, getDailyStats, recordDailyResult } from '../lib/storage';
import { RoundBoard } from '../components/RoundBoard';
import { ResultCard } from '../components/ResultCard';
import { DailyResultActions } from '../components/DailyResultActions';

interface Props {
  movies: PublicMovie[];
  moviesById: Map<string, PublicMovie>;
  onKeepPlaying: () => void;
}

const todayUTC = () => new Date().toISOString().slice(0, 10);

export function DailyMode({ movies, moviesById, onKeepPlaying }: Props) {
  const today = todayUTC();
  const stored = getDailyResult();
  const alreadyPlayed = stored?.date === today;

  const [result, setResult] = useState<DailyResult | null>(alreadyPlayed ? stored : null);
  const [stats, setStats] = useState<DailyStats>(() => getDailyStats());
  const recorded = useRef(alreadyPlayed);

  // Only fetch a round if today hasn't been played yet.
  const { state, guess, giveUp, reload } = useRound('daily', moviesById, 0, !alreadyPlayed);

  // When the live round finishes, record it once and lock the day.
  useEffect(() => {
    if (recorded.current) return;
    if ((state.status === 'won' || state.status === 'lost') && state.answer) {
      recorded.current = true;
      const r: DailyResult = {
        date: today,
        solved: state.status === 'won',
        guessUsed: state.guessesMade,
        guessedIds: state.guessedIds,
        answerId: state.answer.id,
      };
      setStats(recordDailyResult(r));
      setResult(r);
    }
  }, [state.status, state.answer, state.guessesMade, state.guessedIds, today]);

  // Already played (on load or after finishing): show the locked result.
  if (result) {
    const answer = moviesById.get(result.answerId);
    if (!answer) {
      return (
        <div className="card p-6 text-center text-muted">
          You&apos;ve played today&apos;s puzzle. Come back tomorrow!
        </div>
      );
    }
    return (
      <ResultCard
        answer={answer}
        solved={result.solved}
        guessUsed={result.guessUsed}
        points={scoreForGuess(result.guessUsed, result.solved)}
      >
        <DailyResultActions
          result={result}
          stats={stats}
          guessesAllowed={state.guessesAllowed || 7}
          onKeepPlaying={onKeepPlaying}
        />
      </ResultCard>
    );
  }

  // Live daily round in progress.
  return (
    <RoundBoard
      round={state}
      movies={movies}
      moviesById={moviesById}
      onGuess={guess}
      onGiveUp={giveUp}
      onRetry={reload}
      resultActions={() => null /* completion is handled by the effect above */}
    />
  );
}
