/**
 * Opaque, HMAC-signed round tokens for Endless mode. The token carries the answer
 * id so the backend stays stateless (no DB), but the client cannot read or forge
 * it without the server secret.
 */
import { createHmac, timingSafeEqual } from 'node:crypto';

const SECRET = process.env.HMAC_SECRET || 'dev-secret-change-me';

function b64url(buf: Buffer | string): string {
  return Buffer.from(buf).toString('base64url');
}

function sign(payloadB64: string): string {
  return createHmac('sha256', SECRET).update(payloadB64).digest('base64url');
}

interface TokenPayload {
  id: string;
  iat: number;
}

/** Create an opaque token encoding the answer id. */
export function signRoundToken(id: string): string {
  const payload: TokenPayload = { id, iat: Date.now() };
  const payloadB64 = b64url(JSON.stringify(payload));
  return `${payloadB64}.${sign(payloadB64)}`;
}

/** Verify a token and recover the answer id, or null if tampered/invalid. */
export function verifyRoundToken(token: string): string | null {
  if (typeof token !== 'string') return null;
  const dot = token.indexOf('.');
  if (dot <= 0) return null;
  const payloadB64 = token.slice(0, dot);
  const sigB64 = token.slice(dot + 1);

  const expected = sign(payloadB64);
  const a = Buffer.from(sigB64);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  try {
    const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8')) as TokenPayload;
    return typeof payload.id === 'string' ? payload.id : null;
  } catch {
    return null;
  }
}
