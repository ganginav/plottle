import type { PublicMovie } from '../lib/types';
import { formatRuntime, formatVotes } from '../lib/format';
import { StarIcon, CheckIcon } from './icons';

interface Props {
  answer: PublicMovie;
  solved: boolean;
  guessUsed: number;
  points: number;
  children?: React.ReactNode; // action buttons / share, supplied by the mode
}

export function ResultCard({ answer, solved, guessUsed, points, children }: Props) {
  return (
    <div className="card overflow-hidden animate-pop-in">
      {/* Outcome banner */}
      <div
        className={`flex items-center gap-3 px-5 py-3.5 text-sm font-bold ${
          solved ? 'bg-good/15 text-good' : 'bg-bad/15 text-bad'
        }`}
      >
        {solved ? (
          <>
            <CheckIcon className="h-5 w-5" />
            Solved in {guessUsed} {guessUsed === 1 ? 'guess' : 'guesses'}
            <span className="ml-auto rounded-full bg-good/20 px-2.5 py-0.5 text-good">+{points} pts</span>
          </>
        ) : (
          <>
            Out of guesses — here&apos;s the answer
            <span className="ml-auto rounded-full bg-bad/20 px-2.5 py-0.5">+{points} pts</span>
          </>
        )}
      </div>

      <div className="flex gap-4 p-5">
        <div className="h-40 w-[6.75rem] shrink-0 overflow-hidden rounded-xl border border-border bg-surface-2 sm:h-48 sm:w-32">
          {answer.posterUrl ? (
            <img src={answer.posterUrl} alt={`${answer.primaryTitle} poster`} className="h-full w-full object-cover" />
          ) : (
            <div className="grid h-full w-full place-items-center text-2xl">🎞️</div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <h2 className="font-display text-2xl font-bold leading-tight text-text">{answer.primaryTitle}</h2>
          {answer.originalTitle !== answer.primaryTitle && (
            <p className="mt-0.5 text-sm text-faint">{answer.originalTitle}</p>
          )}

          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
            <span className="font-semibold text-text">{answer.startYear}</span>
            {answer.runtimeSeconds ? (
              <>
                <Dot />
                <span>{formatRuntime(answer.runtimeSeconds)}</span>
              </>
            ) : null}
            {answer.rating ? (
              <>
                <Dot />
                <span className="inline-flex items-center gap-1 font-semibold text-text">
                  {answer.rating.aggregateRating.toFixed(1)}
                  <StarIcon className="h-4 w-4 text-brand" />
                </span>
                <span>{formatVotes(answer.rating.voteCount)} votes</span>
              </>
            ) : null}
          </div>

          <div className="mt-3 flex flex-wrap gap-1.5">
            {answer.genres.map((g) => (
              <span key={g} className="chip">
                {g}
              </span>
            ))}
          </div>

          <a
            href={`https://www.imdb.com/title/${answer.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-brand hover:underline"
          >
            View on IMDb ↗
          </a>
        </div>
      </div>

      {children && <div className="border-t border-border p-4">{children}</div>}
    </div>
  );
}

const Dot = () => <span className="text-faint/50">·</span>;
