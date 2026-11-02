import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { eq } from 'drizzle-orm';
import { daduChildProfiles, daduConsents, daduMastery } from '../src/database/schema.js';
import { seedDadu } from '../src/database/seedDadu.js';
import { setupTestApp } from './helpers.js';

let ctx: Awaited<ReturnType<typeof setupTestApp>>;
let tokenA = '';
let tokenB = '';
let childA = '';
const as = (token: string) => ({ Authorization: `Bearer ${token}` });

function world(overrides: Record<string, unknown> = {}) {
  return {
    version: 1, tickedAt: 1_700_000_000_000, time: 'morning', weather: 'sunny', season: 'winter',
    plants: [], animals: [{ key: 'buddy', hunger: 0.2, thirst: 0.1, rest: 0, groom: 0, mood: 'happy', lastCaredAt: 1_700_000_000_000, location: 'animalia.dog' }],
    objects: {}, positions: [{ key: 'dadaji', location: 'villa.living', x: 4, y: 4, facing: 'se', activity: 'idle' }],
    inventory: { seeds: 3 }, decorations: [], rewards: { stars: 1, coins: 5, badges: [], certificates: [] }, mastery: {},
    lessonsCompleted: [], storiesRead: [], assignments: {}, echoQueue: [], unlockedLocations: ['map'], ...overrides,
  };
}

async function register(email: string) {
  const res = await request(ctx.app).post('/v1/auth/register').send({ email, password: 'User-pass1' });
  expect(res.status).toBe(201);
  return res.body.token as string;
}

beforeAll(async () => {
  ctx = await setupTestApp();
  await seedDadu(ctx.db);
  tokenA = await register('parent-a@example.com');
  tokenB = await register('parent-b@example.com');
});
afterAll(async () => {
  await ctx.close();
});

describe('manifest and published content (no auth)', () => {
  it('serves the manifest with languages, flags, packs and a catalogue', async () => {
    const res = await request(ctx.app).get('/v1/dadu/manifest');
    expect(res.status).toBe(200);
    expect(res.body.languages.en).toBe(1);
    expect(res.body.languages.ta).toBe(0);
    expect(res.body.catalogue.byKind.lesson).toBe(9);
    expect(res.body.catalogue.byKind.character).toBe(7);
    expect(res.body.packs).toEqual([]);
    expect(typeof res.body.serverTime).toBe('string');
  });

  it('lists only published content and filters by kind and section', async () => {
    const all = await request(ctx.app).get('/v1/dadu/content?kind=lesson&pageSize=100');
    expect(all.status).toBe(200);
    expect(all.body.total).toBe(9);
    const nature = await request(ctx.app).get('/v1/dadu/content?kind=lesson&section=nature');
    expect(nature.body.items.map((i: { id: string }) => i.id)).toEqual(['nature.plants.tulsi.01']);
    const hi = await request(ctx.app).get('/v1/dadu/content?kind=lesson&language=hi');
    expect(hi.body.total).toBe(9);
    const ta = await request(ctx.app).get('/v1/dadu/content?kind=lesson&language=ta');
    expect(ta.body.total).toBe(0);
  });

  it('returns a lesson body with canonical character keys and both languages', async () => {
    const res = await request(ctx.app).get('/v1/dadu/content/explore.astronomy.telescope.01');
    expect(res.status).toBe(200);
    const steps = res.body.body.steps.little;
    expect(steps[0]).toMatchObject({ type: 'dialogue', who: 'dadaji' });
    expect(steps[1].who).toBe('chintu');
    expect(steps[2].who).toBe('chikki');
    expect(steps[1].text.hi).toContain('दादाजी');
    expect(steps.find((s: { type: string }) => s.type === 'echo')).toBeTruthy();
    expect(res.body.body.assignment).toBe('rwa.astronomy.telescope');
  });

  it('404s for unknown or unpublished content', async () => {
    expect((await request(ctx.app).get('/v1/dadu/content/nothing.here.01')).status).toBe(404);
  });
});

describe('consent and child profiles', () => {
  it('requires a token for everything but the manifest and content', async () => {
    expect((await request(ctx.app).get('/v1/dadu/children')).status).toBe(401);
    expect((await request(ctx.app).post('/v1/dadu/consents').send({ kind: 'processing', version: '2026-11' })).status).toBe(401);
  });

  it('refuses to create a child before processing consent', async () => {
    const res = await request(ctx.app).post('/v1/dadu/children').set(as(tokenA)).send({ name: 'Anu', band: 'A2' });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('consent_required');
  });

  it('records consent and creates a child with defaults', async () => {
    const c = await request(ctx.app).post('/v1/dadu/consents').set(as(tokenA)).send({ kind: 'processing', version: '2026-11' });
    expect(c.status).toBe(201);
    expect(c.body.withdrawnAt).toBeNull();
    const res = await request(ctx.app).post('/v1/dadu/children').set(as(tokenA)).send({ name: 'Anu', band: 'A2' });
    expect(res.status).toBe(201);
    childA = res.body.id;
    expect(res.body).toMatchObject({ name: 'Anu', band: 'A2', difficulty: 'steady', language: 'en', languageMode: 'single', templeEnabled: false });
    expect(res.body.avatar).toEqual({ skin: 'warm', hair: 'black', top: 'yellow' });
  });

  it('validates the profile', async () => {
    expect((await request(ctx.app).post('/v1/dadu/children').set(as(tokenA)).send({ name: '', band: 'A2' })).status).toBe(400);
    expect((await request(ctx.app).post('/v1/dadu/children').set(as(tokenA)).send({ name: 'X', band: 'A9' })).status).toBe(400);
    expect((await request(ctx.app).post('/v1/dadu/children').set(as(tokenA)).send({ name: 'X', band: 'A2', language: 'xx' })).status).toBe(400);
  });

  it('lists, reads and patches the child', async () => {
    const list = await request(ctx.app).get('/v1/dadu/children').set(as(tokenA));
    expect(list.body.items.map((c: { id: string }) => c.id)).toEqual([childA]);
    const patch = await request(ctx.app).patch(`/v1/dadu/children/${childA}`).set(as(tokenA)).send({ difficulty: 'stretch', language: 'hi', helperLanguage: 'en', languageMode: 'hi-with-en', templeEnabled: true });
    expect(patch.status).toBe(200);
    expect(patch.body).toMatchObject({ difficulty: 'stretch', language: 'hi', helperLanguage: 'en', languageMode: 'hi-with-en', templeEnabled: true });
    expect((await request(ctx.app).get(`/v1/dadu/children/${childA}`).set(as(tokenA))).body.difficulty).toBe('stretch');
  });

  it('isolates children between parents', async () => {
    expect((await request(ctx.app).get(`/v1/dadu/children/${childA}`).set(as(tokenB))).status).toBe(404);
    expect((await request(ctx.app).get(`/v1/dadu/children/${childA}/world`).set(as(tokenB))).status).toBe(404);
    expect((await request(ctx.app).patch(`/v1/dadu/children/${childA}`).set(as(tokenB)).send({ name: 'Hacked' })).status).toBe(404);
    expect((await request(ctx.app).get('/v1/dadu/children').set(as(tokenB))).body.items).toEqual([]);
  });

  it('caps an account at five children', async () => {
    for (let i = 2; i <= 5; i++) expect((await request(ctx.app).post('/v1/dadu/children').set(as(tokenA)).send({ name: `Child ${i}`, band: 'A3' })).status).toBe(201);
    const sixth = await request(ctx.app).post('/v1/dadu/children').set(as(tokenA)).send({ name: 'Six', band: 'A3' });
    expect(sixth.status).toBe(409);
    expect(sixth.body.error.code).toBe('child_limit');
  });

  it('soft-deletes a child, freeing a slot and hiding it', async () => {
    const list = await request(ctx.app).get('/v1/dadu/children').set(as(tokenA));
    const last = list.body.items[4].id;
    const del = await request(ctx.app).delete(`/v1/dadu/children/${last}`).set(as(tokenA));
    expect(del.status).toBe(202);
    expect(typeof del.body.deletionScheduledFor).toBe('string');
    expect((await request(ctx.app).get(`/v1/dadu/children/${last}`).set(as(tokenA))).status).toBe(404);
    const [row] = await ctx.db.select().from(daduChildProfiles).where(eq(daduChildProfiles.id, last));
    expect(row!.deletedAt).not.toBeNull();
    expect((await request(ctx.app).post('/v1/dadu/children').set(as(tokenA)).send({ name: 'Five again', band: 'A1' })).status).toBe(201);
  });

  it('withdraws a consent once', async () => {
    const list = await request(ctx.app).get('/v1/dadu/consents').set(as(tokenA));
    const id = list.body.items[0].id;
    expect((await request(ctx.app).post(`/v1/dadu/consents/${id}/withdraw`).set(as(tokenA))).status).toBe(200);
    expect((await request(ctx.app).post(`/v1/dadu/consents/${id}/withdraw`).set(as(tokenA))).status).toBe(404);
    expect((await request(ctx.app).post(`/v1/dadu/consents/${id}/withdraw`).set(as(tokenB))).status).toBe(404);
    // re-grant so later tests can create children
    expect((await request(ctx.app).post('/v1/dadu/consents').set(as(tokenA)).send({ kind: 'processing', version: '2026-11' })).status).toBe(201);
  });
});

describe('world state', () => {
  it('404s before any save, then creates version 1', async () => {
    expect((await request(ctx.app).get(`/v1/dadu/children/${childA}/world`).set(as(tokenA))).status).toBe(404);
    const put = await request(ctx.app).put(`/v1/dadu/children/${childA}/world`).set(as(tokenA)).send({ version: 0, state: world() });
    expect(put.status).toBe(200);
    expect(put.body.version).toBe(1);
    const get = await request(ctx.app).get(`/v1/dadu/children/${childA}/world`).set(as(tokenA));
    expect(get.body.version).toBe(1);
    expect(get.body.state.rewards.stars).toBe(1);
  });

  it('accepts a matching version and increments', async () => {
    const put = await request(ctx.app).put(`/v1/dadu/children/${childA}/world`).set(as(tokenA)).send({ version: 1, state: world({ rewards: { stars: 3, coins: 20, badges: ['first-lesson'], certificates: [] }, lessonsCompleted: ['explore.astronomy.telescope.01'] }) });
    expect(put.status).toBe(200);
    expect(put.body.version).toBe(2);
  });

  it('returns 409 with the merged copy on a stale version (client wins for earned things)', async () => {
    const stale = world({ rewards: { stars: 2, coins: 50, badges: ['curious'], certificates: [] }, lessonsCompleted: ['nature.plants.tulsi.01'], mastery: { 'nature.plants.parts': { concept: 'nature.plants.parts', score: 0.5, attempts: 1, correct: 1, lastSeenAt: 1, nextReviewAt: 2 } }, inventory: { seeds: 99 } });
    const put = await request(ctx.app).put(`/v1/dadu/children/${childA}/world`).set(as(tokenA)).send({ version: 1, state: stale });
    expect(put.status).toBe(409);
    expect(put.body.error.code).toBe('version_conflict');
    expect(put.body.world.version).toBe(3);
    const merged = put.body.world.state;
    expect(merged.rewards).toEqual({ stars: 3, coins: 50, badges: ['first-lesson', 'curious'], certificates: [] });
    expect(merged.lessonsCompleted.sort()).toEqual(['explore.astronomy.telescope.01', 'nature.plants.tulsi.01']);
    expect(merged.mastery['nature.plants.parts'].score).toBe(0.5);
    expect(merged.inventory).toEqual({ seeds: 3 }); // server wins for the rest
    expect((await request(ctx.app).get(`/v1/dadu/children/${childA}/world`).set(as(tokenA))).body.version).toBe(3);
  });

  it('rejects a malformed world', async () => {
    const put = await request(ctx.app).put(`/v1/dadu/children/${childA}/world`).set(as(tokenA)).send({ version: 3, state: world({ time: 'midnight' }) });
    expect(put.status).toBe(400);
    expect(put.body.error.details[0].path).toBe('state.time');
  });

  it('normalises legacy character keys in positions and animals', async () => {
    const put = await request(ctx.app).put(`/v1/dadu/children/${childA}/world`).set(as(tokenA)).send({ version: 3, state: world({ lessonsCompleted: ['explore.astronomy.telescope.01', 'nature.plants.tulsi.01'], positions: [{ key: 'gopu', location: 'villa.living', x: 1, y: 1, facing: 'se', activity: 'idle' }] }) });
    expect(put.status).toBe(200);
    expect(put.body.state.positions[0].key).toBe('chintu');
  });
});

describe('progress and mastery', () => {
  const ev = (clientId: string, payload: Record<string, unknown>, kind = 'assessment') => ({ clientId, kind, contentId: 'stem.physics.magnet.01', occurredAt: new Date().toISOString(), payload });

  it('records events, updates mastery and is idempotent per client id', async () => {
    const first = await request(ctx.app).post(`/v1/dadu/children/${childA}/progress`).set(as(tokenA)).send({ events: [ev('evt-1', { concept: 'stem.physics.magnet', result: 1 }), ev('evt-2', { minutes: 7 }, 'lesson')] });
    expect(first.status).toBe(202);
    expect(first.body.accepted).toEqual(['evt-1', 'evt-2']);
    expect(first.body.mastery[0]).toMatchObject({ concept: 'stem.physics.magnet', attempts: 1, correct: 1, state: 'exploring' });
    expect(first.body.mastery[0].score).toBeCloseTo(0.35, 4);
    const again = await request(ctx.app).post(`/v1/dadu/children/${childA}/progress`).set(as(tokenA)).send({ events: [ev('evt-1', { concept: 'stem.physics.magnet', result: 1 })] });
    expect(again.body.accepted).toEqual([]);
    expect(again.body.duplicates).toEqual(['evt-1']);
    const [m] = await ctx.db.select().from(daduMastery).where(eq(daduMastery.childId, childA));
    expect(m!.attempts).toBe(1);
  });

  it('applies the exponential formula, difficulty weights and spaced intervals', async () => {
    // second answer (n=1 < 3 → alpha .35), stretch weight 1.25 clipped to 1: m = .35 + .35*(1-.35) = .5775
    const r2 = await request(ctx.app).post(`/v1/dadu/children/${childA}/progress`).set(as(tokenA)).send({ events: [ev('evt-3', { concept: 'stem.physics.magnet', result: 1, difficulty: 'stretch' })] });
    expect(r2.body.mastery[0].score).toBeCloseTo(0.5775, 3);
    // wrong answer resets the interval to 1 day and lowers the score
    const r3 = await request(ctx.app).post(`/v1/dadu/children/${childA}/progress`).set(as(tokenA)).send({ events: [ev('evt-4', { concept: 'stem.physics.magnet', result: 0 })] });
    expect(r3.body.mastery[0].score).toBeCloseTo(0.3754, 3);
    const [m] = await ctx.db.select().from(daduMastery).where(eq(daduMastery.childId, childA));
    expect(m!.intervalDays).toBe(1);
    expect(m!.correct).toBe(2);
  });

  it('reaches mastered after enough correct answers and pages the event log', async () => {
    const events = [5, 6, 7, 8, 9, 10].map((i) => ev(`evt-${i}`, { concept: 'nature.plants.parts', result: 1 }));
    const res = await request(ctx.app).post(`/v1/dadu/children/${childA}/progress`).set(as(tokenA)).send({ events });
    expect(res.body.mastery[0].state).toBe('mastered');
    const page1 = await request(ctx.app).get(`/v1/dadu/children/${childA}/progress?limit=3`).set(as(tokenA));
    expect(page1.body.items).toHaveLength(3);
    expect(page1.body.hasMore).toBe(true);
    const page2 = await request(ctx.app).get(`/v1/dadu/children/${childA}/progress?limit=100&since=${page1.body.cursor}`).set(as(tokenA));
    expect(page2.body.items[0].clientId).toBe('evt-4');
    expect(page2.body.hasMore).toBe(false);
  });

  it('rejects unknown payload fields and bad ids', async () => {
    expect((await request(ctx.app).post(`/v1/dadu/children/${childA}/progress`).set(as(tokenA)).send({ events: [ev('evt-x1', { secret: 1 })] })).status).toBe(400);
    expect((await request(ctx.app).post(`/v1/dadu/children/${childA}/progress`).set(as(tokenA)).send({ events: [ev('bad id', {})] })).status).toBe(400);
  });

  it('counts minutes into screen time', async () => {
    const st = await request(ctx.app).get(`/v1/dadu/children/${childA}/screen-time?days=7`).set(as(tokenA));
    expect(st.status).toBe(200);
    expect(st.body.days).toHaveLength(7);
    expect(st.body.days[6].minutes).toBe(7);
  });
});

describe('screen rules, assignments, summary', () => {
  it('stores and validates screen rules', async () => {
    expect((await request(ctx.app).get(`/v1/dadu/children/${childA}/screen-rules`).set(as(tokenA))).body).toMatchObject({ dailyMinutes: null, bedtime: null, breakEveryMinutes: 20 });
    const put = await request(ctx.app).put(`/v1/dadu/children/${childA}/screen-rules`).set(as(tokenA)).send({ dailyMinutes: 30, bedtime: '20:30', breakEveryMinutes: 15 });
    expect(put.status).toBe(200);
    expect(put.body).toMatchObject({ dailyMinutes: 30, bedtime: '20:30', breakEveryMinutes: 15 });
    expect((await request(ctx.app).put(`/v1/dadu/children/${childA}/screen-rules`).set(as(tokenA)).send({ dailyMinutes: 3, bedtime: null })).status).toBe(400);
    expect((await request(ctx.app).put(`/v1/dadu/children/${childA}/screen-rules`).set(as(tokenA)).send({ dailyMinutes: 30, bedtime: '25:00' })).status).toBe(400);
  });

  it('completes an assignment without a photo, and refuses a photo without consent', async () => {
    const ok = await request(ctx.app).post(`/v1/dadu/children/${childA}/assignments/rwa.plants.parts_of_a_plant/complete`).set(as(tokenA)).send({ note: 'Planted methi with Nani' });
    expect(ok.status).toBe(201);
    expect(ok.body.hasPhoto).toBe(false);
    const photo = await request(ctx.app).post(`/v1/dadu/children/${childA}/assignments/rwa.plants.parts_of_a_plant/complete`).set(as(tokenA)).send({ photoAssetId: 'asset-1' });
    expect(photo.status).toBe(403);
    expect(photo.body.error.code).toBe('photo_consent_required');
  });

  it('accepts a photo after child-scoped photo consent, and the consent is linked', async () => {
    const c = await request(ctx.app).post('/v1/dadu/consents').set(as(tokenA)).send({ kind: 'photos', version: '2026-11', childId: childA });
    expect(c.status).toBe(201);
    const photo = await request(ctx.app).post(`/v1/dadu/children/${childA}/assignments/rwa.plants.parts_of_a_plant/complete`).set(as(tokenA)).send({ photoAssetId: 'asset-1' });
    expect(photo.status).toBe(201);
    expect(photo.body.hasPhoto).toBe(true);
    const list = await request(ctx.app).get(`/v1/dadu/children/${childA}/assignments`).set(as(tokenA));
    expect(list.body.items).toHaveLength(1);
    const consents = await ctx.db.select().from(daduConsents).where(eq(daduConsents.childId, childA));
    expect(consents).toHaveLength(1);
  });

  it('refuses photo consent for someone else\'s child', async () => {
    expect((await request(ctx.app).post('/v1/dadu/consents').set(as(tokenB)).send({ kind: 'photos', version: '2026-11', childId: childA })).status).toBe(404);
  });

  it('builds the parent summary', async () => {
    const res = await request(ctx.app).get(`/v1/dadu/children/${childA}/summary`).set(as(tokenA));
    expect(res.status).toBe(200);
    expect(res.body.child.id).toBe(childA);
    expect(res.body.lessonsCompleted).toBe(2);
    expect(res.body.lessonsBySection).toEqual({ explore: 1, nature: 1 });
    expect(res.body.assignmentsCompleted).toBe(1);
    expect(res.body.mastery.buckets.mastered).toBe(1);
    expect(res.body.mastery.total).toBe(2);
    expect(res.body.screenTime).toHaveLength(7);
    expect(res.body.rules.dailyMinutes).toBe(30);
  });
});

describe('account data deletion', () => {
  it('deletes every child, world, event and consent for the account', async () => {
    const res = await request(ctx.app).delete('/v1/dadu/me/data').set(as(tokenA));
    expect(res.status).toBe(200);
    expect(res.body.children).toBe(6); // 5 active + 1 soft-deleted
    expect(res.body.consents).toBe(3); // processing (withdrawn), processing, photos
    expect((await request(ctx.app).get('/v1/dadu/children').set(as(tokenA))).body.items).toEqual([]);
    expect(await ctx.db.select().from(daduMastery)).toEqual([]);
    expect(await ctx.db.select().from(daduConsents)).toEqual([]);
  });
});
