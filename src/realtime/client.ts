// WebSocket client for the live layer. One socket per role (guardian or
// player) with exponential-backoff reconnect, a keep-alive ping, and a
// simple event subscription. Used by the Guardian Console (child status,
// mirror frames) and the Player Console (controls, heartbeats, frames).
import { env } from '../config/env';
import { getAuthToken, type Role } from '../services/apiClient';

export type RealtimeMessage = { type: string } & Record<string, unknown>;
type Listener = (msg: RealtimeMessage) => void;
type StateListener = (state: ConnectionState) => void;
export type ConnectionState = 'offline' | 'connecting' | 'online';

const PING_MS = 25_000;

export class RealtimeClient {
  private ws: WebSocket | null = null;
  private listeners = new Set<Listener>();
  private stateListeners = new Set<StateListener>();
  private attempts = 0;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private pinger: ReturnType<typeof setInterval> | null = null;
  private stopped = true;
  state: ConnectionState = 'offline';

  constructor(private readonly role: Role) {}

  get connected() {
    return this.state === 'online';
  }

  start() {
    this.stopped = false;
    this.attempts = 0;
    if (this.ws) return;
    this.connect();
  }

  stop() {
    this.stopped = true;
    if (this.timer) clearTimeout(this.timer);
    if (this.pinger) clearInterval(this.pinger);
    this.timer = null;
    this.pinger = null;
    const ws = this.ws;
    this.ws = null;
    try {
      ws?.close();
    } catch {
      // already closed
    }
    this.setState('offline');
  }

  send(message: Record<string, unknown>): boolean {
    if (!this.ws || this.ws.readyState !== 1) return false;
    try {
      this.ws.send(JSON.stringify(message));
      return true;
    } catch {
      return false;
    }
  }

  on(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  onState(listener: StateListener): () => void {
    this.stateListeners.add(listener);
    listener(this.state);
    return () => {
      this.stateListeners.delete(listener);
    };
  }

  private setState(s: ConnectionState) {
    if (this.state === s) return;
    this.state = s;
    for (const l of this.stateListeners) l(s);
  }

  private connect() {
    if (this.stopped) return;
    const token = getAuthToken(this.role);
    if (!env.apiUrl || !token) {
      this.scheduleReconnect();
      return;
    }
    const url = `${env.apiUrl.replace(/^http/, 'ws')}/v1/ws?token=${encodeURIComponent(token)}`;
    this.setState('connecting');
    let ws: WebSocket;
    try {
      ws = new WebSocket(url);
    } catch {
      this.scheduleReconnect();
      return;
    }
    this.ws = ws;
    ws.onopen = () => {
      if (this.ws !== ws) return;
      this.attempts = 0;
      this.setState('online');
      if (this.pinger) clearInterval(this.pinger);
      this.pinger = setInterval(() => {
        try {
          ws.send('ping');
        } catch {
          // closing
        }
      }, PING_MS);
    };
    ws.onmessage = (ev) => {
      let msg: RealtimeMessage | null = null;
      try {
        msg = JSON.parse(String(ev.data));
      } catch {
        return;
      }
      if (!msg || typeof msg.type !== 'string') return;
      for (const l of this.listeners) l(msg);
    };
    ws.onerror = () => {
      // onclose follows
    };
    ws.onclose = (ev) => {
      if (this.ws !== ws) return;
      this.ws = null;
      if (this.pinger) clearInterval(this.pinger);
      this.pinger = null;
      this.setState('offline');
      // 4401 = token rejected: stop until the session layer gives a new one.
      if (ev.code === 4401) return;
      this.scheduleReconnect();
    };
  }

  private scheduleReconnect() {
    if (this.stopped) return;
    const delay = Math.min(30_000, 1000 * 2 ** Math.min(this.attempts, 5));
    this.attempts++;
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => this.connect(), delay);
  }
}
