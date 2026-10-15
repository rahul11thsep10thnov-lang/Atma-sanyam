// The Guardian Console home: every child at a glance (live status, today's
// minutes against the limit, the week, recent games) and the plan state.
// Live status updates arrive over the WebSocket; the rest refreshes on
// focus and pull-to-refresh.
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshControl, StyleSheet, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { CompositeScreenProps } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { GuardianTabParamList, RootStackParamList } from '../../navigation/types';
import { AppText, Avatar, Button, Card, Icon, ProgressBar, Screen, useTabBarInset, EmptyState, OfflineBanner, LoadingState, Badge } from '../../ui';
import { LiveBadge, formatAgo, formatDuration } from '../../components/guardian/LiveBadge';
import { WeekChart } from '../../components/guardian/WeekChart';
import { guardianApi } from '../../api/guardian';
import { useGuardian } from '../../context/GuardianContext';
import { useGuardianRealtime } from '../../context/GuardianRealtime';
import { ApiError } from '../../services/apiClient';
import { space } from '../../theme/spacing';
import { useTheme } from '../../theme/ThemeContext';
import type { Dashboard, DashboardChild } from '../../types';
import { t } from '../../i18n';
import AsyncStorage from '@react-native-async-storage/async-storage';

type Props = CompositeScreenProps<BottomTabScreenProps<GuardianTabParamList, 'Dashboard'>, NativeStackScreenProps<RootStackParamList>>;
const CACHE = 'loji.dashboard.v1';

function ChildCard({ item, onOpen, onWatch, onPause, onResume, onEnd }: { item: DashboardChild; onOpen: () => void; onWatch: () => void; onPause: () => void; onResume: () => void; onEnd: () => void }) {
  const { colors } = useTheme();
  const s = item.live.currentSession;
  const pct = item.today.limitMinutes ? item.today.minutes / item.today.limitMinutes : 0;
  return (
    <Card variant="raised" padding="lg" style={styles.card}>
      <View style={styles.head}>
        <Avatar avatarId={item.child.avatarId} name={item.child.displayName} size={52} />
        <View style={{ flex: 1 }}>
          <AppText variant="dashHeading">{item.child.displayName}</AppText>
          <AppText variant="caption" tone="muted">
            {t(`bracket.${item.child.effectiveBracket}` as 'bracket.A')} · {t(`bracket.${item.child.effectiveBracket}.ages` as 'bracket.A.ages')}
          </AppText>
          <LiveBadge live={item.live} />
        </View>
        <Button label={t('common.edit')} size="sm" variant="tertiary" onPress={onOpen} />
      </View>
      {s && (
        <View style={[styles.live, { backgroundColor: colors.successSoft }]}>
          <View style={{ flex: 1 }}>
            <AppText variant="bodyStrong">{s.gameName}</AppText>
            <AppText variant="caption" tone="secondary">
              {formatDuration(s.durationSeconds)} · {s.paused ? t('games.paused') : t('dash.lastSeen', { when: formatAgo(s.lastActivityAt) })}
            </AppText>
          </View>
          {item.mirroringEnabled && <Button label={t('dash.watch')} size="sm" icon="eye" onPress={onWatch} />}
          <Button label={s.paused ? t('dash.resume') : t('dash.pause')} size="sm" variant="secondary" onPress={s.paused ? onResume : onPause} />
          <Button label={t('dash.end')} size="sm" variant="destructive" onPress={onEnd} />
        </View>
      )}
      <View style={styles.section}>
        <View style={styles.rowBetween}>
          <AppText variant="dashLabel" tone="secondary">{t('dash.today')}</AppText>
          <AppText variant="dashLabel">{t('dash.limit', { used: item.today.minutes, limit: item.today.limitMinutes })}</AppText>
        </View>
        <ProgressBar value={pct} color={pct >= 1 ? colors.danger : colors.primary} height={10} />
      </View>
      <View style={styles.section}>
        <View style={styles.rowBetween}>
          <AppText variant="dashLabel" tone="secondary">{t('dash.thisWeek')}</AppText>
          <AppText variant="dashLabel">{t('common.minutes', { n: item.week.totalMinutes })}</AppText>
        </View>
        <WeekChart days={item.week.days} limit={item.today.limitMinutes} />
      </View>
      <View style={styles.stats}>
        {[
          [item.progress.gamesPlayed, t('dash.gamesPlayed')],
          [item.progress.completions, t('dash.completions')],
          [item.progress.stars, t('dash.stars')],
          [item.progress.achievements, t('dash.badges')],
        ].map(([n, label]) => (
          <View key={String(label)} style={styles.stat}>
            <AppText variant="numeralSmall" tone="primary">{String(n)}</AppText>
            <AppText variant="caption" tone="muted">{String(label)}</AppText>
          </View>
        ))}
      </View>
      {item.recent.length > 0 && (
        <View style={styles.section}>
          <AppText variant="dashLabel" tone="secondary" style={{ marginBottom: space.xs }}>{t('dash.recent')}</AppText>
          {item.recent.slice(0, 3).map((r, i) => (
            <View key={i} style={styles.recentRow}>
              <AppText variant="bodySmall" style={{ flex: 1 }} numberOfLines={1}>{r.gameName}</AppText>
              <Badge label={t(`dash.outcome.${r.outcome}` as 'dash.outcome.completed')} color={r.outcome === 'completed' ? colors.successSoft : colors.surfaceMuted} />
              <AppText variant="caption" tone="muted">{formatAgo(r.startedAt)}</AppText>
            </View>
          ))}
        </View>
      )}
    </Card>
  );
}

export function DashboardScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const g = useGuardian();
  const rt = useGuardianRealtime();
  const inset = useTabBarInset();
  const [data, setData] = useState<Dashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [offline, setOffline] = useState(false);

  const load = useCallback(async () => {
    try {
      const d = await guardianApi.dashboard();
      setData(d);
      setOffline(false);
      await AsyncStorage.setItem(CACHE, JSON.stringify(d)).catch(() => undefined);
    } catch (e) {
      if (e instanceof ApiError && e.isNetwork) {
        setOffline(true);
        const cached = await AsyncStorage.getItem(CACHE).catch(() => null);
        if (cached && !data) setData(JSON.parse(cached));
      }
    } finally {
      setLoading(false);
    }
  }, [data]);

  useFocusEffect(
    useCallback(() => {
      void load();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
  );
  // Live status pushes refresh the affected card.
  useEffect(() => rt.onChildStatus(() => void load()), [rt, load]);

  const children = useMemo(() => data?.children ?? [], [data]);

  const act = async (fn: () => Promise<unknown>) => {
    try {
      await fn();
    } finally {
      void load();
    }
  };

  return (
    <Screen scroll bottomInset={inset} scrollProps={{ refreshControl: <RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} tintColor={colors.primary} /> }}>
      <View style={styles.title}>
        <View style={{ flex: 1 }}>
          <AppText variant="dashTitle">{t('dash.title')}</AppText>
          <AppText variant="bodySmall" tone="secondary">
            {t('dash.children', { n: children.length })} · {t('dash.activeNow', { n: data?.activePlayers ?? 0 })}
          </AppText>
        </View>
        <Button label={t('dash.addChild')} size="sm" icon="userPlus" onPress={() => navigation.navigate('ChildEditor', {})} disabled={!g.entitled} />
      </View>
      <OfflineBanner visible={offline || g.offline} />
      {!g.entitled && (
        <Card variant="tinted" padding="lg" style={styles.card}>
          <View style={styles.rowBetween}>
            <Icon name="lock" size="md" color="primary" />
            <AppText variant="body" style={{ flex: 1, marginLeft: space.md }}>{t('dash.subscriptionLocked')}</AppText>
          </View>
          <Button label={t('dash.renew')} onPress={() => navigation.navigate('Subscription')} style={{ marginTop: space.md }} />
        </Card>
      )}
      {loading && !data ? (
        <LoadingState />
      ) : children.length === 0 ? (
        <EmptyState icon="users" title={t('dash.noChildren')} action={g.entitled ? { label: t('dash.addChild'), onPress: () => navigation.navigate('ChildEditor', {}) } : undefined} />
      ) : (
        children.map((c) => (
          <ChildCard
            key={c.child.id}
            item={c}
            onOpen={() => navigation.navigate('ChildDetail', { childId: c.child.id })}
            onWatch={() => navigation.navigate('Mirror', { childId: c.child.id })}
            onPause={() => act(() => guardianApi.pauseSession(c.child.id))}
            onResume={() => act(() => guardianApi.resumeSession(c.child.id))}
            onEnd={() => act(() => guardianApi.endSession(c.child.id))}
          />
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { flexDirection: 'row', alignItems: 'center', gap: space.md, marginBottom: space.lg },
  card: { marginBottom: space.lg },
  head: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  live: { flexDirection: 'row', alignItems: 'center', gap: space.sm, padding: space.md, borderRadius: 14, marginTop: space.md, flexWrap: 'wrap' },
  section: { marginTop: space.lg },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  stats: { flexDirection: 'row', marginTop: space.lg },
  stat: { flex: 1, alignItems: 'center' },
  recentRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingVertical: 6 },
});
