// Device persistence for DADU: child profiles, each child's world state,
// language preferences and parent settings. AsyncStorage with versioned keys;
// every read tolerates missing or corrupt data. Nothing here touches Tame's keys.
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ChildProfile, WorldState } from '../core/worldState';
import type { LangPrefs } from '../i18n';

const K = {
  profiles: 'dadu.profiles.v1',
  world: (childId: string) => `dadu.world.v1.${childId}`,
  prefs: 'dadu.prefs.v1',
  parent: 'dadu.parent.v1',
  usage: (childId: string) => `dadu.usage.v1.${childId}`,
  sync: (childId: string) => `dadu.sync.v1.${childId}`,
};

export interface ParentSettings {
  pinHash: string | null;         // SHA-256 hex of the PIN, null until set
  consentAt: number | null;       // DPDP consent timestamp
  consentVersion: string;
  activeChildId: string | null;
  limits: Record<string, { dailyMinutes: number | 'none'; bedtime: string | null; breakEveryMinutes: number }>;
  photosAllowed: Record<string, boolean>;
  analytics: boolean;
  legacyTameVisible: boolean;
}

export const DEFAULT_PARENT: ParentSettings = {
  pinHash: null, consentAt: null, consentVersion: '2026-11', activeChildId: null, limits: {}, photosAllowed: {}, analytics: false, legacyTameVisible: false,
};

export interface UsageLog {
  /** ISO date → minutes used. */
  days: Record<string, number>;
  /** Session summaries, newest last, capped at 60. */
  sessions: { startedAt: number; endedAt: number; lessons: number; stories: number; activities: number }[];
}

async function read<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return fallback;
    return { ...fallback, ...(JSON.parse(raw) as T) };
  } catch {
    return fallback;
  }
}
async function write(key: string, value: unknown): Promise<void> {
  try { await AsyncStorage.setItem(key, JSON.stringify(value)); } catch { /* storage full or unavailable: keep in memory */ }
}

export const persistence = {
  loadProfiles: () => read<{ list: ChildProfile[] }>(K.profiles, { list: [] }).then((x) => x.list),
  saveProfiles: (list: ChildProfile[]) => write(K.profiles, { list }),
  loadWorld: (childId: string) => read<WorldState | null>(K.world(childId), null),
  saveWorld: (childId: string, world: WorldState) => write(K.world(childId), world),
  loadPrefs: () => read<LangPrefs | null>(K.prefs, null),
  savePrefs: (p: LangPrefs) => write(K.prefs, p),
  loadParent: () => read<ParentSettings>(K.parent, DEFAULT_PARENT),
  saveParent: (p: ParentSettings) => write(K.parent, p),
  loadUsage: (childId: string) => read<UsageLog>(K.usage(childId), { days: {}, sessions: [] }),
  saveUsage: (childId: string, u: UsageLog) => write(K.usage(childId), u),
  loadSync: (childId: string) => read<{ cursor: string | null; pending: unknown[] }>(K.sync(childId), { cursor: null, pending: [] }),
  saveSync: (childId: string, s: { cursor: string | null; pending: unknown[] }) => write(K.sync(childId), s),
  /** Account deletion / "forget this child": removes everything stored for the child. */
  async deleteChild(childId: string) {
    try { await AsyncStorage.multiRemove([K.world(childId), K.usage(childId), K.sync(childId)]); } catch { /* ignore */ }
  },
  async wipeAll(childIds: string[]) {
    const keys = [K.profiles, K.prefs, K.parent, ...childIds.flatMap((id) => [K.world(id), K.usage(id), K.sync(id)])];
    try { await AsyncStorage.multiRemove(keys); } catch { /* ignore */ }
  },
};

/** SHA-256 for the parent PIN without a native dependency (short input, so a small pure implementation is fine). */
export async function hashPin(pin: string): Promise<string> {
  return sha256Hex(`dadu-pin:${pin}`);
}

// Minimal SHA-256 (public domain algorithm) for PINs only; not for passwords on the server.
function sha256Hex(message: string): string {
  const K256 = [0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da, 0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070, 0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2];
  const bytes: number[] = [];
  for (const ch of unescape(encodeURIComponent(message))) bytes.push(ch.charCodeAt(0));
  const bitLen = bytes.length * 8;
  bytes.push(0x80);
  while (bytes.length % 64 !== 56) bytes.push(0);
  for (let i = 7; i >= 0; i--) bytes.push(i >= 4 ? 0 : (bitLen >>> (i * 8)) & 0xff);
  let h = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];
  const rotr = (x: number, n: number) => (x >>> n) | (x << (32 - n));
  for (let off = 0; off < bytes.length; off += 64) {
    const w = new Array<number>(64);
    for (let i = 0; i < 16; i++) w[i] = (bytes[off + i * 4] << 24) | (bytes[off + i * 4 + 1] << 16) | (bytes[off + i * 4 + 2] << 8) | bytes[off + i * 4 + 3];
    for (let i = 16; i < 64; i++) {
      const s0 = rotr(w[i - 15], 7) ^ rotr(w[i - 15], 18) ^ (w[i - 15] >>> 3);
      const s1 = rotr(w[i - 2], 17) ^ rotr(w[i - 2], 19) ^ (w[i - 2] >>> 10);
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) | 0;
    }
    let [a, b, c, d, e, f, g, hh] = h;
    for (let i = 0; i < 64; i++) {
      const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
      const ch = (e & f) ^ (~e & g);
      const t1 = (hh + S1 + ch + K256[i] + w[i]) | 0;
      const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const t2 = (S0 + maj) | 0;
      hh = g; g = f; f = e; e = (d + t1) | 0; d = c; c = b; b = a; a = (t1 + t2) | 0;
    }
    h = [(h[0] + a) | 0, (h[1] + b) | 0, (h[2] + c) | 0, (h[3] + d) | 0, (h[4] + e) | 0, (h[5] + f) | 0, (h[6] + g) | 0, (h[7] + hh) | 0];
  }
  return h.map((x) => (x >>> 0).toString(16).padStart(8, '0')).join('');
}
