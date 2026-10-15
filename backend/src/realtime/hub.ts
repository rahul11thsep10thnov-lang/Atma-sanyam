// Real-time delivery: one WebSocket server on the API's HTTP server, at
// /v1/ws, authenticated with the same bearer token as the REST API
// (`?token=` because React Native's WebSocket cannot set headers on every
// platform). Two kinds of socket:
//
//   player  — the child's console. Sends heartbeats and, while mirroring is
//             allowed, frames of the game state. Receives guardian controls.
//   guardian — the Guardian Console. Receives each child's status, and, after
//             asking to watch a child it owns, that child's game-state frames.
//
// The relay is state, not pixels: the Guardian Console renders the same game
// from the same state. Nothing is recorded; the latest frame is kept on the
// game session row only while the session runs, so a guardian who connects
// late sees where the game is. State is in memory, so it describes one API
// instance; a second instance needs a shared bus (Redis pub/sub).
import type { IncomingMessage, Server } from 'node:http';
import { WebSocketServer, WebSocket } from 'ws';
import { and, eq, gt, isNull } from 'drizzle-orm';
import { z } from 'zod';
import type { Db } from '../database/client.js';
import { children, gameSessions, guardianSessions, guardians, mirrorSessions, parentalControls, playerSessions } from '../database/schema.js';
import { hashToken } from '../lib/tokens.js';

export type GuardianEvent =
  | { type: 'hello'; role: 'guardian'; guardianId: string; serverTime: string; onlineChildren: string[] }
  | { type: 'child_status'; childId: string; online: boolean; session?: { id: string; gameId: string; gameName?: string; startedAt: string } | null; lastOutcome?: string }
  | { type: 'mirror_frame'; childId: string; sessionId: string; gameId: string; seq: number; state: unknown; at: string }
  | { type: 'mirror_ended'; childId: string; reason: string }
  | { type: 'watching'; childId: string; mirrorSessionId: string }
  | { type: 'error'; code: string; message: string }
  | { type: 'pong' };

export type PlayerEvent =
  | { type: 'hello'; role: 'player'; childId: string; serverTime: string; watchers: number }
  | { type: 'session_control'; action: 'pause' | 'resume' | 'end' | 'signed_out' }
  | { type: 'mirror_status'; watchers: number }
  | { type: 'heartbeat_result'; sessionId: string; result: Record<string, unknown> }
  | { type: 'controls_changed' }
  | { type: 'profile_changed' }
  | { type: 'error'; code: string; message: string }
  | { type: 'pong' };

const TOKEN_RE = /^[A-Za-z0-9_-]{40,60}$/;
const PING_MS = 30_000;
const MAX_FRAME_BYTES = 24 * 1024;
const MIN_FRAME_INTERVAL_MS = 150;
const SNAPSHOT_EVERY_MS = 5_000;

type Role = 'guardian' | 'player';
type Socket = WebSocket & { role?: Role; id?: string; guardianId?: string; alive?: boolean; lastFrameAt?: number; watching?: Set<string> };

const frameSchema = z.object({ type: z.literal('mirror'), sessionId: z.string().uuid(), seq: z.number().int().min(0), state: z.unknown() });
const heartbeatSchema = z.object({ type: z.literal('heartbeat'), sessionId: z.string().uuid() });
const watchSchema = z.object({ type: z.enum(['watch', 'unwatch']), childId: z.string().uuid() });

export interface HubHandlers {
  /** The REST heartbeat logic, so WebSocket heartbeats behave identically. */
  heartbeat?: (sessionId: string, childId: string, guardianId: string) => Promise<Record<string, unknown>>;
}

export interface RealtimeHub {
  attach(server: Server): void;
  isPlayerOnline(childId: string): boolean;
  isGuardianOnline(guardianId: string): boolean;
  sendToPlayer(childId: string, event: PlayerEvent): boolean;
  notifyGuardians(guardianId: string, event: GuardianEvent): boolean;
  watcherCount(childId: string): number;
  handlers: HubHandlers;
  close(): Promise<void>;
}

export function createRealtimeHub(db: Db): RealtimeHub {
  const players = new Map<string, Set<Socket>>(); // childId → sockets
  const guardianSockets = new Map<string, Set<Socket>>(); // guardianId → sockets
  const watchers = new Map<string, Set<Socket>>(); // childId → guardian sockets watching
  const mirrorRows = new Map<Socket, Map<string, string>>(); // socket → childId → mirrorSessionId
  const lastSnapshotAt = new Map<string, number>(); // sessionId → ms
  let wss: WebSocketServer | null = null;
  let pinger: NodeJS.Timeout | null = null;

  const send = (ws: Socket, event: GuardianEvent | PlayerEvent) => {
    if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(event));
  };

  const hub: RealtimeHub = {
    handlers: {},
    attach(server) {
      wss = new WebSocketServer({ server, path: '/v1/ws', maxPayload: MAX_FRAME_BYTES + 1024 });
      wss.on('connection', (ws: Socket, req: IncomingMessage) => void onConnection(ws, req));
      pinger = setInterval(() => {
        for (const ws of wss?.clients ?? []) {
          const s = ws as Socket;
          if (s.alive === false) {
            s.terminate();
            continue;
          }
          s.alive = false;
          s.ping();
        }
      }, PING_MS);
    },
    isPlayerOnline: (childId) => (players.get(childId)?.size ?? 0) > 0,
    isGuardianOnline: (guardianId) => (guardianSockets.get(guardianId)?.size ?? 0) > 0,
    sendToPlayer(childId, event) {
      const set = players.get(childId);
      if (!set || set.size === 0) return false;
      for (const ws of set) send(ws, event);
      return true;
    },
    notifyGuardians(guardianId, event) {
      const set = guardianSockets.get(guardianId);
      if (!set || set.size === 0) return false;
      for (const ws of set) send(ws, event);
      return true;
    },
    watcherCount: (childId) => watchers.get(childId)?.size ?? 0,
    async close() {
      if (pinger) clearInterval(pinger);
      for (const ws of wss?.clients ?? []) ws.terminate();
      players.clear();
      guardianSockets.clear();
      watchers.clear();
      await new Promise<void>((resolve) => (wss ? wss.close(() => resolve()) : resolve()));
    },
  };

  async function authenticate(req: IncomingMessage): Promise<{ role: Role; id: string; guardianId: string } | null> {
    const url = new URL(req.url ?? '/', 'http://localhost');
    const token = url.searchParams.get('token') ?? '';
    if (!TOKEN_RE.test(token)) return null;
    const now = new Date();
    const h = hashToken(token);
    const [g] = await db
      .select({ id: guardians.id })
      .from(guardianSessions)
      .innerJoin(guardians, eq(guardians.id, guardianSessions.guardianId))
      .where(and(eq(guardianSessions.tokenHash, h), gt(guardianSessions.expiresAt, now), isNull(guardianSessions.revokedAt), eq(guardians.status, 'active')))
      .limit(1);
    if (g) return { role: 'guardian', id: g.id, guardianId: g.id };
    const [p] = await db
      .select({ childId: children.id, guardianId: children.guardianId })
      .from(playerSessions)
      .innerJoin(children, eq(children.id, playerSessions.childId))
      .innerJoin(guardians, eq(guardians.id, children.guardianId))
      .where(and(eq(playerSessions.tokenHash, h), gt(playerSessions.expiresAt, now), isNull(playerSessions.revokedAt), eq(children.status, 'active'), eq(guardians.status, 'active')))
      .limit(1);
    if (p) return { role: 'player', id: p.childId, guardianId: p.guardianId };
    return null;
  }

  async function onConnection(ws: Socket, req: IncomingMessage) {
    // Messages can arrive while the token is still being checked; keep them
    // until the socket is set up, then handle them in order.
    const queue: string[] = [];
    let handler: ((raw: string) => void) | null = null;
    ws.on('message', (raw) => {
      const text = raw.toString();
      if (handler) handler(text);
      else if (queue.length < 20) queue.push(text);
    });
    const ready = (h: (raw: string) => void) => {
      handler = h;
      for (const m of queue.splice(0)) h(m);
    };
    let who: Awaited<ReturnType<typeof authenticate>> = null;
    try {
      who = await authenticate(req);
    } catch {
      who = null;
    }
    if (!who) {
      ws.close(4401, 'unauthorized');
      return;
    }
    ws.role = who.role;
    ws.id = who.id;
    ws.guardianId = who.guardianId;
    ws.alive = true;
    ws.watching = new Set();
    ws.on('pong', () => {
      ws.alive = true;
    });
    ws.on('error', () => ws.terminate());

    if (who.role === 'player') {
      let set = players.get(who.id);
      const wasOnline = !!set && set.size > 0;
      if (!set) players.set(who.id, (set = new Set()));
      set.add(ws);
      send(ws, { type: 'hello', role: 'player', childId: who.id, serverTime: new Date().toISOString(), watchers: hub.watcherCount(who.id) });
      if (!wasOnline) hub.notifyGuardians(who.guardianId, { type: 'child_status', childId: who.id, online: true });
      ws.on('close', () => onPlayerClose(ws));
      ready((raw) => void onPlayerMessage(ws, raw));
    } else {
      let set = guardianSockets.get(who.id);
      if (!set) guardianSockets.set(who.id, (set = new Set()));
      set.add(ws);
      const kids = await db.select({ id: children.id }).from(children).where(and(eq(children.guardianId, who.id), eq(children.status, 'active')));
      send(ws, { type: 'hello', role: 'guardian', guardianId: who.id, serverTime: new Date().toISOString(), onlineChildren: kids.map((k) => k.id).filter((id) => hub.isPlayerOnline(id)) });
      ws.on('close', () => void onGuardianClose(ws));
      ready((raw) => void onGuardianMessage(ws, raw));
    }
  }

  // ---- player ------------------------------------------------------------
  async function onPlayerMessage(ws: Socket, raw: string) {
    if (raw === 'ping') return send(ws, { type: 'pong' });
    let msg: unknown;
    try {
      msg = JSON.parse(raw);
    } catch {
      return;
    }
    const frame = frameSchema.safeParse(msg);
    if (frame.success) return onFrame(ws, frame.data);
    const hb = heartbeatSchema.safeParse(msg);
    if (hb.success && hub.handlers.heartbeat) {
      try {
        const result = await hub.handlers.heartbeat(hb.data.sessionId, ws.id!, ws.guardianId!);
        send(ws, { type: 'heartbeat_result', sessionId: hb.data.sessionId, result });
      } catch (err) {
        send(ws, { type: 'error', code: 'heartbeat_failed', message: err instanceof Error ? err.message : 'heartbeat failed' });
      }
    }
  }

  async function onFrame(ws: Socket, frame: z.infer<typeof frameSchema>) {
    const now = Date.now();
    if (ws.lastFrameAt && now - ws.lastFrameAt < MIN_FRAME_INTERVAL_MS) return; // drop bursts
    ws.lastFrameAt = now;
    const childId = ws.id!;
    const set = watchers.get(childId);
    // Mirroring must be allowed by the guardian's controls; checked on watch,
    // and the player only sends frames when someone is watching.
    const [session] = await db
      .select({ id: gameSessions.id, gameId: gameSessions.gameId, outcome: gameSessions.outcome })
      .from(gameSessions)
      .where(and(eq(gameSessions.id, frame.sessionId), eq(gameSessions.childId, childId)));
    if (!session || session.outcome !== 'running') return;
    const at = new Date().toISOString();
    if (set) for (const g of set) send(g, { type: 'mirror_frame', childId, sessionId: session.id, gameId: session.gameId, seq: frame.seq, state: frame.state, at });
    // Keep the latest frame on the session row (throttled) so a guardian who
    // starts watching mid-game gets the current board at once.
    const last = lastSnapshotAt.get(session.id) ?? 0;
    if (now - last > SNAPSHOT_EVERY_MS) {
      lastSnapshotAt.set(session.id, now);
      await db
        .update(gameSessions)
        .set({ snapshot: frame.state as Record<string, unknown>, snapshotSeq: frame.seq, snapshotAt: new Date() })
        .where(eq(gameSessions.id, session.id));
    }
  }

  function onPlayerClose(ws: Socket) {
    const childId = ws.id!;
    const set = players.get(childId);
    set?.delete(ws);
    if (set && set.size === 0) {
      players.delete(childId);
      hub.notifyGuardians(ws.guardianId!, { type: 'child_status', childId, online: false });
      const w = watchers.get(childId);
      if (w) for (const g of w) send(g, { type: 'mirror_ended', childId, reason: 'offline' });
    }
  }

  // ---- guardian -----------------------------------------------------------
  async function onGuardianMessage(ws: Socket, raw: string) {
    if (raw === 'ping') return send(ws, { type: 'pong' });
    let msg: unknown;
    try {
      msg = JSON.parse(raw);
    } catch {
      return;
    }
    const w = watchSchema.safeParse(msg);
    if (!w.success) return;
    if (w.data.type === 'unwatch') return stopWatching(ws, w.data.childId, 'unwatched');
    // Authorisation: the child must belong to this guardian and mirroring must be on.
    const [row] = await db
      .select({ id: children.id, mirroring: parentalControls.mirroringEnabled })
      .from(children)
      .leftJoin(parentalControls, eq(parentalControls.childId, children.id))
      .where(and(eq(children.id, w.data.childId), eq(children.guardianId, ws.id!), eq(children.status, 'active')));
    if (!row) return send(ws, { type: 'error', code: 'forbidden', message: 'Not your child profile' });
    if (row.mirroring === false) return send(ws, { type: 'error', code: 'mirroring_disabled', message: 'Live mirroring is turned off for this child' });
    const childId = row.id;
    let set = watchers.get(childId);
    if (!set) watchers.set(childId, (set = new Set()));
    set.add(ws);
    ws.watching!.add(childId);
    const [running] = await db
      .select({ id: gameSessions.id, gameId: gameSessions.gameId, snapshot: gameSessions.snapshot, snapshotSeq: gameSessions.snapshotSeq, snapshotAt: gameSessions.snapshotAt })
      .from(gameSessions)
      .where(and(eq(gameSessions.childId, childId), eq(gameSessions.outcome, 'running')))
      .limit(1);
    const [m] = await db.insert(mirrorSessions).values({ childId, guardianId: ws.id!, gameSessionId: running?.id ?? null }).returning({ id: mirrorSessions.id });
    let rows = mirrorRows.get(ws);
    if (!rows) mirrorRows.set(ws, (rows = new Map()));
    rows.set(childId, m!.id);
    send(ws, { type: 'watching', childId, mirrorSessionId: m!.id });
    // The child sees the privacy indicator the moment someone watches.
    hub.sendToPlayer(childId, { type: 'mirror_status', watchers: set.size });
    if (running?.snapshot) send(ws, { type: 'mirror_frame', childId, sessionId: running.id, gameId: running.gameId, seq: running.snapshotSeq, state: running.snapshot, at: running.snapshotAt?.toISOString() ?? new Date().toISOString() });
  }

  function stopWatching(ws: Socket, childId: string, reason: string) {
    const set = watchers.get(childId);
    set?.delete(ws);
    ws.watching?.delete(childId);
    if (set && set.size === 0) watchers.delete(childId);
    const id = mirrorRows.get(ws)?.get(childId);
    if (id) {
      mirrorRows.get(ws)?.delete(childId);
      void db.update(mirrorSessions).set({ endedAt: new Date() }).where(eq(mirrorSessions.id, id)).catch(() => undefined);
    }
    hub.sendToPlayer(childId, { type: 'mirror_status', watchers: set?.size ?? 0 });
    send(ws, { type: 'mirror_ended', childId, reason });
  }

  async function onGuardianClose(ws: Socket) {
    for (const childId of [...(ws.watching ?? [])]) stopWatching(ws, childId, 'disconnected');
    mirrorRows.delete(ws);
    const set = guardianSockets.get(ws.id!);
    set?.delete(ws);
    if (set && set.size === 0) guardianSockets.delete(ws.id!);
  }

  return hub;
}
