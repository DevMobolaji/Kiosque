import { randomBytes, createHash, timingSafeEqual } from 'crypto';

/**
 * Generate a URL-safe secure random token.
 * Used for: email verification tokens, password reset tokens.
 *
 * 32 bytes = 256 bits of entropy. Uncrackable.
 */
export function generateSecureToken(byteLength: number = 32): string {
  return randomBytes(byteLength).toString('base64url');
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function compareTokenHashes(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  return timingSafeEqual(Buffer.from(a), Buffer.from(b));
}
