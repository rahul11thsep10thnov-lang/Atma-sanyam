// Friends, search, pokes, the notification centre and focus-session
// reporting. Everything here needs a signed-in person. Numbers are never
// returned: search by number only tells you whether a person is there.
import { Router } from 'express';
import { z } from 'zod';
import { and, desc, eq, gt, ilike, inArray, isNull, or, sql } from 'drizzle-orm';
import { blocks, focusSessions, friendships, pokes, userNotifications, users } from '../../database/schema.js';
import type { Auth } from '../../middleware/auth.js';
import type { createRateLimits } from '../../middleware/rateLimits.js';
import { parse } from '../../middleware/validate.js';
import { badRequest, conflict, forbidden, HttpError, notFound } from '../../lib/httpError.js';
import { normalizePhone } from '../../lib/phone.js';
import { escapeLike } from '../../lib/strings.js';
import { normalizeUsername } from '../../lib/username.js';
import {
  areFriends,
  blockedEitherWay,
  broadcastPresence,
  FOCUS_HEARTBEAT_STALE_MS,
  focusingAmong,
  friendIdsOf,
  listNotifications,
  notify,
  profileColumns,
  pushToUser,
  unreadCount,
  weekMinutesOf,
  type Profile,
} from '../../services/socialService.js';
import type { AppDeps } from '../../types.js';

const uuid = z.string().uuid();
const POKE_COOLDOWN_MS = 2 * 60_000;
const MAX_FRIENDS = 500;
// A completed session is believed only if the server saw it run for its planned
// length (a few seconds of clock drift allowed).
const COMPLETION_TOLERANCE_MS = 5_000;

type Relation = 'none' | 'friends' | 'requested' | 'incoming' | 'blocked';

export function socialRouter(deps: AppDeps, auth: Auth, limits: ReturnType<typeof createRateLimits>) {
  const { db, env, push, realtime } = deps;
  const r = Router();
  // Only these paths: a bare `use` would guard everything mounted after this router too.
  r.use(['/people', '/friends', '/pokes', '/notifications', '/focus'], auth.requireUser);

  const nameOf = (p: Profile) => (p.username ? `@${p.username}` : p.displayName || 'A friend');

  async function profile(userId: string): Promise<Profile> {
    const [p] = await db.select(profileColumns).from(users).where(and(eq(users.id, userId), eq(users.status, 'active')));
    if (!p) throw notFound('Person not found');
    return p;
  }

  async function relationsOf(me: string, others: string[]): Promise<Map<string, { relation: Relation; requestId: string | null }>> {
    const out = new Map<string, { relation: Relation; requestId: string | null }>();
    if (others.length === 0) return out;
    for (const id of others) out.set(id, { relation: 'none', requestId: null });
    const rows = await db
      .select()
      .from(friendships)
      .where(
        or(
          and(eq(friendships.requesterId, me), inArray(friendships.addresseeId, others)),
          and(eq(friendships.addresseeId, me), inArray(friendships.requesterId, others))
        )
      );
    for (const f of rows) {
      const other = f.requesterId === me ? f.addresseeId : f.requesterId;
      if (f.status === 'accepted') out.set(other, { relation: 'friends', requestId: f.id });
      else if (f.status === 'pending') out.set(other, { relation: f.requesterId === me ? 'requested' : 'incoming', requestId: f.id });
    }
    const blockedRows = await db.select({ blockedId: blocks.blockedId }).from(blocks).where(and(eq(blocks.blockerId, me), inArray(blocks.blockedId, others)));
    for (const b of blockedRows) out.set(b.blockedId, { relation: 'blocked', requestId: null });
    return out;
  }

  // ---- people search ------------------------------------------------------
  r.get('/people/search', limits.search, async (req, res) => {
    const q = parse(z.object({ q: z.string().trim().min(2).max(40) }), req.query);
    const me = req.user!.id;
    const phone = normalizePhone(q.q, env.DEFAULT_COUNTRY_CODE);
    const looksLikeNumber = /^[+\d][\d\s().-]{5,}$/.test(q.q);
    let rows: Profile[] = [];
    if (phone && looksLikeNumber) {
      rows = await db
        .select(profileColumns)
        .from(users)
        .where(and(eq(users.phone, phone), eq(users.discoverableByPhone, true), eq(users.status, 'active')))
        .limit(1);
    } else {
      const needle = `%${escapeLike(normalizeUsername(q.q).replace(/^@/, ''))}%`;
      rows = await db
        .select(profileColumns)
        .from(users)
        .where(and(ilike(users.usernameNormalized, needle), eq(users.status, 'active')))
        .orderBy(users.usernameNormalized)
        .limit(20);
    }
    rows = rows.filter((p) => p.id !== me);
    // People who blocked me, or whom I blocked, are not found.
    const hidden = new Set(
      (
        await db
          .select({ a: blocks.blockerId, b: blocks.blockedId })
          .from(blocks)
          .where(or(eq(blocks.blockerId, me), eq(blocks.blockedId, me)))
      ).map((b) => (b.a === me ? b.b : b.a))
    );
    rows = rows.filter((p) => !hidden.has(p.id));
    const rel = await relationsOf(me, rows.map((p) => p.id));
    res.json({ items: rows.map((p) => ({ ...p, ...rel.get(p.id)! })) });
  });

  // ---- friends ------------------------------------------------------------
  r.get('/friends', async (req, res) => {
    const me = req.user!.id;
    const friendIds = await friendIdsOf(db, me);
    const [profiles, focusing, minutes] = await Promise.all([
      friendIds.length ? db.select({ ...profileColumns, lastSeenAt: users.lastSeenAt }).from(users).where(and(inArray(users.id, friendIds), eq(users.status, 'active'))) : Promise.resolve([]),
      focusingAmong(db, friendIds),
      weekMinutesOf(db, [me, ...friendIds]),
    ]);
    const mine = minutes.get(me) ?? 0;
    const friends = profiles
      .map((p) => {
        const f = focusing.get(p.id);
        return {
          id: p.id,
          username: p.username,
          displayName: p.displayName,
          avatarId: p.avatarId,
          presence: { online: realtime.isOnline(p.id), focusing: !!f, inGroup: !!f?.groupSessionId, lastSeenAt: p.lastSeenAt?.toISOString() ?? null },
          weekMinutes: minutes.get(p.id) ?? 0,
          leadsMe: (minutes.get(p.id) ?? 0) > mine,
        };
      })
      .sort((a, b) => Number(b.presence.focusing) - Number(a.presence.focusing) || Number(b.presence.online) - Number(a.presence.online) || (a.username ?? '').localeCompare(b.username ?? ''));
    const pending = await db
      .select({ id: friendships.id, requesterId: friendships.requesterId, addresseeId: friendships.addresseeId, createdAt: friendships.createdAt })
      .from(friendships)
      .where(and(eq(friendships.status, 'pending'), or(eq(friendships.requesterId, me), eq(friendships.addresseeId, me))))
      .orderBy(desc(friendships.createdAt));
    const otherIds = pending.map((p) => (p.requesterId === me ? p.addresseeId : p.requesterId));
    const others = otherIds.length ? await db.select(profileColumns).from(users).where(inArray(users.id, otherIds)) : [];
    const byId = new Map(others.map((o) => [o.id, o]));
    const incoming = pending.filter((p) => p.addresseeId === me && byId.has(p.requesterId)).map((p) => ({ requestId: p.id, createdAt: p.createdAt.toISOString(), ...byId.get(p.requesterId)! }));
    const sent = pending.filter((p) => p.requesterId === me && byId.has(p.addresseeId)).map((p) => ({ requestId: p.id, createdAt: p.createdAt.toISOString(), ...byId.get(p.addresseeId)! }));
    res.json({ friends, incoming, sent, myWeekMinutes: mine, focusingCount: friends.filter((f) => f.presence.focusing).length });
  });

  r.post('/friends/requests', limits.friendRequest, async (req, res) => {
    const me = req.user!.id;
    const { userId } = parse(z.object({ userId: uuid }), req.body);
    if (userId === me) throw badRequest('You cannot add yourself');
    const target = await profile(userId);
    if (await blockedEitherWay(db, me, userId)) throw forbidden('You cannot send a request to this person');
    const [existing] = await db
      .select()
      .from(friendships)
      .where(or(and(eq(friendships.requesterId, me), eq(friendships.addresseeId, userId)), and(eq(friendships.requesterId, userId), eq(friendships.addresseeId, me))));
    const myCount = (await friendIdsOf(db, me)).length;
    if (myCount >= MAX_FRIENDS) throw conflict(`You can have at most ${MAX_FRIENDS} friends`);
    const meProfile = await profile(me);
    if (existing) {
      if (existing.status === 'accepted') throw conflict('You are already friends');
      if (existing.status === 'pending') {
        if (existing.requesterId === me) throw conflict('Request already sent');
        // They asked first: accepting is the natural answer.
        await db.update(friendships).set({ status: 'accepted', respondedAt: new Date() }).where(eq(friendships.id, existing.id));
        await notify(db, realtime, push, userId, { type: 'friend_accepted', title: 'Friend request accepted', body: `${nameOf(meProfile)} is now your friend.`, data: { userId: me } });
        realtime.send(me, { type: 'friends_changed' });
        await Promise.all([broadcastPresence(db, realtime, me), broadcastPresence(db, realtime, userId)]);
        res.status(200).json({ requestId: existing.id, status: 'accepted' });
        return;
      }
      // declined before: ask again
      await db.update(friendships).set({ requesterId: me, addresseeId: userId, status: 'pending', createdAt: new Date(), respondedAt: null }).where(eq(friendships.id, existing.id));
      await notify(db, realtime, push, userId, { type: 'friend_request', title: 'Friend request', body: `${nameOf(meProfile)} wants to be your friend.`, data: { requestId: existing.id, userId: me } });
      res.status(201).json({ requestId: existing.id, status: 'pending' });
      return;
    }
    const [row] = await db.insert(friendships).values({ requesterId: me, addresseeId: userId }).returning();
    await notify(db, realtime, push, target.id, { type: 'friend_request', title: 'Friend request', body: `${nameOf(meProfile)} wants to be your friend.`, data: { requestId: row!.id, userId: me } });
    res.status(201).json({ requestId: row!.id, status: 'pending' });
  });

  r.post('/friends/requests/:id/accept', async (req, res) => {
    const me = req.user!.id;
    const id = parse(uuid, req.params.id);
    const [row] = await db.select().from(friendships).where(and(eq(friendships.id, id), eq(friendships.addresseeId, me), eq(friendships.status, 'pending')));
    if (!row) throw notFound('Request not found');
    await db.update(friendships).set({ status: 'accepted', respondedAt: new Date() }).where(eq(friendships.id, id));
    const meProfile = await profile(me);
    await notify(db, realtime, push, row.requesterId, { type: 'friend_accepted', title: 'Friend request accepted', body: `${nameOf(meProfile)} is now your friend.`, data: { userId: me } });
    realtime.send(me, { type: 'friends_changed' });
    await Promise.all([broadcastPresence(db, realtime, me), broadcastPresence(db, realtime, row.requesterId)]);
    res.json({ requestId: id, status: 'accepted' });
  });

  r.post('/friends/requests/:id/decline', async (req, res) => {
    const me = req.user!.id;
    const id = parse(uuid, req.params.id);
    const [row] = await db
      .update(friendships)
      .set({ status: 'declined', respondedAt: new Date() })
      .where(and(eq(friendships.id, id), eq(friendships.addresseeId, me), eq(friendships.status, 'pending')))
      .returning();
    if (!row) throw notFound('Request not found');
    // The requester is not told: declining is quiet.
    res.json({ requestId: id, status: 'declined' });
  });

  r.delete('/friends/requests/:id', async (req, res) => {
    const me = req.user!.id;
    const id = parse(uuid, req.params.id);
    const [row] = await db.delete(friendships).where(and(eq(friendships.id, id), eq(friendships.requesterId, me), eq(friendships.status, 'pending'))).returning();
    if (!row) throw notFound('Request not found');
    realtime.send(row.addresseeId, { type: 'friends_changed' });
    res.status(204).end();
  });

  r.delete('/friends/:userId', async (req, res) => {
    const me = req.user!.id;
    const other = parse(uuid, req.params.userId);
    const rows = await db
      .delete(friendships)
      .where(and(eq(friendships.status, 'accepted'), or(and(eq(friendships.requesterId, me), eq(friendships.addresseeId, other)), and(eq(friendships.requesterId, other), eq(friendships.addresseeId, me)))))
      .returning();
    if (rows.length === 0) throw notFound('Not friends');
    realtime.send(other, { type: 'friends_changed' });
    res.status(204).end();
  });

  r.post('/people/:userId/block', async (req, res) => {
    const me = req.user!.id;
    const other = parse(uuid, req.params.userId);
    if (other === me) throw badRequest('You cannot block yourself');
    await profile(other);
    await db.insert(blocks).values({ blockerId: me, blockedId: other }).onConflictDoNothing();
    // Blocking ends the friendship and any open request, both ways.
    await db.delete(friendships).where(or(and(eq(friendships.requesterId, me), eq(friendships.addresseeId, other)), and(eq(friendships.requesterId, other), eq(friendships.addresseeId, me))));
    realtime.send(other, { type: 'friends_changed' });
    res.status(204).end();
  });

  r.delete('/people/:userId/block', async (req, res) => {
    const me = req.user!.id;
    const other = parse(uuid, req.params.userId);
    await db.delete(blocks).where(and(eq(blocks.blockerId, me), eq(blocks.blockedId, other)));
    res.status(204).end();
  });

  r.get('/people/blocked', async (req, res) => {
    const me = req.user!.id;
    const rows = await db.select(profileColumns).from(users).innerJoin(blocks, eq(blocks.blockedId, users.id)).where(eq(blocks.blockerId, me));
    res.json({ items: rows });
  });

  // ---- pokes --------------------------------------------------------------
  r.post('/pokes', limits.poke, async (req, res) => {
    const me = req.user!.id;
    const body = parse(z.object({ userId: uuid, key: z.string().regex(/^[A-Za-z0-9_-]{8,64}$/) }), req.body);
    if (body.userId === me) throw badRequest('You cannot poke yourself');
    if (!(await areFriends(db, me, body.userId))) throw forbidden('You can only poke friends');
    const [target] = await db.select({ ...profileColumns, allowPokes: users.allowPokes, status: users.status }).from(users).where(eq(users.id, body.userId));
    if (!target || target.status !== 'active') throw notFound('Person not found');
    if (!target.allowPokes) throw forbidden('This friend has turned pokes off');
    const [dup] = await db.select({ id: pokes.id, deliveredLive: pokes.deliveredLive }).from(pokes).where(and(eq(pokes.fromUserId, me), eq(pokes.idempotencyKey, body.key)));
    if (dup) {
      res.status(200).json({ pokeId: dup.id, delivered: dup.deliveredLive ? 'live' : 'notification', repeated: true });
      return;
    }
    const [last] = await db
      .select({ createdAt: pokes.createdAt })
      .from(pokes)
      .where(and(eq(pokes.fromUserId, me), eq(pokes.toUserId, body.userId)))
      .orderBy(desc(pokes.createdAt))
      .limit(1);
    if (last && Date.now() - last.createdAt.getTime() < POKE_COOLDOWN_MS) {
      throw new HttpError(429, 'You poked this friend a moment ago. Give it a minute.', 'rate_limited');
    }
    const meProfile = await profile(me);
    const [row] = await db.insert(pokes).values({ fromUserId: me, toUserId: body.userId, idempotencyKey: body.key }).returning();
    const live = realtime.send(body.userId, { type: 'poke', from: meProfile, pokeId: row!.id });
    if (live) {
      await db.update(pokes).set({ deliveredLive: true }).where(eq(pokes.id, row!.id));
    } else {
      await notify(db, realtime, push, body.userId, { type: 'poke', title: 'Poke!', body: `${nameOf(meProfile)} poked you. Time to focus?`, data: { userId: me, pokeId: row!.id } });
    }
    res.status(201).json({ pokeId: row!.id, delivered: live ? 'live' : 'notification', repeated: false });
  });

  // ---- notification centre ---------------------------------------------------
  r.get('/notifications', async (req, res) => {
    const q = parse(z.object({ limit: z.coerce.number().int().min(1).max(50).default(30), before: z.string().datetime({ offset: true }).optional() }), req.query);
    const me = req.user!.id;
    const page = await listNotifications(db, me, q.limit, q.before ? new Date(q.before) : undefined);
    res.json({ ...page, unread: await unreadCount(db, me) });
  });

  r.post('/notifications/read', async (req, res) => {
    const me = req.user!.id;
    const body = parse(z.object({ ids: z.array(uuid).max(100).optional(), all: z.boolean().optional() }), req.body ?? {});
    if (!body.all && !body.ids?.length) throw badRequest('Say which notifications to mark read');
    await db
      .update(userNotifications)
      .set({ readAt: new Date() })
      .where(and(eq(userNotifications.userId, me), isNull(userNotifications.readAt), ...(body.all ? [] : [inArray(userNotifications.id, body.ids!)])));
    res.json({ unread: await unreadCount(db, me) });
  });

  // ---- focus sessions (verified time, presence) ----------------------------
  r.post('/focus/sessions', async (req, res) => {
    const me = req.user!.id;
    const body = parse(z.object({ clientSessionId: z.string().min(6).max(64), plannedMinutes: z.number().int().min(1).max(600), kind: z.enum(['solo']).default('solo') }), req.body);
    const [existing] = await db.select().from(focusSessions).where(and(eq(focusSessions.userId, me), eq(focusSessions.clientSessionId, body.clientSessionId)));
    if (existing) {
      res.status(200).json({ sessionId: existing.id, startedAt: existing.startedAt.toISOString(), outcome: existing.outcome });
      return;
    }
    // A person runs one session at a time: anything still "running" is over.
    await db.update(focusSessions).set({ outcome: 'failed', endedAt: new Date() }).where(and(eq(focusSessions.userId, me), eq(focusSessions.outcome, 'running')));
    const [row] = await db.insert(focusSessions).values({ userId: me, clientSessionId: body.clientSessionId, plannedMinutes: body.plannedMinutes, kind: body.kind }).returning();
    await broadcastPresence(db, realtime, me);
    res.status(201).json({ sessionId: row!.id, startedAt: row!.startedAt.toISOString(), outcome: row!.outcome });
  });

  r.post('/focus/sessions/:id/heartbeat', async (req, res) => {
    const me = req.user!.id;
    const id = parse(uuid, req.params.id);
    const [row] = await db
      .update(focusSessions)
      .set({ lastHeartbeatAt: new Date() })
      .where(and(eq(focusSessions.id, id), eq(focusSessions.userId, me), eq(focusSessions.outcome, 'running')))
      .returning({ id: focusSessions.id });
    if (!row) throw notFound('No running session');
    res.status(204).end();
  });

  r.post('/focus/sessions/:id/finish', async (req, res) => {
    const me = req.user!.id;
    const id = parse(uuid, req.params.id);
    const body = parse(z.object({ outcome: z.enum(['completed', 'failed']) }), req.body);
    const [row] = await db.select().from(focusSessions).where(and(eq(focusSessions.id, id), eq(focusSessions.userId, me)));
    if (!row) throw notFound('Session not found');
    if (row.outcome !== 'running') {
      res.json({ sessionId: id, outcome: row.outcome, verifiedMinutes: row.verifiedMinutes });
      return;
    }
    const now = new Date();
    const ranMs = now.getTime() - row.startedAt.getTime();
    const staleHeartbeat = now.getTime() - row.lastHeartbeatAt.getTime() > FOCUS_HEARTBEAT_STALE_MS * 3;
    let outcome: 'completed' | 'failed' = body.outcome;
    let verified = 0;
    if (outcome === 'completed') {
      // Believed only if the server saw it run the planned length, with heartbeats.
      if (ranMs + COMPLETION_TOLERANCE_MS < row.plannedMinutes * 60_000 || staleHeartbeat) outcome = 'failed';
      else verified = row.plannedMinutes;
    }
    await db.update(focusSessions).set({ outcome, endedAt: now, verifiedMinutes: verified }).where(eq(focusSessions.id, id));
    await broadcastPresence(db, realtime, me);
    res.json({ sessionId: id, outcome, verifiedMinutes: verified, rejected: body.outcome === 'completed' && outcome === 'failed' });
  });

  r.get('/focus/stats', async (req, res) => {
    const me = req.user!.id;
    const minutes = await weekMinutesOf(db, [me]);
    const [total] = await db
      .select({ minutes: sql<number>`coalesce(sum(${focusSessions.verifiedMinutes}), 0)::int`, sessions: sql<number>`count(*)::int` })
      .from(focusSessions)
      .where(and(eq(focusSessions.userId, me), eq(focusSessions.outcome, 'completed')));
    res.json({ weekMinutes: minutes.get(me) ?? 0, totalMinutes: Number(total?.minutes ?? 0), completedSessions: Number(total?.sessions ?? 0) });
  });

  // Sessions whose app vanished without a word stop counting as "focusing".
  r.post('/focus/sessions/:id/abandon', async (req, res) => {
    const me = req.user!.id;
    const id = parse(uuid, req.params.id);
    await db.update(focusSessions).set({ outcome: 'failed', endedAt: new Date() }).where(and(eq(focusSessions.id, id), eq(focusSessions.userId, me), eq(focusSessions.outcome, 'running')));
    await broadcastPresence(db, realtime, me);
    res.status(204).end();
  });

  void pushToUser;
  void gt;
  return r;
}
