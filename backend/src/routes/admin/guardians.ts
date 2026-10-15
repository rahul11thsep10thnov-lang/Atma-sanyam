// Guardian accounts in the console: look-ups for support, deactivation and
// deletion. Children are shown as counts and brackets only — never their
// names or birth months — the console has no need for them.
import { Router } from 'express';
import { z } from 'zod';
import { and, count, desc, eq, ilike, or, sql, type SQL } from 'drizzle-orm';
import { accountDeletionRequests, children, devices, entitlements, guardianSessions, guardians, subscriptions } from '../../database/schema.js';
import type { Auth } from '../../middleware/auth.js';
import { parse } from '../../middleware/validate.js';
import { notFound } from '../../lib/httpError.js';
import { escapeLike } from '../../lib/strings.js';
import { maskPhone } from '../../lib/phone.js';
import { audit } from '../../lib/audit.js';
import { revokeAllGuardianSessions, revokeAllPlayerSessions } from '../../services/sessionService.js';
import { publicSubscription } from '../../services/subscriptionService.js';
import type { AppDeps } from '../../types.js';

const listQuery = z.object({
  search: z.string().trim().max(100).optional(),
  status: z.enum(['active', 'deactivated', 'deleted_pending']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

const idParam = z.string().uuid();

function adminGuardianView(g: typeof guardians.$inferSelect) {
  return {
    id: g.id,
    name: g.name,
    phoneMasked: maskPhone(g.phone),
    email: g.email,
    status: g.status,
    termsVersion: g.termsVersion,
    createdAt: g.createdAt,
    lastSeenAt: g.lastSeenAt,
  };
}

export function adminGuardiansRouter({ db }: AppDeps, auth: Auth) {
  const r = Router();

  r.get('/', auth.requirePermission('guardians:read'), async (req, res) => {
    const q = parse(listQuery, req.query);
    const conds: SQL[] = [];
    if (q.status) conds.push(eq(guardians.status, q.status));
    if (q.search) {
      const needle = `%${escapeLike(q.search)}%`;
      conds.push(or(ilike(guardians.name, needle), ilike(guardians.phone, needle), ilike(guardians.email, needle))!);
    }
    const where = conds.length ? and(...conds) : undefined;
    const [total] = await db.select({ n: count() }).from(guardians).where(where);
    const rows = await db
      .select({ g: guardians, children: sql<number>`(select count(*) from children c where c.guardian_id = ${guardians.id} and c.status <> 'removed')::int`, entitled: entitlements.active, entStatus: entitlements.status })
      .from(guardians)
      .leftJoin(entitlements, eq(entitlements.guardianId, guardians.id))
      .where(where)
      .orderBy(desc(guardians.createdAt))
      .limit(q.pageSize)
      .offset((q.page - 1) * q.pageSize);
    res.json({ items: rows.map((x) => ({ ...adminGuardianView(x.g), children: x.children, entitlement: { active: x.entitled ?? false, status: x.entStatus ?? 'never_subscribed' } })), total: total?.n ?? 0, page: q.page, pageSize: q.pageSize });
  });

  r.get('/:id', auth.requirePermission('guardians:read'), async (req, res) => {
    const id = parse(idParam, req.params.id);
    const [g] = await db.select().from(guardians).where(eq(guardians.id, id));
    if (!g) throw notFound('Guardian not found');
    const kids = await db
      .select({ id: children.id, bracket: sql<string>`coalesce(${children.bracketOverride}, ${children.ageBracket})`, status: children.status, createdAt: children.createdAt, lastActiveAt: children.lastActiveAt })
      .from(children)
      .where(eq(children.guardianId, id));
    const guardianDevices = await db
      .select({ id: devices.id, platform: devices.platform, appVersion: devices.appVersion, pushEnabled: devices.pushEnabled, lastSeenAt: devices.lastSeenAt })
      .from(devices)
      .where(eq(devices.guardianId, id));
    const [sessions] = await db.select({ n: count() }).from(guardianSessions).where(and(eq(guardianSessions.guardianId, id), sql`${guardianSessions.revokedAt} is null and ${guardianSessions.expiresAt} > now()`));
    const subs = await db.select().from(subscriptions).where(eq(subscriptions.guardianId, id)).orderBy(desc(subscriptions.updatedAt));
    const [ent] = await db.select().from(entitlements).where(eq(entitlements.guardianId, id));
    const deletions = await db.select().from(accountDeletionRequests).where(eq(accountDeletionRequests.guardianId, id)).orderBy(desc(accountDeletionRequests.requestedAt));
    res.json({
      guardian: adminGuardianView(g),
      children: kids,
      devices: guardianDevices,
      activeSessions: sessions?.n ?? 0,
      subscriptions: subs.map(publicSubscription),
      entitlement: ent ? { active: ent.active, status: ent.status, validUntil: ent.validUntil } : { active: false, status: 'never_subscribed', validUntil: null },
      deletionRequests: deletions,
    });
  });

  r.patch('/:id', auth.requirePermission('guardians:write'), async (req, res) => {
    const id = parse(idParam, req.params.id);
    const body = parse(z.object({ status: z.enum(['active', 'deactivated']) }), req.body);
    const [g] = await db.update(guardians).set({ status: body.status, updatedAt: new Date() }).where(eq(guardians.id, id)).returning();
    if (!g) throw notFound('Guardian not found');
    if (body.status === 'deactivated') {
      await revokeAllGuardianSessions(db, id);
      const kids = await db.select({ id: children.id }).from(children).where(eq(children.guardianId, id));
      for (const k of kids) await revokeAllPlayerSessions(db, k.id);
    }
    await audit(db, req.admin!.id, body.status === 'active' ? 'guardian.activated' : 'guardian.deactivated', 'guardian', id, { phoneMasked: maskPhone(g.phone) });
    res.json(adminGuardianView(g));
  });

  r.delete('/:id', auth.requirePermission('guardians:delete'), async (req, res) => {
    const id = parse(idParam, req.params.id);
    const [g] = await db.delete(guardians).where(eq(guardians.id, id)).returning();
    if (!g) throw notFound('Guardian not found');
    await audit(db, req.admin!.id, 'guardian.deleted', 'guardian', id, { phoneMasked: maskPhone(g.phone) });
    res.status(204).end();
  });

  return r;
}
