// The child's session: who is playing, what they may play, how much time
// they have, and the live play session (server-timed heartbeats, guardian
// controls, mirroring). The catalogue and progress are cached on the device
// so the console opens offline; the cached entitlement expires on its own
// validUntil, so offline access cannot outlive a lapsed subscription.
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { isBackendConfigured } from '../config/env';
import { apiRequest, ApiError, setAuthToken, setUnauthorizedHandler } from '../services/apiClient';
import { secureDelete, secureGet, secureSet } from '../services/secureStorage';
import { getInstallId } from '../services/installId';
import { RealtimeClient, type RealtimeMessage } from '../realtime/client';
import type { CatalogueGame, Child, Craft, Entitlement, Fact, PlayerMe, PlayerProgress } from '../types';

type Status = 'loading' | 'signedOut' | 'signedIn';

export interface PlayerLoginStart {
  otpRequired: boolean;
  challengeId?: string;
  phoneMasked?: string;
  guardianPhoneMasked?: string;
  childName?: string;
  resendAfterSeconds?: number;
  token?: string;
}

export interface LiveSession {
  sessionId: string;
  gameId: string;
  difficulty: string;
  startedAt: number;
  remainingSeconds: number;
  sessionLimitSeconds: number;
  pausedByGuardian: boolean;
  endedReason: string | null;
  endedMessage: string | null;
}

interface PlayerCtx {
  status: Status;
  me: PlayerMe | null;
  child: PlayerMe['child'] | null;
  entitlement: Entitlement;
  entitled: boolean;
  offline: boolean;
  connection: 'offline' | 'connecting' | 'online';
  watchers: number;
  games: CatalogueGame[];
  crafts: Craft[];
  progress: PlayerProgress | null;
  session: LiveSession | null;
  loginStart: (playerId: string, pin: string) => Promise<PlayerLoginStart>;
  loginVerify: (challengeId: string, code: string) => Promise<void>;
  /** Opened from the Guardian Console: a token the server issued for this child. */
  adoptSession: (token: string, child: Child) => Promise<void>;
  refresh: () => Promise<void>;
  loadGames: () => Promise<CatalogueGame[]>;
  loadCrafts: () => Promise<Craft[]>;
  loadProgress: () => Promise<PlayerProgress | null>;
  toggleFavourite: (gameId: string, favourite: boolean) => Promise<void>;
  startSession: (gameId: string, difficulty: string) => Promise<LiveSession>;
  endSession: (outcome: 'completed' | 'abandoned' | 'failed', result?: { score?: number | null; stars?: number; progress?: { data: Record<string, unknown>; version: number } }) => Promise<{ newAchievements: string[] } | null>;
  sendFrame: (state: unknown) => void;
  saveProgress: (gameId: string, data: Record<string, unknown>, version: number) => Promise<{ accepted: boolean; version: number; data: Record<string, unknown> } | null>;
  signOut: () => Promise<void>;
  realtime: RealtimeClient;
}

const TOKEN_KEY = 'loji.playerToken';
const ME_KEY = 'loji.playerMe.v1';
const GAMES_KEY = 'loji.playerGames.v1';
const CRAFTS_KEY = 'loji.playerCrafts.v1';
const PROGRESS_KEY = 'loji.playerProgress.v1';
const NO_ENTITLEMENT: Entitlement = { active: false, status: 'never_subscribed', validUntil: null };
const HEARTBEAT_MS = 30_000;

const PlayerContext = createContext<PlayerCtx | null>(null);

function effectiveEntitlement(e: Entitlement | undefined | null): Entitlement {
  if (!e) return NO_ENTITLEMENT;
  if (e.active && e.validUntil && new Date(e.validUntil).getTime() < Date.now()) return { ...e, active: false, status: 'expired' };
  return e;
}

function clientSessionId(): string {
  const c = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto;
  if (c?.randomUUID) return c.randomUUID();
  return `cs-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<Status>(isBackendConfigured ? 'loading' : 'signedOut');
  const [me, setMe] = useState<PlayerMe | null>(null);
  const [offline, setOffline] = useState(false);
  const [connection, setConnection] = useState<'offline' | 'connecting' | 'online'>('offline');
  const [watchers, setWatchers] = useState(0);
  const [games, setGames] = useState<CatalogueGame[]>([]);
  const [crafts, setCrafts] = useState<Craft[]>([]);
  const [progress, setProgress] = useState<PlayerProgress | null>(null);
  const [session, setSession] = useState<LiveSession | null>(null);
  const sessionRef = useRef<LiveSession | null>(null);
  const realtime = useMemo(() => new RealtimeClient('player'), []);
  const seq = useRef(0);
  const heartbeat = useRef<ReturnType<typeof setInterval> | null>(null);

  const setLive = useCallback((s: LiveSession | null | ((prev: LiveSession | null) => LiveSession | null)) => {
    const next = typeof s === 'function' ? s(sessionRef.current) : s;
    sessionRef.current = next;
    setSession(next);
  }, []);

  const clearLocal = useCallback(async () => {
    realtime.stop();
    setAuthToken('player', null);
    setMe(null);
    setGames([]);
    setCrafts([]);
    setProgress(null);
    setLive(null);
    setStatus('signedOut');
    await secureDelete(TOKEN_KEY);
    await Promise.all([ME_KEY, GAMES_KEY, CRAFTS_KEY, PROGRESS_KEY].map((k) => AsyncStorage.removeItem(k).catch(() => undefined)));
  }, [realtime, setLive]);

  const remember = useCallback(async (m: PlayerMe) => {
    setMe(m);
    await AsyncStorage.setItem(ME_KEY, JSON.stringify(m)).catch(() => undefined);
  }, []);

  const refresh = useCallback(async () => {
    try {
      const m = await apiRequest<PlayerMe>('/v1/player/me', { as: 'player' });
      await remember(m);
      setOffline(false);
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) await clearLocal();
      else if (e instanceof ApiError && e.isNetwork) setOffline(true);
    }
  }, [remember, clearLocal]);

  const loadGames = useCallback(async () => {
    try {
      const r = await apiRequest<{ games: CatalogueGame[] }>('/v1/player/games', { as: 'player' });
      setGames(r.games);
      await AsyncStorage.setItem(GAMES_KEY, JSON.stringify(r.games)).catch(() => undefined);
      setOffline(false);
      return r.games;
    } catch (e) {
      if (e instanceof ApiError && e.isNetwork) setOffline(true);
      if (e instanceof ApiError && e.isSubscriptionRequired) {
        setGames([]);
        await AsyncStorage.removeItem(GAMES_KEY).catch(() => undefined);
        await refresh();
      }
      return games;
    }
  }, [games, refresh]);

  const loadCrafts = useCallback(async () => {
    try {
      const r = await apiRequest<Craft[]>('/v1/player/crafts', { as: 'player' });
      setCrafts(r);
      await AsyncStorage.setItem(CRAFTS_KEY, JSON.stringify(r)).catch(() => undefined);
      return r;
    } catch (e) {
      if (e instanceof ApiError && e.isNetwork) setOffline(true);
      return crafts;
    }
  }, [crafts]);

  const loadProgress = useCallback(async () => {
    try {
      const r = await apiRequest<PlayerProgress>('/v1/player/progress', { as: 'player' });
      setProgress(r);
      await AsyncStorage.setItem(PROGRESS_KEY, JSON.stringify(r)).catch(() => undefined);
      return r;
    } catch (e) {
      if (e instanceof ApiError && e.isNetwork) setOffline(true);
      return progress;
    }
  }, [progress]);

  const applyToken = useCallback(
    async (token: string, m: PlayerMe) => {
      setAuthToken('player', token);
      await secureSet(TOKEN_KEY, token);
      await remember(m);
      setStatus('signedIn');
      realtime.start();
    },
    [remember, realtime]
  );

  // Restore on launch.
  useEffect(() => {
    if (!isBackendConfigured) return;
    setUnauthorizedHandler('player', () => void clearLocal());
    (async () => {
      const token = await secureGet(TOKEN_KEY);
      if (!token) {
        setStatus('signedOut');
        return;
      }
      setAuthToken('player', token);
      const [cachedMe, cachedGames, cachedCrafts, cachedProgress] = await Promise.all([ME_KEY, GAMES_KEY, CRAFTS_KEY, PROGRESS_KEY].map((k) => AsyncStorage.getItem(k).catch(() => null)));
      if (cachedMe) setMe(JSON.parse(cachedMe));
      if (cachedGames) setGames(JSON.parse(cachedGames));
      if (cachedCrafts) setCrafts(JSON.parse(cachedCrafts));
      if (cachedProgress) setProgress(JSON.parse(cachedProgress));
      setStatus('signedIn');
      await refresh();
      realtime.start();
    })();
    return () => setUnauthorizedHandler('player', null);
  }, [clearLocal, refresh, realtime]);

  // Live events from the server.
  useEffect(() => {
    const offState = realtime.onState(setConnection);
    const off = realtime.on((msg: RealtimeMessage) => {
      switch (msg.type) {
        case 'hello':
          setWatchers(Number(msg.watchers ?? 0));
          break;
        case 'mirror_status':
          setWatchers(Number(msg.watchers ?? 0));
          break;
        case 'session_control': {
          const action = String(msg.action);
          if (action === 'pause') setLive((s) => (s ? { ...s, pausedByGuardian: true } : s));
          else if (action === 'resume') setLive((s) => (s ? { ...s, pausedByGuardian: false } : s));
          else if (action === 'end') setLive((s) => (s ? { ...s, endedReason: 'ended_by_guardian', endedMessage: null } : s));
          else if (action === 'signed_out') void clearLocal();
          break;
        }
        case 'controls_changed':
        case 'profile_changed':
          void refresh();
          void loadGames();
          break;
        case 'heartbeat_result': {
          const r = msg.result as { running: boolean; mustEnd: boolean; reason?: string; message?: string; remainingSeconds?: number; pausedByGuardian?: boolean } | undefined;
          if (r) applyHeartbeat(r);
          break;
        }
      }
    });
    return () => {
      off();
      offState();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [realtime]);

  const applyHeartbeat = useCallback(
    (r: { running: boolean; mustEnd: boolean; reason?: string; message?: string; remainingSeconds?: number; pausedByGuardian?: boolean }) => {
      setLive((s) => {
        if (!s) return s;
        if (r.mustEnd) return { ...s, endedReason: r.reason ?? 'ended', endedMessage: r.message ?? null };
        return { ...s, remainingSeconds: r.remainingSeconds ?? s.remainingSeconds, pausedByGuardian: r.pausedByGuardian ?? s.pausedByGuardian };
      });
    },
    [setLive]
  );

  const beat = useCallback(async () => {
    const s = sessionRef.current;
    if (!s || s.endedReason) return;
    if (realtime.send({ type: 'heartbeat', sessionId: s.sessionId })) return;
    try {
      const r = await apiRequest<{ running: boolean; mustEnd: boolean; reason?: string; message?: string; remainingSeconds?: number; pausedByGuardian?: boolean }>(`/v1/player/sessions/${s.sessionId}/heartbeat`, { method: 'POST', as: 'player' });
      applyHeartbeat(r);
    } catch {
      // offline: the local countdown continues; the server reconciles on reconnect
    }
  }, [realtime, applyHeartbeat]);

  useEffect(() => {
    if (!session || session.endedReason) {
      if (heartbeat.current) clearInterval(heartbeat.current);
      heartbeat.current = null;
      return;
    }
    if (!heartbeat.current) heartbeat.current = setInterval(() => void beat(), HEARTBEAT_MS);
    const sub = AppState.addEventListener('change', (st) => {
      if (st === 'active') void beat();
    });
    return () => sub.remove();
  }, [session, beat]);

  const startSession = useCallback(
    async (gameId: string, difficulty: string): Promise<LiveSession> => {
      const r = await apiRequest<{ sessionId: string; remainingSeconds: number; sessionLimitSeconds: number }>('/v1/player/sessions/start', { method: 'POST', as: 'player', body: { gameId, clientSessionId: clientSessionId(), difficulty } });
      const s: LiveSession = { sessionId: r.sessionId, gameId, difficulty, startedAt: Date.now(), remainingSeconds: Math.min(r.remainingSeconds, r.sessionLimitSeconds), sessionLimitSeconds: r.sessionLimitSeconds, pausedByGuardian: false, endedReason: null, endedMessage: null };
      seq.current = 0;
      setLive(s);
      return s;
    },
    [setLive]
  );

  const endSession = useCallback(
    async (outcome: 'completed' | 'abandoned' | 'failed', result: { score?: number | null; stars?: number; progress?: { data: Record<string, unknown>; version: number } } = {}) => {
      const s = sessionRef.current;
      setLive(null);
      if (!s) return null;
      try {
        const r = await apiRequest<{ durationSeconds: number; newAchievements: string[] }>(`/v1/player/sessions/${s.sessionId}/end`, { method: 'POST', as: 'player', body: { outcome, score: result.score ?? null, stars: result.stars ?? 0, progress: result.progress } });
        void loadProgress();
        void refresh();
        return { newAchievements: r.newAchievements };
      } catch {
        return null;
      }
    },
    [setLive, loadProgress, refresh]
  );

  const sendFrame = useCallback(
    (state: unknown) => {
      const s = sessionRef.current;
      if (!s || s.endedReason || watchers === 0) return;
      seq.current += 1;
      realtime.send({ type: 'mirror', sessionId: s.sessionId, seq: seq.current, state });
    },
    [realtime, watchers]
  );

  const value = useMemo<PlayerCtx>(
    () => ({
      status,
      me,
      child: me?.child ?? null,
      entitlement: effectiveEntitlement(me?.entitlement),
      entitled: effectiveEntitlement(me?.entitlement).active,
      offline,
      connection,
      watchers,
      games,
      crafts,
      progress,
      session,
      loginStart: async (playerId, pin) => {
        const r = await apiRequest<PlayerLoginStart & PlayerMe>('/v1/player/login', { method: 'POST', as: false, body: { playerId, pin, installId: await getInstallId() } });
        if (!r.otpRequired && r.token) await applyToken(r.token, r);
        return r;
      },
      loginVerify: async (challengeId, code) => {
        const r = await apiRequest<PlayerLoginStart & PlayerMe>('/v1/player/login/verify', { method: 'POST', as: false, body: { challengeId, code } });
        if (r.token) await applyToken(r.token, r);
      },
      adoptSession: async (token) => {
        setAuthToken('player', token);
        const m = await apiRequest<PlayerMe>('/v1/player/me', { as: 'player' });
        await applyToken(token, m);
      },
      refresh,
      loadGames,
      loadCrafts,
      loadProgress,
      toggleFavourite: async (gameId, favourite) => {
        setGames((gs) => gs.map((g) => (g.id === gameId ? { ...g, favourite } : g)));
        await apiRequest(`/v1/player/games/${gameId}/favourite`, { method: favourite ? 'PUT' : 'DELETE', as: 'player' }).catch(() => undefined);
      },
      startSession,
      endSession,
      sendFrame,
      saveProgress: async (gameId, data, version) => {
        try {
          return await apiRequest(`/v1/player/progress/${gameId}`, { method: 'PUT', as: 'player', body: { data, version } });
        } catch {
          return null;
        }
      },
      signOut: async () => {
        await apiRequest('/v1/player/logout', { method: 'POST', as: 'player' }).catch(() => undefined);
        await clearLocal();
      },
      realtime,
    }),
    [status, me, offline, connection, watchers, games, crafts, progress, session, applyToken, refresh, loadGames, loadCrafts, loadProgress, startSession, endSession, sendFrame, clearLocal, realtime]
  );

  return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>;
}

export function usePlayer() {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error('usePlayer must be used inside PlayerProvider');
  return ctx;
}

export type { Fact };
