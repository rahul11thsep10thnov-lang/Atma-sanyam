import { randomInt } from 'node:crypto';

// Player ids are what a child types to sign in: short, readable, and random,
// so one child cannot guess another's from a name. No vowels or look-alike
// characters (0/O, 1/I/L) to keep them easy to copy from a parent's screen.
const ALPHABET = 'BCDFGHJKMNPQRSTVWXYZ23456789';

export function generatePlayerId(): string {
  let s = '';
  for (let i = 0; i < 6; i++) s += ALPHABET[randomInt(0, ALPHABET.length)];
  return `LOJI-${s.slice(0, 3)}${s.slice(3)}`;
}

export const PLAYER_ID_RE = /^LOJI-[BCDFGHJKMNPQRSTVWXYZ2-9]{6}$/i;

export function normalizePlayerId(input: string): string {
  const s = input.trim().toUpperCase().replace(/\s+/g, '');
  return s.startsWith('LOJI-') ? s : s.startsWith('LOJI') ? `LOJI-${s.slice(4)}` : `LOJI-${s}`;
}
