// Local persistence for the collection, with a subscription so the museum,
// the spaces and the galleries show the same artworks. The three built-in
// pictures of the first balcony and anything finished under the old
// cumulative jigsaw are carried over as artworks of size 1.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';
import { ARTWORKS } from '../spaces/catalog';
import { loadSpace } from '../spaces/repository';
import { ArtworkRecord, CollectionState, INITIAL_COLLECTION, DEFAULT_FRAME } from './model';

const KEY = 'focus.collection.v1';
const OLD_ART_KEY = 'focus.art.v2';

let memo: CollectionState | null = null;
const listeners = new Set<(c: CollectionState) => void>();

async function migrateOldArt(): Promise<CollectionState> {
  const next: CollectionState = { ...INITIAL_COLLECTION, artworks: [] };
  try {
    const raw = await AsyncStorage.getItem(OLD_ART_KEY);
    if (!raw) return next;
    const old = JSON.parse(raw) as { completed?: string[]; binned?: string[] };
    const onBalcony = new Set((await loadSpace('balcony')).placed.map((p) => p.artId).filter((a): a is string => !!a));
    for (const id of old.completed ?? []) {
      const a = ARTWORKS.find((x) => x.id === id);
      if (!a) continue;
      const rec: ArtworkRecord = {
        id,
        title: a.title,
        category: 'nature',
        source: { kind: 'builtin', moduleId: a.image as number },
        aspect: a.aspect,
        tier: 1,
        minutes: 30,
        unlockedAt: Date.now(),
        frameId: DEFAULT_FRAME,
        home: onBalcony.has(id) ? 'balcony' : 'collection',
      };
      next.artworks.push(rec);
    }
  } catch {
    // nothing to carry over
  }
  return next;
}

export async function loadCollection(): Promise<CollectionState> {
  if (memo) return memo;
  try {
    const raw = await AsyncStorage.getItem(KEY);
    memo = raw ? { ...INITIAL_COLLECTION, ...(JSON.parse(raw) as Partial<CollectionState>) } : null;
  } catch {
    memo = null;
  }
  if (!memo) {
    memo = await migrateOldArt();
    await saveCollection(memo);
  }
  // the 3D garden that once hung artworks is gone: anything placed there returns to the collection
  if (memo.artworks.some((a) => a.home === 'garden')) {
    memo = { ...memo, artworks: memo.artworks.map((a) => (a.home === 'garden' ? { ...a, home: 'collection' as const } : a)) };
    await saveCollection(memo);
  }
  return memo;
}

export async function saveCollection(c: CollectionState): Promise<CollectionState> {
  memo = c;
  listeners.forEach((l) => l(c));
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(c));
  } catch {
    // best effort
  }
  return c;
}

export async function updateCollection(fn: (c: CollectionState) => CollectionState): Promise<CollectionState> {
  return saveCollection(fn(await loadCollection()));
}

export function subscribeCollection(listener: (c: CollectionState) => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useCollection(): [CollectionState | null, (next: CollectionState) => void] {
  const [c, setC] = useState<CollectionState | null>(memo);
  useEffect(() => {
    let alive = true;
    loadCollection().then((x) => alive && setC(x));
    const unsub = subscribeCollection((x) => alive && setC(x));
    return () => {
      alive = false;
      unsub();
    };
  }, []);
  const save = useCallback((next: CollectionState) => {
    setC(next);
    void saveCollection(next);
  }, []);
  return [c, save];
}
