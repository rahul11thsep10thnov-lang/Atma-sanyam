// Group focus: a host proposes a plant or a picture and a length, invites
// friends, everyone approved presses Start, and the server starts one clock
// for all of them. Its timestamps decide everything: when the session
// started and ends, when each late joiner's own time began, what a
// completed participant is credited, and what an early exit costs.
import { Router } from 'express';
import { z } from 'zod';
import { and, desc, eq, inArray, ne, or, sql } from 'drizzle-orm';
import { focusSessions, groupMessages, groupParticipants, groupSessions, users } from '../../database/schema.js';
import type { Auth } from '../../middleware/auth.js';
import type { createRateLimits } from '../../middleware/rateLimits.js';
import { parse } from '../../middleware/validate.js';
import { badRequest, conflict, forbidden, notFound } from '../../lib/httpError.js';
import { isGroupMessageKey } from '../../lib/groupMessages.js';
import { areFriends, broadcastPresence, notify, profileColumns, type Profile } from '../../services/socialService.js';
import type { AppDeps } from '../../types.js';
import type { RealtimeEvent } from '../../realtime/hub.js';

const uuid = z.string().uuid();
const MAX_MEMBERS = 12;
// A participant without a heartbeat for this long shows as disconnected…
const DISCONNECT_AFTER_MS = 2 * 60_000;
// …and one who is still away when the session ends did not complete it.
const DISCONNECT_FORFEIT_MS = 5 * 60_000;
// Joining this close to the end earns nothing; the server refuses it.
const MIN_LATE_JOIN_MINUTES = 1;

const proposal = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('plant'), speciesId: z.string().min(1).max(40), place: z.enum(['garden', 'balcony']).optional() }),
  z.object({
    kind: z.literal('remote'),
    imageId: z.string().min(1).max(120),
    uri: z.string().min(1).max(600),
    title: z.string().max(120).optional(),
    category: z.string().max(80).optional(),
    thumbnailUri: z.string().max(600).optional(),
  }),
]);
const plannedMinutes = z.number().int().min(5).max(240);

type Session = typeof groupSessions.$inferSelect;
type Participant = typeof groupParticipants.$inferSelect;

export function groupRouter(deps: AppDeps, auth: Auth, limits: ReturnType<typeof createRateLimits>) {
  const { db, push, realtime } = deps;
  const r = Router();
  r.use('/group', auth.requireUser);

  const nameOf = (p: Profile) => (p.username ? `@${p.username}` : p.displayName || 'A friend');

  async function load(id: string): Promise<{ session: Session; participants: Participant[] }> {
    const [session] = await db.select().from(groupSessions).where(eq(groupSessions.id, id));
    if (!session) throw notFound('Group session not found');
    const participants = await db.select().from(groupParticipants).where(eq(groupParticipants.sessionId, id));
    return { session, participants };
  }

  async function view(session: Session, participants: Participant[], viewerId: string) {
    const ids = participants.map((p) => p.userId);
    const profiles = ids.length ? await db.select(profileColumns).from(users).where(inArray(users.id, ids)) : [];
    const byId = new Map(profiles.map((p) => [p.id, p]));
    const now = Date.now();
    return {
      id: session.id,
      hostId: session.hostId,
      status: session.status,
      proposal: session.proposal,
      plannedMinutes: session.plannedMinutes,
      revision: session.revision,
      createdAt: session.createdAt.toISOString(),
      startedAt: session.startedAt?.toISOString() ?? null,
      endsAt: session.endsAt?.toISOString() ?? null,
      endedAt: session.endedAt?.toISOString() ?? null,
      membersAtStart: session.membersAtStart,
      serverTime: new Date(now).toISOString(),
      me: participants.find((p) => p.userId === viewerId) ? participantView(participants.find((p) => p.userId === viewerId)!, byId, now) : null,
      participants: participants
        .map((p) => participantView(p, byId, now))
        .sort((a, b) => Number(b.isHost) - Number(a.isHost) || (a.username ?? '').localeCompare(b.username ?? '')),
    };
  }

  function participantView(p: Participant, byId: Map<string, Profile>, now: number) {
    const profile = byId.get(p.userId) ?? { id: p.userId, username: null, displayName: null, avatarId: null };
    // "active" with a stale heartbeat reads as disconnected without a write
    const stale = p.status === 'active' && p.lastHeartbeatAt && now - p.lastHeartbeatAt.getTime() > DISCONNECT_AFTER_MS;
    return {
      ...profile,
      status: stale ? ('disconnected' as const) : p.status,
      isHost: p.isHost,
      note: p.note,
      startedAt: p.startedAt?.toISOString() ?? null,
      leftAt: p.leftAt?.toISOString() ?? null,
      rewardMinutes: p.rewardMinutes,
      penaltyCount: p.penaltyCount,
    };
  }

  function emit(participants: Participant[], event: string, sessionId: string, data?: Record<string, unknown>, except?: string) {
    const e: RealtimeEvent = { type: 'group', event, sessionId, data };
    for (const p of participants) if (p.userId !== except) realtime.send(p.userId, e);
  }

  function memberOf(participants: Participant[], userId: string): Participant {
    const p = participants.find((x) => x.userId === userId);
    if (!p) throw forbidden('You are not part of this group session');
    return p;
  }

  /** Participants who count as "in" the session right now. */
  const inSession = (participants: Participant[]) => participants.filter((p) => p.status === 'active' || p.status === 'disconnected');

  // ---- creating and shaping the proposal --------------------------------------
  r.post('/group/sessions', limits.groupCreate, async (req, res) => {
    const me = req.user!.id;
    const body = parse(z.object({ proposal, plannedMinutes, inviteeIds: z.array(uuid).min(1).max(MAX_MEMBERS - 1) }), req.body);
    const invitees = [...new Set(body.inviteeIds)].filter((id) => id !== me);
    if (invitees.length === 0) throw badRequest('Invite at least one friend');
    for (const id of invitees) if (!(await areFriends(db, me, id))) throw forbidden('You can only invite friends');
    // One open session per host.
    const [open] = await db
      .select({ id: groupSessions.id })
      .from(groupSessions)
      .where(and(eq(groupSessions.hostId, me), inArray(groupSessions.status, ['lobby', 'running'])));
    if (open) throw conflict('You already have a group session open');
    const [session] = await db.insert(groupSessions).values({ hostId: me, proposal: body.proposal, plannedMinutes: body.plannedMinutes }).returning();
    await db.insert(groupParticipants).values([
      { sessionId: session!.id, userId: me, status: 'approved', isHost: true },
      ...invitees.map((userId) => ({ sessionId: session!.id, userId, status: 'invited' as const })),
    ]);
    const [host] = await db.select(profileColumns).from(users).where(eq(users.id, me));
    const what = body.proposal.kind === 'plant' ? 'grow a plant' : 'reveal a picture';
    for (const userId of invitees) {
      await notify(db, realtime, push, userId, {
        type: 'group_invite',
        title: 'Group focus invitation',
        body: `${nameOf(host!)} invites you to ${what} together for ${body.plannedMinutes} minutes.`,
        data: { sessionId: session!.id, hostId: me },
      });
    }
    const { participants } = await load(session!.id);
    res.status(201).json(await view(session!, participants, me));
  });

  r.get('/group/sessions/mine', async (req, res) => {
    const me = req.user!.id;
    const rows = await db
      .select({ session: groupSessions, status: groupParticipants.status })
      .from(groupParticipants)
      .innerJoin(groupSessions, eq(groupSessions.id, groupParticipants.sessionId))
      .where(and(eq(groupParticipants.userId, me), inArray(groupSessions.status, ['lobby', 'running'])))
      .orderBy(desc(groupSessions.createdAt));
    const out = [];
    for (const row of rows) {
      const { participants } = await load(row.session.id);
      out.push(await view(row.session, participants, me));
    }
    res.json({ items: out });
  });

  // Running sessions of my friends that I could ask to join.
  r.get('/group/sessions/joinable', async (req, res) => {
    const me = req.user!.id;
    const rows = await db
      .select({ session: groupSessions })
      .from(groupSessions)
      .innerJoin(groupParticipants, and(eq(groupParticipants.sessionId, groupSessions.id), eq(groupParticipants.isHost, true)))
      .where(and(eq(groupSessions.status, 'running'), sql`${groupSessions.endsAt} > now() + interval '${sql.raw(String(MIN_LATE_JOIN_MINUTES))} minutes'`));
    const out = [];
    for (const row of rows) {
      if (!(await areFriends(db, me, row.session.hostId))) continue;
      const { participants } = await load(row.session.id);
      if (participants.some((p) => p.userId === me && ['active', 'completed', 'left_early', 'disconnected'].includes(p.status))) continue;
      out.push(await view(row.session, participants, me));
    }
    res.json({ items: out });
  });

  r.get('/group/sessions/:id', async (req, res) => {
    const me = req.user!.id;
    const id = parse(uuid, req.params.id);
    const { session, participants } = await load(id);
    if (!participants.some((p) => p.userId === me) && !(await areFriends(db, me, session.hostId))) throw forbidden('Not your session');
    res.json(await view(session, participants, me));
  });

  // The host changes the proposal (after a rejection, or a change of mind):
  // everyone has to agree again.
  r.patch('/group/sessions/:id', async (req, res) => {
    const me = req.user!.id;
    const id = parse(uuid, req.params.id);
    const body = parse(z.object({ proposal: proposal.optional(), plannedMinutes: plannedMinutes.optional() }), req.body);
    const { session, participants } = await load(id);
    if (session.hostId !== me) throw forbidden('Only the host can change the proposal');
    if (session.status !== 'lobby') throw conflict('The session has already started');
    const [updated] = await db
      .update(groupSessions)
      .set({ ...(body.proposal ? { proposal: body.proposal } : {}), ...(body.plannedMinutes ? { plannedMinutes: body.plannedMinutes } : {}), revision: session.revision + 1 })
      .where(eq(groupSessions.id, id))
      .returning();
    await db
      .update(groupParticipants)
      .set({ status: 'invited', note: null })
      .where(and(eq(groupParticipants.sessionId, id), eq(groupParticipants.isHost, false), inArray(groupParticipants.status, ['invited', 'rejected', 'approved', 'ready'])));
    await db.update(groupParticipants).set({ status: 'approved' }).where(and(eq(groupParticipants.sessionId, id), eq(groupParticipants.userId, me)));
    const fresh = await load(id);
    emit(fresh.participants, 'updated', id, { revision: updated!.revision }, me);
    const [host] = await db.select(profileColumns).from(users).where(eq(users.id, me));
    for (const p of fresh.participants) {
      if (p.userId === me) continue;
      await notify(db, realtime, push, p.userId, { type: 'group_invite', title: 'Group focus: new proposal', body: `${nameOf(host!)} changed the plan: ${updated!.plannedMinutes} minutes.`, data: { sessionId: id, hostId: me } });
    }
    res.json(await view(fresh.session, fresh.participants, me));
  });

  // ---- answering the invitation -------------------------------------------------
  r.post('/group/sessions/:id/respond', async (req, res) => {
    const me = req.user!.id;
    const id = parse(uuid, req.params.id);
    const body = parse(z.object({ accept: z.boolean(), note: z.string().trim().max(120).optional() }), req.body);
    const { session, participants } = await load(id);
    if (session.status !== 'lobby') throw conflict('The session has already started');
    const mine = memberOf(participants, me);
    if (mine.isHost) throw badRequest('The host does not answer their own invitation');
    if (!['invited', 'rejected', 'approved'].includes(mine.status)) throw conflict('Already answered');
    await db
      .update(groupParticipants)
      .set({ status: body.accept ? 'approved' : 'rejected', note: body.accept ? null : (body.note ?? null) })
      .where(and(eq(groupParticipants.sessionId, id), eq(groupParticipants.userId, me)));
    const fresh = await load(id);
    emit(fresh.participants, 'participant', id, { userId: me, status: body.accept ? 'approved' : 'rejected' }, me);
    const [who] = await db.select(profileColumns).from(users).where(eq(users.id, me));
    if (!body.accept) {
      await notify(db, realtime, push, session.hostId, {
        type: 'group_rejected',
        title: 'Proposal declined',
        body: `${nameOf(who!)} declined the plan${body.note ? `: "${body.note}"` : ''}. Change it to try again.`,
        data: { sessionId: id },
      });
    }
    res.json(await view(fresh.session, fresh.participants, me));
  });

  // ---- the lobby: everyone approved presses Start; the last one starts the clock --
  r.post('/group/sessions/:id/ready', async (req, res) => {
    const me = req.user!.id;
    const id = parse(uuid, req.params.id);
    const { session, participants } = await load(id);
    if (session.status === 'running') {
      res.json(await view(session, participants, me));
      return;
    }
    if (session.status !== 'lobby') throw conflict('The session is over');
    const mine = memberOf(participants, me);
    if (mine.status !== 'approved' && mine.status !== 'ready') throw conflict('Accept the proposal first');
    await db.update(groupParticipants).set({ status: 'ready' }).where(and(eq(groupParticipants.sessionId, id), eq(groupParticipants.userId, me)));
    let fresh = await load(id);
    const members = fresh.participants.filter((p) => p.status === 'approved' || p.status === 'ready');
    const everyoneReady = members.length >= 2 && members.every((p) => p.status === 'ready');
    emit(fresh.participants, 'participant', id, { userId: me, status: 'ready' }, me);
    if (everyoneReady) {
      // Atomic: only the update that sees 'lobby' starts the clock; a second
      // Start arriving at the same moment finds it already running.
      const now = new Date();
      const endsAt = new Date(now.getTime() + session.plannedMinutes * 60_000);
      const [started] = await db
        .update(groupSessions)
        .set({ status: 'running', startedAt: now, endsAt, membersAtStart: members.length })
        .where(and(eq(groupSessions.id, id), eq(groupSessions.status, 'lobby')))
        .returning();
      if (started) {
        await db
          .update(groupParticipants)
          .set({ status: 'active', startedAt: now, lastHeartbeatAt: now })
          .where(and(eq(groupParticipants.sessionId, id), eq(groupParticipants.status, 'ready')));
        // people who never answered are out
        await db
          .update(groupParticipants)
          .set({ status: 'rejected' })
          .where(and(eq(groupParticipants.sessionId, id), inArray(groupParticipants.status, ['invited'])));
        for (const p of members) await openFocusSession(p.userId, id, session.plannedMinutes, now);
        fresh = await load(id);
        emit(fresh.participants, 'started', id, { startedAt: now.toISOString(), endsAt: endsAt.toISOString() });
      } else fresh = await load(id);
    }
    res.json(await view(fresh.session, fresh.participants, me));
  });

  /** A focus_sessions row per participant: what makes the minutes verified and presence "in a group". */
  async function openFocusSession(userId: string, groupId: string, minutes: number, now: Date) {
    await db.update(focusSessions).set({ outcome: 'failed', endedAt: now }).where(and(eq(focusSessions.userId, userId), eq(focusSessions.outcome, 'running')));
    const [row] = await db
      .insert(focusSessions)
      .values({ userId, clientSessionId: `group:${groupId}`, kind: 'group', groupSessionId: groupId, plannedMinutes: minutes, startedAt: now, lastHeartbeatAt: now })
      .onConflictDoUpdate({ target: [focusSessions.userId, focusSessions.clientSessionId], set: { outcome: 'running', startedAt: now, lastHeartbeatAt: now, endedAt: null, verifiedMinutes: 0, plannedMinutes: minutes } })
      .returning({ id: focusSessions.id });
    await db.update(groupParticipants).set({ focusSessionId: row!.id }).where(and(eq(groupParticipants.sessionId, groupId), eq(groupParticipants.userId, userId)));
    await broadcastPresence(db, realtime, userId);
  }

  r.post('/group/sessions/:id/cancel', async (req, res) => {
    const me = req.user!.id;
    const id = parse(uuid, req.params.id);
    const { session, participants } = await load(id);
    if (session.hostId !== me) throw forbidden('Only the host can cancel');
    if (session.status !== 'lobby') throw conflict('The session has already started');
    await db.update(groupSessions).set({ status: 'cancelled', endedAt: new Date() }).where(eq(groupSessions.id, id));
    emit(participants, 'ended', id, { reason: 'cancelled' }, me);
    res.status(204).end();
  });

  // Declined and would rather not be asked again, or an invitee backing out before the start.
  r.post('/group/sessions/:id/leave-lobby', async (req, res) => {
    const me = req.user!.id;
    const id = parse(uuid, req.params.id);
    const { session, participants } = await load(id);
    if (session.status !== 'lobby') throw conflict('The session has already started');
    const mine = memberOf(participants, me);
    if (mine.isHost) throw badRequest('The host cancels instead');
    await db.delete(groupParticipants).where(and(eq(groupParticipants.sessionId, id), eq(groupParticipants.userId, me)));
    emit(participants, 'participant', id, { userId: me, status: 'left' }, me);
    res.status(204).end();
  });

  // ---- late join (friend of the host asks, host approves) ------------------------------
  r.post('/group/sessions/:id/join', async (req, res) => {
    const me = req.user!.id;
    const id = parse(uuid, req.params.id);
    const { session, participants } = await load(id);
    if (session.status !== 'running') throw conflict('This session is not running');
    if (!(await areFriends(db, me, session.hostId))) throw forbidden('Only the host’s friends can ask to join');
    if (session.endsAt!.getTime() - Date.now() < MIN_LATE_JOIN_MINUTES * 60_000) throw conflict('Too late to join this session');
    const existing = participants.find((p) => p.userId === me);
    if (existing && ['active', 'disconnected', 'completed', 'left_early', 'join_requested'].includes(existing.status)) throw conflict('Already in this session');
    if (inSession(participants).length >= MAX_MEMBERS) throw conflict('This session is full');
    if (existing) await db.update(groupParticipants).set({ status: 'join_requested' }).where(and(eq(groupParticipants.sessionId, id), eq(groupParticipants.userId, me)));
    else await db.insert(groupParticipants).values({ sessionId: id, userId: me, status: 'join_requested' });
    const [who] = await db.select(profileColumns).from(users).where(eq(users.id, me));
    realtime.send(session.hostId, { type: 'group', event: 'join_request', sessionId: id, data: { userId: me, username: who!.username } });
    await notify(db, realtime, push, session.hostId, { type: 'group_join_request', title: 'Someone wants to join', body: `${nameOf(who!)} asks to join your group focus.`, data: { sessionId: id, userId: me } });
    res.status(202).json({ status: 'join_requested' });
  });

  r.post('/group/sessions/:id/join-requests/:userId', async (req, res) => {
    const me = req.user!.id;
    const id = parse(uuid, req.params.id);
    const userId = parse(uuid, req.params.userId);
    const body = parse(z.object({ approve: z.boolean() }), req.body);
    const { session, participants } = await load(id);
    if (session.hostId !== me) throw forbidden('Only the host approves joins');
    const p = participants.find((x) => x.userId === userId);
    if (!p || p.status !== 'join_requested') throw notFound('No such join request');
    if (!body.approve || session.status !== 'running') {
      await db.update(groupParticipants).set({ status: 'rejected' }).where(and(eq(groupParticipants.sessionId, id), eq(groupParticipants.userId, userId)));
      realtime.send(userId, { type: 'group', event: 'join_declined', sessionId: id });
      res.json({ status: 'rejected' });
      return;
    }
    const now = new Date();
    // The late joiner's own clock starts now; their reward is the time left.
    // to the nearest minute: a few seconds of network delay cost nobody a minute
    const remainingMinutes = Math.max(0, Math.round((session.endsAt!.getTime() - now.getTime()) / 60_000));
    if (remainingMinutes < MIN_LATE_JOIN_MINUTES) throw conflict('Too late to join this session');
    await db
      .update(groupParticipants)
      .set({ status: 'active', startedAt: now, lastHeartbeatAt: now })
      .where(and(eq(groupParticipants.sessionId, id), eq(groupParticipants.userId, userId)));
    await openFocusSession(userId, id, remainingMinutes, now);
    const fresh = await load(id);
    emit(fresh.participants, 'participant', id, { userId, status: 'active', startedAt: now.toISOString() });
    realtime.send(userId, { type: 'group', event: 'joined', sessionId: id, data: { startedAt: now.toISOString(), endsAt: session.endsAt!.toISOString() } });
    await notify(db, realtime, push, userId, { type: 'group_joined', title: 'You are in', body: `The host let you join. ${remainingMinutes} minutes to go.`, data: { sessionId: id } });
    res.json(await view(fresh.session, fresh.participants, me));
  });

  // ---- while running --------------------------------------------------------------------
  r.post('/group/sessions/:id/heartbeat', async (req, res) => {
    const me = req.user!.id;
    const id = parse(uuid, req.params.id);
    const now = new Date();
    const [p] = await db
      .update(groupParticipants)
      .set({ lastHeartbeatAt: now, status: 'active' })
      .where(and(eq(groupParticipants.sessionId, id), eq(groupParticipants.userId, me), inArray(groupParticipants.status, ['active', 'disconnected'])))
      .returning({ focusSessionId: groupParticipants.focusSessionId, status: groupParticipants.status });
    if (!p) throw notFound('You are not active in this session');
    if (p.focusSessionId) await db.update(focusSessions).set({ lastHeartbeatAt: now }).where(eq(focusSessions.id, p.focusSessionId));
    // Did the clock run out? Then settle everyone.
    const { session, participants } = await load(id);
    if (session.status === 'running' && session.endsAt && session.endsAt.getTime() <= now.getTime()) await settle(session, participants);
    res.status(204).end();
  });

  // Leaving early costs as many wilted trees / broken frames as there are
  // members in the session. The count is decided here, once.
  r.post('/group/sessions/:id/leave', async (req, res) => {
    const me = req.user!.id;
    const id = parse(uuid, req.params.id);
    const { session, participants } = await load(id);
    const mine = memberOf(participants, me);
    if (session.status !== 'running' || !['active', 'disconnected'].includes(mine.status)) throw conflict('You are not in a running session');
    const now = new Date();
    if (session.endsAt && session.endsAt.getTime() <= now.getTime()) {
      await settle(session, participants);
      const done = await load(id);
      res.json({ status: done.participants.find((p) => p.userId === me)!.status, penaltyCount: 0, rewardMinutes: done.participants.find((p) => p.userId === me)!.rewardMinutes });
      return;
    }
    const members = inSession(participants).length;
    await db
      .update(groupParticipants)
      .set({ status: 'left_early', leftAt: now, penaltyCount: members })
      .where(and(eq(groupParticipants.sessionId, id), eq(groupParticipants.userId, me)));
    if (mine.focusSessionId) await db.update(focusSessions).set({ outcome: 'failed', endedAt: now }).where(eq(focusSessions.id, mine.focusSessionId));
    let fresh = await load(id);
    emit(fresh.participants, 'participant', id, { userId: me, status: 'left_early' }, me);
    // The host leaving hands the session to whoever has been in it longest.
    if (mine.isHost) {
      const next = inSession(fresh.participants).sort((a, b) => (a.startedAt?.getTime() ?? 0) - (b.startedAt?.getTime() ?? 0))[0];
      if (next) {
        await db.update(groupSessions).set({ hostId: next.userId }).where(eq(groupSessions.id, id));
        await db.update(groupParticipants).set({ isHost: false }).where(and(eq(groupParticipants.sessionId, id), eq(groupParticipants.userId, me)));
        await db.update(groupParticipants).set({ isHost: true }).where(and(eq(groupParticipants.sessionId, id), eq(groupParticipants.userId, next.userId)));
        fresh = await load(id);
        emit(fresh.participants, 'host_changed', id, { hostId: next.userId });
      }
    }
    if (inSession(fresh.participants).length === 0) await settle(fresh.session, fresh.participants);
    await broadcastPresence(db, realtime, me);
    res.json({ status: 'left_early', penaltyCount: members, rewardMinutes: 0 });
  });

  // The app says it has applied its penalty objects: never again for this session.
  r.post('/group/sessions/:id/penalty-applied', async (req, res) => {
    const me = req.user!.id;
    const id = parse(uuid, req.params.id);
    const [row] = await db
      .update(groupParticipants)
      .set({ penaltyAppliedAt: new Date() })
      .where(and(eq(groupParticipants.sessionId, id), eq(groupParticipants.userId, me), eq(groupParticipants.status, 'left_early'), sql`${groupParticipants.penaltyAppliedAt} is null`))
      .returning({ penaltyCount: groupParticipants.penaltyCount });
    res.json({ applied: !!row, penaltyCount: row?.penaltyCount ?? 0 });
  });

  // Called by anyone in the session once the clock has run out (the heartbeat
  // does it too), and idempotent.
  r.post('/group/sessions/:id/finish', async (req, res) => {
    const me = req.user!.id;
    const id = parse(uuid, req.params.id);
    const { session, participants } = await load(id);
    memberOf(participants, me);
    if (session.status === 'running') {
      if (!session.endsAt || session.endsAt.getTime() > Date.now() + 5_000) throw conflict('The session has not ended yet');
      await settle(session, participants);
    }
    const fresh = await load(id);
    res.json(await view(fresh.session, fresh.participants, me));
  });

  /** The clock ran out: credit everyone still in, forfeit the long-disconnected, close the session. */
  async function settle(session: Session, participants: Participant[]) {
    const now = new Date();
    const [closed] = await db
      .update(groupSessions)
      .set({ status: 'ended', endedAt: now })
      .where(and(eq(groupSessions.id, session.id), eq(groupSessions.status, 'running')))
      .returning();
    if (!closed) return;
    const endsAt = session.endsAt ?? now;
    for (const p of participants) {
      if (p.status !== 'active' && p.status !== 'disconnected') continue;
      const away = p.lastHeartbeatAt ? endsAt.getTime() - p.lastHeartbeatAt.getTime() : Infinity;
      if (away > DISCONNECT_FORFEIT_MS) {
        await db.update(groupParticipants).set({ status: 'left_early', leftAt: endsAt, penaltyCount: 0 }).where(and(eq(groupParticipants.sessionId, session.id), eq(groupParticipants.userId, p.userId)));
        if (p.focusSessionId) await db.update(focusSessions).set({ outcome: 'failed', endedAt: endsAt }).where(eq(focusSessions.id, p.focusSessionId));
        continue;
      }
      const own = p.startedAt ?? session.startedAt ?? endsAt;
      const reward = Math.min(session.plannedMinutes, Math.max(0, Math.round((endsAt.getTime() - own.getTime()) / 60_000)));
      await db.update(groupParticipants).set({ status: 'completed', rewardMinutes: reward }).where(and(eq(groupParticipants.sessionId, session.id), eq(groupParticipants.userId, p.userId)));
      if (p.focusSessionId) await db.update(focusSessions).set({ outcome: 'completed', endedAt: endsAt, verifiedMinutes: reward }).where(eq(focusSessions.id, p.focusSessionId));
    }
    const fresh = await load(session.id);
    emit(fresh.participants, 'ended', session.id, { reason: 'completed' });
    for (const p of fresh.participants) await broadcastPresence(db, realtime, p.userId);
  }

  // ---- chat: predefined messages only ------------------------------------------------------
  r.get('/group/sessions/:id/messages', async (req, res) => {
    const me = req.user!.id;
    const id = parse(uuid, req.params.id);
    const { participants } = await load(id);
    memberOf(participants, me);
    const rows = await db.select().from(groupMessages).where(eq(groupMessages.sessionId, id)).orderBy(desc(groupMessages.createdAt)).limit(100);
    res.json({ items: rows.reverse().map((m) => ({ id: m.id, fromUserId: m.fromUserId, key: m.messageKey, createdAt: m.createdAt.toISOString() })) });
  });

  r.post('/group/sessions/:id/messages', limits.groupChat, async (req, res) => {
    const me = req.user!.id;
    const id = parse(uuid, req.params.id);
    const body = parse(z.object({ key: z.string().max(40) }), req.body);
    if (!isGroupMessageKey(body.key)) throw badRequest('Only the predefined messages can be sent');
    const { session, participants } = await load(id);
    const mine = memberOf(participants, me);
    if (session.status === 'ended' || session.status === 'cancelled') throw conflict('The session is over');
    if (!['approved', 'ready', 'active', 'disconnected', 'completed'].includes(mine.status)) throw forbidden('Join the session to chat');
    const [row] = await db.insert(groupMessages).values({ sessionId: id, fromUserId: me, messageKey: body.key }).returning();
    const msg = { id: row!.id, fromUserId: me, key: body.key, createdAt: row!.createdAt.toISOString() };
    emit(participants, 'message', id, msg);
    res.status(201).json(msg);
  });

  void ne;
  void or;
  return r;
}
