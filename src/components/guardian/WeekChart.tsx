// Seven bars of screen-time minutes with the daily limit as a dashed line.
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText } from '../../ui/AppText';
import { useTheme } from '../../theme/ThemeContext';

export function WeekChart({ days, limit }: { days: { day: string; minutes: number }[]; limit: number }) {
  const { colors } = useTheme();
  const today = new Date();
  const series = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today.getTime() - (6 - i) * 86_400_000);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    return { key, label: ['S', 'M', 'T', 'W', 'T', 'F', 'S'][d.getDay()]!, minutes: days.find((x) => x.day === key)?.minutes ?? 0 };
  });
  const max = Math.max(limit, ...series.map((s) => s.minutes), 10);
  const H = 96;
  return (
    <View accessibilityLabel={`Screen time this week: ${series.map((s) => `${s.label} ${s.minutes} minutes`).join(', ')}`}>
      <View style={[styles.chart, { height: H }]}>
        <View style={[styles.limit, { bottom: (limit / max) * H, borderColor: colors.danger }]} />
        {series.map((s) => (
          <View key={s.key} style={styles.col}>
            <View style={[styles.bar, { height: Math.max(3, (s.minutes / max) * H), backgroundColor: s.minutes > limit ? colors.danger : colors.primary }]} />
          </View>
        ))}
      </View>
      <View style={styles.labels}>
        {series.map((s) => (
          <AppText key={s.key} variant="caption" tone="muted" align="center" style={{ flex: 1 }}>
            {s.label}
          </AppText>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  chart: { flexDirection: 'row', alignItems: 'flex-end', gap: 6 },
  col: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', height: '100%' },
  bar: { width: '70%', borderRadius: 6 },
  limit: { position: 'absolute', left: 0, right: 0, borderTopWidth: 1, borderStyle: 'dashed', opacity: 0.6 },
  labels: { flexDirection: 'row', gap: 6, marginTop: 4 },
});
