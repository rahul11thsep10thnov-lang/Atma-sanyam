// Screens read a space, the art wall and the coin balance through these
// hooks, so a change in one place shows up everywhere without a reload.
import { useCallback, useEffect, useState } from 'react';
import { SpaceId } from './packTypes';
import { ArtState, SpaceState } from './model';
import { loadArt, loadSpace, rackCount, saveArt, saveSpace, subscribeArt, subscribeSpace } from './repository';
import { loadRewards, RewardState, saveRewards } from './rewards';

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

export function useArt(): [ArtState | null, (next: ArtState) => void] {
  const [art, setArt] = useState<ArtState | null>(null);
  useEffect(() => {
    let alive = true;
    loadArt().then((a) => alive && setArt(a));
    const unsub = subscribeArt((a) => alive && setArt(a));
    return () => {
      alive = false;
      unsub();
    };
  }, []);
  const save = useCallback((next: ArtState) => {
    setArt(next);
    void saveArt(next);
  }, []);
  return [art, save];
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
export function useRackCount(deps: unknown[]): number {
  const [n, setN] = useState(0);
  useEffect(() => {
    let alive = true;
    rackCount().then((c) => alive && setN(c));
    const unsubA = subscribeArt(() => rackCount().then((c) => alive && setN(c)));
    const unsubS = subscribeSpace(() => rackCount().then((c) => alive && setN(c)));
    return () => {
      alive = false;
      unsubA();
      unsubS();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return n;
}
