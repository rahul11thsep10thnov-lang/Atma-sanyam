// Learning management for one child: what they learned (per section and
// subject, levels, quiz accuracy, streak, time), weekly goals, the next
// suggested lessons and the curriculum preference. Settings live in Controls.
import React, { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { RootStackParamList } from '../../navigation/types';
import { AppText, Badge, Button, Card, ErrorState, LoadingState, ProgressBar, Screen } from '../../ui';
import { ScreenHeader } from '../../components/ScreenHeader';
import { guardianApi } from '../../api/guardian';
import { useGuardian } from '../../context/GuardianContext';
import { friendlyError } from '../../services/apiClient';
import type { LearningReport } from '../../learning/types';
import { space } from '../../theme/spacing';
import { useTheme } from '../../theme/ThemeContext';
import { t } from '../../i18n';

const FRAMEWORK_NAMES: Record<string, string> = { ncert: 'NCERT', cbse: 'CBSE', cisce: 'CISCE (ICSE / ISC)', state: 'State board', ib_pyp: 'IB PYP', ib_myp: 'IB MYP' };

export function ChildLearningScreen({ navigation, route }: NativeStackScreenProps<RootStackParamList, 'ChildLearning'>) {
  const { colors } = useTheme();
  const g = useGuardian();
  const id = route.params.childId;
  const child = g.children.find((c) => c.id === id);
  const [report, setReport] = useState<LearningReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => {
    try {
      setReport(await guardianApi.learning(id));
      setError(null);
    } catch (e) {
      setError(friendlyError(e));
    }
  }, [id]);
  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );
  if (error && !report) return <ErrorState message={error} onRetry={load} />;
  if (!report) return <LoadingState />;
  const tot = report.totals;
  const mins = Math.round(tot.timeSeconds / 60);
  const accuracy = tot.quizTotal ? Math.round((tot.quizCorrect / tot.quizTotal) * 100) : null;
  return (
    <Screen scroll>
      <ScreenHeader title={t('glearn.title')} subtitle={t('glearn.subtitle', { name: child?.displayName ?? '' })} right={<Button label={t('child.controls')} size="sm" variant="secondary" onPress={() => navigation.navigate('Controls', { childId: id })} />} />
      <Card variant="raised" padding="lg" style={styles.card}>
        <View style={styles.stats}>
          {[[tot.lessonsCompleted, t('glearn.lessons')], [tot.streakDays, t('glearn.streak')], [mins, t('glearn.time')], [accuracy === null ? '—' : `${accuracy}%`, t('glearn.quiz')]].map(([n, l]) => (
            <View key={String(l)} style={styles.stat}><AppText variant="numeralSmall" tone="primary">{String(n)}</AppText><AppText variant="caption" tone="muted" align="center">{String(l)}</AppText></View>
          ))}
        </View>
        <AppText variant="caption" tone="muted" style={{ marginTop: space.sm }}>{t('glearn.curriculum')}: {report.curriculum.framework ? `${FRAMEWORK_NAMES[report.curriculum.framework] ?? report.curriculum.framework}${report.curriculum.grade ? ` · ${report.curriculum.grade}` : ''}${report.curriculum.board ? ` · ${report.curriculum.board}` : ''}` : '—'}</AppText>
      </Card>
      {report.goals.length > 0 && (
        <Card variant="raised" padding="lg" style={styles.card}>
          <AppText variant="dashHeading" style={{ marginBottom: space.sm }}>{t('glearn.goals')}</AppText>
          {report.goals.map((goal) => (
            <View key={goal.subject} style={styles.goal}>
              <AppText variant="bodyStrong">{goal.emoji} {goal.name}</AppText>
              <AppText variant="caption" tone="secondary">{t('learn.report.goal', { done: goal.doneThisWeek, target: goal.lessonsPerWeek })}</AppText>
              <ProgressBar value={goal.doneThisWeek / Math.max(1, goal.lessonsPerWeek)} height={8} />
            </View>
          ))}
        </Card>
      )}
      <Card variant="raised" padding="lg" style={styles.card}>
        <AppText variant="dashHeading" style={{ marginBottom: space.sm }}>{t('glearn.sections')}</AppText>
        {report.sections.every((s) => s.subjects.length === 0) ? (
          <AppText variant="body" tone="secondary">{t('glearn.empty')}</AppText>
        ) : (
          report.sections.filter((s) => s.subjects.length > 0).map((s) => (
            <View key={s.key} style={{ marginBottom: space.md }}>
              <AppText variant="bodyStrong">{s.emoji} {s.name} · {t('learn.completed', { n: s.lessonsCompleted })} · {Math.round(s.timeSeconds / 60)} min</AppText>
              {s.subjects.map((sub) => (
                <View key={sub.key} style={[styles.subjectRow, { borderColor: colors.border }]}>
                  <AppText variant="bodySmall" style={{ flex: 1 }}>{sub.emoji} {sub.name}{sub.blocked ? ' · off' : ''}</AppText>
                  {sub.level && <Badge label={`${t('glearn.levels')}: ${sub.level.age}`} color={colors.primarySoft} />}
                  <AppText variant="caption" tone="muted">{sub.completed} ✓ · {sub.inProgress} ▶ · {sub.quizTotal ? `${Math.round((sub.quizCorrect / sub.quizTotal) * 100)}%` : '—'}</AppText>
                </View>
              ))}
            </View>
          ))
        )}
      </Card>
      {report.nextLessons.length > 0 && (
        <Card variant="raised" padding="lg" style={styles.card}>
          <AppText variant="dashHeading" style={{ marginBottom: space.sm }}>{t('glearn.next')}</AppText>
          {report.nextLessons.map((l) => (
            <View key={l.id} style={[styles.subjectRow, { borderColor: colors.border }]}>
              <View style={{ flex: 1 }}>
                <AppText variant="bodyStrong">{l.title}</AppText>
                <AppText variant="caption" tone="muted">{l.subject} · {l.ageLabel} · {l.difficultyLabel}{l.curriculum?.status === 'verified' ? ` · ${l.curriculum.text}` : ''}</AppText>
              </View>
            </View>
          ))}
        </Card>
      )}
      {report.recent.length > 0 && (
        <Card variant="raised" padding="lg" style={styles.card}>
          <AppText variant="dashHeading" style={{ marginBottom: space.sm }}>{t('glearn.recent')}</AppText>
          {report.recent.slice(0, 12).map((r) => (
            <View key={r.lessonId} style={[styles.subjectRow, { borderColor: colors.border }]}>
              <View style={{ flex: 1 }}>
                <AppText variant="bodySmall">{r.completedAt ? '✅' : '▶️'} {r.title}</AppText>
                <AppText variant="caption" tone="muted">{new Date(r.lastStepAt).toLocaleDateString()} · {r.stepsDone}/{r.stepsTotal} steps · {Math.round(r.timeSeconds / 60)} min{r.quizTotal ? ` · quiz ${r.bestQuizScore ?? 0}/${r.quizTotal}` : ''}{r.selectedAge && r.selectedAge !== r.recommendedAge ? ` · explored age ${r.selectedAge}` : ''}</AppText>
              </View>
            </View>
          ))}
        </Card>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: space.lg },
  stats: { flexDirection: 'row', justifyContent: 'space-between', gap: space.sm },
  stat: { flex: 1, alignItems: 'center' },
  goal: { marginBottom: space.md, gap: 4 },
  subjectRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingVertical: 8, borderBottomWidth: 1 },
});
