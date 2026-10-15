// Age brackets from a month of birth (YYYY-MM). The full date is never
// collected: the month is enough to place a child and to move them up when
// they have a birthday.
import type { AgeBracketKey } from '../database/schema.js';

export const BRACKETS: { key: AgeBracketKey; name: string; minAge: number; maxAge: number; description: string }[] = [
  { key: 'A', name: 'Little Explorers', minAge: 3, maxAge: 5, description: 'Big buttons, bright pictures, simple taps and spoken help. Very little reading.' },
  { key: 'B', name: 'Brain Builders', minAge: 6, maxAge: 8, description: 'First puzzles, words and numbers, board games and simple crafts.' },
  { key: 'C', name: 'Mind Masters', minAge: 9, maxAge: 10, description: 'Logic, strategy, science and more complex making.' },
  { key: 'D', name: 'Junior Strategists', minAge: 11, maxAge: 12, description: 'Advanced strategy, engineering, coding and creative design.' },
];

export const BIRTH_MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

/** Whole years since the first day of the birth month. */
export function ageFromBirthMonth(birthMonth: string, now = new Date()): number {
  const [y, m] = birthMonth.split('-').map(Number) as [number, number];
  let age = now.getUTCFullYear() - y;
  if (now.getUTCMonth() + 1 < m) age -= 1;
  return age;
}

export function bracketForAge(age: number): AgeBracketKey {
  if (age <= 5) return 'A';
  if (age <= 8) return 'B';
  if (age <= 10) return 'C';
  return 'D';
}

export function bracketForBirthMonth(birthMonth: string, now = new Date()): AgeBracketKey {
  return bracketForAge(ageFromBirthMonth(birthMonth, now));
}

/** A child may be 3 to 12 at sign-up (the service is for ages 3–12). */
export function birthMonthProblem(birthMonth: string, now = new Date()): string | null {
  if (!BIRTH_MONTH_RE.test(birthMonth)) return 'Use the format YYYY-MM';
  const age = ageFromBirthMonth(birthMonth, now);
  if (age < 3) return 'LoJi is for children aged 3 to 12';
  if (age > 12) return 'LoJi is for children aged 3 to 12';
  return null;
}

/** Brackets at or below the given one (younger content is always allowed). */
export function bracketsUpTo(key: AgeBracketKey): AgeBracketKey[] {
  const order: AgeBracketKey[] = ['A', 'B', 'C', 'D'];
  return order.slice(0, order.indexOf(key) + 1);
}
