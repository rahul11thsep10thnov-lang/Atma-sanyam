// Session history. The newest sessions live under one key; older ones move
// to archive chunks of ARCHIVE_CHUNK, so no single stored value grows past
// what Android's AsyncStorage can read back (about 2 MB). Reads and writes go
// through storage/safeStore, so a list that can't be read is never replaced.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SessionRecord } from '../types';
import { readJson, writeJson } from './safeStore';

const HISTORY_KEY = 'puzzlefocus.history.v1';
const ARCHIVE_COUNT_KEY = 'puzzlefocus.history.archives';
const archiveKey = (n: number) => `puzzlefocus.history.archive.${n}`;

/** The newest sessions kept under HISTORY_KEY before the oldest move to an archive chunk. */
export const RECENT_MAX = 400;
export const ARCHIVE_CHUNK = 200;

const byNewest = (a: SessionRecord, b: SessionRecord) => b.startedAt - a.startedAt;

async function archiveCount(): Promise<{ count: number; ok: boolean }> {
  const read = await readJson<number>(ARCHIVE_COUNT_KEY);
  const n = Number(read.value);
  return { count: Number.isInteger(n) && n > 0 ? n : 0, ok: read.ok };
}

export async function loadHistory(): Promise<SessionRecord[]> {
  const recent = await readJson<SessionRecord[]>(HISTORY_KEY);
  const { count } = await archiveCount();
  const chunks = await Promise.all(Array.from({ length: count }, (_, i) => readJson<SessionRecord[]>(archiveKey(i))));
  // A record can be in two places if the app stopped while moving a chunk.
  const seen = new Set<string>();
  const all: SessionRecord[] = [];
  for (const list of [recent.value, ...chunks.map((c) => c.value)]) {
    if (!Array.isArray(list)) continue;
    for (const r of list) {
      if (!r || seen.has(r.id)) continue;
      seen.add(r.id);
      all.push(r);
    }
  }
  return all.sort(byNewest);
}

export async function saveSessionRecord(record: SessionRecord): Promise<void> {
  const read = await readJson<SessionRecord[]>(HISTORY_KEY);
  // HISTORY_KEY is held if it couldn't be read; writeJson then skips.
  let recent = [record, ...(Array.isArray(read.value) ? read.value.filter((r) => r && r.id !== record.id) : [])].sort(byNewest);
  if (recent.length > RECENT_MAX) {
    const archives = await archiveCount();
    let count = archives.count;
    // Move the oldest out in chunks: write the chunk, then the count, then the
    // shorter list. Stopping anywhere in between leaves duplicates (which
    // loadHistory drops), never a gap.
    while (archives.ok && recent.length > RECENT_MAX) {
      const chunk = recent.slice(recent.length - ARCHIVE_CHUNK);
      if (!(await writeJson(archiveKey(count), chunk))) break;
      if (!(await writeJson(ARCHIVE_COUNT_KEY, count + 1))) break;
      count += 1;
      recent = recent.slice(0, recent.length - ARCHIVE_CHUNK);
    }
  }
  await writeJson(HISTORY_KEY, recent);
}

export async function clearHistory(): Promise<void> {
  const { count } = await archiveCount();
  await AsyncStorage.multiRemove([HISTORY_KEY, ARCHIVE_COUNT_KEY, ...Array.from({ length: count }, (_, i) => archiveKey(i))]);
}
