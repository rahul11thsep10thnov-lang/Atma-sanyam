// Local persistence for the Paradise Garden, with a subscription so the
// garden tab, the home screen and the session see the same plants. Growth
// state during a session comes from the timer; only completed plants are
// written here, once per session.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';
import { INITIAL_PARADISE, ParadiseState, fromOldGarden, rehome } from './model';

const KEY = 'focus.paradise.v1';
const OLD_GARDEN_KEY = 'focus.garden3d.v1';

let memo: ParadiseState | null = null;
const listeners = new Set<(s: ParadiseState) => void>();

export async function loadParadise(): Promise<ParadiseState> {
  if (memo) return memo;
  let state: ParadiseState | null = null;
  try {
    const raw = await AsyncStorage.getItem(KEY);
    state = raw ? (JSON.parse(raw) as ParadiseState) : null;
  } catch {
    state = null;
  }
  if (!state) {
    try {
      const old = await AsyncStorage.getItem(OLD_GARDEN_KEY);
      if (old) state = fromOldGarden((JSON.parse(old) as { items?: { itemId: string; minutes?: number; placedAt: number }[] }).items ?? []);
    } catch {
      state = null;
    }
  }
  if (!state || state.schemaVersion !== 1) state = { ...INITIAL_PARADISE, version: Date.now() };
  state = rehome(state);
  memo = state;
  await saveParadise(state);
  return state;
}

export async function saveParadise(s: ParadiseState): Promise<ParadiseState> {
  const next = { ...s, version: Date.now() };
  memo = next;
  listeners.forEach((l) => l(next));
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // best effort
  }
  return next;
}

export async function updateParadise(fn: (s: ParadiseState) => ParadiseState): Promise<ParadiseState> {
  return saveParadise(fn(await loadParadise()));
}

export function subscribeParadise(listener: (s: ParadiseState) => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useParadise(): [ParadiseState | null, (next: ParadiseState) => void] {
  const [s, setS] = useState<ParadiseState | null>(memo);
  useEffect(() => {
    let alive = true;
    loadParadise().then((x) => alive && setS(x));
    const unsub = subscribeParadise((x) => alive && setS(x));
    return () => {
      alive = false;
      unsub();
    };
  }, []);
  const save = useCallback((next: ParadiseState) => {
    setS(next);
    void saveParadise(next);
  }, []);
  return [s, save];
}
