// Friends, presence, pokes and the notification centre, kept fresh over the
// live connection while signed in. Nothing here runs without an account.
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { isBackendConfigured } from '../config/env';
import { AppNotification, Friend, FriendsPayload, Presence, Profile, social } from './api';
import { RealtimeClient, RealtimeEvent } from './realtime';

export interface PokeEvent {
  pokeId: string;
  from: Profile;
}

interface SocialCtx {
  enabled: boolean;
  connected: boolean;
  friendsData: FriendsPayload | null;
  refreshFriends: () => Promise<void>;
  unread: number;
  notifications: AppNotification[];
  refreshNotifications: () => Promise<void>;
  markRead: (ids: string[] | 'all') => Promise<void>;
  /** The latest live poke, cleared by the overlay once shown. */
  poke: PokeEvent | null;
  clearPoke: () => void;
  onGroupEvent: (listener: (e: Extract<RealtimeEvent, { type: 'group' }>) => void) => () => void;
}

const EMPTY: FriendsPayload = { friends: [], incoming: [], sent: [], myWeekMinutes: 0, focusingCount: 0 };

const SocialContext = createContext<SocialCtx | null>(null);

export function SocialProvider({ children }: { children: React.ReactNode }) {
  const { status, user } = useAuth();
  const enabled = isBackendConfigured && status === 'signedIn' && !!user;
  const [connected, setConnected] = useState(false);
  const [friendsData, setFriendsData] = useState<FriendsPayload | null>(null);
  const [unread, setUnread] = useState(0);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [poke, setPoke] = useState<PokeEvent | null>(null);
  const client = useRef<RealtimeClient | null>(null);
  const groupListeners = useRef(new Set<(e: Extract<RealtimeEvent, { type: 'group' }>) => void>());

  const refreshFriends = useCallback(async () => {
    if (!enabled) return;
    try {
      setFriendsData(await social.friends());
    } catch {
      // keep what we have
    }
  }, [enabled]);

  const refreshNotifications = useCallback(async () => {
    if (!enabled) return;
    try {
      const page = await social.notifications();
      setNotifications(page.items);
      setUnread(page.unread);
    } catch {
      // keep what we have
    }
  }, [enabled]);

  const markRead = useCallback(async (ids: string[] | 'all') => {
    const res = await social.markRead(ids);
    const now = new Date().toISOString();
    setNotifications((cur) => cur.map((n) => (n.readAt || (ids !== 'all' && !ids.includes(n.id)) ? n : { ...n, readAt: now })));
    setUnread(res.unread);
  }, []);

  // presence updates patch the friends list in place
  const applyPresence = useCallback((userId: string, state: Presence) => {
    setFriendsData((cur) => {
      if (!cur) return cur;
      const friends = cur.friends.map((f): Friend => (f.id === userId ? { ...f, presence: state } : f));
      return { ...cur, friends, focusingCount: friends.filter((f) => f.presence.focusing).length };
    });
  }, []);

  useEffect(() => {
    if (!enabled) {
      client.current?.stop();
      client.current = null;
      setConnected(false);
      setFriendsData(null);
      setNotifications([]);
      setUnread(0);
      setPoke(null);
      return;
    }
    const c = new RealtimeClient();
    client.current = c;
    const offStatus = c.onStatus((v) => {
      setConnected(v);
      // Reconnecting after a gap: catch up on what was missed.
      if (v) {
        void refreshFriends();
        void refreshNotifications();
      }
    });
    const off = c.on((e) => {
      switch (e.type) {
        case 'presence':
          applyPresence(e.userId, e.state);
          break;
        case 'notification':
          setNotifications((cur) => [e.notification, ...cur.filter((n) => n.id !== e.notification.id)]);
          setUnread(e.unread);
          if (e.notification.type === 'friend_request' || e.notification.type === 'friend_accepted') void refreshFriends();
          break;
        case 'friends_changed':
          void refreshFriends();
          break;
        case 'poke':
          setPoke({ pokeId: e.pokeId, from: e.from });
          break;
        case 'group':
          for (const l of groupListeners.current) l(e);
          break;
        default:
          break;
      }
    });
    c.start();
    void refreshFriends();
    void refreshNotifications();
    return () => {
      off();
      offStatus();
      c.stop();
      if (client.current === c) client.current = null;
    };
  }, [enabled, refreshFriends, refreshNotifications, applyPresence]);

  const value = useMemo<SocialCtx>(
    () => ({
      enabled,
      connected,
      friendsData: enabled ? (friendsData ?? EMPTY) : null,
      refreshFriends,
      unread,
      notifications,
      refreshNotifications,
      markRead,
      poke,
      clearPoke: () => setPoke(null),
      onGroupEvent: (listener) => {
        groupListeners.current.add(listener);
        return () => groupListeners.current.delete(listener);
      },
    }),
    [enabled, connected, friendsData, refreshFriends, unread, notifications, refreshNotifications, markRead, poke]
  );

  return <SocialContext.Provider value={value}>{children}</SocialContext.Provider>;
}

export function useSocial() {
  const ctx = useContext(SocialContext);
  if (!ctx) throw new Error('useSocial must be used inside SocialProvider');
  return ctx;
}
