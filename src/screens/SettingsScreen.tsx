// Settings (PHASE 13): grouped cards with iconed rows, an appearance
// control, and calm destructive actions. Everything reads the theme.
import React, { useState } from 'react';
import { ActivityIndicator, Alert, Linking, StyleSheet, TextInput, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
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
import { Screen } from '../ui/Screen';
import { AppText } from '../ui/AppText';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { SegmentedControl } from '../ui/SegmentedControl';
import { SettingBlock, SettingLink, SettingToggle } from '../ui/SettingRow';
import { useTabBarInset } from '../ui/TabBar';
import { space } from '../theme/spacing';
import { radii } from '../theme/radii';
import { typography } from '../theme/typography';
import { Appearance, useTheme } from '../theme/ThemeContext';
import { MembershipCard } from '../components/settings/MembershipCard';
import { LANGUAGES, t, useLanguage } from '../i18n';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <AppText variant="overline" tone="muted" style={styles.sectionTitle} accessibilityRole="header">
        {title.toUpperCase()}
      </AppText>
      <Card padding={0} paddingX="lg">
        {children}
      </Card>
    </View>
  );
}

export function SettingsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { colors } = useTheme();
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
        Alert.alert(t('settings.permissionNeeded'), t('settings.permissionBody'));
        return;
      }
    }
    updateSettings({ notificationsEnabled: value });
  };

  const togglePush = async (value: boolean) => {
    setPushBusy(true);
    const result = await setPushEnabled(value);
    setPushBusy(false);
    if (result.ok) updateSettings({ pushEnabled: value });
    else Alert.alert('Announcements', result.reason);
  };

  const handleClearHistory = () => {
    Alert.alert(t('settings.clearHistoryTitle'), t('settings.clearHistoryBody'), [
      { text: t('cancel'), style: 'cancel' },
      { text: t('settings.clear'), style: 'destructive', onPress: async () => { await clearHistory(); Alert.alert(t('settings.historyCleared')); } },
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
  const appearance: Appearance = settings.appearance ?? 'system';
  const language = useLanguage();
  const languageName = LANGUAGES.find((l) => l.id === language)?.native ?? 'English';

  return (
    <Screen scroll bottomInset={tabInset}>
      <AppText variant="headingLarge" accessibilityRole="header">
        {t('settings.title')}
      </AppText>

      <Section title={t('membership.section')}>
        <MembershipCard />
      </Section>

      <Section title={t('settings.language')}>
        <SettingLink icon="quote" label={t('settings.language')} hint={languageName} onPress={() => navigation.navigate('Language')} last />
      </Section>

      {showAccounts && (
        <Section title={t('settings.account')}>
          {status === 'signedIn' && user ? (
            <View style={styles.accountBox}>
              <View style={styles.rowBetween}>
                <View style={{ flex: 1 }}>
                  <AppText variant="bodyStrong">{user.displayName || 'Signed in'}</AppText>
                  <AppText variant="bodySmall" tone="secondary">{user.email}</AppText>
                </View>
                <Button label={t('settings.signOut')} variant="secondary" size="sm" icon="logOut" onPress={() => void signOut()} />
              </View>
              {!deleting ? (
                <Button label={t('settings.deleteAccount')} variant="tertiary" size="sm" onPress={() => setDeleting(true)} style={styles.deleteLink} />
              ) : (
                <View style={[styles.deleteBox, { borderTopColor: colors.divider }]}>
                  <AppText variant="bodySmall" tone="secondary">{t('settings.deleteHint')}</AppText>
                  <TextInput
                    style={[styles.input, typography.body, { borderColor: colors.border, backgroundColor: colors.background, color: colors.text }]}
                    secureTextEntry
                    value={deletePassword}
                    onChangeText={setDeletePassword}
                    placeholder="Password"
                    placeholderTextColor={colors.textMuted}
                    autoComplete="current-password"
                    accessibilityLabel="Password to confirm deletion"
                  />
                  <View style={styles.rowBetween}>
                    <Button label={t('cancel')} variant="tertiary" size="sm" onPress={() => { setDeleting(false); setDeletePassword(''); }} />
                    <Button label={t('settings.deleteForever')} variant="destructive" size="sm" loading={deleteBusy} disabled={!deletePassword} onPress={confirmDelete} />
                  </View>
                </View>
              )}
            </View>
          ) : status === 'loading' ? (
            <ActivityIndicator color={colors.primary} style={{ padding: space.lg }} />
          ) : (
            <SettingLink icon="user" label={t('settings.signIn')} hint={t('settings.signInHint')} onPress={() => navigation.navigate('Auth')} last />
          )}
        </Section>
      )}

      <Section title={t('settings.focusSessions')}>
        <SettingToggle icon="bell" label={t('settings.reminders')} hint={t('settings.remindersHint')} value={settings.notificationsEnabled} onValueChange={toggleNotifications} />
        <SettingToggle icon="music" label={t('settings.sound')} hint={t('settings.soundHint')} value={settings.soundEnabled} onValueChange={(v) => updateSettings({ soundEnabled: v })} last />
      </Section>

      <Section title={t('settings.appearance')}>
        <SettingBlock icon={appearance === 'dark' ? 'moon' : 'sun'} label={t('settings.theme')} hint={t('settings.themeHint')} last>
          <SegmentedControl<Appearance>
            value={appearance}
            onChange={(v) => updateSettings({ appearance: v })}
            accessibilityLabel="Theme"
            segments={[
              { value: 'system', label: t('settings.themeAuto') },
              { value: 'light', label: t('settings.themeMorning') },
              { value: 'dark', label: t('settings.themeNight') },
            ]}
          />
        </SettingBlock>
      </Section>

      {showPush && (
        <Section title={t('settings.notifications')}>
          <SettingToggle icon="sparkles" label={t('settings.news')} hint={t('settings.newsHint')} value={settings.pushEnabled} onValueChange={togglePush} busy={pushBusy} last />
        </Section>
      )}

      {isBackendConfigured && (
        <Section title={t('settings.privacy')}>
          <SettingToggle icon="shield" label={t('settings.analytics')} hint={t('settings.analyticsHint')} value={settings.analyticsEnabled} onValueChange={(v) => updateSettings({ analyticsEnabled: v })} last />
        </Section>
      )}

      <Section title={t('settings.about')}>
        {env.privacyPolicyUrl ? <SettingLink icon="lock" label={t('settings.privacyPolicy')} onPress={() => openUrl(env.privacyPolicyUrl!)} /> : null}
        {env.termsUrl ? <SettingLink icon="info" label={t('settings.terms')} onPress={() => openUrl(env.termsUrl!)} /> : null}
        {env.supportEmail ? <SettingLink icon="mail" label={t('settings.support')} onPress={() => openUrl(`mailto:${env.supportEmail}`)} /> : null}
        <View style={styles.version}>
          <AppText variant="bodySmall" tone="muted">FOCUS {appVersion}</AppText>
        </View>
      </Section>

      <Section title={t('settings.yourData')}>
        <SettingLink icon="trash" label={t('settings.clearHistory')} hint={t('settings.clearHistoryHint')} tone="danger" onPress={handleClearHistory} last />
      </Section>
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: { marginTop: space.xxl },
  sectionTitle: { marginBottom: space.sm, marginLeft: space.xs },
  accountBox: { paddingVertical: space.lg },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.md },
  deleteLink: { marginTop: space.sm, marginLeft: -space.md },
  deleteBox: { marginTop: space.lg, paddingTop: space.lg, borderTopWidth: StyleSheet.hairlineWidth, gap: space.md },
  input: { height: 48, borderRadius: radii.sm, borderWidth: 1, paddingHorizontal: space.md },
  version: { paddingVertical: space.md },
});
