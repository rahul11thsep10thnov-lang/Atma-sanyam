// The Learn tab: three academy doors (Study Playfully, Music, Sports) plus
// Art & Craft, the child's learning age, and a glance at where they are.
import React, { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { CompositeScreenProps, useFocusEffect } from '@react-navigation/native';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { PlayerTabParamList, RootStackParamList } from '../../../navigation/types';
import { AppText, Badge, CandyCard, EmptyState, PopIn, ProgressBar } from '../../../ui';
import { PlayerScreen } from '../../../components/player/PlayerScreen';
import { Section } from '../PlayerHomeScreen';
import { usePlayer } from '../../../context/PlayerContext';
import { useRemoteConfig } from '../../../context/RemoteConfigContext';
import { playerApi } from '../../../api/player';
import type { LearningCatalogue, LearningReport } from '../../../learning/types';
import { palette } from '../../../theme/palette';
import { space } from '../../../theme/spacing';
import { useTheme } from '../../../theme/ThemeContext';
import { t } from '../../../i18n';

type Props = CompositeScreenProps<BottomTabScreenProps<PlayerTabParamList, 'Learn'>, NativeStackScreenProps<RootStackParamList>>;

export function LearnScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const p = usePlayer();
  const { config } = useRemoteConfig();
  const [cat, setCat] = useState<LearningCatalogue | null>(null);
  const [report, setReport] = useState<LearningReport | null>(null);
  useFocusEffect(
    useCallback(() => {
      if (!p.entitled && p.me?.access !== 'ad_supported') return;
      playerApi.learningCatalogue().then(setCat).catch(() => undefined);
      playerApi.learningReport().then(setReport).catch(() => undefined);
    }, [p.entitled, p.me?.access])
  );
  if (!p.entitled && p.me?.access !== 'ad_supported') {
    return (
      <PlayerScreen title={t('learn.title')} emoji="📚">
        <EmptyState emoji="🔒" title={t('home.locked.title')} body={t('home.locked.body')} />
      </PlayerScreen>
    );
  }
  const flags = config.features;
  const doors = [
    { key: 'study' as const, on: flags.studyPlayfully, emoji: '📚', color: palette.grape, title: t('learn.study') },
    { key: 'music' as const, on: flags.music, emoji: '🎹', color: palette.bubblegum, title: t('learn.music') },
    { key: 'sports' as const, on: flags.sports, emoji: '🏏', color: palette.lime, title: t('learn.sports') },
  ].filter((d) => d.on);
  return (
    <PlayerScreen title={t('learn.title')} emoji="📚">
      <AppText variant="subheading" tone="secondary">{t('learn.subtitle')}</AppText>
      {cat && (
        <View style={styles.ageRow}>
          <Badge label={t('learn.myAge', { age: cat.myAge })} emoji="🎂" color={colors.surfaceRaised} />
          <Badge label={t(`bracket.${cat.myBracket}` as 'bracket.A')} emoji="⭐" color={colors.surfaceRaised} />
          {report && report.totals.streakDays > 0 && <Badge label={`🔥 ${report.totals.streakDays}`} color="#FFF4CC" />}
        </View>
      )}
      <View style={styles.doors}>
        {doors.map((d, i) => {
          const sec = cat?.sections.find((s) => s.key === d.key);
          const lessons = sec?.subjects.reduce((n, s) => n + s.lessonCount, 0) ?? 0;
          const done = sec?.subjects.reduce((n, s) => n + s.completed, 0) ?? 0;
          return (
            <PopIn key={d.key} delay={i * 80}>
              <CandyCard color={d.color} onPress={() => navigation.navigate('LearnSection', { section: d.key })} label={d.title}>
                <View style={styles.door}>
                  <Text style={{ fontSize: 56 }}>{d.emoji}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.doorTitle}>{d.title}</Text>
                    <Text style={styles.doorSub} numberOfLines={2}>{sec?.subjects.filter((s) => !s.blocked).map((s) => s.name).slice(0, 4).join(' · ') ?? ''}</Text>
                    {lessons > 0 && <Text style={styles.doorMeta}>{t('learn.lessons', { n: lessons })} · {t('learn.completed', { n: done })}</Text>}
                  </View>
                  <Text style={{ fontSize: 28, color: '#fff' }}>›</Text>
                </View>
              </CandyCard>
            </PopIn>
          );
        })}
        {flags.artAndCraft && (
          <PopIn delay={doors.length * 80}>
            <CandyCard color={palette.tangerine} onPress={() => navigation.navigate('CraftLibrary')} label={t('learn.craft')}>
              <View style={styles.door}>
                <Text style={{ fontSize: 56 }}>✂️</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.doorTitle}>{t('learn.craft')}</Text>
                  <Text style={styles.doorSub}>{t('craft.subtitle')}</Text>
                </View>
                <Text style={{ fontSize: 28, color: '#fff' }}>›</Text>
              </View>
            </CandyCard>
          </PopIn>
        )}
      </View>
      {report && report.nextLessons.length > 0 && (
        <Section title={t('learn.report.next')} emoji="➡️">
          {report.nextLessons.slice(0, 3).map((l) => (
            <CandyCard key={l.id} color={palette.sky} onPress={() => navigation.navigate('Lesson', { lessonId: l.id, age: l.recommendedAge })} label={l.title} style={{ marginBottom: space.sm }}>
              <View style={[styles.lessonRow, { backgroundColor: colors.surfaceRaised }]}>
                <View style={{ flex: 1 }}>
                  <AppText variant="bodyStrong" numberOfLines={1}>{l.title}</AppText>
                  <AppText variant="caption" tone="secondary">{l.ageLabel} · {l.difficultyLabel} · {t('learn.minutes', { n: l.estimatedMinutes })}</AppText>
                  {l.progress && !l.progress.completedAt && <ProgressBar value={l.progress.stepsDone / Math.max(1, l.progress.stepsTotal)} height={6} color={palette.sky} />}
                </View>
              </View>
            </CandyCard>
          ))}
        </Section>
      )}
      {report && report.goals.length > 0 && (
        <Section title={t('learn.report.goals')} emoji="🎯">
          {report.goals.map((g) => (
            <View key={g.subject} style={[styles.goal, { backgroundColor: colors.surfaceRaised }]}>
              <Text style={{ fontSize: 26 }}>{g.emoji}</Text>
              <View style={{ flex: 1 }}>
                <AppText variant="bodyStrong">{g.name}</AppText>
                <AppText variant="caption" tone="secondary">{t('learn.report.goal', { done: g.doneThisWeek, target: g.lessonsPerWeek })}</AppText>
                <ProgressBar value={g.doneThisWeek / Math.max(1, g.lessonsPerWeek)} height={8} color={g.met ? palette.lime : palette.sunshine} />
              </View>
              {g.met && <Text style={{ fontSize: 22 }}>✅</Text>}
            </View>
          ))}
        </Section>
      )}
    </PlayerScreen>
  );
}

const styles = StyleSheet.create({
  ageRow: { flexDirection: 'row', gap: space.sm, marginTop: space.sm, flexWrap: 'wrap' },
  doors: { gap: space.md, marginTop: space.lg },
  door: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.lg },
  doorTitle: { fontFamily: 'Fredoka_700Bold', fontSize: 24, color: '#fff' },
  doorSub: { fontFamily: 'Nunito_600SemiBold', fontSize: 13, color: 'rgba(255,255,255,0.92)', marginTop: 2 },
  doorMeta: { fontFamily: 'Nunito_700Bold', fontSize: 12, color: 'rgba(255,255,255,0.9)', marginTop: 4 },
  lessonRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.md },
  goal: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.md, borderRadius: 18, marginBottom: space.sm },
});
