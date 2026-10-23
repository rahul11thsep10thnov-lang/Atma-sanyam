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
import { useRemoteConfig } from '../../context/RemoteConfigContext';
import { isImplemented, metaFor } from '../../games/registry';
import { speak, stopSpeaking } from '../../games/shared/audio';
import { TutorialOverlay, tutorialFor } from '../../games/tutorials';
import { playerApi } from '../../api/player';
import { markTutorialSeen, wasTutorialSeen } from '../../games/tutorials/seen';
import { palette } from '../../theme/palette';
import { space } from '../../theme/spacing';
import { useTheme } from '../../theme/ThemeContext';
import { t } from '../../i18n';

export function GameDetailScreen({ navigation, route }: NativeStackScreenProps<RootStackParamList, 'GameDetail'>) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const p = usePlayer();
  const { settings } = useSettings();
  const { config } = useRemoteConfig();
  const game = p.games.find((g) => g.id === route.params.gameId);
  const meta = metaFor(route.params.gameId);
  const [difficulty, setDifficulty] = useState(game?.progress?.highestDifficulty ?? game?.difficulties[0]?.key ?? 'normal');
  const narration = settings.narrationEnabled && (p.me?.controls.narrationEnabled ?? true);
  const sound = settings.soundEnabled && (p.me?.controls.soundEnabled ?? true);
  const tutorial = tutorialFor(route.params.gameId);
  const [showTutorial, setShowTutorial] = useState<null | { thenPlay: boolean }>(null);
  const [seen, setSeen] = useState(true);
  useEffect(() => {
    wasTutorialSeen(route.params.gameId).then((v) => setSeen(v || !!game?.progress?.tutorialCompletedAt)).catch(() => undefined);
  }, [route.params.gameId, game?.progress?.tutorialCompletedAt]);
  const startPlay = () => navigation.replace('GamePlay', { gameId: route.params.gameId, difficulty });
  const onPlay = () => {
    // First time on a game: the pictorial tutorial comes first (skippable).
    if (tutorial && !seen) setShowTutorial({ thenPlay: true });
    else startPlay();
  };
  const completeTutorial = async () => {
    await markTutorialSeen(route.params.gameId);
    setSeen(true);
    if (game?.progress?.tutorialCompletedAt) return null;
    try {
      const r = await playerApi.tutorialComplete(route.params.gameId);
      void p.loadGames();
      return { coins: r.coins };
    } catch {
      return null;
    }
  };
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
          {tutorial && (
            <View style={styles.tutorialRow}>
              <BigButton label={t('tutorial.watch')} emoji="🎬" size="md" color={palette.grape} onPress={() => setShowTutorial({ thenPlay: false })} />
              {game.progress?.tutorialCompletedAt ? <Badge label="✅" color={colors.successSoft} /> : <Badge label={t('tutorial.coins', { n: config.rewards.tutorialCompleted })} emoji="🪙" />}
            </View>
          )}
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
        <BigButton label={`${t('games.play')} · ${level?.label ?? ''}`} emoji="▶️" size="xl" color={palette.lime} fullWidth disabled={!canPlay} onPress={onPlay} style={{ marginTop: space.xl }} />
        {tutorial && !seen && canPlay && <AppText variant="caption" tone="secondary" align="center" style={{ marginTop: space.sm }}>{t('tutorial.firstTime')}</AppText>}
      </ScrollView>
      {tutorial && (
        <TutorialOverlay
          tutorial={tutorial}
          bracket={p.child?.effectiveBracket ?? 'B'}
          visible={showTutorial !== null}
          sound={sound}
          narration={narration}
          onComplete={completeTutorial}
          finishLabel={showTutorial?.thenPlay ? t('tutorial.play') : t('common.done')}
          onClose={(reason) => {
            const thenPlay = showTutorial?.thenPlay;
            setShowTutorial(null);
            void markTutorialSeen(route.params.gameId);
            setSeen(true);
            if (thenPlay && (reason === 'done' || reason === 'skip')) startPlay();
          }}
        />
      )}
    </PlayfulBackdrop>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: space.screen, maxWidth: 560, width: '100%', alignSelf: 'center' },
  top: { flexDirection: 'row', alignItems: 'center' },
  badges: { flexDirection: 'row', gap: space.sm, marginTop: space.sm, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' },
  card: { borderRadius: 24, padding: space.lg, marginTop: space.lg },
  levels: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginTop: space.md },
  tutorialRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm, marginTop: space.md, flexWrap: 'wrap' },
});
