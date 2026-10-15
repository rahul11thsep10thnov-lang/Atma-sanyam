// One child: profile, player id, live session, today's time, progress,
// devices, and the management actions (PIN reset, pause, sign-out-all,
// remove, export). Sensitive actions go through step-up.
import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Platform, Share, StyleSheet, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { useGuardianRealtime } from '../../context/GuardianRealtime';
import { RootStackParamList } from '../../navigation/types';
import { AppText, Avatar, Button, Card, Screen, SettingLink, SettingToggle, LoadingState, ErrorState, Badge, ProgressBar, TextField } from '../../ui';
import { ScreenHeader } from '../../components/ScreenHeader';
import { LiveBadge, formatDuration } from '../../components/guardian/LiveBadge';
import { guardianApi, type ChildDetail, type DeviceRow } from '../../api/guardian';
import { useGuardian } from '../../context/GuardianContext';
import { usePlayer } from '../../context/PlayerContext';
import { useConsole } from '../../context/ConsoleContext';
import { useStepUp } from './StepUpScreen';
import { getInstallId } from '../../services/installId';
import { friendlyError } from '../../services/apiClient';
import { space } from '../../theme/spacing';
import { useTheme } from '../../theme/ThemeContext';
import { t } from '../../i18n';

function confirm(title: string, message: string, onOk: () => void) {
  if (Platform.OS === 'web') {
    if (globalThis.confirm?.(`${title}\n\n${message}`)) onOk();
    return;
  }
  Alert.alert(title, message, [{ text: t('common.cancel'), style: 'cancel' }, { text: t('common.ok'), style: 'destructive', onPress: onOk }]);
}

export function ChildDetailScreen({ navigation, route }: NativeStackScreenProps<RootStackParamList, 'ChildDetail'>) {
  const { colors } = useTheme();
  const g = useGuardian();
  const p = usePlayer();
  const { setConsole } = useConsole();
  const stepUp = useStepUp();
  const [data, setData] = useState<ChildDetail | null>(null);
  const [devices, setDevices] = useState<DeviceRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const id = route.params.childId;

  const load = useCallback(async () => {
    try {
      setData(await guardianApi.child(id));
      setDevices((await guardianApi.devices()).filter((d) => d.childId === id));
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
  // Live: the child coming online, starting or ending a game refreshes the card.
  const rt = useGuardianRealtime();
  useEffect(() => rt.onChildStatus((m) => { if (m.childId === id) void load(); }), [rt, id, load]);

  const run = async (key: string, fn: () => Promise<unknown>, then?: () => void) => {
    setBusy(key);
    try {
      await fn();
      await load();
      await g.refresh();
      then?.();
    } catch (e) {
      Alert.alert(t('common.error'), friendlyError(e));
    } finally {
      setBusy(null);
    }
  };

  if (error && !data) return <ErrorState message={error} onRetry={load} />;
  if (!data) return <LoadingState />;
  const c = data.child;

  const openConsole = () =>
    run('console', async () => {
      const r = await guardianApi.playerSession(c.id, await getInstallId());
      await p.adoptSession(r.token, r.child);
      setConsole('player');
      navigation.reset({ index: 0, routes: [{ name: 'PlayerConsole' }] });
    });

  const resetPin = () =>
    stepUp(navigation, () =>
      run('pin', () => guardianApi.resetPin(c.id, pin), () => {
        setPin('');
        setShowPin(false);
        Alert.alert(t('child.saved'));
      })
    );

  const remove = () =>
    stepUp(navigation, () =>
      confirm(t('child.remove'), t('child.removeConfirm', { name: c.displayName, days: 7 }), () => run('remove', () => guardianApi.removeChild(c.id), () => navigation.goBack()))
    );

  const exportData = () =>
    stepUp(navigation, () =>
      run('export', async () => {
        const json = JSON.stringify(await guardianApi.exportChild(c.id), null, 2);
        if (Platform.OS === 'web') {
          const blob = new Blob([json], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `loji-${c.displayName}.json`;
          a.click();
        } else await Share.share({ message: json, title: `LoJi data for ${c.displayName}` });
      })
    );

  return (
    <Screen scroll>
      <ScreenHeader title={c.displayName} subtitle={`${c.age} · ${t(`bracket.${c.effectiveBracket}` as 'bracket.A')} · ${t(`bracket.${c.effectiveBracket}.ages` as 'bracket.A.ages')}`} right={<Button label={t('common.edit')} size="sm" variant="secondary" onPress={() => navigation.navigate('ChildEditor', { childId: c.id })} />} />
      <Card variant="raised" padding="lg" style={styles.card}>
        <View style={styles.row}>
          <Avatar avatarId={c.avatarId} name={c.displayName} size={64} ring />
          <View style={{ flex: 1 }}>
            <AppText variant="dashLabel" tone="secondary">{t('child.playerId')}</AppText>
            <AppText variant="numeralSmall" selectable>{c.playerId}</AppText>
            <AppText variant="caption" tone="muted">{t('child.playerIdHint')}</AppText>
          </View>
        </View>
        <View style={{ marginTop: space.md }}>
          <LiveBadge live={data.live} />
        </View>
        {data.live.currentSession && (
          <View style={[styles.live, { backgroundColor: colors.successSoft }]}>
            <AppText variant="bodyStrong" style={{ flex: 1 }}>
              {data.live.currentSession.gameName} · {formatDuration(data.live.currentSession.durationSeconds)}
            </AppText>
            {data.controls.mirroringEnabled && <Button label={t('dash.watch')} size="sm" icon="eye" onPress={() => navigation.navigate('Mirror', { childId: c.id })} />}
            <Button label={t('dash.end')} size="sm" variant="destructive" onPress={() => run('end', () => guardianApi.endSession(c.id))} />
          </View>
        )}
        <View style={{ marginTop: space.lg }}>
          <View style={styles.rowBetween}>
            <AppText variant="dashLabel" tone="secondary">{t('dash.today')}</AppText>
            <AppText variant="dashLabel">{t('dash.limit', { used: data.today.minutes, limit: data.today.limitMinutes })}</AppText>
          </View>
          <ProgressBar value={data.today.limitMinutes ? data.today.minutes / data.today.limitMinutes : 0} height={10} />
        </View>
        <View style={styles.stats}>
          {[[data.progress.gamesPlayed, t('dash.gamesPlayed')], [data.progress.completions, t('dash.completions')], [data.progress.stars, t('dash.stars')], [data.progress.achievements.length, t('dash.badges')]].map(([n, l]) => (
            <View key={String(l)} style={styles.stat}>
              <AppText variant="numeralSmall" tone="primary">{String(n)}</AppText>
              <AppText variant="caption" tone="muted">{String(l)}</AppText>
            </View>
          ))}
        </View>
        <Button label={t('child.openConsole')} icon="play" onPress={openConsole} loading={busy === 'console'} disabled={!g.entitled || c.status !== 'active'} fullWidth style={{ marginTop: space.lg }} />
      </Card>

      <Card variant="raised" paddingX="lg" padding={0} style={styles.card}>
        <SettingLink icon="shield" label={t('child.controls')} hint={`${data.controls.dailyLimitMinutes} min/day · ${data.controls.sessionLimitMinutes} min/session`} onPress={() => navigation.navigate('Controls', { childId: c.id })} />
        <SettingLink icon="chart" label={t('dash.recent')} hint={t('dash.weekly')} onPress={() => navigation.navigate('Controls', { childId: c.id })} />
        <SettingToggle icon="lock" label={t('child.otp')} hint={t('child.otpHint')} value={c.playerOtpRequired} busy={busy === 'otp'} onValueChange={(v) => run('otp', () => guardianApi.updateChild(c.id, { playerOtpRequired: v }))} />
        <SettingToggle icon="pause" label={t('child.pause')} value={c.status === 'paused'} busy={busy === 'status'} onValueChange={(v) => run('status', () => guardianApi.updateChild(c.id, { status: v ? 'paused' : 'active' }))} last />
      </Card>

      <Card variant="raised" paddingX="lg" padding={0} style={styles.card}>
        <SettingLink icon="hash" label={t('child.resetPin')} onPress={() => setShowPin((s) => !s)} last={!showPin} />
        {showPin && (
          <View style={{ paddingBottom: space.md }}>
            <TextField label={t('child.pin')} value={pin} onChangeText={(v) => setPin(v.replace(/\D/g, '').slice(0, 6))} keyboardType="number-pad" hint={t('child.pinHint')} />
            <Button label={t('common.save')} onPress={resetPin} loading={busy === 'pin'} disabled={pin.length < 4} style={{ marginTop: space.md }} />
          </View>
        )}
        <SettingLink icon="logOut" label={t('child.signOutAll')} onPress={() => run('revoke', () => guardianApi.revokeSessions(c.id))} />
        <SettingLink icon="download" label={t('child.export')} onPress={exportData} />
        <SettingLink icon="trash" label={t('child.remove')} tone="danger" onPress={remove} last />
      </Card>

      {devices.length > 0 && (
        <Card variant="raised" padding="lg" style={styles.card}>
          <AppText variant="dashHeading" style={{ marginBottom: space.sm }}>{t('child.devices')}</AppText>
          {devices.map((d) => (
            <View key={d.id} style={styles.deviceRow}>
              <View style={{ flex: 1 }}>
                <AppText variant="bodyStrong">{d.label ?? d.platform}</AppText>
                <AppText variant="caption" tone="muted">{d.platform} · {d.appVersion ?? '—'}</AppText>
              </View>
              {d.approvedAt ? <Badge label={t('common.ok')} color={colors.successSoft} /> : <Button label={t('child.approveDevice')} size="sm" onPress={() => run('dev', () => guardianApi.approveDevice(d.id))} />}
              <Button label={t('child.removeDevice')} size="sm" variant="tertiary" onPress={() => run('dev', () => guardianApi.removeDevice(d.id))} />
            </View>
          ))}
        </Card>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: space.lg },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.lg },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  live: { flexDirection: 'row', alignItems: 'center', gap: space.sm, padding: space.md, borderRadius: 14, marginTop: space.md, flexWrap: 'wrap' },
  stats: { flexDirection: 'row', marginTop: space.lg },
  stat: { flex: 1, alignItems: 'center' },
  deviceRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingVertical: space.sm },
});
