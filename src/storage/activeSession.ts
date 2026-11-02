// The focus session that is running right now, written once its free first
// seconds are over and removed whenever the session ends in the app. If the
// app is closed from Recents (or the system stops it) mid-session, the note
// is still there at the next launch, and the session is settled then as
// having left the app (spaces/focusEngine settleInterruptedSession).
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GridDims, ImageRef } from '../types';

const KEY = 'focus.activeSession.v1';

export interface ActiveSessionNote {
  id: string;
  startedAt: number;
  durationMinutes: number;
  grid: GridDims;
  image: ImageRef;
  /** Set for a group focus: the server settles its rewards and penalties. */
  groupSessionId?: string;
}

export async function noteActiveSession(note: ActiveSessionNote): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(note));
  } catch {
    // without the note a closed app just isn't settled later
  }
}

export async function clearActiveSession(): Promise<void> {
  try {
    await AsyncStorage.removeItem(KEY);
  } catch {
    // a stale note is settled once at the next launch at worst
  }
}

/** The note left by a session that never ended in the app, removed as it is read. */
export async function takeActiveSession(): Promise<ActiveSessionNote | null> {
  let note: ActiveSessionNote | null = null;
  try {
    const raw = await AsyncStorage.getItem(KEY);
    note = raw ? (JSON.parse(raw) as ActiveSessionNote) : null;
  } catch {
    note = null;
  }
  if (note) await clearActiveSession();
  return note && typeof note.id === 'string' && note.image ? note : null;
}
