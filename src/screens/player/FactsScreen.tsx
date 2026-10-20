import React, { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { CompositeScreenProps, useFocusEffect } from '@react-navigation/native';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { PlayerTabParamList, RootStackParamList } from '../../navigation/types';
import { AppText, BigButton, CandyCard, Chip, EmojiDisc, EmptyState, LoadingState, Badge } from '../../ui';
import { PlayerScreen } from '../../components/player/PlayerScreen';
import { Section } from './PlayerHomeScreen';
import { usePlayer } from '../../context/PlayerContext';
import { playerApi, type FactCategory } from '../../api/player';
import { palette } from '../../theme/palette';
import { space } from '../../theme/spacing';
import { useTheme } from '../../theme/ThemeContext';
import type { Fact } from '../../types';
import { t } from '../../i18n';

export const CATEGORY_EMOJI: Record<string, string> = {
  space: '🚀', animals: '🦁', senses: '👁️', oceans: '🌊', dinosaurs: '🦕', experiments: '🧪', physics: '⚡', plants: '🌱', inventions: '💡', india: '🏛️', geography: '🌍', weather: '🌦️', maths: '🔢', technology: '🤖', engineering: '🏗️', food: '🍲', adaptations: '🦎', ancient: '🏺', mysteries: '🧩', arts: '🎨', general: '📚',
};
export const ILLUSTRATION_EMOJI: Record<string, string> = {
  sparkles: '✨', moon: '🌙', lightning: '⚡', ship: '🚢', rainbow: '🌈', bee: '🐝', astronaut: '🧑‍🚀', penguin: '🐧', bridge: '🌉', seed: '🌰', desert: '🏜️', bird: '🐦', starfish: '⭐', plant: '🌿', metal: '🔩', origami: '🦢', sun: '☀️', volcano: '🌋', elephant: '🐘', octopus: '🐙', dinosaur: '🦖', whale: '🐋', honey: '🍯', bat: '🦇', cactus: '🌵', tiger: '🐯', peacock: '🦚', chameleon: '🦎', brain: '🧠', heart: '❤️', snowflake: '❄️', earth: '🌍', train: '🚆', computer: '💻', wheel: '☸️', zero: '0️⃣', mango: '🥭', rice: '🍚', hummingbird: '🐦', tortoise: '🐢', coral: '🪸', salt: '🧂', paper: '📄', kite: '🪁', lotus: '🪷', glass: '🥛', magnet: '🧲', camel: '🐪', mountain: '🏔️', river: '🏞️', clock: '🕰️', rocket: '🚀',
};

type Props = CompositeScreenProps<BottomTabScreenProps<PlayerTabParamList, 'Facts'>, NativeStackScreenProps<RootStackParamList>>;

export function FactsScreen({ navigation, route }: Props) {
  const { colors } = useTheme();
  const p = usePlayer();
  const [cats, setCats] = useState<FactCategory[]>([]);
  const [daily, setDaily] = useState<Fact | null>(null);
  const [filter, setFilter] = useState<string>(route.params?.category ?? 'all');
  const [facts, setFacts] = useState<Fact[]>([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<'browse' | 'saved' | 'history'>('browse');

  const load = useCallback(async () => {
    if (!p.entitled) return setLoading(false);
    try {
      const [c, d] = await Promise.all([playerApi.factCategories(), playerApi.dailyFact().catch(() => null)]);
      setCats(c);
      setDaily(d);
    } catch {
      // offline: keep what we have
    }
  }, [p.entitled]);
  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );
  useEffect(() => {
    if (!p.entitled) return;
    setLoading(true);
    const req = mode === 'history' ? playerApi.factHistory() : mode === 'saved' ? playerApi.factHistory().then((h) => h.filter((f) => f.favourite)) : playerApi.facts(filter === 'all' ? undefined : filter, 60).then((r) => r.facts);
    req.then(setFacts).catch(() => undefined).finally(() => setLoading(false));
  }, [filter, mode, p.entitled]);

  const surprise = async () => {
    try {
      const f = await playerApi.randomFact();
      navigation.navigate('FactDetail', { factId: f.id, fact: f });
    } catch {
      // ignore
    }
  };
  const favAllowed = p.me?.controls.favouritesEnabled ?? true;

  return (
    <PlayerScreen title={t('facts.title')} emoji="💡">
      {!p.entitled ? (
        <EmptyState emoji="🔒" title={t('home.locked.title')} body={t('home.locked.body')} />
      ) : (
        <>
          {daily && mode === 'browse' && (
            <CandyCard color={palette.sunshine} onPress={() => navigation.navigate('FactDetail', { factId: daily.id, fact: daily })} label={daily.headline}>
              <View style={styles.hero}>
                <EmojiDisc emoji={ILLUSTRATION_EMOJI[daily.illustration] ?? '✨'} color={palette.sunshineDeep} size={64} />
                <View style={{ flex: 1 }}>
                  <AppText variant="caption" style={{ color: '#5a4500' }}>{t('facts.daily')}</AppText>
                  <Text style={styles.heroTitle} numberOfLines={3}>{daily.headline}</Text>
                </View>
              </View>
            </CandyCard>
          )}
          <BigButton label={t('facts.random')} emoji="🎲" color={palette.grape} onPress={surprise} fullWidth style={{ marginTop: space.md }} />
          <View style={styles.modes}>
            <Chip label={t('facts.topics')} emoji="📚" selected={mode === 'browse'} onPress={() => setMode('browse')} />
            {favAllowed && <Chip label={t('facts.saved')} emoji="⭐" selected={mode === 'saved'} onPress={() => setMode('saved')} />}
            <Chip label={t('facts.history')} emoji="🕒" selected={mode === 'history'} onPress={() => setMode('history')} />
          </View>
          {mode === 'browse' && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
              <Chip label={t('common.all')} emoji="🌟" selected={filter === 'all'} onPress={() => setFilter('all')} small />
              {cats.map((c) => (
                <Chip key={c.key} label={c.name} emoji={CATEGORY_EMOJI[c.key] ?? '✨'} color={c.color} selected={filter === c.key} onPress={() => setFilter(c.key)} small />
              ))}
            </ScrollView>
          )}
          <Section title={mode === 'browse' ? (filter === 'all' ? t('common.all') : (cats.find((c) => c.key === filter)?.name ?? '')) : mode === 'saved' ? t('facts.saved') : t('facts.history')}>
            {loading ? (
              <LoadingState />
            ) : facts.length === 0 ? (
              <EmptyState emoji="🔭" title={t('facts.empty')} />
            ) : (
              facts.map((f) => {
                const cat = cats.find((c) => c.key === f.category);
                return (
                  <CandyCard key={f.id} color={cat?.color ?? palette.sky} onPress={() => navigation.navigate('FactDetail', { factId: f.id, fact: f })} label={f.headline} style={{ marginBottom: space.md }}>
                    <View style={[styles.row, { backgroundColor: colors.surfaceRaised }]}>
                      <EmojiDisc emoji={ILLUSTRATION_EMOJI[f.illustration] ?? CATEGORY_EMOJI[f.category] ?? '✨'} color={cat?.color ?? palette.sky} size={56} />
                      <View style={{ flex: 1 }}>
                        <AppText variant="subheading" numberOfLines={2}>{f.headline}</AppText>
                        <View style={{ flexDirection: 'row', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
                          {cat && <Badge label={cat.name} emoji={CATEGORY_EMOJI[cat.key]} />}
                          {f.viewed && <Badge label="✓" color={colors.successSoft} />}
                          {f.favourite && <Badge label="⭐" />}
                        </View>
                      </View>
                    </View>
                  </CandyCard>
                );
              })
            )}
          </Section>
        </>
      )}
    </PlayerScreen>
  );
}

const styles = StyleSheet.create({
  hero: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.lg },
  heroTitle: { fontFamily: 'Fredoka_700Bold', fontSize: 20, color: '#3a2d00', lineHeight: 25 },
  modes: { flexDirection: 'row', gap: space.sm, marginTop: space.lg, flexWrap: 'wrap' },
  chips: { gap: space.sm, paddingVertical: space.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.md },
});
