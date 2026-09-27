// expo-notifications throws synchronously on import on Android inside Expo Go
// (push-token auto-registration was removed from Expo Go in SDK 53+). A static
// `import * as Notifications from 'expo-notifications'` therefore crashes the
// whole app on load there. Loading it lazily and catching the failure lets the
// app run normally with notifications simply disabled in that environment —
// they still work fine in a real device/EAS build.
type NotificationsModule = typeof import('expo-notifications');

let modulePromise: Promise<NotificationsModule | null> | null = null;

function loadNotifications(): Promise<NotificationsModule | null> {
  if (!modulePromise) {
    modulePromise = import('expo-notifications').catch(() => null);
  }
  return modulePromise;
}

export async function setNotificationHandler(): Promise<void> {
  try {
    const Notifications = await loadNotifications();
    Notifications?.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: false,
        shouldSetBadge: false,
      }),
    });
  } catch {
    // notifications unavailable in this environment; app continues without them
  }
}

export async function requestNotificationPermissionsAsync(): Promise<{ granted: boolean }> {
  try {
    const Notifications = await loadNotifications();
    if (!Notifications) return { granted: false };
    const result = await Notifications.requestPermissionsAsync();
    return { granted: result.granted };
  } catch {
    return { granted: false };
  }
}

export async function scheduleWarningNotificationAsync(body: string): Promise<string | null> {
  try {
    const Notifications = await loadNotifications();
    if (!Notifications) return null;
    return await Notifications.scheduleNotificationAsync({
      content: { title: 'Still there?', body },
      trigger: null,
    });
  } catch {
    return null;
  }
}

export async function cancelScheduledNotificationAsync(id: string): Promise<void> {
  try {
    const Notifications = await loadNotifications();
    await Notifications?.cancelScheduledNotificationAsync(id);
  } catch {
    // ignore
  }
}

// ---- Remote (push) notifications -------------------------------------------
// Push tokens can't be obtained in Expo Go (removed in SDK 53+), only in a
// development or store build. Callers get a readable reason instead of a crash.
export async function getExpoPushTokenAsync(projectId: string): Promise<{ token: string } | { error: string }> {
  try {
    const Notifications = await loadNotifications();
    if (!Notifications) return { error: 'Notifications are unavailable on this device.' };
    const perm = await Notifications.requestPermissionsAsync();
    if (!perm.granted) return { error: 'Notifications are turned off for FOCUS in your device settings.' };
    const { Platform } = await import('react-native');
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'News & announcements',
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }
    const result = await Notifications.getExpoPushTokenAsync({ projectId });
    return { token: result.data };
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Could not register for notifications.' };
  }
}
