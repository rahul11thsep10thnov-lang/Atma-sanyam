import AsyncStorage from '@react-native-async-storage/async-storage';

// The last picture of the person's balcony, taken by the balcony screen
// (GLView snapshot) and shown as the Home hero so Home never needs a second
// GL context. A file:// uri on native, a data: uri on web.
const KEY = 'focus.balconySnapshot.v1';

export interface BalconySnapshot {
  uri: string;
  width: number;
  height: number;
  takenAt: number;
}

let memo: BalconySnapshot | null | undefined;
const listeners = new Set<(s: BalconySnapshot | null) => void>();

export async function loadSnapshot(): Promise<BalconySnapshot | null> {
  if (memo !== undefined) return memo;
  try {
    const raw = await AsyncStorage.getItem(KEY);
    memo = raw ? (JSON.parse(raw) as BalconySnapshot) : null;
  } catch {
    memo = null;
  }
  return memo;
}

export async function saveSnapshot(snapshot: BalconySnapshot): Promise<void> {
  memo = snapshot;
  listeners.forEach((l) => l(snapshot));
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(snapshot));
  } catch {
    // best effort
  }
}

export function subscribeSnapshot(listener: (s: BalconySnapshot | null) => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
