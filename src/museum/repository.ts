// Local persistence for the museum, with a subscription.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';
import { ArtworkRecord } from '../collection/model';
import { INITIAL_MUSEUM, MuseumObject, MuseumState, hangInMuseum, takeDownFromMuseum } from './model';
import { museumWidthOf } from './store';

const KEY = 'focus.museum.v1';

let memo: MuseumState | null = null;
const listeners = new Set<(m: MuseumState) => void>();

export async function loadMuseum(): Promise<MuseumState> {
  if (memo) return memo;
  let state: MuseumState | null = null;
  try {
    const raw = await AsyncStorage.getItem(KEY);
    state = raw ? (JSON.parse(raw) as MuseumState) : null;
  } catch {
    state = null;
  }
  if (!state || state.schemaVersion !== 1) state = { ...INITIAL_MUSEUM, version: Date.now() };
  memo = state;
  return state;
}

export async function saveMuseum(m: MuseumState): Promise<MuseumState> {
  const next = { ...m, version: Date.now() };
  memo = next;
  listeners.forEach((l) => l(next));
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // best effort
  }
  return next;
}

export async function updateMuseum(fn: (m: MuseumState) => MuseumState): Promise<MuseumState> {
  return saveMuseum(fn(await loadMuseum()));
}

export function subscribeMuseum(listener: (m: MuseumState) => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useMuseum(): [MuseumState | null, (next: MuseumState) => void] {
  const [m, setM] = useState<MuseumState | null>(memo);
  useEffect(() => {
    let alive = true;
    loadMuseum().then((x) => alive && setM(x));
    const unsub = subscribeMuseum((x) => alive && setM(x));
    return () => {
      alive = false;
      unsub();
    };
  }, []);
  const save = useCallback((next: MuseumState) => {
    setM(next);
    void saveMuseum(next);
  }, []);
  return [m, save];
}

/** Hang an artwork on the museum's walls; a new section opens when every
 * wall is full, so it always succeeds. */
export async function placeArtworkInMuseum(art: ArtworkRecord, artworks: (id: string) => ArtworkRecord | null): Promise<{ sectionId: number; opened: boolean }> {
  const m = await loadMuseum();
  const widthOf = (o: MuseumObject) => museumWidthOf(o, artworks);
  const r = hangInMuseum(m, art, widthOf);
  await saveMuseum(r.state);
  return { sectionId: r.sectionId, opened: r.opened };
}

export async function removeArtworkFromMuseum(artId: string): Promise<void> {
  await updateMuseum((m) => takeDownFromMuseum(m, artId));
}
