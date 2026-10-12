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
import { Avatar } from '../ui/Avatar';
import { SegmentedControl } from '../ui/SegmentedControl';
import { SettingBlock, SettingLink, SettingToggle } from '../ui/SettingRow';
import { useTabBarInset } from '../ui/TabBar';
import { space } from '../theme/spacing';
import { radii } from '../theme/radii';
import { typography } from '../theme/typography';
import { Appearance, useTheme } from '../theme/ThemeContext';
import { MembershipCard } from '../components/settings/MembershipCard';
import { LANGUAGES, StringKey, t, useLanguage } from '../i18n';
import { LEGAL_ORDER, LegalDocId } from '../legal/documents';
import { IconName } from '../ui/Icon';

const LEGAL_ICON: Record<LegalDocId, IconName> = { terms: 'fileText', privacy: 'lock', deletion: 'trash', subscription: 'star', community: 'users' };

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
  const { status, user, onboarding, signOut, deleteAccount } = useAuth();
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
    else Alert.alert(t('settings.announcements'), result.reason);
  };

  const handleClearHistory = () => {
    Alert.alert(t('settings.clearHistoryTitle'), t('settings.clearHistoryBody'), [
      { text: t('cancel'), style: 'cancel' },
      { text: t('settings.clear'), style: 'destructive', onPress: async () => { await clearHistory(); Alert.alert(t('settings.historyCleared')); } },
    ]);
  };

  const confirmDelete = () => {
    Alert.alert(
      t('settings.deleteTitle'),
      t('settings.deleteBody'),
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('settings.delete'),
          style: 'destructive',
          onPress: async () => {
            setDeleteBusy(true);
            try {
              await deleteAccount(user?.hasPassword ? deletePassword : undefined);
              setDeleting(false);
              setDeletePassword('');
              Alert.alert(t('settings.deleted'), t('settings.deletedBody'));
            } catch (e) {
              Alert.alert(t('settings.deleteFailed'), friendlyError(e));
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
                <Avatar avatarId={user.avatarId} name={user.username ?? user.displayName ?? user.phoneMasked} size={44} />
                <View style={{ flex: 1 }}>
                  <AppText variant="bodyStrong">{user.username ? `@${user.username}` : user.displayName || t('settings.signedIn')}</AppText>
                  <AppText variant="bodySmall" tone="secondary">{[user.displayName, user.phone ?? user.email].filter(Boolean).join(' · ')}</AppText>
                </View>
                <Button label={t('settings.signOut')} variant="secondary" size="sm" icon="logOut" onPress={() => void signOut()} />
              </View>
              {onboarding && (onboarding.needsPassword || onboarding.needsUsername) && (
                <Button label={t('settings.finishSetup')} icon="user" size="sm" onPress={() => navigation.navigate('Auth')} style={styles.accountAction} />
              )}
              <View style={styles.accountLinks}>
                <SettingLink icon="user" label={t('settings.editProfile')} hint={t('settings.editProfileHint')} onPress={() => navigation.navigate('Auth', { mode: 'profile' })} />
                <SettingLink icon="lock" label={user.hasPassword ? t('settings.changePassword') : t('settings.setPassword')} onPress={() => navigation.navigate('Auth', { mode: 'password' })} last />
              </View>
              {!deleting ? (
                <Button label={t('settings.deleteAccount')} variant="tertiary" size="sm" onPress={() => setDeleting(true)} style={styles.deleteLink} />
              ) : (
                <View style={[styles.deleteBox, { borderTopColor: colors.divider }]}>
                  <AppText variant="bodySmall" tone="secondary">{user.hasPassword ? t('settings.deleteHint') : t('settings.deleteHintNoPassword')}</AppText>
                  {user.hasPassword && (
                    <TextInput
                      style={[styles.input, typography.body, { borderColor: colors.border, backgroundColor: colors.background, color: colors.text }]}
                      secureTextEntry
                      value={deletePassword}
                      onChangeText={setDeletePassword}
                      placeholder={t('auth.password')}
                      placeholderTextColor={colors.textMuted}
                      autoComplete="current-password"
                      accessibilityLabel={t('settings.passwordA11y')}
                    />
                  )}
                  <View style={styles.rowBetween}>
                    <Button label={t('cancel')} variant="tertiary" size="sm" onPress={() => { setDeleting(false); setDeletePassword(''); }} />
                    <Button label={t('settings.deleteForever')} variant="destructive" size="sm" loading={deleteBusy} disabled={user.hasPassword && !deletePassword} onPress={confirmDelete} />
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
        <SettingToggle icon="music" label={t('settings.sound')} hint={t('settings.soundHint')} value={settings.soundEnabled} onValueChange={(v) => updateSettings({ soundEnabled: v })} />
        <SettingBlock icon="wind" label={t('settings.gardenMotion')} hint={t('settings.gardenMotionHint')} last>
          <SegmentedControl<'full' | 'calm' | 'off'>
            value={settings.gardenMotion ?? 'full'}
            onChange={(v) => updateSettings({ gardenMotion: v })}
            accessibilityLabel={t('settings.gardenMotion')}
            segments={[
              { value: 'full', label: t('settings.motion.full') },
              { value: 'calm', label: t('settings.motion.calm') },
              { value: 'off', label: t('settings.motion.off') },
            ]}
          />
        </SettingBlock>
      </Section>

      <Section title={t('settings.appearance')}>
        <SettingBlock icon={appearance === 'dark' ? 'moon' : 'sun'} label={t('settings.theme')} hint={t('settings.themeHint')} last>
          <SegmentedControl<Appearance>
            value={appearance}
            onChange={(v) => updateSettings({ appearance: v })}
            accessibilityLabel={t('settings.theme')}
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
        {env.supportEmail ? <SettingLink icon="mail" label={t('settings.support')} onPress={() => openUrl(`mailto:${env.supportEmail}`)} /> : null}
        <View style={styles.version}>
          <AppText variant="bodySmall" tone="muted">Tame {appVersion}</AppText>
        </View>
      </Section>

      <Section title={t('settings.legal')}>
        {LEGAL_ORDER.map((id, i) => (
          <SettingLink key={id} icon={LEGAL_ICON[id]} label={t(`legal.${id}` as StringKey)} onPress={() => navigation.navigate('Legal', { doc: id })} last={i === LEGAL_ORDER.length - 1} />
        ))}
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
  accountAction: { marginTop: space.md, alignSelf: 'flex-start' },
  accountLinks: { marginTop: space.sm, marginHorizontal: -space.lg },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.md },
  deleteLink: { marginTop: space.sm, marginLeft: -space.md },
  deleteBox: { marginTop: space.lg, paddingTop: space.lg, borderTopWidth: StyleSheet.hairlineWidth, gap: space.md },
  input: { height: 48, borderRadius: radii.sm, borderWidth: 1, paddingHorizontal: space.md },
  version: { paddingVertical: space.md },
});
