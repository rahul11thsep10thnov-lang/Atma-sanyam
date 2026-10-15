import { Router } from 'express';
import { z } from 'zod';
import { count, desc, eq, sql } from 'drizzle-orm';
import { admins, auditLogs } from '../../database/schema.js';
import type { Auth } from '../../middleware/auth.js';
import { parse } from '../../middleware/validate.js';
import { analytics, dashboardStats, lojiStats, recentAuditLog, recentGuardians } from '../../services/analyticsService.js';
import type { AppDeps } from '../../types.js';

export function adminInsightsRouter({ db, env, sms, billing }: AppDeps, auth: Auth) {
  const r = Router();
  const startedAt = Date.now();

  // Operational health for the console: what is configured and whether the
  // database answers. No secrets, only provider names and on/off flags.
  r.get('/health', auth.requirePermission('dashboard:read'), async (_req, res) => {
    let dbOk = true;
    let dbLatencyMs = 0;
    try {
      const t = Date.now();
      await db.execute(sql`select 1`);
      dbLatencyMs = Date.now() - t;
    } catch {
      dbOk = false;
    }
    const [sessions] = await db.execute(sql`select count(*)::int as n from game_sessions where outcome = 'running'`).then((x) => x.rows as { n: number }[]);
    const [pendingDeletions] = await db.execute(sql`select count(*)::int as n from account_deletion_requests where cancelled_at is null and completed_at is null`).then((x) => x.rows as { n: number }[]);
    res.json({
      ok: dbOk,
      environment: env.NODE_ENV,
      uptimeSeconds: Math.round((Date.now() - startedAt) / 1000),
      database: { ok: dbOk, latencyMs: dbLatencyMs },
      sms: { provider: sms?.name ?? 'none', testNumbers: env.OTP_TEST_NUMBERS.size },
      billing: { googlePlay: !!billing.googlePlay, razorpay: !!billing.razorpay, sandbox: !!billing.sandbox, productId: env.SUBSCRIPTION_PRODUCT_ID, priceInr: env.SUBSCRIPTION_PRICE_INR },
      runningGameSessions: sessions?.n ?? 0,
      pendingDeletionRequests: pendingDeletions?.n ?? 0,
      retention: { screenTimeDays: env.SCREEN_TIME_RETENTION_DAYS, deletionCoolingOffDays: env.DELETION_COOLING_OFF_DAYS },
    });
  });

  r.get('/dashboard', auth.requirePermission('dashboard:read'), async (req, res) => {
    const perms = req.admin!.permissions;
    const stats = await dashboardStats(db);
    // Only include sections the admin is allowed to see.
    const loji = await lojiStats(db);
    res.json({
      guardians: perms.has('guardians:read') ? stats.users : null,
      children: perms.has('guardians:read') ? { total: loji.children, byBracket: { A: loji.children_a, B: loji.children_b, C: loji.children_c, D: loji.children_d } } : null,
      subscriptions: perms.has('subscriptions:read') ? { active: loji.active_subscriptions, grace: loji.grace, expired: loji.expired } : null,
      play: perms.has('analytics:read') ? { sessionsToday: loji.sessions_today, minutesToday: loji.minutes_today } : null,
      catalogue: { publishedGames: loji.published_games, inDevelopmentGames: loji.dev_games, publishedCrafts: loji.published_crafts, publishedFacts: loji.published_facts, unpublishedFacts: loji.draft_facts },
      installs: perms.has('analytics:read') ? stats.installs : null,
      content: stats.content,
      sessions7d: perms.has('analytics:read') ? stats.sessions7d : null,
      notificationsSent30d: perms.has('notifications:read') ? stats.notificationsSent30d : null,
      recentActivity: perms.has('audit:read') ? await recentAuditLog(db, 10) : null,
      recentGuardians: perms.has('guardians:read') ? await recentGuardians(db, 5) : null,
    });
  });

  r.get('/analytics', auth.requirePermission('analytics:read'), async (req, res) => {
    const q = parse(z.object({ days: z.coerce.number().int().min(7).max(180).default(30) }), req.query);
    res.json(await analytics(db, q.days));
  });

  r.get('/audit-log', auth.requirePermission('audit:read'), async (req, res) => {
    const q = parse(
      z.object({ page: z.coerce.number().int().min(1).default(1), pageSize: z.coerce.number().int().min(1).max(100).default(50) }),
      req.query
    );
    const [total] = await db.select({ n: count() }).from(auditLogs);
    const items = await db
      .select({
        id: auditLogs.id,
        action: auditLogs.action,
        entityType: auditLogs.entityType,
        entityId: auditLogs.entityId,
        details: auditLogs.details,
        createdAt: auditLogs.createdAt,
        adminName: admins.name,
        adminEmail: admins.email,
      })
      .from(auditLogs)
      .leftJoin(admins, eq(admins.id, auditLogs.adminId))
      .orderBy(desc(auditLogs.createdAt))
      .limit(q.pageSize)
      .offset((q.page - 1) * q.pageSize);
    res.json({ items, total: total?.n ?? 0, page: q.page, pageSize: q.pageSize });
  });

  return r;
}
