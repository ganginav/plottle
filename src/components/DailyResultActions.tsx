import { useState } from 'react';
import type { DailyStats, DailyResult } from '../lib/types';
import { buildShareText } from '../lib/share';
import { Countdown } from './Countdown';
import { ShareIcon, CheckIcon } from './icons';

interface Props {
  result: DailyResult;
  stats: DailyStats;
  guessesAllowed: number;
  onKeepPlaying: () => void;
}

export function DailyResultActions({ result, stats, guessesAllowed, onKeepPlaying }: Props) {
  const [copied, setCopied] = useState(false);

  async function share() {
    const text = buildShareText(result, guessesAllowed);
    try {
      if (navigator.share) {
        await navigator.share({ text });
        return;
      }
    } catch {
      /* fall through to clipboard */
    }
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* ignore */
    }
  }

  const winPct = stats.played ? Math.round((stats.wins / stats.played) * 100) : 0;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-4 gap-2 text-center">
        <StatCell label="Played" value={stats.played} />
        <StatCell label="Win %" value={winPct} />
        <StatCell label="Streak" value={stats.currentStreak} />
        <StatCell label="Max" value={stats.maxStreak} />
      </div>

      <button type="button" onClick={share} className="btn-primary w-full">
        {copied ? (
          <>
            <CheckIcon className="h-4 w-4" /> Copied!
          </>
        ) : (
          <>
            <ShareIcon className="h-4 w-4" /> Share result
          </>
        )}
      </button>

      <div className="flex items-center justify-between gap-4 rounded-xl bg-surface-2 px-4 py-3">
        <Countdown />
        <button type="button" onClick={onKeepPlaying} className="btn-ghost shrink-0">
          Keep playing →
        </button>
      </div>
    </div>
  );
}

function StatCell({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-surface-2 py-2.5">
      <div className="font-display text-xl font-bold leading-none text-text">{value}</div>
      <div className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-faint">{label}</div>
    </div>
  );
}
