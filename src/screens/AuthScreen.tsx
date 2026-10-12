// Sign in: a one-time code sent to a mobile number, then (the first time) a
// password, a username and an avatar. "Sign in with password" is there for
// people who have set one; "Forgot password?" is just the code again, after
// which a new password can be set. The same screen edits the profile and
// changes the password from Settings.
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { KeyboardAvoidingView, Linking, StyleSheet, View } from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { Onboarding, useAuth } from '../context/AuthContext';
import { friendlyError } from '../services/apiClient';
import { track } from '../services/analytics';
import { env } from '../config/env';
import { useRemoteConfig } from '../context/RemoteConfigContext';
import { PASSWORD_MAX, PASSWORD_RULES, PasswordRule, passwordRuleMet, passwordValid, USERNAME_RE } from '../auth/passwordPolicy';
import { AVATARS } from '../profile/avatars';
import { RootStackParamList } from '../navigation/types';
import { Screen } from '../ui/Screen';
import { AppText } from '../ui/AppText';
import { Avatar } from '../ui/Avatar';
import { Button, IconButton } from '../ui/Button';
import { Card } from '../ui/Card';
import { Icon } from '../ui/Icon';
import { Tactile } from '../ui/Pressable';
import { SettingToggle } from '../ui/SettingRow';
import { TextField } from '../ui/TextField';
import { space } from '../theme/spacing';
import { radii } from '../theme/radii';
import { useTheme } from '../theme/ThemeContext';
import { StringKey, t, useLanguage } from '../i18n';

type Step = 'phone' | 'code' | 'password' | 'passwordSignIn' | 'emailResetCode' | 'username' | 'avatar' | 'profile' | 'changePassword';

const TITLES: Record<Step, [StringKey, StringKey]> = {
  phone: ['auth.phoneTitle', 'auth.phoneBody'],
  code: ['auth.codeTitle', 'auth.codeBody'],
  password: ['auth.passwordTitle', 'auth.passwordBody'],
  passwordSignIn: ['auth.signInTitle', 'auth.signInBody'],
  emailResetCode: ['auth.checkTitle', 'auth.checkBody'],
  username: ['auth.usernameTitle', 'auth.usernameBody'],
  avatar: ['auth.avatarTitle', 'auth.avatarBody'],
  profile: ['auth.profileTitle', 'auth.profileBody'],
  changePassword: ['auth.changeTitle', 'auth.changeBody'],
};

const RULE_KEY: Record<PasswordRule, StringKey> = {
  length: 'auth.rule.length',
  upper: 'auth.rule.upper',
  lower: 'auth.rule.lower',
  digit: 'auth.rule.digit',
  special: 'auth.rule.special',
};

export function AuthScreen() {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<RootStackParamList, 'Auth'>>();
  const { colors } = useTheme();
  useLanguage();
  const { user, requestOtp, verifyOtp, signInWithPassword, setPassword, checkUsername, updateProfile, requestEmailReset, confirmEmailReset } = useAuth();
  const { config } = useRemoteConfig();
  const phoneSignIn = config.features.phoneSignIn;

  const initial: Step = route.params?.mode === 'profile' ? 'profile' : route.params?.mode === 'password' ? 'changePassword' : phoneSignIn ? 'phone' : 'passwordSignIn';
  const [step, setStep] = useState<Step>(initial);
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [phoneMasked, setPhoneMasked] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword_] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [username, setUsername] = useState(user?.username ?? '');
  const [avatarId, setAvatarId] = useState<string | null>(user?.avatarId ?? null);
  const [displayName, setDisplayName] = useState(user?.displayName ?? '');
  const [allowPokes, setAllowPokes] = useState(user?.allowPokes ?? true);
  const [discoverable, setDiscoverable] = useState(user?.discoverableByPhone ?? true);
  const [forgot, setForgot] = useState(false);
  const [resendIn, setResendIn] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  // resend countdown
  useEffect(() => {
    if (resendIn <= 0) return;
    const id = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [resendIn]);

  // live username check, debounced
  const [avail, setAvail] = useState<{ username: string; available: boolean; reason: string | null } | null>(null);
  const [checking, setChecking] = useState(false);
  const checkSeq = useRef(0);
  useEffect(() => {
    if (step !== 'username' && step !== 'profile') return;
    const name = username.trim();
    setAvail(null);
    if (!name || name.toLowerCase() === (user?.username ?? '').toLowerCase()) return;
    if (!USERNAME_RE.test(name)) {
      setAvail({ username: name, available: false, reason: 'invalid' });
      return;
    }
    const seq = ++checkSeq.current;
    setChecking(true);
    const id = setTimeout(async () => {
      try {
        const res = await checkUsername(name);
        if (seq === checkSeq.current) setAvail({ username: name, ...res });
      } catch {
        if (seq === checkSeq.current) setAvail(null);
      } finally {
        if (seq === checkSeq.current) setChecking(false);
      }
    }, 400);
    return () => clearTimeout(id);
  }, [username, step, user?.username, checkUsername]);

  const phoneDigits = phone.replace(/[^\d+]/g, '');
  const phoneValid = phoneDigits.replace(/\D/g, '').length >= 8;
  const codeValid = /^\d{6}$/.test(code);
  const usernameUnchanged = username.trim().toLowerCase() === (user?.username ?? '').toLowerCase() && !!user?.username;
  const usernameOk = usernameUnchanged || (!!avail && avail.available && avail.username === username.trim());
  const canSubmit = useMemo(() => {
    if (busy) return false;
    switch (step) {
      case 'phone':
        return phoneValid;
      case 'code':
      case 'emailResetCode':
        return codeValid && (step === 'code' || passwordValid(password));
      case 'password':
        return passwordValid(password);
      case 'changePassword':
        return passwordValid(password) && (!user?.hasPassword || currentPassword.length > 0);
      case 'passwordSignIn':
        return identifier.trim().length >= 3 && password.length > 0;
      case 'username':
        return usernameOk && !checking;
      case 'profile':
        return (username.trim().length === 0 ? !!user?.username : usernameOk) && !checking;
      case 'avatar':
        return true;
    }
  }, [busy, step, phoneValid, codeValid, password, user, currentPassword, identifier, usernameOk, checking, username]);

  function go(next: Step) {
    setStep(next);
    setError(null);
    setInfo(null);
    if (next !== 'code') setCode('');
    if (next === 'password' || next === 'passwordSignIn' || next === 'changePassword') setPassword_('');
  }

  /** Where to go after a sign-in, given what the account still needs. */
  function continueAfterSignIn(onboarding: Onboarding, afterCode: boolean) {
    if (onboarding.needsPassword || (afterCode && forgot)) go('password');
    else if (onboarding.needsUsername) go('username');
    else finish();
  }

  function afterPassword() {
    if (!user?.username) go('username');
    else finish();
  }

  function finish() {
    track('sign_in');
    navigation.goBack();
  }

  async function sendCode() {
    const res = await requestOtp(phone.trim());
    setPhoneMasked(res.phoneMasked);
    setResendIn(res.resendAfterSeconds);
    go('code');
    setInfo(t('auth.codeSent', { phone: res.phoneMasked }));
  }

  async function submit() {
    if (!canSubmit) return;
    setBusy(true);
    setError(null);
    try {
      switch (step) {
        case 'phone':
          await sendCode();
          break;
        case 'code':
          continueAfterSignIn(await verifyOtp(phone.trim(), code), true);
          break;
        case 'passwordSignIn':
          continueAfterSignIn(await signInWithPassword(identifier.trim(), password), false);
          break;
        case 'emailResetCode':
          await confirmEmailReset(identifier.trim(), code, password);
          finish();
          break;
        case 'password':
          await setPassword(password);
          setForgot(false);
          afterPassword();
          break;
        case 'changePassword':
          await setPassword(password, user?.hasPassword ? currentPassword : undefined);
          navigation.goBack();
          break;
        case 'username':
          await updateProfile({ username: username.trim() });
          if (AVATARS.length > 0) go('avatar');
          else finish();
          break;
        case 'avatar':
          await updateProfile({ avatarId });
          finish();
          break;
        case 'profile':
          await updateProfile({
            ...(username.trim() && !usernameUnchanged ? { username: username.trim() } : {}),
            displayName: displayName.trim() || null,
            avatarId,
            allowPokes,
            discoverableByPhone: discoverable,
          });
          navigation.goBack();
          break;
      }
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setBusy(false);
    }
  }

  async function forgotPassword() {
    setError(null);
    if (identifier.includes('@')) {
      if (!config.features.passwordReset) return;
      setBusy(true);
      try {
        await requestEmailReset(identifier.trim());
        go('emailResetCode');
        setInfo(t('auth.emailCodeSent'));
      } catch (e) {
        setError(friendlyError(e));
      } finally {
        setBusy(false);
      }
      return;
    }
    setForgot(true);
    if (identifier.trim()) setPhone(identifier.trim());
    go('phone');
  }

  const [title, subtitle] = TITLES[step].map((k) => t(k));
  const submitLabel = t(
    (
      {
        phone: 'auth.sendCode',
        code: 'auth.verify',
        password: 'auth.savePassword',
        passwordSignIn: 'auth.signIn',
        emailResetCode: 'auth.resetPassword',
        username: 'auth.continue',
        avatar: 'auth.done',
        profile: 'auth.save',
        changePassword: 'auth.savePassword',
      } as const
    )[step]
  );
  const showRules = step === 'password' || step === 'changePassword' || step === 'emailResetCode';
  const usernameState = usernameUnchanged ? null : checking ? 'checking' : avail && avail.username === username.trim() ? (avail.available ? 'free' : avail.reason) : null;
  const usernameHint = !username.trim()
    ? t('auth.usernameHint')
    : usernameState === 'checking'
      ? t('auth.usernameChecking')
      : usernameState === 'free'
        ? t('auth.usernameFree')
        : usernameState === 'taken'
          ? t('auth.usernameTaken')
          : usernameState === 'reserved'
            ? t('auth.usernameReserved')
            : usernameState === 'invalid'
              ? t('auth.usernameInvalid')
              : t('auth.usernameHint');
  const usernameBad = usernameState === 'taken' || usernameState === 'reserved' || usernameState === 'invalid';

  return (
    <KeyboardAvoidingView style={styles.flex} behavior="padding">
      <Screen scroll>
        <View style={styles.headerRow}>
          {step === 'code' || step === 'emailResetCode' || (step === 'passwordSignIn' && phoneSignIn) ? (
            <IconButton icon="chevronLeft" label={t('auth.back')} variant="filled" size={40} onPress={() => go(step === 'passwordSignIn' ? 'phone' : step === 'emailResetCode' ? 'passwordSignIn' : 'phone')} />
          ) : (
            <View />
          )}
          <IconButton icon="close" label={t('close')} variant="filled" size={40} onPress={() => navigation.goBack()} />
        </View>

        <AppText variant="headingLarge" accessibilityRole="header">
          {title}
        </AppText>
        <AppText variant="body" tone="secondary" style={styles.subtitle}>
          {step === 'code' && phoneMasked ? t('auth.codeBodyTo', { phone: phoneMasked }) : subtitle}
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

        {step === 'phone' && (
          <TextField
            label={t('auth.phone')}
            icon="user"
            value={phone}
            onChangeText={(v) => setPhone(v.replace(/[^\d+\s]/g, '').slice(0, 18))}
            keyboardType="phone-pad"
            autoComplete="tel"
            textContentType="telephoneNumber"
            placeholder="98765 43210"
            returnKeyType="go"
            onSubmitEditing={submit}
            hint={t('auth.phoneHint')}
            accessibilityLabel={t('auth.phone')}
          />
        )}

        {(step === 'code' || step === 'emailResetCode') && (
          <TextField
            label={t('auth.code')}
            icon="sparkles"
            value={code}
            onChangeText={(v) => setCode(v.replace(/\D/g, '').slice(0, 6))}
            keyboardType="number-pad"
            autoComplete="one-time-code"
            textContentType="oneTimeCode"
            returnKeyType={step === 'code' ? 'go' : 'next'}
            onSubmitEditing={step === 'code' ? submit : undefined}
            accessibilityLabel={t('auth.code')}
          />
        )}

        {step === 'passwordSignIn' && (
          <TextField
            label={phoneSignIn ? t('auth.phoneOrEmail') : t('auth.email')}
            icon="user"
            value={identifier}
            onChangeText={setIdentifier}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType={phoneSignIn ? 'default' : 'email-address'}
            autoComplete="username"
            textContentType="username"
            returnKeyType="next"
            accessibilityLabel={t('auth.phoneOrEmail')}
          />
        )}

        {step === 'changePassword' && user?.hasPassword && (
          <TextField label={t('auth.currentPassword')} icon="lock" value={currentPassword} onChangeText={setCurrentPassword} secureTextEntry autoComplete="current-password" textContentType="password" accessibilityLabel={t('auth.currentPassword')} />
        )}

        {(step === 'passwordSignIn' || showRules) && (
          <TextField
            label={step === 'passwordSignIn' ? t('auth.password') : t('auth.newPassword')}
            icon="lock"
            value={password}
            onChangeText={(v) => setPassword_(v.slice(0, step === 'passwordSignIn' ? 128 : PASSWORD_MAX))}
            secureTextEntry
            autoComplete={step === 'passwordSignIn' ? 'current-password' : 'new-password'}
            textContentType={step === 'passwordSignIn' ? 'password' : 'newPassword'}
            returnKeyType="go"
            onSubmitEditing={submit}
            accessibilityLabel={step === 'passwordSignIn' ? t('auth.password') : t('auth.newPassword')}
          />
        )}

        {showRules && (
          <View style={styles.rules} accessibilityRole="list">
            {PASSWORD_RULES.map((rule) => {
              const met = passwordRuleMet(rule, password);
              return (
                <View key={rule} style={styles.rule}>
                  <Icon name={met ? 'check' : 'close'} size="xs" color={met ? 'success' : password ? 'danger' : 'secondary'} />
                  <AppText variant="caption" tone={met ? 'success' : 'secondary'}>
                    {t(RULE_KEY[rule])}
                  </AppText>
                </View>
              );
            })}
          </View>
        )}

        {(step === 'username' || step === 'profile') && (
          <View>
            <TextField
              label={t('auth.username')}
              icon="user"
              value={username}
              onChangeText={(v) => setUsername(v.replace(/\s/g, '').slice(0, 20))}
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="off"
              returnKeyType={step === 'username' ? 'go' : 'next'}
              onSubmitEditing={step === 'username' ? submit : undefined}
              hint={usernameBad || usernameState === 'free' ? undefined : usernameHint}
              error={usernameBad ? usernameHint : null}
              accessibilityLabel={t('auth.username')}
            />
            {usernameState === 'free' && (
              <View style={styles.availRow}>
                <Icon name="check" size="xs" color="success" />
                <AppText variant="caption" tone="success">{t('auth.usernameFree')}</AppText>
              </View>
            )}
          </View>
        )}

        {step === 'profile' && (
          <>
            <TextField label={t('auth.nameOptional')} icon="user" value={displayName} onChangeText={setDisplayName} autoComplete="name" textContentType="name" maxLength={60} accessibilityLabel={t('auth.name')} />
            <Card padding={0} paddingX="lg" style={styles.toggles}>
              <SettingToggle icon="heart" label={t('auth.allowPokes')} hint={t('auth.allowPokesHint')} value={allowPokes} onValueChange={setAllowPokes} />
              <SettingToggle icon="search" label={t('auth.discoverable')} hint={t('auth.discoverableHint')} value={discoverable} onValueChange={setDiscoverable} last />
            </Card>
          </>
        )}

        {(step === 'avatar' || (step === 'profile' && AVATARS.length > 0)) && (
          <View style={styles.avatars} accessibilityRole="radiogroup" accessibilityLabel={t('auth.avatarTitle')}>
            <Tactile onPress={() => setAvatarId(null)} accessibilityRole="radio" accessibilityState={{ selected: avatarId === null }} style={[styles.avatarCell, { borderColor: avatarId === null ? colors.primary : 'transparent' }]}>
              <Avatar name={username || user?.displayName} size={56} />
            </Tactile>
            {AVATARS.map((a) => (
              <Tactile key={a.id} onPress={() => setAvatarId(a.id)} accessibilityRole="radio" accessibilityState={{ selected: avatarId === a.id }} accessibilityLabel={a.id} style={[styles.avatarCell, { borderColor: avatarId === a.id ? colors.primary : 'transparent' }]}>
                <Avatar avatarId={a.id} size={56} />
              </Tactile>
            ))}
          </View>
        )}

        {step === 'passwordSignIn' && (config.features.passwordReset || phoneSignIn) && (
          <Button label={t('auth.forgot')} variant="tertiary" size="sm" onPress={() => void forgotPassword()} style={styles.inlineLink} />
        )}

        <Button label={submitLabel} size="lg" fullWidth loading={busy} disabled={!canSubmit} onPress={submit} style={styles.submit} />

        {step === 'phone' && <Button label={t('auth.usePassword')} variant="tertiary" onPress={() => go('passwordSignIn')} style={styles.switch} />}
        {step === 'passwordSignIn' && phoneSignIn && <Button label={t('auth.useCode')} variant="tertiary" onPress={() => go('phone')} style={styles.switch} />}
        {step === 'code' && (
          <Button
            label={resendIn > 0 ? t('auth.resendIn', { seconds: resendIn }) : t('auth.resend')}
            variant="tertiary"
            size="sm"
            disabled={resendIn > 0 || busy}
            onPress={() => {
              setBusy(true);
              sendCode()
                .catch((e) => setError(friendlyError(e)))
                .finally(() => setBusy(false));
            }}
            style={styles.switch}
          />
        )}
        {step === 'avatar' && <Button label={t('auth.skip')} variant="tertiary" onPress={finish} style={styles.switch} />}

        {step === 'phone' && env.privacyPolicyUrl && (
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
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: space.md },
  subtitle: { marginTop: space.xs, marginBottom: space.md },
  notice: { marginTop: space.md },
  rules: { marginTop: space.sm, gap: 4 },
  rule: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  availRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
  toggles: { marginTop: space.md },
  avatars: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginTop: space.md },
  avatarCell: { padding: 3, borderRadius: radii.pill, borderWidth: 2 },
  inlineLink: { marginTop: space.xs, marginLeft: -space.md },
  submit: { marginTop: space.xxl },
  switch: { alignSelf: 'center', marginTop: space.sm },
  legal: { marginTop: space.md },
  link: { textDecorationLine: 'underline' },
});
