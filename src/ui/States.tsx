// Loading, empty, error and offline states, in both identities.
import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { AppText } from './AppText';
import { Button } from './Button';
import { Icon, IconName } from './Icon';
import { EmojiDisc } from './Playful';
import { space } from '../theme/spacing';
import { useTheme } from '../theme/ThemeContext';
import { t } from '../i18n';

export function LoadingState({ label }: { label?: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.center} accessibilityRole="progressbar" accessibilityLabel={label ?? t('common.loading')}>
      <ActivityIndicator size="large" color={colors.primary} />
      <AppText variant="bodySmall" tone="muted" style={{ marginTop: space.md }}>
        {label ?? t('common.loading')}
      </AppText>
    </View>
  );
}

export function EmptyState({ title, body, emoji, icon, action }: { title: string; body?: string; emoji?: string; icon?: IconName; action?: { label: string; onPress: () => void } }) {
  const { colors, mode } = useTheme();
  return (
    <View style={styles.center}>
      {emoji ? <EmojiDisc emoji={emoji} color={colors.primary} size={88} /> : <View style={[styles.disc, { backgroundColor: colors.primarySoft }]}><Icon name={icon ?? 'sparkles'} size="lg" color="primary" /></View>}
      <AppText variant={mode === 'player' ? 'heading' : 'dashHeading'} align="center" style={{ marginTop: space.lg }}>
        {title}
      </AppText>
      {body ? (
        <AppText variant="body" tone="secondary" align="center" style={{ marginTop: space.sm }}>
          {body}
        </AppText>
      ) : null}
      {action ? <Button label={action.label} onPress={action.onPress} style={{ marginTop: space.xl }} /> : null}
    </View>
  );
}

export function ErrorState({ message, onRetry }: { message?: string; onRetry?: () => void }) {
  return <EmptyState title={t('common.error')} body={message} emoji="🙈" action={onRetry ? { label: t('common.retry'), onPress: onRetry } : undefined} />;
}

export function OfflineBanner({ visible }: { visible: boolean }) {
  const { colors } = useTheme();
  if (!visible) return null;
  return (
    <View style={[styles.banner, { backgroundColor: colors.warningSoft }]} accessibilityRole="alert">
      <Icon name="wifiOff" size="sm" color="warning" />
      <AppText variant="bodySmall" style={{ flex: 1 }}>
        {t('common.offline')}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: space.xxxl },
  disc: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center' },
  banner: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingHorizontal: space.lg, paddingVertical: space.sm, borderRadius: 14, marginBottom: space.md },
});
