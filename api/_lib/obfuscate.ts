/**
 * Obfuscate a movie title for the final hint: reveal the first letter of each word
 * and the word lengths, mask the remaining letters with • and keep punctuation.
 * Runs server-side (it derives from the secret title) and is delivered only as the
 * last hint, just before the final guess.
 *
 *   "Project Hail Mary"      → "P•••••• H••• M•••"
 *   "28 Years Later"         → "2• Y•••• L••••"
 *   "Mission: Impossible"    → "M••••••: I•••••••••"
 */
export function obfuscateTitle(title: string): string {
  let firstOfWord = true;
  let out = '';
  for (const ch of title) {
    if (/[a-z0-9]/i.test(ch)) {
      out += firstOfWord ? ch : '•';
      firstOfWord = false;
    } else {
      out += ch; // spaces & punctuation are structure, keep them
      if (/\s/.test(ch)) firstOfWord = true;
    }
  }
  return out;
}
