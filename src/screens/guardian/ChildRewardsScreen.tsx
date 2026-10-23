// Coins, rewards, rankings and ad status for one child, read-only here;
// the switches live in Controls.
import React, { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { RootStackParamList } from '../../navigation/types';
import { AppText, Badge, Button, Card, ErrorState, LoadingState, Screen } from '../../ui';
import { ScreenHeader } from '../../components/ScreenHeader';
import { guardianApi, type ChildRewards } from '../../api/guardian';
import { useGuardian } from '../../context/GuardianContext';
import { friendlyError } from '../../services/apiClient';
import { metaFor } from '../../games/registry';
import { space } from '../../theme/spacing';
import { useTheme } from '../../theme/ThemeContext';
import { t } from '../../i18n';

export function ChildRewardsScreen({ navigation, route }: NativeStackScreenProps<RootStackParamList, 'ChildRewards'>) {
  const { colors } = useTheme();
  const g = useGuardian();
  const id = route.params.childId;
  const child = g.children.find((c) => c.id === id);
  const [data, setData] = useState<ChildRewards | null>(null);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => {
    try {
      setData(await guardianApi.rewards(id));
      setError(null);
    } catch (e) {
      setError(friendlyError(e));
    }
  }, [id]);
  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );
  if (error && !data) return <ErrorState message={error} onRetry={load} />;
  if (!data) return <LoadingState />;
  return (
    <Screen scroll>
      <ScreenHeader title={t('grewards.title')} subtitle={child?.displayName} right={<Button label={t('child.controls')} size="sm" variant="secondary" onPress={() => navigation.navigate('Controls', { childId: id })} />} />
      <Card variant="raised" padding="lg" style={styles.card}>
        <View style={styles.stats}>
          {[[data.coins.balance, t('grewards.balance')], [`${data.coins.earnedToday}/${data.coins.dailyCap}`, t('grewards.earnedToday')], [data.coins.owned.length, t('grewards.owned')], [data.tutorials.length, t('grewards.tutorials')]].map(([n, l]) => (
            <View key={String(l)} style={styles.stat}><AppText variant="numeralSmall" tone="primary">{String(n)}</AppText><AppText variant="caption" tone="muted" align="center">{String(l)}</AppText></View>
          ))}
        </View>
        <View style={styles.badges}>
          <Badge label={data.adFree ? t('grewards.adFree') : t('grewards.adsOn')} icon={data.adFree ? 'check' : 'alert'} color={data.adFree ? colors.successSoft : colors.warningSoft} />
          <Badge label={data.rankings.enabled ? t('grewards.rankingsOn') : t('rank.off')} icon="trophy" color={data.rankings.enabled ? colors.successSoft : colors.surfaceMuted} />
          <Badge label={data.coins.shopEnabled ? t('grewards.shopOn') : t('rewards.shopOff')} icon="award" color={data.coins.shopEnabled ? colors.successSoft : colors.surfaceMuted} />
        </View>
        <AppText variant="caption" tone="muted" style={{ marginTop: space.sm }}>{data.adFree ? t('grewards.adFreeHint') : t('grewards.adsHint')} {t('grewards.shopHint')}</AppText>
      </Card>
      {data.rankings.mine.length > 0 && (
        <Card variant="raised" padding="lg" style={styles.card}>
          <AppText variant="dashHeading" style={{ marginBottom: space.sm }}>{t('grewards.rankings')}</AppText>
          {data.rankings.mine.map((m) => (
            <View key={m.gameId} style={[styles.row, { borderColor: colors.border }]}>
              <AppText variant="bodyStrong" style={{ flex: 1 }}>{metaFor(m.gameId).emoji} {metaFor(m.gameId).name}</AppText>
              {m.rating !== null && <Badge label={t('rank.rating', { n: m.rating })} />}
              <AppText variant="caption" tone="muted">{t('rank.points', { n: m.points })} · {t('rank.played', { n: m.played })} · {t('rank.wins', { n: m.wins })}</AppText>
            </View>
          ))}
        </Card>
      )}
      {data.coins.owned.length > 0 && (
        <Card variant="raised" padding="lg" style={styles.card}>
          <AppText variant="dashHeading" style={{ marginBottom: space.sm }}>{t('grewards.owned')}</AppText>
          <View style={styles.badges}>{data.coins.owned.map((i) => <Badge key={i.key} label={`${i.emoji} ${i.name}${data.coins.equipped[i.kind] === i.key ? ' · in use' : ''}`} />)}</View>
        </Card>
      )}
      <Card variant="raised" padding="lg" style={styles.card}>
        <AppText variant="dashHeading" style={{ marginBottom: space.sm }}>{t('grewards.ledger')}</AppText>
        {data.ledger.length === 0 ? (
          <AppText variant="body" tone="secondary">—</AppText>
        ) : (
          data.ledger.slice(0, 40).map((tx) => (
            <View key={tx.id} style={[styles.row, { borderColor: colors.border }]}>
              <View style={{ flex: 1 }}>
                <AppText variant="bodySmall">{t(`rewards.reason.${tx.reason}` as 'rewards.reason.game_completed')}{tx.note ? ` · ${tx.note}` : ''}</AppText>
                <AppText variant="caption" tone="muted">{new Date(tx.createdAt).toLocaleString()}</AppText>
              </View>
              <AppText variant="bodyStrong" tone={tx.amount > 0 ? 'primary' : 'danger'}>{tx.amount > 0 ? '+' : ''}{tx.amount}</AppText>
            </View>
          ))
        )}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: space.lg },
  stats: { flexDirection: 'row', justifyContent: 'space-between', gap: space.sm },
  stat: { flex: 1, alignItems: 'center' },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginTop: space.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingVertical: 8, borderBottomWidth: 1 },
});
