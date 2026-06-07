import type { RevealedHints, PublicMovie } from '../lib/types';
import { HINT_LADDER } from '../lib/scoring';
import { formatRuntime, formatVotes } from '../lib/format';
import { StarIcon } from './icons';

interface Props {
  plot: string;
  hints: RevealedHints;
  hintsRevealed: number;
  guessesMade: number;
  guessesAllowed: number;
  guessedIds: string[];
  moviesById: Map<string, PublicMovie>;
}

const HINT_LABELS: Record<(typeof HINT_LADDER)[number], string> = {
  genres: 'Genres',
  year: 'Release year',
  runtime: 'Runtime',
  rating: 'IMDb rating',
  poster: 'Poster (blurred)',
};

export function HintPanel({
  plot,
  hints,
  hintsRevealed,
  guessesMade,
  guessesAllowed,
  guessedIds,
  moviesById,
}: Props) {
  const remaining = guessesAllowed - guessesMade;
  return (
    <div className="space-y-5">
      {/* Plot — the primary clue */}
      <div className="card relative overflow-hidden p-5 sm:p-6">
        <span className="pointer-events-none absolute -left-1 -top-3 select-none font-display text-7xl leading-none text-brand/15">
          “
        </span>
        <p className="relative font-display text-lg leading-relaxed text-text sm:text-xl">{plot}</p>
        <p className="mt-3 text-xs font-medium uppercase tracking-wider text-faint">The plot · IMDb</p>
      </div>

      {/* Guess tracker */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex gap-1.5" aria-label={`${guessesMade} of ${guessesAllowed} guesses used`}>
          {Array.from({ length: guessesAllowed }).map((_, i) => (
            <span
              key={i}
              className={`h-2.5 w-6 rounded-full transition-colors ${
                i < guessesMade ? 'bg-bad' : 'bg-surface-2'
              }`}
            />
          ))}
        </div>
        <span className="text-sm font-semibold text-muted">
          {remaining} {remaining === 1 ? 'guess' : 'guesses'} left
        </span>
      </div>

      {/* Hint ladder */}
      <div className="grid gap-2">
        {HINT_LADDER.map((key, i) => {
          const unlocked = i < hintsRevealed;
          return (
            <HintRow
              key={key}
              label={HINT_LABELS[key]}
              unlocked={unlocked}
              unlockAt={i + 2} // hint i unlocks after wrong guess (i+1); shown before guess i+2
            >
              {unlocked && <HintValue hintKey={key} hints={hints} />}
            </HintRow>
          );
        })}
      </div>

      {/* Already-guessed list */}
      {guessedIds.length > 0 && (
        <div className="flex flex-wrap gap-2 pt-1">
          {guessedIds.map((id) => (
            <span key={id} className="chip text-bad line-through decoration-bad/60">
              {moviesById.get(id)?.primaryTitle ?? 'Unknown'}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function HintRow({
  label,
  unlocked,
  unlockAt,
  children,
}: {
  label: string;
  unlocked: boolean;
  unlockAt: number;
  children?: React.ReactNode;
}) {
  return (
    <div
      className={`flex items-center justify-between gap-4 rounded-xl border px-4 py-3 transition-all ${
        unlocked ? 'border-border bg-surface animate-fade-up' : 'border-dashed border-border/70 bg-transparent'
      }`}
    >
      <span className={`text-xs font-semibold uppercase tracking-wider ${unlocked ? 'text-faint' : 'text-faint/60'}`}>
        {label}
      </span>
      {unlocked ? (
        <span className="min-w-0 text-right">{children}</span>
      ) : (
        <span className="flex items-center gap-1.5 text-xs text-faint/70">
          <LockGlyph />
          guess {unlockAt}
        </span>
      )}
    </div>
  );
}

function HintValue({ hintKey, hints }: { hintKey: (typeof HINT_LADDER)[number]; hints: RevealedHints }) {
  switch (hintKey) {
    case 'genres':
      return (
        <span className="flex flex-wrap justify-end gap-1.5">
          {(hints.genres ?? []).map((g) => (
            <span key={g} className="chip">
              {g}
            </span>
          ))}
        </span>
      );
    case 'year':
      return <span className="text-sm font-bold text-text">{hints.year}</span>;
    case 'runtime':
      return <span className="text-sm font-bold text-text">{formatRuntime(hints.runtimeSeconds ?? null)}</span>;
    case 'rating':
      return hints.rating ? (
        <span className="inline-flex items-center gap-1.5 text-sm font-bold text-text">
          {hints.rating.aggregateRating.toFixed(1)}
          <StarIcon className="h-4 w-4 text-brand" />
          <span className="font-medium text-muted">· {formatVotes(hints.rating.voteCount)} votes</span>
        </span>
      ) : (
        <span className="text-sm text-muted">Not rated</span>
      );
    case 'poster':
      return hints.posterUrl ? (
        <span className="block h-24 w-16 overflow-hidden rounded-lg border border-border">
          <img
            src={hints.posterUrl}
            alt="Blurred poster"
            className="h-full w-full scale-110 object-cover blur-xl"
            style={{ filter: 'blur(14px)' }}
          />
        </span>
      ) : (
        <span className="text-sm text-muted">No poster</span>
      );
  }
}

function LockGlyph() {
  return (
    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </svg>
  );
}
