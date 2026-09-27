import { and, eq, inArray, isNotNull, sql, type SQL } from 'drizzle-orm';
import type { Db } from '../database/client.js';
import { devices, notifications, users, type NotificationTarget } from '../database/schema.js';
import type { PushSender } from '../lib/push.js';

function targetCondition(target: NotificationTarget): SQL | undefined {
  switch (target.type) {
    case 'all':
      return undefined;
    case 'signed_in':
      return isNotNull(devices.userId);
    case 'platform':
      return eq(devices.platform, target.platform);
    case 'users':
      return inArray(devices.userId, target.userIds);
  }
}

export async function resolveRecipients(db: Db, target: NotificationTarget) {
  const conds = [eq(devices.pushEnabled, true), isNotNull(devices.pushToken)];
  const extra = targetCondition(target);
  if (extra) conds.push(extra);
  // Never push to devices whose signed-in account has been deactivated.
  return db
    .select({ id: devices.id, pushToken: devices.pushToken })
    .from(devices)
    .leftJoin(users, eq(users.id, devices.userId))
    .where(and(...conds, sql`(${users.id} is null or ${users.status} = 'active')`));
}

export async function countRecipients(db: Db, target: NotificationTarget): Promise<number> {
  return (await resolveRecipients(db, target)).length;
}

// Sends in the background: the admin request returns immediately with status
// "sending" and the console polls until it becomes "sent"/"failed".
export async function deliverNotification(db: Db, push: PushSender, notificationId: string): Promise<void> {
  const [n] = await db.select().from(notifications).where(eq(notifications.id, notificationId));
  if (!n) return;
  try {
    const recipients = await resolveRecipients(db, n.target);
    await db.update(notifications).set({ recipientCount: recipients.length }).where(eq(notifications.id, n.id));

    const tickets = await push.send(
      recipients.map((r) => ({ to: r.pushToken!, title: n.title, body: n.body, data: n.data ?? undefined }))
    );
    const dead = tickets.filter((t) => t.deviceNotRegistered).map((t) => t.token);
    if (dead.length) {
      await db
        .update(devices)
        .set({ pushToken: null, pushEnabled: false })
        .where(inArray(devices.pushToken, dead));
    }
    const success = tickets.filter((t) => t.ok).length;
    const failure = tickets.length - success;
    const firstError = tickets.find((t) => !t.ok)?.error ?? null;
    await db
      .update(notifications)
      .set({
        status: recipients.length > 0 && success === 0 ? 'failed' : 'sent',
        successCount: success,
        failureCount: failure,
        error: firstError,
        sentAt: new Date(),
      })
      .where(eq(notifications.id, n.id));
  } catch (err) {
    await db
      .update(notifications)
      .set({ status: 'failed', error: err instanceof Error ? err.message.slice(0, 500) : 'Unknown error' })
      .where(eq(notifications.id, n.id));
  }
}
