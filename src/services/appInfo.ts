import { Platform } from 'react-native';
import Constants from 'expo-constants';

export const appVersion: string = Constants.expoConfig?.version ?? '1.0.0';
export const platform: 'ios' | 'android' | 'web' = Platform.OS === 'ios' || Platform.OS === 'android' ? Platform.OS : 'web';

// Numeric semver compare: returns <0 if a<b, 0 if equal, >0 if a>b.
export function compareVersions(a: string, b: string): number {
  const pa = a.split('.').map((n) => parseInt(n, 10) || 0);
  const pb = b.split('.').map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (d !== 0) return d;
  }
  return 0;
}
