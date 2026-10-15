// Parental controls for one child, saved as a whole on the server, plus
// the activity history (sessions and screen time) below.
import React, { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import { AppText, Button, Card, Screen, SettingToggle, Chip, LoadingState, ErrorState, Badge } from '../../ui';
import { ScreenHeader } from '../../components/ScreenHeader';
import { WeekChart } from '../../components/guardian/WeekChart';
import { formatAgo, formatDuration } from '../../components/guardian/LiveBadge';
import { guardianApi, type ChildActivity } from '../../api/guardian';
import { useGuardian } from '../../context/GuardianContext';
import { friendlyError } from '../../services/apiClient';
import { GAME_CATEGORIES, GAME_REGISTRY_META } from '../../games/registry';
import { space } from '../../theme/spacing';
import { useTheme } from '../../theme/ThemeContext';
import type { AgeBracket, ParentalControls, PlayWindow } from '../../types';
import { t } from '../../i18n';

const LIMITS = [15, 30, 45, 60, 90, 120, 180];
const SESSIONS = [10, 15, 20, 30, 45, 60];
const BEDTIMES: [string, string][] = [['20:00', '07:00'], ['20:30', '07:00'], ['21:00', '07:00'], ['21:30', '07:30'], ['22:00', '07:00']];

export function ControlsScreen({ navigation, route }: NativeStackScreenProps<RootStackParamList, 'Controls'>) {
  const { colors } = useTheme();
  const g = useGuardian();
  const id = route.params.childId;
  const child = g.children.find((c) => c.id === id);
  const [c, setC] = useState<ParentalControls | null>(null);
  const [activity, setActivity] = useState<ChildActivity | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  const load = useCallback(async () => {
    try {
      setC(await guardianApi.controls(id));
      setActivity(await guardianApi.activity(id, 30));
    } catch (e) {
      setError(friendlyError(e));
    }
  }, [id]);
  useEffect(() => {
    void load();
  }, [load]);

  if (error && !c) return <ErrorState message={error} onRetry={load} />;
  if (!c) return <LoadingState />;

  const patch = (p: Partial<ParentalControls>) => {
    setC({ ...c, ...p });
    setSaved(false);
  };
  const toggleList = (key: 'blockedCategories' | 'blockedGames' | 'allowedBrackets', value: string) => {
    const list = c[key] as string[];
    patch({ [key]: list.includes(value) ? list.filter((x) => x !== value) : [...list, value] } as Partial<ParentalControls>);
  };
  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      const { updatedAt, ...body } = c;
      void updatedAt;
      setC(await guardianApi.saveControls(id, body));
      setSaved(true);
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setBusy(false);
    }
  };
  const bracketOrder: AgeBracket[] = ['A', 'B', 'C', 'D'];
  const olderBrackets = child ? bracketOrder.slice(bracketOrder.indexOf(child.effectiveBracket) + 1) : [];
  const windows = c.playWindows as PlayWindow[];

  return (
    <Screen scroll>
      <ScreenHeader title={t('controls.title')} subtitle={child?.displayName} right={<Button label={saved ? t('controls.saved') : t('common.save')} size="sm" onPress={save} loading={busy} disabled={saved} />} />

      <Card variant="raised" padding="lg" style={styles.card}>
        <AppText variant="dashHeading">{t('controls.time')}</AppText>
        <AppText variant="dashLabel" tone="secondary" style={styles.label}>{t('controls.daily')}</AppText>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {LIMITS.map((m) => <Chip key={m} label={t('common.minutes', { n: m })} selected={c.dailyLimitMinutes === m} onPress={() => patch({ dailyLimitMinutes: m })} small />)}
        </ScrollView>
        <AppText variant="dashLabel" tone="secondary" style={styles.label}>{t('controls.session')}</AppText>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {SESSIONS.map((m) => <Chip key={m} label={t('common.minutes', { n: m })} selected={c.sessionLimitMinutes === m} onPress={() => patch({ sessionLimitMinutes: m })} small />)}
        </ScrollView>
        <AppText variant="dashLabel" tone="secondary" style={styles.label}>{t('controls.bedtime')}</AppText>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          <Chip label={t('controls.bedtimeOff')} selected={!c.bedtimeStart} onPress={() => patch({ bedtimeStart: null, bedtimeEnd: null })} small />
          {BEDTIMES.map(([s, e]) => <Chip key={s} label={`${s} – ${e}`} selected={c.bedtimeStart === s && c.bedtimeEnd === e} onPress={() => patch({ bedtimeStart: s, bedtimeEnd: e })} small />)}
        </ScrollView>
        <AppText variant="dashLabel" tone="secondary" style={styles.label}>{t('controls.windows')}</AppText>
        <AppText variant="caption" tone="muted">{t('controls.windowsHint')}</AppText>
        {windows.map((w, i) => (
          <View key={i} style={[styles.window, { borderColor: colors.border }]}>
            <View style={{ flexDirection: 'row', gap: 4, flexWrap: 'wrap', flex: 1 }}>
              {[0, 1, 2, 3, 4, 5, 6].map((d) => (
                <Chip key={d} label={t(`controls.days.${d}` as 'controls.days.0')} selected={w.days.includes(d)} small onPress={() => patch({ playWindows: windows.map((x, j) => (j === i ? { ...x, days: x.days.includes(d) ? x.days.filter((y) => y !== d) : [...x.days, d].sort() } : x)) })} />
              ))}
            </View>
            <View style={{ flexDirection: 'row', gap: 4, marginTop: 6, alignItems: 'center' }}>
              {['07:00', '09:00', '15:00', '16:00', '17:00', '18:00'].map((s) => <Chip key={s} label={s} small selected={w.start === s} onPress={() => patch({ playWindows: windows.map((x, j) => (j === i ? { ...x, start: s } : x)) })} />)}
              <AppText variant="caption">→</AppText>
              {['12:00', '18:00', '19:00', '20:00', '21:00'].map((s) => <Chip key={s} label={s} small selected={w.end === s} onPress={() => patch({ playWindows: windows.map((x, j) => (j === i ? { ...x, end: s } : x)) })} />)}
              <Button label={t('common.remove')} size="sm" variant="tertiary" onPress={() => patch({ playWindows: windows.filter((_, j) => j !== i) })} />
            </View>
          </View>
        ))}
        <Button label={t('controls.addWindow')} size="sm" variant="secondary" icon="plus" onPress={() => patch({ playWindows: [...windows, { days: [1, 2, 3, 4, 5], start: '16:00', end: '19:00' }] })} style={{ marginTop: space.sm, alignSelf: 'flex-start' }} />
      </Card>

      <Card variant="raised" padding="lg" style={styles.card}>
        <AppText variant="dashHeading">{t('controls.content')}</AppText>
        <AppText variant="dashLabel" tone="secondary" style={styles.label}>{t('controls.blockedCategories')}</AppText>
        <View style={styles.wrap}>
          {GAME_CATEGORIES.map((cat) => <Chip key={cat.id} label={cat.name} emoji={cat.emoji} selected={c.blockedCategories.includes(cat.id)} color={colors.danger} onPress={() => toggleList('blockedCategories', cat.id)} small />)}
        </View>
        <AppText variant="dashLabel" tone="secondary" style={styles.label}>{t('controls.blockedGames')}</AppText>
        <View style={styles.wrap}>
          {GAME_REGISTRY_META.filter((gm) => !child || gm.brackets.includes(child.effectiveBracket) || c.allowedBrackets.some((b) => gm.brackets.includes(b))).map((gm) => <Chip key={gm.id} label={gm.name} emoji={gm.emoji} selected={c.blockedGames.includes(gm.id)} color={colors.danger} onPress={() => toggleList('blockedGames', gm.id)} small />)}
        </View>
        {olderBrackets.length > 0 && (
          <>
            <AppText variant="dashLabel" tone="secondary" style={styles.label}>{t('controls.allowedBrackets')}</AppText>
            <AppText variant="caption" tone="muted">{t('controls.allowedBracketsHint')}</AppText>
            <View style={styles.wrap}>
              {olderBrackets.map((b) => <Chip key={b} label={`${t(`bracket.${b}` as 'bracket.A')} (${t(`bracket.${b}.ages` as 'bracket.A.ages')})`} selected={c.allowedBrackets.includes(b)} onPress={() => toggleList('allowedBrackets', b)} small />)}
            </View>
          </>
        )}
      </Card>

      <Card variant="raised" paddingX="lg" padding={0} style={styles.card}>
        <SettingToggle icon="volume" label={t('controls.sound')} value={c.soundEnabled} onValueChange={(v) => patch({ soundEnabled: v })} />
        <SettingToggle icon="book" label={t('controls.narration')} value={c.narrationEnabled} onValueChange={(v) => patch({ narrationEnabled: v })} />
        <SettingToggle icon="heart" label={t('controls.favourites')} value={c.favouritesEnabled} onValueChange={(v) => patch({ favouritesEnabled: v })} />
        <SettingToggle icon="eye" label={t('controls.mirroring')} hint={t('controls.mirroringHint')} value={c.mirroringEnabled} onValueChange={(v) => patch({ mirroringEnabled: v })} />
        <SettingToggle icon="smartphone" label={t('controls.newDevice')} hint={t('controls.newDeviceHint')} value={c.newDeviceApproval} onValueChange={(v) => patch({ newDeviceApproval: v })} last />
      </Card>
      {error ? <AppText variant="bodySmall" tone="danger" accessibilityRole="alert">{error}</AppText> : null}
      <Button label={saved ? t('controls.saved') : t('common.save')} onPress={save} loading={busy} disabled={saved} fullWidth style={{ marginBottom: space.xl }} />

      {activity && (
        <Card variant="raised" padding="lg" style={styles.card}>
          <AppText variant="dashHeading" style={{ marginBottom: space.md }}>{t('dash.weekly')}</AppText>
          <WeekChart days={activity.screenTime} limit={c.dailyLimitMinutes} />
          <AppText variant="dashHeading" style={{ marginTop: space.lg, marginBottom: space.sm }}>{t('dash.recent')}</AppText>
          {activity.sessions.slice(0, 20).map((s) => (
            <View key={s.id} style={styles.sessionRow}>
              <View style={{ flex: 1 }}>
                <AppText variant="bodyStrong">{s.gameName}</AppText>
                <AppText variant="caption" tone="muted">{formatAgo(s.startedAt)} · {formatDuration(s.durationSeconds)}{s.score !== null ? ` · ${t('games.score')} ${s.score}` : ''}</AppText>
              </View>
              <Badge label={t(`dash.outcome.${s.outcome}` as 'dash.outcome.completed')} color={s.outcome === 'completed' ? colors.successSoft : colors.surfaceMuted} />
            </View>
          ))}
        </Card>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: space.lg },
  label: { marginTop: space.lg, marginBottom: 6 },
  chips: { gap: 6, paddingVertical: 2 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  window: { borderWidth: 1, borderRadius: 12, padding: space.sm, marginTop: space.sm },
  sessionRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingVertical: 8 },
});
