import { useState } from 'react';
import type { DailyStats, DailyResult, CommunityStats } from '../lib/types';
import { buildShareText } from '../lib/share';
import { formatVotes } from '../lib/format';
import { Countdown } from './Countdown';
import { ShareIcon, CheckIcon } from './icons';

interface Props {
  result: DailyResult;
  stats: DailyStats;
  community: CommunityStats | null;
  guessesAllowed: number;
  onKeepPlaying: () => void;
}

export function DailyResultActions({ result, stats, community, guessesAllowed, onKeepPlaying }: Props) {
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

      {community && community.played > 0 && (
        <CommunityPanel community={community} result={result} guessesAllowed={guessesAllowed} />
      )}

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

function CommunityPanel({
  community,
  result,
  guessesAllowed,
}: {
  community: CommunityStats;
  result: DailyResult;
  guessesAllowed: number;
}) {
  const { played, solved, byGuess, fails } = community;
  const solvePct = played ? Math.round((solved / played) * 100) : 0;
  // Scale bars against the most common single outcome.
  const max = Math.max(1, ...byGuess.slice(0, guessesAllowed), fails);
  const yourGuess = result.solved ? result.guessUsed : -1;

  return (
    <div className="rounded-xl border border-border bg-surface-2/60 p-4">
      <div className="mb-3 flex items-baseline justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-faint">Today worldwide</span>
        <span className="text-sm font-semibold text-text">
          👥 {formatVotes(played)} played · <span className="text-good">{solvePct}% solved</span>
        </span>
      </div>
      <div className="space-y-1.5">
        {Array.from({ length: guessesAllowed }).map((_, i) => (
          <DistRow
            key={i}
            label={`${i + 1}`}
            count={byGuess[i] ?? 0}
            max={max}
            highlight={yourGuess === i + 1}
            tone="good"
          />
        ))}
        {fails > 0 && <DistRow label="X" count={fails} max={max} highlight={!result.solved} tone="bad" />}
      </div>
    </div>
  );
}

function DistRow({
  label,
  count,
  max,
  highlight,
  tone,
}: {
  label: string;
  count: number;
  max: number;
  highlight: boolean;
  tone: 'good' | 'bad';
}) {
  const pct = Math.round((count / max) * 100);
  const bar = tone === 'good' ? 'bg-good' : 'bg-bad';
  return (
    <div className="flex items-center gap-2">
      <span className={`w-3 text-right text-xs font-bold ${highlight ? 'text-brand' : 'text-faint'}`}>{label}</span>
      <div className="flex-1">
        <div
          className={`flex h-5 min-w-[1.75rem] items-center justify-end rounded px-1.5 text-[11px] font-bold text-bg transition-all ${bar} ${
            highlight ? 'ring-2 ring-brand ring-offset-1 ring-offset-surface-2' : ''
          }`}
          style={{ width: `${Math.max(pct, count > 0 ? 12 : 0)}%` }}
        >
          {count > 0 ? formatVotes(count) : ''}
        </div>
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
