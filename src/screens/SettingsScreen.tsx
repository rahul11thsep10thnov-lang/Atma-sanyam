import React, { useState } from 'react';
import { ActivityIndicator, Alert, Linking, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius, spacing, typography, buttonHeight } from '../theme/colors';
import { useSettings } from '../context/SettingsContext';
import { useAuth } from '../context/AuthContext';
import { useRemoteConfig } from '../context/RemoteConfigContext';
import { clearHistory } from '../storage/history';
import { requestNotificationPermissionsAsync } from '../notifications/safeNotifications';
import { setPushEnabled } from '../services/device';
import { friendlyError } from '../services/apiClient';
import { appVersion } from '../services/appInfo';
import { env, isBackendConfigured } from '../config/env';
import { RootStackParamList } from '../navigation/types';
import { useTabBarInset } from '../ui/TabBar';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle} accessibilityRole="header">{title}</Text>
      {children}
    </View>
  );
}

function ToggleRow({ label, hint, value, onValueChange, busy }: { label: string; hint: string; value: boolean; onValueChange: (v: boolean) => void; busy?: boolean }) {
  return (
    <View style={styles.row}>
      <View style={styles.rowText}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={styles.rowHint}>{hint}</Text>
      </View>
      {busy ? (
        <ActivityIndicator color={colors.primary} />
      ) : (
        <Switch
          value={value}
          onValueChange={onValueChange}
          trackColor={{ true: colors.primary, false: colors.border }}
          thumbColor={colors.white}
          accessibilityLabel={label}
        />
      )}
    </View>
  );
}

function LinkRow({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable style={styles.linkRow} onPress={onPress} accessibilityRole="link">
      <Text style={styles.linkText}>{label}</Text>
      <Text style={styles.chevron}>›</Text>
    </Pressable>
  );
}

export function SettingsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const tabInset = useTabBarInset();
  const { settings, updateSettings } = useSettings();
  const { status, user, signOut, deleteAccount } = useAuth();
  const { config } = useRemoteConfig();
  const [pushBusy, setPushBusy] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteBusy, setDeleteBusy] = useState(false);

  const showAccounts = isBackendConfigured && config.features.accounts;
  const showPush = isBackendConfigured && config.features.pushNotifications;

  const toggleNotifications = async (value: boolean) => {
    if (value) {
      const perm = await requestNotificationPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Permission denied', 'Enable notifications for FOCUS in your device settings to get away-from-app warnings.');
        return;
      }
    }
    updateSettings({ notificationsEnabled: value });
  };

  const togglePush = async (value: boolean) => {
    setPushBusy(true);
    const result = await setPushEnabled(value);
    setPushBusy(false);
    if (result.ok) {
      updateSettings({ pushEnabled: value });
    } else {
      Alert.alert('Announcements', result.reason);
    }
  };

  const handleClearHistory = () => {
    Alert.alert('Clear history?', 'This removes all saved sessions from your garden.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear',
        style: 'destructive',
        onPress: async () => {
          await clearHistory();
          Alert.alert('History cleared');
        },
      },
    ]);
  };

  const confirmDelete = () => {
    Alert.alert(
      'Delete your account?',
      'This permanently deletes your FOCUS account. Your focus history on this device is kept. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeleteBusy(true);
            try {
              await deleteAccount(deletePassword);
              setDeleting(false);
              setDeletePassword('');
              Alert.alert('Account deleted', 'Your account and its data have been removed.');
            } catch (e) {
              Alert.alert('Could not delete account', friendlyError(e));
            } finally {
              setDeleteBusy(false);
            }
          },
        },
      ]
    );
  };

  const openUrl = (url: string) => void Linking.openURL(url);

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: 40 + tabInset, paddingHorizontal: spacing.screenPadding }}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.title} accessibilityRole="header">Settings</Text>

      {showAccounts && (
        <Section title="Account">
          {status === 'signedIn' && user ? (
            <View style={styles.card}>
              <Text style={styles.rowLabel}>{user.displayName || 'Signed in'}</Text>
              <Text style={styles.rowHint}>{user.email}</Text>
              <View style={styles.accountActions}>
                <Pressable style={styles.secondaryBtn} onPress={() => void signOut()} accessibilityRole="button">
                  <Text style={styles.secondaryBtnText}>Sign out</Text>
                </Pressable>
                {!deleting && (
                  <Pressable style={styles.textBtn} onPress={() => setDeleting(true)} accessibilityRole="button">
                    <Text style={styles.dangerText}>Delete account</Text>
                  </Pressable>
                )}
              </View>
              {deleting && (
                <View style={styles.deleteBox}>
                  <Text style={styles.rowHint}>Enter your password to permanently delete your account.</Text>
                  <TextInput
                    style={styles.input}
                    secureTextEntry
                    value={deletePassword}
                    onChangeText={setDeletePassword}
                    placeholder="Password"
                    placeholderTextColor={colors.textSecondary}
                    autoComplete="current-password"
                    accessibilityLabel="Password to confirm deletion"
                  />
                  <View style={styles.accountActions}>
                    <Pressable style={styles.textBtn} onPress={() => { setDeleting(false); setDeletePassword(''); }} accessibilityRole="button">
                      <Text style={styles.linkText}>Cancel</Text>
                    </Pressable>
                    <Pressable
                      style={[styles.dangerBtn, (!deletePassword || deleteBusy) && { opacity: 0.5 }]}
                      disabled={!deletePassword || deleteBusy}
                      onPress={confirmDelete}
                      accessibilityRole="button"
                    >
                      {deleteBusy ? <ActivityIndicator color={colors.danger} /> : <Text style={styles.dangerText}>Delete permanently</Text>}
                    </Pressable>
                  </View>
                </View>
              )}
            </View>
          ) : status === 'loading' ? (
            <ActivityIndicator color={colors.primary} />
          ) : (
            <Pressable style={styles.card} onPress={() => navigation.navigate('Auth')} accessibilityRole="button">
              <Text style={styles.rowLabel}>Sign in or create an account</Text>
              <Text style={styles.rowHint}>Optional. Get announcements and manage your data.</Text>
            </Pressable>
          )}
        </Section>
      )}

      <Section title="Focus sessions">
        <ToggleRow
          label="Away-from-app warnings"
          hint="Send a notification if you leave mid-session"
          value={settings.notificationsEnabled}
          onValueChange={toggleNotifications}
        />
        <ToggleRow
          label="Sound & haptics"
          hint="Play a cue when a session completes or fails"
          value={settings.soundEnabled}
          onValueChange={(v) => updateSettings({ soundEnabled: v })}
        />
      </Section>

      {showPush && (
        <Section title="Notifications">
          <ToggleRow
            label="News & announcements"
            hint="Occasional updates like new puzzle collections"
            value={settings.pushEnabled}
            onValueChange={togglePush}
            busy={pushBusy}
          />
        </Section>
      )}

      {isBackendConfigured && (
        <Section title="Privacy">
          <ToggleRow
            label="Share usage analytics"
            hint="Anonymous stats like screens opened and sessions completed. Never your photos."
            value={settings.analyticsEnabled}
            onValueChange={(v) => updateSettings({ analyticsEnabled: v })}
          />
        </Section>
      )}

      <Section title="About">
        <View style={styles.card}>
          {env.privacyPolicyUrl && <LinkRow label="Privacy policy" onPress={() => openUrl(env.privacyPolicyUrl!)} />}
          {env.termsUrl && <LinkRow label="Terms of use" onPress={() => openUrl(env.termsUrl!)} />}
          {env.supportEmail && <LinkRow label="Contact support" onPress={() => openUrl(`mailto:${env.supportEmail}`)} />}
          <Text style={[styles.rowHint, { marginTop: 8 }]}>FOCUS {appVersion}</Text>
        </View>
      </Section>

      <Pressable style={styles.clearBtn} onPress={handleClearHistory} accessibilityRole="button">
        <Text style={styles.dangerBtnText}>Clear history</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  title: { ...typography.heading, color: colors.text, marginBottom: 8 },
  section: { marginTop: 16 },
  sectionTitle: { ...typography.caption, fontWeight: '700', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8 },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.card,
    padding: spacing.cardPadding,
    borderWidth: 1,
    borderColor: colors.border,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.card,
    borderRadius: radius.card,
    padding: spacing.cardPadding,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  rowText: { flex: 1, paddingRight: 12 },
  rowLabel: { ...typography.title, color: colors.text },
  rowHint: { ...typography.caption, color: colors.textSecondary, marginTop: 4 },
  accountActions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 14 },
  secondaryBtn: { height: 40, paddingHorizontal: 18, borderRadius: radius.card, borderWidth: 1, borderColor: colors.border, justifyContent: 'center' },
  secondaryBtnText: { ...typography.body, fontWeight: '700', color: colors.text },
  textBtn: { paddingVertical: 8 },
  dangerText: { ...typography.body, fontWeight: '700', color: colors.danger },
  deleteBox: { marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: colors.border },
  input: {
    height: 44,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    marginTop: 10,
    fontSize: 16,
    color: colors.text,
    backgroundColor: colors.background,
  },
  dangerBtn: { height: 40, paddingHorizontal: 14, borderRadius: radius.card, borderWidth: 1, borderColor: colors.danger, justifyContent: 'center' },
  linkRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10 },
  linkText: { ...typography.body, color: colors.primary, fontWeight: '600' },
  chevron: { fontSize: 20, color: colors.textSecondary },
  clearBtn: {
    marginTop: 28,
    height: buttonHeight,
    borderRadius: radius.card,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.danger,
  },
  dangerBtnText: { ...typography.title, color: colors.danger },
});
