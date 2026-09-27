import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { eq } from 'drizzle-orm';
import { categories, content, devices, events, users } from '../src/database/schema.js';
import { setupTestApp } from './helpers.js';

let ctx: Awaited<ReturnType<typeof setupTestApp>>;
const INSTALL = 'install-0000-0000-0001';

beforeAll(async () => {
  ctx = await setupTestApp();
});
afterAll(async () => {
  await ctx.database.close();
});

describe('health & config', () => {
  it('reports healthy with a working database', async () => {
    const res = await request(ctx.app).get('/v1/health');
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  it('returns a complete remote config with defaults', async () => {
    const res = await request(ctx.app).get('/v1/config');
    expect(res.status).toBe(200);
    expect(res.body.maintenance).toEqual({ enabled: false, message: expect.any(String) });
    expect(res.body.features.contentLibrary).toBe(true);
    expect(res.body.session.gracePeriodSeconds).toBe(5);
    expect(res.body.appVersion.minimumVersion).toBe('1.0.0');
  });

  it('sets security headers and hides the framework', async () => {
    const res = await request(ctx.app).get('/v1/health');
    expect(res.headers['x-powered-by']).toBeUndefined();
    expect(res.headers['x-content-type-options']).toBe('nosniff');
  });

  it('returns JSON 404 for unknown routes and 400 for malformed JSON', async () => {
    expect((await request(ctx.app).get('/nope')).status).toBe(404);
    const bad = await request(ctx.app).post('/v1/auth/login').set('Content-Type', 'application/json').send('{"email":');
    expect(bad.status).toBe(400);
    expect(bad.body.error.message).toBe('Malformed JSON body');
  });
});

describe('user accounts', () => {
  let token = '';

  it('registers, normalizes email, and never returns the password hash', async () => {
    const res = await request(ctx.app)
      .post('/v1/auth/register')
      .send({ email: '  Asha@Example.com ', password: 'focus-time-123', displayName: 'Asha' });
    expect(res.status).toBe(201);
    expect(res.body.user.email).toBe('asha@example.com');
    expect(JSON.stringify(res.body)).not.toContain('scrypt');
    token = res.body.token;
    const [row] = await ctx.db.select().from(users).where(eq(users.email, 'asha@example.com'));
    expect(row!.passwordHash.startsWith('scrypt$')).toBe(true);
  });

  it('rejects duplicate emails, weak passwords and bad emails', async () => {
    expect((await request(ctx.app).post('/v1/auth/register').send({ email: 'asha@example.com', password: 'another-pass-1' })).status).toBe(409);
    expect((await request(ctx.app).post('/v1/auth/register').send({ email: 'b@example.com', password: 'short' })).status).toBe(400);
    expect((await request(ctx.app).post('/v1/auth/register').send({ email: 'not-an-email', password: 'long-enough-1' })).status).toBe(400);
  });

  it('logs in with correct credentials only, with a generic error', async () => {
    const wrong = await request(ctx.app).post('/v1/auth/login').send({ email: 'asha@example.com', password: 'nope-nope-nope' });
    const missing = await request(ctx.app).post('/v1/auth/login').send({ email: 'ghost@example.com', password: 'nope-nope-nope' });
    expect(wrong.status).toBe(401);
    expect(missing.status).toBe(401);
    expect(wrong.body.error.message).toBe(missing.body.error.message);
    const ok = await request(ctx.app).post('/v1/auth/login').send({ email: 'ASHA@example.com', password: 'focus-time-123' });
    expect(ok.status).toBe(200);
    expect(ok.body.token).toMatch(/^[A-Za-z0-9_-]{43}$/);
  });

  it('reads and updates the profile with a bearer token', async () => {
    expect((await request(ctx.app).get('/v1/me')).status).toBe(401);
    expect((await request(ctx.app).get('/v1/me').set('Authorization', 'Bearer garbage')).status).toBe(401);
    const me = await request(ctx.app).get('/v1/me').set('Authorization', `Bearer ${token}`);
    expect(me.status).toBe(200);
    expect(me.body.displayName).toBe('Asha');
    const patched = await request(ctx.app).patch('/v1/me').set('Authorization', `Bearer ${token}`).send({ displayName: 'Asha K' });
    expect(patched.body.displayName).toBe('Asha K');
  });

  it('logs out by revoking only that session', async () => {
    const res = await request(ctx.app).post('/v1/auth/logout').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(204);
    expect((await request(ctx.app).get('/v1/me').set('Authorization', `Bearer ${token}`)).status).toBe(401);
  });

  it('changes password and deletes the account only with the right password', async () => {
    const login = await request(ctx.app).post('/v1/auth/login').send({ email: 'asha@example.com', password: 'focus-time-123' });
    const t = login.body.token;
    const auth = { Authorization: `Bearer ${t}` };
    expect((await request(ctx.app).post('/v1/me/password').set(auth).send({ currentPassword: 'wrong', newPassword: 'new-password-9' })).status).toBe(400);
    expect((await request(ctx.app).post('/v1/me/password').set(auth).send({ currentPassword: 'focus-time-123', newPassword: 'new-password-9' })).status).toBe(204);

    await request(ctx.app).post('/v1/events').set(auth).send({ installId: INSTALL, platform: 'ios', events: [{ name: 'app_open' }] });
    expect((await request(ctx.app).delete('/v1/me').set(auth).send({ password: 'focus-time-123' })).status).toBe(400);
    expect((await request(ctx.app).delete('/v1/me').set(auth).send({ password: 'new-password-9' })).status).toBe(204);
    expect(await ctx.db.select().from(users).where(eq(users.email, 'asha@example.com'))).toHaveLength(0);
    // Analytics survive but are no longer linked to the deleted person.
    const evs = await ctx.db.select().from(events).where(eq(events.installId, INSTALL));
    expect(evs.length).toBeGreaterThan(0);
    expect(evs.every((e) => e.userId === null)).toBe(true);
  });
});

describe('devices and analytics ingestion', () => {
  it('registers a device and push token, ignoring invalid tokens', async () => {
    const bad = await request(ctx.app).post('/v1/devices').send({ installId: INSTALL, platform: 'android', pushToken: 'not-a-token', pushEnabled: true });
    expect(bad.status).toBe(400);
    const ok = await request(ctx.app)
      .post('/v1/devices')
      .send({ installId: INSTALL, platform: 'android', appVersion: '1.0.0', pushToken: 'ExponentPushToken[abc123]', pushEnabled: true });
    expect(ok.status).toBe(204);
    const [d] = await ctx.db.select().from(devices).where(eq(devices.installId, INSTALL));
    expect(d!.pushEnabled).toBe(true);
    expect(d!.pushToken).toBe('ExponentPushToken[abc123]');
  });

  it('accepts batched events, validates names, and clamps bad clocks', async () => {
    const bad = await request(ctx.app).post('/v1/events').send({ installId: INSTALL, platform: 'ios', events: [{ name: 'DROP TABLE' }] });
    expect(bad.status).toBe(400);
    const tooMany = await request(ctx.app)
      .post('/v1/events')
      .send({ installId: INSTALL, platform: 'ios', events: Array.from({ length: 51 }, () => ({ name: 'app_open' })) });
    expect(tooMany.status).toBe(400);
    const res = await request(ctx.app)
      .post('/v1/events')
      .send({
        installId: INSTALL,
        platform: 'ios',
        appVersion: '1.0.0',
        events: [
          { name: 'screen_view', screen: 'Home' },
          { name: 'session_complete', properties: { durationMinutes: 25 }, occurredAt: '2001-01-01T00:00:00Z' },
        ],
      });
    expect(res.status).toBe(202);
    const rows = await ctx.db.select().from(events).where(eq(events.name, 'session_complete'));
    expect(rows[0]!.occurredAt.getFullYear()).toBeGreaterThan(2020);
  });
});

describe('content library', () => {
  beforeAll(async () => {
    await ctx.db.insert(categories).values([
      { id: 'nature', name: 'Nature' },
      { id: 'nature-mountains', name: 'Mountains', parentId: 'nature' },
      { id: 'nature-mountains-himalayas', name: 'Himalayas', parentId: 'nature-mountains' },
      { id: 'anime', name: 'Anime' },
    ]);
    const base = {
      thumbnailUrl: 'https://img.example.com/t.jpg',
      mediumUrl: 'https://img.example.com/m.jpg',
      fullUrl: 'https://img.example.com/f.jpg',
      source: 'Example',
      creator: 'Someone',
      license: 'CC BY 4.0',
    };
    await ctx.db.insert(content).values([
      { ...base, title: 'Snow ridge', categoryId: 'nature', subcategoryId: 'nature-mountains-himalayas', tags: ['snow'], status: 'published', publishedAt: new Date(), popularity: 5 },
      { ...base, title: 'Valley mist', categoryId: 'nature', subcategoryId: 'nature-mountains-himalayas', tags: ['mist'], status: 'published', publishedAt: new Date(), popularity: 9 },
      { ...base, title: 'Leaf gate', categoryId: 'anime', tags: ['naruto'], status: 'published', publishedAt: new Date(), popularity: 1 },
      { ...base, title: 'Secret draft', categoryId: 'nature', tags: ['snow'], status: 'draft' },
    ]);
  });

  it('lists only published images in the mobile app shape', async () => {
    const res = await request(ctx.app).get('/v1/images');
    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(3);
    expect(res.body.items.map((i: { title: string }) => i.title)).not.toContain('Secret draft');
    expect(res.body.items[0]).toMatchObject({ imageId: expect.any(String), mediumImageUrl: expect.any(String), license: 'CC BY 4.0' });
  });

  it('filters by any ancestor category, search, tags and sorts by popularity', async () => {
    const byMid = await request(ctx.app).get('/v1/images?categoryId=nature-mountains');
    expect(byMid.body.items).toHaveLength(2);
    const search = await request(ctx.app).get('/v1/images?search=RIDGE');
    expect(search.body.items.map((i: { title: string }) => i.title)).toEqual(['Snow ridge']);
    const wildcard = await request(ctx.app).get('/v1/images?search=%25');
    expect(wildcard.body.items).toHaveLength(0);
    const tags = await request(ctx.app).get('/v1/images?tags=mist');
    expect(tags.body.items).toHaveLength(1);
    const popular = await request(ctx.app).get('/v1/images?sort=popular');
    expect(popular.body.items[0].title).toBe('Valley mist');
  });

  it('paginates with an opaque cursor', async () => {
    const p1 = await request(ctx.app).get('/v1/images?sort=title&limit=2');
    expect(p1.body.items).toHaveLength(2);
    expect(p1.body.nextCursor).toBeTruthy();
    const p2 = await request(ctx.app).get(`/v1/images?sort=title&limit=2&cursor=${p1.body.nextCursor}`);
    expect(p2.body.items).toHaveLength(1);
    expect(p2.body.nextCursor).toBeNull();
  });

  it('bumps popularity when an image is picked', async () => {
    const [item] = await ctx.db.select().from(content).where(eq(content.title, 'Leaf gate'));
    await request(ctx.app)
      .post('/v1/events')
      .send({ installId: INSTALL, platform: 'ios', events: [{ name: 'content_view', contentId: item!.id }] });
    const [after] = await ctx.db.select().from(content).where(eq(content.id, item!.id));
    expect(after!.popularity).toBe(2);
  });

  it('hides draft detail and validates ids', async () => {
    const [draft] = await ctx.db.select().from(content).where(eq(content.title, 'Secret draft'));
    expect((await request(ctx.app).get(`/v1/images/${draft!.id}`)).status).toBe(404);
    expect((await request(ctx.app).get('/v1/images/not-a-uuid')).status).toBe(400);
  });

  it('returns the category tree', async () => {
    const res = await request(ctx.app).get('/v1/categories');
    expect(res.body).toContainEqual({ id: 'nature-mountains', name: 'Mountains', parentId: 'nature' });
  });
});
