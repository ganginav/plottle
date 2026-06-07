import { describe, it, expect } from 'vitest';
import { obfuscateTitle } from '../api/_lib/obfuscate';

describe('obfuscateTitle', () => {
  it('reveals first letters + word lengths, masks the rest', () => {
    expect(obfuscateTitle('Project Hail Mary')).toBe('P•••••• H••• M•••');
  });

  it('keeps digits and punctuation as structure', () => {
    expect(obfuscateTitle('28 Years Later')).toBe('2• Y•••• L••••');
    expect(obfuscateTitle('Mission: Impossible')).toBe('M••••••: I•••••••••');
  });

  it('handles single-word titles', () => {
    expect(obfuscateTitle('Backrooms')).toBe('B••••••••');
  });

  it('never leaks the full title', () => {
    const out = obfuscateTitle('Oppenheimer');
    expect(out).not.toBe('Oppenheimer');
    expect(out.startsWith('O')).toBe(true);
  });
});
