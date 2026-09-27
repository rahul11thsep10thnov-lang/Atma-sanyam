// Session tokens go in the OS keychain/keystore via expo-secure-store.
// On web (dev/testing only) SecureStore isn't available, so fall back to
// AsyncStorage there.
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

const useSecure = Platform.OS !== 'web';

export async function secureGet(key: string): Promise<string | null> {
  try {
    return useSecure ? await SecureStore.getItemAsync(key) : await AsyncStorage.getItem(key);
  } catch {
    return null;
  }
}

export async function secureSet(key: string, value: string): Promise<void> {
  if (useSecure) await SecureStore.setItemAsync(key, value);
  else await AsyncStorage.setItem(key, value);
}

export async function secureDelete(key: string): Promise<void> {
  try {
    if (useSecure) await SecureStore.deleteItemAsync(key);
    else await AsyncStorage.removeItem(key);
  } catch {
    // already gone
  }
}
