// Local persistence for the 3D garden, with a subscription; the old
// photographed garden's state is carried over the first time.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';
import { SpaceState } from '../spaces/model';
import { GardenState, initialGarden, migrateFromSpace } from './model';

const KEY = 'focus.garden3d.v1';
const OLD_KEY = 'focus.space.garden.v2';

let memo: GardenState | null = null;
const listeners = new Set<(g: GardenState) => void>();

export async function loadGarden(): Promise<GardenState> {
  if (memo) return memo;
  let state: GardenState | null = null;
  try {
    const raw = await AsyncStorage.getItem(KEY);
    state = raw ? (JSON.parse(raw) as GardenState) : null;
  } catch {
    state = null;
  }
  if (!state) {
    try {
      const old = await AsyncStorage.getItem(OLD_KEY);
      if (old) state = migrateFromSpace(JSON.parse(old) as SpaceState);
    } catch {
      state = null;
    }
  }
  if (!state || state.schemaVersion !== 3) state = initialGarden();
  memo = state;
  await saveGarden(state);
  return state;
}

export async function saveGarden(g: GardenState): Promise<GardenState> {
  const next = { ...g, version: Date.now() };
  memo = next;
  listeners.forEach((l) => l(next));
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // best effort
  }
  return next;
}

export async function updateGarden(fn: (g: GardenState) => GardenState): Promise<GardenState> {
  return saveGarden(fn(await loadGarden()));
}

export function subscribeGarden(listener: (g: GardenState) => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useGarden(): [GardenState | null, (next: GardenState) => void] {
  const [g, setG] = useState<GardenState | null>(memo);
  useEffect(() => {
    let alive = true;
    loadGarden().then((x) => alive && setG(x));
    const unsub = subscribeGarden((x) => alive && setG(x));
    return () => {
      alive = false;
      unsub();
    };
  }, []);
  const save = useCallback((next: GardenState) => {
    setG(next);
    void saveGarden(next);
  }, []);
  return [g, save];
}
