// Reports people made about other users ("Report this person" in the app).
// Moderators read them here and mark them resolved or dismissed; acting on
// the reported account (deactivating it) happens on the Users page.
import { Router } from 'express';
import { z } from 'zod';
import { and, count, desc, eq, inArray, type SQL } from 'drizzle-orm';
import { admins, userReports, users } from '../../database/schema.js';
import type { Auth } from '../../middleware/auth.js';
import { parse } from '../../middleware/validate.js';
import { notFound } from '../../lib/httpError.js';
import { audit } from '../../lib/audit.js';
import type { AppDeps } from '../../types.js';

const listQuery = z.object({
  status: z.enum(['open', 'resolved', 'dismissed']).optional(),
  reportedId: z.string().uuid().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

const updateBody = z.object({
  status: z.enum(['open', 'resolved', 'dismissed']),
  resolutionNote: z.string().trim().max(1000).optional(),
});

const idParam = z.string().uuid();

export function adminReportsRouter({ db }: AppDeps, auth: Auth) {
  const r = Router();

  async function people(ids: (string | null)[]) {
    const wanted = [...new Set(ids.filter((x): x is string => Boolean(x)))];
    if (wanted.length === 0) return new Map<string, { id: string; username: string | null; displayName: string | null; status: string }>();
    const rows = await db
      .select({ id: users.id, username: users.username, displayName: users.displayName, status: users.status })
      .from(users)
      .where(inArray(users.id, wanted));
    return new Map(rows.map((u) => [u.id, u]));
  }

  async function view(rows: (typeof userReports.$inferSelect)[]) {
    const ppl = await people(rows.flatMap((r) => [r.reporterId, r.reportedId]));
    // How many open reports each reported person has: repeat reports matter.
    const reportedIds = [...new Set(rows.map((r) => r.reportedId))];
    const openCounts = reportedIds.length
      ? await db
          .select({ id: userReports.reportedId, n: count() })
          .from(userReports)
          .where(and(eq(userReports.status, 'open'), inArray(userReports.reportedId, reportedIds)))
          .groupBy(userReports.reportedId)
      : [];
    const open = new Map(openCounts.map((c) => [c.id, c.n]));
    const resolverIds = [...new Set(rows.map((r) => r.resolvedBy).filter((x): x is string => Boolean(x)))];
    const resolvers = resolverIds.length ? await db.select({ id: admins.id, name: admins.name }).from(admins).where(inArray(admins.id, resolverIds)) : [];
    const resolverName = new Map(resolvers.map((a) => [a.id, a.name]));
    return rows.map((r) => ({
      id: r.id,
      reason: r.reason,
      note: r.note,
      context: r.context,
      groupSessionId: r.groupSessionId,
      status: r.status,
      createdAt: r.createdAt,
      resolvedAt: r.resolvedAt,
      resolvedBy: r.resolvedBy ? (resolverName.get(r.resolvedBy) ?? null) : null,
      resolutionNote: r.resolutionNote,
      reporter: r.reporterId ? (ppl.get(r.reporterId) ?? null) : null,
      reported: ppl.get(r.reportedId) ?? { id: r.reportedId, username: null, displayName: null, status: 'unknown' },
      openReportsAboutReported: open.get(r.reportedId) ?? 0,
    }));
  }

  r.get('/', auth.requirePermission('reports:read'), async (req, res) => {
    const q = parse(listQuery, req.query);
    const conds: SQL[] = [];
    if (q.status) conds.push(eq(userReports.status, q.status));
    if (q.reportedId) conds.push(eq(userReports.reportedId, q.reportedId));
    const where = conds.length ? and(...conds) : undefined;
    const [total] = await db.select({ n: count() }).from(userReports).where(where);
    const rows = await db
      .select()
      .from(userReports)
      .where(where)
      .orderBy(desc(userReports.createdAt))
      .limit(q.pageSize)
      .offset((q.page - 1) * q.pageSize);
    res.json({ items: await view(rows), total: total?.n ?? 0, page: q.page, pageSize: q.pageSize });
  });

  r.patch('/:id', auth.requirePermission('reports:write'), async (req, res) => {
    const id = parse(idParam, req.params.id);
    const body = parse(updateBody, req.body);
    const closed = body.status !== 'open';
    const [row] = await db
      .update(userReports)
      .set({
        status: body.status,
        resolutionNote: body.resolutionNote || null,
        resolvedAt: closed ? new Date() : null,
        resolvedBy: closed ? req.admin!.id : null,
      })
      .where(eq(userReports.id, id))
      .returning();
    if (!row) throw notFound('Report not found');
    await audit(db, req.admin!.id, `report.${body.status}`, 'user_report', id, { reportedId: row.reportedId, reason: row.reason });
    const [out] = await view([row]);
    res.json(out);
  });

  return r;
}
