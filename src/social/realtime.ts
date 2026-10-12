// The live connection to the API (presence, pokes, notifications). One
// socket while signed in and the app is in the foreground; reconnects with
// backoff; a ping every 25 s keeps it alive through proxies.
import { AppState } from 'react-native';
import { env } from '../config/env';
import { getAuthToken } from '../services/apiClient';
import type { Presence, Profile, AppNotification } from './api';

export type RealtimeEvent =
  | { type: 'hello'; userId: string; serverTime: string }
  | { type: 'presence'; userId: string; state: Presence }
  | { type: 'notification'; notification: AppNotification; unread: number }
  | { type: 'poke'; from: Profile; pokeId: string }
  | { type: 'friends_changed' }
  | { type: 'group'; event: string; sessionId: string; data?: Record<string, unknown> }
  | { type: 'pong' };

type Listener = (event: RealtimeEvent) => void;
type StatusListener = (connected: boolean) => void;

const PING_MS = 25_000;
const BACKOFF_MS = [1000, 2000, 5000, 10_000, 30_000];

export function wsUrl(): string | null {
  const token = getAuthToken();
  if (!env.apiUrl || !token) return null;
  return `${env.apiUrl.replace(/^http/, 'ws')}/v1/ws?token=${encodeURIComponent(token)}`;
}

export class RealtimeClient {
  private socket: WebSocket | null = null;
  private listeners = new Set<Listener>();
  private statusListeners = new Set<StatusListener>();
  private wanted = false;
  private attempts = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private pingTimer: ReturnType<typeof setInterval> | null = null;
  private appStateSub: { remove: () => void } | null = null;
  connected = false;

  start() {
    if (this.wanted) return;
    this.wanted = true;
    this.appStateSub = AppState.addEventListener('change', (s) => {
      // Offline while in the background: friends see the person as away.
      if (s === 'active') this.open();
      else this.closeSocket();
    });
    if (AppState.currentState === 'active' || AppState.currentState === 'unknown') this.open();
  }

  stop() {
    this.wanted = false;
    this.appStateSub?.remove();
    this.appStateSub = null;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = null;
    this.closeSocket();
  }

  on(listener: Listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  onStatus(listener: StatusListener) {
    this.statusListeners.add(listener);
    return () => this.statusListeners.delete(listener);
  }

  private setConnected(v: boolean) {
    if (this.connected === v) return;
    this.connected = v;
    for (const l of this.statusListeners) l(v);
  }

  private open() {
    if (!this.wanted || this.socket) return;
    const url = wsUrl();
    if (!url) return;
    let ws: WebSocket;
    try {
      ws = new WebSocket(url);
    } catch {
      this.scheduleReconnect();
      return;
    }
    this.socket = ws;
    ws.onopen = () => {
      this.attempts = 0;
      this.setConnected(true);
      this.pingTimer = setInterval(() => {
        try {
          ws.send('ping');
        } catch {
          // the close handler reconnects
        }
      }, PING_MS);
    };
    ws.onmessage = (m) => {
      let event: RealtimeEvent | null = null;
      try {
        event = JSON.parse(String(m.data)) as RealtimeEvent;
      } catch {
        return;
      }
      if (!event || event.type === 'pong') return;
      for (const l of this.listeners) l(event);
    };
    ws.onerror = () => undefined;
    ws.onclose = (e) => {
      this.cleanupSocket(ws);
      // 4401: the session is gone; the auth layer signs out, no point retrying.
      if (this.wanted && e.code !== 4401) this.scheduleReconnect();
    };
  }

  private cleanupSocket(ws: WebSocket) {
    if (this.pingTimer) clearInterval(this.pingTimer);
    this.pingTimer = null;
    if (this.socket === ws) this.socket = null;
    this.setConnected(false);
  }

  private closeSocket() {
    const ws = this.socket;
    if (!ws) return;
    this.socket = null;
    try {
      ws.onclose = null;
      ws.close();
    } catch {
      // already closed
    }
    this.cleanupSocket(ws);
  }

  private scheduleReconnect() {
    if (this.reconnectTimer || !this.wanted) return;
    const delay = BACKOFF_MS[Math.min(this.attempts, BACKOFF_MS.length - 1)]!;
    this.attempts++;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      if (AppState.currentState !== 'background') this.open();
    }, delay);
  }
}
