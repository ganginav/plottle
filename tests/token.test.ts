import { describe, it, expect, beforeAll } from 'vitest';
import { signRoundToken, verifyRoundToken } from '../api/_lib/token';

beforeAll(() => {
  process.env.HMAC_SECRET = 'test-secret';
});

describe('round token', () => {
  it('round-trips an id', () => {
    const token = signRoundToken('tt1234567');
    expect(verifyRoundToken(token)).toBe('tt1234567');
  });

  it('is opaque (id not readable in plaintext)', () => {
    const token = signRoundToken('tt9999999');
    expect(token).not.toContain('tt9999999');
  });

  it('rejects a tampered payload', () => {
    const token = signRoundToken('tt1111111');
    const [, sig] = token.split('.');
    const forged = `${Buffer.from(JSON.stringify({ id: 'tt0000000', iat: 1 })).toString('base64url')}.${sig}`;
    expect(verifyRoundToken(forged)).toBeNull();
  });

  it('rejects garbage', () => {
    expect(verifyRoundToken('not-a-token')).toBeNull();
    expect(verifyRoundToken('')).toBeNull();
  });
});
