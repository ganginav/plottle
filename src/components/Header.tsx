import { ThemeToggle } from './ThemeToggle';
import { HelpIcon, BackIcon, ClapperIcon } from './icons';

interface Props {
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  onHelp: () => void;
  onBack?: () => void;
}

export function Header({ theme, onToggleTheme, onHelp, onBack }: Props) {
  return (
    <header className="sticky top-0 z-30 border-b border-border/70 bg-bg/80 backdrop-blur-lg">
      <div className="mx-auto flex h-14 max-w-2xl items-center gap-3 px-4">
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            aria-label="Back to home"
            className="grid h-9 w-9 place-items-center rounded-xl border border-border bg-surface text-muted
              transition-colors hover:bg-surface-2 hover:text-text"
          >
            <BackIcon />
          </button>
        ) : (
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand/15 text-brand">
            <ClapperIcon />
          </span>
        )}

        <div className="flex flex-1 items-baseline gap-2">
          <span className="font-display text-xl font-bold tracking-tight text-text">Plottle</span>
          <span className="hidden text-xs font-semibold uppercase tracking-wider text-faint sm:inline">
            2023–26
          </span>
        </div>

        <button
          type="button"
          onClick={onHelp}
          aria-label="How to play"
          className="grid h-9 w-9 place-items-center rounded-xl border border-border bg-surface text-muted
            transition-colors hover:bg-surface-2 hover:text-text"
        >
          <HelpIcon />
        </button>
        <ThemeToggle theme={theme} onToggle={onToggleTheme} />
      </div>
    </header>
  );
}
