import { describe, it, expect } from 'vitest';
import { scrubPlot, titleTokens } from '../api/_lib/scrub';

describe('titleTokens', () => {
  it('drops stopwords and keeps meaningful words', () => {
    expect(titleTokens('Return to Silent Hill').sort()).toEqual(['hill', 'return', 'silent']);
  });

  it('strips a trailing sequel number / roman numeral', () => {
    expect(titleTokens('Avatar 3')).toEqual(['avatar']);
    expect(titleTokens('Rocky IV')).toEqual(['rocky']);
  });

  it('merges primary + original titles without duplicates', () => {
    expect(titleTokens('The Mandalorian and Grogu', 'The Mandalorian and Grogu').sort()).toEqual([
      'grogu',
      'mandalorian',
    ]);
  });
});

describe('scrubPlot', () => {
  it('redacts title words case-insensitively as whole words', () => {
    const out = scrubPlot('...drawn to Silent Hill, a once familiar town', 'Return to Silent Hill', 'Return to Silent Hill');
    expect(out).toBe('...drawn to ▮▮▮▮ ▮▮▮▮, a once familiar town');
  });

  it('does not redact substrings inside other words', () => {
    // "hill" should not nuke "hillside"
    const out = scrubPlot('On the hillside near Silent Hill.', 'Silent Hill', 'Silent Hill');
    expect(out).toBe('On the hillside near ▮▮▮▮ ▮▮▮▮.');
  });

  it('leaves character names alone (only title words scrubbed)', () => {
    const out = scrubPlot('Din Djarin protects Grogu.', 'The Mandalorian and Grogu', 'The Mandalorian and Grogu');
    expect(out).toBe('Din Djarin protects ▮▮▮▮.');
  });
});
