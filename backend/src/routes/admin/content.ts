import { Router } from 'express';
import { z } from 'zod';
import { asc, count, eq } from 'drizzle-orm';
import { categories, content } from '../../database/schema.js';
import type { Auth } from '../../middleware/auth.js';
import { parse } from '../../middleware/validate.js';
import { badRequest, conflict, forbidden, notFound } from '../../lib/httpError.js';
import { slugify } from '../../lib/strings.js';
import { audit } from '../../lib/audit.js';
import { listContentForAdmin, wouldCreateCycle } from '../../services/contentService.js';
import type { AppDeps } from '../../types.js';

const idParam = z.string().uuid();
const categoryIdParam = z.string().regex(/^[a-z0-9-]{1,80}$/);

export function adminContentRouter({ db, env }: AppDeps, auth: Auth) {
  const r = Router();

  // Mobile apps block cleartext HTTP, so production content must be HTTPS.
  const imageUrl = z
    .string()
    .trim()
    .url()
    .max(1000)
    .refine((u) => u.startsWith('https://') || (env.NODE_ENV !== 'production' && u.startsWith('http://')), 'Image URLs must use https://');

  const contentFields = z.object({
    title: z.string().trim().min(1).max(120),
    categoryId: categoryIdParam.nullable().optional(),
    subcategoryId: categoryIdParam.nullable().optional(),
    tags: z.array(z.string().trim().toLowerCase().min(1).max(30)).max(20).default([]),
    thumbnailUrl: imageUrl,
    mediumUrl: imageUrl,
    fullUrl: imageUrl,
    source: z.string().trim().min(1).max(300),
    creator: z.string().trim().min(1).max(200),
    license: z.string().trim().min(1).max(200),
    attributionRequired: z.boolean().default(false),
    attributionText: z.string().trim().max(300).nullable().optional(),
    status: z.enum(['draft', 'published']).optional(),
  });

  async function assertCategories(ids: (string | null | undefined)[]) {
    for (const id of ids) {
      if (!id) continue;
      const [row] = await db.select({ id: categories.id }).from(categories).where(eq(categories.id, id));
      if (!row) throw badRequest(`Category "${id}" does not exist`);
    }
  }

  function checkAttribution(required: boolean, text: string | null | undefined) {
    if (required && !text) throw badRequest('Attribution text is required when attribution is required');
  }

  // ---- content -----------------------------------------------------------
  r.get('/content', auth.requirePermission('content:read'), async (req, res) => {
    const q = parse(
      z.object({
        search: z.string().trim().max(100).optional(),
        categoryId: z.string().max(80).optional(),
        status: z.enum(['draft', 'published']).optional(),
        page: z.coerce.number().int().min(1).default(1),
        pageSize: z.coerce.number().int().min(1).max(100).default(20),
      }),
      req.query
    );
    res.json(await listContentForAdmin(db, q));
  });

  r.get('/content/:id', auth.requirePermission('content:read'), async (req, res) => {
    const [row] = await db.select().from(content).where(eq(content.id, parse(idParam, req.params.id)));
    if (!row) throw notFound('Content not found');
    res.json(row);
  });

  r.post('/content', auth.requirePermission('content:write'), async (req, res) => {
    const body = parse(contentFields, req.body);
    const status = body.status ?? 'draft';
    if (status === 'published' && !req.admin!.permissions.has('content:publish')) throw forbidden('You cannot publish content');
    checkAttribution(body.attributionRequired, body.attributionText);
    await assertCategories([body.categoryId, body.subcategoryId]);
    const [row] = await db
      .insert(content)
      .values({
        ...body,
        attributionText: body.attributionText ?? null,
        categoryId: body.categoryId ?? null,
        subcategoryId: body.subcategoryId ?? null,
        status,
        publishedAt: status === 'published' ? new Date() : null,
        createdBy: req.admin!.id,
        updatedBy: req.admin!.id,
      })
      .returning();
    await audit(db, req.admin!.id, 'content.created', 'content', row!.id, { title: row!.title, status });
    res.status(201).json(row);
  });

  r.patch('/content/:id', auth.requirePermission('content:write'), async (req, res) => {
    const id = parse(idParam, req.params.id);
    const body = parse(contentFields.partial(), req.body);
    const [existing] = await db.select().from(content).where(eq(content.id, id));
    if (!existing) throw notFound('Content not found');

    const statusChanging = body.status !== undefined && body.status !== existing.status;
    if (statusChanging && !req.admin!.permissions.has('content:publish')) {
      throw forbidden('You cannot publish or unpublish content');
    }
    checkAttribution(
      body.attributionRequired ?? existing.attributionRequired,
      body.attributionText !== undefined ? body.attributionText : existing.attributionText
    );
    await assertCategories([body.categoryId, body.subcategoryId]);

    const [row] = await db
      .update(content)
      .set({
        ...body,
        ...(statusChanging && body.status === 'published' ? { publishedAt: new Date() } : {}),
        updatedBy: req.admin!.id,
        updatedAt: new Date(),
      })
      .where(eq(content.id, id))
      .returning();
    await audit(
      db,
      req.admin!.id,
      statusChanging ? (body.status === 'published' ? 'content.published' : 'content.unpublished') : 'content.updated',
      'content',
      id,
      { title: row!.title }
    );
    res.json(row);
  });

  r.delete('/content/:id', auth.requirePermission('content:delete'), async (req, res) => {
    const id = parse(idParam, req.params.id);
    const [row] = await db.delete(content).where(eq(content.id, id)).returning();
    if (!row) throw notFound('Content not found');
    await audit(db, req.admin!.id, 'content.deleted', 'content', id, { title: row.title });
    res.status(204).end();
  });

  // ---- categories --------------------------------------------------------
  r.get('/categories', auth.requirePermission('content:read'), async (_req, res) => {
    const rows = await db.select().from(categories).orderBy(asc(categories.sortOrder), asc(categories.name));
    const counts = await db
      .select({ id: content.categoryId, n: count() })
      .from(content)
      .groupBy(content.categoryId);
    const subCounts = await db
      .select({ id: content.subcategoryId, n: count() })
      .from(content)
      .groupBy(content.subcategoryId);
    const usage = new Map<string, number>();
    for (const c of [...counts, ...subCounts]) if (c.id) usage.set(c.id, (usage.get(c.id) ?? 0) + c.n);
    res.json(rows.map((c) => ({ ...c, contentCount: usage.get(c.id) ?? 0 })));
  });

  r.post('/categories', auth.requirePermission('content:write'), async (req, res) => {
    const body = parse(
      z.object({
        id: categoryIdParam.optional(),
        name: z.string().trim().min(1).max(60),
        parentId: categoryIdParam.nullable().optional(),
        sortOrder: z.number().int().min(0).max(10_000).default(0),
      }),
      req.body
    );
    if (body.parentId) await assertCategories([body.parentId]);
    const id = body.id ?? slugify(body.parentId ? `${body.parentId}-${body.name}` : body.name);
    if (!id) throw badRequest('Could not derive an id from that name; provide one explicitly');
    const [clash] = await db.select({ id: categories.id }).from(categories).where(eq(categories.id, id));
    if (clash) throw conflict(`A category with id "${id}" already exists`);
    const [row] = await db
      .insert(categories)
      .values({ id, name: body.name, parentId: body.parentId ?? null, sortOrder: body.sortOrder })
      .returning();
    await audit(db, req.admin!.id, 'category.created', 'category', id, { name: body.name });
    res.status(201).json(row);
  });

  r.patch('/categories/:id', auth.requirePermission('content:write'), async (req, res) => {
    const id = parse(categoryIdParam, req.params.id);
    const body = parse(
      z.object({
        name: z.string().trim().min(1).max(60).optional(),
        parentId: categoryIdParam.nullable().optional(),
        sortOrder: z.number().int().min(0).max(10_000).optional(),
      }),
      req.body
    );
    if (body.parentId) {
      await assertCategories([body.parentId]);
      if (body.parentId === id || (await wouldCreateCycle(db, id, body.parentId))) {
        throw badRequest('A category cannot be moved inside itself');
      }
    }
    const [row] = await db
      .update(categories)
      .set({ ...body, updatedAt: new Date() })
      .where(eq(categories.id, id))
      .returning();
    if (!row) throw notFound('Category not found');
    await audit(db, req.admin!.id, 'category.updated', 'category', id, body);
    res.json(row);
  });

  r.delete('/categories/:id', auth.requirePermission('content:delete'), async (req, res) => {
    const id = parse(categoryIdParam, req.params.id);
    const [child] = await db.select({ id: categories.id }).from(categories).where(eq(categories.parentId, id)).limit(1);
    if (child) throw conflict('Delete or move its sub-categories first');
    const [row] = await db.delete(categories).where(eq(categories.id, id)).returning();
    if (!row) throw notFound('Category not found');
    await audit(db, req.admin!.id, 'category.deleted', 'category', id, { name: row.name });
    res.status(204).end();
  });

  return r;
}
