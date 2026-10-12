// Friends, presence, notifications and verified focus time: the pieces the
// social routes and the real-time hub share.
import { and, count, desc, eq, gt, inArray, isNull, or, sql } from 'drizzle-orm';
import type { Db } from '../database/client.js';
import { blocks, devices, focusSessions, friendships, userNotifications, users } from '../database/schema.js';
import type { PushSender } from '../lib/push.js';
import type { PresenceState, RealtimeHub } from '../realtime/hub.js';

export type Profile = { id: string; username: string | null; displayName: string | null; avatarId: string | null };
export const profileColumns = { id: users.id, username: users.username, displayName: users.displayName, avatarId: users.avatarId };

// A running session counts as "focusing now" while it keeps sending heartbeats.
export const FOCUS_HEARTBEAT_STALE_MS = 2 * 60_000;

/** Ids of everyone this person is friends with (accepted either way). */
export async function friendIdsOf(db: Db, userId: string): Promise<string[]> {
  const rows = await db
    .select({ a: friendships.requesterId, b: friendships.addresseeId })
    .from(friendships)
    .where(and(eq(friendships.status, 'accepted'), or(eq(friendships.requesterId, userId), eq(friendships.addresseeId, userId))));
  return rows.map((r) => (r.a === userId ? r.b : r.a));
}

export async function areFriends(db: Db, a: string, b: string): Promise<boolean> {
  const [row] = await db
    .select({ id: friendships.id })
    .from(friendships)
    .where(
      and(
        eq(friendships.status, 'accepted'),
        or(and(eq(friendships.requesterId, a), eq(friendships.addresseeId, b)), and(eq(friendships.requesterId, b), eq(friendships.addresseeId, a)))
      )
    )
    .limit(1);
  return !!row;
}

/** True when either person has blocked the other. */
export async function blockedEitherWay(db: Db, a: string, b: string): Promise<boolean> {
  const [row] = await db
    .select({ blockerId: blocks.blockerId })
    .from(blocks)
    .where(or(and(eq(blocks.blockerId, a), eq(blocks.blockedId, b)), and(eq(blocks.blockerId, b), eq(blocks.blockedId, a))))
    .limit(1);
  return !!row;
}

/** Who is focusing (a running session with a fresh heartbeat), among these people. */
export async function focusingAmong(db: Db, userIds: string[]): Promise<Map<string, { groupSessionId: string | null }>> {
  const out = new Map<string, { groupSessionId: string | null }>();
  if (userIds.length === 0) return out;
  const rows = await db
    .select({ userId: focusSessions.userId, groupSessionId: focusSessions.groupSessionId })
    .from(focusSessions)
    .where(and(inArray(focusSessions.userId, userIds), eq(focusSessions.outcome, 'running'), gt(focusSessions.lastHeartbeatAt, new Date(Date.now() - FOCUS_HEARTBEAT_STALE_MS))));
  for (const r of rows) out.set(r.userId, { groupSessionId: r.groupSessionId });
  return out;
}

export async function presenceOf(db: Db, hub: RealtimeHub, userId: string): Promise<PresenceState> {
  const [user] = await db.select({ lastSeenAt: users.lastSeenAt }).from(users).where(eq(users.id, userId));
  const focusing = await focusingAmong(db, [userId]);
  const f = focusing.get(userId);
  return { online: hub.isOnline(userId), focusing: !!f, inGroup: !!f?.groupSessionId, lastSeenAt: user?.lastSeenAt?.toISOString() ?? null };
}

/** Tell a person's friends that their presence changed. */
export async function broadcastPresence(db: Db, hub: RealtimeHub, userId: string) {
  const state = await presenceOf(db, hub, userId);
  for (const friendId of await friendIdsOf(db, userId)) hub.send(friendId, { type: 'presence', userId, state });
}

/** Monday 00:00 UTC of the current week: the period "more focus than you" is judged on. */
export function weekStart(now = new Date()): Date {
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const day = (d.getUTCDay() + 6) % 7; // Monday = 0
  d.setUTCDate(d.getUTCDate() - day);
  return d;
}

/** Verified minutes this week, per person. */
export async function weekMinutesOf(db: Db, userIds: string[]): Promise<Map<string, number>> {
  const out = new Map<string, number>();
  if (userIds.length === 0) return out;
  const rows = await db
    .select({ userId: focusSessions.userId, minutes: sql<number>`coalesce(sum(${focusSessions.verifiedMinutes}), 0)::int` })
    .from(focusSessions)
    .where(and(inArray(focusSessions.userId, userIds), eq(focusSessions.outcome, 'completed'), gt(focusSessions.startedAt, weekStart())))
    .groupBy(focusSessions.userId);
  for (const r of rows) out.set(r.userId, Number(r.minutes));
  return out;
}

export async function unreadCount(db: Db, userId: string): Promise<number> {
  const [row] = await db
    .select({ n: count() })
    .from(userNotifications)
    .where(and(eq(userNotifications.userId, userId), isNull(userNotifications.readAt)));
  return row?.n ?? 0;
}

export function notificationView(n: typeof userNotifications.$inferSelect) {
  return { id: n.id, type: n.type, title: n.title, body: n.body, data: n.data ?? null, readAt: n.readAt?.toISOString() ?? null, createdAt: n.createdAt.toISOString() };
}

export interface Notify {
  type: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

/**
 * Store a notification for a person, show it live if they are connected, and
 * push it to their phones when they are not. Push failures never fail the
 * caller: the notification centre is the record.
 */
export async function notify(db: Db, hub: RealtimeHub, push: PushSender, userId: string, n: Notify): Promise<string> {
  const [row] = await db.insert(userNotifications).values({ userId, type: n.type, title: n.title, body: n.body, data: n.data ?? null }).returning();
  const unread = await unreadCount(db, userId);
  const live = hub.send(userId, { type: 'notification', notification: notificationView(row!), unread });
  if (!live) await pushToUser(db, push, userId, { title: n.title, body: n.body, data: { ...(n.data ?? {}), type: n.type, notificationId: row!.id } });
  return row!.id;
}

export async function pushToUser(db: Db, push: PushSender, userId: string, msg: { title: string; body: string; data?: Record<string, unknown> }) {
  try {
    const targets = await db
      .select({ token: devices.pushToken })
      .from(devices)
      .where(and(eq(devices.userId, userId), eq(devices.pushEnabled, true)));
    const tokens = targets.map((t) => t.token).filter((t): t is string => !!t);
    if (tokens.length === 0) return;
    const tickets = await push.send(tokens.map((to) => ({ to, title: msg.title, body: msg.body, data: msg.data })));
    const dead = tickets.filter((t) => t.deviceNotRegistered).map((t) => t.token);
    if (dead.length > 0) await db.update(devices).set({ pushToken: null, pushEnabled: false }).where(inArray(devices.pushToken, dead));
  } catch (err) {
    console.error('[push] delivery failed:', err instanceof Error ? err.message : err);
  }
}

/** The latest notifications, newest first, with a cursor on createdAt. */
export async function listNotifications(db: Db, userId: string, limit: number, before?: Date) {
  const rows = await db
    .select()
    .from(userNotifications)
    .where(and(eq(userNotifications.userId, userId), ...(before ? [sql`${userNotifications.createdAt} < ${before}`] : [])))
    .orderBy(desc(userNotifications.createdAt))
    .limit(limit + 1);
  const items = rows.slice(0, limit).map(notificationView);
  return { items, nextCursor: rows.length > limit ? items[items.length - 1]!.createdAt : null };
}
