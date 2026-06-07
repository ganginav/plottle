import type { DailyStats } from '../lib/types';
import { ClapperIcon } from '../components/icons';

interface Props {
  stats: DailyStats;
  playedToday: boolean;
  onPick: (mode: 'daily' | 'endless') => void;
}

export function Home({ stats, playedToday, onPick }: Props) {
  return (
    <div className="space-y-7 animate-fade-up">
      <div className="pt-4 text-center">
        <span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-brand/15 text-brand shadow-glow">
          <ClapperIcon className="h-9 w-9" />
        </span>
        <h1 className="mt-4 font-display text-4xl font-bold tracking-tight text-text sm:text-5xl">
          Plottle
        </h1>
        <p className="mx-auto mt-2 max-w-sm text-balance text-muted">
          We give you a movie&apos;s plot. You name the film. Fewer guesses, more glory — 2023–2026 releases.
        </p>
      </div>

      <div className="grid gap-3">
        <button
          type="button"
          onClick={() => onPick('daily')}
          className="card group flex items-center gap-4 p-5 text-left transition-all hover:-translate-y-0.5 hover:shadow-glow"
        >
          <span className="text-3xl">🗓️</span>
          <span className="flex-1">
            <span className="flex items-center gap-2 font-display text-lg font-bold text-text">
              Daily puzzle
              {playedToday && (
                <span className="rounded-full bg-good/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-good">
                  done
                </span>
              )}
            </span>
            <span className="text-sm text-muted">One film a day. Same for everyone.</span>
          </span>
          <span className="text-faint transition-transform group-hover:translate-x-1">→</span>
        </button>

        <button
          type="button"
          onClick={() => onPick('endless')}
          className="card group flex items-center gap-4 p-5 text-left transition-all hover:-translate-y-0.5 hover:shadow-glow"
        >
          <span className="text-3xl">♾️</span>
          <span className="flex-1">
            <span className="block font-display text-lg font-bold text-text">Endless</span>
            <span className="text-sm text-muted">Back-to-back rounds. 3 lives. Chase a high score.</span>
          </span>
          <span className="text-faint transition-transform group-hover:translate-x-1">→</span>
        </button>
      </div>

      {stats.played > 0 && (
        <div className="grid grid-cols-4 gap-2 text-center">
          <Mini label="Played" value={stats.played} />
          <Mini label="Win %" value={stats.played ? Math.round((stats.wins / stats.played) * 100) : 0} />
          <Mini label="Streak" value={stats.currentStreak} />
          <Mini label="Max" value={stats.maxStreak} />
        </div>
      )}
    </div>
  );
}

function Mini({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-border bg-surface py-2.5">
      <div className="font-display text-xl font-bold leading-none text-text">{value}</div>
      <div className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-faint">{label}</div>
    </div>
  );
}
