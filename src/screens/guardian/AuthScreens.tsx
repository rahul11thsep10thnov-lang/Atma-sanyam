// Guardian registration, sign-in (password, then a one-time code), code
// entry and account recovery. Everything the server rejects is shown as a
// plain sentence under the form; nothing is bypassed on the client.
import React, { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RootStackParamList } from '../../navigation/types';
import { AppText, Button, Card, TextField, Tactile } from '../../ui';
import { PasswordField } from '../../components/forms/PasswordField';
import { OtpInput } from '../../components/forms/OtpInput';
import { ScreenHeader } from '../../components/ScreenHeader';
import { useGuardian, type Challenge } from '../../context/GuardianContext';
import { useConsole } from '../../context/ConsoleContext';
import { friendlyError } from '../../services/apiClient';
import { passwordProblems, PASSWORD_RULE_MESSAGE } from '../../auth/passwordPolicy';
import { space } from '../../theme/spacing';
import { useTheme } from '../../theme/ThemeContext';
import { t } from '../../i18n';

type Props<R extends keyof RootStackParamList> = NativeStackScreenProps<RootStackParamList, R>;

function AuthShell({ title, subtitle, children, onBack }: { title: string; subtitle?: string; children: React.ReactNode; onBack?: () => void }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.background }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: space.screen, paddingTop: insets.top + space.lg, paddingBottom: insets.bottom + space.xxxl, maxWidth: 520, width: '100%', alignSelf: 'center' }}>
        <ScreenHeader title={title} subtitle={subtitle} onBack={onBack} large />
        <Card variant="raised" padding="xl">
          {children}
        </Card>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

export function GuardianRegisterScreen({ navigation }: Props<'GuardianRegister'>) {
  const g = useGuardian();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [accepted, setAccepted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const problems = password ? passwordProblems(password) : [];

  const submit = async () => {
    setError(null);
    if (!accepted) return setError(t('gauth.termsRequired'));
    if (password !== confirm) return setError(t('gauth.passwordMismatch'));
    if (problems.length) return setError(PASSWORD_RULE_MESSAGE);
    setBusy(true);
    try {
      const c = await g.registerStart({ name: name.trim(), phone: phone.trim(), password });
      navigation.navigate('GuardianOtp', { purpose: 'register', challengeId: c.challengeId, phoneMasked: c.phoneMasked, resendAfterSeconds: c.resendAfterSeconds });
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell title={t('gauth.registerTitle')}>
      <TextField label={t('gauth.name')} value={name} onChangeText={setName} autoComplete="name" textContentType="name" icon="user" />
      <TextField label={t('gauth.phone')} value={phone} onChangeText={setPhone} keyboardType="phone-pad" autoComplete="tel" textContentType="telephoneNumber" icon="phone" hint={t('gauth.phoneHint')} placeholder="98765 43210" />
      <PasswordField label={t('gauth.password')} value={password} onChangeText={setPassword} hint={password && problems.length ? `Needs: ${problems.join(', ')}` : PASSWORD_RULE_MESSAGE} textContentType="newPassword" />
      <PasswordField label={t('gauth.confirmPassword')} value={confirm} onChangeText={setConfirm} error={confirm && confirm !== password ? t('gauth.passwordMismatch') : null} />
      <View style={styles.termsRow}>
        <Switch value={accepted} onValueChange={setAccepted} accessibilityLabel={t('gauth.terms')} />
        <AppText variant="bodySmall" tone="secondary" style={{ flex: 1 }}>
          {t('gauth.terms')}
        </AppText>
      </View>
      <View style={styles.links}>
        <Tactile onPress={() => navigation.navigate('Legal', { doc: 'terms' })} accessibilityRole="link">
          <AppText variant="bodySmallStrong" tone="primary">{t('settings.terms')}</AppText>
        </Tactile>
        <Tactile onPress={() => navigation.navigate('Legal', { doc: 'privacy' })} accessibilityRole="link">
          <AppText variant="bodySmallStrong" tone="primary">{t('settings.privacy')}</AppText>
        </Tactile>
      </View>
      {error ? (
        <AppText variant="bodySmall" tone="danger" style={styles.error} accessibilityRole="alert">
          {error}
        </AppText>
      ) : null}
      <Button label={t('gauth.register')} onPress={submit} loading={busy} disabled={!name.trim() || !phone.trim() || !password || !confirm} fullWidth style={{ marginTop: space.xl }} />
      <Button label={t('gauth.haveAccount')} variant="tertiary" onPress={() => navigation.replace('GuardianLogin')} fullWidth style={{ marginTop: space.sm }} />
    </AuthShell>
  );
}

export function GuardianLoginScreen({ navigation }: Props<'GuardianLogin'>) {
  const g = useGuardian();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    setBusy(true);
    try {
      const c = await g.loginStart(phone.trim(), password);
      navigation.navigate('GuardianOtp', { purpose: 'login', challengeId: c.challengeId, phoneMasked: c.phoneMasked, resendAfterSeconds: c.resendAfterSeconds });
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell title={t('gauth.loginTitle')} onBack={() => (navigation.canGoBack() ? navigation.goBack() : navigation.replace('Welcome'))}>
      <TextField label={t('gauth.phone')} value={phone} onChangeText={setPhone} keyboardType="phone-pad" autoComplete="tel" textContentType="telephoneNumber" icon="phone" placeholder="98765 43210" />
      <PasswordField label={t('gauth.password')} value={password} onChangeText={setPassword} onSubmitEditing={submit} returnKeyType="go" />
      {error ? (
        <AppText variant="bodySmall" tone="danger" style={styles.error} accessibilityRole="alert">
          {error}
        </AppText>
      ) : null}
      <Button label={t('gauth.signIn')} onPress={submit} loading={busy} disabled={!phone.trim() || !password} fullWidth style={{ marginTop: space.xl }} />
      <Button label={t('gauth.forgot')} variant="tertiary" onPress={() => navigation.navigate('GuardianRecovery')} fullWidth style={{ marginTop: space.sm }} />
      <Button label={t('gauth.noAccount')} variant="secondary" onPress={() => navigation.replace('GuardianRegister')} fullWidth style={{ marginTop: space.sm }} />
    </AuthShell>
  );
}

/** Shared code-entry screen for registration, sign-in, recovery and step-up. */
export function GuardianOtpScreen({ navigation, route }: Props<'GuardianOtp'>) {
  const g = useGuardian();
  const { setConsole } = useConsole();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [challenge, setChallenge] = useState<Challenge>({ challengeId: route.params.challengeId, phoneMasked: route.params.phoneMasked, expiresInSeconds: 600, resendAfterSeconds: route.params.resendAfterSeconds });
  const [wait, setWait] = useState(route.params.resendAfterSeconds);
  useEffect(() => {
    if (wait <= 0) return;
    const id = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(id);
  }, [wait]);

  const verify = async (c: string) => {
    if (busy) return;
    setError(null);
    setBusy(true);
    try {
      const { purpose } = route.params;
      if (purpose === 'register') await g.registerVerify(challenge.challengeId, c);
      else if (purpose === 'login') await g.loginVerify(challenge.challengeId, c);
      else if (purpose === 'recovery') await g.recoveryVerify(challenge.challengeId, c, route.params.newPassword ?? '');
      else await g.stepUpVerify(challenge.challengeId, c);
      if (purpose === 'stepUp') {
        navigation.goBack();
        route.params.onDone?.();
      } else {
        setConsole('guardian');
        navigation.reset({ index: 0, routes: [{ name: 'GuardianConsole' }] });
      }
    } catch (e) {
      setError(friendlyError(e));
      setCode('');
    } finally {
      setBusy(false);
    }
  };

  const resend = async () => {
    setError(null);
    try {
      const c = await g.resendCode(challenge.challengeId);
      setChallenge(c);
      setWait(c.resendAfterSeconds);
    } catch (e) {
      setError(friendlyError(e));
    }
  };

  return (
    <AuthShell title={route.params.purpose === 'stepUp' ? t('gauth.stepUpTitle') : t('gauth.otpTitle')} subtitle={t('gauth.otpSent', { phone: challenge.phoneMasked })}>
      {route.params.purpose === 'stepUp' && (
        <AppText variant="bodySmall" tone="secondary" style={{ marginBottom: space.lg }}>
          {t('gauth.stepUpHint')}
        </AppText>
      )}
      <OtpInput value={code} onChange={setCode} onComplete={verify} />
      <AppText variant="caption" tone="muted" align="center" style={{ marginTop: space.md }}>
        {t('gauth.otpExpires', { minutes: Math.round(challenge.expiresInSeconds / 60) })}
      </AppText>
      {error ? (
        <AppText variant="bodySmall" tone="danger" align="center" style={styles.error} accessibilityRole="alert">
          {error}
        </AppText>
      ) : null}
      <Button label={t('gauth.verify')} onPress={() => verify(code)} loading={busy} disabled={code.length !== 6} fullWidth style={{ marginTop: space.xl }} />
      <Button label={wait > 0 ? t('gauth.resendIn', { seconds: wait }) : t('gauth.resend')} variant="tertiary" onPress={resend} disabled={wait > 0} fullWidth style={{ marginTop: space.sm }} />
    </AuthShell>
  );
}

export function GuardianRecoveryScreen({ navigation }: Props<'GuardianRecovery'>) {
  const g = useGuardian();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const problems = password ? passwordProblems(password) : [];

  const submit = async () => {
    setError(null);
    if (password !== confirm) return setError(t('gauth.passwordMismatch'));
    if (problems.length) return setError(PASSWORD_RULE_MESSAGE);
    setBusy(true);
    try {
      const r = await g.recoveryStart(phone.trim());
      setSent(true);
      if (r.challengeId) navigation.navigate('GuardianOtp', { purpose: 'recovery', challengeId: r.challengeId, phoneMasked: r.phone ?? '', resendAfterSeconds: 45, newPassword: password });
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell title={t('gauth.recoveryTitle')} subtitle={t('gauth.recoveryHint')}>
      <TextField label={t('gauth.phone')} value={phone} onChangeText={setPhone} keyboardType="phone-pad" icon="phone" placeholder="98765 43210" />
      <PasswordField label={t('gauth.newPassword')} value={password} onChangeText={setPassword} hint={PASSWORD_RULE_MESSAGE} textContentType="newPassword" />
      <PasswordField label={t('gauth.confirmPassword')} value={confirm} onChangeText={setConfirm} />
      {sent && (
        <AppText variant="bodySmall" tone="secondary" style={styles.error}>
          If that number has an account, a code is on its way.
        </AppText>
      )}
      {error ? (
        <AppText variant="bodySmall" tone="danger" style={styles.error} accessibilityRole="alert">
          {error}
        </AppText>
      ) : null}
      <Button label={t('gauth.register')} onPress={submit} loading={busy} disabled={!phone.trim() || !password || !confirm} fullWidth style={{ marginTop: space.xl }} />
    </AuthShell>
  );
}

const styles = StyleSheet.create({
  termsRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, marginTop: space.lg },
  links: { flexDirection: 'row', gap: space.lg, marginTop: space.sm, marginLeft: 60 },
  error: { marginTop: space.md },
});
