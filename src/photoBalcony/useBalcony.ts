// Screens read the balcony and the coin balance through these hooks, so a
// purchase in one place shows up everywhere without a reload.
import { useCallback, useEffect, useState } from 'react';
import { BalconyState } from './model';
import { loadBalcony, saveBalcony, subscribeBalcony } from './repository';
import { loadRewards, RewardState, saveRewards } from './rewards';

export function useBalcony(): [BalconyState | null, (next: BalconyState) => void] {
  const [state, setState] = useState<BalconyState | null>(null);
  useEffect(() => {
    let alive = true;
    loadBalcony().then((s) => alive && setState(s));
    const unsub = subscribeBalcony((s) => alive && setState(s));
    return () => {
      alive = false;
      unsub();
    };
  }, []);
  const save = useCallback((next: BalconyState) => {
    setState(next);
    void saveBalcony(next);
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
