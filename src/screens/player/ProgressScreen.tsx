import React, { useCallback } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { AppText, CandyCard, EmojiDisc, Stars, ProgressBar } from '../../ui';
import { PlayerScreen } from '../../components/player/PlayerScreen';
import { BADGE_EMOJI, Section } from './PlayerHomeScreen';
import { usePlayer } from '../../context/PlayerContext';
import { metaFor } from '../../games/registry';
import { palette, rainbow } from '../../theme/palette';
import { space } from '../../theme/spacing';
import { useTheme } from '../../theme/ThemeContext';
import { t } from '../../i18n';

export function ProgressScreen() {
  const { colors } = useTheme();
  const p = usePlayer();
  useFocusEffect(
    useCallback(() => {
      void p.loadProgress();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
  );
  const pr = p.progress;
  const totals = {
    completions: pr?.games.reduce((n, g) => n + g.completions, 0) ?? 0,
    stars: pr?.games.reduce((n, g) => n + g.stars, 0) ?? 0,
    crafts: pr?.crafts.filter((c) => c.completedAt).length ?? 0,
    facts: pr?.factsRead ?? 0,
    quiz: pr?.quiz.correct ?? 0,
  };
  const tiles: [string, number, string, string][] = [
    [t('progress.games'), totals.completions, '🎮', palette.sky],
    [t('progress.stars'), totals.stars, '⭐', palette.sunshine],
    [t('progress.crafts'), totals.crafts, '✂️', palette.tangerine],
    [t('progress.facts'), totals.facts, '💡', palette.grape],
    [t('progress.quiz'), totals.quiz, '✅', palette.lime],
  ];
  const bests = (pr?.games ?? []).filter((g) => g.completions > 0).sort((a, b) => b.stars - a.stars);
  return (
    <PlayerScreen title={t('progress.title')} emoji="🏆">
      <View style={styles.tiles}>
        {tiles.map(([label, n, emoji, color]) => (
          <CandyCard key={label} color={color} style={styles.tile}>
            <View style={styles.tileInner}>
              <Text style={{ fontSize: 32 }}>{emoji}</Text>
              <Text style={styles.tileNum}>{n}</Text>
              <Text style={styles.tileLabel}>{label}</Text>
            </View>
          </CandyCard>
        ))}
      </View>
      <Section title={t('progress.badges')} emoji="🏅">
        <View style={styles.badges}>
          {(pr?.achievements ?? []).map((a, i) => (
            <View key={a.key} style={[styles.badge, !a.earnedAt && { opacity: 0.35 }]}>
              <EmojiDisc emoji={a.earnedAt ? BADGE_EMOJI[a.icon] ?? '🏅' : '🔒'} color={rainbow[i % rainbow.length]} size={64} />
              <AppText variant="caption" align="center" numberOfLines={2} style={{ width: 80 }}>{a.name}</AppText>
              <AppText variant="caption" tone="muted" align="center" numberOfLines={2} style={{ width: 88, fontSize: 10 }}>{a.earnedAt ? '' : a.description}</AppText>
            </View>
          ))}
        </View>
      </Section>
      <Section title={t('progress.bests')} emoji="🥇">
        {bests.length === 0 ? (
          <AppText variant="body" tone="secondary">{t('progress.empty')}</AppText>
        ) : (
          bests.map((g) => {
            const m = metaFor(g.gameId);
            return (
              <View key={g.gameId} style={[styles.bestRow, { backgroundColor: colors.surfaceRaised }]}>
                <Text style={{ fontSize: 28 }}>{m.emoji}</Text>
                <View style={{ flex: 1 }}>
                  <AppText variant="bodyStrong">{m.name}</AppText>
                  <AppText variant="caption" tone="muted">
                    {g.completions}× · {g.bestScore !== null ? `${t('games.best')} ${g.bestScore}` : ''}{g.bestTimeSeconds !== null ? ` · ${Math.floor(g.bestTimeSeconds / 60)}:${String(g.bestTimeSeconds % 60).padStart(2, '0')}` : ''}
                  </AppText>
                </View>
                <Stars count={g.stars} size={18} />
              </View>
            );
          })
        )}
      </Section>
      {(pr?.crafts.length ?? 0) > 0 && (
        <Section title={t('progress.crafts')} emoji="✂️">
          {pr!.crafts.map((c) => (
            <View key={c.tutorialId} style={[styles.bestRow, { backgroundColor: colors.surfaceRaised, flexDirection: 'column', alignItems: 'stretch' }]}>
              <AppText variant="bodyStrong">{c.completedAt ? '✅ ' : ''}{c.title}</AppText>
              <ProgressBar value={c.stepCount ? c.stepsDone / c.stepCount : 0} color={palette.tangerine} height={8} />
            </View>
          ))}
        </Section>
      )}
    </PlayerScreen>
  );
}

const styles = StyleSheet.create({
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  tile: { width: '31%', flexGrow: 1 },
  tileInner: { alignItems: 'center', padding: space.md },
  tileNum: { fontFamily: 'Fredoka_700Bold', fontSize: 30, color: '#fff' },
  tileLabel: { fontFamily: 'Nunito_700Bold', fontSize: 12, color: 'rgba(255,255,255,0.95)', textAlign: 'center' },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md },
  badge: { alignItems: 'center', gap: 4 },
  bestRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.md, borderRadius: 18, marginBottom: space.sm },
});
