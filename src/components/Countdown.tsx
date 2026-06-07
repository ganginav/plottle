import { useEffect, useState } from 'react';
import { timeUntilNextUtcMidnight } from '../lib/format';

/** Live countdown to the next daily puzzle (next UTC midnight). */
export function Countdown() {
  const [t, setT] = useState(() => timeUntilNextUtcMidnight());
  useEffect(() => {
    const id = setInterval(() => setT(timeUntilNextUtcMidnight()), 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="text-center">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-faint">Next puzzle in</div>
      <div className="font-display text-2xl font-bold tabular-nums text-text">{t}</div>
    </div>
  );
}
