import React, { useState } from 'react';
import { KeyboardAvoidingView, Linking, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { friendlyError } from '../services/apiClient';
import { track } from '../services/analytics';
import { env } from '../config/env';
import { useRemoteConfig } from '../context/RemoteConfigContext';
import { Screen } from '../ui/Screen';
import { AppText } from '../ui/AppText';
import { Button, IconButton } from '../ui/Button';
import { Card } from '../ui/Card';
import { TextField } from '../ui/TextField';
import { space } from '../theme/spacing';
import { useTheme } from '../theme/ThemeContext';
import { StringKey, t } from '../i18n';

type Mode = 'signIn' | 'signUp' | 'resetRequest' | 'resetConfirm';

const TITLES: Record<Mode, [StringKey, StringKey]> = {
  signIn: ['auth.signInTitle', 'auth.signInBody'],
  signUp: ['auth.signUpTitle', 'auth.signUpBody'],
  resetRequest: ['auth.resetTitle', 'auth.resetBody'],
  resetConfirm: ['auth.checkTitle', 'auth.checkBody'],
};

export function AuthScreen() {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const { signIn, signUp, requestPasswordReset, confirmPasswordReset } = useAuth();
  const { config } = useRemoteConfig();
  const [code, setCode] = useState('');
  const [info, setInfo] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>('signIn');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const passwordValid = mode === 'signIn' ? password.length > 0 : mode === 'resetRequest' || password.length >= 8;
  const codeValid = mode !== 'resetConfirm' || /^\d{6}$/.test(code);
  const canSubmit = emailValid && passwordValid && codeValid && !busy;
  const showPassword = mode !== 'resetRequest';

  function switchMode(next: Mode) {
    setMode(next);
    setError(null);
    setInfo(null);
    setPassword('');
    setCode('');
  }

  async function submit() {
    if (!canSubmit) return;
    setBusy(true);
    setError(null);
    try {
      if (mode === 'resetRequest') {
        await requestPasswordReset(email.trim());
        switchMode('resetConfirm');
        setInfo(t('auth.codeSent'));
        return;
      }
      if (mode === 'resetConfirm') await confirmPasswordReset(email.trim(), code, password);
      else if (mode === 'signIn') await signIn(email.trim(), password);
      else await signUp(email.trim(), password, displayName.trim() || undefined);
      track(mode === 'signUp' ? 'sign_up' : mode === 'signIn' ? 'sign_in' : 'password_reset');
      navigation.goBack();
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setBusy(false);
    }
  }

  const [title, subtitle] = TITLES[mode].map((k) => t(k));
  const submitLabel = t(({ signIn: 'auth.signIn', signUp: 'auth.createAccount', resetRequest: 'auth.sendCode', resetConfirm: 'auth.resetPassword' } as const)[mode]);

  return (
    <KeyboardAvoidingView style={styles.flex} behavior="padding">
      <Screen scroll>
        <View style={styles.headerRow}>
          <IconButton icon="close" label={t('close')} variant="filled" size={40} onPress={() => navigation.goBack()} />
        </View>

        <AppText variant="headingLarge" accessibilityRole="header">
          {title}
        </AppText>
        <AppText variant="body" tone="secondary" style={styles.subtitle}>
          {subtitle}
        </AppText>

        {info && (
          <Card variant="tinted" padding="md" style={[styles.notice, { backgroundColor: colors.successSoft }]} accessibilityRole="alert">
            <AppText variant="bodySmall" tone="success">{info}</AppText>
          </Card>
        )}
        {error && (
          <Card variant="tinted" padding="md" style={[styles.notice, { backgroundColor: colors.dangerSoft }]} accessibilityRole="alert">
            <AppText variant="bodySmall" tone="danger">{error}</AppText>
          </Card>
        )}

        {mode === 'signUp' && (
          <TextField label={t('auth.nameOptional')} icon="user" value={displayName} onChangeText={setDisplayName} autoComplete="name" textContentType="name" maxLength={60} returnKeyType="next" accessibilityLabel={t('auth.name')} />
        )}

        <TextField
          label={t('auth.email')}
          icon="mail"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          autoComplete="email"
          textContentType={mode === 'signIn' ? 'username' : 'emailAddress'}
          returnKeyType={mode === 'resetRequest' ? 'go' : 'next'}
          onSubmitEditing={mode === 'resetRequest' ? submit : undefined}
          editable={mode !== 'resetConfirm'}
          accessibilityLabel={t('auth.email')}
        />

        {mode === 'resetConfirm' && (
          <TextField label={t('auth.code')} icon="sparkles" value={code} onChangeText={(t) => setCode(t.replace(/\D/g, '').slice(0, 6))} keyboardType="number-pad" autoComplete="one-time-code" textContentType="oneTimeCode" accessibilityLabel={t('auth.code')} />
        )}

        {showPassword && (
          <TextField
            label={mode === 'resetConfirm' ? t('auth.newPassword') : t('auth.password')}
            icon="lock"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete={mode === 'signIn' ? 'current-password' : 'new-password'}
            textContentType={mode === 'signIn' ? 'password' : 'newPassword'}
            returnKeyType="go"
            onSubmitEditing={submit}
            accessibilityLabel={mode === 'resetConfirm' ? t('auth.newPassword') : t('auth.password')}
            hint={mode === 'signUp' || mode === 'resetConfirm' ? t('auth.min8') : undefined}
          />
        )}
        {mode === 'signIn' && config.features.passwordReset && (
          <Button label={t('auth.forgot')} variant="tertiary" size="sm" onPress={() => switchMode('resetRequest')} style={styles.inlineLink} />
        )}

        <Button label={submitLabel} size="lg" fullWidth loading={busy} disabled={!canSubmit} onPress={submit} style={styles.submit} />

        <Button
          label={mode === 'signIn' ? t('auth.toSignUp') : mode === 'signUp' ? t('auth.toSignIn') : t('auth.back')}
          variant="tertiary"
          onPress={() => switchMode(mode === 'signIn' ? 'signUp' : 'signIn')}
          style={styles.switch}
        />
        {mode === 'resetConfirm' && (
          <Button label={t('auth.resend')} variant="tertiary" size="sm" onPress={() => switchMode('resetRequest')} style={styles.switch} />
        )}

        {mode === 'signUp' && env.privacyPolicyUrl && (
          <AppText variant="caption" tone="muted" align="center" style={styles.legal}>
            {t('auth.agree')}{' '}
            <AppText variant="caption" tone="primary" onPress={() => void Linking.openURL(env.privacyPolicyUrl!)} accessibilityRole="link" style={styles.link}>
              {t('auth.privacy')}
            </AppText>
            {env.termsUrl && (
              <>
                {' '}{t('auth.and')}{' '}
                <AppText variant="caption" tone="primary" onPress={() => void Linking.openURL(env.termsUrl!)} accessibilityRole="link" style={styles.link}>
                  {t('auth.terms')}
                </AppText>
              </>
            )}
            .
          </AppText>
        )}
      </Screen>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  headerRow: { flexDirection: 'row', justifyContent: 'flex-end', marginBottom: space.md },
  subtitle: { marginTop: space.xs, marginBottom: space.md },
  notice: { marginTop: space.md },
  inlineLink: { marginTop: space.xs, marginLeft: -space.md },
  submit: { marginTop: space.xxl },
  switch: { alignSelf: 'center', marginTop: space.sm },
  legal: { marginTop: space.md },
  link: { textDecorationLine: 'underline' },
});
