import AsyncStorage from '@react-native-async-storage/async-storage';
import { SessionRecord } from '../types';

const HISTORY_KEY = 'puzzlefocus.history.v1';

export async function loadHistory(): Promise<SessionRecord[]> {
  try {
    const raw = await AsyncStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SessionRecord[];
    return parsed.sort((a, b) => b.startedAt - a.startedAt);
  } catch {
    return [];
  }
}

export async function saveSessionRecord(record: SessionRecord): Promise<void> {
  const existing = await loadHistory();
  const next = [record, ...existing];
  await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(next));
}

export async function clearHistory(): Promise<void> {
  await AsyncStorage.removeItem(HISTORY_KEY);
}
