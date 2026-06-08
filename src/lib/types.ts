/** Public (plotless) movie record — everything the browser is allowed to see. */
export interface PublicMovie {
  id: string;
  primaryTitle: string;
  originalTitle: string;
  posterUrl: string | null;
  startYear: number;
  runtimeSeconds: number | null;
  genres: string[];
  rating: { aggregateRating: number; voteCount: number } | null;
}

export interface Snapshot {
  generatedAt: string;
  canonicalYearSpan: [number, number];
  movies: PublicMovie[];
}

export type Mode = 'daily' | 'endless';

/** Round handle returned by GET /api/round (never contains the answer). */
export interface RoundResponse {
  mode: Mode;
  plot: string;
  guessesAllowed: number;
  roundId?: string; // daily: the date
  roundToken?: string; // endless: opaque HMAC token
}

/**
 * Hint values for the answer, revealed progressively by the server. They live on
 * the server (not derivable from the client snapshot, which has no answer id) so
 * the answer's identity stays hidden until the round is over.
 */
export interface RevealedHints {
  genres?: string[];
  year?: number;
  runtimeSeconds?: number | null;
  rating?: { aggregateRating: number; voteCount: number };
  posterUrl?: string | null;
  /** Title with only first letters + word lengths shown (final hint). */
  obfuscatedTitle?: string;
}

export interface GuessResponse {
  correct: boolean;
  gameOver: boolean;
  /** Cumulative hints unlocked so far by wrong guesses. */
  hints?: RevealedHints;
  /** Only present once the round is over (correct guess, or reveal). */
  answer?: { id: string; title: string };
}

/** The five hints unlocked, in order, by wrong guesses. */
export type HintKey = 'genres' | 'year' | 'runtime' | 'rating' | 'poster';

export interface DailyStats {
  played: number;
  wins: number;
  currentStreak: number;
  maxStreak: number;
  /** Histogram of solves by guess number (index 0 = guess 1 … 5 = guess 6). */
  distribution: number[];
}

/** Worldwide aggregate for one daily puzzle (from /api/stats). */
export interface CommunityStats {
  enabled: boolean;
  played: number;
  solved: number;
  byGuess: number[]; // byGuess[i] = solves on guess i+1
  fails: number;
}

export interface DailyResult {
  date: string;
  solved: boolean;
  guessUsed: number; // guesses taken (1-6); for a loss, the count made
  guessedIds: string[];
  answerId: string;
}
