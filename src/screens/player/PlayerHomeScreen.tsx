import React, { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { CompositeScreenProps, useFocusEffect } from '@react-navigation/native';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { PlayerTabParamList, RootStackParamList } from '../../navigation/types';
import { AppText, BigButton, CandyCard, EmojiDisc, PopIn, ProgressBar, Confetti } from '../../ui';
import { PlayerScreen } from '../../components/player/PlayerScreen';
import { GameCard } from '../../components/player/GameCard';
import { usePlayer } from '../../context/PlayerContext';
import { useRemoteConfig } from '../../context/RemoteConfigContext';
import { playerApi, type DailyChallenge } from '../../api/player';
import { isImplemented, metaFor } from '../../games/registry';
import { palette, rainbow } from '../../theme/palette';
import { space } from '../../theme/spacing';
import { useTheme } from '../../theme/ThemeContext';
import type { Fact } from '../../types';
import { t } from '../../i18n';

// Curated picks shown as "Family favourites" (no cross-household play data is
// collected, so this is editorial, not measured popularity).
const FAMILY_FAVOURITES = ['ludo', 'memory-cards', 'snakes-and-ladders', 'jigsaw', 'chess', 'word-search', 'cricket', 'colouring-book'];

type Props = CompositeScreenProps<BottomTabScreenProps<PlayerTabParamList, 'Home'>, NativeStackScreenProps<RootStackParamList>>;

export function PlayerHomeScreen({ navigation }: Props) {
  const p = usePlayer();
  const { colors } = useTheme();
  const { config } = useRemoteConfig();
  const [daily, setDaily] = useState<Fact | null>(null);
  const [challenge, setChallenge] = useState<DailyChallenge | null>(null);
  const [celebrate, setCelebrate] = useState(false);
  const [badgeCount, setBadgeCount] = useState<number | null>(null);
  const access = p.me?.access ?? (p.entitled ? 'subscriber' : 'locked');
  const canPlay = p.entitled || access === 'ad_supported';

  useFocusEffect(
    useCallback(() => {
      void p.refresh();
      void p.loadGames();
      void p.loadProgress();
      if (canPlay) {
        playerApi.dailyFact().then(setDaily).catch(() => undefined);
        playerApi.dailyChallenge().then(setChallenge).catch(() => setChallenge(null));
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [canPlay])
  );
  // Celebrate new badges earned since last visit.
  useEffect(() => {
    const n = p.progress?.achievements.filter((a) => a.earnedAt).length ?? null;
    if (n !== null && badgeCount !== null && n > badgeCount) {
      setCelebrate(true);
      setTimeout(() => setCelebrate(false), 2500);
    }
    if (n !== null) setBadgeCount(n);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p.progress]);

  const name = p.child?.displayName ?? '';
  const games = p.games.filter((g) => isImplemented(g.id));
  const recent = games.filter((g) => g.progress?.lastPlayedAt).sort((a, b) => (b.progress!.lastPlayedAt! > a.progress!.lastPlayedAt! ? 1 : -1)).slice(0, 6);
  const recommended = games.filter((g) => !g.progress?.lastPlayedAt).slice(0, 6);
  const continueGame = recent.find((g) => g.progress && g.progress.completions === 0) ?? recent[0];
  const popular = FAMILY_FAVOURITES.map((id) => games.find((g) => g.id === id)).filter((g): g is NonNullable<typeof g> => !!g);
  const playtime = p.me?.playtime;
  const earned = p.progress?.achievements.filter((a) => a.earnedAt) ?? [];
  const coins = p.me?.child.coins ?? 0;
  const challengeGame = challenge ? games.find((g) => g.id === challenge.gameId) : undefined;
  const flags = config.features;

  return (
    <PlayerScreen title={t('home.hello', { name })} emoji="👋">
      <Confetti play={celebrate} />
      {!canPlay ? (
        <PopIn>
          <CandyCard color={palette.grape}>
            <View style={styles.lockCard}>
              <Text style={{ fontSize: 56 }}>🔒</Text>
              <AppText variant="heading" style={{ color: '#fff' }} align="center">{t('home.locked.title')}</AppText>
              <AppText variant="body" style={{ color: '#fff' }} align="center">{t('home.locked.body')}</AppText>
            </View>
          </CandyCard>
        </PopIn>
      ) : (
        <>
          <PopIn>
            <View style={styles.greetRow}>
              <View style={{ flex: 1 }}>
                <AppText variant="subheading" tone="secondary">{config.texts.playerWelcome.replace('{name}', name)}</AppText>
                <AppText variant="caption" tone="muted">{p.child ? `${p.child.bracketName} · ${t(`bracket.${p.child.effectiveBracket}.ages` as 'bracket.A.ages')}` : ''}</AppText>
              </View>
              <CandyCard color={palette.sunshine} onPress={() => navigation.navigate('Rewards')} label={t('home.coins')} radius={18}>
                <View style={styles.coinPill}><Text style={{ fontSize: 22 }}>🪙</Text><Text style={styles.coinNum}>{coins}</Text></View>
              </CandyCard>
            </View>
            {playtime && (
              <View style={styles.timeRow}>
                <ProgressBar value={playtime.allowed ? 1 - playtime.remainingSeconds / Math.max(1, (p.me?.controls.dailyLimitMinutes ?? 60) * 60) : 1} color={palette.lime} height={12} />
                <AppText variant="caption" tone="secondary" style={{ marginTop: 4 }}>
                  {playtime.allowed ? t('home.timeLeft', { minutes: Math.ceil(playtime.remainingSeconds / 60) }) : playtime.message}
                </AppText>
              </View>
            )}
          </PopIn>
          {continueGame && playtime?.allowed && (
            <PopIn delay={100}>
              <CandyCard color={metaFor(continueGame.id).color} onPress={() => navigation.navigate('GameDetail', { gameId: continueGame.id })} label={t('home.continue')}>
                <View style={styles.heroRow}>
                  <Text style={{ fontSize: 56 }}>{metaFor(continueGame.id).emoji}</Text>
                  <View style={{ flex: 1 }}>
                    <AppText variant="caption" style={{ color: 'rgba(255,255,255,0.9)' }}>{t('home.continue')}</AppText>
                    <Text style={styles.heroTitle}>{continueGame.name}</Text>
                  </View>
                  <BigButton label={t('games.play')} emoji="▶️" size="md" color={palette.lime} onPress={() => navigation.navigate('GameDetail', { gameId: continueGame.id })} />
                </View>
              </CandyCard>
            </PopIn>
          )}
          {challenge && challengeGame && (
            <PopIn delay={150}>
              <CandyCard color={challenge.completed ? palette.lime : palette.grape} onPress={() => navigation.navigate('GameDetail', { gameId: challenge.gameId })} label={t('home.daily.challenge')} style={{ marginTop: space.lg }}>
                <View style={styles.heroRow}>
                  <Text style={{ fontSize: 48 }}>{challenge.completed ? '✅' : '🎯'}</Text>
                  <View style={{ flex: 1 }}>
                    <AppText variant="caption" style={{ color: 'rgba(255,255,255,0.9)' }}>{t('home.daily.challenge')}</AppText>
                    <Text style={styles.heroTitle} numberOfLines={2}>{challenge.completed ? t('home.daily.done') : t('home.daily.reward', { game: challengeGame.name, n: challenge.reward })}</Text>
                  </View>
                  <Text style={{ fontSize: 40 }}>{metaFor(challenge.gameId).emoji}</Text>
                </View>
              </CandyCard>
            </PopIn>
          )}
          <Section title={t('home.recommended')} emoji="⭐">
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.md }}>
              {(recommended.length ? recommended : games.slice(0, 6)).map((g) => (
                <GameCard key={g.id} game={g} width={160} favouritesAllowed={false} onPress={() => navigation.navigate('GameDetail', { gameId: g.id })} />
              ))}
            </ScrollView>
          </Section>
          {recent.length > 0 && (
            <Section title={t('home.recent')} emoji="🕒">
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.md }}>
                {recent.map((g) => (
                  <GameCard key={g.id} game={g} width={160} favouritesAllowed={false} onPress={() => navigation.navigate('GameDetail', { gameId: g.id })} />
                ))}
              </ScrollView>
            </Section>
          )}
          {popular.length > 0 && (
            <Section title={t('home.popular')} emoji="🔥">
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.md }}>
                {popular.map((g) => (
                  <GameCard key={g.id} game={g} width={160} favouritesAllowed={false} onPress={() => navigation.navigate('GameDetail', { gameId: g.id })} />
                ))}
              </ScrollView>
            </Section>
          )}
          {(flags.studyPlayfully || flags.music || flags.sports) && (
            <Section title={t('home.learn')} emoji="📚">
              <View style={{ flexDirection: 'row', gap: space.sm }}>
                {flags.studyPlayfully && <CandyCard color={palette.grape} onPress={() => navigation.navigate('LearnSection', { section: 'study' })} label={t('learn.study')} style={{ flex: 1 }}><View style={styles.smallCard}><Text style={{ fontSize: 36 }}>📚</Text><Text style={styles.smallTitle} numberOfLines={2}>{t('learn.study')}</Text></View></CandyCard>}
                {flags.music && <CandyCard color={palette.bubblegum} onPress={() => navigation.navigate('LearnSection', { section: 'music' })} label={t('learn.music')} style={{ flex: 1 }}><View style={styles.smallCard}><Text style={{ fontSize: 36 }}>🎹</Text><Text style={styles.smallTitle}>{t('learn.music')}</Text></View></CandyCard>}
                {flags.sports && <CandyCard color={palette.lime} onPress={() => navigation.navigate('LearnSection', { section: 'sports' })} label={t('learn.sports')} style={{ flex: 1 }}><View style={styles.smallCard}><Text style={{ fontSize: 36 }}>🏏</Text><Text style={styles.smallTitle}>{t('learn.sports')}</Text></View></CandyCard>}
              </View>
            </Section>
          )}
          {daily && (
            <Section title={t('home.daily')} emoji="💡">
              <CandyCard color={palette.sunshine} onPress={() => navigation.navigate('FactDetail', { factId: daily.id, fact: daily })} label={daily.headline}>
                <View style={styles.heroRow}>
                  <EmojiDisc emoji="🔭" color={palette.sunshineDeep} size={56} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.heroTitle, { color: '#4A3A00' }]} numberOfLines={3}>{daily.headline}</Text>
                  </View>
                </View>
              </CandyCard>
            </Section>
          )}
          <Section title={t('home.craft')} emoji="✂️">
            <View style={{ flexDirection: 'row', gap: space.md }}>
              <CandyCard color={palette.tangerine} onPress={() => navigation.navigate('CraftLibrary')} label={t('tabs.craft')} style={{ flex: 1 }}>
                <View style={styles.smallCard}><Text style={{ fontSize: 40 }}>🦢</Text><Text style={styles.smallTitle}>{t('craft.origami')}</Text></View>
              </CandyCard>
              <CandyCard color={palette.bubblegum} onPress={() => navigation.navigate('GameDetail', { gameId: 'drawing-canvas' })} label={t('craft.drawing')} style={{ flex: 1 }}>
                <View style={styles.smallCard}><Text style={{ fontSize: 40 }}>🎨</Text><Text style={styles.smallTitle}>{t('craft.drawing')}</Text></View>
              </CandyCard>
            </View>
          </Section>
          <Section title={t('home.coins')} emoji="🪙">
            <View style={{ flexDirection: 'row', gap: space.md }}>
              <CandyCard color={palette.sunshine} onPress={() => navigation.navigate('Rewards')} label={t('rewards.title')} style={{ flex: 1 }}>
                <View style={styles.smallCard}><Text style={{ fontSize: 40 }}>🪙</Text><Text style={[styles.smallTitle, { color: '#4A3A00' }]}>{t('rewards.balance', { n: coins })}</Text><Text style={[styles.smallSub, { color: '#4A3A00' }]}>{t('rewards.shop')}</Text></View>
              </CandyCard>
              {flags.rankings && (p.me?.controls.rankingsEnabled ?? true) && (
                <CandyCard color={palette.tangerine} onPress={() => navigation.navigate('Rankings')} label={t('home.rankings')} style={{ flex: 1 }}>
                  <View style={styles.smallCard}><Text style={{ fontSize: 40 }}>🏆</Text><Text style={styles.smallTitle}>{t('home.rankings')}</Text><Text style={styles.smallSub}>{t('rank.subtitle')}</Text></View>
                </CandyCard>
              )}
            </View>
          </Section>
          <Section title={t('home.achievements')} emoji="🏅">
            <View style={styles.badges}>
              {earned.length === 0 ? (
                <AppText variant="body" tone="secondary">{t('progress.empty')}</AppText>
              ) : (
                earned.slice(0, 8).map((a, i) => (
                  <View key={a.key} style={styles.badge}>
                    <EmojiDisc emoji={BADGE_EMOJI[a.icon] ?? '🏅'} color={rainbow[i % rainbow.length]} size={56} />
                    <AppText variant="caption" align="center" numberOfLines={2} style={{ width: 72 }}>{a.name}</AppText>
                  </View>
                ))
              )}
            </View>
          </Section>
          <View style={[styles.plan, { backgroundColor: colors.surfaceRaised }]}>
            <Text style={{ fontSize: 28 }}>{access === 'subscriber' ? '⭐' : '📺'}</Text>
            <View style={{ flex: 1 }}>
              <AppText variant="bodyStrong">{access === 'subscriber' ? t('home.benefits') : t('home.adSupported.title')}</AppText>
              <AppText variant="caption" tone="secondary">{access === 'subscriber' ? t('home.benefits.body') : t('home.adSupported.body')}</AppText>
            </View>
          </View>
        </>
      )}
    </PlayerScreen>
  );
}

export const BADGE_EMOJI: Record<string, string> = { star: '⭐', compass: '🧭', trophy: '🏆', crown: '👑', brain: '🧠', puzzle: '🧩', lightbulb: '💡', check: '✅', scissors: '✂️', palette: '🎨', book: '📖', graduation: '🎓', music: '🎵', medal: '🏅', flask: '🧪', coin: '🪙', gem: '💎' };

export function Section({ title, emoji, children }: { title: string; emoji?: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <AppText variant="heading" style={{ marginBottom: space.sm }}>
        {emoji ? `${emoji} ` : ''}{title}
      </AppText>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginTop: space.xl },
  timeRow: { marginTop: space.md },
  heroRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.lg },
  heroTitle: { fontFamily: 'Fredoka_700Bold', fontSize: 22, color: '#fff' },
  lockCard: { padding: space.xl, alignItems: 'center', gap: space.sm },
  smallCard: { padding: space.md, alignItems: 'center' },
  smallTitle: { fontFamily: 'Fredoka_600SemiBold', fontSize: 16, color: '#fff', marginTop: 4, textAlign: 'center' },
  smallSub: { fontFamily: 'Nunito_600SemiBold', fontSize: 11, color: 'rgba(255,255,255,0.9)', textAlign: 'center', marginTop: 2 },
  greetRow: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  coinPill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8 },
  coinNum: { fontFamily: 'Fredoka_700Bold', fontSize: 20, color: '#4A3A00' },
  plan: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.md, borderRadius: 18, marginTop: space.xl },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md },
  badge: { alignItems: 'center', gap: 4 },
});
