import { useEffect, useState } from 'react';
import { useTheme } from './hooks/useTheme';
import { useSnapshot } from './hooks/useSnapshot';
import { getDailyStats, getDailyResult, hasSeenHowTo, markSeenHowTo } from './lib/storage';
import { Header } from './components/Header';
import { HowToPlay } from './components/HowToPlay';
import { LoadingState, ErrorState } from './components/States';
import { Home } from './modes/Home';
import { DailyMode } from './modes/DailyMode';
import { EndlessMode } from './modes/EndlessMode';

type View = 'home' | 'daily' | 'endless';

export default function App() {
  const { theme, toggle } = useTheme();
  const { status, snapshot, moviesById, reload } = useSnapshot();
  const [view, setView] = useState<View>('home');
  const [help, setHelp] = useState(false);

  // First-time visitors get the rules automatically.
  useEffect(() => {
    if (!hasSeenHowTo()) {
      setHelp(true);
      markSeenHowTo();
    }
  }, []);

  const stats = getDailyStats();
  const playedToday = getDailyResult()?.date === new Date().toISOString().slice(0, 10);
  const movies = snapshot?.movies ?? [];

  return (
    <div className="min-h-dvh">
      <Header
        theme={theme}
        onToggleTheme={toggle}
        onHelp={() => setHelp(true)}
        onBack={view === 'home' ? undefined : () => setView('home')}
      />

      <main className="mx-auto w-full max-w-2xl px-4 pb-24 pt-6">
        {status === 'loading' && <LoadingState label="Loading movies…" />}
        {status === 'error' && (
          <ErrorState message="Couldn't load the movie list. Check your connection." onRetry={reload} />
        )}

        {status === 'ready' && (
          <>
            {view === 'home' && <Home stats={stats} playedToday={playedToday} onPick={setView} />}
            {view === 'daily' && (
              <DailyMode movies={movies} moviesById={moviesById} onKeepPlaying={() => setView('endless')} />
            )}
            {view === 'endless' && <EndlessMode movies={movies} moviesById={moviesById} />}
          </>
        )}
      </main>

      <footer className="mx-auto max-w-2xl px-4 pb-8 text-center text-xs text-faint">
        Data from{' '}
        <a href="https://imdbapi.dev" target="_blank" rel="noopener noreferrer" className="underline hover:text-muted">
          imdbapi.dev
        </a>
        {snapshot && <> · snapshot {snapshot.generatedAt.slice(0, 10)}</>}
      </footer>

      <HowToPlay open={help} onClose={() => setHelp(false)} />
    </div>
  );
}
