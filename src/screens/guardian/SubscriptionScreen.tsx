// The family plan: current status, what is included, and the ways to buy
// (Google Play on Android, card/UPI on the website, the dev-only sandbox).
// The server is the only judge of whether a purchase counts.
import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Linking, Platform, StyleSheet, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { AppText, Button, Card, Icon, Screen, useTabBarInset, Badge, LoadingState } from '../../ui';
import { guardianApi } from '../../api/guardian';
import { useGuardian } from '../../context/GuardianContext';
import { useRemoteConfig } from '../../context/RemoteConfigContext';
import { fetchSubscription, ownedPurchases, playBillingAvailable, purchaseSubscription, type PlayProduct } from '../../billing/playBilling';
import { openRazorpayCheckout, razorpayAvailable } from '../../billing/razorpayWeb';
import { friendlyError } from '../../services/apiClient';
import { env } from '../../config/env';
import { space } from '../../theme/spacing';
import { useTheme } from '../../theme/ThemeContext';
import type { SubscriptionInfo } from '../../types';
import { t } from '../../i18n';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/types';

function fmtDate(iso: string | null | undefined) {
  return iso ? new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' }) : '';
}

export function SubscriptionScreen() {
  const { colors } = useTheme();
  const g = useGuardian();
  const { config } = useRemoteConfig();
  const inset = useTabBarInset();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [info, setInfo] = useState<SubscriptionInfo | null>(null);
  const [product, setProduct] = useState<PlayProduct | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const i = await guardianApi.subscription();
      setInfo(i);
      if (i.providers.googlePlay && playBillingAvailable()) fetchSubscription(i.monthly.productId).then(setProduct).catch(() => undefined);
    } catch (e) {
      setMessage(friendlyError(e));
    }
  }, []);
  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );
  useEffect(() => {
    void g.refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [info?.entitlement.status]);

  const confirmThen = (fn: () => Promise<void>) => {
    const price = product?.displayPrice ?? t('sub.price', { price: info?.monthly.priceInr ?? config.subscription.priceInr });
    const body = t('sub.confirmBody', { price });
    if (Platform.OS === 'web') {
      if (globalThis.confirm?.(`${t('sub.confirmTitle')}\n\n${body}`)) void fn();
      return;
    }
    Alert.alert(t('sub.confirmTitle'), body, [{ text: t('common.cancel'), style: 'cancel' }, { text: t('sub.confirm'), onPress: () => void fn() }]);
  };

  const buyGoogle = () =>
    confirmThen(async () => {
      setBusy('google');
      setMessage(null);
      try {
        const productId = info?.monthly.productId ?? config.subscription.productId;
        const purchase = await purchaseSubscription(productId, product?.offerToken, g.guardian?.id);
        setMessage(t('sub.verifying'));
        await guardianApi.verifyGooglePurchase(purchase.purchaseToken, purchase.productId);
        setMessage(t('sub.verified'));
        await load();
      } catch (e) {
        setMessage(e instanceof Error && /cancel/i.test(e.message) ? null : t('sub.failed'));
      } finally {
        setBusy(null);
      }
    });

  const buyWeb = () =>
    confirmThen(async () => {
      setBusy('web');
      setMessage(null);
      try {
        const created = await guardianApi.razorpayCreate();
        const r = await openRazorpayCheckout({ keyId: created.keyId, subscriptionId: created.subscriptionId, name: created.name, description: t('sub.monthly'), prefill: created.prefill });
        setMessage(t('sub.verifying'));
        await guardianApi.razorpayConfirm(r);
        setMessage(t('sub.verified'));
        await load();
      } catch (e) {
        setMessage(e instanceof Error && /cancel/i.test(e.message) ? null : friendlyError(e));
      } finally {
        setBusy(null);
      }
    });

  const restore = async () => {
    setBusy('restore');
    setMessage(null);
    try {
      const productId = info?.monthly.productId ?? config.subscription.productId;
      for (const p of await ownedPurchases()) await guardianApi.verifyGooglePurchase(p.purchaseToken, p.productId || productId).catch(() => undefined);
      const r = await guardianApi.restore();
      setMessage(r.entitlement.active ? t('sub.verified') : t('sub.status.never_subscribed'));
      await load();
    } catch (e) {
      setMessage(friendlyError(e));
    } finally {
      setBusy(null);
    }
  };

  const sandbox = async () => {
    setBusy('sandbox');
    try {
      await guardianApi.sandboxActivate();
      await load();
      setMessage(t('sub.verified'));
    } catch (e) {
      setMessage(friendlyError(e));
    } finally {
      setBusy(null);
    }
  };

  const cancelWeb = async () => {
    setBusy('cancel');
    try {
      await guardianApi.razorpayCancel();
      await load();
    } catch (e) {
      setMessage(friendlyError(e));
    } finally {
      setBusy(null);
    }
  };

  if (!info) return <LoadingState />;
  const ent = info.entitlement;
  const statusKey = `sub.status.${ent.status}` as 'sub.status.active';
  const price = product?.displayPrice ?? t('sub.price', { price: info.monthly.priceInr });

  return (
    <Screen scroll bottomInset={inset}>
      <AppText variant="dashTitle" style={{ marginBottom: space.lg }}>{t('sub.title')}</AppText>
      <Card variant="raised" padding="lg" style={styles.card}>
        <View style={styles.row}>
          <Icon name={ent.active ? 'shield' : 'lock'} size="lg" color={ent.active ? 'success' : 'warning'} />
          <View style={{ flex: 1 }}>
            <AppText variant="dashHeading">{t('sub.monthly')}</AppText>
            <Badge label={t(statusKey, { date: fmtDate(ent.validUntil) })} color={ent.active ? colors.successSoft : colors.warningSoft} />
          </View>
        </View>
        {ent.validUntil && (
          <AppText variant="bodySmall" tone="secondary" style={{ marginTop: space.sm }}>
            {info.current?.autoRenewing && ent.status === 'active' ? t('sub.renews', { date: fmtDate(ent.validUntil) }) : t('sub.ends', { date: fmtDate(ent.validUntil) })}
          </AppText>
        )}
        {info.current && (
          <AppText variant="caption" tone="muted" style={{ marginTop: 4 }}>
            {info.current.provider === 'google_play' ? 'Google Play' : info.current.provider === 'razorpay' ? 'Card / UPI' : 'Sandbox'} · {info.current.productId}
          </AppText>
        )}
      </Card>

      <Card variant="raised" padding="lg" style={styles.card}>
        <AppText variant="numeralSmall" tone="primary">{price}</AppText>
        <AppText variant="bodySmall" tone="secondary">{config.texts.subscriptionPitch}</AppText>
        <AppText variant="dashLabel" tone="secondary" style={{ marginTop: space.lg, marginBottom: space.xs }}>{t('sub.included')}</AppText>
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <View key={i} style={styles.inc}>
            <Icon name="check" size="sm" color="success" />
            <AppText variant="body" style={{ flex: 1 }}>{t(`sub.included.${i}` as 'sub.included.1')}</AppText>
          </View>
        ))}
        {message ? <AppText variant="bodySmall" tone={message === t('sub.verified') ? 'success' : 'warning'} style={{ marginTop: space.md }} accessibilityRole="alert">{message}</AppText> : null}
        <View style={{ marginTop: space.lg, gap: space.sm }}>
          {info.providers.googlePlay && Platform.OS === 'android' && <Button label={t('sub.subscribeGoogle')} icon="creditCard" onPress={buyGoogle} loading={busy === 'google'} disabled={!playBillingAvailable()} fullWidth />}
          {info.providers.googlePlay && Platform.OS === 'android' && !playBillingAvailable() && <AppText variant="caption" tone="muted">{t('sub.storeUnavailable')}</AppText>}
          {info.providers.razorpay && razorpayAvailable() && <Button label={t('sub.subscribeWeb')} icon="creditCard" onPress={buyWeb} loading={busy === 'web'} fullWidth />}
          {info.providers.sandbox && env.appEnv !== 'production' && <Button label={t('sub.subscribeSandbox')} variant="secondary" onPress={sandbox} loading={busy === 'sandbox'} fullWidth />}
          {!(info.providers.googlePlay && Platform.OS === 'android') && !(info.providers.razorpay && razorpayAvailable()) && !(info.providers.sandbox && env.appEnv !== 'production') && (
            <AppText variant="bodySmall" tone="secondary">{t('sub.otherPlatform')}</AppText>
          )}
          <Button label={t('sub.restore')} variant="tertiary" onPress={restore} loading={busy === 'restore'} fullWidth />
          {info.manage.googlePlayUrl && <Button label={t('sub.manage')} variant="secondary" onPress={() => Linking.openURL(info.manage.googlePlayUrl!)} fullWidth />}
          {info.current?.provider === 'razorpay' && ent.active && ent.status !== 'cancelled' && <Button label={t('sub.cancel')} variant="destructive" onPress={cancelWeb} loading={busy === 'cancel'} fullWidth />}
        </View>
        <AppText variant="caption" tone="muted" style={{ marginTop: space.md }}>{t('sub.cancelHint')}</AppText>
        <AppText variant="caption" tone="muted">{t('sub.refunds', { email: env.supportEmail ?? info.manage.supportEmail ?? 'support' })}</AppText>
        <Button label={t('settings.refund')} variant="tertiary" size="sm" onPress={() => navigation.navigate('Legal', { doc: 'subscription' })} />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: space.lg },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  inc: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingVertical: 4 },
});
