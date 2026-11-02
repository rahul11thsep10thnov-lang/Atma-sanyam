import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { eq } from 'drizzle-orm';
import { auditLogs } from '../src/database/schema.js';
import { adminToken, createAdmin, setupTestApp } from './helpers.js';

let ctx: Awaited<ReturnType<typeof setupTestApp>>;
let superTok = '';
let editorTok = '';
let reviewerTok = '';
let parentTok = '';
let parentId = '';
const as = (token: string) => ({ Authorization: `Bearer ${token}` });

const ID = 'academic.math.counting.01';
const lesson = (version = 1, title = 'Counting to five') => ({
  meta: { id: ID, version, objective: { en: 'Count five objects', hi: 'पाँच चीज़ें गिनना' }, bands: ['A1', 'A2'], section: 'academic', subject: 'maths', topic: 'counting', difficulty: 1, prerequisites: [], provenance: 'DADU original', rights: 'original', languages: ['en', 'hi'], review: 'draft' },
  title: { en: title, hi: 'पाँच तक गिनती' },
  host: 'villa.kitchen.fruit_bowl',
  world: 'home',
  companion: 'molly',
  concept: 'academic.maths.counting.5',
  steps: {
    little: [
      { type: 'dialogue', who: 'dadaji', text: { en: 'Beta, let us count the mangoes.', hi: 'बेटा, आम गिनते हैं।' } },
      { type: 'dialogue', who: 'gopu', text: { en: 'One, two, five!' } },
      { type: 'activity', activity: { kind: 'count', prompt: { en: 'Tap each mango' }, items: [{ key: 'm1', label: { en: 'Mango' }, ok: true }], success: { en: 'Five!' }, retry: { en: 'Again' } } },
      { type: 'quiz', question: { en: 'How many?' }, items: [{ key: '5', label: { en: 'Five' }, ok: true }, { key: '3', label: { en: 'Three' } }], explain: { en: 'Five mangoes.' } },
      { type: 'echo', clauses: [{ en: 'One two three four five.' }] },
    ],
    explorer: [{ type: 'dialogue', who: 'dadaji', text: { en: 'Counting is the start of all maths.' } }],
  },
  simpler: { en: 'Count on your fingers.' },
  advanced: { en: 'Skip count by twos.' },
  example: { en: 'Five fingers on one hand.' },
});

const STEPS = ['educational_review', 'factual_review', 'language_review', 'cultural_review', 'rights_review', 'safety_review', 'approved'] as const;

beforeAll(async () => {
  ctx = await setupTestApp();
  await createAdmin(ctx.db, 'super_admin');
  await createAdmin(ctx.db, 'editor');
  await createAdmin(ctx.db, 'reviewer');
  superTok = await adminToken(ctx.app, 'super_admin@example.com');
  editorTok = await adminToken(ctx.app, 'editor@example.com');
  reviewerTok = await adminToken(ctx.app, 'reviewer@example.com');
  const reg = await request(ctx.app).post('/v1/auth/register').send({ email: 'p@example.com', password: 'User-pass1' });
  parentTok = reg.body.token;
  parentId = reg.body.user.id;
});
afterAll(async () => {
  await ctx.close();
});

describe('roles', () => {
  it('gives the reviewer role the six review permissions and nothing more', async () => {
    const me = await request(ctx.app).get('/admin/v1/auth/me').set(as(reviewerTok));
    expect(me.body.permissions.sort()).toEqual(['dadu:content:read', 'dadu:review:cultural', 'dadu:review:educational', 'dadu:review:factual', 'dadu:review:language', 'dadu:review:rights', 'dadu:review:safety', 'dashboard:read']);
    const ed = await request(ctx.app).get('/admin/v1/auth/me').set(as(editorTok));
    expect(ed.body.permissions).toContain('dadu:content:write');
    expect(ed.body.permissions).not.toContain('dadu:content:publish');
  });
});

describe('content items and workflow', () => {
  it('validates the body against the kind and the id', async () => {
    const bad = await request(ctx.app).post('/admin/v1/dadu/content').set(as(editorTok)).send({ id: ID, kind: 'lesson', body: { ...lesson(), steps: {} } });
    expect(bad.status).toBe(400);
    const mismatch = await request(ctx.app).post('/admin/v1/dadu/content').set(as(editorTok)).send({ id: 'academic.math.other.01', kind: 'lesson', body: lesson() });
    expect(mismatch.status).toBe(400);
    expect(mismatch.body.error.details[0].path).toBe('body.meta.id');
    const unknownChar = await request(ctx.app).post('/admin/v1/dadu/content').set(as(editorTok)).send({ id: ID, kind: 'lesson', body: { ...lesson(), companion: 'zebra' } });
    expect(unknownChar.status).toBe(400);
  });

  it('creates a draft (legacy character keys become canonical) and audits it', async () => {
    const res = await request(ctx.app).post('/admin/v1/dadu/content').set(as(editorTok)).send({ id: ID, kind: 'lesson', body: lesson(), changeNote: 'First draft' });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ id: ID, kind: 'lesson', section: 'academic', status: 'draft', currentVersion: 1, publishedVersion: null, bands: ['A1', 'A2'], languages: ['en', 'hi'] });
    expect(res.body.versions[0].body.companion).toBe('chikki');
    expect(res.body.versions[0].body.steps.little[1].who).toBe('chintu');
    expect((await request(ctx.app).post('/admin/v1/dadu/content').set(as(editorTok)).send({ id: ID, kind: 'lesson', body: lesson() })).status).toBe(409);
    const logs = await ctx.db.select().from(auditLogs).where(eq(auditLogs.action, 'dadu.content.create'));
    expect(logs).toHaveLength(1);
  });

  it('is not visible to the app while in draft', async () => {
    expect((await request(ctx.app).get(`/v1/dadu/content/${ID}`)).status).toBe(404);
  });

  it('lets the editor edit a draft in place and submit it', async () => {
    const edit = await request(ctx.app).put(`/admin/v1/dadu/content/${ID}`).set(as(editorTok)).send({ body: lesson(1, 'Counting to five, slowly'), changeNote: 'Title tweak' });
    expect(edit.status).toBe(200);
    expect(edit.body.currentVersion).toBe(1);
    expect(edit.body.versions[0].body.title.en).toBe('Counting to five, slowly');
    const sub = await request(ctx.app).post(`/admin/v1/dadu/content/${ID}/transition`).set(as(editorTok)).send({ to: 'educational_review', note: 'Ready' });
    expect(sub.status).toBe(200);
    expect(sub.body.status).toBe('educational_review');
  });

  it('refuses edits while in review and refuses steps out of order', async () => {
    expect((await request(ctx.app).put(`/admin/v1/dadu/content/${ID}`).set(as(editorTok)).send({ body: lesson() })).status).toBe(409);
    const skip = await request(ctx.app).post(`/admin/v1/dadu/content/${ID}/transition`).set(as(superTok)).send({ to: 'language_review' });
    expect(skip.status).toBe(409);
    expect(skip.body.error.code).toBe('workflow_invalid');
    expect((await request(ctx.app).post(`/admin/v1/dadu/content/${ID}/transition`).set(as(superTok)).send({ to: 'published' })).status).toBe(409);
  });

  it('editor cannot approve a review step; reviewer can', async () => {
    expect((await request(ctx.app).post(`/admin/v1/dadu/content/${ID}/transition`).set(as(editorTok)).send({ to: 'factual_review' })).status).toBe(403);
    const ok = await request(ctx.app).post(`/admin/v1/dadu/content/${ID}/transition`).set(as(reviewerTok)).send({ to: 'factual_review', note: 'Pedagogically sound' });
    expect(ok.status).toBe(200);
    expect(ok.body.reviews.at(-1)).toMatchObject({ step: 'educational_review', decision: 'approve', note: 'Pedagogically sound', version: 1 });
  });

  it('a reviewer can send the item back to draft, and the editor resubmits', async () => {
    const back = await request(ctx.app).post(`/admin/v1/dadu/content/${ID}/transition`).set(as(reviewerTok)).send({ to: 'draft', note: 'Check the Hindi' });
    expect(back.status).toBe(200);
    expect(back.body.status).toBe('draft');
    expect(back.body.reviews.at(-1)).toMatchObject({ step: 'factual_review', decision: 'send_back' });
    expect((await request(ctx.app).post(`/admin/v1/dadu/content/${ID}/transition`).set(as(editorTok)).send({ to: 'educational_review' })).status).toBe(200);
  });

  it('walks every remaining step in order to approved', async () => {
    for (const to of STEPS.slice(1)) {
      const res = await request(ctx.app).post(`/admin/v1/dadu/content/${ID}/transition`).set(as(reviewerTok)).send({ to });
      expect(res.status, to).toBe(200);
      expect(res.body.status).toBe(to);
    }
  });

  it('reviewer cannot publish; publisher can; the app then sees version 1', async () => {
    expect((await request(ctx.app).post(`/admin/v1/dadu/content/${ID}/publish`).set(as(reviewerTok))).status).toBe(403);
    expect((await request(ctx.app).post(`/admin/v1/dadu/content/${ID}/publish`).set(as(editorTok))).status).toBe(403);
    const pub = await request(ctx.app).post(`/admin/v1/dadu/content/${ID}/publish`).set(as(superTok));
    expect(pub.status).toBe(200);
    expect(pub.body).toMatchObject({ status: 'published', publishedVersion: 1 });
    expect(pub.body.versions[0].publishedAt).not.toBeNull();
    const app = await request(ctx.app).get(`/v1/dadu/content/${ID}`);
    expect(app.status).toBe(200);
    expect(app.body.version).toBe(1);
    expect(app.body.body.title.en).toBe('Counting to five, slowly');
  });

  it('editing published content opens a new draft version while version 1 stays live', async () => {
    const edit = await request(ctx.app).put(`/admin/v1/dadu/content/${ID}`).set(as(editorTok)).send({ body: lesson(2, 'Counting to five, version two'), changeNote: 'v2' });
    expect(edit.status).toBe(200);
    expect(edit.body).toMatchObject({ status: 'draft', currentVersion: 2, publishedVersion: 1 });
    expect(edit.body.versions).toHaveLength(2);
    expect((await request(ctx.app).get(`/v1/dadu/content/${ID}`)).body.body.title.en).toBe('Counting to five, slowly');
  });

  it('publishes version 2 after review, then rolls back to version 1', async () => {
    expect((await request(ctx.app).post(`/admin/v1/dadu/content/${ID}/transition`).set(as(editorTok)).send({ to: 'educational_review' })).status).toBe(200);
    for (const to of STEPS.slice(1)) expect((await request(ctx.app).post(`/admin/v1/dadu/content/${ID}/transition`).set(as(superTok)).send({ to })).status).toBe(200);
    expect((await request(ctx.app).post(`/admin/v1/dadu/content/${ID}/publish`).set(as(superTok))).body.publishedVersion).toBe(2);
    expect((await request(ctx.app).get(`/v1/dadu/content/${ID}`)).body.body.title.en).toBe('Counting to five, version two');
    expect((await request(ctx.app).post(`/admin/v1/dadu/content/${ID}/rollback`).set(as(superTok)).send({ version: 9 })).status).toBe(404);
    const rb = await request(ctx.app).post(`/admin/v1/dadu/content/${ID}/rollback`).set(as(superTok)).send({ version: 1 });
    expect(rb.status).toBe(200);
    expect(rb.body.publishedVersion).toBe(1);
    const live = await request(ctx.app).get(`/v1/dadu/content/${ID}`);
    expect(live.body.version).toBe(1);
    expect(live.body.body.title.en).toBe('Counting to five, slowly');
  });

  it('unpublishes and the app loses the item', async () => {
    const un = await request(ctx.app).post(`/admin/v1/dadu/content/${ID}/unpublish`).set(as(superTok));
    expect(un.status).toBe(200);
    expect(un.body).toMatchObject({ status: 'approved', publishedVersion: null });
    expect((await request(ctx.app).get(`/v1/dadu/content/${ID}`)).status).toBe(404);
    expect((await request(ctx.app).post(`/admin/v1/dadu/content/${ID}/unpublish`).set(as(superTok))).status).toBe(409);
  });

  it('lists with filters and search; reviewer may read, parent token may not', async () => {
    const list = await request(ctx.app).get('/admin/v1/dadu/content?kind=lesson&status=approved&search=counting').set(as(reviewerTok));
    expect(list.status).toBe(200);
    expect(list.body.total).toBe(1);
    expect((await request(ctx.app).get('/admin/v1/dadu/content?status=published').set(as(reviewerTok))).body.total).toBe(0);
    expect((await request(ctx.app).get('/admin/v1/dadu/content').set(as(parentTok))).status).toBe(401);
  });

  it('accepts the other kinds: object, character, location, story, assignment', async () => {
    const obj = await request(ctx.app).post('/admin/v1/dadu/content').set(as(editorTok)).send({ id: 'villa.living.telescope', kind: 'object', body: { id: 'villa.living.telescope', location: 'villa.living', name: { en: 'Telescope', hi: 'दूरबीन' }, section: 'explore', preview: { en: 'Look!' }, states: ['inUse'], tile: { x: 8, y: 1 }, sprite: 'telescope', activity: 'tap-target' } });
    expect(obj.status).toBe(201);
    expect(obj.body.section).toBe('explore');
    const ch = await request(ctx.app).post('/admin/v1/dadu/content').set(as(editorTok)).send({ id: 'buddy', kind: 'character', body: { key: 'kim', legacyKeys: ['kim'], name: { en: 'Buddy' }, kind: 'dog', heightWu: 4, role: { en: 'Dog' }, voice: { en: 'Bark' }, joins: ['sports'] } });
    expect(ch.status).toBe(201);
    const loc = await request(ctx.app).post('/admin/v1/dadu/content').set(as(editorTok)).send({ id: 'garden.pond', kind: 'location', body: { id: 'garden.pond', world: 'garden', name: { en: 'Pond' }, size: { w: 8, d: 6 }, entry: { x: 4, y: 5 }, camera: 'iso', idlers: ['buddy'], ambience: 'pond' } });
    expect(loc.status).toBe(201);
    const story = await request(ctx.app).post('/admin/v1/dadu/content').set(as(editorTok)).send({ id: 'story.panchatantra.lion_and_mouse', kind: 'story', body: { meta: { ...lesson().meta, id: 'story.panchatantra.lion_and_mouse', subject: 'stories', topic: 'panchatantra' }, title: { en: 'The Lion and the Mouse' }, collection: 'panchatantra', pages: [{ text: { en: 'A lion slept.' }, illustration: 'lion-1' }], vocabulary: [], moral: { en: 'Small friends matter.' }, questions: { little: [], explorer: [] } } });
    expect(story.status).toBe(201);
    const rwa = await request(ctx.app).post('/admin/v1/dadu/content').set(as(editorTok)).send({ id: 'rwa.gardening.plant_a_seed', kind: 'assignment', body: { meta: { ...lesson().meta, id: 'rwa.gardening.plant_a_seed', section: 'nature' }, title: { en: 'Plant a seed' }, intro: { en: 'Beta...' }, objective: { en: 'Plant' }, instructions: [{ en: 'Fill a pot' }], materials: [{ en: 'Pot' }], minutes: 15, supervision: 'together', safety: [{ en: 'Wash hands' }], completion: { en: 'Parent confirms' }, outcome: { en: 'Seeds need soil' }, badge: 'little-gardener' } });
    expect(rwa.status).toBe(201);
  });
});

describe('media assets', () => {
  const sha = 'a'.repeat(64);
  let assetId = '';
  it('registers an asset with full rights metadata', async () => {
    const res = await request(ctx.app).post('/admin/v1/dadu/assets').set(as(superTok)).send({ kind: 'image', url: 'https://cdn.example.com/dadaji-front.webp', mime: 'image/webp', bytes: 1234, width: 512, height: 512, sha256: sha, licence: 'original', source: 'DADU studio', creator: 'Studio', characterKey: 'dadaji' });
    expect(res.status).toBe(201);
    assetId = res.body.id;
    expect(res.body.version).toBe(1);
  });
  it('requires attribution text when attribution is required and rejects bad hashes', async () => {
    expect((await request(ctx.app).post('/admin/v1/dadu/assets').set(as(superTok)).send({ kind: 'image', url: 'https://x/y.png', mime: 'image/png', sha256: 'b'.repeat(64), licence: 'CC-BY', source: 'Wikimedia', creator: 'Someone', attributionRequired: true })).status).toBe(400);
    expect((await request(ctx.app).post('/admin/v1/dadu/assets').set(as(superTok)).send({ kind: 'image', url: 'https://x/y.png', mime: 'image/png', sha256: 'zz', licence: 'original', source: 's', creator: 'c' })).status).toBe(400);
  });
  it('detects duplicates by sha256', async () => {
    const dup = await request(ctx.app).post('/admin/v1/dadu/assets').set(as(superTok)).send({ kind: 'image', url: 'https://cdn.example.com/other.webp', mime: 'image/webp', sha256: sha, licence: 'original', source: 'DADU studio', creator: 'Studio' });
    expect(dup.status).toBe(409);
    expect(dup.body.error.code).toBe('duplicate_asset');
    expect(dup.body.asset.id).toBe(assetId);
  });
  it('editor cannot register assets; lists and patches work', async () => {
    expect((await request(ctx.app).post('/admin/v1/dadu/assets').set(as(editorTok)).send({})).status).toBe(403);
    const list = await request(ctx.app).get('/admin/v1/dadu/assets?characterKey=dadaji').set(as(editorTok));
    expect(list.body.total).toBe(1);
    const patch = await request(ctx.app).patch(`/admin/v1/dadu/assets/${assetId}`).set(as(superTok)).send({ creator: 'Studio A' });
    expect(patch.body.version).toBe(2);
  });
  it('refuses to delete an asset referenced by published content, allows it otherwise', async () => {
    // publish a location that references the asset url
    const id = 'villa.terrace';
    await request(ctx.app).post('/admin/v1/dadu/content').set(as(editorTok)).send({ id, kind: 'location', body: { id, world: 'home', name: { en: 'Terrace' }, size: { w: 10, d: 8 }, entry: { x: 5, y: 7 }, camera: 'iso', idlers: [], ambience: 'https://cdn.example.com/dadaji-front.webp' } });
    await request(ctx.app).post(`/admin/v1/dadu/content/${id}/transition`).set(as(editorTok)).send({ to: 'educational_review' });
    for (const to of STEPS.slice(1)) await request(ctx.app).post(`/admin/v1/dadu/content/${id}/transition`).set(as(superTok)).send({ to });
    expect((await request(ctx.app).post(`/admin/v1/dadu/content/${id}/publish`).set(as(superTok))).status).toBe(200);
    const refused = await request(ctx.app).delete(`/admin/v1/dadu/assets/${assetId}`).set(as(superTok));
    expect(refused.status).toBe(409);
    expect(refused.body.error.code).toBe('asset_in_use');
    await request(ctx.app).post(`/admin/v1/dadu/content/${id}/unpublish`).set(as(superTok));
    expect((await request(ctx.app).delete(`/admin/v1/dadu/assets/${assetId}`).set(as(superTok))).status).toBe(204);
    expect((await request(ctx.app).delete(`/admin/v1/dadu/assets/${assetId}`).set(as(superTok))).status).toBe(404);
  });
});

describe('packs and flags', () => {
  it('builds a core pack from published items and publishes it', async () => {
    const id = 'villa.terrace';
    expect((await request(ctx.app).post(`/admin/v1/dadu/content/${id}/publish`).set(as(superTok))).status).toBe(200);
    expect((await request(ctx.app).post('/admin/v1/dadu/packs/build').set(as(reviewerTok)).send({ kind: 'core' })).status).toBe(403);
    const built = await request(ctx.app).post('/admin/v1/dadu/packs/build').set(as(superTok)).send({ kind: 'core' });
    expect(built.status).toBe(201);
    expect(built.body.version).toBe(1);
    expect(built.body.manifest.items.map((i: { id: string }) => i.id)).toEqual([id]);
    expect(built.body.manifest.items[0].sha256).toMatch(/^[0-9a-f]{64}$/);
    expect((await request(ctx.app).get('/v1/dadu/packs')).body.items).toEqual([]);
    const pub = await request(ctx.app).post(`/admin/v1/dadu/packs/${built.body.id}/publish`).set(as(superTok));
    expect(pub.body.status).toBe('published');
    const app = await request(ctx.app).get('/v1/dadu/packs');
    expect(app.body.items).toHaveLength(1);
    expect(app.body.items[0].itemCount).toBe(1);
    const manifest = await request(ctx.app).get(`/v1/dadu/packs/${built.body.id}`);
    expect(manifest.body.manifest.kind).toBe('core');
    const second = await request(ctx.app).post('/admin/v1/dadu/packs/build').set(as(superTok)).send({ kind: 'core' });
    expect(second.body.version).toBe(2);
    expect((await request(ctx.app).post('/admin/v1/dadu/packs/build').set(as(superTok)).send({ kind: 'language' })).status).toBe(400);
  });

  it('stores feature flags and exposes them in the manifest', async () => {
    expect((await request(ctx.app).put('/admin/v1/dadu/flags/temple_default').set(as(editorTok)).send({ value: true })).status).toBe(403);
    const put = await request(ctx.app).put('/admin/v1/dadu/flags/temple_default').set(as(superTok)).send({ value: { enabled: false, bands: ['A2'] } });
    expect(put.status).toBe(200);
    expect((await request(ctx.app).put('/admin/v1/dadu/flags/Bad Key').set(as(superTok)).send({ value: 1 })).status).toBe(400);
    const list = await request(ctx.app).get('/admin/v1/dadu/flags').set(as(reviewerTok));
    expect(list.body.items[0]).toMatchObject({ key: 'temple_default', value: { enabled: false, bands: ['A2'] } });
    const manifest = await request(ctx.app).get('/v1/dadu/manifest');
    expect(manifest.body.features.temple_default.enabled).toBe(false);
    expect(manifest.body.packs).toHaveLength(1);
  });
});

describe('parent support view', () => {
  it('shows minimal child data to support staff only', async () => {
    await request(ctx.app).post('/v1/dadu/consents').set(as(parentTok)).send({ kind: 'processing', version: '2026-11' });
    const child = await request(ctx.app).post('/v1/dadu/children').set(as(parentTok)).send({ name: 'Meera Rao', band: 'A4' });
    expect((await request(ctx.app).get(`/admin/v1/dadu/parents/${parentId}/children`).set(as(editorTok))).status).toBe(403);
    const res = await request(ctx.app).get(`/admin/v1/dadu/parents/${parentId}/children`).set(as(superTok));
    expect(res.status).toBe(200);
    expect(res.body.items[0]).toMatchObject({ id: child.body.id, firstName: 'Meera', band: 'A4', worldVersion: 0, lessonsCompleted: 0 });
    expect(res.body.items[0].name).toBeUndefined();
  });
});
