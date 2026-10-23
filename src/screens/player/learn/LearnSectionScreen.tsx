// One section (Study Playfully, Music or Sports): its subjects as cards with
// honest availability, the child's level in each, and the age framework.
import React, { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RootStackParamList } from '../../../navigation/types';
import { AppText, Badge, CandyCard, Chip, LoadingState, PlayfulBackdrop, PopIn, RoundButton, lighten } from '../../../ui';
import { playerApi } from '../../../api/player';
import type { LearningCatalogue, SubjectInfo } from '../../../learning/types';
import { palette } from '../../../theme/palette';
import { space } from '../../../theme/spacing';
import { useTheme } from '../../../theme/ThemeContext';
import { t } from '../../../i18n';

export const AGE_GROUPS: { key: 'A' | 'B' | 'C' | 'D'; ages: number[]; emoji: string }[] = [
  { key: 'A', ages: [3, 4, 5], emoji: '🧸' },
  { key: 'B', ages: [6, 7, 8], emoji: '🧠' },
  { key: 'C', ages: [9, 10], emoji: '🔭' },
  { key: 'D', ages: [11, 12], emoji: '🚀' },
];

export function LearnSectionScreen({ navigation, route }: NativeStackScreenProps<RootStackParamList, 'LearnSection'>) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [cat, setCat] = useState<LearningCatalogue | null>(null);
  const [filter, setFilter] = useState<'all' | 'ready' | 'started'>('all');
  useFocusEffect(
    useCallback(() => {
      playerApi.learningCatalogue().then(setCat).catch(() => undefined);
    }, [])
  );
  const section = cat?.sections.find((s) => s.key === route.params.section);
  const subjects = (section?.subjects ?? []).filter((s) => !s.blocked).filter((s) => (filter === 'ready' ? s.availability !== 'coming_soon' : filter === 'started' ? s.completed + s.started > 0 : true));
  const availabilityLabel = (s: SubjectInfo) => (s.availability === 'coming_soon' ? t('learn.comingSoon') : s.availability === 'other_ages' ? t('learn.otherAges') : t('learn.available'));
  return (
    <PlayfulBackdrop colors={[lighten(section?.color ?? palette.grape, 0.4), colors.background]}>
      <ScrollView contentContainerStyle={[styles.wrap, { paddingTop: insets.top + space.md, paddingBottom: insets.bottom + space.xl }]}>
        <View style={styles.top}>
          <RoundButton icon="arrowLeft" label={t('common.back')} onPress={() => navigation.goBack()} color={palette.cherry} size={46} />
          <View style={{ flex: 1 }} />
        </View>
        {!section ? (
          <LoadingState />
        ) : (
          <>
            <PopIn style={{ alignItems: 'center' }}>
              <Text style={{ fontSize: 80 }}>{section.emoji}</Text>
              <AppText variant="display" align="center">{section.name}</AppText>
              <AppText variant="subheading" tone="secondary" align="center">{section.tagline}</AppText>
              {cat && <Badge label={t('learn.myAge', { age: cat.myAge })} emoji="🎂" color={colors.surfaceRaised} />}
            </PopIn>
            <View style={styles.chips}>
              <Chip label={t('common.all')} emoji="🌟" selected={filter === 'all'} onPress={() => setFilter('all')} small />
              <Chip label={t('learn.available')} emoji="✅" selected={filter === 'ready'} onPress={() => setFilter('ready')} small />
              <Chip label={t('learn.continue')} emoji="▶️" selected={filter === 'started'} onPress={() => setFilter('started')} small />
            </View>
            <View style={styles.grid}>
              {subjects.map((s, i) => (
                <PopIn key={s.key} delay={i * 40} style={styles.cell}>
                  <CandyCard color={s.availability === 'coming_soon' ? '#B8B3D1' : s.color} onPress={() => navigation.navigate('Subject', { subject: s.key })} label={s.name}>
                    <View style={styles.card}>
                      <Text style={{ fontSize: 40 }}>{s.emoji}</Text>
                      <Text style={styles.cardTitle} numberOfLines={2}>{s.name}</Text>
                      <Text style={styles.cardMeta} numberOfLines={2}>{availabilityLabel(s)}{s.lessonCount ? ` · ${t('learn.lessons', { n: s.lessonCount })}` : ''}</Text>
                      {s.level && <Text style={styles.cardMeta}>⭐ {t('learn.level', { age: s.level.age })} · {t('learn.completed', { n: s.completed })}</Text>}
                      {s.adultAssistedBelowAge && cat && cat.myAge < s.adultAssistedBelowAge ? <Text style={styles.cardMeta}>🧑‍🤝‍🧑 {t('learn.adultAssisted')}</Text> : null}
                    </View>
                  </CandyCard>
                </PopIn>
              ))}
            </View>
            {section.key === 'sports' && (
              <View style={[styles.note, { backgroundColor: colors.surfaceRaised }]}>
                <Text>🦺</Text>
                <AppText variant="caption" tone="secondary" style={{ flex: 1 }}>{t('learn.screenOnly')}</AppText>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </PlayfulBackdrop>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: space.screen, maxWidth: 760, width: '100%', alignSelf: 'center' },
  top: { flexDirection: 'row', alignItems: 'center' },
  chips: { flexDirection: 'row', gap: space.sm, marginTop: space.lg, flexWrap: 'wrap' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md, marginTop: space.md },
  cell: { width: '47%', flexGrow: 1 },
  card: { padding: space.md, minHeight: 150 },
  cardTitle: { fontFamily: 'Fredoka_700Bold', fontSize: 18, color: '#fff', marginTop: 4 },
  cardMeta: { fontFamily: 'Nunito_700Bold', fontSize: 12, color: 'rgba(255,255,255,0.92)', marginTop: 4 },
  note: { flexDirection: 'row', gap: 8, alignItems: 'center', borderRadius: 16, padding: space.md, marginTop: space.lg },
});
