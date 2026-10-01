import AsyncStorage from '@react-native-async-storage/async-storage';
import { WorldSaveState } from './types';

const KEY_PREFIX = 'focus.balconyWorld.v1.';
const SCHEMA_VERSION = 1;

/** Local persistence for one environment's world state. The same
 * WorldSaveState shape is what a later cloud-sync step POSTs to the API,
 * so nothing above this module changes when that lands. */
export async function loadWorld(environmentId: string): Promise<WorldSaveState | null> {
  try {
    const raw = await AsyncStorage.getItem(KEY_PREFIX + environmentId);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as WorldSaveState;
    if (parsed.schemaVersion !== SCHEMA_VERSION) return null;
    return parsed;
  } catch {
    return null;
  }
}

let pending: ReturnType<typeof setTimeout> | null = null;

/** Debounced: a drag emits many moves a second; one write 300 ms after the
 * last one is plenty. */
export function saveWorld(state: WorldSaveState): void {
  if (pending) clearTimeout(pending);
  pending = setTimeout(() => {
    pending = null;
    AsyncStorage.setItem(KEY_PREFIX + state.environmentId, JSON.stringify({ ...state, schemaVersion: SCHEMA_VERSION })).catch(() => {
      // best effort; the in-memory world is still correct and the next save retries
    });
  }, 300);
}

export async function clearWorld(environmentId: string): Promise<void> {
  await AsyncStorage.removeItem(KEY_PREFIX + environmentId);
}
