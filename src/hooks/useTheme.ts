import { useCallback, useEffect, useState } from 'react';
import { getTheme, setTheme as persistTheme } from '../lib/storage';

type Theme = 'dark' | 'light';

function systemTheme(): Theme {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

/**
 * Theme state. Defaults to the system preference (and tracks it live until the
 * user makes an explicit choice, which is then persisted and overrides system).
 */
export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(() => getTheme() ?? systemTheme());

  // Apply to <html> (class strategy). Inline script already did this pre-paint.
  useEffect(() => {
    const root = document.documentElement;
    root.classList.add('theme-transition');
    root.classList.toggle('dark', theme === 'dark');
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', theme === 'dark' ? '#0e0d14' : '#faf7f0');
    const t = setTimeout(() => root.classList.remove('theme-transition'), 400);
    return () => clearTimeout(t);
  }, [theme]);

  // Follow the system theme until the user picks one explicitly.
  useEffect(() => {
    if (getTheme()) return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => setThemeState(systemTheme());
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  const toggle = useCallback(() => {
    setThemeState((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark';
      persistTheme(next);
      return next;
    });
  }, []);

  return { theme, toggle };
}
