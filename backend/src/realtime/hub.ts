// Real-time delivery: one WebSocket server on the API's HTTP server, at
// /v1/ws, authenticated with the same bearer token as the REST API
// (`?token=` because React Native's WebSocket cannot set headers on every
// platform). The hub knows which people are connected right now, sends them
// events, and tells their friends when they come and go. State is in memory,
// so it describes one API instance; a second instance needs a shared bus.
import type { IncomingMessage, Server } from 'node:http';
import { WebSocketServer, WebSocket } from 'ws';
import { and, eq, gt } from 'drizzle-orm';
import type { Db } from '../database/client.js';
import { users, userSessions } from '../database/schema.js';
import { hashToken } from '../lib/tokens.js';

export type RealtimeEvent =
  | { type: 'hello'; userId: string; serverTime: string }
  | { type: 'presence'; userId: string; state: PresenceState }
  | { type: 'notification'; notification: Record<string, unknown>; unread: number }
  | { type: 'poke'; from: { id: string; username: string | null; displayName: string | null; avatarId: string | null }; pokeId: string }
  | { type: 'friends_changed' }
  | { type: 'group'; event: string; sessionId: string; data?: Record<string, unknown> }
  | { type: 'pong' };

export interface PresenceState {
  online: boolean;
  focusing: boolean;
  inGroup: boolean;
  lastSeenAt: string | null;
}

const TOKEN_RE = /^[A-Za-z0-9_-]{40,60}$/;
const PING_MS = 30_000;
// After the last socket closes, "offline" is announced only if nothing reconnects within this.
const OFFLINE_GRACE_MS = 8_000;

type Socket = WebSocket & { userId?: string; alive?: boolean };

export interface RealtimeHub {
  attach(server: Server): void;
  isOnline(userId: string): boolean;
  onlineUserIds(): string[];
  send(userId: string, event: RealtimeEvent): boolean;
  /** Called by the hub when a person's online state changes; the app wires it to friends. */
  onPresenceChange: ((userId: string, online: boolean) => Promise<void> | void) | null;
  close(): Promise<void>;
}

export function createRealtimeHub(db: Db): RealtimeHub {
  const sockets = new Map<string, Set<Socket>>();
  const offlineTimers = new Map<string, NodeJS.Timeout>();
  let wss: WebSocketServer | null = null;
  let pinger: NodeJS.Timeout | null = null;

  const hub: RealtimeHub = {
    onPresenceChange: null,
    attach(server) {
      wss = new WebSocketServer({ server, path: '/v1/ws', maxPayload: 16 * 1024 });
      wss.on('connection', (ws: Socket, req: IncomingMessage) => void onConnection(ws, req));
      pinger = setInterval(() => {
        for (const set of sockets.values()) {
          for (const ws of set) {
            if (ws.alive === false) {
              ws.terminate();
              continue;
            }
            ws.alive = false;
            ws.ping();
          }
        }
      }, PING_MS);
    },
    isOnline: (userId) => (sockets.get(userId)?.size ?? 0) > 0,
    onlineUserIds: () => [...sockets.keys()],
    send(userId, event) {
      const set = sockets.get(userId);
      if (!set || set.size === 0) return false;
      const payload = JSON.stringify(event);
      for (const ws of set) if (ws.readyState === WebSocket.OPEN) ws.send(payload);
      return true;
    },
    async close() {
      if (pinger) clearInterval(pinger);
      for (const t of offlineTimers.values()) clearTimeout(t);
      offlineTimers.clear();
      for (const set of sockets.values()) for (const ws of set) ws.terminate();
      sockets.clear();
      await new Promise<void>((resolve) => (wss ? wss.close(() => resolve()) : resolve()));
    },
  };

  async function authenticate(req: IncomingMessage): Promise<string | null> {
    const url = new URL(req.url ?? '/', 'http://localhost');
    const token = url.searchParams.get('token') ?? '';
    if (!TOKEN_RE.test(token)) return null;
    const [row] = await db
      .select({ userId: users.id })
      .from(userSessions)
      .innerJoin(users, eq(users.id, userSessions.userId))
      .where(and(eq(userSessions.tokenHash, hashToken(token)), gt(userSessions.expiresAt, new Date()), eq(users.status, 'active')))
      .limit(1);
    return row?.userId ?? null;
  }

  async function onConnection(ws: Socket, req: IncomingMessage) {
    let userId: string | null = null;
    try {
      userId = await authenticate(req);
    } catch {
      userId = null;
    }
    if (!userId) {
      ws.close(4401, 'unauthorized');
      return;
    }
    ws.userId = userId;
    ws.alive = true;
    ws.on('pong', () => {
      ws.alive = true;
    });
    ws.on('message', (raw) => {
      // The app only ever sends pings; anything else is ignored.
      if (raw.toString() === 'ping') ws.send(JSON.stringify({ type: 'pong' }));
    });
    ws.on('close', () => void onClose(ws));
    ws.on('error', () => ws.terminate());

    let set = sockets.get(userId);
    const wasOnline = !!set && set.size > 0;
    if (!set) sockets.set(userId, (set = new Set()));
    set.add(ws);
    const pending = offlineTimers.get(userId);
    if (pending) {
      clearTimeout(pending);
      offlineTimers.delete(userId);
    }
    ws.send(JSON.stringify({ type: 'hello', userId, serverTime: new Date().toISOString() } satisfies RealtimeEvent));
    await db.update(users).set({ lastSeenAt: new Date() }).where(eq(users.id, userId));
    if (!wasOnline && !pending) await hub.onPresenceChange?.(userId, true);
  }

  async function onClose(ws: Socket) {
    const userId = ws.userId;
    if (!userId) return;
    const set = sockets.get(userId);
    set?.delete(ws);
    if (set && set.size === 0) {
      sockets.delete(userId);
      offlineTimers.set(
        userId,
        setTimeout(() => {
          offlineTimers.delete(userId);
          if (!hub.isOnline(userId)) {
            void db
              .update(users)
              .set({ lastSeenAt: new Date() })
              .where(eq(users.id, userId))
              .then(() => hub.onPresenceChange?.(userId, false))
              .catch(() => undefined);
          }
        }, OFFLINE_GRACE_MS)
      );
    }
  }

  return hub;
}
