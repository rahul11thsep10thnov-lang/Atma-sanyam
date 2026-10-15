// Registers this install with the backend (links it to the signed-in
// guardian, if any) and manages the push token for guardian notifications.
import Constants from 'expo-constants';
import { isRunningInExpoGo } from 'expo';
import { isBackendConfigured } from '../config/env';
import { getExpoPushTokenAsync } from '../notifications/safeNotifications';
import { apiRequest, getAuthToken } from './apiClient';
import { appVersion, platform } from './appInfo';
import { getInstallId } from './installId';

export async function syncDevice(): Promise<void> {
  if (!isBackendConfigured) return;
  try {
    await apiRequest('/v1/devices', {
      method: 'POST',
      as: getAuthToken('guardian') ? 'guardian' : false,
      body: { installId: await getInstallId(), platform, appVersion },
    });
  } catch {
    // best effort; retried on next launch / sign-in
  }
}

function projectId(): string | null {
  const fromConfig = (Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined)?.eas?.projectId;
  return fromConfig ?? Constants.easConfig?.projectId ?? null;
}

export async function setPushEnabled(enable: boolean): Promise<{ ok: true } | { ok: false; reason: string }> {
  if (!isBackendConfigured) return { ok: false, reason: 'Notifications are not available in this build.' };
  const installId = await getInstallId();
  const as = getAuthToken('guardian') ? ('guardian' as const) : false;
  if (!enable) {
    try {
      await apiRequest('/v1/devices', { method: 'POST', as, body: { installId, platform, appVersion, pushToken: null, pushEnabled: false } });
      return { ok: true };
    } catch (e) {
      return { ok: false, reason: e instanceof Error ? e.message : 'Could not update notifications.' };
    }
  }
  if (platform === 'web') return { ok: false, reason: 'Push notifications are only available in the mobile app.' };
  if (isRunningInExpoGo()) {
    return { ok: false, reason: 'Push notifications need the installed LoJi app — they don’t work inside Expo Go.' };
  }
  const id = projectId();
  if (!id) return { ok: false, reason: 'This build is missing its EAS project id, so push is unavailable.' };
  const result = await getExpoPushTokenAsync(id);
  if ('error' in result) return { ok: false, reason: result.error };
  try {
    await apiRequest('/v1/devices', { method: 'POST', as, body: { installId, platform, appVersion, pushToken: result.token, pushEnabled: true } });
    return { ok: true };
  } catch (e) {
    return { ok: false, reason: e instanceof Error ? e.message : 'Could not register for notifications.' };
  }
}
