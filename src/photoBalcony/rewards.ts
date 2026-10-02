// Coins and lifetime focus. One coin per focused minute plus small
// milestone bonuses. Coins are spent in the balcony store only.
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface RewardState {
  schemaVersion: 1;
  coins: number;
  lifetimeMinutes: number;
  completedSessions: number;
  pausedSessions: number;
  claimedMilestoneIds: string[];
}

export const INITIAL_REWARDS: RewardState = {
  schemaVersion: 1,
  coins: 0,
  lifetimeMinutes: 0,
  completedSessions: 0,
  pausedSessions: 0,
  claimedMilestoneIds: [],
};

export interface Milestone {
  id: string;
  minutes: number;
  coins: number;
  title: string;
}

export const MILESTONES: Milestone[] = [
  { id: 'm-10', minutes: 10, coins: 20, title: 'First focus' },
  { id: 'm-60', minutes: 60, coins: 40, title: 'One hour' },
  { id: 'm-300', minutes: 300, coins: 100, title: 'Five hours' },
  { id: 'm-600', minutes: 600, coins: 200, title: 'Ten hours' },
  { id: 'm-1500', minutes: 1500, coins: 400, title: 'Deep worker' },
];

export function milestonesCrossed(before: number, after: number, claimed: string[]): Milestone[] {
  return MILESTONES.filter((m) => !claimed.includes(m.id) && m.minutes > before && m.minutes <= after);
}

const KEY = 'focus.balcony.rewards.v2';
const LEGACY_KEY = 'focus.balconyWorld.rewards.v1';

export async function loadRewards(): Promise<RewardState> {
  try {
    const raw = (await AsyncStorage.getItem(KEY)) ?? (await AsyncStorage.getItem(LEGACY_KEY));
    if (!raw) return INITIAL_REWARDS;
    return { ...INITIAL_REWARDS, ...(JSON.parse(raw) as Partial<RewardState>), schemaVersion: 1 };
  } catch {
    return INITIAL_REWARDS;
  }
}

export async function saveRewards(state: RewardState): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // best effort
  }
}
