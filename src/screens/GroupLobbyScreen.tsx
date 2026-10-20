// The lobby of a group focus: the plan, who has agreed, who is ready. An
// invitee accepts or declines (with a note); the host changes the plan or
// cancels; everyone approved presses Start, and when the last one does, the
// server starts the clock and everybody's session screen opens together.
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Image, ScrollView, StyleSheet, View } from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { useSocial } from '../social/SocialContext';
import { group, GroupParticipant, GroupSessionView, imageOfProposal } from '../social/groupApi';
import { friendlyError } from '../services/apiClient';
import { gridForSession } from '../collection/model';
import { plantName } from '../paradise/catalog';
import { speciesThumb } from '../paradise/ui/PlantCatalogSheet';
import { RootStackParamList } from '../navigation/types';
import { AppText } from '../ui/AppText';
import { Avatar } from '../ui/Avatar';
import { Button, IconButton } from '../ui/Button';
import { Card } from '../ui/Card';
import { Icon, IconName } from '../ui/Icon';
import { TextField } from '../ui/TextField';
import { space } from '../theme/spacing';
import { radii } from '../theme/radii';
import { useTheme } from '../theme/ThemeContext';
import { StringKey, t, useLanguage } from '../i18n';

const STATUS_KEY: Record<GroupParticipant['status'], StringKey> = {
  invited: 'group.st.invited',
  rejected: 'group.st.rejected',
  approved: 'group.st.approved',
  ready: 'group.st.ready',
  join_requested: 'group.st.joinRequested',
  active: 'group.st.active',
  left_early: 'group.st.leftEarly',
  completed: 'group.st.completed',
  disconnected: 'group.st.disconnected',
};
const STATUS_ICON: Partial<Record<GroupParticipant['status'], IconName>> = { approved: 'check', ready: 'play', rejected: 'close', active: 'timer', completed: 'trophy', left_early: 'userX', disconnected: 'alert' };

export function GroupLobbyScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'GroupLobby'>>();
  const { sessionId } = route.params;
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  useLanguage();
  const { user } = useAuth();
  const { onGroupEvent } = useSocial();
  const [s, setS] = useState<GroupSessionView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [declining, setDeclining] = useState(false);
  const [note, setNote] = useState('');
  const openedRef = useRef(false);

  const refresh = useCallback(async () => {
    try {
      setS(await group.get(sessionId));
      setError(null);
    } catch (e) {
      setError(friendlyError(e));
    }
  }, [sessionId]);

  useEffect(() => {
    void refresh();
    const off = onGroupEvent((e) => {
      if (e.sessionId === sessionId) void refresh();
    });
    // a fallback while the socket is away
    const timer = setInterval(() => void refresh(), 8000);
    return () => {
      off();
      clearInterval(timer);
    };
  }, [sessionId, refresh, onGroupEvent]);

  // Running and I am in: off to the session screen, once.
  useEffect(() => {
    if (!s || openedRef.current) return;
    if (s.status === 'running' && s.me && (s.me.status === 'active' || s.me.status === 'disconnected')) {
      openedRef.current = true;
      const myStart = s.me.startedAt ?? s.startedAt!;
      const minutes = Math.max(1, Math.round((new Date(s.endsAt!).getTime() - new Date(myStart).getTime()) / 60_000));
      navigation.replace('ActiveSession', {
        config: { durationMinutes: minutes, image: imageOfProposal(s.proposal), grid: gridForSession(minutes), group: { sessionId: s.id, startedAt: s.startedAt!, endsAt: s.endsAt!, myStartedAt: myStart } },
      });
    }
  }, [s, navigation]);

  const act = async (fn: () => Promise<unknown>, then?: () => void) => {
    setBusy(true);
    try {
      await fn();
      await refresh();
      then?.();
    } catch (e) {
      Alert.alert(t('friends.couldNot'), friendlyError(e));
    } finally {
      setBusy(false);
    }
  };

  if (!s) {
    return (
      <View style={[styles.screen, { backgroundColor: colors.background, paddingTop: insets.top + space.lg, paddingHorizontal: space.screen }]}>
        <View style={styles.headerRow}>
          <AppText variant="headingLarge" style={{ flex: 1 }}>{t('group.lobby')}</AppText>
          <IconButton icon="close" label={t('close')} variant="filled" size={40} onPress={() => navigation.goBack()} />
        </View>
        {error && <AppText variant="bodySmall" tone="danger">{error}</AppText>}
      </View>
    );
  }

  const me = s.me;
  const isHost = s.hostId === user?.id;
  const members = s.participants.filter((p) => p.status === 'approved' || p.status === 'ready');
  const readyCount = s.participants.filter((p) => p.status === 'ready').length;
  const rejected = s.participants.filter((p) => p.status === 'rejected');
  const joinRequests = s.participants.filter((p) => p.status === 'join_requested');
  const over = s.status === 'ended' || s.status === 'cancelled';
  const image = imageOfProposal(s.proposal);
  const what = s.proposal.kind === 'plant' ? t('group.growTogether', { plant: plantName(s.proposal.speciesId) }) : t('group.revealTogether', { title: s.proposal.title || t('home.revealJigsaws') });
  const thumb = s.proposal.kind === 'plant' ? speciesThumb(s.proposal.speciesId, 7) : s.proposal.thumbnailUri ? { uri: s.proposal.thumbnailUri } : image.kind === 'remote' ? { uri: image.uri } : null;

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + space.lg, paddingBottom: insets.bottom + space.xxl, paddingHorizontal: space.screen }} keyboardShouldPersistTaps="handled">
        <View style={styles.headerRow}>
          <AppText variant="headingLarge" accessibilityRole="header" style={{ flex: 1 }}>{t('group.lobby')}</AppText>
          <IconButton icon="close" label={t('close')} variant="filled" size={40} onPress={() => navigation.goBack()} />
        </View>

        {/* the plan */}
        <Card variant="tinted" padding="md" style={styles.plan}>
          <View style={styles.planRow}>
            {thumb ? <Image source={thumb} style={styles.planThumb} /> : <View style={[styles.planThumb, { backgroundColor: colors.primarySoft }]} />}
            <View style={{ flex: 1 }}>
              <AppText variant="bodyStrong">{what}</AppText>
              <AppText variant="bodySmall" tone="secondary">{t('group.minutesTogether', { minutes: s.plannedMinutes, count: members.length })}</AppText>
              {s.revision > 1 && <AppText variant="caption" tone="muted">{t('group.revision', { n: s.revision })}</AppText>}
            </View>
          </View>
          {isHost && s.status === 'lobby' && (
            <Button label={t('group.changePlan')} variant="secondary" size="sm" icon="settings" onPress={() => navigation.replace('GroupSetup', { editSessionId: s.id })} style={{ marginTop: space.md, alignSelf: 'flex-start' }} />
          )}
        </Card>

        {over && (
          <Card padding="md" style={styles.notice}>
            <AppText variant="bodyStrong">{s.status === 'cancelled' ? t('group.cancelled') : t('group.ended')}</AppText>
          </Card>
        )}

        {/* my answer */}
        {!over && me && !isHost && (me.status === 'invited' || me.status === 'rejected') && (
          <Card padding="md" style={styles.notice}>
            <AppText variant="bodyStrong">{t('group.yourAnswer')}</AppText>
            <AppText variant="bodySmall" tone="secondary">{t('group.yourAnswerBody')}</AppText>
            {declining ? (
              <>
                <TextField label={t('group.noteLabel')} value={note} onChangeText={setNote} maxLength={120} placeholder={t('group.notePlaceholder')} accessibilityLabel={t('group.noteLabel')} />
                <View style={styles.actions}>
                  <Button label={t('cancel')} variant="tertiary" size="sm" onPress={() => setDeclining(false)} />
                  <Button label={t('group.decline')} variant="destructive" size="sm" loading={busy} onPress={() => void act(() => group.respond(s.id, false, note.trim() || undefined), () => setDeclining(false))} />
                </View>
              </>
            ) : (
              <View style={styles.actions}>
                <Button label={t('group.decline')} variant="secondary" size="sm" icon="close" onPress={() => setDeclining(true)} />
                <Button label={t('group.accept')} size="sm" icon="check" loading={busy} onPress={() => void act(() => group.respond(s.id, true))} />
              </View>
            )}
          </Card>
        )}

        {/* join requests, for the host */}
        {isHost && joinRequests.length > 0 && (
          <Card padding="md" style={styles.notice}>
            <AppText variant="bodyStrong">{t('group.joinRequests')}</AppText>
            {joinRequests.map((p) => (
              <View key={p.id} style={styles.personRow}>
                <Avatar avatarId={p.avatarId} name={p.username ?? p.displayName} size={36} />
                <AppText variant="bodySmallStrong" style={{ flex: 1 }}>{p.username ? `@${p.username}` : p.displayName}</AppText>
                <IconButton icon="close" label={t('friends.decline')} variant="tinted" size={36} onPress={() => void act(() => group.answerJoin(s.id, p.id, false))} />
                <IconButton icon="check" label={t('friends.accept')} variant="filled" size={36} onPress={() => void act(() => group.answerJoin(s.id, p.id, true))} />
              </View>
            ))}
          </Card>
        )}

        {/* who is in */}
        <AppText variant="overline" tone="muted" style={styles.subhead}>{t('group.people').toUpperCase()}</AppText>
        {s.participants.map((p) => (
          <Card key={p.id} padding="md" style={[styles.personCard, p.status === 'left_early' && { opacity: 0.55 }]}>
            <View style={styles.personRow}>
              <Avatar avatarId={p.avatarId} name={p.username ?? p.displayName} size={40} />
              <View style={{ flex: 1 }}>
                <View style={styles.nameRow}>
                  <AppText variant="bodyStrong" numberOfLines={1} style={{ flexShrink: 1 }}>{p.username ? `@${p.username}` : p.displayName || t('friends.someone')}</AppText>
                  {p.isHost && <AppText variant="caption" tone="primary">{t('group.host')}</AppText>}
                </View>
                <View style={styles.nameRow}>
                  {STATUS_ICON[p.status] && <Icon name={STATUS_ICON[p.status]!} size="xs" color={p.status === 'ready' || p.status === 'active' || p.status === 'completed' ? 'success' : p.status === 'rejected' || p.status === 'left_early' ? 'danger' : 'secondary'} />}
                  <AppText variant="bodySmall" tone={p.status === 'ready' ? 'success' : 'secondary'}>{t(STATUS_KEY[p.status])}</AppText>
                </View>
                {p.note ? <AppText variant="caption" tone="muted">“{p.note}”</AppText> : null}
              </View>
              {p.id !== user?.id && (
                <IconButton
                  icon="flag"
                  label={t('report.reportName', { name: p.username ? `@${p.username}` : p.displayName || t('friends.someone') })}
                  variant="plain"
                  size={36}
                  onPress={() => navigation.navigate('Report', { userId: p.id, name: p.username ? `@${p.username}` : p.displayName || t('friends.someone'), avatarId: p.avatarId, context: 'group', groupSessionId: s.id })}
                />
              )}
            </View>
          </Card>
        ))}

        {rejected.length > 0 && isHost && s.status === 'lobby' && (
          <AppText variant="bodySmall" tone="secondary" style={{ marginTop: space.sm }}>{t('group.someoneDeclined')}</AppText>
        )}

        {/* start */}
        {!over && s.status === 'lobby' && me && (me.status === 'approved' || me.status === 'ready') && (
          <View style={styles.startBox}>
            <AppText variant="bodySmall" tone="secondary" align="center">{t('group.readyCount', { ready: readyCount, total: members.length })}</AppText>
            <Button
              label={me.status === 'ready' ? t('group.waitingOthers') : t('group.imReady')}
              icon="play"
              size="lg"
              fullWidth
              disabled={me.status === 'ready' || members.length < 2}
              loading={busy}
              onPress={() => void act(() => group.ready(s.id))}
              style={{ marginTop: space.sm }}
            />
            {members.length < 2 && <AppText variant="caption" tone="muted" align="center" style={{ marginTop: space.xs }}>{t('group.needTwo')}</AppText>}
          </View>
        )}

        {!over && s.status === 'lobby' && (
          <Button
            label={isHost ? t('group.cancelSession') : t('group.leaveLobby')}
            variant="tertiary"
            size="sm"
            onPress={() =>
              Alert.alert(isHost ? t('group.cancelSession') : t('group.leaveLobby'), undefined, [
                { text: t('cancel'), style: 'cancel' },
                { text: isHost ? t('group.cancelSession') : t('group.leaveLobby'), style: 'destructive', onPress: () => void act(() => (isHost ? group.cancel(s.id) : group.leaveLobby(s.id)), () => navigation.goBack()) },
              ])
            }
            style={{ alignSelf: 'center', marginTop: space.md }}
          />
        )}
        {error && <AppText variant="caption" tone="danger" align="center" style={{ marginTop: space.sm }}>{error}</AppText>}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm, marginBottom: space.md },
  plan: { borderRadius: radii.lg },
  planRow: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  planThumb: { width: 64, height: 64, borderRadius: radii.md },
  notice: { marginTop: space.md, gap: space.xs },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: space.sm, marginTop: space.sm },
  subhead: { marginTop: space.xl, marginBottom: space.sm },
  personCard: { marginBottom: space.sm },
  personRow: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  startBox: { marginTop: space.xl },
});
