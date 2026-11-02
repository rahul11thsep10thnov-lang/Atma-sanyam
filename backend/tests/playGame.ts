// Plays the real game engines (the same reducers the app runs) to produce
// genuine move logs for the verified-results tests. Strategies are honest
// players: some read the dealt puzzle's solution, others play randomly until
// the game ends the way the test needs.
import { deriveSeed, loadEnginesInProcess } from '../src/services/replayService.js';

type Json = Record<string, unknown> & { type: string };
type Engine = ReturnType<typeof loadEnginesInProcess>[string];
let engines: ReturnType<typeof loadEnginesInProcess> | null = null;
const engine = (id: string): Engine => {
  engines ??= loadEnginesInProcess();
  const e = engines[id];
  if (!e) throw new Error(`no engine for ${id}`);
  return e;
};

export interface Played {
  proof: { restart: number; actions: Json[] };
  /** What the app would report: outcome class, score and stars at the end of the log. */
  claim: { outcome: 'completed' | 'failed'; score: number | null; stars: number };
  phase: 'won' | 'lost' | 'playing';
  state: any; // eslint-disable-line @typescript-eslint/no-explicit-any
}

export function ctxFor(difficulty: string, bracket: string, serverSeed: number, restart = 0) {
  return { difficulty, bracket, seed: deriveSeed(serverSeed, restart), sound: false, narration: false };
}

function finish(e: Engine, ctx: ReturnType<typeof ctxFor>, state: unknown, actions: Json[], restart: number): Played {
  const st = e.status(state, ctx);
  return {
    proof: { restart, actions },
    claim: { outcome: st.phase === 'won' ? 'completed' : 'failed', score: typeof st.score === 'number' ? st.score : null, stars: st.stars ?? 0 },
    phase: st.phase as Played['phase'],
    state,
  };
}

/** Applies actions in order, stopping once the game is over (as the app does). */
export function playScript(gameId: string, difficulty: string, bracket: string, serverSeed: number, script: (state: any) => Json[], restart = 0): Played { // eslint-disable-line @typescript-eslint/no-explicit-any
  const e = engine(gameId);
  const ctx = ctxFor(difficulty, bracket, serverSeed, restart);
  const state = e.init(ctx);
  const actions = script(state);
  let s = state;
  const applied: Json[] = [];
  for (const a of actions) {
    if (e.status(s, ctx).phase !== 'playing') break;
    s = e.reduce(s, a, ctx);
    applied.push(a);
  }
  return finish(e, ctx, s, applied, restart);
}

/** A small deterministic generator for the test's own choices (not the game's). */
function lcg(seed: number) {
  let x = seed >>> 0;
  return () => ((x = (Math.imul(x, 1664525) + 1013904223) >>> 0) / 2 ** 32);
}

/**
 * Plays random legal-or-ignored actions from `candidates` until the game ends,
 * retrying with a different random stream until it ends as `want`.
 */
export function playRandomly(gameId: string, difficulty: string, bracket: string, serverSeed: number, candidates: (state: any) => Json[], want: 'won' | 'lost' | 'any' = 'any', restart = 0): Played { // eslint-disable-line @typescript-eslint/no-explicit-any
  const e = engine(gameId);
  const ctx = ctxFor(difficulty, bracket, serverSeed, restart);
  for (let attempt = 1; attempt <= 400; attempt++) {
    const rand = lcg(attempt * 7919);
    let s = e.init(ctx);
    const actions: Json[] = [];
    for (let step = 0; step < 6000 && e.status(s, ctx).phase === 'playing'; step++) {
      const opts = candidates(s);
      const a = opts[Math.floor(rand() * opts.length)]!;
      s = e.reduce(s, a, ctx);
      actions.push(a);
    }
    const played = finish(e, ctx, s, actions, restart);
    if (played.phase !== 'playing' && (want === 'any' || played.phase === want)) return played;
  }
  throw new Error(`could not play ${gameId} to a ${want} result`);
}

// ---- strategies per game -------------------------------------------------------------

export const connectFourMoves = (s: { turn: number }): Json[] => (s.turn === 1 ? [0, 1, 2, 3, 4, 5, 6].map((col) => ({ type: 'drop', col })) : [{ type: 'ai' }]);

export const snakesMoves = (s: { mode: string | null; turn: number }): Json[] => (s.mode === null ? [{ type: 'mode', mode: 'computer' }] : s.turn === 0 ? [{ type: 'roll' }] : [{ type: 'ai' }]);

export const ludoMoves =
  (mode: 'computer' | 'friends') =>
  (s: { mode: string | null }): Json[] =>
    s.mode === null ? [{ type: 'mode', mode }] : [{ type: 'roll' }, { type: 'ai' }, { type: 'move', token: 0 }, { type: 'move', token: 1 }, { type: 'move', token: 2 }, { type: 'move', token: 3 }];

/** Solves the dealt sudoku: select every empty cell and enter its solution. */
export function sudokuSolution(s: { puzzle: { givens: number[]; solution: number[] } }): Json[] {
  const out: Json[] = [];
  s.puzzle.givens.forEach((g, i) => {
    if (!g) out.push({ type: 'select', index: i }, { type: 'enter', value: s.puzzle.solution[i]! });
  });
  return out;
}

/** Flips every matching pair. */
export function memoryPairs(s: { cards: { id: number; face: number }[] }): Json[] {
  const byFace = new Map<number, number[]>();
  for (const c of s.cards) byFace.set(c.face, [...(byFace.get(c.face) ?? []), c.id]);
  return [...byFace.values()].flatMap(([a, b]) => [{ type: 'flip', id: a! }, { type: 'flip', id: b! }]);
}

/** Answers every quiz question correctly. */
export function quizAnswers(s: { rounds: { answer: number }[] }): Json[] {
  return s.rounds.flatMap((r) => [{ type: 'pick', option: r.answer }, { type: 'next' }]);
}
