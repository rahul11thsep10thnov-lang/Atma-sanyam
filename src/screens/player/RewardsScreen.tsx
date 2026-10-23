// Coins and the reward shop. The balance, prices and ownership all come from
// the server; the shop only sells cosmetic items for coins that were earned
// by playing and learning — nothing here can be bought with real money.
import React, { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RootStackParamList } from '../../navigation/types';
import { AppText, Badge, BigButton, CandyCard, Chip, Confetti, EmptyState, LoadingState, PlayfulBackdrop, PopIn, ProgressBar, RoundButton, Tactile } from '../../ui';
import { playerApi, type RewardItem, type Wallet } from '../../api/player';
import { usePlayer } from '../../context/PlayerContext';
import { useRemoteConfig } from '../../context/RemoteConfigContext';
import { playSfx } from '../../games/shared/audio';
import { friendlyError } from '../../services/apiClient';
import { palette } from '../../theme/palette';
import { space } from '../../theme/spacing';
import { useTheme } from '../../theme/ThemeContext';
import { t } from '../../i18n';

const KIND_EMOJI: Record<string, string> = { avatar_accessory: '🎩', theme: '🎨', board_skin: '♟️', background: '🌅', badge: '🏅', effect: '✨', token_design: '🐾', craft_template: '📄' };

function newKey() {
  const c = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto;
  return (c?.randomUUID?.() ?? `k-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`).replace(/[^A-Za-z0-9-]/g, '').slice(0, 64);
}

export function RewardsScreen({ navigation }: NativeStackScreenProps<RootStackParamList, 'Rewards'>) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const p = usePlayer();
  const { config } = useRemoteConfig();
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [kind, setKind] = useState<string>('all');
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [celebrate, setCelebrate] = useState(false);
  const [tab, setTab] = useState<'shop' | 'history' | 'earn'>('shop');
  const load = useCallback(() => playerApi.wallet().then(setWallet).catch(() => undefined), []);
  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );
  const buy = async (item: RewardItem) => {
    setBusy(item.key);
    setMessage(null);
    try {
      await playerApi.purchase(item.key, newKey());
      playSfx('win', true);
      setCelebrate(true);
      setTimeout(() => setCelebrate(false), 2000);
      await load();
      void p.refresh();
    } catch (e) {
      setMessage(friendlyError(e));
    } finally {
      setBusy(null);
    }
  };
  const equip = async (item: RewardItem, on: boolean) => {
    setBusy(item.key);
    try {
      await playerApi.equip(item.kind, on ? item.key : null);
      await load();
      void p.refresh();
    } catch (e) {
      setMessage(friendlyError(e));
    } finally {
      setBusy(null);
    }
  };
  const kinds = [...new Set((wallet?.items ?? []).map((i) => i.kind))];
  const items = (wallet?.items ?? []).filter((i) => kind === 'all' || i.kind === kind);
  const rewards = config.rewards;
  const earnRows: [string, number][] = [
    [t('rewards.earn.tutorial'), rewards.tutorialCompleted],
    [t('rewards.earn.game'), rewards.gameCompleted],
    [t('rewards.earn.win'), rewards.gameWon],
    [t('rewards.earn.puzzle'), rewards.puzzleSolvedMax],
    [t('rewards.earn.daily'), rewards.dailyChallenge],
    [t('rewards.earn.craft'), rewards.craftCompleted],
    [t('rewards.earn.lesson'), rewards.lessonCompleted],
    [t('rewards.earn.quiz'), rewards.quizCompleted],
    [t('rewards.earn.fact'), rewards.factDiscovered],
  ];
  return (
    <PlayfulBackdrop colors={[palette.sunshine, colors.background]}>
      <Confetti play={celebrate} />
      <ScrollView contentContainerStyle={[styles.wrap, { paddingTop: insets.top + space.md, paddingBottom: insets.bottom + space.xl }]}>
        <View style={styles.top}>
          <RoundButton icon="arrowLeft" label={t('common.back')} onPress={() => navigation.goBack()} color={palette.cherry} size={46} />
          <AppText variant="display" style={{ flex: 1 }}>🪙 {t('rewards.title')}</AppText>
        </View>
        {!wallet ? (
          <LoadingState />
        ) : (
          <>
            <PopIn>
              <CandyCard color={palette.sunshine}>
                <View style={styles.balance}>
                  <Text style={{ fontSize: 56 }}>🪙</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.balanceNum}>{wallet.balance}</Text>
                    <Text style={styles.balanceLabel}>{t('rewards.balance', { n: wallet.balance })}</Text>
                    <Text style={styles.balanceLabel}>{t('rewards.earnedToday', { n: wallet.earnedToday })}{wallet.dailyCap !== null ? ` · ${t('rewards.cap', { n: wallet.dailyCap })}` : ''}</Text>
                    {wallet.dailyCap !== null && <ProgressBar value={wallet.earnedToday / Math.max(1, wallet.dailyCap)} height={8} color="#fff" track="rgba(0,0,0,0.15)" />}
                  </View>
                </View>
              </CandyCard>
            </PopIn>
            <View style={styles.tabs}>
              <Chip label={t('rewards.shop')} emoji="🛍️" selected={tab === 'shop'} onPress={() => setTab('shop')} />
              <Chip label={t('rewards.howToEarn')} emoji="💡" selected={tab === 'earn'} onPress={() => setTab('earn')} />
              <Chip label={t('rewards.history')} emoji="🧾" selected={tab === 'history'} onPress={() => setTab('history')} />
            </View>
            {message && <AppText variant="bodyStrong" tone="warning" align="center">{message}</AppText>}
            {tab === 'shop' && (
              !wallet.shopEnabled ? (
                <EmptyState emoji="🔒" title={t('rewards.shopOff')} />
              ) : (
                <>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
                    <Chip label={t('common.all')} emoji="🌟" selected={kind === 'all'} onPress={() => setKind('all')} small />
                    {kinds.map((k) => <Chip key={k} label={k.replace('_', ' ')} emoji={KIND_EMOJI[k] ?? '🎁'} selected={kind === k} onPress={() => setKind(k)} small />)}
                  </ScrollView>
                  <View style={styles.grid}>
                    {items.map((item, i) => {
                      const equipped = wallet.equipped[item.kind] === item.key;
                      return (
                        <PopIn key={item.key} delay={i * 30} style={styles.cell}>
                          <CandyCard color={item.locked ? '#B8B3D1' : item.color}>
                            <View style={styles.item}>
                              <Text style={{ fontSize: 44 }}>{item.emoji}</Text>
                              <Text style={styles.itemName} numberOfLines={2}>{item.name}</Text>
                              <Text style={styles.itemDesc} numberOfLines={2}>{item.description}</Text>
                              <View style={styles.itemFoot}>
                                {item.owned ? (
                                  <Tactile onPress={() => void equip(item, !equipped)} disabled={busy === item.key} accessibilityRole="button" accessibilityLabel={equipped ? t('rewards.unequip') : t('rewards.equip')}>
                                    <View style={[styles.pill, { backgroundColor: equipped ? palette.lime : '#fff' }]}><AppText variant="caption">{equipped ? `✅ ${t('rewards.equipped')}` : t('rewards.equip')}</AppText></View>
                                  </Tactile>
                                ) : item.locked ? (
                                  <Badge label={t('rewards.premiumOnly')} emoji="⭐" color="#fff" />
                                ) : (
                                  <Tactile onPress={() => void buy(item)} disabled={!item.affordable || busy === item.key} accessibilityRole="button" accessibilityLabel={`${t('rewards.buy')} ${item.name}`}>
                                    <View style={[styles.pill, { backgroundColor: item.affordable ? palette.sunshine : 'rgba(255,255,255,0.7)' }]}><AppText variant="caption">🪙 {item.price} · {item.affordable ? t('rewards.buy') : t('rewards.needMore', { n: item.price - wallet.balance })}</AppText></View>
                                  </Tactile>
                                )}
                              </View>
                            </View>
                          </CandyCard>
                        </PopIn>
                      );
                    })}
                  </View>
                  <View style={[styles.note, { backgroundColor: colors.surfaceRaised }]}><Text>🛡️</Text><AppText variant="caption" tone="secondary" style={{ flex: 1 }}>{t('rewards.safe')}</AppText></View>
                </>
              )
            )}
            {tab === 'earn' && (
              <View style={[styles.list, { backgroundColor: colors.surfaceRaised }]}>
                {earnRows.map(([label, n]) => (
                  <View key={label} style={styles.earnRow}><AppText variant="body" style={{ flex: 1 }}>{label}</AppText><Badge label={`+${n}`} emoji="🪙" color="#FFF4CC" /></View>
                ))}
                <AppText variant="caption" tone="muted">{t('rewards.cap', { n: wallet.dailyCap ?? rewards.dailyCap })}</AppText>
                <BigButton label={t('tabs.games')} emoji="🎮" color={palette.lime} size="md" onPress={() => navigation.navigate('PlayerConsole', { screen: 'Games' })} />
              </View>
            )}
            {tab === 'history' && (
              <View style={[styles.list, { backgroundColor: colors.surfaceRaised }]}>
                {wallet.transactions.length === 0 ? (
                  <AppText variant="body" tone="secondary">{t('progress.empty')}</AppText>
                ) : (
                  wallet.transactions.map((tx) => (
                    <View key={tx.id} style={styles.earnRow}>
                      <View style={{ flex: 1 }}>
                        <AppText variant="bodyStrong">{t(`rewards.reason.${tx.reason}` as 'rewards.reason.game_completed')}</AppText>
                        <AppText variant="caption" tone="muted">{tx.note ?? tx.refId ?? ''} · {new Date(tx.createdAt).toLocaleDateString()}</AppText>
                      </View>
                      <AppText variant="heading" style={{ color: tx.amount > 0 ? palette.limeDeep : palette.cherry }}>{tx.amount > 0 ? '+' : ''}{tx.amount}</AppText>
                    </View>
                  ))
                )}
              </View>
            )}
          </>
        )}
      </ScrollView>
    </PlayfulBackdrop>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: space.screen, maxWidth: 680, width: '100%', alignSelf: 'center' },
  top: { flexDirection: 'row', alignItems: 'center', gap: space.md, marginBottom: space.md },
  balance: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.lg },
  balanceNum: { fontFamily: 'Fredoka_700Bold', fontSize: 44, color: '#4A3A00' },
  balanceLabel: { fontFamily: 'Nunito_700Bold', fontSize: 13, color: '#4A3A00' },
  tabs: { flexDirection: 'row', gap: space.sm, marginVertical: space.md, flexWrap: 'wrap' },
  chips: { gap: 6, paddingBottom: space.sm },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md },
  cell: { width: '47%', flexGrow: 1 },
  item: { padding: space.md, alignItems: 'center', minHeight: 170 },
  itemName: { fontFamily: 'Fredoka_700Bold', fontSize: 16, color: '#fff', textAlign: 'center', marginTop: 4 },
  itemDesc: { fontFamily: 'Nunito_600SemiBold', fontSize: 12, color: 'rgba(255,255,255,0.92)', textAlign: 'center', marginTop: 2 },
  itemFoot: { marginTop: 8 },
  pill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, borderWidth: 2, borderColor: palette.ink },
  list: { borderRadius: 20, padding: space.md, gap: space.sm },
  earnRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingVertical: 6 },
  note: { flexDirection: 'row', gap: 8, alignItems: 'center', borderRadius: 16, padding: space.md, marginTop: space.lg },
});
