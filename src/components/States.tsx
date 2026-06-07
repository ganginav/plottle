import { ClapperIcon } from './icons';

/** Shimmering skeleton shown while the snapshot or a round is loading. */
export function LoadingState({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="space-y-5" aria-busy="true" aria-label={label}>
      <div className="card space-y-3 p-6">
        <div className="h-4 w-3/4 animate-pulse rounded-full bg-surface-2" />
        <div className="h-4 w-full animate-pulse rounded-full bg-surface-2" />
        <div className="h-4 w-2/3 animate-pulse rounded-full bg-surface-2" />
      </div>
      <div className="h-12 w-full animate-pulse rounded-xl bg-surface-2" />
      <div className="grid gap-2">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="h-12 w-full animate-pulse rounded-xl bg-surface-2/60" />
        ))}
      </div>
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="card flex flex-col items-center gap-4 p-10 text-center">
      <span className="grid h-14 w-14 place-items-center rounded-2xl bg-bad/15 text-bad">
        <ClapperIcon className="h-7 w-7" />
      </span>
      <div>
        <p className="font-display text-lg font-bold text-text">Something went wrong</p>
        <p className="mt-1 text-sm text-muted">{message}</p>
      </div>
      <button type="button" onClick={onRetry} className="btn-primary">
        Try again
      </button>
    </div>
  );
}
