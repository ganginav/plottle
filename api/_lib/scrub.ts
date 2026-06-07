/**
 * Plot scrubbing — redacts title words from a plot before it is ever sent to the
 * browser. Pure and unit-testable. Runs only on the server.
 *
 * Rules:
 *  - Tokenize primaryTitle + originalTitle into words.
 *  - Drop stopwords (the/a/of/and/…) and a trailing sequel number / roman numeral.
 *  - Case-insensitively replace each remaining title word, as a whole word, with ▮▮▮▮.
 *  - Character names are intentionally NOT scrubbed (the "easy mode" for fans).
 */
const REDACTION = '▮▮▮▮';

const STOPWORDS = new Set([
  'the', 'a', 'an', 'of', 'and', 'or', 'to', 'in', 'on', 'at', 'for', 'with',
  'from', 'by', 'as', 'is', 'it', '&',
]);

const ROMAN_RE = /^[ivxlcdm]+$/i;

function isSequelMarker(token: string): boolean {
  return /^\d+$/.test(token) || ROMAN_RE.test(token);
}

/** Extract the set of title words worth redacting from one or more titles. */
export function titleTokens(...titles: string[]): string[] {
  const tokens = new Set<string>();
  for (const title of titles) {
    if (!title) continue;
    // Split on any non-alphanumeric run; keep apostrophes out so "Hill's" → "hill".
    const words = title.toLowerCase().split(/[^a-z0-9]+/i).filter(Boolean);
    // Strip a single trailing sequel marker (e.g. "Avatar 3", "Rocky IV").
    if (words.length > 1 && isSequelMarker(words[words.length - 1])) words.pop();
    for (const w of words) {
      if (w.length < 2) continue; // single letters carry no signal
      if (STOPWORDS.has(w)) continue;
      if (isSequelMarker(w)) continue;
      tokens.add(w);
    }
  }
  return [...tokens];
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Redact every title token (whole-word, case-insensitive) found in the plot. */
export function scrubPlot(plot: string, primaryTitle: string, originalTitle: string): string {
  const tokens = titleTokens(primaryTitle, originalTitle);
  if (tokens.length === 0) return plot;
  // Longest first so multi-word overlaps redact greedily and predictably.
  tokens.sort((a, b) => b.length - a.length);
  let out = plot;
  for (const token of tokens) {
    const re = new RegExp(`\\b${escapeRegExp(token)}\\b`, 'gi');
    out = out.replace(re, REDACTION);
  }
  return out;
}
