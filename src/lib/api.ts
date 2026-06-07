import type { Mode, RoundResponse, GuessResponse } from './types';

/** Fetch a fresh round (server-scrubbed plot, no answer) for the given mode. */
export async function fetchRound(mode: Mode): Promise<RoundResponse> {
  const res = await fetch(`/api/round?mode=${mode}`);
  if (!res.ok) throw new Error(`round ${res.status}`);
  return (await res.json()) as RoundResponse;
}

export interface GuessArgs {
  roundId?: string;
  roundToken?: string;
  guessId?: string;
  /** Which guess this is (1-based); gates progressive hint reveals server-side. */
  guessNumber?: number;
  /** True when the round is over on the client (gave up / used all guesses). */
  reveal?: boolean;
}

/** Submit a guess; the server decides correctness and owns the answer. */
export async function submitGuess(args: GuessArgs): Promise<GuessResponse> {
  const res = await fetch('/api/guess', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(args),
  });
  if (res.status === 429) throw new Error('Too many guesses — slow down a moment.');
  if (!res.ok) throw new Error(`guess ${res.status}`);
  return (await res.json()) as GuessResponse;
}
