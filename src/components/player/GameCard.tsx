// A game tile: candy colour, big emoji, name, favourite heart and best stars.
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { AppText, CandyCard, Stars, Tactile, Icon } from '../../ui';
import { metaFor, isImplemented } from '../../games/registry';
import type { CatalogueGame } from '../../types';
import { t } from '../../i18n';

export function GameCard({ game, onPress, onFavourite, favouritesAllowed, width }: { game: CatalogueGame; onPress: () => void; onFavourite?: (fav: boolean) => void; favouritesAllowed: boolean; width: number }) {
  const meta = metaFor(game.id);
  const ready = isImplemented(game.id);
  return (
    <CandyCard color={meta.color} onPress={onPress} label={game.name} style={{ width, opacity: ready ? 1 : 0.6 }}>
      <View style={styles.inner}>
        <View style={styles.top}>
          <Text style={styles.emoji}>{meta.emoji}</Text>
          {favouritesAllowed && onFavourite && (
            <Tactile onPress={() => onFavourite(!game.favourite)} hitSlop={10} accessibilityRole="button" accessibilityLabel={t('games.favourites')} accessibilityState={{ selected: game.favourite }}>
              <Icon name="heart" size="md" color={game.favourite ? '#FF5F6D' : 'rgba(255,255,255,0.8)'} fill={game.favourite ? '#FF5F6D' : 'transparent'} />
            </Tactile>
          )}
        </View>
        <Text style={styles.name} numberOfLines={2}>{game.name}</Text>
        <AppText variant="caption" style={styles.tag} numberOfLines={1}>{ready ? game.tagline : t('games.inDevelopment')}</AppText>
        {game.progress && game.progress.stars > 0 ? <Stars count={game.progress.stars} size={16} /> : null}
      </View>
    </CandyCard>
  );
}

const styles = StyleSheet.create({
  inner: { padding: 12, minHeight: 150 },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  emoji: { fontSize: 40 },
  name: { fontFamily: 'Fredoka_700Bold', fontSize: 18, color: '#fff', marginTop: 6, lineHeight: 22 },
  tag: { color: 'rgba(255,255,255,0.9)', marginTop: 2 },
});
