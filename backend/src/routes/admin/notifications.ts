import { Router } from 'express';
import { z } from 'zod';
import { count, desc, eq } from 'drizzle-orm';
import { admins, notifications } from '../../database/schema.js';
import type { Auth } from '../../middleware/auth.js';
import { parse } from '../../middleware/validate.js';
import { conflict, notFound } from '../../lib/httpError.js';
import { audit } from '../../lib/audit.js';
import { countRecipients, deliverNotification } from '../../services/notificationService.js';
import type { AppDeps } from '../../types.js';

const target = z.discriminatedUnion('type', [
  z.object({ type: z.literal('all') }),
  z.object({ type: z.literal('signed_in') }),
  z.object({ type: z.literal('platform'), platform: z.enum(['ios', 'android']) }),
  z.object({ type: z.literal('users'), userIds: z.array(z.string().uuid()).min(1).max(1000) }),
]);

// Keeps background sends observable in tests (and lets shutdown wait for them).
export const pendingDeliveries = new Set<Promise<void>>();

export function adminNotificationsRouter({ db, push }: AppDeps, auth: Auth) {
  const r = Router();

  function startDelivery(id: string) {
    const p = deliverNotification(db, push, id).finally(() => pendingDeliveries.delete(p));
    pendingDeliveries.add(p);
  }

  r.get('/', auth.requirePermission('notifications:read'), async (req, res) => {
    const q = parse(
      z.object({ page: z.coerce.number().int().min(1).default(1), pageSize: z.coerce.number().int().min(1).max(100).default(20) }),
      req.query
    );
    const [total] = await db.select({ n: count() }).from(notifications);
    const items = await db
      .select({
        id: notifications.id,
        title: notifications.title,
        body: notifications.body,
        target: notifications.target,
        status: notifications.status,
        recipientCount: notifications.recipientCount,
        successCount: notifications.successCount,
        failureCount: notifications.failureCount,
        error: notifications.error,
        createdAt: notifications.createdAt,
        sentAt: notifications.sentAt,
        createdByName: admins.name,
      })
      .from(notifications)
      .leftJoin(admins, eq(admins.id, notifications.createdBy))
      .orderBy(desc(notifications.createdAt))
      .limit(q.pageSize)
      .offset((q.page - 1) * q.pageSize);
    res.json({ items, total: total?.n ?? 0, page: q.page, pageSize: q.pageSize });
  });

  r.post('/preview', auth.requirePermission('notifications:send'), async (req, res) => {
    const body = parse(z.object({ target }), req.body);
    res.json({ recipients: await countRecipients(db, body.target) });
  });

  r.get('/:id', auth.requirePermission('notifications:read'), async (req, res) => {
    const [row] = await db.select().from(notifications).where(eq(notifications.id, parse(z.string().uuid(), req.params.id)));
    if (!row) throw notFound('Notification not found');
    res.json(row);
  });

  r.post('/', auth.requirePermission('notifications:send'), async (req, res) => {
    const body = parse(
      z.object({
        title: z.string().trim().min(1).max(65),
        body: z.string().trim().min(1).max(240),
        target,
        sendNow: z.boolean().default(true),
      }),
      req.body
    );
    const [row] = await db
      .insert(notifications)
      .values({
        title: body.title,
        body: body.body,
        target: body.target,
        status: body.sendNow ? 'sending' : 'draft',
        createdBy: req.admin!.id,
      })
      .returning();
    await audit(db, req.admin!.id, body.sendNow ? 'notification.sent' : 'notification.drafted', 'notification', row!.id, {
      title: body.title,
      target: body.target,
    });
    if (body.sendNow) startDelivery(row!.id);
    res.status(body.sendNow ? 202 : 201).json(row);
  });

  r.post('/:id/send', auth.requirePermission('notifications:send'), async (req, res) => {
    const id = parse(z.string().uuid(), req.params.id);
    const [row] = await db.select().from(notifications).where(eq(notifications.id, id));
    if (!row) throw notFound('Notification not found');
    if (row.status !== 'draft') throw conflict('Only drafts can be sent');
    await db.update(notifications).set({ status: 'sending' }).where(eq(notifications.id, id));
    await audit(db, req.admin!.id, 'notification.sent', 'notification', id, { title: row.title });
    startDelivery(id);
    res.status(202).json({ ...row, status: 'sending' });
  });

  r.delete('/:id', auth.requirePermission('notifications:send'), async (req, res) => {
    const id = parse(z.string().uuid(), req.params.id);
    const [row] = await db.select().from(notifications).where(eq(notifications.id, id));
    if (!row) throw notFound('Notification not found');
    if (row.status !== 'draft') throw conflict('Sent notifications are kept for history');
    await db.delete(notifications).where(eq(notifications.id, id));
    res.status(204).end();
  });

  return r;
}
