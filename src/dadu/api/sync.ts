// Offline-first sync with the DADU API. Runs only when a server is
// configured and the parent is signed in; otherwise everything stays on the
// device. Never throws into the UI: every failure is recorded as the last
// sync status and retried on the next foreground or progress event.
import { useCallback, useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { env } from '../../config/env';
import { useAuth } from '../../context/AuthContext';
import { ApiError } from '../../services/apiClient';
import { daduApi } from './client';
import type { ProgressEvent as ApiEvent } from './client';
import { toApiEvent } from './syncMapping';
export { toApiEvent } from './syncMapping';
import { useDadu } from '../state/DaduContext';
import { persistence } from '../state/persistence';
import { diffEvents, mergeWorld } from '../engines/sync';
import type { WorldState } from '../core/worldState';

export interface SyncStore { cursor: string | null; pending: unknown[]; serverChildId?: string; consentDone?: boolean; version?: number; lastSyncedAt?: number; lastWorld?: WorldState }
export interface SyncStatus { state: 'idle' | 'syncing' | 'ok' | 'error' | 'off'; at: number; message?: string }

let lastStatus: SyncStatus = { state: 'off', at: 0 };
const listeners = new Set<(s: SyncStatus) => void>();
function setStatus(s: SyncStatus) { lastStatus = s; listeners.forEach((l) => l(s)); }
export const syncStatus = { get: () => lastStatus, subscribe(fn: (s: SyncStatus) => void) { listeners.add(fn); return () => { listeners.delete(fn); }; } };

export async function runSync(childId: string, local: { name: string; band: string; difficulty: string; language: string; helperLanguage?: string; templeEnabled: boolean; avatar: { skin: string; hair: string; top: string } }, world: WorldState, adopt: (w: WorldState) => void): Promise<void> {
  setStatus({ state: 'syncing', at: Date.now() });
  const store = (await persistence.loadSync(childId)) as SyncStore;
  try {
    if (!store.consentDone) {
      const { consents } = await daduApi.consents.list();
      if (!consents.some((c) => c.kind === 'processing' && !c.withdrawnAt)) await daduApi.consents.grant({ childId: null, kind: 'processing', version: '2026-11' });
      store.consentDone = true;
    }
    if (!store.serverChildId) {
      const { child } = await daduApi.children.create({ name: local.name, band: local.band as 'A2', difficulty: local.difficulty as 'steady', language: local.language, helperLanguage: local.helperLanguage, avatar: local.avatar, templeEnabled: local.templeEnabled });
      store.serverChildId = child.id;
      store.version = 0;
    }
    const sid = store.serverChildId;
    let merged = world;
    try {
      const res = await daduApi.world.put(sid, world, store.version ?? 0);
      store.version = res.version;
    } catch (err) {
      if (err instanceof ApiError && err.status === 409 && err.body && typeof err.body === 'object' && 'world' in err.body) {
        const server = (err.body as { world: { version: number; state: WorldState } }).world;
        merged = mergeWorld(world, server.state);
        store.version = server.version;
        adopt(merged);
      } else throw err;
    }
    const events = diffEvents(store.lastWorld ?? { ...merged, lessonsCompleted: [], storiesRead: [], rewards: { ...merged.rewards, badges: [] }, assignments: {}, mastery: {} }, merged, childId).map(toApiEvent);
    const batch = [...(store.pending as ApiEvent[]), ...events].slice(-200);
    if (batch.length) {
      await daduApi.progress.push(sid, batch);
      store.pending = [];
    }
    const pulled = await daduApi.progress.pull(sid, store.cursor);
    store.cursor = pulled.cursor ?? store.cursor;
    store.lastWorld = merged;
    store.lastSyncedAt = Date.now();
    await persistence.saveSync(childId, store);
    setStatus({ state: 'ok', at: Date.now() });
  } catch (err) {
    await persistence.saveSync(childId, store);
    setStatus({ state: 'error', at: Date.now(), message: err instanceof Error ? err.message : 'sync failed' });
  }
}

/** Mount once. Syncs on foreground and whenever the world changes after a learning event. */
export function useSync() {
  const auth = useAuth();
  const { child, world, updateWorld } = useDadu();
  const busy = useRef(false);
  const dirty = useRef(false);
  const worldRef = useRef(world);
  worldRef.current = world;
  const enabled = !!env.apiUrl && auth.status === 'signedIn' && !!child;

  const sync = useCallback(async () => {
    if (!enabled || !child || !worldRef.current || busy.current) { dirty.current = true; return; }
    busy.current = true;
    dirty.current = false;
    try {
      await runSync(child.id, { name: child.name, band: child.band, difficulty: child.difficulty, language: child.language, helperLanguage: child.helperLanguage, templeEnabled: child.templeEnabled, avatar: child.avatar }, worldRef.current, (w) => updateWorld(() => w));
    } finally {
      busy.current = false;
      if (dirty.current) void sync();
    }
  }, [enabled, child, updateWorld]);

  useEffect(() => { if (!enabled) setStatus({ state: 'off', at: Date.now() }); }, [enabled]);
  useEffect(() => { if (enabled) void sync(); }, [enabled, sync]);
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => { if (s === 'active' && enabled) void sync(); });
    return () => sub.remove();
  }, [enabled, sync]);
  // learning events change these lists; a change schedules a sync (debounced)
  const marker = world ? `${world.lessonsCompleted.length}|${world.storiesRead.length}|${world.rewards.badges.length}|${Object.keys(world.assignments).length}` : '';
  useEffect(() => {
    if (!enabled || !marker) return;
    const t = setTimeout(() => void sync(), 1500);
    return () => clearTimeout(t);
  }, [marker, enabled, sync]);
}
