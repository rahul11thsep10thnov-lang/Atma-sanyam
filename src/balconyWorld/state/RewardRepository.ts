import AsyncStorage from '@react-native-async-storage/async-storage';
import { INITIAL_REWARD_STATE, RewardState } from './RewardState';

const KEY = 'focus.balconyWorld.rewards.v1';

export async function loadRewards(): Promise<RewardState> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return INITIAL_REWARD_STATE;
    const parsed = JSON.parse(raw) as Partial<RewardState>;
    return { ...INITIAL_REWARD_STATE, ...parsed, schemaVersion: 1 };
  } catch {
    return INITIAL_REWARD_STATE;
  }
}

export async function saveRewards(state: RewardState): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // best effort
  }
}

export async function clearRewards(): Promise<void> {
  await AsyncStorage.removeItem(KEY);
}
