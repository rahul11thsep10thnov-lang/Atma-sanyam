// The game engine contract. Every game is a pure reducer over a serialisable
// state plus a View. That one decision gives us, for free: restart (init
// again), pause (stop dispatching), save/resume (the state is JSON), unit
// tests for the rules, and live mirroring (the Guardian Console renders the
// same View from the same state with `readOnly`). Randomness goes through
// the seeded RNG so a mirrored or restored game is identical.
import type React from 'react';
import type { AgeBracket } from '../types';

export interface GameContext {
  difficulty: string;
  bracket: AgeBracket;
  seed: number;
  /** Spoken help and sound effects allowed by the guardian. */
  sound: boolean;
  narration: boolean;
}

export type GamePhase = 'playing' | 'won' | 'lost';

export interface GameStatus {
  phase: GamePhase;
  score?: number;
  /** 0–3, decided by the game's own rules when won. */
  stars?: number;
  /** 0–1 for progress bars (optional). */
  progress?: number;
  /** Short line for the HUD, e.g. "Moves 12" or "Round 3 / 10". */
  hud?: string;
}

export interface GameViewProps<S, A> {
  state: S;
  dispatch: (action: A) => void;
  ctx: GameContext;
  /** The Guardian Console mirror: render only, never dispatch. */
  readOnly?: boolean;
  width: number;
  height: number;
  /** Fire a sound effect / spoken phrase if allowed. */
  say: (text: string) => void;
  sfx: (kind: 'tap' | 'good' | 'bad' | 'win' | 'pop') => void;
}

export interface GameDefinition<S = unknown, A = unknown> {
  id: string;
  init: (ctx: GameContext) => S;
  reduce: (state: S, action: A, ctx: GameContext) => S;
  status: (state: S, ctx: GameContext) => GameStatus;
  View: React.ComponentType<GameViewProps<S, A>>;
  /** Actions the engine dispatches itself on a timer (arcade games); return null to idle. */
  tick?: { intervalMs: number; action: A };
  /** Per-game saved progress: what to persist on completion (levels unlocked…). */
  persist?: (state: S, saved: Record<string, unknown>) => Record<string, unknown>;
  /** Portrait layout wants a square board (default) or the full screen. */
  layout?: 'square' | 'full';
}

/** Deterministic PRNG (mulberry32). */
export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffle<T>(items: T[], random: () => number): T[] {
  const a = items.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

export function pick<T>(items: readonly T[], random: () => number): T {
  return items[Math.floor(random() * items.length)]!;
}

export function newSeed(): number {
  return Math.floor(Math.random() * 2 ** 31);
}

/** Stars from a move count against a par: at or under par → 3, 1.5× → 2, else 1. */
export function starsForMoves(moves: number, par: number): number {
  if (moves <= par) return 3;
  if (moves <= par * 1.5) return 2;
  return 1;
}

export function starsForAccuracy(correct: number, total: number): number {
  const r = total ? correct / total : 0;
  return r >= 0.9 ? 3 : r >= 0.7 ? 2 : r >= 0.4 ? 1 : 0;
}
