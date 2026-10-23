import React, { useCallback, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import { AppText, CandyCard, Chip, EmptyState, Badge, ProgressBar } from '../../ui';
import { PlayerScreen } from '../../components/player/PlayerScreen';
import { usePlayer } from '../../context/PlayerContext';
import { palette } from '../../theme/palette';
import { space } from '../../theme/spacing';
import { useTheme } from '../../theme/ThemeContext';
import type { Craft } from '../../types';
import { t } from '../../i18n';

export const CRAFT_KIND_META: Record<Craft['kind'], { emoji: string; color: string; label: () => string }> = {
  origami: { emoji: '🦢', color: palette.sunshine, label: () => t('craft.origami') },
  paper_craft: { emoji: '✂️', color: palette.tangerine, label: () => t('craft.paper') },
  drawing: { emoji: '🖍️', color: palette.bubblegum, label: () => t('craft.drawing') },
  digital: { emoji: '🎨', color: palette.sky, label: () => t('craft.digital') },
};

export const DIFFICULTY_LABEL = ['', 'Very easy', 'Easy', 'Medium', 'Tricky', 'Advanced'];

type Props = NativeStackScreenProps<RootStackParamList, 'CraftLibrary'>;

export function CraftLibraryScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const p = usePlayer();
  const [kind, setKind] = useState<'all' | Craft['kind']>('all');
  const [difficulty, setDifficulty] = useState<number | null>(null);
  useFocusEffect(
    useCallback(() => {
      void p.loadCrafts();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
  );
  const list = useMemo(() => p.crafts.filter((c) => (kind === 'all' || c.kind === kind) && (difficulty === null || c.difficulty === difficulty)), [p.crafts, kind, difficulty]);

  return (
    <PlayerScreen title={t('craft.title')} emoji="✂️">
      {!p.entitled ? (
        <EmptyState emoji="🔒" title={t('home.locked.title')} body={t('home.locked.body')} />
      ) : (
        <>
          <AppText variant="subheading" tone="secondary">{t('craft.subtitle')}</AppText>
          <View style={styles.quick}>
            <CandyCard color={palette.bubblegum} onPress={() => navigation.navigate('GameDetail', { gameId: 'drawing-canvas' })} label={t('craft.drawing')} style={{ flex: 1 }}>
              <View style={styles.quickInner}><Text style={{ fontSize: 36 }}>🎨</Text><Text style={styles.quickLabel}>{t('craft.drawing')}</Text></View>
            </CandyCard>
            <CandyCard color={palette.cherry} onPress={() => navigation.navigate('GameDetail', { gameId: 'colouring-book' })} label="Colouring" style={{ flex: 1 }}>
              <View style={styles.quickInner}><Text style={{ fontSize: 36 }}>🖍️</Text><Text style={styles.quickLabel}>Colouring</Text></View>
            </CandyCard>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
            <Chip label={t('common.all')} emoji="🌟" selected={kind === 'all'} onPress={() => setKind('all')} />
            {(Object.keys(CRAFT_KIND_META) as Craft['kind'][]).map((k) => (
              <Chip key={k} label={CRAFT_KIND_META[k].label()} emoji={CRAFT_KIND_META[k].emoji} color={CRAFT_KIND_META[k].color} selected={kind === k} onPress={() => setKind(k)} />
            ))}
          </ScrollView>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
            <Chip label={t('common.all')} selected={difficulty === null} onPress={() => setDifficulty(null)} small />
            {[1, 2, 3, 4, 5].map((d) => (
              <Chip key={d} label={`${'⭐'.repeat(d)}`} selected={difficulty === d} onPress={() => setDifficulty(d)} small />
            ))}
          </ScrollView>
          {list.length === 0 ? (
            <EmptyState emoji="📦" title={t('games.empty')} />
          ) : (
            list.map((c) => {
              const m = CRAFT_KIND_META[c.kind];
              return (
                <CandyCard key={c.id} color={m.color} onPress={() => navigation.navigate('CraftDetail', { craftId: c.id })} label={c.title} style={{ marginBottom: space.md }}>
                  <View style={[styles.row, { backgroundColor: colors.surfaceRaised }]}>
                    <Text style={{ fontSize: 44 }}>{(c.finalPreview as { emoji?: string } | undefined)?.emoji ?? m.emoji}</Text>
                    <View style={{ flex: 1 }}>
                      <AppText variant="subheading" numberOfLines={2}>{c.title}</AppText>
                      <View style={styles.badges}>
                        <Badge label={m.label()} emoji={m.emoji} />
                        <Badge label={DIFFICULTY_LABEL[c.difficulty] ?? ''} emoji="⭐" />
                        <Badge label={t('craft.time', { n: c.estimatedMinutes })} icon="timer" />
                        {c.adultSupervision && <Badge label="👨‍👧" color={colors.warningSoft} />}
                        {c.physical ? <Badge label={t('craft.physical')} emoji="📄" /> : <Badge label={t('craft.onScreen')} emoji="📱" />}
                      </View>
                      {c.progress && <ProgressBar value={c.stepCount ? c.progress.stepsDone / c.stepCount : 0} color={m.color} height={8} />}
                    </View>
                  </View>
                </CandyCard>
              );
            })
          )}
        </>
      )}
    </PlayerScreen>
  );
}

const styles = StyleSheet.create({
  quick: { flexDirection: 'row', gap: space.md, marginTop: space.md },
  quickInner: { padding: space.md, alignItems: 'center' },
  quickLabel: { fontFamily: 'Fredoka_600SemiBold', fontSize: 16, color: '#fff', marginTop: 4 },
  chips: { gap: space.sm, paddingVertical: space.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.md },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginVertical: 6 },
});
