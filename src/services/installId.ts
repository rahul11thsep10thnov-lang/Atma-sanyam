// A random per-install identifier used for anonymous analytics and push
// routing. It is not derived from any hardware ID and resets on reinstall.
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'focus.installId.v1';
let cached: string | null = null;

function uuid(): string {
  const cryptoObj = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto;
  if (cryptoObj?.randomUUID) return cryptoObj.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

export async function getInstallId(): Promise<string> {
  if (cached) return cached;
  let id = await AsyncStorage.getItem(KEY).catch(() => null);
  if (!id) {
    id = uuid();
    await AsyncStorage.setItem(KEY, id).catch(() => undefined);
  }
  cached = id;
  return id;
}
