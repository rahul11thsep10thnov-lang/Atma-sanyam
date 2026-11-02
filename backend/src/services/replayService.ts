// Verified game results. The server picks each session's seed and the app
// logs every action the child takes; at the end the server replays that log
// through the same reducers the app runs (bundled into engines.generated.ts)
// and computes the true outcome, score and stars itself. A claimed win that
// the replay does not reach is never paid or ranked.
//
// What this stops: forged scores and wins, impossible or truncated games,
// results for a game that was never played, and tampering with the seed or the
// game's own rules. What it cannot stop: a person or bot playing legal moves
// well (for example with an outside chess engine). Games whose result depends
// on timing or analogue aim (cricket, bowling, football penalty) are not
// replayable and keep the older bounds-only checks.
import { Worker } from 'node:worker_threads';
import { createRequire } from 'node:module';
import { z } from 'zod';
import { ENGINE_BUNDLE, ENGINE_IDS } from '../games/engines.generated.js';

export const REPLAYABLE_GAMES: ReadonlySet<string> = new Set(ENGINE_IDS);
export const MAX_ACTIONS = 3000;
export const MAX_RESTARTS = 30;
const REPLAY_TIMEOUT_MS = 8000;
const MAX_PARALLEL = 2;
const MAX_WAITING = 8;

/** Must stay identical to deriveSeed in src/games/engine.ts (a shared test vector checks it). */
export function deriveSeed(base: number, restart: number): number {
  if (restart === 0) return base;
  return ((Math.imul(base ^ 0x9e3779b9, 0x85ebca6b) + Math.imul(restart, 0xc2b2ae35)) >>> 0) % 2147483648;
}

export const proofSchema = z.object({
  restart: z.number().int().min(0).max(MAX_RESTARTS),
  actions: z.array(z.object({ type: z.string().min(1).max(32) }).catchall(z.unknown())).max(MAX_ACTIONS),
});
export type Proof = z.infer<typeof proofSchema>;

export interface Claim {
  outcome: 'completed' | 'abandoned' | 'failed';
  score: number | null;
  stars: number;
}

export type VerificationStatus = 'verified' | 'corrected' | 'rejected' | 'unverified' | 'not_applicable';

export interface Verification {
  status: VerificationStatus;
  note: string | null;
  /** What the server will record and pay for. */
  effective: Claim;
  /** May this result be ranked and earn win bonuses? */
  rankable: boolean;
  /** Pass-and-play games are never ranked or paid as wins. */
  mode: string | null;
}

export interface ReplayRequest {
  gameId: string;
  difficulty: string;
  bracket: string;
  seed: number;
  actions: unknown[];
}
export type ReplayResult =
  | { ok: true; phase: 'playing' | 'won' | 'lost'; score: number | null; stars: number; mode: string | null; applied: number }
  | { ok: false; reason: 'engine_error' | 'unknown_game' | 'timeout' | 'busy' | 'worker_failed'; message?: string };

// The worker evaluates the bundle once and replays one request. It runs in its
// own thread with memory limits and a hard timeout so a hostile log cannot
// stall the API.
const WORKER_SOURCE =
  "const { parentPort, workerData } = require('node:worker_threads');\n" +
  'const ENGINES = (function () { const module = { exports: {} }; const exports = module.exports;\n' +
  ENGINE_BUNDLE +
  '\n return module.exports.ENGINES; })();\n' +
  `(function () {
  try {
    const d = workerData;
    const def = ENGINES[d.gameId];
    if (!def) return parentPort.postMessage({ ok: false, reason: 'unknown_game' });
    const ctx = { difficulty: d.difficulty, bracket: d.bracket, seed: d.seed, sound: false, narration: false };
    let s = def.init(ctx);
    let status = def.status(s, ctx);
    let applied = 0;
    for (const a of d.actions) {
      if (status.phase !== 'playing') break; // the app stops accepting input once a game ends
      s = def.reduce(s, a, ctx);
      applied += 1;
      status = def.status(s, ctx);
    }
    parentPort.postMessage({ ok: true, phase: status.phase, score: typeof status.score === 'number' ? Math.round(status.score) : null, stars: status.stars | 0, mode: s && typeof s.mode === 'string' ? s.mode : null, applied });
  } catch (e) {
    parentPort.postMessage({ ok: false, reason: 'engine_error', message: String((e && e.message) || e).slice(0, 200) });
  }
})();`;

let running = 0;
const waiting: (() => void)[] = [];

async function acquire(): Promise<boolean> {
  if (running < MAX_PARALLEL) {
    running += 1;
    return true;
  }
  if (waiting.length >= MAX_WAITING) return false;
  await new Promise<void>((resolve) => waiting.push(resolve));
  running += 1;
  return true;
}
function release() {
  running -= 1;
  waiting.shift()?.();
}

export async function runReplay(req: ReplayRequest, timeoutMs = REPLAY_TIMEOUT_MS): Promise<ReplayResult> {
  if (!(await acquire())) return { ok: false, reason: 'busy' };
  try {
    return await new Promise<ReplayResult>((resolve) => {
      let done = false;
      const finish = (r: ReplayResult) => {
        if (done) return;
        done = true;
        clearTimeout(timer);
        void worker.terminate();
        resolve(r);
      };
      const worker = new Worker(WORKER_SOURCE, { eval: true, workerData: req, resourceLimits: { maxOldGenerationSizeMb: 256, maxYoungGenerationSizeMb: 32 } });
      const timer = setTimeout(() => finish({ ok: false, reason: 'timeout' }), timeoutMs);
      worker.once('message', (m: ReplayResult) => finish(m));
      worker.once('error', (e) => finish({ ok: false, reason: 'worker_failed', message: String(e?.message ?? e).slice(0, 200) }));
      worker.once('exit', () => finish({ ok: false, reason: 'worker_failed' }));
    });
  } finally {
    release();
  }
}

/** The engines evaluated in this process. For tests that need to play a game to produce a valid log. */
export function loadEnginesInProcess(): Record<string, { init: (c: unknown) => unknown; reduce: (s: unknown, a: unknown, c: unknown) => unknown; status: (s: unknown, c: unknown) => { phase: string; score?: number; stars?: number } }> {
  const mod = { exports: {} as { ENGINES?: never } };
  new Function('module', 'exports', 'require', ENGINE_BUNDLE)(mod, mod.exports, createRequire(import.meta.url));
  return mod.exports.ENGINES as never;
}

const passthrough = (claim: Claim, status: VerificationStatus, note: string | null, rankable: boolean): Verification => ({ status, note, effective: claim, rankable, mode: null });

export interface VerifyInput {
  gameId: string;
  difficulty: string;
  bracket: string;
  seed: number | null;
  claim: Claim;
  proof: unknown;
}

let runner: (r: ReplayRequest) => Promise<ReplayResult> = runReplay;
/** Test seam: lets bookkeeping tests (coins, rankings) decide what "the replay said" without playing a game. Pass null to restore. */
export function setReplayRunnerForTests(fn: ((r: ReplayRequest) => Promise<ReplayResult>) | null) {
  runner = fn ?? runReplay;
}

export async function verifyEndedGame(input: VerifyInput, run: (r: ReplayRequest) => Promise<ReplayResult> = (r) => runner(r)): Promise<Verification> {
  const { claim } = input;
  if (!REPLAYABLE_GAMES.has(input.gameId)) return passthrough(claim, 'not_applicable', null, true);
  if (claim.outcome === 'abandoned') return passthrough(claim, 'not_applicable', 'abandoned', false);
  const rejected = (note: string): Verification => ({ status: 'rejected', note, effective: { outcome: 'abandoned', score: null, stars: 0 }, rankable: false, mode: null });
  if (input.seed === null) return passthrough(claim, 'unverified', 'session has no seed', false);
  if (input.proof === undefined || input.proof === null) return rejected('no proof of play was sent');
  const parsed = proofSchema.safeParse(input.proof);
  if (!parsed.success) return rejected('the proof of play is malformed');
  const result = await run({ gameId: input.gameId, difficulty: input.difficulty, bracket: input.bracket, seed: deriveSeed(input.seed, parsed.data.restart), actions: parsed.data.actions });
  if (!result.ok) {
    if (result.reason === 'engine_error' || result.reason === 'unknown_game') return rejected(`the replay failed (${result.message ?? result.reason})`);
    return passthrough(claim, 'unverified', `could not be checked (${result.reason})`, false); // our side failed: no punishment, but no ranking either
  }
  if (result.phase === 'playing') return rejected('the logged moves do not finish the game');
  const effective: Claim = { outcome: result.phase === 'won' ? 'completed' : 'failed', score: result.score, stars: result.stars };
  const same = effective.outcome === claim.outcome && effective.score === claim.score && effective.stars === claim.stars;
  return { status: same ? 'verified' : 'corrected', note: same ? null : 'the result was recomputed from the logged moves', effective, rankable: result.mode !== 'friends', mode: result.mode };
}
