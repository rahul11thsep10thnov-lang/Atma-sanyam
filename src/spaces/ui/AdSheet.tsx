// Coins: the balance, how coins are earned, and "watch an ad for coins".
// Each ad within the last three hours pays less than the one before.
import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { placeholderAds, rewardedAds } from '../../ads/rewardedAds';
import { AD_SECONDS, AD_WINDOW_MS, adsInWindow, creditAd, nextAdReward, RewardState } from '../rewards';
import { PENALTY_REMOVAL_COINS } from '../catalog';
import { Sheet } from './Sheet';
import { AppText } from '../../ui/AppText';
import { Button } from '../../ui/Button';
import { Icon } from '../../ui/Icon';
import { radii } from '../../theme/radii';
import { space as sp } from '../../theme/spacing';
import { useTheme } from '../../theme/ThemeContext';
import { t } from '../../i18n';

interface Props {
  visible: boolean;
  rewards: RewardState;
  onClose: () => void;
  onRewards: (next: RewardState) => Promise<void>;
  onToast: (text: string) => void;
}

export function AdSheet({ visible, rewards, onClose, onRewards, onToast }: Props) {
  const { colors } = useTheme();
  const [playing, setPlaying] = useState<number | null>(null);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!visible) return;
    const id = setInterval(() => setTick((x) => x + 1), 30000);
    return () => clearInterval(id);
  }, [visible]);
  void tick;
  const member = rewards.membership.active;
  const reward = nextAdReward(rewards);
  const recent = adsInWindow(rewards);
  const provider = rewardedAds();

  const watch = async () => {
    if (playing !== null) return;
    setPlaying(AD_SECONDS);
    const { watched } = await provider.show((s) => setPlaying(s));
    setPlaying(null);
    if (!watched) {
      onToast(t('ads.notFinished'));
      return;
    }
    const { state, coins } = creditAd(rewards);
    await onRewards(state);
    onToast(t('ads.earned', { coins }));
  };

  useEffect(() => {
    if (!visible && playing !== null) placeholderAds.abort();
  }, [visible, playing]);

  return (
    <Sheet visible={visible} title={t('ads.title')} subtitle={t('ads.subtitle')} onClose={onClose} maxHeight="70%">
      <View style={[styles.balance, { backgroundColor: colors.accentSoft }]}>
        <Icon name="coins" size="md" color={colors.accent} />
        <AppText variant="headingLarge">{rewards.coins}</AppText>
        <AppText variant="bodySmall" tone="secondary">
          {t('coins')}
        </AppText>
      </View>
      <View style={styles.rows}>
        <Row icon="timer" text={t('ads.ruleMinute')} />
        <Row icon="leaf" text={t('ads.rulePenalty', { coins: PENALTY_REMOVAL_COINS })} />
        <Row icon="sparkles" text={t('ads.ruleMilestones')} />
      </View>
      {member ? (
        <View style={[styles.adBox, { borderColor: colors.border }]}>
          <AppText variant="bodySmallStrong">{t('ads.memberTitle')}</AppText>
          <AppText variant="caption" tone="secondary">
            {t('ads.memberBody')}
          </AppText>
        </View>
      ) : (
        <View style={[styles.adBox, { borderColor: colors.border }]}>
          <AppText variant="bodySmallStrong">{t('ads.watchTitle', { seconds: AD_SECONDS })}</AppText>
          <AppText variant="caption" tone="secondary">
            {recent === 0 ? t('ads.watchFresh', { coins: reward }) : t('ads.watchDecayed', { coins: reward, count: recent, hours: AD_WINDOW_MS / 3600000 })}
          </AppText>
          {!provider.real && (
            <AppText variant="caption" tone="muted">
              {t('ads.placeholderNote')}
            </AppText>
          )}
          {playing !== null ? (
            <View style={[styles.player, { backgroundColor: colors.surfaceMuted }]}>
              <AppText variant="heading">{playing}s</AppText>
              <AppText variant="caption" tone="secondary">
                {t('ads.playing')}
              </AppText>
              <Button label={t('ads.stop')} size="sm" variant="tertiary" onPress={() => placeholderAds.abort()} />
            </View>
          ) : (
            <Button label={t('ads.watchButton', { coins: reward })} icon="play" fullWidth onPress={() => void watch()} />
          )}
        </View>
      )}
    </Sheet>
  );
}

function Row({ icon, text }: { icon: 'timer' | 'leaf' | 'sparkles'; text: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.row}>
      <Icon name={icon} size="xs" color={colors.textSecondary} />
      <AppText variant="bodySmall" tone="secondary" style={{ flex: 1 }}>
        {text}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  balance: { flexDirection: 'row', alignItems: 'center', gap: sp.sm, padding: sp.lg, borderRadius: radii.md, marginBottom: sp.md },
  rows: { gap: sp.sm, marginBottom: sp.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: sp.sm },
  adBox: { borderWidth: 1, borderRadius: radii.md, padding: sp.lg, gap: sp.sm },
  player: { alignItems: 'center', gap: 4, padding: sp.lg, borderRadius: radii.md },
});
