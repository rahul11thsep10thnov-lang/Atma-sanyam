// Verified results: the server deals each game's seed, replays the moves the
// app logged, and records and pays only what the replay shows. These tests
// play the real game engines through the real worker thread.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { eq } from 'drizzle-orm';
import { coinTransactions, gameSessions, rankingEvents } from '../src/database/schema.js';
import { setupTestApp } from './helpers.js';
import { addChild, as, birthMonthForAge, playerLogin, registerGuardian, subscribe } from './lojiHelpers.js';
import { ENGINE_IDS } from '../src/games/engines.generated.js';
import { deriveSeed, runReplay, setReplayRunnerForTests, verifyEndedGame } from '../src/services/replayService.js';
import { connectFourMoves, ludoMoves, memoryPairs, playRandomly, playScript, quizAnswers, snakesMoves, sudokuSolution } from './playGame.js';

let ctx: Awaited<ReturnType<typeof setupTestApp>>;
let token = '';
let childId = '';
let n = 0;

async function start(gameId: string, difficulty: string, seconds = 90) {
  n += 1;
  const res = await request(ctx.app).post('/v1/player/sessions/start').set(as(token)).send({ gameId, clientSessionId: `verify-${String(n).padStart(6, '0')}`, difficulty });
  if (res.status !== 201) throw new Error(`start failed ${res.status} ${JSON.stringify(res.body)}`);
  // Pretend the session has been running for a while (the server credits at most 90 s since the last heartbeat).
  await ctx.db.update(gameSessions).set({ lastHeartbeatAt: new Date(Date.now() - seconds * 1000) }).where(eq(gameSessions.id, res.body.sessionId));
  const [row] = await ctx.db.select({ bracket: gameSessions.bracket }).from(gameSessions).where(eq(gameSessions.id, res.body.sessionId));
  return { sessionId: res.body.sessionId as string, seed: res.body.seed as number, bracket: row!.bracket! };
}
const end = (sessionId: string, body: Record<string, unknown>) => request(ctx.app).post(`/v1/player/sessions/${sessionId}/end`).set(as(token)).send(body);
const coinsFor = async (sessionId: string) => (await ctx.db.select().from(coinTransactions).where(eq(coinTransactions.idempotencyKey, `session:${sessionId}:complete`)))[0];

beforeAll(async () => {
  ctx = await setupTestApp();
  const g = (await registerGuardian(ctx, '+919876560001')).token;
  await subscribe(ctx, g);
  const kid = await addChild(ctx, g, { displayName: 'Veda', birthMonth: birthMonthForAge(10), pin: '4826', playerOtpRequired: false });
  childId = kid.id;
  token = (await playerLogin(ctx, kid.playerId, '4826')).body.token;
});
afterAll(async () => {
  setReplayRunnerForTests(null);
  await ctx.close();
});

describe('seeds', () => {
  it('derive the same way on the server and in the app', () => {
    // The same vector is asserted in tests/engine.test.ts at the repo root against src/games/engine.ts.
    expect([[12345, 0], [12345, 1], [12345, 2], [2147483647, 5], [0, 1]].map(([b, r]) => deriveSeed(b!, r!))).toEqual([12345, 2085447349, 1056969962, 109232715, 63015048]);
  });
  it('are dealt by the server, stored with the bracket, and repeated when a session resumes', async () => {
    const s = await start('connect-four', 'easy');
    expect(Number.isInteger(s.seed) && s.seed >= 0 && s.seed < 2 ** 31).toBe(true);
    expect(s.bracket).toMatch(/^[A-D]$/);
    const again = await request(ctx.app).post('/v1/player/sessions/start').set(as(token)).send({ gameId: 'connect-four', clientSessionId: `verify-${String(n).padStart(6, '0')}`, difficulty: 'easy' });
    expect(again.body).toMatchObject({ resumed: true, seed: s.seed });
    await end(s.sessionId, { outcome: 'abandoned' }).expect(200);
  });
});

describe('the replay worker', () => {
  it('starts every replayable game from its seed in a separate thread', async () => {
    expect(ENGINE_IDS.length).toBeGreaterThanOrEqual(16);
    for (const id of ENGINE_IDS) {
      const r = await runReplay({ gameId: id, difficulty: 'easy', bracket: 'C', seed: 4242, actions: [] });
      expect(r, id).toMatchObject({ ok: true, phase: 'playing', applied: 0 });
    }
  }, 60_000);
  it('gives up on a log that takes too long instead of stalling the API', async () => {
    const actions = Array.from({ length: 3000 }, () => ({ type: 'drop', col: 1 }));
    expect(await runReplay({ gameId: 'connect-four', difficulty: 'hard', bracket: 'C', seed: 1, actions }, 1)).toEqual({ ok: false, reason: 'timeout' });
  });
  it('reports an unknown game rather than throwing', async () => {
    expect(await runReplay({ gameId: 'cricket', difficulty: 'easy', bracket: 'C', seed: 1, actions: [] })).toMatchObject({ ok: false, reason: 'unknown_game' });
  });
});

describe('an honest game is verified, ranked and paid', () => {
  it('connect four: the real moves reproduce the claimed win', async () => {
    const s = await start('connect-four', 'easy');
    const played = playRandomly('connect-four', 'easy', s.bracket, s.seed, connectFourMoves, 'won');
    const res = await end(s.sessionId, { ...played.claim, proof: played.proof });
    expect(res.status).toBe(200);
    expect(res.body.verification).toEqual({ status: 'verified', note: null });
    expect(res.body.ranking).toMatchObject({ won: true });
    expect((await coinsFor(s.sessionId))?.reason).toBe('game_won');
    const [row] = await ctx.db.select().from(gameSessions).where(eq(gameSessions.id, s.sessionId));
    expect(row).toMatchObject({ outcome: 'completed', verification: 'verified' });
  });
  it('sudoku and quizzes are verified from the dealt puzzle and questions', async () => {
    const su = await start('sudoku', 'hard');
    const solved = playScript('sudoku', 'hard', su.bracket, su.seed, sudokuSolution);
    expect(solved.phase).toBe('won');
    expect((await end(su.sessionId, { ...solved.claim, proof: solved.proof })).body.verification.status).toBe('verified');
    const q = await start('science-quiz', 'normal');
    const answered = playScript('science-quiz', 'normal', q.bracket, q.seed, quizAnswers);
    expect(answered.claim.score).toBe(100);
    expect((await end(q.sessionId, { ...answered.claim, proof: answered.proof })).body.verification.status).toBe('verified');
  });
  it('a lost game is verified as a loss and paid as a finished game', async () => {
    // Connect Four: the player's choices decide the result (in Snakes & Ladders the seed alone does).
    const s = await start('connect-four', 'easy');
    const played = playRandomly('connect-four', 'easy', s.bracket, s.seed, connectFourMoves, 'lost');
    const res = await end(s.sessionId, { ...played.claim, proof: played.proof });
    expect(res.body.verification.status).toBe('verified');
    expect(res.body.ranking).toMatchObject({ won: false });
  });
});

describe('a game decided by the deal alone', () => {
  it('snakes and ladders is verified whichever way the server\'s seed falls', async () => {
    const s = await start('snakes-and-ladders', 'normal');
    const played = playRandomly('snakes-and-ladders', 'normal', s.bracket, s.seed, snakesMoves, 'any');
    const res = await end(s.sessionId, { ...played.claim, proof: played.proof });
    expect(res.body.verification.status).toBe('verified');
    expect(res.body.ranking).toMatchObject({ won: played.phase === 'won' });
  });
});

describe('claims the moves do not support are never paid or ranked', () => {
  it('a forged win with no moves at all is rejected and recorded as abandoned', async () => {
    const s = await start('ludo', 'easy');
    const res = await end(s.sessionId, { outcome: 'completed', score: 100, stars: 3, proof: { restart: 0, actions: [] } });
    expect(res.status).toBe(200);
    expect(res.body.verification.status).toBe('rejected');
    expect(res.body.ranking).toBeNull();
    expect(res.body.coins.awarded).toBe(0);
    const [row] = await ctx.db.select().from(gameSessions).where(eq(gameSessions.id, s.sessionId));
    expect(row).toMatchObject({ outcome: 'abandoned', verification: 'rejected' });
  });
  it('a win claimed without any proof is rejected', async () => {
    const s = await start('connect-four', 'easy');
    const res = await end(s.sessionId, { outcome: 'completed', score: 90, stars: 3 });
    expect(res.body.verification).toMatchObject({ status: 'rejected' });
    expect(res.body.ranking).toBeNull();
    expect(await coinsFor(s.sessionId)).toBeUndefined();
  });
  it('a malformed or oversized proof is rejected', async () => {
    const a = await start('connect-four', 'easy');
    expect((await end(a.sessionId, { outcome: 'completed', score: 90, stars: 3, proof: { restart: 0, actions: 'drop' } })).body.verification.status).toBe('rejected');
    const b = await start('connect-four', 'easy');
    const many = Array.from({ length: 3001 }, () => ({ type: 'drop', col: 1 }));
    expect((await end(b.sessionId, { outcome: 'completed', score: 90, stars: 3, proof: { restart: 0, actions: many } })).body.verification.status).toBe('rejected');
  });
  it('accepts a move log larger than the usual request limit', async () => {
    const s = await start('connect-four', 'easy');
    const padded = Array.from({ length: 3000 }, () => ({ type: 'drop', col: 1, note: 'x'.repeat(40) }));
    const res = await end(s.sessionId, { outcome: 'completed', score: 90, stars: 3, proof: { restart: 0, actions: padded } });
    expect(res.status).toBe(200); // not 413: the larger body is allowed on this route only
  });
  it('a log played for a different deal does not reach the end of this game', async () => {
    const s = await start('sudoku', 'hard');
    const other = playScript('sudoku', 'hard', s.bracket, (s.seed + 1) % 2 ** 31, sudokuSolution);
    const res = await end(s.sessionId, { ...other.claim, proof: other.proof });
    expect(res.body.verification.status).toBe('rejected');
    expect(res.body.ranking).toBeNull();
  });
  it('a loss claimed as a win is corrected to what the moves show', async () => {
    const s = await start('connect-four', 'easy');
    const lost = playRandomly('connect-four', 'easy', s.bracket, s.seed, connectFourMoves, 'lost');
    const res = await end(s.sessionId, { outcome: 'completed', score: 100, stars: 3, proof: lost.proof });
    expect(res.body.verification.status).toBe('corrected');
    expect(res.body.ranking).toMatchObject({ won: false });
    expect(res.body.coins.awarded).toBe(0); // a lost game pays nothing, whatever was claimed
    expect(await coinsFor(s.sessionId)).toBeUndefined();
    const [row] = await ctx.db.select().from(gameSessions).where(eq(gameSessions.id, s.sessionId));
    expect(row).toMatchObject({ outcome: 'failed', score: lost.claim.score });
  });
  it('an inflated score is replaced by the score the moves earn', async () => {
    const s = await start('sudoku', 'hard');
    const solved = playScript('sudoku', 'hard', s.bracket, s.seed, (st) => [{ type: 'select', index: st.puzzle.givens.findIndex((g: number) => !g) }, { type: 'enter', value: 9 }, ...sudokuSolution(st)]);
    expect(solved.phase).toBe('won');
    const res = await end(s.sessionId, { outcome: 'completed', score: 999, stars: 3, proof: solved.proof });
    expect(['verified', 'corrected']).toContain(res.body.verification.status);
    const [row] = await ctx.db.select().from(gameSessions).where(eq(gameSessions.id, s.sessionId));
    expect(row!.score).toBe(solved.claim.score);
  });
});

describe('pass-and-play, server trouble and games that cannot be replayed', () => {
  it('a friends-mode Ludo game is verified but never ranked or paid as a win', async () => {
    const s = await start('ludo', 'easy');
    const played = playRandomly('ludo', 'easy', s.bracket, s.seed, ludoMoves('friends'), 'any');
    expect(played.state.mode).toBe('friends');
    const res = await end(s.sessionId, { ...played.claim, proof: played.proof });
    expect(res.body.verification.status).toMatch(/verified|corrected/);
    expect(res.body.ranking).toBeNull();
    expect((await coinsFor(s.sessionId))?.reason).toBe('game_completed');
    expect(await ctx.db.select().from(rankingEvents).where(eq(rankingEvents.sessionId, s.sessionId))).toHaveLength(0);
  });
  it('when the server cannot check a game it keeps the result but does not rank or pay a win bonus', async () => {
    const s = await start('connect-four', 'easy');
    const played = playRandomly('connect-four', 'easy', s.bracket, s.seed, connectFourMoves, 'won');
    setReplayRunnerForTests(async () => ({ ok: false, reason: 'timeout' }));
    const res = await end(s.sessionId, { ...played.claim, proof: played.proof });
    setReplayRunnerForTests(null);
    expect(res.body.verification.status).toBe('unverified');
    expect(res.body.ranking).toBeNull();
    expect((await coinsFor(s.sessionId))?.reason).toBe('game_completed');
    const [row] = await ctx.db.select().from(gameSessions).where(eq(gameSessions.id, s.sessionId));
    expect(row!.outcome).toBe('completed'); // no punishment for our own failure
  });
  it('abandoning needs no proof', async () => {
    const s = await start('ludo', 'easy');
    const res = await end(s.sessionId, { outcome: 'abandoned' });
    expect(res.body.verification.status).toBe('not_applicable');
    expect(res.body.coins.awarded).toBe(0);
  });
  it('timing and aim games are not replayable and keep the older score bounds', async () => {
    const s = await start('cricket', 'normal');
    const res = await end(s.sessionId, { outcome: 'completed', score: 24, stars: 2 });
    expect(res.body.verification.status).toBe('not_applicable');
    expect(res.body.ranking).toMatchObject({ won: true });
    const cheat = await start('cricket', 'normal');
    expect((await end(cheat.sessionId, { outcome: 'completed', score: 9999, stars: 3 })).body.ranking).toBeNull(); // still bounded
  });
  it('a verified game with a restart replays from the restarted deal', async () => {
    const s = await start('memory-cards', 'normal');
    const played = playScript('memory-cards', 'normal', s.bracket, s.seed, memoryPairs, 2);
    const res = await end(s.sessionId, { ...played.claim, proof: played.proof });
    expect(played.proof.restart).toBe(2);
    expect(res.body.verification.status).toBe('verified');
    void childId;
  });
});

describe('verifyEndedGame', () => {
  it('trusts nothing it cannot replay: no seed means unverified, never a free win', async () => {
    const v = await verifyEndedGame({ gameId: 'ludo', difficulty: 'easy', bracket: 'C', seed: null, claim: { outcome: 'completed', score: 100, stars: 3 }, proof: { restart: 0, actions: [] } });
    expect(v).toMatchObject({ status: 'unverified', rankable: false });
  });
});
