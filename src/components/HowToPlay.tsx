import { Modal } from './Modal';

interface Props {
  open: boolean;
  onClose: () => void;
}

const STEPS = [
  { n: '1', t: 'Read the plot', d: 'Every round opens with a real IMDb plot for a 2026 movie. Title words are redacted with ▮▮▮▮.' },
  { n: '2', t: 'Guess from the list', d: 'Start typing and pick a title. You get 6 guesses.' },
  { n: '3', t: 'Earn hints', d: 'Each wrong guess unlocks the next clue: genres → year → runtime → rating → a blurred poster.' },
  { n: '4', t: 'Score big, fast', d: 'Fewer guesses = more points. Guess 1 is worth 100, down to 15 on guess 6.' },
];

export function HowToPlay({ open, onClose }: Props) {
  return (
    <Modal open={open} title="How to play" onClose={onClose}>
      <ol className="space-y-3.5">
        {STEPS.map((s) => (
          <li key={s.n} className="flex gap-3.5">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brand/15 text-sm font-bold text-brand">
              {s.n}
            </span>
            <div>
              <p className="font-semibold text-text">{s.t}</p>
              <p className="text-sm text-muted">{s.d}</p>
            </div>
          </li>
        ))}
      </ol>
      <div className="mt-5 rounded-xl bg-surface-2 p-4 text-sm text-muted">
        <p>
          <span className="font-semibold text-text">Daily</span> — one shared puzzle for everyone, like Wordle.
          <br />
          <span className="font-semibold text-text">Endless</span> — back-to-back rounds, 3 lives, chase a high score.
        </p>
      </div>
      <button type="button" onClick={onClose} className="btn-primary mt-5 w-full">
        Got it
      </button>
    </Modal>
  );
}
