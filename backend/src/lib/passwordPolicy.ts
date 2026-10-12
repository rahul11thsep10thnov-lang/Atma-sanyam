import { z } from 'zod';

// The app's password rule: 6–15 characters with at least one capital letter,
// one small letter, one digit and one special character. The same rule is in
// the app (src/auth/passwordPolicy.ts) so the form can guide as someone types;
// this one is the check that counts.
export const PASSWORD_MIN = 6;
export const PASSWORD_MAX = 15;

export const PASSWORD_RULE_MESSAGE = `Use ${PASSWORD_MIN}–${PASSWORD_MAX} characters with a capital letter, a small letter, a number and a special character`;

export function passwordProblems(password: string): string[] {
  const problems: string[] = [];
  if (password.length < PASSWORD_MIN) problems.push(`at least ${PASSWORD_MIN} characters`);
  if (password.length > PASSWORD_MAX) problems.push(`at most ${PASSWORD_MAX} characters`);
  if (!/[A-Z]/.test(password)) problems.push('a capital letter');
  if (!/[a-z]/.test(password)) problems.push('a small letter');
  if (!/\d/.test(password)) problems.push('a number');
  if (!/[^A-Za-z0-9\s]/.test(password)) problems.push('a special character');
  if (/\s/.test(password)) problems.push('no spaces');
  return problems;
}

export const userPassword = z
  .string()
  .max(128)
  .refine((p) => passwordProblems(p).length === 0, PASSWORD_RULE_MESSAGE);
