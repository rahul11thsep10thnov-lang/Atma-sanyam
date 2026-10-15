import React from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText } from '../../ui/AppText';
import { useTheme } from '../../theme/ThemeContext';
import type { LiveStatus } from '../../types';
import { t } from '../../i18n';

export function formatAgo(iso: string | null | undefined): string {
  if (!iso) return '—';
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.round(diff / 60_000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h ago`;
  return new Date(iso).toLocaleDateString();
}

export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}m ${String(s).padStart(2, '0')}s` : `${s}s`;
}

export function LiveBadge({ live }: { live: LiveStatus }) {
  const { colors } = useTheme();
  const playing = !!live.currentSession;
  const color = playing ? colors.success : live.online ? colors.accent : colors.textMuted;
  const label = playing ? `${t('dash.playingNow')} · ${live.currentSession!.gameName}` : live.online ? t('dash.online') : live.lastActivityAt ? t('dash.lastSeen', { when: formatAgo(live.lastActivityAt) }) : t('dash.offline');
  return (
    <View style={styles.row}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <AppText variant="bodySmall" tone="secondary" numberOfLines={1} style={{ flex: 1 }}>
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
});
