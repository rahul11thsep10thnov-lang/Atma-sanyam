// Before playing: what the game is, how to play (read aloud for the little
// ones), the level picker, best scores, and the big Play button.
import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RootStackParamList } from '../../navigation/types';
import { AppText, BigButton, Chip, PlayfulBackdrop, PopIn, RoundButton, Stars, Badge } from '../../ui';
import { usePlayer } from '../../context/PlayerContext';
import { useSettings } from '../../context/SettingsContext';
import { isImplemented, metaFor } from '../../games/registry';
import { speak, stopSpeaking } from '../../games/shared/audio';
import { palette } from '../../theme/palette';
import { space } from '../../theme/spacing';
import { useTheme } from '../../theme/ThemeContext';
import { t } from '../../i18n';

export function GameDetailScreen({ navigation, route }: NativeStackScreenProps<RootStackParamList, 'GameDetail'>) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const p = usePlayer();
  const { settings } = useSettings();
  const game = p.games.find((g) => g.id === route.params.gameId);
  const meta = metaFor(route.params.gameId);
  const [difficulty, setDifficulty] = useState(game?.progress?.highestDifficulty ?? game?.difficulties[0]?.key ?? 'normal');
  const narration = settings.narrationEnabled && (p.me?.controls.narrationEnabled ?? true);
  useEffect(() => {
    if (game && p.child?.effectiveBracket === 'A') speak(`${game.name}. ${game.instructions}`, narration);
    return () => stopSpeaking();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game?.id]);
  if (!game) return null;
  const ready = isImplemented(game.id);
  const playtime = p.me?.playtime;
  const canPlay = ready && p.entitled && (playtime?.allowed ?? true);
  const level = game.difficulties.find((d) => d.key === difficulty) ?? game.difficulties[0];

  return (
    <PlayfulBackdrop colors={[meta.color, colors.background]}>
      <ScrollView contentContainerStyle={[styles.wrap, { paddingTop: insets.top + space.md, paddingBottom: insets.bottom + space.xl }]}>
        <View style={styles.top}>
          <RoundButton icon="close" label={t('common.close')} onPress={() => navigation.goBack()} color={palette.cherry} size={46} />
          <View style={{ flex: 1 }} />
          <RoundButton emoji="🔊" label={t('facts.readAloud')} onPress={() => speak(`${game.name}. ${game.instructions}`, narration)} color={palette.sky} size={46} />
        </View>
        <PopIn style={{ alignItems: 'center' }}>
          <Text style={{ fontSize: 96 }}>{meta.emoji}</Text>
          <AppText variant="display" align="center">{game.name}</AppText>
          <AppText variant="subheading" tone="secondary" align="center">{game.tagline}</AppText>
          <View style={styles.badges}>
            <Badge label={t('games.minutes', { n: game.estimatedMinutes })} icon="timer" />
            {game.progress?.stars ? <Stars count={game.progress.stars} size={18} /> : null}
            {game.progress?.bestScore !== null && game.progress?.bestScore !== undefined ? <Badge label={`${t('games.best')} ${game.progress.bestScore}`} icon="trophy" /> : null}
          </View>
        </PopIn>
        <View style={[styles.card, { backgroundColor: colors.surfaceRaised }]}>
          <AppText variant="heading">📖 {t('games.howToPlay')}</AppText>
          <AppText variant="body" style={{ marginTop: space.sm }}>{game.instructions}</AppText>
          {game.skills.length > 0 && (
            <AppText variant="caption" tone="muted" style={{ marginTop: space.sm }}>
              {t('games.skills')}: {game.skills.join(' · ')}
            </AppText>
          )}
        </View>
        {game.difficulties.length > 1 && (
          <View style={[styles.card, { backgroundColor: colors.surfaceRaised }]}>
            <AppText variant="heading">🎚️ {t('games.difficulty')}</AppText>
            <View style={styles.levels}>
              {game.difficulties.map((d, i) => (
                <Chip key={d.key} label={d.label} selected={difficulty === d.key} color={[palette.lime, palette.sunshine, palette.tangerine, palette.cherry, palette.grape][i % 5]} onPress={() => setDifficulty(d.key)} />
              ))}
            </View>
          </View>
        )}
        {!ready && <AppText variant="bodyStrong" tone="secondary" align="center" style={{ marginTop: space.md }}>{t('games.inDevelopment')}</AppText>}
        {playtime && !playtime.allowed && <AppText variant="bodyStrong" tone="warning" align="center" style={{ marginTop: space.md }}>{playtime.message}</AppText>}
        {p.offline && <AppText variant="bodySmall" tone="muted" align="center" style={{ marginTop: space.md }}>{t('games.offline')}</AppText>}
        <BigButton label={`${t('games.play')} · ${level?.label ?? ''}`} emoji="▶️" size="xl" color={palette.lime} fullWidth disabled={!canPlay} onPress={() => navigation.replace('GamePlay', { gameId: game.id, difficulty })} style={{ marginTop: space.xl }} />
      </ScrollView>
    </PlayfulBackdrop>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: space.screen, maxWidth: 560, width: '100%', alignSelf: 'center' },
  top: { flexDirection: 'row', alignItems: 'center' },
  badges: { flexDirection: 'row', gap: space.sm, marginTop: space.sm, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' },
  card: { borderRadius: 24, padding: space.lg, marginTop: space.lg },
  levels: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginTop: space.md },
});
