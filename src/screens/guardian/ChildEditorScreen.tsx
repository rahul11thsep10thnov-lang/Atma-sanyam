// Add or edit a child: nickname, avatar, birth month, PIN (on creation),
// and the sign-in code setting. The age bracket is computed on the server.
import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Image, ScrollView, StyleSheet, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import { AppText, Button, Card, Screen, SegmentedControl, SettingToggle, Tactile, TextField } from '../../ui';
import { ScreenHeader } from '../../components/ScreenHeader';
import { guardianApi } from '../../api/guardian';
import { useGuardian } from '../../context/GuardianContext';
import { AVATARS } from '../../profile/avatars';
import { friendlyError } from '../../services/apiClient';
import { space } from '../../theme/spacing';
import { useTheme } from '../../theme/ThemeContext';
import type { AgeBracket, Child } from '../../types';
import { t } from '../../i18n';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function ChildEditorScreen({ navigation, route }: NativeStackScreenProps<RootStackParamList, 'ChildEditor'>) {
  const { colors } = useTheme();
  const g = useGuardian();
  const existing = route.params?.childId ? g.children.find((c) => c.id === route.params?.childId) : undefined;
  const [name, setName] = useState(existing?.displayName ?? '');
  const [avatar, setAvatar] = useState(existing?.avatarId ?? AVATARS[0]!.id);
  const now = new Date();
  const [year, setYear] = useState(existing ? now.getFullYear() - existing.age : now.getFullYear() - 6);
  const [month, setMonth] = useState(1);
  const [pin, setPin] = useState('');
  const [otp, setOtp] = useState(existing?.playerOtpRequired ?? true);
  const [override, setOverride] = useState<'auto' | AgeBracket>(existing?.bracketOverride ?? 'auto');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<Child | null>(null);

  useEffect(() => {
    if (existing && route.params?.childId) {
      guardianApi.child(route.params.childId).then((d) => {
        // birth month is not returned by the profile; keep the computed year
        void d;
      }).catch(() => undefined);
    }
  }, [existing, route.params?.childId]);

  const birthMonth = `${year}-${String(month).padStart(2, '0')}`;
  const years = useMemo(() => Array.from({ length: 11 }, (_, i) => now.getFullYear() - 3 - i), [now]);

  const save = async () => {
    setError(null);
    setBusy(true);
    try {
      if (existing) {
        await guardianApi.updateChild(existing.id, { displayName: name.trim(), avatarId: avatar, bracketOverride: override === 'auto' ? null : override, playerOtpRequired: otp });
        await g.refresh();
        navigation.goBack();
      } else {
        const c = await guardianApi.createChild({ displayName: name.trim(), avatarId: avatar, birthMonth, pin, playerOtpRequired: otp });
        await g.refresh();
        setCreated(c);
      }
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setBusy(false);
    }
  };

  if (created) {
    return (
      <Screen>
        <ScreenHeader title={t('child.add')} onBack={() => navigation.goBack()} />
        <Card variant="raised" padding="xl" style={{ alignItems: 'center' }}>
          <Image source={AVATARS.find((a) => a.id === created.avatarId)?.source} style={{ width: 96, height: 96, borderRadius: 48 }} />
          <AppText variant="dashHeading" align="center" style={{ marginTop: space.md }}>{t('child.created', { name: created.displayName })}</AppText>
          <AppText variant="dashLabel" tone="secondary" style={{ marginTop: space.lg }}>{t('child.playerId')}</AppText>
          <AppText variant="numeral" selectable>{created.playerId}</AppText>
          <AppText variant="bodySmall" tone="secondary" align="center">{t('child.playerIdHint')}</AppText>
          <Button label={t('common.done')} onPress={() => navigation.goBack()} fullWidth style={{ marginTop: space.xl }} />
        </Card>
      </Screen>
    );
  }

  return (
    <Screen scroll>
      <ScreenHeader title={existing ? t('child.edit') : t('child.add')} />
      <Card variant="raised" padding="lg">
        <TextField label={t('child.name')} value={name} onChangeText={setName} hint={t('child.nameHint')} icon="user" maxLength={30} />
        <AppText variant="bodySmallStrong" tone="secondary" style={styles.label}>{t('child.avatar')}</AppText>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.sm }}>
          {AVATARS.map((a) => (
            <Tactile key={a.id} onPress={() => setAvatar(a.id)} accessibilityRole="radio" accessibilityState={{ selected: avatar === a.id }} accessibilityLabel={a.id}>
              <Image source={a.source} style={[styles.avatar, avatar === a.id && { borderColor: colors.primary, borderWidth: 4 }]} />
            </Tactile>
          ))}
        </ScrollView>
        {!existing && (
          <>
            <AppText variant="bodySmallStrong" tone="secondary" style={styles.label}>{t('child.birthMonth')}</AppText>
            <AppText variant="caption" tone="muted">{t('child.birthMonthHint')}</AppText>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, marginTop: space.sm }}>
              {years.map((y) => (
                <Tactile key={y} onPress={() => setYear(y)} accessibilityRole="radio" accessibilityState={{ selected: year === y }}>
                  <View style={[styles.pick, { backgroundColor: year === y ? colors.primary : colors.surfaceMuted }]}>
                    <AppText variant="bodySmallStrong" style={{ color: year === y ? '#fff' : colors.text }}>{y}</AppText>
                  </View>
                </Tactile>
              ))}
            </ScrollView>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, marginTop: space.sm }}>
              {MONTHS.map((m, i) => (
                <Tactile key={m} onPress={() => setMonth(i + 1)} accessibilityRole="radio" accessibilityState={{ selected: month === i + 1 }}>
                  <View style={[styles.pick, { backgroundColor: month === i + 1 ? colors.accent : colors.surfaceMuted }]}>
                    <AppText variant="bodySmallStrong" style={{ color: month === i + 1 ? '#fff' : colors.text }}>{m}</AppText>
                  </View>
                </Tactile>
              ))}
            </ScrollView>
            <TextField label={t('child.pin')} value={pin} onChangeText={(v) => setPin(v.replace(/\D/g, '').slice(0, 6))} keyboardType="number-pad" hint={t('child.pinHint')} icon="lock" />
          </>
        )}
        {existing && (
          <>
            <AppText variant="bodySmallStrong" tone="secondary" style={styles.label}>{t('child.bracket')}</AppText>
            <SegmentedControl
              segments={[{ value: 'auto', label: t('child.bracketAuto') }, { value: 'A', label: 'A' }, { value: 'B', label: 'B' }, { value: 'C', label: 'C' }, { value: 'D', label: 'D' }]}
              value={override}
              onChange={setOverride}
            />
            <AppText variant="caption" tone="muted" style={{ marginTop: 6 }}>{t('child.bracketOverride')}: {override === 'auto' ? t(`bracket.${existing.ageBracket}` as 'bracket.A') : t(`bracket.${override}` as 'bracket.A')}</AppText>
          </>
        )}
        <View style={{ marginTop: space.md }}>
          <SettingToggle icon="lock" label={t('child.otp')} hint={t('child.otpHint')} value={otp} onValueChange={setOtp} last />
        </View>
        {error ? (
          <AppText variant="bodySmall" tone="danger" style={{ marginTop: space.md }} accessibilityRole="alert">{error}</AppText>
        ) : null}
        <Button label={t('common.save')} onPress={save} loading={busy} disabled={!name.trim() || (!existing && pin.length < 4)} fullWidth style={{ marginTop: space.xl }} />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  label: { marginTop: space.lg, marginBottom: 6 },
  avatar: { width: 64, height: 64, borderRadius: 32, borderWidth: 4, borderColor: 'transparent' },
  pick: { paddingHorizontal: 14, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
});
