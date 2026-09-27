import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius, spacing, typography, buttonHeight } from '../theme/colors';
import { useAuth } from '../context/AuthContext';
import { friendlyError } from '../services/apiClient';
import { track } from '../services/analytics';
import { env } from '../config/env';

type Mode = 'signIn' | 'signUp';

export function AuthScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<Mode>('signIn');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const passwordValid = mode === 'signIn' ? password.length > 0 : password.length >= 8;
  const canSubmit = emailValid && passwordValid && !busy;

  async function submit() {
    if (!canSubmit) return;
    setBusy(true);
    setError(null);
    try {
      if (mode === 'signIn') await signIn(email.trim(), password);
      else await signUp(email.trim(), password, displayName.trim() || undefined);
      track(mode === 'signIn' ? 'sign_in' : 'sign_up');
      navigation.goBack();
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior="padding">
      <ScrollView
        style={styles.flex}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 24 }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.headerRow}>
          <Pressable onPress={() => navigation.goBack()} hitSlop={12} accessibilityRole="button" accessibilityLabel="Close">
            <Text style={styles.close}>✕</Text>
          </Pressable>
        </View>

        <Text style={styles.title} accessibilityRole="header">
          {mode === 'signIn' ? 'Welcome back' : 'Create your account'}
        </Text>
        <Text style={styles.subtitle}>
          {mode === 'signIn'
            ? 'Sign in to keep your preferences and get announcements.'
            : 'Optional — FOCUS works without an account.'}
        </Text>

        {error && (
          <View style={styles.errorBox} accessibilityRole="alert">
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {mode === 'signUp' && (
          <>
            <Text style={styles.label}>Name (optional)</Text>
            <TextInput
              style={styles.input}
              value={displayName}
              onChangeText={setDisplayName}
              autoComplete="name"
              textContentType="name"
              maxLength={60}
              returnKeyType="next"
              accessibilityLabel="Name"
            />
          </>
        )}

        <Text style={styles.label}>Email</Text>
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          autoComplete="email"
          textContentType={mode === 'signIn' ? 'username' : 'emailAddress'}
          returnKeyType="next"
          accessibilityLabel="Email"
        />

        <Text style={styles.label}>Password</Text>
        <TextInput
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete={mode === 'signIn' ? 'current-password' : 'new-password'}
          textContentType={mode === 'signIn' ? 'password' : 'newPassword'}
          returnKeyType="go"
          onSubmitEditing={submit}
          accessibilityLabel="Password"
        />
        {mode === 'signUp' && <Text style={styles.hint}>At least 8 characters.</Text>}

        <Pressable
          style={[styles.primaryBtn, !canSubmit && styles.btnDisabled]}
          onPress={submit}
          disabled={!canSubmit}
          accessibilityRole="button"
          accessibilityState={{ disabled: !canSubmit, busy }}
        >
          {busy ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <Text style={styles.primaryBtnText}>{mode === 'signIn' ? 'Sign in' : 'Create account'}</Text>
          )}
        </Pressable>

        <Pressable
          style={styles.switchBtn}
          onPress={() => {
            setMode(mode === 'signIn' ? 'signUp' : 'signIn');
            setError(null);
          }}
          accessibilityRole="button"
        >
          <Text style={styles.switchText}>
            {mode === 'signIn' ? 'New here? Create an account' : 'Already have an account? Sign in'}
          </Text>
        </Pressable>

        {mode === 'signUp' && env.privacyPolicyUrl && (
          <Text style={styles.legal}>
            By creating an account you agree to our{' '}
            <Text style={styles.link} onPress={() => void Linking.openURL(env.privacyPolicyUrl!)} accessibilityRole="link">
              Privacy Policy
            </Text>
            {env.termsUrl && (
              <>
                {' '}and{' '}
                <Text style={styles.link} onPress={() => void Linking.openURL(env.termsUrl!)} accessibilityRole="link">
                  Terms
                </Text>
              </>
            )}
            .
          </Text>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: spacing.screenPadding + 8 },
  headerRow: { flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 12 },
  close: { fontSize: 20, color: colors.text, padding: 4 },
  title: { ...typography.heading, color: colors.text },
  subtitle: { ...typography.body, color: colors.textSecondary, marginTop: 6, marginBottom: 24 },
  label: { ...typography.body, fontWeight: '600', color: colors.text, marginBottom: 6, marginTop: 12 },
  input: {
    height: buttonHeight,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    paddingHorizontal: 14,
    fontSize: 16,
    color: colors.text,
  },
  hint: { ...typography.caption, color: colors.textSecondary, marginTop: 6 },
  primaryBtn: {
    marginTop: 28,
    height: buttonHeight,
    borderRadius: radius.card,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnDisabled: { opacity: 0.5 },
  primaryBtnText: { ...typography.title, color: colors.white },
  switchBtn: { alignItems: 'center', paddingVertical: 16 },
  switchText: { ...typography.body, color: colors.primary, fontWeight: '600' },
  errorBox: { backgroundColor: '#FBE7E7', borderRadius: radius.card, padding: 12, marginBottom: 8 },
  errorText: { ...typography.body, color: colors.danger },
  legal: { ...typography.caption, color: colors.textSecondary, textAlign: 'center', marginTop: 4 },
  link: { color: colors.primary, textDecorationLine: 'underline' },
});
