import type { PublicMovie } from '../lib/types';
import type { RoundState } from '../hooks/useRound';
import { scoreForGuess } from '../lib/scoring';
import { HintPanel } from './HintPanel';
import { GuessInput } from './GuessInput';
import { ResultCard } from './ResultCard';
import { LoadingState, ErrorState } from './States';

interface Props {
  round: RoundState;
  movies: PublicMovie[];
  moviesById: Map<string, PublicMovie>;
  onGuess: (m: PublicMovie) => void;
  onGiveUp: () => void;
  onRetry: () => void;
  /** Show the "give up & reveal" button (off for the daily — no cheating the streak). */
  allowGiveUp?: boolean;
  /** Mode-specific actions rendered inside the result card (share / next / …). */
  resultActions: (info: { answer: PublicMovie; solved: boolean; guessUsed: number; points: number }) => React.ReactNode;
}

export function RoundBoard({ round, movies, moviesById, onGuess, onGiveUp, onRetry, allowGiveUp = true, resultActions }: Props) {
  if (round.status === 'loading') return <LoadingState label="Loading round…" />;
  if (round.status === 'error') return <ErrorState message={round.error ?? 'Round failed to load.'} onRetry={onRetry} />;

  if (round.status === 'playing') {
    return (
      <div className="space-y-5">
        <HintPanel
          plot={round.plot}
          hints={round.hints}
          hintsRevealed={round.hintsRevealed}
          guessesMade={round.guessesMade}
          guessesAllowed={round.guessesAllowed}
          guessedIds={round.guessedIds}
          moviesById={moviesById}
        />
        <div className="sticky bottom-4 z-10 space-y-2">
          <GuessInput
            movies={movies}
            guessedIds={round.guessedIds}
            submitting={round.submitting}
            onGuess={onGuess}
          />
          {allowGiveUp && (
            <div className="flex justify-center">
              <button
                type="button"
                onClick={onGiveUp}
                disabled={round.submitting}
                className="text-xs font-semibold text-faint underline-offset-2 hover:text-muted hover:underline"
              >
                Give up &amp; reveal
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // won | lost
  const solved = round.status === 'won';
  const guessUsed = round.guessesMade;
  const points = scoreForGuess(guessUsed, solved);
  if (!round.answer) return <LoadingState label="Revealing…" />;
  return (
    <ResultCard answer={round.answer} solved={solved} guessUsed={guessUsed} points={points}>
      {resultActions({ answer: round.answer, solved, guessUsed, points })}
    </ResultCard>
  );
}
