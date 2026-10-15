import { Router } from 'express';
import { z } from 'zod';
import { and, count, desc, eq, sql, type SQL } from 'drizzle-orm';
import { billingEvents, guardians, subscriptions } from '../../database/schema.js';
import type { Auth } from '../../middleware/auth.js';
import { parse } from '../../middleware/validate.js';
import { notFound } from '../../lib/httpError.js';
import { audit } from '../../lib/audit.js';
import { maskPhone } from '../../lib/phone.js';
import { recomputeEntitlement, revokeSubscription } from '../../services/entitlementService.js';
import { publicSubscription } from '../../services/subscriptionService.js';
import type { AppDeps } from '../../types.js';

export function adminSubscriptionsRouter({ db }: AppDeps, auth: Auth) {
  const r = Router();

  r.get('/stats', auth.requirePermission('subscriptions:read'), async (_req, res) => {
    const byStatus = await db.select({ status: subscriptions.status, provider: subscriptions.provider, n: count() }).from(subscriptions).groupBy(subscriptions.status, subscriptions.provider);
    const [ent] = await db.execute(sql`select count(*) filter (where active)::int as active, count(*) filter (where not active and status <> 'never_subscribed')::int as lapsed from entitlements`).then((x) => x.rows as { active: number; lapsed: number }[]);
    const daily = await db.execute(sql`with d as (select generate_series(current_date - 29, current_date, interval '1 day')::date as day)
      select to_char(d.day, 'YYYY-MM-DD') as date, count(s.id)::int as started from d left join subscriptions s on s.created_at::date = d.day group by d.day order by d.day`);
    res.json({ byStatus, entitlements: ent ?? { active: 0, lapsed: 0 }, startsLast30Days: daily.rows });
  });

  r.get('/', auth.requirePermission('subscriptions:read'), async (req, res) => {
    const q = parse(z.object({ status: z.string().max(20).optional(), provider: z.string().max(20).optional(), page: z.coerce.number().int().min(1).default(1), pageSize: z.coerce.number().int().min(1).max(100).default(20) }), req.query);
    const conds: SQL[] = [];
    if (q.status) conds.push(eq(subscriptions.status, q.status as typeof subscriptions.$inferSelect.status));
    if (q.provider) conds.push(eq(subscriptions.provider, q.provider as typeof subscriptions.$inferSelect.provider));
    const where = conds.length ? and(...conds) : undefined;
    const [total] = await db.select({ n: count() }).from(subscriptions).where(where);
    const rows = await db
      .select({ s: subscriptions, guardianName: guardians.name, guardianPhone: guardians.phone })
      .from(subscriptions)
      .innerJoin(guardians, eq(guardians.id, subscriptions.guardianId))
      .where(where)
      .orderBy(desc(subscriptions.updatedAt))
      .limit(q.pageSize)
      .offset((q.page - 1) * q.pageSize);
    res.json({ items: rows.map((x) => ({ ...publicSubscription(x.s), guardianId: x.s.guardianId, guardianName: x.guardianName, guardianPhoneMasked: maskPhone(x.guardianPhone) })), total: total?.n ?? 0, page: q.page, pageSize: q.pageSize });
  });

  r.get('/:id/events', auth.requirePermission('subscriptions:read'), async (req, res) => {
    const id = parse(z.string().uuid(), req.params.id);
    res.json(await db.select().from(billingEvents).where(eq(billingEvents.subscriptionId, id)).orderBy(desc(billingEvents.createdAt)).limit(100));
  });

  // Support: end access now (refund/abuse) or extend a period (goodwill).
  r.post('/:id/revoke', auth.requirePermission('subscriptions:write'), async (req, res) => {
    const id = parse(z.string().uuid(), req.params.id);
    const [s] = await db.select().from(subscriptions).where(eq(subscriptions.id, id));
    if (!s) throw notFound('Subscription not found');
    await revokeSubscription(db, id);
    await audit(db, req.admin!.id, 'subscription.revoked', 'subscription', id, { guardianId: s.guardianId, provider: s.provider });
    res.status(204).end();
  });

  r.post('/:id/extend', auth.requirePermission('subscriptions:write'), async (req, res) => {
    const id = parse(z.string().uuid(), req.params.id);
    const body = parse(z.object({ days: z.number().int().min(1).max(90), reason: z.string().trim().min(1).max(300) }), req.body);
    const [s] = await db.select().from(subscriptions).where(eq(subscriptions.id, id));
    if (!s) throw notFound('Subscription not found');
    const base = s.currentPeriodEnd && s.currentPeriodEnd.getTime() > Date.now() ? s.currentPeriodEnd : new Date();
    const end = new Date(base.getTime() + body.days * 86_400_000);
    await db.update(subscriptions).set({ currentPeriodEnd: end, status: s.status === 'expired' || s.status === 'revoked' ? 'active' : s.status, revokedAt: null, updatedAt: new Date() }).where(eq(subscriptions.id, id));
    await db.insert(billingEvents).values({ subscriptionId: id, guardianId: s.guardianId, provider: s.provider, type: 'admin_extended', dedupeKey: `admin:extend:${id}:${Date.now()}`, payload: { days: body.days, reason: body.reason, adminId: req.admin!.id } });
    await recomputeEntitlement(db, s.guardianId);
    await audit(db, req.admin!.id, 'subscription.extended', 'subscription', id, { days: body.days, reason: body.reason });
    res.json(publicSubscription({ ...s, currentPeriodEnd: end }));
  });

  return r;
}
