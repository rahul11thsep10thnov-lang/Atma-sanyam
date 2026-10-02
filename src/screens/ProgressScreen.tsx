// Progress (PHASE 12): the journey, told visually — focus time, streak,
// seven days of bars, and the pictures each session revealed. One series,
// no legend, no grid lines.
import React, { useCallback, useMemo, useState } from 'react';
import { Dimensions, FlatList, StyleSheet, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { loadHistory } from '../storage/history';
import { SessionRecord } from '../types';
import { SessionThumb } from '../components/SessionThumb';
import { AppText } from '../ui/AppText';
import { Card } from '../ui/Card';
import { Icon, IconName } from '../ui/Icon';
import { Button } from '../ui/Button';
import { useTabBarInset } from '../ui/TabBar';
import { space } from '../theme/spacing';
import { radii } from '../theme/radii';
import { useTheme } from '../theme/ThemeContext';
import { RootStackParamList } from '../navigation/types';
import { t, useLanguage } from '../i18n';

const COLUMNS = 3;
const GAP = space.md;
const THUMB = (Dimensions.get('window').width - space.screen * 2 - GAP * (COLUMNS - 1)) / COLUMNS;
const DAY = 86_400_000;

function startOfDay(ts: number) {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function formatMinutes(min: number) {
  if (min < 60) return `${min}m`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

function computeStats(history: SessionRecord[]) {
  const completed = history.filter((h) => h.outcome === 'completed');
  const totalMinutes = completed.reduce((s, h) => s + h.durationMinutes, 0);
  const longest = completed.reduce((m, h) => Math.max(m, h.durationMinutes), 0);
  const days = new Set(completed.map((h) => startOfDay(h.startedAt)));
  let streak = 0;
  let cursor = startOfDay(Date.now());
  if (!days.has(cursor)) cursor -= DAY; // a streak survives until the day is over
  while (days.has(cursor)) {
    streak++;
    cursor -= DAY;
  }
  const today = startOfDay(Date.now());
  const week = Array.from({ length: 7 }, (_, i) => {
    const day = today - (6 - i) * DAY;
    const minutes = completed.filter((h) => startOfDay(h.startedAt) === day).reduce((s, h) => s + h.durationMinutes, 0);
    return { day, minutes };
  });
  return { completed: completed.length, totalMinutes, longest, streak, week };
}

function StatTile({ icon, value, label }: { icon: IconName; value: string; label: string }) {
  const { colors } = useTheme();
  return (
    <Card variant="raised" padding="md" style={styles.stat}>
      <View style={[styles.statIcon, { backgroundColor: colors.primarySoft }]}>
        <Icon name={icon} size="xs" color="primary" />
      </View>
      <AppText variant="heading" style={styles.statValue}>{value}</AppText>
      <AppText variant="caption" tone="secondary">{label}</AppText>
    </Card>
  );
}

function WeekBars({ week }: { week: { day: number; minutes: number }[] }) {
  const { colors } = useTheme();
  const max = Math.max(30, ...week.map((d) => d.minutes));
  const today = startOfDay(Date.now());
  return (
    <Card variant="base" padding="lg" style={styles.weekCard}>
      <View style={styles.rowBetween}>
        <AppText variant="subheading">{t('progress.thisWeek')}</AppText>
        <AppText variant="bodySmall" tone="secondary">{formatMinutes(week.reduce((s, d) => s + d.minutes, 0))} focused</AppText>
      </View>
      <View style={styles.bars} accessibilityLabel={`Minutes focused per day: ${week.map((d) => `${new Date(d.day).toLocaleDateString(undefined, { weekday: 'short' })} ${d.minutes}`).join(', ')}`}>
        {week.map((d) => {
          const h = Math.max(4, Math.round((d.minutes / max) * 96));
          const isToday = d.day === today;
          return (
            <View key={d.day} style={styles.barCol}>
              {d.minutes > 0 && (
                <AppText variant="caption" tone={isToday ? 'primary' : 'muted'} style={styles.barValue}>{d.minutes}</AppText>
              )}
              <View style={[styles.bar, { height: h, backgroundColor: d.minutes === 0 ? colors.surfaceMuted : isToday ? colors.primary : colors.accent }]} />
              <AppText variant="caption" tone={isToday ? 'primary' : 'muted'} style={styles.barLabel}>
                {new Date(d.day).toLocaleDateString(undefined, { weekday: 'narrow' })}
              </AppText>
            </View>
          );
        })}
      </View>
    </Card>
  );
}

export function ProgressScreen() {
  useLanguage();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const tabInset = useTabBarInset();
  const { colors } = useTheme();
  const [history, setHistory] = useState<SessionRecord[]>([]);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      loadHistory().then((h) => active && setHistory(h));
      return () => {
        active = false;
      };
    }, [])
  );

  const stats = useMemo(() => computeStats(history), [history]);

  const header = (
    <View>
      <AppText variant="headingLarge" accessibilityRole="header">{t('progress.title')}</AppText>
      <AppText variant="body" tone="secondary" style={styles.subtitle}>
        {history.length === 0 ? t('progress.empty') : t('progress.summary', { completed: stats.completed, paused: history.length - stats.completed })}
      </AppText>
      <View style={styles.statsRow}>
        <StatTile icon="timer" value={formatMinutes(stats.totalMinutes)} label={t('progress.focusTime')} />
        <StatTile icon="flame" value={`${stats.streak}`} label={t('progress.streak')} />
        <StatTile icon="trophy" value={stats.longest ? formatMinutes(stats.longest) : '—'} label={t('progress.longest')} />
      </View>
      <WeekBars week={stats.week} />
      {history.length > 0 && (
        <AppText variant="overline" tone="muted" style={styles.gridLabel}>RECENT SESSIONS</AppText>
      )}
    </View>
  );

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <FlatList
        data={history}
        keyExtractor={(item) => item.id}
        numColumns={COLUMNS}
        ListHeaderComponent={header}
        ListEmptyComponent={
          <Card variant="tinted" padding="xl" style={styles.empty}>
            <View style={[styles.emptyPot, { backgroundColor: colors.growthSoft }]}>
              <Icon name="sprout" size="lg" color={colors.growth} />
            </View>
            <AppText variant="subheading" align="center">No sessions yet</AppText>
            <AppText variant="bodySmall" tone="secondary" align="center" style={styles.emptyText}>
              Your first focus session can grow something here.
            </AppText>
            <Button label={t('home.start')} icon="play" onPress={() => navigation.navigate('Tabs', { screen: 'Home' })} style={styles.emptyBtn} />
          </Card>
        }
        contentContainerStyle={{ paddingTop: insets.top + space.lg, paddingBottom: tabInset, paddingHorizontal: space.screen }}
        columnWrapperStyle={{ gap: GAP, marginBottom: GAP }}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <View style={{ width: THUMB }}>
            <SessionThumb session={item} size={THUMB} />
            <AppText variant="caption" tone="secondary" style={styles.itemMeta} numberOfLines={1}>
              {item.durationMinutes}m · {new Date(item.startedAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}
            </AppText>
            {item.outcome === 'failed' && (
              <AppText variant="caption" tone="muted">paused</AppText>
            )}
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  subtitle: { marginTop: space.xs },
  statsRow: { flexDirection: 'row', gap: space.md, marginTop: space.xl },
  stat: { flex: 1 },
  statIcon: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginBottom: space.sm },
  statValue: { marginBottom: 2 },
  weekCard: { marginTop: space.md },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  bars: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: space.lg, height: 140 },
  barCol: { alignItems: 'center', width: 32, justifyContent: 'flex-end' },
  bar: { width: 18, borderRadius: radii.sm / 2 },
  barValue: { marginBottom: 4 },
  barLabel: { marginTop: 6 },
  gridLabel: { marginTop: space.xxl, marginBottom: space.md },
  itemMeta: { marginTop: 6 },
  empty: { marginTop: space.xl, alignItems: 'center' },
  emptyPot: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', marginBottom: space.md },
  emptyText: { marginTop: space.xs },
  emptyBtn: { marginTop: space.lg, alignSelf: 'center' },
});
