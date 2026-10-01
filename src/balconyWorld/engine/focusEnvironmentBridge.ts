import AsyncStorage from '@react-native-async-storage/async-storage';
import { FocusEnvironmentEngine } from './FocusEnvironmentEngine';

/**
 * One engine instance for the whole app, so a focus session on the timer
 * screen and the balcony scene share the same living-world state. The
 * balcony isn't rendering while a session runs, so a session's outcome is
 * parked here (and on disk, in case the app is killed on the way back) and
 * the sunlight reward plays the next time the balcony is on screen.
 */
export const focusEnvironment = new FocusEnvironmentEngine();

const PENDING_KEY = 'focus.environment.pendingOutcome.v1';

export interface PendingOutcome {
  outcome: 'completed' | 'failed';
  minutes: number;
  at: number;
}

let pending: PendingOutcome | null = null;

export async function recordSessionOutcome(outcome: PendingOutcome['outcome'], minutes: number): Promise<void> {
  pending = { outcome, minutes, at: Date.now() };
  try {
    await AsyncStorage.setItem(PENDING_KEY, JSON.stringify(pending));
  } catch {
    // in-memory copy still plays the reward this launch
  }
}

/** Returns and clears the parked outcome. Outcomes older than a day are dropped — a stale reward would feel random. */
export async function consumePendingOutcome(): Promise<PendingOutcome | null> {
  let found = pending;
  if (!found) {
    try {
      const raw = await AsyncStorage.getItem(PENDING_KEY);
      if (raw) found = JSON.parse(raw) as PendingOutcome;
    } catch {
      found = null;
    }
  }
  pending = null;
  AsyncStorage.removeItem(PENDING_KEY).catch(() => undefined);
  if (!found || Date.now() - found.at > 24 * 60 * 60 * 1000) return null;
  return found;
}
