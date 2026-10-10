// Applies admin-controlled gates before the normal app: maintenance mode and
// a minimum supported version. A newer (optional) version shows a small,
// dismissible banner instead.
import React, { useState } from 'react';
import { Linking, Platform, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRemoteConfig } from '../context/RemoteConfigContext';
import { appVersion, compareVersions } from '../services/appInfo';
import { AppText } from '../ui/AppText';
import { Button, IconButton } from '../ui/Button';
import { Card } from '../ui/Card';
import { Icon, IconName } from '../ui/Icon';
import { space } from '../theme/spacing';
import { useTheme } from '../theme/ThemeContext';
import { t } from '../i18n';

function storeUrl(cfg: { iosStoreUrl: string; androidStoreUrl: string }) {
  return Platform.OS === 'ios' ? cfg.iosStoreUrl : Platform.OS === 'android' ? cfg.androidStoreUrl : '';
}

function FullScreenMessage({ icon, title, message, action }: { icon: IconName; title: string; message: string; action?: { label: string; onPress: () => void } }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.full, { backgroundColor: colors.background }]}>
      <View style={[styles.badge, { backgroundColor: colors.primarySoft }]}>
        <Icon name={icon} size="lg" color="primary" />
      </View>
      <AppText variant="heading" align="center" accessibilityRole="header">{title}</AppText>
      <AppText variant="body" tone="secondary" align="center" style={styles.message}>{message}</AppText>
      {action && <Button label={action.label} onPress={action.onPress} />}
    </View>
  );
}

export function AppGate({ children }: { children: React.ReactNode }) {
  const { config, refresh } = useRemoteConfig();
  const insets = useSafeAreaInsets();
  const [dismissedUpdate, setDismissedUpdate] = useState(false);

  if (config.maintenance.enabled) {
    return <FullScreenMessage icon="leaf" title={t('gate.backSoon')} message={config.maintenance.message} action={{ label: t('gate.checkAgain'), onPress: () => void refresh() }} />;
  }

  const url = storeUrl(config.appVersion);
  if (compareVersions(appVersion, config.appVersion.minimumVersion) < 0) {
    return (
      <FullScreenMessage
        icon="sparkles"
        title={t('gate.updateRequired')}
        message={`${config.appVersion.updateMessage}\n${t('gate.unsupported', { version: appVersion })}`}
        action={url ? { label: t('gate.updateNow'), onPress: () => void Linking.openURL(url) } : undefined}
      />
    );
  }

  const updateAvailable = !dismissedUpdate && compareVersions(appVersion, config.appVersion.latestVersion) < 0;
  return (
    <View style={{ flex: 1 }}>
      {children}
      {updateAvailable && (
        <Card variant="floating" padding="md" style={[styles.banner, { top: insets.top + space.sm }]} accessibilityRole="alert">
          <View style={styles.bannerRow}>
            <AppText variant="bodySmall" style={{ flex: 1 }} numberOfLines={2}>{config.appVersion.updateMessage}</AppText>
            {!!url && <Button label={t('gate.update')} size="sm" variant="tertiary" onPress={() => void Linking.openURL(url)} />}
            <IconButton icon="close" label={t('gate.dismiss')} size={32} onPress={() => setDismissedUpdate(true)} />
          </View>
        </Card>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  full: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: space.xxxl },
  badge: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', marginBottom: space.lg },
  message: { marginTop: space.sm, marginBottom: space.xxl },
  banner: { position: 'absolute', left: space.screen, right: space.screen },
  bannerRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
});
