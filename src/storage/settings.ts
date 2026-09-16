import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppSettings } from '../types';

const SETTINGS_KEY = 'puzzlefocus.settings.v1';

export const DEFAULT_SETTINGS: AppSettings = {
  notificationsEnabled: false,
  soundEnabled: true,
};

export async function loadSettings(): Promise<AppSettings> {
  try {
    const raw = await AsyncStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}
