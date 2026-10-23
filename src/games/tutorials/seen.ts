// Remembers locally which tutorials this device has shown, so the
// first-time tutorial appears once even before the server reply arrives.
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'loji.tutorialsSeen.v1';

async function read(): Promise<Record<string, number>> {
  try {
    return JSON.parse((await AsyncStorage.getItem(KEY)) ?? '{}') as Record<string, number>;
  } catch {
    return {};
  }
}

export async function wasTutorialSeen(gameId: string): Promise<boolean> {
  return gameId in (await read());
}

export async function markTutorialSeen(gameId: string): Promise<void> {
  try {
    const all = await read();
    all[gameId] = Date.now();
    await AsyncStorage.setItem(KEY, JSON.stringify(all));
  } catch {
    // best effort
  }
}
