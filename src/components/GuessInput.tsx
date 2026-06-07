import { useEffect, useId, useMemo, useRef, useState } from 'react';
import type { PublicMovie } from '../lib/types';
import { searchMovies } from '../hooks/useSnapshot';
import { SearchIcon } from './icons';

interface Props {
  movies: PublicMovie[];
  guessedIds: string[];
  disabled?: boolean;
  submitting?: boolean;
  onGuess: (movie: PublicMovie) => void;
}

/** Accessible combobox: type to filter, ↑/↓ to navigate, Enter to submit a pick. */
export function GuessInput({ movies, guessedIds, disabled, submitting, onGuess }: Props) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useId();

  const guessed = useMemo(() => new Set(guessedIds), [guessedIds]);
  const results = useMemo(() => searchMovies(movies, query, 8), [movies, query]);

  useEffect(() => setActive(0), [query]);

  // Close on outside click.
  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  function pick(movie: PublicMovie | undefined) {
    if (!movie || guessed.has(movie.id) || disabled) return;
    onGuess(movie);
    setQuery('');
    setOpen(false);
    setActive(0);
    inputRef.current?.focus();
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (!open && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      setOpen(true);
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      pick(results[active]);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  }

  const showList = open && query.trim().length > 0;

  return (
    <div ref={rootRef} className="relative">
      <div
        className={`flex items-center gap-2 rounded-xl border bg-surface px-3 transition-shadow ${
          showList ? 'border-brand/70 shadow-glow' : 'border-border'
        } ${disabled ? 'opacity-60' : ''}`}
      >
        <SearchIcon className="h-5 w-5 shrink-0 text-faint" />
        <input
          ref={inputRef}
          type="text"
          role="combobox"
          aria-expanded={showList}
          aria-controls={listId}
          aria-autocomplete="list"
          autoComplete="off"
          spellCheck={false}
          disabled={disabled}
          value={query}
          placeholder={submitting ? 'Checking…' : 'Guess the movie…'}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          className="h-12 w-full bg-transparent text-base text-text placeholder:text-faint focus:outline-none disabled:cursor-not-allowed"
        />
      </div>

      {showList && (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-20 mt-2 max-h-80 w-full overflow-auto rounded-xl border border-border bg-bg-elev p-1.5 shadow-card animate-fade-up"
        >
          {results.length === 0 && (
            <li className="px-3 py-3 text-sm text-muted">No titles match “{query.trim()}”.</li>
          )}
          {results.map((m, i) => {
            const isGuessed = guessed.has(m.id);
            return (
              <li key={m.id} role="option" aria-selected={i === active}>
                <button
                  type="button"
                  disabled={isGuessed}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => pick(m)}
                  className={`flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors ${
                    i === active && !isGuessed ? 'bg-brand/15' : ''
                  } ${isGuessed ? 'opacity-50' : 'hover:bg-surface-2'}`}
                >
                  <Thumb movie={m} />
                  <span className="min-w-0 flex-1">
                    <span className={`block truncate text-sm font-semibold text-text ${isGuessed ? 'line-through' : ''}`}>
                      {m.primaryTitle}
                    </span>
                    {m.originalTitle !== m.primaryTitle && (
                      <span className="block truncate text-xs text-faint">{m.originalTitle}</span>
                    )}
                  </span>
                  <span className="shrink-0 text-xs font-medium text-muted">
                    {isGuessed ? 'guessed' : m.startYear}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function Thumb({ movie }: { movie: PublicMovie }) {
  return (
    <span className="grid h-12 w-8 shrink-0 place-items-center overflow-hidden rounded bg-surface-2">
      {movie.posterUrl ? (
        // Posters carry the title, but in the dropdown the player is choosing it anyway.
        <img src={movie.posterUrl} alt="" loading="lazy" className="h-full w-full object-cover" />
      ) : (
        <span className="text-[10px] text-faint">🎞️</span>
      )}
    </span>
  );
}
