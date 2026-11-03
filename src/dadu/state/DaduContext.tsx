// The DADU app state: profiles, the active child's world, language
// preferences, parent settings and screen-time usage. One provider, one
// source of truth for both camera views and every engine.
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';
import type { ChildProfile, WorldState } from '../core/worldState';
import { createWorldState } from '../core/worldState';
import { tick } from '../core/simulation';
import type { CharacterKey } from '../core/characters';
import { modeForBand, contentLevel } from '../core/ageBands';
import type { InterfaceMode } from '../core/ageBands';
import type { Level } from '../core/content';
import type { LangPrefs } from '../i18n';
import { DEFAULT_PARENT, persistence } from './persistence';
import type { ParentSettings, UsageLog } from './persistence';

export interface DaduState {
  ready: boolean;
  prefs: LangPrefs;
  profiles: ChildProfile[];
  child: ChildProfile | null;
  world: WorldState | null;
  parent: ParentSettings;
  usage: UsageLog;
  mode: InterfaceMode;
  level: Level;
  /** Characters currently held in place by an activity (not moved by routines). */
  held: Set<CharacterKey>;
  /** True while the legacy Tame product is shown instead of DADU (App.tsx switch). */
  legacyOpen: boolean;
}

export interface DaduActions {
  setPrefs: (p: LangPrefs) => void;
  addProfile: (p: Omit<ChildProfile, 'id' | 'createdAt'>) => Promise<ChildProfile>;
  updateProfile: (id: string, patch: Partial<ChildProfile>) => void;
  removeProfile: (id: string) => Promise<void>;
  selectChild: (id: string) => Promise<void>;
  updateWorld: (fn: (w: WorldState) => WorldState) => void;
  setParent: (patch: Partial<ParentSettings>) => void;
  hold: (keys: CharacterKey[]) => void;
  release: (keys: CharacterKey[]) => void;
  /** Called by screens when a lesson/story/activity completes, for session summaries. */
  logEvent: (kind: 'lesson' | 'story' | 'activity') => void;
  /** Minutes used today for the active child. */
  minutesToday: () => number;
  wipeAll: () => Promise<void>;
  setLegacyOpen: (open: boolean) => void;
}

const Ctx = createContext<(DaduState & DaduActions) | null>(null);

const todayKey = (now: number) => {
  const d = new Date(now);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export function DaduProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [prefs, setPrefsState] = useState<LangPrefs>({ primary: 'en', mode: 'single' });
  const [profiles, setProfiles] = useState<ChildProfile[]>([]);
  const [child, setChild] = useState<ChildProfile | null>(null);
  const [world, setWorld] = useState<WorldState | null>(null);
  const [parent, setParentState] = useState<ParentSettings>(DEFAULT_PARENT);
  const [usage, setUsage] = useState<UsageLog>({ days: {}, sessions: [] });
  const [legacyOpen, setLegacyOpen] = useState(false);
  const heldRef = useRef<Set<CharacterKey>>(new Set());
  const sessionRef = useRef({ startedAt: Date.now(), lessons: 0, stories: 0, activities: 0, lastMinuteAt: Date.now() });

  // boot
  useEffect(() => {
    (async () => {
      const [p, list, par] = await Promise.all([persistence.loadPrefs(), persistence.loadProfiles(), persistence.loadParent()]);
      if (p) setPrefsState(p);
      setProfiles(list);
      setParentState(par);
      const active = list.find((c) => c.id === par.activeChildId) ?? list[0] ?? null;
      if (active) {
        setChild(active);
        const w = (await persistence.loadWorld(active.id)) ?? createWorldState(Date.now());
        setWorld(tick(w, Date.now(), heldRef.current));
        setUsage(await persistence.loadUsage(active.id));
      }
      setReady(true);
    })();
  }, []);

  // persist world on change (debounced by React batching; cheap JSON)
  useEffect(() => {
    if (child && world) void persistence.saveWorld(child.id, world);
  }, [child, world]);

  // tick the simulation when the app returns to the foreground
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') setWorld((w) => (w ? tick(w, Date.now(), heldRef.current) : w));
    });
    return () => sub.remove();
  }, []);

  // screen-time minute counter while the app is active
  useEffect(() => {
    if (!child) return;
    const id = setInterval(() => {
      const now = Date.now();
      setUsage((u) => {
        const key = todayKey(now);
        const next = { ...u, days: { ...u.days, [key]: (u.days[key] ?? 0) + 1 } };
        void persistence.saveUsage(child.id, next);
        return next;
      });
    }, 60_000);
    return () => clearInterval(id);
  }, [child]);

  const setPrefs = useCallback((p: LangPrefs) => { setPrefsState(p); void persistence.savePrefs(p); }, []);
  const setParent = useCallback((patch: Partial<ParentSettings>) => {
    setParentState((prev) => { const next = { ...prev, ...patch }; void persistence.saveParent(next); return next; });
  }, []);

  const selectChild = useCallback(async (id: string) => {
    const c = profiles.find((x) => x.id === id);
    if (!c) return;
    setChild(c);
    const w = (await persistence.loadWorld(c.id)) ?? createWorldState(Date.now());
    setWorld(tick(w, Date.now(), heldRef.current));
    setUsage(await persistence.loadUsage(c.id));
    setParent({ activeChildId: c.id });
  }, [profiles, setParent]);

  const addProfile = useCallback(async (p: Omit<ChildProfile, 'id' | 'createdAt'>) => {
    const profile: ChildProfile = { ...p, id: `c_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`, createdAt: Date.now() };
    const list = [...profiles, profile];
    setProfiles(list);
    await persistence.saveProfiles(list);
    setChild(profile);
    const w = createWorldState(Date.now());
    setWorld(w);
    await persistence.saveWorld(profile.id, w);
    setUsage({ days: {}, sessions: [] });
    setParent({ activeChildId: profile.id });
    return profile;
  }, [profiles, setParent]);

  const updateProfile = useCallback((id: string, patch: Partial<ChildProfile>) => {
    setProfiles((list) => { const next = list.map((c) => (c.id === id ? { ...c, ...patch } : c)); void persistence.saveProfiles(next); return next; });
    setChild((c) => (c && c.id === id ? { ...c, ...patch } : c));
  }, []);

  const removeProfile = useCallback(async (id: string) => {
    const next = profiles.filter((c) => c.id !== id);
    setProfiles(next);
    await persistence.saveProfiles(next);
    await persistence.deleteChild(id);
    if (child?.id === id) { setChild(next[0] ?? null); setWorld(null); setParent({ activeChildId: next[0]?.id ?? null }); }
  }, [profiles, child, setParent]);

  const updateWorld = useCallback((fn: (w: WorldState) => WorldState) => setWorld((w) => (w ? fn(w) : w)), []);
  const hold = useCallback((keys: CharacterKey[]) => { keys.forEach((k) => heldRef.current.add(k)); }, []);
  const release = useCallback((keys: CharacterKey[]) => { keys.forEach((k) => heldRef.current.delete(k)); }, []);
  const logEvent = useCallback((kind: 'lesson' | 'story' | 'activity') => {
    const s = sessionRef.current;
    if (kind === 'lesson') s.lessons++; else if (kind === 'story') s.stories++; else s.activities++;
    if (child) setUsage((u) => {
      const sessions = [...u.sessions.filter((x) => x.startedAt !== s.startedAt), { startedAt: s.startedAt, endedAt: Date.now(), lessons: s.lessons, stories: s.stories, activities: s.activities }].slice(-60);
      const next = { ...u, sessions };
      void persistence.saveUsage(child.id, next);
      return next;
    });
  }, [child]);
  const minutesToday = useCallback(() => usage.days[todayKey(Date.now())] ?? 0, [usage]);
  const wipeAll = useCallback(async () => {
    await persistence.wipeAll(profiles.map((p) => p.id));
    setProfiles([]); setChild(null); setWorld(null); setParentState(DEFAULT_PARENT); setUsage({ days: {}, sessions: [] });
  }, [profiles]);

  const value = useMemo<DaduState & DaduActions>(() => ({
    ready, prefs, profiles, child, world, parent, usage,
    mode: child ? modeForBand(child.band) : 'explorer',
    level: child ? contentLevel(child.band) : 'explorer',
    held: heldRef.current,
    legacyOpen,
    setPrefs, addProfile, updateProfile, removeProfile, selectChild, updateWorld, setParent, hold, release, logEvent, minutesToday, wipeAll, setLegacyOpen,
  }), [ready, prefs, profiles, child, world, parent, usage, legacyOpen, setPrefs, addProfile, updateProfile, removeProfile, selectChild, updateWorld, setParent, hold, release, logEvent, minutesToday, wipeAll]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useDadu(): DaduState & DaduActions {
  const v = useContext(Ctx);
  if (!v) throw new Error('useDadu outside DaduProvider');
  return v;
}
