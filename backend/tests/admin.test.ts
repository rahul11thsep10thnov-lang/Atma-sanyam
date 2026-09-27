import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { eq } from 'drizzle-orm';
import { admins, auditLogs, devices } from '../src/database/schema.js';
import { adminToken, createAdmin, setupTestApp, STRONG_PASSWORD, waitFor } from './helpers.js';

let ctx: Awaited<ReturnType<typeof setupTestApp>>;
let superToken = '';
let adminTok = '';
let editorToken = '';
let superId = '';

const as = (token: string) => ({ Authorization: `Bearer ${token}` });

beforeAll(async () => {
  ctx = await setupTestApp();
  superId = (await createAdmin(ctx.db, 'super_admin')).id;
  await createAdmin(ctx.db, 'admin');
  await createAdmin(ctx.db, 'editor');
  superToken = await adminToken(ctx.app, 'super_admin@example.com');
  adminTok = await adminToken(ctx.app, 'admin@example.com');
  editorToken = await adminToken(ctx.app, 'editor@example.com');
});
afterAll(async () => {
  await ctx.database.close();
});

describe('admin authentication', () => {
  it('rejects unauthenticated and forged requests', async () => {
    expect((await request(ctx.app).get('/admin/v1/dashboard')).status).toBe(401);
    expect((await request(ctx.app).get('/admin/v1/dashboard').set(as('x'.repeat(43)))).status).toBe(401);
  });

  it('does not accept a mobile user token on admin routes', async () => {
    const reg = await request(ctx.app).post('/v1/auth/register').send({ email: 'u@example.com', password: 'user-password-1' });
    expect((await request(ctx.app).get('/admin/v1/dashboard').set(as(reg.body.token))).status).toBe(401);
  });

  it('returns identity and permissions for the signed-in admin', async () => {
    const res = await request(ctx.app).get('/admin/v1/auth/me').set(as(editorToken));
    expect(res.status).toBe(200);
    expect(res.body.role.key).toBe('editor');
    expect(res.body.permissions).toContain('content:publish');
    expect(res.body.permissions).not.toContain('users:read');
    expect(res.headers['cache-control']).toBe('no-store');
  });

  it('locks an account after 5 failed attempts', async () => {
    await createAdmin(ctx.db, 'editor', 'victim@example.com');
    for (let i = 0; i < 5; i++) {
      const r = await request(ctx.app).post('/admin/v1/auth/login').send({ email: 'victim@example.com', password: 'wrong-password' });
      expect(r.status).toBe(401);
    }
    const locked = await request(ctx.app).post('/admin/v1/auth/login').send({ email: 'victim@example.com', password: STRONG_PASSWORD });
    expect(locked.status).toBe(401);
    expect(locked.body.error.message).toMatch(/locked/);
    // A super admin can unlock it.
    const [victim] = await ctx.db.select().from(admins).where(eq(admins.email, 'victim@example.com'));
    await request(ctx.app).patch(`/admin/v1/admins/${victim!.id}`).set(as(superToken)).send({ unlock: true }).expect(200);
    await request(ctx.app).post('/admin/v1/auth/login').send({ email: 'victim@example.com', password: STRONG_PASSWORD }).expect(200);
  });

  it('logout revokes the session', async () => {
    const t = await adminToken(ctx.app, 'victim@example.com');
    await request(ctx.app).post('/admin/v1/auth/logout').set(as(t)).expect(204);
    expect((await request(ctx.app).get('/admin/v1/auth/me').set(as(t))).status).toBe(401);
  });
});

describe('role-based access control (enforced by the API)', () => {
  const matrix: [string, string, string, number, number, number][] = [
    // method, path, label, super, admin, editor
    ['get', '/admin/v1/dashboard', 'dashboard', 200, 200, 200],
    ['get', '/admin/v1/users', 'users', 200, 200, 403],
    ['get', '/admin/v1/content', 'content', 200, 200, 200],
    ['get', '/admin/v1/settings', 'settings', 200, 200, 403],
    ['get', '/admin/v1/notifications', 'notifications', 200, 200, 403],
    ['get', '/admin/v1/analytics', 'analytics', 200, 200, 403],
    ['get', '/admin/v1/admins', 'admins', 200, 403, 403],
    ['get', '/admin/v1/roles', 'roles', 200, 403, 403],
    ['get', '/admin/v1/audit-log', 'audit', 200, 200, 403],
  ];
  for (const [method, path, label, s, a, e] of matrix) {
    it(`${label}: super=${s} admin=${a} editor=${e}`, async () => {
      const call = (t: string) => (request(ctx.app) as unknown as Record<string, (p: string) => request.Test>)[method]!(path).set(as(t));
      expect((await call(superToken)).status).toBe(s);
      expect((await call(adminTok)).status).toBe(a);
      expect((await call(editorToken)).status).toBe(e);
    });
  }

  it('editor dashboard omits sections it may not see', async () => {
    const res = await request(ctx.app).get('/admin/v1/dashboard').set(as(editorToken));
    expect(res.body.users).toBeNull();
    expect(res.body.content).toBeTruthy();
  });
});

describe('content management', () => {
  const item = {
    title: 'Himalaya dawn',
    tags: ['Snow', 'dawn'],
    thumbnailUrl: 'https://cdn.example.com/t.jpg',
    mediumUrl: 'https://cdn.example.com/m.jpg',
    fullUrl: 'https://cdn.example.com/f.jpg',
    source: 'Unsplash',
    creator: 'A. Photographer',
    license: 'Unsplash License',
  };
  let id = '';

  it('manages categories with hierarchy and cycle protection', async () => {
    await request(ctx.app).post('/admin/v1/categories').set(as(editorToken)).send({ name: 'Nature' }).expect(201);
    const child = await request(ctx.app).post('/admin/v1/categories').set(as(editorToken)).send({ name: 'Mountains', parentId: 'nature' });
    expect(child.body.id).toBe('nature-mountains');
    expect((await request(ctx.app).patch('/admin/v1/categories/nature').set(as(editorToken)).send({ parentId: 'nature-mountains' })).status).toBe(400);
    expect((await request(ctx.app).post('/admin/v1/categories').set(as(editorToken)).send({ name: 'Nature' })).status).toBe(409);
    // editors cannot delete; admins cannot delete a parent with children
    expect((await request(ctx.app).delete('/admin/v1/categories/nature').set(as(editorToken))).status).toBe(403);
    expect((await request(ctx.app).delete('/admin/v1/categories/nature').set(as(adminTok))).status).toBe(409);
  });

  it('editor creates a draft; drafts are invisible to the app', async () => {
    const res = await request(ctx.app).post('/admin/v1/content').set(as(editorToken)).send({ ...item, categoryId: 'nature' });
    expect(res.status).toBe(201);
    expect(res.body.status).toBe('draft');
    expect(res.body.tags).toEqual(['snow', 'dawn']);
    id = res.body.id;
    expect((await request(ctx.app).get('/v1/images')).body.items).toHaveLength(0);
  });

  it('validates URLs, categories and attribution', async () => {
    expect((await request(ctx.app).post('/admin/v1/content').set(as(editorToken)).send({ ...item, fullUrl: 'javascript:alert(1)' })).status).toBe(400);
    expect((await request(ctx.app).post('/admin/v1/content').set(as(editorToken)).send({ ...item, categoryId: 'missing' })).status).toBe(400);
    expect((await request(ctx.app).post('/admin/v1/content').set(as(editorToken)).send({ ...item, attributionRequired: true })).status).toBe(400);
  });

  it('publishing requires content:publish; editors have it', async () => {
    const res = await request(ctx.app).patch(`/admin/v1/content/${id}`).set(as(editorToken)).send({ status: 'published' });
    expect(res.status).toBe(200);
    expect(res.body.publishedAt).toBeTruthy();
    const listed = await request(ctx.app).get('/v1/images');
    expect(listed.body.items.map((i: { title: string }) => i.title)).toEqual(['Himalaya dawn']);
  });

  it('searches and filters in the admin list', async () => {
    const res = await request(ctx.app).get('/admin/v1/content?search=himalaya&status=published').set(as(adminTok));
    expect(res.body.total).toBe(1);
  });

  it('unpublish and delete (delete needs content:delete)', async () => {
    await request(ctx.app).patch(`/admin/v1/content/${id}`).set(as(adminTok)).send({ status: 'draft' }).expect(200);
    expect((await request(ctx.app).get('/v1/images')).body.items).toHaveLength(0);
    expect((await request(ctx.app).delete(`/admin/v1/content/${id}`).set(as(editorToken))).status).toBe(403);
    await request(ctx.app).delete(`/admin/v1/content/${id}`).set(as(adminTok)).expect(204);
    expect((await request(ctx.app).get(`/admin/v1/content/${id}`).set(as(adminTok))).status).toBe(404);
  });

  it('records an audit trail', async () => {
    const res = await request(ctx.app).get('/admin/v1/audit-log').set(as(superToken));
    const actions = res.body.items.map((i: { action: string }) => i.action);
    expect(actions).toEqual(expect.arrayContaining(['content.created', 'content.published', 'content.deleted']));
  });
});

describe('user management', () => {
  let userId = '';
  let userToken = '';

  beforeAll(async () => {
    const reg = await request(ctx.app).post('/v1/auth/register').send({ email: 'maya@example.com', password: 'maya-password-1', displayName: 'Maya' });
    userId = reg.body.user.id;
    userToken = reg.body.token;
    await request(ctx.app)
      .post('/v1/events')
      .set(as(userToken))
      .send({ installId: 'install-maya-000000001', platform: 'android', events: [{ name: 'screen_view', screen: 'Home' }] });
  });

  it('lists and searches users', async () => {
    const res = await request(ctx.app).get('/admin/v1/users?search=MAYA').set(as(adminTok));
    expect(res.body.total).toBe(1);
    expect(res.body.items[0]).not.toHaveProperty('passwordHash');
  });

  it('shows user detail with activity', async () => {
    const res = await request(ctx.app).get(`/admin/v1/users/${userId}`).set(as(adminTok));
    expect(res.status).toBe(200);
    expect(res.body.recentEvents[0].screen).toBe('Home');
    expect(res.body.devices).toHaveLength(1);
  });

  it('deactivation signs the user out and blocks login immediately', async () => {
    await request(ctx.app).patch(`/admin/v1/users/${userId}`).set(as(adminTok)).send({ status: 'deactivated' }).expect(200);
    expect((await request(ctx.app).get('/v1/me').set(as(userToken))).status).toBe(401);
    const login = await request(ctx.app).post('/v1/auth/login').send({ email: 'maya@example.com', password: 'maya-password-1' });
    expect(login.status).toBe(401);
    expect(login.body.error.message).toMatch(/deactivated/);
    await request(ctx.app).patch(`/admin/v1/users/${userId}`).set(as(adminTok)).send({ status: 'active' }).expect(200);
    await request(ctx.app).post('/v1/auth/login').send({ email: 'maya@example.com', password: 'maya-password-1' }).expect(200);
  });

  it('deletes a user', async () => {
    await request(ctx.app).delete(`/admin/v1/users/${userId}`).set(as(superToken)).expect(204);
    expect((await request(ctx.app).get(`/admin/v1/users/${userId}`).set(as(superToken))).status).toBe(404);
  });
});

describe('app configuration', () => {
  it('validates and applies settings, visible to the app via /v1/config', async () => {
    const bad = await request(ctx.app).put('/admin/v1/settings/app_version').set(as(adminTok)).send({ value: { minimumVersion: 'one' } });
    expect(bad.status).toBe(400);
    expect((await request(ctx.app).put('/admin/v1/settings/nope').set(as(adminTok)).send({ value: {} })).status).toBe(404);
    await request(ctx.app)
      .put('/admin/v1/settings/maintenance')
      .set(as(adminTok))
      .send({ value: { enabled: true, message: 'Back at 5pm' } })
      .expect(200);
    await request(ctx.app)
      .put('/admin/v1/settings/feature_flags')
      .set(as(adminTok))
      .send({ value: { contentLibrary: false, quoteTiles: true, customPhotos: true, accounts: true, pushNotifications: true } })
      .expect(200);
    const cfg = await request(ctx.app).get('/v1/config');
    expect(cfg.body.maintenance).toEqual({ enabled: true, message: 'Back at 5pm' });
    expect(cfg.body.features.contentLibrary).toBe(false);
    const list = await request(ctx.app).get('/admin/v1/settings').set(as(adminTok));
    expect(list.body.find((s: { key: string }) => s.key === 'maintenance').value.enabled).toBe(true);
  });

  it('editors cannot change configuration', async () => {
    const res = await request(ctx.app).put('/admin/v1/settings/maintenance').set(as(editorToken)).send({ value: { enabled: false, message: 'x' } });
    expect(res.status).toBe(403);
  });
});

describe('push notifications', () => {
  beforeAll(async () => {
    const reg = await request(ctx.app).post('/v1/auth/register').send({ email: 'push@example.com', password: 'push-password-1' });
    await request(ctx.app)
      .post('/v1/devices')
      .set(as(reg.body.token))
      .send({ installId: 'install-push-00000000001', platform: 'ios', pushToken: 'ExponentPushToken[live1]', pushEnabled: true });
    await request(ctx.app)
      .post('/v1/devices')
      .send({ installId: 'install-push-00000000002', platform: 'android', pushToken: 'ExponentPushToken[dead1]', pushEnabled: true });
    await request(ctx.app)
      .post('/v1/devices')
      .send({ installId: 'install-push-00000000003', platform: 'android', pushToken: 'ExponentPushToken[optedout]', pushEnabled: false });
    ctx.push.deadTokens.add('ExponentPushToken[dead1]');
  });

  it('previews recipient counts per target', async () => {
    const all = await request(ctx.app).post('/admin/v1/notifications/preview').set(as(adminTok)).send({ target: { type: 'all' } });
    expect(all.body.recipients).toBe(2);
    const ios = await request(ctx.app).post('/admin/v1/notifications/preview').set(as(adminTok)).send({ target: { type: 'platform', platform: 'ios' } });
    expect(ios.body.recipients).toBe(1);
    const signed = await request(ctx.app).post('/admin/v1/notifications/preview').set(as(adminTok)).send({ target: { type: 'signed_in' } });
    expect(signed.body.recipients).toBe(1);
  });

  it('sends, records results, and prunes dead tokens', async () => {
    const res = await request(ctx.app)
      .post('/admin/v1/notifications')
      .set(as(adminTok))
      .send({ title: 'New art pack', body: 'Fresh Himalaya puzzles are live', target: { type: 'all' } });
    expect(res.status).toBe(202);
    const done = await waitFor(
      async () => (await request(ctx.app).get(`/admin/v1/notifications/${res.body.id}`).set(as(adminTok))).body,
      (n) => n.status !== 'sending'
    );
    expect(done.status).toBe('sent');
    expect(done.recipientCount).toBe(2);
    expect(done.successCount).toBe(1);
    expect(done.failureCount).toBe(1);
    expect(ctx.push.sent.map((m) => m.to)).not.toContain('ExponentPushToken[optedout]');
    const [dead] = await ctx.db.select().from(devices).where(eq(devices.installId, 'install-push-00000000002'));
    expect(dead!.pushToken).toBeNull();
  });

  it('supports drafts, and only drafts can be sent later', async () => {
    const draft = await request(ctx.app)
      .post('/admin/v1/notifications')
      .set(as(adminTok))
      .send({ title: 'Later', body: 'Draft body', target: { type: 'all' }, sendNow: false });
    expect(draft.status).toBe(201);
    expect(draft.body.status).toBe('draft');
    await request(ctx.app).post(`/admin/v1/notifications/${draft.body.id}/send`).set(as(adminTok)).expect(202);
    expect((await request(ctx.app).post(`/admin/v1/notifications/${draft.body.id}/send`).set(as(adminTok))).status).toBe(409);
    const history = await request(ctx.app).get('/admin/v1/notifications').set(as(adminTok));
    expect(history.body.total).toBe(2);
  });
});

describe('analytics & dashboard', () => {
  it('computes DAU, sessions, screens and errors', async () => {
    await request(ctx.app)
      .post('/v1/events')
      .send({
        installId: 'install-analytics-000001',
        platform: 'android',
        events: [
          { name: 'app_open' },
          { name: 'screen_view', screen: 'Home' },
          { name: 'session_complete', properties: { durationMinutes: 30 } },
          { name: 'session_fail', properties: { durationMinutes: 45, reason: 'left_app' } },
          { name: 'error', properties: { message: 'boom' } },
        ],
      })
      .expect(202);
    const res = await request(ctx.app).get('/admin/v1/analytics?days=7').set(as(adminTok));
    expect(res.status).toBe(200);
    expect(res.body.dau).toHaveLength(7);
    expect(res.body.dau.at(-1).count).toBeGreaterThanOrEqual(1);
    expect(res.body.active.mau).toBeGreaterThanOrEqual(1);
    expect(res.body.sessions).toMatchObject({ completed: 1, failed: 1, completionRate: 50, avgCompletedMinutes: 30 });
    expect(res.body.topScreens[0].screen).toBe('Home');
    expect(res.body.errors.count).toBe(1);
    expect(res.body.registrations.at(-1).count).toBeGreaterThanOrEqual(1);
  });

  it('dashboard aggregates counts and recent activity', async () => {
    const res = await request(ctx.app).get('/admin/v1/dashboard').set(as(superToken));
    expect(res.body.users.total).toBeGreaterThanOrEqual(1);
    expect(res.body.recentActivity.length).toBeGreaterThan(0);
  });
});

describe('admin user management', () => {
  it('creates admins with a strong password policy', async () => {
    const weak = await request(ctx.app)
      .post('/admin/v1/admins')
      .set(as(superToken))
      .send({ email: 'new@example.com', name: 'New', roleKey: 'editor', password: 'password' });
    expect(weak.status).toBe(400);
    const ok = await request(ctx.app)
      .post('/admin/v1/admins')
      .set(as(superToken))
      .send({ email: 'New@Example.com', name: 'New', roleKey: 'editor', password: STRONG_PASSWORD });
    expect(ok.status).toBe(201);
    expect(ok.body).not.toHaveProperty('passwordHash');
    await adminToken(ctx.app, 'new@example.com');
  });

  it('role change revokes that admin’s sessions immediately', async () => {
    const t = await adminToken(ctx.app, 'new@example.com');
    const [row] = await ctx.db.select().from(admins).where(eq(admins.email, 'new@example.com'));
    await request(ctx.app).patch(`/admin/v1/admins/${row!.id}`).set(as(superToken)).send({ roleKey: 'admin' }).expect(200);
    expect((await request(ctx.app).get('/admin/v1/auth/me').set(as(t))).status).toBe(401);
  });

  it('protects against self-demotion and removing the last super admin', async () => {
    expect((await request(ctx.app).patch(`/admin/v1/admins/${superId}`).set(as(superToken)).send({ roleKey: 'editor' })).status).toBe(400);
    expect((await request(ctx.app).delete(`/admin/v1/admins/${superId}`).set(as(superToken))).status).toBe(400);
    // Admins (non-super) can't touch admin accounts at all.
    expect((await request(ctx.app).delete(`/admin/v1/admins/${superId}`).set(as(adminTok))).status).toBe(403);
    const roles = await request(ctx.app).get('/admin/v1/roles').set(as(superToken));
    expect(roles.body.map((r: { key: string }) => r.key)).toEqual(['admin', 'editor', 'super_admin']);
  });

  it('change-password requires the current password and revokes other sessions', async () => {
    await createAdmin(ctx.db, 'admin', 'pw@example.com');
    const t1 = await adminToken(ctx.app, 'pw@example.com');
    const t2 = await adminToken(ctx.app, 'pw@example.com');
    const newPassword = 'Another-Strong-Pass-7';
    expect((await request(ctx.app).post('/admin/v1/auth/change-password').set(as(t1)).send({ currentPassword: 'nope', newPassword })).status).toBe(400);
    await request(ctx.app).post('/admin/v1/auth/change-password').set(as(t1)).send({ currentPassword: STRONG_PASSWORD, newPassword }).expect(204);
    expect((await request(ctx.app).get('/admin/v1/auth/me').set(as(t2))).status).toBe(401);
    expect((await request(ctx.app).get('/admin/v1/auth/me').set(as(t1))).status).toBe(200);
    const logged = await ctx.db.select().from(auditLogs).where(eq(auditLogs.action, 'admin.password_changed'));
    expect(logged).toHaveLength(1);
  });
});
