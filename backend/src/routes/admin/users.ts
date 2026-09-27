import { Router } from 'express';
import { z } from 'zod';
import { and, count, desc, eq, ilike, or, type SQL } from 'drizzle-orm';
import { devices, events, users, userSessions } from '../../database/schema.js';
import type { Auth } from '../../middleware/auth.js';
import { parse } from '../../middleware/validate.js';
import { notFound } from '../../lib/httpError.js';
import { escapeLike } from '../../lib/strings.js';
import { audit } from '../../lib/audit.js';
import { revokeAllUserSessions } from '../../services/sessionService.js';
import type { AppDeps } from '../../types.js';

const listQuery = z.object({
  search: z.string().trim().max(100).optional(),
  status: z.enum(['active', 'deactivated']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

const idParam = z.string().uuid();

function adminUserView(u: typeof users.$inferSelect) {
  return {
    id: u.id,
    email: u.email,
    displayName: u.displayName,
    status: u.status,
    createdAt: u.createdAt,
    lastSeenAt: u.lastSeenAt,
  };
}

export function adminUsersRouter({ db }: AppDeps, auth: Auth) {
  const r = Router();

  r.get('/', auth.requirePermission('users:read'), async (req, res) => {
    const q = parse(listQuery, req.query);
    const conds: SQL[] = [];
    if (q.status) conds.push(eq(users.status, q.status));
    if (q.search) {
      const needle = `%${escapeLike(q.search)}%`;
      conds.push(or(ilike(users.email, needle), ilike(users.displayName, needle))!);
    }
    const where = conds.length ? and(...conds) : undefined;
    const [total] = await db.select({ n: count() }).from(users).where(where);
    const rows = await db
      .select()
      .from(users)
      .where(where)
      .orderBy(desc(users.createdAt))
      .limit(q.pageSize)
      .offset((q.page - 1) * q.pageSize);
    res.json({ items: rows.map(adminUserView), total: total?.n ?? 0, page: q.page, pageSize: q.pageSize });
  });

  r.get('/:id', auth.requirePermission('users:read'), async (req, res) => {
    const id = parse(idParam, req.params.id);
    const [user] = await db.select().from(users).where(eq(users.id, id));
    if (!user) throw notFound('User not found');
    const userDevices = await db
      .select({
        id: devices.id,
        platform: devices.platform,
        appVersion: devices.appVersion,
        pushEnabled: devices.pushEnabled,
        lastSeenAt: devices.lastSeenAt,
      })
      .from(devices)
      .where(eq(devices.userId, id));
    const [sessions] = await db.select({ n: count() }).from(userSessions).where(eq(userSessions.userId, id));
    // Product-usage events only (screen views, focus sessions) — no content of
    // the user's photos or anything outside the app is ever collected.
    const recentEvents = await db
      .select({
        name: events.name,
        screen: events.screen,
        contentId: events.contentId,
        properties: events.properties,
        platform: events.platform,
        occurredAt: events.occurredAt,
      })
      .from(events)
      .where(eq(events.userId, id))
      .orderBy(desc(events.occurredAt))
      .limit(50);
    res.json({ user: adminUserView(user), devices: userDevices, activeSessions: sessions?.n ?? 0, recentEvents });
  });

  r.patch('/:id', auth.requirePermission('users:write'), async (req, res) => {
    const id = parse(idParam, req.params.id);
    const body = parse(z.object({ status: z.enum(['active', 'deactivated']) }), req.body);
    const [user] = await db
      .update(users)
      .set({ status: body.status, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    if (!user) throw notFound('User not found');
    // Deactivation takes effect immediately: every session is revoked.
    if (body.status === 'deactivated') await revokeAllUserSessions(db, id);
    await audit(db, req.admin!.id, body.status === 'active' ? 'user.activated' : 'user.deactivated', 'user', id, {
      email: user.email,
    });
    res.json(adminUserView(user));
  });

  r.delete('/:id', auth.requirePermission('users:delete'), async (req, res) => {
    const id = parse(idParam, req.params.id);
    const [user] = await db.delete(users).where(eq(users.id, id)).returning();
    if (!user) throw notFound('User not found');
    await audit(db, req.admin!.id, 'user.deleted', 'user', id, { email: user.email });
    res.status(204).end();
  });

  return r;
}
