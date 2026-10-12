import { createHash, randomBytes } from 'node:crypto';

// Opaque bearer tokens: 256 bits of randomness handed to the client once; only
// the SHA-256 is stored, so a database leak doesn't leak usable sessions.
export function generateToken(): string {
  return randomBytes(32).toString('base64url');
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
