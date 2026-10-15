import React, { useState } from 'react';
import { Alert, Platform, Share, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp, NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import { AppText, Button, Card, Screen, SegmentedControl, SettingBlock, SettingLink, SettingToggle, TextField, useTabBarInset } from '../../ui';
import { ScreenHeader } from '../../components/ScreenHeader';
import { PasswordField } from '../../components/forms/PasswordField';
import { useGuardian } from '../../context/GuardianContext';
import { useSettings } from '../../context/SettingsContext';
import { useStepUp } from './StepUpScreen';
import { guardianApi } from '../../api/guardian';
import { setPushEnabled } from '../../services/device';
import { friendlyError } from '../../services/apiClient';
import { appVersion } from '../../services/appInfo';
import { LANGUAGES } from '../../i18n';
import { passwordProblems, PASSWORD_RULE_MESSAGE } from '../../auth/passwordPolicy';
import { space } from '../../theme/spacing';
import { t } from '../../i18n';

export function GuardianSettingsScreen() {
  const g = useGuardian();
  const { settings, updateSettings } = useSettings();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const stepUp = useStepUp();
  const inset = useTabBarInset();
  const [name, setName] = useState(g.guardian?.name ?? '');
  const [email, setEmail] = useState(g.guardian?.email ?? '');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const saveProfile = async () => {
    setBusy('profile');
    try {
      await g.updateProfile({ name: name.trim(), email: email.trim() || null });
      setMsg(t('child.saved'));
    } catch (e) {
      setMsg(friendlyError(e));
    } finally {
      setBusy(null);
    }
  };

  const togglePush = async (v: boolean) => {
    setBusy('push');
    const r = await setPushEnabled(v);
    if (r.ok) await updateSettings({ pushEnabled: v });
    else Alert.alert(t('settings.push'), r.reason);
    setBusy(null);
  };

  const exportAll = () =>
    stepUp(navigation, async () => {
      try {
        const json = JSON.stringify(await guardianApi.exportAccount(), null, 2);
        if (Platform.OS === 'web') {
          const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
          const a = document.createElement('a');
          a.href = url;
          a.download = 'loji-account.json';
          a.click();
        } else await Share.share({ message: json, title: 'LoJi account data' });
      } catch (e) {
        Alert.alert(t('common.error'), friendlyError(e));
      }
    });

  const del = () =>
    stepUp(navigation, async () => {
      setBusy('delete');
      try {
        const r = await g.deleteAccount(password);
        setMsg(t('settings.deletePending', { date: new Date(r.scheduledFor).toLocaleDateString() }));
        setDeleting(false);
        setPassword('');
      } catch (e) {
        setMsg(friendlyError(e));
      } finally {
        setBusy(null);
      }
    });

  return (
    <Screen scroll bottomInset={inset}>
      <AppText variant="dashTitle" style={{ marginBottom: space.lg }}>{t('settings.title')}</AppText>
      <Card variant="raised" padding="lg" style={styles.card}>
        <AppText variant="dashHeading">{t('settings.account')}</AppText>
        <AppText variant="bodySmall" tone="secondary">{g.guardian?.phoneMasked}</AppText>
        <TextField label={t('settings.name')} value={name} onChangeText={setName} icon="user" />
        <TextField label={t('settings.email')} value={email} onChangeText={setEmail} icon="mail" keyboardType="email-address" autoCapitalize="none" />
        <Button label={t('common.save')} size="sm" onPress={saveProfile} loading={busy === 'profile'} style={{ marginTop: space.md, alignSelf: 'flex-start' }} />
        {msg ? <AppText variant="bodySmall" tone="secondary" style={{ marginTop: space.sm }}>{msg}</AppText> : null}
      </Card>
      <Card variant="raised" paddingX="lg" padding={0} style={styles.card}>
        <SettingLink icon="lock" label={t('settings.password')} onPress={() => navigation.navigate('ChangePassword')} />
        <SettingBlock icon="sun" label={t('settings.appearance')}>
          <SegmentedControl segments={[{ value: 'system', label: t('settings.appearance.system') }, { value: 'light', label: t('settings.appearance.light') }, { value: 'dark', label: t('settings.appearance.dark') }]} value={settings.appearance ?? 'system'} onChange={(v) => void updateSettings({ appearance: v })} />
        </SettingBlock>
        <SettingBlock icon="globe" label={t('settings.language')}>
          <SegmentedControl segments={LANGUAGES.map((l) => ({ value: l.id, label: l.native }))} value={settings.language ?? 'en'} onChange={(v) => void updateSettings({ language: v })} />
        </SettingBlock>
        <SettingToggle icon="bell" label={t('settings.push')} hint={t('settings.pushHint')} value={settings.pushEnabled} busy={busy === 'push'} onValueChange={togglePush} />
        <SettingToggle icon="chart" label={t('settings.analytics')} hint={t('settings.analyticsHint')} value={settings.analyticsEnabled} onValueChange={(v) => void updateSettings({ analyticsEnabled: v })} last />
      </Card>
      <Card variant="raised" paddingX="lg" padding={0} style={styles.card}>
        <SettingLink icon="scroll" label={t('settings.terms')} onPress={() => navigation.navigate('Legal', { doc: 'terms' })} />
        <SettingLink icon="shield" label={t('settings.privacy')} onPress={() => navigation.navigate('Legal', { doc: 'privacy' })} />
        <SettingLink icon="creditCard" label={t('settings.refund')} onPress={() => navigation.navigate('Legal', { doc: 'subscription' })} />
        <SettingLink icon="trash" label={t('settings.deletion')} onPress={() => navigation.navigate('Legal', { doc: 'deletion' })} />
        <SettingLink icon="download" label={t('settings.export')} onPress={exportAll} />
        <SettingLink icon="info" label={t('settings.about')} hint={t('settings.version', { version: appVersion })} onPress={() => undefined} last />
      </Card>
      <Card variant="raised" paddingX="lg" padding={0} style={styles.card}>
        <SettingLink icon="logOut" label={t('settings.signOut')} onPress={() => void g.signOut()} />
        <SettingLink icon="logOut" label={t('settings.signOutAll')} onPress={() => stepUp(navigation, () => void g.signOutEverywhere())} />
        {g.me?.pendingDeletion ? (
          <SettingLink icon="reset" label={t('settings.cancelDeletion')} hint={t('settings.deletePending', { date: new Date(g.me.pendingDeletion.scheduledFor).toLocaleDateString() })} onPress={() => void g.cancelDeletion()} last />
        ) : (
          <SettingLink icon="trash" label={t('settings.deleteAccount')} hint={t('settings.deleteHint', { days: 7 })} tone="danger" onPress={() => setDeleting((d) => !d)} last={!deleting} />
        )}
        {deleting && (
          <View style={{ paddingBottom: space.md }}>
            <PasswordField label={t('settings.deleteConfirm')} value={password} onChangeText={setPassword} />
            <Button label={t('settings.deleteAccount')} variant="destructive" onPress={del} loading={busy === 'delete'} disabled={!password} style={{ marginTop: space.md }} />
          </View>
        )}
      </Card>
    </Screen>
  );
}

export function ChangePasswordScreen({ navigation }: NativeStackScreenProps<RootStackParamList, 'ChangePassword'>) {
  const g = useGuardian();
  const stepUp = useStepUp();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const problems = next ? passwordProblems(next) : [];
  const submit = () =>
    stepUp(navigation, async () => {
      setError(null);
      if (next !== confirm) return setError(t('gauth.passwordMismatch'));
      if (problems.length) return setError(PASSWORD_RULE_MESSAGE);
      setBusy(true);
      try {
        await g.changePassword(current, next);
        navigation.goBack();
      } catch (e) {
        setError(friendlyError(e));
      } finally {
        setBusy(false);
      }
    });
  return (
    <Screen scroll>
      <ScreenHeader title={t('settings.password')} />
      <Card variant="raised" padding="lg">
        <PasswordField label={t('settings.currentPassword')} value={current} onChangeText={setCurrent} />
        <PasswordField label={t('gauth.newPassword')} value={next} onChangeText={setNext} hint={PASSWORD_RULE_MESSAGE} />
        <PasswordField label={t('gauth.confirmPassword')} value={confirm} onChangeText={setConfirm} />
        {error ? <AppText variant="bodySmall" tone="danger" style={{ marginTop: space.md }}>{error}</AppText> : null}
        <Button label={t('common.save')} onPress={submit} loading={busy} disabled={!current || !next || !confirm} fullWidth style={{ marginTop: space.xl }} />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({ card: { marginBottom: space.lg } });
