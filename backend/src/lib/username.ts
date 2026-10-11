// Usernames: 3–20 characters, letters, digits, underscore and dot, starting
// with a letter, no two dots/underscores in a row and none at the end. The
// case someone types is kept for display; uniqueness and search use the
// lower-case form.
export const USERNAME_RE = /^[A-Za-z](?!.*[._]{2})[A-Za-z0-9._]{1,18}[A-Za-z0-9]$/;

const RESERVED = new Set([
  'admin', 'administrator', 'moderator', 'mod', 'support', 'help', 'root', 'system', 'staff', 'official',
  'tame', 'tameapp', 'tame_app', 'focus', 'me', 'you', 'friends', 'friend', 'null', 'undefined', 'anonymous',
  'guest', 'user', 'users', 'api', 'www', 'mail', 'security', 'abuse', 'owner', 'team',
]);

export function normalizeUsername(input: string): string {
  return input.trim().toLowerCase();
}

export type UsernameProblem = 'invalid' | 'reserved';

export function usernameProblem(input: string): UsernameProblem | null {
  const trimmed = input.trim();
  if (!USERNAME_RE.test(trimmed)) return 'invalid';
  if (RESERVED.has(normalizeUsername(trimmed))) return 'reserved';
  return null;
}
