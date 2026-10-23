// One subject, instrument or sport: lessons for the child's age by default,
// with "Explore other ages & levels" to open every age and a level filter.
// Exploring never changes the profile — it is a view, and the default returns
// each time the screen opens.
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RootStackParamList } from '../../../navigation/types';
import { AppText, Badge, BigButton, CandyCard, Chip, EmptyState, LoadingState, PlayfulBackdrop, PopIn, ProgressBar, RoundButton, lighten } from '../../../ui';
import { playerApi } from '../../../api/player';
import type { LearningCatalogue, LessonSummary, SubjectInfo } from '../../../learning/types';
import { AGE_GROUPS } from './LearnSectionScreen';
import { palette } from '../../../theme/palette';
import { space } from '../../../theme/spacing';
import { useTheme } from '../../../theme/ThemeContext';
import { t } from '../../../i18n';

type Level = 'all' | 'beginner' | 'intermediate' | 'advanced';

export function SubjectScreen({ navigation, route }: NativeStackScreenProps<RootStackParamList, 'Subject'>) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [cat, setCat] = useState<LearningCatalogue | null>(null);
  const [lessons, setLessons] = useState<LessonSummary[] | null>(null);
  const [age, setAge] = useState<number | 'all' | null>(null); // null = my age (default)
  const [level, setLevel] = useState<Level>('all');
  const [exploring, setExploring] = useState(false);
  const subjectKey = route.params.subject;
  const subject: SubjectInfo | undefined = cat?.sections.flatMap((s) => s.subjects).find((s) => s.key === subjectKey);

  useFocusEffect(
    useCallback(() => {
      playerApi.learningCatalogue().then(setCat).catch(() => undefined);
    }, [])
  );
  useEffect(() => {
    setLessons(null);
    playerApi.lessons({ subject: subjectKey, age: age ?? undefined, difficulty: level === 'all' ? undefined : level }).then((r) => setLessons(r.lessons)).catch(() => setLessons([]));
  }, [subjectKey, age, level]);

  const myAge = cat?.myAge ?? 7;
  const shownAge = age ?? myAge;
  const grouped = useMemo(() => {
    const by = new Map<number, LessonSummary[]>();
    for (const l of lessons ?? []) by.set(l.recommendedAge, [...(by.get(l.recommendedAge) ?? []), l]);
    return [...by.entries()].sort((a, b) => a[0] - b[0]);
  }, [lessons]);
  const resetToMyAge = () => {
    setAge(null);
    setExploring(false);
    setLevel('all');
  };

  return (
    <PlayfulBackdrop colors={[lighten(subject?.color ?? palette.sky, 0.55), colors.background]}>
      <ScrollView contentContainerStyle={[styles.wrap, { paddingTop: insets.top + space.md, paddingBottom: insets.bottom + space.xl }]}>
        <View style={styles.top}>
          <RoundButton icon="arrowLeft" label={t('common.back')} onPress={() => navigation.goBack()} color={palette.cherry} size={46} />
          <View style={{ flex: 1 }} />
        </View>
        {!subject ? (
          <LoadingState />
        ) : (
          <>
            <PopIn style={{ alignItems: 'center' }}>
              <Text style={{ fontSize: 72 }}>{subject.emoji}</Text>
              <AppText variant="display" align="center">{subject.name}</AppText>
              <AppText variant="body" tone="secondary" align="center">{subject.description}</AppText>
              <View style={styles.badges}>
                {subject.level && <Badge label={`⭐ ${t('learn.level', { age: subject.level.age })}`} color={colors.surfaceRaised} />}
                <Badge label={t('learn.completed', { n: subject.completed })} emoji="✅" color={colors.surfaceRaised} />
                {subject.availability === 'coming_soon' && <Badge label={t('learn.comingSoon')} emoji="🚧" color="#FFF4CC" />}
              </View>
            </PopIn>
            {subject.safety.length > 0 && (
              <View style={[styles.safety, { backgroundColor: '#FDF0DA' }]}>
                <Text>⚠️</Text>
                <View style={{ flex: 1 }}>{subject.safety.map((s) => <AppText key={s} variant="bodySmallStrong">{s}</AppText>)}</View>
              </View>
            )}
            {/* Age controls: My Age by default, explore everything else on request. */}
            <View style={[styles.ageBox, { backgroundColor: colors.surfaceRaised }]}>
              <View style={styles.ageHead}>
                <AppText variant="heading">{exploring ? t('learn.exploreAges') : t('learn.myAge', { age: myAge })}</AppText>
                {exploring ? (
                  <Chip label={t('learn.backToMyAge')} emoji="🎂" selected onPress={resetToMyAge} small />
                ) : (
                  <Chip label={t('learn.exploreAges')} emoji="🧭" onPress={() => { setExploring(true); setAge('all'); }} small />
                )}
              </View>
              {exploring && (
                <View style={{ gap: space.sm }}>
                  <View style={styles.chips}>
                    <Chip label={t('learn.allAges')} emoji="🌟" selected={age === 'all'} onPress={() => setAge('all')} small />
                    {AGE_GROUPS.map((g) => g.ages.map((a) => <Chip key={a} label={String(a)} emoji={a === myAge ? '🎂' : undefined} color={a < myAge ? palette.mint : a > myAge ? palette.tangerine : palette.lime} selected={age === a} onPress={() => setAge(a)} small />))}
                  </View>
                  <View style={styles.chips}>
                    {(['all', 'beginner', 'intermediate', 'advanced'] as Level[]).map((l) => <Chip key={l} label={t(l === 'all' ? 'learn.levelAll' : l === 'beginner' ? 'learn.levelBeginner' : l === 'intermediate' ? 'learn.levelIntermediate' : 'learn.levelAdvanced')} selected={level === l} onPress={() => setLevel(l)} small />)}
                  </View>
                </View>
              )}
            </View>
            {lessons === null ? (
              <LoadingState />
            ) : lessons.length === 0 ? (
              <View style={{ marginTop: space.lg }}>
                <EmptyState emoji={subject.availability === 'coming_soon' ? '🚧' : '🧭'} title={subject.availability === 'coming_soon' ? t('learn.comingSoon') : t('learn.noLessonsAge', { age: shownAge, subject: subject.name })} action={subject.availability !== 'coming_soon' && !exploring ? { label: t('learn.exploreAges'), onPress: () => { setExploring(true); setAge('all'); } } : undefined} />
              </View>
            ) : (
              grouped.map(([a, list]) => (
                <View key={a} style={{ marginTop: space.lg }}>
                  {(age === 'all' || grouped.length > 1) && <AppText variant="heading" style={{ marginBottom: space.sm }}>{t('learn.age', { age: a })} · {t(`bracket.${list[0]!.recommendedBracket}` as 'bracket.A')}{a === myAge ? ` · ${t('learn.myAge', { age: a })}` : ''}</AppText>}
                  {list.map((l) => <LessonCard key={l.id} lesson={l} color={subject.color} onPress={() => navigation.navigate('Lesson', { lessonId: l.id, age: shownAge === 'all' ? l.recommendedAge : shownAge })} />)}
                </View>
              ))
            )}
            {exploring && (
              <BigButton label={t('learn.backToMyAge')} emoji="🎂" color={palette.lime} size="md" onPress={resetToMyAge} style={{ marginTop: space.xl, alignSelf: 'center' }} />
            )}
          </>
        )}
      </ScrollView>
    </PlayfulBackdrop>
  );
}

export function LessonCard({ lesson, color, onPress }: { lesson: LessonSummary; color: string; onPress: () => void }) {
  const { colors } = useTheme();
  const p = lesson.progress;
  const done = !!p?.completedAt;
  return (
    <CandyCard color={color} onPress={onPress} label={lesson.title} style={{ marginBottom: space.sm }}>
      <View style={[styles.lesson, { backgroundColor: colors.surfaceRaised }]}>
        <View style={[styles.lessonNum, { backgroundColor: done ? palette.lime : color }]}><Text style={{ color: '#fff', fontFamily: 'Fredoka_700Bold', fontSize: 16 }}>{done ? '✓' : lesson.level}</Text></View>
        <View style={{ flex: 1 }}>
          <AppText variant="bodyStrong" numberOfLines={2}>{lesson.title}</AppText>
          <AppText variant="caption" tone="secondary" numberOfLines={2}>{lesson.summary}</AppText>
          <View style={styles.badges}>
            <Badge label={lesson.forMyAge ? t('learn.myAge', { age: lesson.recommendedAge }) : t('learn.age', { age: lesson.recommendedAge })} emoji={lesson.forMyAge ? '🎂' : '🧭'} />
            <Badge label={lesson.difficultyLabel} emoji={lesson.difficulty === 'beginner' ? '🌱' : lesson.difficulty === 'intermediate' ? '🌿' : '🌳'} />
            <Badge label={t('learn.minutes', { n: lesson.estimatedMinutes })} icon="timer" />
            {lesson.curriculum?.status === 'verified' && <Badge label="📗" color="#E6F8DA" />}
            {lesson.adultAssisted && <Badge label="🧑‍🤝‍🧑" />}
          </View>
          {p && !done && p.stepsDone > 0 && <ProgressBar value={p.stepsDone / Math.max(1, p.stepsTotal)} height={6} color={color} />}
        </View>
      </View>
    </CandyCard>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: space.screen, maxWidth: 680, width: '100%', alignSelf: 'center' },
  top: { flexDirection: 'row', alignItems: 'center' },
  badges: { flexDirection: 'row', gap: 6, marginTop: 6, flexWrap: 'wrap', alignItems: 'center' },
  safety: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', borderRadius: 16, padding: space.md, marginTop: space.md },
  ageBox: { borderRadius: 20, padding: space.md, marginTop: space.lg, gap: space.sm },
  ageHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm, flexWrap: 'wrap' },
  chips: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  lesson: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.md },
  lessonNum: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
});
