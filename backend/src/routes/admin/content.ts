import express, { Router } from 'express';
import { desc, eq } from 'drizzle-orm';
import { z } from 'zod';
import { sourceMaterials } from '../../database/schema.js';
import { audit } from '../../lib/audit.js';
import { notFound } from '../../lib/httpError.js';
import { ENABLED_LANGUAGE_CODES, LANGUAGES } from '../../lib/languages.js';
import { parse } from '../../middleware/validate.js';
import type { Auth } from '../../middleware/auth.js';
import type { RateLimits } from '../../middleware/rateLimits.js';
import { cancelJob, createJob, estimate, getJob, listJobs, retryFailed } from '../../services/generationService.js';
import { importQuestions } from '../../services/importService.js';
import {
  bulkTransition,
  createQuestion,
  deleteQuestion,
  getQuestion,
  listQuestions,
  transition,
  updateQuestion,
  type ReviewAction,
} from '../../services/questionService.js';
import { createNode, deleteNode, listTree, updateNode } from '../../services/taxonomyService.js';
import type { AppDeps } from '../../types.js';
import { idParam, optionalUuid, pageQuery } from '../util.js';

const STATUSES = ['draft', 'generated', 'validating', 'needs_review', 'approved', 'rejected', 'published', 'archived'] as const;
const difficultyEnum = z.enum(['easy', 'medium', 'hard']);
const percent = z.number().int().min(0).max(100);

const nodeBody = z.object({
  name: z.string().trim().min(1).max(160),
  slug: z.string().trim().max(80).optional(),
  description: z.string().max(2000).nullable().optional(),
  sortOrder: z.number().int().min(0).max(10_000).optional(),
  stateCode: z.string().max(40).nullable().optional(),
  examType: z.string().max(40).nullable().optional(),
  defaultLanguage: z.enum(ENABLED_LANGUAGE_CODES).optional(),
});

const questionBody = z.object({
  examId: z.uuid(),
  subjectId: z.uuid(),
  chapterId: z.uuid(),
  topicId: z.uuid().nullable().optional(),
  questionText: z.string().max(5000),
  options: z.array(z.object({ label: z.string().max(2), text: z.string().max(1000) })).max(8),
  correctOption: z.string().max(10),
  explanation: z.string().max(5000).nullable().optional(),
  difficulty: z.string().max(20),
  language: z.enum(ENABLED_LANGUAGE_CODES),
  computation: z.string().max(300).nullable().optional(),
  sourceName: z.string().max(300).nullable().optional(),
  sourceReference: z.string().max(1000).nullable().optional(),
  sourceMaterialId: z.uuid().nullable().optional(),
  validAsOf: z.iso.date().nullable().optional(),
});

export function adminContentRouter(deps: AppDeps, auth: Auth, limits: RateLimits) {
  const { db, env, ai } = deps;
  const r = Router();
  const A = auth.requireAdmin;

  r.get('/languages', A, (_req, res) => {
    res.json({ items: LANGUAGES });
  });

  // --- Taxonomy -------------------------------------------------------------
  r.get('/taxonomy', A, async (req, res) => {
    const q = parse(z.object({ includeArchived: z.enum(['true', 'false']).optional(), examId: optionalUuid }), req.query);
    res.json({ items: await listTree(db, { includeArchived: q.includeArchived === 'true', examId: q.examId }) });
  });

  for (const level of ['exam', 'subject', 'chapter', 'topic'] as const) {
    const path = `/${level === 'exam' ? 'exams' : level === 'subject' ? 'subjects' : level === 'chapter' ? 'chapters' : 'topics'}`;
    const parentKey = level === 'subject' ? 'examId' : level === 'chapter' ? 'subjectId' : level === 'topic' ? 'chapterId' : null;
    r.post(path, A, auth.can('taxonomy:write'), async (req, res) => {
      const body = parse(nodeBody, req.body);
      const parentId = parentKey
        ? parse(z.object({ parent: z.uuid({ message: `${parentKey} is required` }) }), { parent: req.body?.[parentKey] }).parent
        : undefined;
      const row = await createNode(db, level, body, parentId);
      await audit(db, req.admin!.id, `${level}.created`, level, row.id, { name: body.name });
      res.status(201).json(row);
    });
    r.put(`${path}/:id`, A, auth.can('taxonomy:write'), async (req, res) => {
      const body = parse(nodeBody.partial().extend({ status: z.enum(['active', 'archived']).optional() }), req.body);
      const row = await updateNode(db, level, idParam(req), body);
      await audit(db, req.admin!.id, `${level}.updated`, level, row.id, body);
      res.json(row);
    });
    r.delete(`${path}/:id`, A, auth.can('taxonomy:write'), async (req, res) => {
      const hard = req.query.hard === 'true';
      const result = await deleteNode(db, level, idParam(req), hard);
      await audit(db, req.admin!.id, hard ? `${level}.deleted` : `${level}.archived`, level, idParam(req));
      res.json(result);
    });
  }

  // --- Question bank --------------------------------------------------------
  r.get('/questions', A, auth.can('questions:read'), async (req, res) => {
    const q = parse(
      z.object({
        examId: optionalUuid,
        subjectId: optionalUuid,
        chapterId: optionalUuid,
        topicId: optionalUuid,
        jobId: optionalUuid,
        difficulty: difficultyEnum.optional(),
        language: z.string().max(20).optional(),
        status: z
          .string()
          .optional()
          .transform((v) => (v ? v.split(',').filter(Boolean) : undefined))
          .pipe(z.array(z.enum(STATUSES)).optional()),
        source: z.enum(['ai', 'import', 'manual', 'pyq']).optional(),
        duplicates: z.enum(['true', 'false']).optional(),
        q: z.string().max(200).optional(),
        order: z.enum(['newest', 'oldest']).optional(),
        ...pageQuery,
      }),
      req.query
    );
    res.json(await listQuestions(db, { ...q, duplicatesOnly: q.duplicates === 'true' }));
  });

  r.get('/questions/:id', A, auth.can('questions:read'), async (req, res) => {
    res.json(await getQuestion(db, idParam(req)));
  });

  r.post('/questions', A, auth.can('questions:write'), async (req, res) => {
    res.status(201).json(await createQuestion(db, parse(questionBody, req.body), req.admin!.id));
  });

  r.put('/questions/:id', A, auth.can('questions:write'), async (req, res) => {
    res.json(await updateQuestion(db, idParam(req), parse(questionBody, req.body), req.admin!.id));
  });

  // Soft delete (archive) by default; ?hard=true only for unused questions.
  r.delete('/questions/:id', A, auth.can('questions:write'), async (req, res) => {
    const id = idParam(req);
    if (req.query.hard === 'true') res.json(await deleteQuestion(db, id, req.admin!.id));
    else res.json(await transition(db, id, 'archive', req.admin!.id));
  });

  const actionPermission: Record<ReviewAction, 'questions:review' | 'questions:publish' | 'questions:write'> = {
    approve: 'questions:review',
    reject: 'questions:review',
    publish: 'questions:publish',
    unpublish: 'questions:publish',
    archive: 'questions:write',
    restore: 'questions:write',
  };
  for (const action of Object.keys(actionPermission) as ReviewAction[]) {
    r.post(`/questions/:id/${action}`, A, auth.can(actionPermission[action]), async (req, res) => {
      const body = parse(z.object({ notes: z.string().max(2000).optional() }), req.body ?? {});
      res.json(await transition(db, idParam(req), action, req.admin!.id, body.notes));
    });
  }

  r.post('/questions/bulk', A, async (req, res, next) => {
    const body = parse(
      z.object({
        ids: z.array(z.uuid()).min(1).max(500),
        action: z.enum(['approve', 'reject', 'publish', 'unpublish', 'archive', 'restore']),
        notes: z.string().max(2000).optional(),
      }),
      req.body
    );
    auth.can(actionPermission[body.action])(req, res, async (err?: unknown) => {
      if (err) return next(err);
      try {
        res.json(await bulkTransition(db, body.ids, body.action, req.admin!.id, body.notes));
      } catch (e) {
        next(e);
      }
    });
  });

  // --- Generation -----------------------------------------------------------
  const jobBody = z.object({
    examId: z.uuid(),
    subjectId: z.uuid(),
    chapterId: z.uuid(),
    topicId: z.uuid().nullable().optional(),
    language: z.enum(ENABLED_LANGUAGE_CODES),
    questionCount: z.number().int().min(1).max(10_000),
    questionType: z.enum(['mcq', 'multiple_select', 'true_false', 'numerical', 'assertion_reason', 'matching', 'passage_based']).default('mcq'),
    difficulty: z.object({ easy: percent, medium: percent, hard: percent }),
    explanationRequired: z.boolean().default(true),
    sourceReference: z.string().max(1000).nullable().optional(),
    sourceMaterialId: z.uuid().nullable().optional(),
    additionalInstructions: z.string().max(2000).nullable().optional(),
    maxCostUsd: z.number().positive().max(100_000).nullable().optional(),
  });

  r.post('/generation-jobs/estimate', A, auth.can('generation:run'), async (req, res) => {
    const body = parse(z.object({ questionCount: z.number().int().min(1).max(10_000) }), req.body);
    res.json(await estimate(db, env, ai, body.questionCount));
  });

  r.post('/generation-jobs', A, auth.can('generation:run'), limits.generation, async (req, res) => {
    res.status(201).json(await createJob(db, env, ai, parse(jobBody, req.body), req.admin!.id));
  });

  r.get('/generation-jobs', A, auth.can('questions:read'), async (req, res) => {
    const q = parse(z.object({ status: z.enum(['queued', 'generating', 'validating', 'completed', 'failed', 'cancelled']).optional(), ...pageQuery }), req.query);
    res.json(await listJobs(db, q));
  });

  r.get('/generation-jobs/:id', A, auth.can('questions:read'), async (req, res) => {
    res.json(await getJob(db, idParam(req)));
  });

  r.post('/generation-jobs/:id/retry', A, auth.can('generation:run'), async (req, res) => {
    res.json(await retryFailed(db, idParam(req), req.admin!.id));
  });

  r.post('/generation-jobs/:id/cancel', A, auth.can('generation:run'), async (req, res) => {
    res.json(await cancelJob(db, idParam(req), req.admin!.id));
  });

  // --- Source material ------------------------------------------------------
  const sourceBody = z.object({
    kind: z.enum(['text', 'url', 'syllabus', 'pyq', 'pdf']),
    name: z.string().trim().min(1).max(300),
    reference: z.string().max(1000).nullable().optional(),
    content: z.string().max(200_000).nullable().optional(),
    licenseNote: z.string().max(1000).nullable().optional(),
    validFrom: z.iso.date().nullable().optional(),
    validTo: z.iso.date().nullable().optional(),
    examId: z.uuid().nullable().optional(),
    subjectId: z.uuid().nullable().optional(),
  });

  r.get('/source-materials', A, auth.can('questions:read'), async (_req, res) => {
    const rows = await db
      .select({
        id: sourceMaterials.id,
        kind: sourceMaterials.kind,
        name: sourceMaterials.name,
        reference: sourceMaterials.reference,
        licenseNote: sourceMaterials.licenseNote,
        validFrom: sourceMaterials.validFrom,
        validTo: sourceMaterials.validTo,
        approved: sourceMaterials.approved,
        examId: sourceMaterials.examId,
        subjectId: sourceMaterials.subjectId,
        createdAt: sourceMaterials.createdAt,
      })
      .from(sourceMaterials)
      .orderBy(desc(sourceMaterials.createdAt));
    res.json({ items: rows });
  });

  r.get('/source-materials/:id', A, auth.can('questions:read'), async (req, res) => {
    const [row] = await db.select().from(sourceMaterials).where(eq(sourceMaterials.id, idParam(req))).limit(1);
    if (!row) throw notFound('Source material not found');
    res.json(row);
  });

  r.post('/source-materials', A, auth.can('generation:run'), express.json({ limit: '1mb' }), async (req, res) => {
    const body = parse(sourceBody, req.body);
    const [row] = await db.insert(sourceMaterials).values({ ...body, createdBy: req.admin!.id }).returning();
    await audit(db, req.admin!.id, 'source.created', 'source_material', row!.id, { kind: body.kind, name: body.name });
    res.status(201).json(row);
  });

  r.put('/source-materials/:id', A, auth.can('generation:run'), express.json({ limit: '1mb' }), async (req, res) => {
    const body = parse(sourceBody.partial(), req.body);
    // Any content change needs a fresh approval before the AI may use it.
    const [row] = await db
      .update(sourceMaterials)
      .set({ ...body, approved: false, updatedAt: new Date() })
      .where(eq(sourceMaterials.id, idParam(req)))
      .returning();
    if (!row) throw notFound('Source material not found');
    await audit(db, req.admin!.id, 'source.updated', 'source_material', row.id);
    res.json(row);
  });

  r.post('/source-materials/:id/approve', A, auth.can('questions:publish'), async (req, res) => {
    const [row] = await db
      .update(sourceMaterials)
      .set({ approved: true, updatedAt: new Date() })
      .where(eq(sourceMaterials.id, idParam(req)))
      .returning({ id: sourceMaterials.id });
    if (!row) throw notFound('Source material not found');
    await audit(db, req.admin!.id, 'source.approved', 'source_material', row.id);
    res.json({ id: row.id, approved: true });
  });

  r.delete('/source-materials/:id', A, auth.can('generation:run'), async (req, res) => {
    const rows = await db.delete(sourceMaterials).where(eq(sourceMaterials.id, idParam(req))).returning({ id: sourceMaterials.id });
    if (!rows[0]) throw notFound('Source material not found');
    await audit(db, req.admin!.id, 'source.deleted', 'source_material', rows[0].id);
    res.json({ id: rows[0].id, deleted: true });
  });

  // --- Import ---------------------------------------------------------------
  r.post('/imports', A, auth.can('questions:write'), limits.imports, express.json({ limit: '5mb' }), async (req, res) => {
    const body = parse(
      z.object({ format: z.enum(['csv', 'json']), content: z.string().min(1).max(5_000_000), dryRun: z.boolean().default(false) }),
      req.body
    );
    res.json(await importQuestions(db, body.format, body.content, req.admin!.id, { dryRun: body.dryRun }));
  });

  return r;
}
