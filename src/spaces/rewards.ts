// Coins, lifetime focus, milestones, the rewarded-ad ledger and
// membership. One coin per focused minute of a completed session.
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface RewardState {
  schemaVersion: 2;
  coins: number;
  lifetimeMinutes: number;
  completedSessions: number;
  pausedSessions: number;
  claimedMilestoneIds: string[];
  /** When rewarded ads were watched (ms), newest last; prunes itself. */
  adsWatchedAt: number[];
  /** Ad-free membership. */
  membership: { active: boolean; since: number | null; plan: 'monthly' | null };
}

export const INITIAL_REWARDS: RewardState = {
  schemaVersion: 2,
  coins: 0,
  lifetimeMinutes: 0,
  completedSessions: 0,
  pausedSessions: 0,
  claimedMilestoneIds: [],
  adsWatchedAt: [],
  membership: { active: false, since: null, plan: null },
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

// ---- rewarded ads -----------------------------------------------------------------
// Watching a 30-second ad earns coins, but watching ad after ad pays less:
// each ad within the last three hours multiplies the reward by 0.6, down
// to a floor of 2 coins.
export const AD_SECONDS = 30;
export const AD_BASE_COINS = 30;
export const AD_WINDOW_MS = 3 * 60 * 60 * 1000;
export const AD_DECAY = 0.6;
export const AD_MIN_COINS = 2;

export function adsInWindow(state: RewardState, now = Date.now()): number {
  return state.adsWatchedAt.filter((t) => now - t < AD_WINDOW_MS).length;
}

export function nextAdReward(state: RewardState, now = Date.now()): number {
  const n = adsInWindow(state, now);
  return Math.max(AD_MIN_COINS, Math.round(AD_BASE_COINS * Math.pow(AD_DECAY, n)));
}

export function creditAd(state: RewardState, now = Date.now()): { state: RewardState; coins: number } {
  const coins = nextAdReward(state, now);
  const watched = [...state.adsWatchedAt.filter((t) => now - t < AD_WINDOW_MS), now];
  return { state: { ...state, coins: state.coins + coins, adsWatchedAt: watched }, coins };
}

// ---- membership ------------------------------------------------------------------
export const MEMBERSHIP = { listRupees: 199, rupees: 30, period: 'month' as const };

const KEY = 'focus.rewards.v3';
const LEGACY_KEYS = ['focus.balcony.rewards.v2', 'focus.balconyWorld.rewards.v1'];

export async function loadRewards(): Promise<RewardState> {
  try {
    let raw = await AsyncStorage.getItem(KEY);
    if (!raw) {
      for (const k of LEGACY_KEYS) {
        raw = await AsyncStorage.getItem(k);
        if (raw) break;
      }
    }
    if (!raw) return INITIAL_REWARDS;
    return { ...INITIAL_REWARDS, ...(JSON.parse(raw) as Partial<RewardState>), schemaVersion: 2 };
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

export async function updateRewards(fn: (r: RewardState) => RewardState): Promise<RewardState> {
  const next = fn(await loadRewards());
  await saveRewards(next);
  return next;
}
