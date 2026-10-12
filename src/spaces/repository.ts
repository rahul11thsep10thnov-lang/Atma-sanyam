// Local persistence for the photographed spaces, with a
// tiny subscription so every screen shows the same state.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SpaceId } from './packTypes';
import { ArtState, INITIAL_ART, SpaceState, initialState } from './model';
import { SPACES } from './catalog';

const KEY = (space: SpaceId) => `focus.space.${space}.v2`;
const ART_KEY = 'focus.art.v2';
const LEGACY_BALCONY_KEY = 'focus.balcony.state.v1';

const memo: Partial<Record<SpaceId, SpaceState>> = {};
const listeners = new Set<(space: SpaceId, s: SpaceState) => void>();

async function migrateBalcony(): Promise<SpaceState | null> {
  try {
    const raw = await AsyncStorage.getItem(LEGACY_BALCONY_KEY);
    if (!raw) return null;
    const old = JSON.parse(raw) as { placed?: SpaceState['placed']; stored?: SpaceState['stored']; focus?: SpaceState['focus']; art?: { currentId: string | null; pieces: number; completed: string[]; mountedId: string | null } };
    const next = initialState('balcony');
    next.placed = (old.placed ?? next.placed).map((p) => (p.itemId === 'art_frame' ? { ...p, artId: old.art?.mountedId ?? null } : p));
    next.stored = old.stored ?? [];
    next.focus = old.focus ?? next.focus;
    if (old.art) {
      // the collection (src/collection) carries finished pictures over from this key
      const art: ArtState = { ...INITIAL_ART, currentId: old.art.currentId, pieces: old.art.pieces, completed: old.art.completed ?? [] };
      await AsyncStorage.setItem(ART_KEY, JSON.stringify(art));
    }
    await AsyncStorage.removeItem(LEGACY_BALCONY_KEY);
    return next;
  } catch {
    return null;
  }
}

export async function loadSpace(space: SpaceId): Promise<SpaceState> {
  const m = memo[space];
  if (m) return m;
  let state: SpaceState | null = null;
  try {
    const raw = await AsyncStorage.getItem(KEY(space));
    state = raw ? (JSON.parse(raw) as SpaceState) : null;
  } catch {
    state = null;
  }
  if (!state && space === 'balcony') state = await migrateBalcony();
  if (!state || state.schemaVersion !== 2) {
    state = initialState(space);
    await saveSpace(state);
  }
  memo[space] = state;
  return state;
}

export async function saveSpace(state: SpaceState): Promise<SpaceState> {
  const next = { ...state, version: Date.now() };
  memo[state.space] = next;
  listeners.forEach((l) => l(state.space, next));
  try {
    await AsyncStorage.setItem(KEY(state.space), JSON.stringify(next));
  } catch {
    // best effort; the memory copy stays authoritative for this run
  }
  return next;
}

export async function updateSpace(space: SpaceId, fn: (s: SpaceState) => SpaceState): Promise<SpaceState> {
  return saveSpace(fn(await loadSpace(space)));
}

export function subscribeSpace(listener: (space: SpaceId, s: SpaceState) => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export async function loadAllSpaces(): Promise<Record<SpaceId, SpaceState>> {
  const entries = await Promise.all(SPACES.map(async (s) => [s, await loadSpace(s)] as const));
  return Object.fromEntries(entries) as Record<SpaceId, SpaceState>;
}

