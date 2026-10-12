// Membership: ₹199 struck through, ₹30 a month, no ads. The purchase goes
// through src/membership (a billing library plugs in there).
import React, { useEffect, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { cancelMembership, PLAN, purchases, subscribe } from '../../membership/membership';
import { loadRewards, RewardState } from '../../spaces/rewards';
import { AppText } from '../../ui/AppText';
import { Button } from '../../ui/Button';
import { Icon } from '../../ui/Icon';
import { radii } from '../../theme/radii';
import { space } from '../../theme/spacing';
import { useTheme } from '../../theme/ThemeContext';
import { t } from '../../i18n';

export function MembershipCard() {
  const { colors } = useTheme();
  const [rewards, setRewards] = useState<RewardState | null>(null);
  const [busy, setBusy] = useState(false);
  const refresh = () => loadRewards().then(setRewards);
  useEffect(() => {
    void refresh();
  }, []);
  const member = rewards?.membership.active;

  const onSubscribe = async () => {
    setBusy(true);
    const r = await subscribe();
    setBusy(false);
    if (r === 'ok') {
      await refresh();
      if (!purchases().real) Alert.alert(t('membership.title'), t('membership.devActivated'));
    } else if (r === 'unavailable') Alert.alert(t('membership.title'), t('membership.notReady'));
  };

  const onCancel = () => {
    Alert.alert(t('membership.manage'), '', [
      { text: t('cancel'), style: 'cancel' },
      {
        text: t('membership.manage'),
        style: 'destructive',
        onPress: async () => {
          await cancelMembership();
          await refresh();
          Alert.alert(t('membership.title'), t('membership.cancelled'));
        },
      },
    ]);
  };

  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <View style={[styles.badge, { backgroundColor: colors.primarySoft }]}>
          <Icon name="star" size="sm" color="primary" />
        </View>
        <View style={{ flex: 1 }}>
          <AppText variant="bodyStrong">{t('membership.title')}</AppText>
          <AppText variant="bodySmall" tone="secondary">
            {t('membership.body')}
          </AppText>
        </View>
      </View>
      <View style={styles.priceRow}>
        <AppText variant="bodyStrong" tone="muted" style={styles.struck}>
          ₹{PLAN.listRupees}
        </AppText>
        <AppText variant="headingLarge">₹{PLAN.rupees}</AppText>
        <AppText variant="bodySmall" tone="secondary">
          {t('membership.perMonth')}
        </AppText>
      </View>
      {member ? (
        <View style={styles.memberRow}>
          <AppText variant="bodySmall" tone="success">
            {t('membership.active', { date: rewards?.membership.since ? new Date(rewards.membership.since).toLocaleDateString() : '' })}
          </AppText>
          <Button label={t('membership.manage')} variant="tertiary" size="sm" onPress={onCancel} />
        </View>
      ) : (
        <Button label={t('membership.subscribe')} fullWidth loading={busy} onPress={() => void onSubscribe()} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { paddingVertical: space.lg, gap: space.md },
  head: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  badge: { width: 40, height: 40, borderRadius: radii.sm, alignItems: 'center', justifyContent: 'center' },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: space.sm },
  struck: { textDecorationLine: 'line-through' },
  memberRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
});
