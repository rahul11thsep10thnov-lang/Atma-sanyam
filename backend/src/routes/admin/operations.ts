import { Router } from 'express';
import { and, count, desc, eq } from 'drizzle-orm';
import { z } from 'zod';
import { admins, auditLogs, mockBlueprints } from '../../database/schema.js';
import { audit } from '../../lib/audit.js';
import { notFound } from '../../lib/httpError.js';
import { ENABLED_LANGUAGE_CODES } from '../../lib/languages.js';
import { parse } from '../../middleware/validate.js';
import type { Auth } from '../../middleware/auth.js';
import { analytics, dashboard, listUsers } from '../../services/analyticsService.js';
import {
  generateFromBlueprint,
  generateMockTest,
  getMockTest,
  listBlueprints,
  listMockTests,
  saveBlueprint,
  setMockTestStatus,
  updateMockTest,
} from '../../services/mockTestService.js';
import { getSettings, pipelineSettingsSchema, updateSettings } from '../../services/settingsService.js';
import { getSiteSettings, siteSettingsPatchSchema, updateSiteSettings } from '../../services/siteSettingsService.js';
import { grantSubscription, listSubscriptionsFor } from '../../services/enrollmentService.js';
import type { AppDeps } from '../../types.js';
import { idParam, optionalUuid, pageQuery } from '../util.js';

const percent = z.number().int().min(0).max(100);
const difficulty = z.object({ easy: percent, medium: percent, hard: percent });
const sections = z
  .array(
    z.object({
      subjectId: z.uuid(),
      count: z.number().int().min(1).max(500),
      chapters: z.record(z.uuid(), z.number().int().min(0).max(500)).optional(),
    })
  )
  .max(30);

const common = {
  examId: z.uuid(),
  language: z.enum(ENABLED_LANGUAGE_CODES),
  totalQuestions: z.number().int().min(1).max(500),
  durationMinutes: z.number().int().min(1).max(600),
  marksPerQuestion: z.number().min(0).max(100),
  negativeMarks: z.number().min(0).max(100),
  difficulty,
};

export function adminOperationsRouter(deps: AppDeps, auth: Auth) {
  const { db, env } = deps;
  const r = Router();
  const A = auth.requireAdmin;

  r.get('/dashboard', A, auth.can('dashboard:read'), async (_req, res) => {
    res.json(await dashboard(db));
  });

  r.get('/analytics', A, auth.can('analytics:read'), async (req, res) => {
    const q = parse(z.object({ minAttempts: z.coerce.number().int().min(1).max(1000).optional() }), req.query);
    res.json(await analytics(db, q));
  });

  // --- Mock tests -----------------------------------------------------------
  r.get('/mock-tests', A, auth.can('questions:read'), async (req, res) => {
    const q = parse(z.object({ examId: optionalUuid, status: z.enum(['draft', 'published', 'archived']).optional(), ...pageQuery }), req.query);
    res.json(await listMockTests(db, q));
  });

  r.get('/mock-tests/:id', A, auth.can('questions:read'), async (req, res) => {
    res.json(await getMockTest(db, idParam(req), { includeAnswers: true, publicOnly: false }));
  });

  r.post('/mock-tests/generate', A, auth.can('mocktests:write'), async (req, res) => {
    const body = parse(
      z.object({
        ...common,
        title: z.string().trim().min(1).max(200),
        description: z.string().max(2000).nullable().optional(),
        sections: sections.optional(),
        kind: z.enum(['full', 'subject']).optional(),
      }),
      req.body
    );
    const { test, report } = await generateMockTest(db, body, req.admin!.id);
    res.status(201).json({ test: await getMockTest(db, test.id, { includeAnswers: true, publicOnly: false }), report });
  });

  r.put('/mock-tests/:id', A, auth.can('mocktests:write'), async (req, res) => {
    const body = parse(
      z.object({
        title: z.string().trim().min(1).max(200).optional(),
        description: z.string().max(2000).nullable().optional(),
        durationMinutes: z.number().int().min(1).max(600).optional(),
        kind: z.enum(['full', 'subject']).optional(),
      }),
      req.body
    );
    res.json(await updateMockTest(db, idParam(req), body, req.admin!.id));
  });

  r.post('/mock-tests/:id/publish', A, auth.can('mocktests:publish'), async (req, res) => {
    res.json(await setMockTestStatus(db, idParam(req), 'publish', req.admin!.id));
  });
  r.post('/mock-tests/:id/unpublish', A, auth.can('mocktests:publish'), async (req, res) => {
    res.json(await setMockTestStatus(db, idParam(req), 'unpublish', req.admin!.id));
  });
  r.delete('/mock-tests/:id', A, auth.can('mocktests:write'), async (req, res) => {
    res.json(await setMockTestStatus(db, idParam(req), 'archive', req.admin!.id));
  });

  // --- Blueprints -----------------------------------------------------------
  const blueprintBody = z.object({ ...common, name: z.string().trim().min(1).max(200), sections });
  r.get('/blueprints', A, auth.can('questions:read'), async (req, res) => {
    const q = parse(z.object({ examId: optionalUuid }), req.query);
    res.json({ items: await listBlueprints(db, q.examId) });
  });
  r.post('/blueprints', A, auth.can('mocktests:write'), async (req, res) => {
    res.status(201).json(await saveBlueprint(db, parse(blueprintBody, req.body), req.admin!.id));
  });
  r.put('/blueprints/:id', A, auth.can('mocktests:write'), async (req, res) => {
    res.json(await saveBlueprint(db, parse(blueprintBody, req.body), req.admin!.id, idParam(req)));
  });
  r.delete('/blueprints/:id', A, auth.can('mocktests:write'), async (req, res) => {
    const rows = await db
      .update(mockBlueprints)
      .set({ status: 'archived', updatedAt: new Date() })
      .where(eq(mockBlueprints.id, idParam(req)))
      .returning({ id: mockBlueprints.id });
    if (!rows[0]) throw notFound('Blueprint not found');
    await audit(db, req.admin!.id, 'blueprint.archived', 'mock_blueprint', rows[0].id);
    res.json({ id: rows[0].id, archived: true });
  });
  r.post('/blueprints/:id/generate', A, auth.can('mocktests:write'), async (req, res) => {
    const body = parse(z.object({ count: z.number().int().min(1).max(100), publish: z.boolean().default(false) }), req.body);
    if (body.publish) await new Promise<void>((resolve, reject) => auth.can('mocktests:publish')(req, res, (e?: unknown) => (e ? reject(e) : resolve())));
    res.status(201).json(await generateFromBlueprint(db, idParam(req), body.count, body.publish, req.admin!.id));
  });

  // --- Users, settings, audit ----------------------------------------------
  r.get('/users', A, auth.can('users:read'), async (req, res) => {
    const q = parse(z.object(pageQuery), req.query);
    const page = await listUsers(db, q.page, q.pageSize);
    const subs = await listSubscriptionsFor(
      db,
      page.items.map((u) => u.id)
    );
    res.json({ ...page, items: page.items.map((u) => ({ ...u, subscription: subs.find((s) => s.userId === u.id) ?? null })) });
  });

  // Support: activate the plan for a user without a payment.
  r.post('/users/:id/subscription', A, auth.can('settings:write'), async (req, res) => {
    const body = parse(z.object({ days: z.number().int().min(1).max(3650).default(365), note: z.string().trim().max(200).optional() }), req.body ?? {});
    res.status(201).json({ subscription: await grantSubscription(db, idParam(req), body.days, req.admin!.id, body.note) });
  });

  r.get('/site-settings', A, auth.can('dashboard:read'), async (_req, res) => {
    res.json({ site: await getSiteSettings(db), payments: { razorpay: !!env.RAZORPAY_KEY_ID, devActivate: env.ENROLL_DEV_ACTIVATE } });
  });

  r.put('/site-settings', A, auth.can('settings:write'), async (req, res) => {
    const patch = parse(siteSettingsPatchSchema, req.body);
    const next = await updateSiteSettings(db, patch, req.admin!.id);
    await audit(db, req.admin!.id, 'settings.updated', 'settings', 'site', patch);
    res.json({ site: next });
  });

  r.get('/settings', A, auth.can('dashboard:read'), async (_req, res) => {
    res.json({
      pipeline: await getSettings(db, env),
      ai: {
        provider: deps.ai.name,
        mockAi: env.MOCK_AI,
        generationModel: deps.ai.generationModel,
        reviewModel: deps.ai.reviewModel,
        effort: env.AI_EFFORT,
        apiKeyConfigured: !!env.AI_API_KEY,
      },
      worker: { enabled: env.WORKER_ENABLED, concurrency: env.WORKER_CONCURRENCY },
    });
  });

  r.put('/settings', A, auth.can('settings:write'), async (req, res) => {
    const patch = parse(pipelineSettingsSchema.partial(), req.body);
    const next = await updateSettings(db, env, patch, req.admin!.id);
    await audit(db, req.admin!.id, 'settings.updated', 'settings', 'pipeline', patch);
    res.json({ pipeline: next });
  });

  r.get('/audit', A, auth.can('audit:read'), async (req, res) => {
    const q = parse(z.object({ entityType: z.string().max(40).optional(), entityId: z.string().max(80).optional(), ...pageQuery }), req.query);
    const page = q.page ?? 1;
    const pageSize = q.pageSize ?? 50;
    const where = and(q.entityType ? eq(auditLogs.entityType, q.entityType) : undefined, q.entityId ? eq(auditLogs.entityId, q.entityId) : undefined);
    const [total] = await db.select({ n: count() }).from(auditLogs).where(where);
    const rows = await db
      .select({
        id: auditLogs.id,
        action: auditLogs.action,
        actor: auditLogs.actor,
        entityType: auditLogs.entityType,
        entityId: auditLogs.entityId,
        details: auditLogs.details,
        createdAt: auditLogs.createdAt,
        adminEmail: admins.email,
      })
      .from(auditLogs)
      .leftJoin(admins, eq(admins.id, auditLogs.adminId))
      .where(where)
      .orderBy(desc(auditLogs.createdAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize);
    res.json({ items: rows, page, pageSize, total: Number(total?.n ?? 0) });
  });

  return r;
}
