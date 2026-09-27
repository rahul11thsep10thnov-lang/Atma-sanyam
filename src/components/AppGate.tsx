// Applies admin-controlled gates before the normal app: maintenance mode and
// a minimum supported version. A newer (optional) version shows a small,
// dismissible banner instead.
import React, { useState } from 'react';
import { Linking, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius, spacing, typography, buttonHeight } from '../theme/colors';
import { useRemoteConfig } from '../context/RemoteConfigContext';
import { appVersion, compareVersions } from '../services/appInfo';

function storeUrl(cfg: { iosStoreUrl: string; androidStoreUrl: string }) {
  return Platform.OS === 'ios' ? cfg.iosStoreUrl : Platform.OS === 'android' ? cfg.androidStoreUrl : '';
}

function FullScreenMessage({ title, message, action }: { title: string; message: string; action?: { label: string; onPress: () => void } }) {
  return (
    <View style={styles.full}>
      <Text style={styles.title} accessibilityRole="header">{title}</Text>
      <Text style={styles.message}>{message}</Text>
      {action && (
        <Pressable style={styles.btn} onPress={action.onPress} accessibilityRole="button">
          <Text style={styles.btnText}>{action.label}</Text>
        </Pressable>
      )}
    </View>
  );
}

export function AppGate({ children }: { children: React.ReactNode }) {
  const { config, refresh } = useRemoteConfig();
  const insets = useSafeAreaInsets();
  const [dismissedUpdate, setDismissedUpdate] = useState(false);

  if (config.maintenance.enabled) {
    return <FullScreenMessage title="Back soon" message={config.maintenance.message} action={{ label: 'Check again', onPress: () => void refresh() }} />;
  }

  const url = storeUrl(config.appVersion);
  if (compareVersions(appVersion, config.appVersion.minimumVersion) < 0) {
    return (
      <FullScreenMessage
        title="Update required"
        message={`${config.appVersion.updateMessage}\nThis version (${appVersion}) is no longer supported.`}
        action={url ? { label: 'Update now', onPress: () => void Linking.openURL(url) } : undefined}
      />
    );
  }

  const updateAvailable = !dismissedUpdate && compareVersions(appVersion, config.appVersion.latestVersion) < 0;
  return (
    <View style={{ flex: 1 }}>
      {children}
      {updateAvailable && (
        <View style={[styles.banner, { top: insets.top + 8 }]} accessibilityRole="alert">
          <Text style={styles.bannerText} numberOfLines={2}>{config.appVersion.updateMessage}</Text>
          {!!url && (
            <Pressable onPress={() => void Linking.openURL(url)} hitSlop={8} accessibilityRole="link">
              <Text style={styles.bannerAction}>Update</Text>
            </Pressable>
          )}
          <Pressable onPress={() => setDismissedUpdate(true)} hitSlop={8} accessibilityRole="button" accessibilityLabel="Dismiss update notice">
            <Text style={styles.bannerClose}>✕</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  full: { flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center', padding: 32 },
  title: { ...typography.heading, color: colors.text, textAlign: 'center' },
  message: { ...typography.body, fontSize: 16, lineHeight: 23, color: colors.textSecondary, textAlign: 'center', marginTop: 12, marginBottom: 28 },
  btn: { height: buttonHeight, paddingHorizontal: 28, borderRadius: radius.card, backgroundColor: colors.primary, justifyContent: 'center' },
  btnText: { ...typography.title, color: colors.white },
  banner: {
    position: 'absolute',
    left: spacing.screenPadding,
    right: spacing.screenPadding,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.card,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 10,
    paddingHorizontal: 14,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  bannerText: { ...typography.body, color: colors.text, flex: 1 },
  bannerAction: { ...typography.body, color: colors.primary, fontWeight: '700' },
  bannerClose: { color: colors.textSecondary, fontSize: 14 },
});
