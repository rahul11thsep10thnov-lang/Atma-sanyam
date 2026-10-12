// Screens read a space, the collection and the coin balance through these
// hooks, so a change in one place shows up everywhere without a reload.
import { useCallback, useEffect, useState } from 'react';
import { SpaceId } from './packTypes';
import { SpaceState } from './model';
import { loadSpace, saveSpace, subscribeSpace } from './repository';
import { loadRewards, RewardState, saveRewards } from './rewards';
import { counts } from '../collection/model';
import { loadCollection, subscribeCollection } from '../collection/repository';

export function useSpace(space: SpaceId): [SpaceState | null, (next: SpaceState) => void] {
  const [state, setState] = useState<SpaceState | null>(null);
  useEffect(() => {
    let alive = true;
    setState(null);
    loadSpace(space).then((s) => alive && setState(s));
    const unsub = subscribeSpace((id, s) => alive && id === space && setState(s));
    return () => {
      alive = false;
      unsub();
    };
  }, [space]);
  const save = useCallback((next: SpaceState) => {
    setState(next);
    void saveSpace(next);
  }, []);
  return [state, save];
}

export function useRewards(refreshKey?: unknown): [RewardState | null, (next: RewardState) => Promise<void>] {
  const [rewards, setRewards] = useState<RewardState | null>(null);
  useEffect(() => {
    let alive = true;
    loadRewards().then((r) => alive && setRewards(r));
    return () => {
      alive = false;
    };
  }, [refreshKey]);
  const save = useCallback(async (next: RewardState) => {
    setRewards(next);
    await saveRewards(next);
  }, []);
  return [rewards, save];
}

/** Finished artworks hanging nowhere: what leans on the garden's rack. */
export function useRackCount(): number {
  const [n, setN] = useState(0);
  useEffect(() => {
    let alive = true;
    loadCollection().then((c) => alive && setN(counts(c).stored));
    const unsub = subscribeCollection((c) => alive && setN(counts(c).stored));
    return () => {
      alive = false;
      unsub();
    };
  }, []);
  return n;
}
