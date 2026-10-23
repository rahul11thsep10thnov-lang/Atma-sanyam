// Global rankings: pick a competitive game, see the board for this week /
// month / all time, filter by age group, and read exactly how the game is
// scored. Children appear by nickname and avatar only.
import React, { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RootStackParamList } from '../../navigation/types';
import { AppText, Avatar, Badge, CandyCard, Chip, EmptyState, LoadingState, PlayfulBackdrop, PopIn, RoundButton, lighten } from '../../ui';
import { playerApi, type Leaderboard, type RankingsOverview } from '../../api/player';
import { usePlayer } from '../../context/PlayerContext';
import { metaFor } from '../../games/registry';
import { palette, rainbow } from '../../theme/palette';
import { space } from '../../theme/spacing';
import { useTheme } from '../../theme/ThemeContext';
import type { AgeBracket } from '../../types';
import { t } from '../../i18n';

function Header({ title, onBack, emoji }: { title: string; onBack: () => void; emoji: string }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.top, { paddingTop: insets.top + space.md }]}>
      <RoundButton icon="arrowLeft" label={t('common.back')} onPress={onBack} color={palette.cherry} size={46} />
      <AppText variant="display" style={{ flex: 1 }} numberOfLines={1}>{emoji} {title}</AppText>
    </View>
  );
}

export function RankingsScreen({ navigation }: NativeStackScreenProps<RootStackParamList, 'Rankings'>) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [data, setData] = useState<RankingsOverview | null>(null);
  useFocusEffect(
    useCallback(() => {
      playerApi.rankings().then(setData).catch(() => undefined);
    }, [])
  );
  return (
    <PlayfulBackdrop colors={[palette.sunshine, colors.background]}>
      <ScrollView contentContainerStyle={[styles.wrap, { paddingBottom: insets.bottom + space.xl }]}>
        <Header title={t('rank.title')} emoji="🏆" onBack={() => navigation.goBack()} />
        {!data ? (
          <LoadingState />
        ) : !data.enabled ? (
          <EmptyState emoji="🙈" title={t('rank.off')} body={data.reason ?? undefined} />
        ) : (
          <>
            <AppText variant="subheading" tone="secondary">{t('rank.subtitle')}</AppText>
            {data.mine.length > 0 && (
              <View style={[styles.mine, { backgroundColor: colors.surfaceRaised }]}>
                <AppText variant="heading">{t('rank.myGames')}</AppText>
                {data.mine.slice(0, 6).map((m) => {
                  const meta = metaFor(m.gameId);
                  return (
                    <View key={m.gameId} style={styles.mineRow}>
                      <Text style={{ fontSize: 24 }}>{meta.emoji}</Text>
                      <AppText variant="bodyStrong" style={{ flex: 1 }}>{meta.name}</AppText>
                      {m.rating !== null && <Badge label={t('rank.rating', { n: m.rating })} emoji="♟️" />}
                      <Badge label={t('rank.points', { n: m.points })} color="#FFF4CC" />
                      <AppText variant="caption" tone="secondary">{t('rank.wins', { n: m.wins })}</AppText>
                    </View>
                  );
                })}
              </View>
            )}
            <AppText variant="heading" style={{ marginTop: space.lg, marginBottom: space.sm }}>{t('rank.pick')}</AppText>
            <View style={styles.grid}>
              {data.games.map((g, i) => {
                const meta = metaFor(g.gameId);
                return (
                  <PopIn key={g.gameId} delay={i * 30} style={styles.cell}>
                    <CandyCard color={meta.color} onPress={() => navigation.navigate('Leaderboard', { gameId: g.gameId })} label={g.name}>
                      <View style={styles.gameCard}>
                        <Text style={{ fontSize: 36 }}>{meta.emoji}</Text>
                        <Text style={styles.gameName} numberOfLines={2}>{g.name}</Text>
                        <Text style={styles.gameKind}>{g.kind === 'rating' ? '♟️ rating' : g.kind === 'wins' ? '🏅 wins' : '🎯 score'}</Text>
                      </View>
                    </CandyCard>
                  </PopIn>
                );
              })}
            </View>
            <View style={[styles.note, { backgroundColor: colors.surfaceRaised }]}><Text>🛡️</Text><AppText variant="caption" tone="secondary" style={{ flex: 1 }}>{t('rank.fairPlay')}</AppText></View>
          </>
        )}
      </ScrollView>
    </PlayfulBackdrop>
  );
}

export function LeaderboardScreen({ navigation, route }: NativeStackScreenProps<RootStackParamList, 'Leaderboard'>) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const p = usePlayer();
  const [window, setWindow] = useState<'week' | 'month' | 'all'>('week');
  const [bracket, setBracket] = useState<AgeBracket | undefined>(undefined);
  const [board, setBoard] = useState<Leaderboard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const meta = metaFor(route.params.gameId);
  useEffect(() => {
    setBoard(null);
    playerApi.leaderboard(route.params.gameId, window, bracket).then(setBoard).catch((e) => setError(String(e?.message ?? e)));
  }, [route.params.gameId, window, bracket]);
  return (
    <PlayfulBackdrop colors={[lighten(meta.color, 0.5), colors.background]}>
      <ScrollView contentContainerStyle={[styles.wrap, { paddingBottom: insets.bottom + space.xl }]}>
        <Header title={meta.name} emoji={meta.emoji} onBack={() => navigation.goBack()} />
        <View style={styles.chips}>
          {(['week', 'month', 'all'] as const).map((w) => <Chip key={w} label={t(`rank.${w}` as 'rank.week')} selected={window === w} onPress={() => setWindow(w)} small />)}
        </View>
        <View style={styles.chips}>
          <Chip label={t('rank.allBrackets')} selected={!bracket} onPress={() => setBracket(undefined)} small />
          {(['A', 'B', 'C', 'D'] as AgeBracket[]).map((b) => <Chip key={b} label={t(`bracket.${b}` as 'bracket.A')} emoji={b === p.child?.effectiveBracket ? '⭐' : undefined} selected={bracket === b} onPress={() => setBracket(b)} small />)}
        </View>
        {error ? (
          <EmptyState emoji="🙈" title={t('rank.off')} body={error} />
        ) : !board ? (
          <LoadingState />
        ) : (
          <>
            {board.me && (
              <View style={[styles.meCard, { backgroundColor: colors.surfaceRaised }]}>
                <Text style={styles.rankBig}>#{board.me.rank}</Text>
                <Avatar avatarId={p.child?.avatarId} name={p.child?.displayName} size={48} ring />
                <View style={{ flex: 1 }}>
                  <AppText variant="heading">{t('rank.you')}</AppText>
                  <AppText variant="caption" tone="secondary">{board.me.rating !== null ? `${t('rank.rating', { n: board.me.rating })} · ` : ''}{t('rank.points', { n: board.me.points })} · {t('rank.played', { n: board.me.played })}{board.me.winRate !== null ? ` · ${board.me.winRate}% ${t('rank.wins', { n: board.me.wins })}` : ''}</AppText>
                </View>
                {board.me.improvement !== 0 && <Badge label={`${board.me.improvement > 0 ? '▲' : '▼'} ${Math.abs(board.me.improvement)}`} color={board.me.improvement > 0 ? '#E6F8DA' : '#FDE2E3'} />}
              </View>
            )}
            {board.rows.length === 0 ? (
              <EmptyState emoji="🏁" title={t('rank.empty')} />
            ) : (
              board.rows.map((r, i) => (
                <PopIn key={r.childId} delay={Math.min(i, 12) * 30}>
                  <View style={[styles.row, { backgroundColor: r.isMe ? '#FFF4CC' : colors.surfaceRaised }]}>
                    <View style={[styles.rankDisc, { backgroundColor: i === 0 ? palette.sunshine : i === 1 ? '#D9D4EC' : i === 2 ? '#E8B27D' : rainbow[i % rainbow.length] }]}><Text style={styles.rankNum}>{i < 3 ? ['🥇', '🥈', '🥉'][i] : r.rank}</Text></View>
                    <Avatar avatarId={r.avatarId} name={r.displayName} size={40} />
                    <View style={{ flex: 1 }}>
                      <AppText variant="bodyStrong" numberOfLines={1}>{r.isMe ? `${r.displayName} (${t('rank.you')})` : r.displayName}</AppText>
                      <AppText variant="caption" tone="secondary">{t(`bracket.${r.bracket}` as 'bracket.A')} · {t('rank.played', { n: r.played })}{r.winRate !== null ? ` · ${r.winRate}%` : ''}</AppText>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <AppText variant="heading">{r.rating !== null ? r.rating : r.points}</AppText>
                      <AppText variant="caption" tone="muted">{r.rating !== null ? 'rating' : 'pts'}</AppText>
                    </View>
                  </View>
                </PopIn>
              ))
            )}
            <View style={[styles.note, { backgroundColor: colors.surfaceRaised }]}><Text>ℹ️</Text><View style={{ flex: 1 }}><AppText variant="bodySmallStrong">{t('rank.howScored')}</AppText><AppText variant="caption" tone="secondary">{board.rule}</AppText></View></View>
          </>
        )}
      </ScrollView>
    </PlayfulBackdrop>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: space.screen, maxWidth: 680, width: '100%', alignSelf: 'center' },
  top: { flexDirection: 'row', alignItems: 'center', gap: space.md, marginBottom: space.md },
  mine: { borderRadius: 20, padding: space.md, gap: space.sm, marginTop: space.md },
  mineRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm, flexWrap: 'wrap' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md },
  cell: { width: '30%', flexGrow: 1 },
  gameCard: { padding: space.md, alignItems: 'center', minHeight: 120 },
  gameName: { fontFamily: 'Fredoka_700Bold', fontSize: 15, color: '#fff', textAlign: 'center', marginTop: 4 },
  gameKind: { fontFamily: 'Nunito_700Bold', fontSize: 11, color: 'rgba(255,255,255,0.9)', marginTop: 2 },
  chips: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginBottom: space.sm },
  meCard: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.md, borderRadius: 20, marginVertical: space.md },
  rankBig: { fontFamily: 'Fredoka_700Bold', fontSize: 28, color: palette.ink },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm, padding: space.sm, borderRadius: 18, marginBottom: space.sm },
  rankDisc: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  rankNum: { fontFamily: 'Fredoka_700Bold', fontSize: 16, color: palette.ink },
  note: { flexDirection: 'row', gap: 8, alignItems: 'center', borderRadius: 16, padding: space.md, marginTop: space.lg },
});
