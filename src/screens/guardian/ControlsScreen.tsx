// Parental controls for one child, saved as a whole on the server, plus
// the activity history (sessions and screen time) below.
import React, { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import { AppText, Button, Card, Screen, SettingToggle, Chip, LoadingState, ErrorState, Badge, TextField } from '../../ui';
import { ScreenHeader } from '../../components/ScreenHeader';
import { WeekChart } from '../../components/guardian/WeekChart';
import { formatAgo, formatDuration } from '../../components/guardian/LiveBadge';
import { guardianApi, type ChildActivity } from '../../api/guardian';
import { useGuardian } from '../../context/GuardianContext';
import { friendlyError } from '../../services/apiClient';
import { GAME_CATEGORIES, GAME_REGISTRY_META } from '../../games/registry';
import { space } from '../../theme/spacing';
import { useTheme } from '../../theme/ThemeContext';
import type { AgeBracket, CurriculumFramework, ParentalControls, PlayWindow } from '../../types';
import { useRemoteConfig } from '../../context/RemoteConfigContext';

const FRAMEWORKS: { key: CurriculumFramework; name: string }[] = [
  { key: 'ncert', name: 'NCERT' },
  { key: 'cbse', name: 'CBSE' },
  { key: 'cisce', name: 'CISCE (ICSE/ISC)' },
  { key: 'state', name: 'State board' },
  { key: 'ib_pyp', name: 'IB PYP' },
  { key: 'ib_myp', name: 'IB MYP' },
];
const GRADES = ['Nursery', 'LKG', 'UKG', 'Class 1', 'Class 2', 'Class 3', 'Class 4', 'Class 5', 'Class 6', 'Class 7'];
const SUBJECTS: { key: string; name: string; emoji: string; section: string }[] = [
  { key: 'maths', name: 'Mathematics', emoji: '🔢', section: 'study' }, { key: 'vedic-maths', name: 'Vedic Maths', emoji: '🧮', section: 'study' }, { key: 'physics', name: 'Physics', emoji: '⚡', section: 'study' }, { key: 'chemistry', name: 'Chemistry', emoji: '🧪', section: 'study' }, { key: 'biology', name: 'Biology', emoji: '🌱', section: 'study' }, { key: 'environment', name: 'Environment', emoji: '🌍', section: 'study' }, { key: 'history', name: 'History', emoji: '🏺', section: 'study' }, { key: 'geography', name: 'Geography', emoji: '🗺️', section: 'study' }, { key: 'computers', name: 'Computer Studies', emoji: '💻', section: 'study' }, { key: 'english', name: 'English', emoji: '🔤', section: 'study' }, { key: 'hindi', name: 'Hindi', emoji: '🪔', section: 'study' }, { key: 'general-knowledge', name: 'General Knowledge', emoji: '💡', section: 'study' }, { key: 'thinking', name: 'Thinking Skills', emoji: '🧩', section: 'study' },
  { key: 'piano', name: 'Piano', emoji: '🎹', section: 'music' }, { key: 'tabla', name: 'Tabla', emoji: '🥁', section: 'music' }, { key: 'guitar', name: 'Guitar', emoji: '🎸', section: 'music' }, { key: 'drums', name: 'Drums', emoji: '🪘', section: 'music' }, { key: 'flute', name: 'Flute', emoji: '🎶', section: 'music' }, { key: 'violin', name: 'Violin', emoji: '🎻', section: 'music' },
  { key: 'cricket', name: 'Cricket', emoji: '🏏', section: 'sports' }, { key: 'football', name: 'Football', emoji: '⚽', section: 'sports' }, { key: 'badminton', name: 'Badminton', emoji: '🏸', section: 'sports' }, { key: 'squash', name: 'Squash', emoji: '🎾', section: 'sports' }, { key: 'basketball', name: 'Basketball', emoji: '🏀', section: 'sports' }, { key: 'volleyball', name: 'Volleyball', emoji: '🏐', section: 'sports' }, { key: 'table-tennis', name: 'Table Tennis', emoji: '🏓', section: 'sports' }, { key: 'swimming', name: 'Swimming', emoji: '🏊', section: 'sports' },
];
const CAPS = [25, 50, 75, 100, 150, 200];
import { t } from '../../i18n';

const LIMITS = [15, 30, 45, 60, 90, 120, 180];
const SESSIONS = [10, 15, 20, 30, 45, 60];
const BEDTIMES: [string, string][] = [['20:00', '07:00'], ['20:30', '07:00'], ['21:00', '07:00'], ['21:30', '07:30'], ['22:00', '07:00']];

export function ControlsScreen({ navigation, route }: NativeStackScreenProps<RootStackParamList, 'Controls'>) {
  const { colors } = useTheme();
  const g = useGuardian();
  const { config } = useRemoteConfig();
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
  const toggleList = (key: 'blockedCategories' | 'blockedGames' | 'allowedBrackets' | 'blockedSubjects', value: string) => {
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

      <Card variant="raised" padding="lg" style={styles.card}>
        <AppText variant="dashHeading">{t('controls.learning')}</AppText>
        <AppText variant="dashLabel" tone="secondary" style={styles.label}>{t('glearn.curriculum')}</AppText>
        <AppText variant="caption" tone="muted">{t('glearn.curriculumHint')}</AppText>
        <View style={styles.wrap}>
          <Chip label="—" selected={!c.curriculumFramework} onPress={() => patch({ curriculumFramework: null, schoolGrade: null, curriculumBoard: null })} small />
          {FRAMEWORKS.map((f) => <Chip key={f.key} label={f.name} selected={c.curriculumFramework === f.key} onPress={() => patch({ curriculumFramework: f.key })} small />)}
        </View>
        {c.curriculumFramework && (
          <>
            <AppText variant="dashLabel" tone="secondary" style={styles.label}>{t('glearn.grade')}</AppText>
            <View style={styles.wrap}>
              {GRADES.map((gr) => <Chip key={gr} label={gr} selected={c.schoolGrade === gr} onPress={() => patch({ schoolGrade: c.schoolGrade === gr ? null : gr })} small />)}
            </View>
            {c.curriculumFramework === 'state' && (
              <View style={{ marginTop: space.sm }}>
                <TextField label={t('glearn.board')} value={c.curriculumBoard ?? ''} onChangeText={(v) => patch({ curriculumBoard: v || null })} />
              </View>
            )}
          </>
        )}
        <AppText variant="dashLabel" tone="secondary" style={styles.label}>{t('glearn.goals')}</AppText>
        <View style={styles.wrap}>
          {SUBJECTS.filter((sub) => !c.blockedSubjects.includes(sub.key)).map((sub) => {
            const goal = c.learningGoals.find((x) => x.subject === sub.key);
            return <Chip key={sub.key} label={goal ? `${sub.name}: ${t('glearn.goalFor', { n: goal.lessonsPerWeek })}` : sub.name} emoji={sub.emoji} selected={!!goal} onPress={() => patch({ learningGoals: goal ? (goal.lessonsPerWeek >= 3 ? c.learningGoals.filter((x) => x.subject !== sub.key) : c.learningGoals.map((x) => (x.subject === sub.key ? { ...x, lessonsPerWeek: x.lessonsPerWeek + 1 } : x))) : [...c.learningGoals, { subject: sub.key, lessonsPerWeek: 1 }] })} small />;
          })}
        </View>
        <AppText variant="caption" tone="muted">{t('glearn.addGoal')}: tap a subject for 1 lesson a week, again for 2, again for 3, once more to remove.</AppText>
        <AppText variant="dashLabel" tone="secondary" style={styles.label}>{t('glearn.blocked')}</AppText>
        <AppText variant="caption" tone="muted">{t('glearn.blockedHint')}</AppText>
        <View style={styles.wrap}>
          {SUBJECTS.map((sub) => <Chip key={sub.key} label={sub.name} emoji={sub.emoji} selected={c.blockedSubjects.includes(sub.key)} color={colors.danger} onPress={() => toggleList('blockedSubjects', sub.key)} small />)}
        </View>
        <AppText variant="dashLabel" tone="secondary" style={styles.label}>{t('grewards.cap')}</AppText>
        <AppText variant="caption" tone="muted">{t('grewards.capHint', { n: config.rewards.dailyCap })}</AppText>
        <View style={styles.wrap}>
          <Chip label={`${config.rewards.dailyCap} (default)`} selected={c.coinDailyCap === null} onPress={() => patch({ coinDailyCap: null })} small />
          {CAPS.filter((n) => n < config.rewards.dailyCap).map((n) => <Chip key={n} label={String(n)} selected={c.coinDailyCap === n} onPress={() => patch({ coinDailyCap: n })} small />)}
        </View>
      </Card>

      <Card variant="raised" paddingX="lg" padding={0} style={styles.card}>
        <SettingToggle icon="trophy" label={t('grewards.rankingsOn')} hint={t('grewards.rankingsHint')} value={c.rankingsEnabled} onValueChange={(v) => patch({ rankingsEnabled: v })} />
        <SettingToggle icon="award" label={t('grewards.shopOn')} hint={t('grewards.shopHint')} value={c.rewardShopEnabled} onValueChange={(v) => patch({ rewardShopEnabled: v })} />
        <SettingToggle icon="sparkles" label={t('grewards.reducedMotion')} value={c.reducedMotion} onValueChange={(v) => patch({ reducedMotion: v })} />
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
