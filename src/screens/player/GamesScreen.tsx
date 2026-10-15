import React, { useCallback, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, TextInput, useWindowDimensions, View } from 'react-native';
import { CompositeScreenProps, useFocusEffect } from '@react-navigation/native';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { PlayerTabParamList, RootStackParamList } from '../../navigation/types';
import { AppText, Chip, EmptyState } from '../../ui';
import { PlayerScreen } from '../../components/player/PlayerScreen';
import { GameCard } from '../../components/player/GameCard';
import { usePlayer } from '../../context/PlayerContext';
import { GAME_CATEGORIES, isImplemented } from '../../games/registry';
import { useRemoteConfig } from '../../context/RemoteConfigContext';
import { space } from '../../theme/spacing';
import { useTheme } from '../../theme/ThemeContext';
import { t } from '../../i18n';

type Props = CompositeScreenProps<BottomTabScreenProps<PlayerTabParamList, 'Games'>, NativeStackScreenProps<RootStackParamList>>;

export function GamesScreen({ navigation, route }: Props) {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const p = usePlayer();
  const { config } = useRemoteConfig();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<string>(route.params?.category ?? 'all');
  useFocusEffect(
    useCallback(() => {
      void p.loadGames();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
  );
  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return p.games
      .filter((g) => isImplemented(g.id) || config.features.showInDevelopmentGames)
      .filter((g) => (filter === 'all' ? true : filter === 'fav' ? g.favourite : filter === 'recent' ? !!g.progress?.lastPlayedAt : g.categoryId === filter))
      .filter((g) => !q || g.name.toLowerCase().includes(q) || g.skills.some((s) => s.includes(q)));
  }, [p.games, filter, query, config.features.showInDevelopmentGames]);
  const cols = width >= 700 ? 4 : width >= 480 ? 3 : 2;
  const cardW = (Math.min(width, 760) - space.screen * 2 - space.md * (cols - 1)) / cols;
  const favAllowed = p.me?.controls.favouritesEnabled ?? true;

  return (
    <PlayerScreen title={t('games.title')} emoji="🎮">
      {!p.entitled ? (
        <EmptyState emoji="🔒" title={t('home.locked.title')} body={t('home.locked.body')} />
      ) : (
        <>
          <View style={[styles.search, { backgroundColor: colors.surfaceRaised, borderColor: colors.borderStrong }]}>
            <AppText variant="heading">🔍</AppText>
            <TextInput value={query} onChangeText={setQuery} placeholder={t('games.search')} placeholderTextColor={colors.textMuted} style={[styles.input, { color: colors.text }]} accessibilityLabel={t('games.search')} />
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
            <Chip label={t('common.all')} emoji="🌟" selected={filter === 'all'} onPress={() => setFilter('all')} />
            {favAllowed && <Chip label={t('games.favourites')} emoji="❤️" selected={filter === 'fav'} onPress={() => setFilter('fav')} />}
            <Chip label={t('games.recent')} emoji="🕒" selected={filter === 'recent'} onPress={() => setFilter('recent')} />
            {GAME_CATEGORIES.map((c) => (
              <Chip key={c.id} label={c.name} emoji={c.emoji} color={c.color} selected={filter === c.id} onPress={() => setFilter(c.id)} />
            ))}
          </ScrollView>
          {list.length === 0 ? (
            <EmptyState emoji="🧐" title={t('games.empty')} />
          ) : (
            <View style={styles.grid}>
              {list.map((g) => (
                <GameCard key={g.id} game={g} width={cardW} favouritesAllowed={favAllowed} onFavourite={(f) => void p.toggleFavourite(g.id, f)} onPress={() => navigation.navigate('GameDetail', { gameId: g.id })} />
              ))}
            </View>
          )}
        </>
      )}
    </PlayerScreen>
  );
}

const styles = StyleSheet.create({
  search: { flexDirection: 'row', alignItems: 'center', gap: space.sm, height: 56, borderRadius: 28, borderWidth: 2, paddingHorizontal: space.lg, marginBottom: space.md },
  input: { flex: 1, fontSize: 18, fontFamily: 'Nunito_600SemiBold', height: '100%' },
  chips: { gap: space.sm, paddingBottom: space.md },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md },
});
