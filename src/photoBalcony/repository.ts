// Local persistence for the balcony, with a tiny subscription so the
// Balcony tab, Home and the focus session always show the same balcony.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BalconyState, initialState } from './model';

const KEY = 'focus.balcony.state.v1';
let memo: BalconyState | null = null;
const listeners = new Set<(s: BalconyState) => void>();

export async function loadBalcony(): Promise<BalconyState> {
  if (memo) return memo;
  try {
    const raw = await AsyncStorage.getItem(KEY);
    memo = raw ? (JSON.parse(raw) as BalconyState) : null;
  } catch {
    memo = null;
  }
  if (!memo || memo.schemaVersion !== 1) {
    memo = initialState();
    await saveBalcony(memo);
  }
  return memo;
}

export async function saveBalcony(state: BalconyState): Promise<BalconyState> {
  const next = { ...state, version: Date.now() };
  memo = next;
  listeners.forEach((l) => l(next));
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // best effort; memory copy stays authoritative for this run
  }
  return next;
}

export async function updateBalcony(fn: (s: BalconyState) => BalconyState): Promise<BalconyState> {
  return saveBalcony(fn(await loadBalcony()));
}

export function subscribeBalcony(listener: (s: BalconyState) => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export async function resetBalcony(): Promise<BalconyState> {
  memo = null;
  await AsyncStorage.removeItem(KEY);
  return loadBalcony();
}
