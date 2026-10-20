// "Report this person": pick a reason, add a note if you like, and block
// them too if you want. Opened from a person on the Friends tab (friends,
// requests, search results) or in a group focus lobby. The reported person
// is never told who reported them; moderators review reports in the admin
// console.
import React, { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ReportReason, social } from '../social/api';
import { useSocial } from '../social/SocialContext';
import { friendlyError } from '../services/apiClient';
import { RootStackParamList } from '../navigation/types';
import { Screen } from '../ui/Screen';
import { AppText } from '../ui/AppText';
import { Avatar } from '../ui/Avatar';
import { Button, IconButton } from '../ui/Button';
import { Card } from '../ui/Card';
import { Icon } from '../ui/Icon';
import { Tactile } from '../ui/Pressable';
import { TextField } from '../ui/TextField';
import { SettingToggle } from '../ui/SettingRow';
import { radii } from '../theme/radii';
import { space } from '../theme/spacing';
import { useTheme } from '../theme/ThemeContext';
import { StringKey, t, useLanguage } from '../i18n';

const REASONS: ReportReason[] = ['harassment', 'inappropriate_profile', 'spam', 'impersonation', 'other'];
const NOTE_MAX = 500;

export function ReportScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { params } = useRoute<RouteProp<RootStackParamList, 'Report'>>();
  const { colors } = useTheme();
  const { refreshFriends } = useSocial();
  useLanguage();
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [note, setNote] = useState('');
  const [alsoBlock, setAlsoBlock] = useState(true);
  const [busy, setBusy] = useState<'report' | 'block' | null>(null);
  const [done, setDone] = useState<{ blocked: boolean; reported: boolean } | null>(null);

  const submit = async () => {
    if (!reason || busy) return;
    setBusy('report');
    try {
      await social.report(params.userId, {
        reason,
        note: note.trim() || undefined,
        context: params.context,
        groupSessionId: params.groupSessionId,
        block: alsoBlock,
      });
      if (alsoBlock) void refreshFriends();
      setDone({ blocked: alsoBlock, reported: true });
    } catch (e) {
      Alert.alert(t('report.failed'), friendlyError(e));
    } finally {
      setBusy(null);
    }
  };

  const blockOnly = async () => {
    if (busy) return;
    setBusy('block');
    try {
      await social.block(params.userId);
      void refreshFriends();
      setDone({ blocked: true, reported: false });
    } catch (e) {
      Alert.alert(t('report.failed'), friendlyError(e));
    } finally {
      setBusy(null);
    }
  };

  const header = (
    <View style={styles.headerRow}>
      <AppText variant="overline" tone="muted" style={{ flex: 1 }}>
        {t('report.header').toUpperCase()}
      </AppText>
      <IconButton icon="close" label={t('close')} variant="filled" size={40} onPress={() => navigation.goBack()} />
    </View>
  );

  if (done) {
    return (
      <Screen scroll>
        {header}
        <Card variant="tinted" padding="lg" style={styles.doneCard}>
          <Icon name={done.reported ? 'check' : 'shield'} size="lg" color="success" />
          <AppText variant="heading" align="center">
            {done.reported ? t('report.thanksTitle') : t('report.blockedTitle', { name: params.name })}
          </AppText>
          <AppText variant="bodySmall" tone="secondary" align="center">
            {done.reported ? t('report.thanksBody') : t('report.blockedBody')}
          </AppText>
          {done.reported && done.blocked && (
            <AppText variant="bodySmall" tone="secondary" align="center">
              {t('report.alsoBlocked', { name: params.name })}
            </AppText>
          )}
        </Card>
        <Button label={t('report.done')} size="lg" fullWidth onPress={() => navigation.goBack()} style={{ marginTop: space.xl }} />
      </Screen>
    );
  }

  return (
    <Screen scroll scrollProps={{ keyboardShouldPersistTaps: 'handled' }}>
      {header}
      <View style={styles.who}>
        <Avatar avatarId={params.avatarId} name={params.name.replace(/^@/, '')} size={48} />
        <View style={{ flex: 1 }}>
          <AppText variant="headingLarge" accessibilityRole="header" numberOfLines={1}>
            {t('report.title', { name: params.name })}
          </AppText>
        </View>
      </View>
      <AppText variant="bodySmall" tone="secondary" style={styles.lead}>
        {t('report.lead', { name: params.name })}
      </AppText>

      <AppText variant="overline" tone="muted" style={styles.subhead}>
        {t('report.why').toUpperCase()}
      </AppText>
      <View style={styles.list} accessibilityRole="radiogroup" accessibilityLabel={t('report.why')}>
        {REASONS.map((r) => {
          const on = r === reason;
          return (
            <Tactile
              key={r}
              onPress={() => setReason(r)}
              accessibilityRole="radio"
              accessibilityState={{ selected: on }}
              accessibilityLabel={t(`report.reason.${r}` as StringKey)}
              style={[styles.reason, { backgroundColor: colors.surfaceRaised, borderColor: on ? colors.primary : colors.border }]}
            >
              <View style={[styles.radio, { borderColor: on ? colors.primary : colors.border }]}>{on && <View style={[styles.radioDot, { backgroundColor: colors.primary }]} />}</View>
              <View style={{ flex: 1 }}>
                <AppText variant="bodyStrong">{t(`report.reason.${r}` as StringKey)}</AppText>
                <AppText variant="caption" tone="secondary">
                  {t(`report.reasonHint.${r}` as StringKey)}
                </AppText>
              </View>
            </Tactile>
          );
        })}
      </View>

      <TextField
        label={t('report.noteLabel')}
        value={note}
        onChangeText={(v) => setNote(v.slice(0, NOTE_MAX))}
        multiline
        maxLength={NOTE_MAX}
        placeholder={t('report.notePlaceholder')}
        hint={t('report.noteHint', { left: NOTE_MAX - note.length })}
        accessibilityLabel={t('report.noteLabel')}
      />

      <Card padding={0} style={styles.blockCard}>
        <SettingToggle icon="userX" label={t('report.alsoBlockLabel', { name: params.name })} hint={t('report.alsoBlockHint')} value={alsoBlock} onValueChange={setAlsoBlock} last />
      </Card>

      <Button label={t('report.send')} icon="flag" size="lg" fullWidth disabled={!reason} loading={busy === 'report'} onPress={() => void submit()} style={{ marginTop: space.xl }} />
      {!reason && (
        <AppText variant="caption" tone="muted" align="center" style={{ marginTop: space.xs }}>
          {t('report.pickReason')}
        </AppText>
      )}
      <Button label={t('report.blockOnly')} variant="tertiary" size="sm" loading={busy === 'block'} onPress={() => void blockOnly()} style={styles.blockOnly} />
      <AppText variant="caption" tone="muted" align="center" style={styles.footer}>
        {t('report.private')}
      </AppText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: space.md },
  who: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  lead: { marginTop: space.sm },
  subhead: { marginTop: space.xl, marginBottom: space.sm },
  list: { gap: space.sm, marginBottom: space.lg },
  reason: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.md, borderRadius: radii.md, borderWidth: 1.5 },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  radioDot: { width: 10, height: 10, borderRadius: 5 },
  blockCard: { marginTop: space.lg, paddingHorizontal: space.lg },
  blockOnly: { alignSelf: 'center', marginTop: space.md },
  footer: { marginTop: space.md },
  doneCard: { alignItems: 'center', gap: space.sm, marginTop: space.xl },
});
