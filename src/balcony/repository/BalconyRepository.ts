import AsyncStorage from '@react-native-async-storage/async-storage';
import { BalconyState } from '../types';
import { createInitialEnvironmentState } from '../engine/EnvironmentManager';
import { createInitialArtworkState, createInitialPuzzleState } from '../config/artworkConfig';
import { OBJECT_CATALOG, createObjectState } from '../config/objectCatalog';
import { REWARD_TABLE } from '../config/rewardConfig';

const BALCONY_KEY = 'focus.balcony.v1';
const SCHEMA_VERSION = 1;

/** The balcony starts almost empty (section 1) — a bare wall, floor and
 * railing, nothing unlocked yet. Everything in `objects` exists already so
 * its unlock threshold can be shown in the Collection view before it's
 * earned, but `isUnlocked`/`isPlaced` stay false until the reward table
 * says otherwise. */
export function createInitialState(): BalconyState {
  const objects = Object.values(OBJECT_CATALOG).map((def) => {
    const state = createObjectState(def);
    const rule = REWARD_TABLE.find((r) => r.unlockObjectId === def.id);
    return rule ? { ...state, unlockRequirement: rule.minutes } : state;
  });

  return {
    schemaVersion: SCHEMA_VERSION,
    environment: createInitialEnvironmentState(),
    reward: { totalFocusMinutes: 0, claimedRewardIds: [] },
    plants: [],
    objects,
    artwork: createInitialArtworkState(),
    puzzle: createInitialPuzzleState(),
    activePlantId: null,
  };
}

export async function loadBalconyState(): Promise<BalconyState> {
  try {
    const raw = await AsyncStorage.getItem(BALCONY_KEY);
    if (!raw) return createInitialState();
    const parsed = JSON.parse(raw) as BalconyState;
    if (parsed.schemaVersion !== SCHEMA_VERSION) return createInitialState();
    return parsed;
  } catch {
    return createInitialState();
  }
}

export async function saveBalconyState(state: BalconyState): Promise<void> {
  try {
    await AsyncStorage.setItem(BALCONY_KEY, JSON.stringify(state));
  } catch {
    // Best-effort — a save failure just means this update isn't persisted;
    // the in-memory engine state (and the next successful save) still work.
  }
}

export async function clearBalconyState(): Promise<void> {
  await AsyncStorage.removeItem(BALCONY_KEY);
}
