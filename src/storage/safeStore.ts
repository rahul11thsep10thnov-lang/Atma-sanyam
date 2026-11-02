// Reading and writing saved progress without ever replacing it by mistake.
//
// A stored value that cannot be read must not be treated as "nothing saved
// yet": the next save would write an empty garden (or zero coins) over the
// real one. So:
//  - a read that fails (storage error, a value too large to read) holds the
//    key: every write to it is skipped until the app starts again, and the
//    stored value stays as it was;
//  - a value that reads but is not valid JSON, or has a schema this version
//    does not know, is first copied to `<key>.unreadable`, so it can still be
//    recovered, and only then may the key be written afresh.
import AsyncStorage from '@react-native-async-storage/async-storage';

const held = new Set<string>();

export interface ReadResult<T> {
  /** The stored value, or null when nothing usable is stored. */
  value: T | null;
  /** False when the key could not be read; it is held for this run. */
  ok: boolean;
}

export function isHeld(key: string): boolean {
  return held.has(key);
}

/** Copy a value the app cannot use to `<key>.unreadable` before the key is
 * reused. If even that copy fails, the key is held instead. */
export async function preserveUnreadable(key: string, raw: string): Promise<void> {
  try {
    await AsyncStorage.setItem(`${key}.unreadable`, raw);
  } catch {
    held.add(key);
  }
}

export async function readJson<T>(key: string): Promise<ReadResult<T>> {
  let raw: string | null;
  try {
    raw = await AsyncStorage.getItem(key);
  } catch {
    held.add(key);
    return { value: null, ok: false };
  }
  if (raw == null) return { value: null, ok: true };
  try {
    return { value: JSON.parse(raw) as T, ok: true };
  } catch {
    await preserveUnreadable(key, raw);
    return { value: null, ok: !held.has(key) };
  }
}

/** Write a value unless its key is held. Returns whether it was written. */
export async function writeJson(key: string, value: unknown): Promise<boolean> {
  if (held.has(key)) return false;
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

/** For tests: forget held keys, as a fresh app start would. */
export function resetHeldKeys(): void {
  held.clear();
}
