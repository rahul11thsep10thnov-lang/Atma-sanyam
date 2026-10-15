// The child's door: Player ID and PIN in big friendly boxes, then (if the
// guardian wants it) the code read out by the grown-up.
import React, { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RootStackParamList } from '../../navigation/types';
import { AppText, BigButton, PlayfulBackdrop, PopIn, RoundButton, Bob } from '../../ui';
import { OtpInput } from '../../components/forms/OtpInput';
import { usePlayer } from '../../context/PlayerContext';
import { useConsole } from '../../context/ConsoleContext';
import { friendlyError } from '../../services/apiClient';
import { LojiLogo } from '../WelcomeScreen';
import { palette } from '../../theme/palette';
import { space } from '../../theme/spacing';
import { useTheme } from '../../theme/ThemeContext';
import { t } from '../../i18n';

function BigField({ label, value, onChangeText, placeholder, secure, keyboardType, maxLength, autoCapitalize }: { label: string; value: string; onChangeText: (v: string) => void; placeholder: string; secure?: boolean; keyboardType?: 'default' | 'number-pad'; maxLength?: number; autoCapitalize?: 'characters' | 'none' }) {
  const { colors } = useTheme();
  return (
    <View style={{ marginTop: space.lg }}>
      <AppText variant="subheading" style={{ marginBottom: 6, marginLeft: 4 }}>{label}</AppText>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        secureTextEntry={secure}
        keyboardType={keyboardType}
        maxLength={maxLength}
        autoCapitalize={autoCapitalize}
        autoCorrect={false}
        accessibilityLabel={label}
        style={[styles.bigInput, { backgroundColor: colors.surfaceRaised, borderColor: colors.borderStrong, color: colors.text }]}
      />
    </View>
  );
}

export function PlayerLoginScreen({ navigation, route }: NativeStackScreenProps<RootStackParamList, 'PlayerLogin'>) {
  const insets = useSafeAreaInsets();
  const p = usePlayer();
  const { setConsole } = useConsole();
  const [playerId, setPlayerId] = useState(route.params?.playerId ?? '');
  const [pin, setPin] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    setBusy(true);
    try {
      const r = await p.loginStart(playerId.trim(), pin);
      if (r.otpRequired && r.challengeId) {
        navigation.navigate('PlayerOtp', { challengeId: r.challengeId, phoneMasked: r.guardianPhoneMasked ?? '', childName: r.childName ?? '', resendAfterSeconds: r.resendAfterSeconds ?? 45 });
      } else {
        setConsole('player');
        navigation.reset({ index: 0, routes: [{ name: 'PlayerConsole' }] });
      }
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <PlayfulBackdrop>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={[styles.wrap, { paddingTop: insets.top + space.lg, paddingBottom: insets.bottom + space.xxl }]}>
          <View style={styles.topRow}>
            <RoundButton icon="arrowLeft" label={t('common.back')} onPress={() => (navigation.canGoBack() ? navigation.goBack() : navigation.replace('Welcome'))} color={palette.sky} size={48} />
          </View>
          <PopIn style={{ alignItems: 'center' }}>
            <Bob>
              <Text style={{ fontSize: 72 }}>🎮</Text>
            </Bob>
            <LojiLogo size={48} />
            <AppText variant="headingLarge" align="center" style={{ marginTop: space.sm }}>{t('pauth.title')}</AppText>
          </PopIn>
          <BigField label={t('pauth.playerId')} value={playerId} onChangeText={(v) => setPlayerId(v.toUpperCase())} placeholder="LOJI-ABC123" autoCapitalize="characters" maxLength={12} />
          <AppText variant="caption" tone="muted" style={{ marginLeft: 4, marginTop: 4 }}>{t('pauth.playerIdHint')}</AppText>
          <BigField label={t('pauth.pin')} value={pin} onChangeText={(v) => setPin(v.replace(/\D/g, '').slice(0, 6))} placeholder="••••" secure keyboardType="number-pad" maxLength={6} />
          {error ? (
            <AppText variant="bodyStrong" tone="danger" align="center" style={{ marginTop: space.md }} accessibilityRole="alert">{error}</AppText>
          ) : null}
          <BigButton label={t('pauth.go')} emoji="🚀" onPress={submit} disabled={busy || playerId.length < 6 || pin.length < 4} color={palette.lime} size="xl" fullWidth style={{ marginTop: space.xxl }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </PlayfulBackdrop>
  );
}

export function PlayerOtpScreen({ navigation, route }: NativeStackScreenProps<RootStackParamList, 'PlayerOtp'>) {
  const insets = useSafeAreaInsets();
  const p = usePlayer();
  const { setConsole } = useConsole();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [wait, setWait] = useState(route.params.resendAfterSeconds);
  useEffect(() => {
    if (wait <= 0) return;
    const id = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(id);
  }, [wait]);
  const verify = async (c: string) => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await p.loginVerify(route.params.challengeId, c);
      setConsole('player');
      navigation.reset({ index: 0, routes: [{ name: 'PlayerConsole' }] });
    } catch (e) {
      setError(friendlyError(e));
      setCode('');
    } finally {
      setBusy(false);
    }
  };
  return (
    <PlayfulBackdrop>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={[styles.wrap, { paddingTop: insets.top + space.lg, paddingBottom: insets.bottom + space.xxl }]}>
        <View style={styles.topRow}>
          <RoundButton icon="arrowLeft" label={t('common.back')} onPress={() => navigation.goBack()} color={palette.sky} size={48} />
        </View>
        <PopIn style={{ alignItems: 'center' }}>
          <Text style={{ fontSize: 72 }}>📱</Text>
          <AppText variant="headingLarge" align="center">{t('pauth.otpTitle')}</AppText>
          <AppText variant="body" tone="secondary" align="center" style={{ marginTop: space.sm }}>{t('pauth.otpSent', { phone: route.params.phoneMasked })}</AppText>
        </PopIn>
        <View style={{ marginTop: space.xxl }}>
          <OtpInput value={code} onChange={setCode} onComplete={verify} />
        </View>
        {error ? <AppText variant="bodyStrong" tone="danger" align="center" style={{ marginTop: space.md }}>{error}</AppText> : null}
        <BigButton label={t('gauth.verify')} emoji="✅" onPress={() => verify(code)} disabled={busy || code.length !== 6} color={palette.lime} fullWidth style={{ marginTop: space.xl }} />
      </ScrollView>
    </PlayfulBackdrop>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: space.screen, maxWidth: 520, width: '100%', alignSelf: 'center' },
  topRow: { flexDirection: 'row', marginBottom: space.md },
  bigInput: { height: 68, borderRadius: 22, borderWidth: 3, paddingHorizontal: 20, fontSize: 26, fontFamily: 'Fredoka_600SemiBold', letterSpacing: 2 },
});
