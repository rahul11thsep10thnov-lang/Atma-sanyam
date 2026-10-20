// Friends: who is focusing right now, the friends list with presence and
// the weekly V-sign, incoming and sent requests, and finding people by
// username or mobile number. Pokes live on each friend's row.
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { RouteProp, useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import { useSocial } from '../social/SocialContext';
import { Friend, PendingRequest, Presence, Profile, ReportContext, SearchResult, social } from '../social/api';
import { friendlyError } from '../services/apiClient';
import { group, GroupSessionView } from '../social/groupApi';
import { plantName } from '../paradise/catalog';
import { RootStackParamList, RootTabParamList } from '../navigation/types';
import { Screen } from '../ui/Screen';
import { AppText } from '../ui/AppText';
import { Avatar } from '../ui/Avatar';
import { Button, IconButton } from '../ui/Button';
import { Card } from '../ui/Card';
import { Icon } from '../ui/Icon';
import { SegmentedControl } from '../ui/SegmentedControl';
import { TextField } from '../ui/TextField';
import { useTabBarInset } from '../ui/TabBar';
import { space } from '../theme/spacing';
import { radii } from '../theme/radii';
import { useTheme } from '../theme/ThemeContext';
import { t, useLanguage } from '../i18n';

type Tab = 'friends' | 'requests' | 'find';

const nameOf = (p: Profile) => (p.username ? `@${p.username}` : p.displayName || t('friends.someone'));

function presenceLine(p: Presence): string {
  if (p.inGroup) return t('friends.inGroup');
  if (p.focusing) return t('friends.focusingNow');
  if (p.online) return t('friends.online');
  if (!p.lastSeenAt) return t('friends.offline');
  const h = Math.floor((Date.now() - new Date(p.lastSeenAt).getTime()) / 3_600_000);
  if (h < 1) return t('friends.seenRecently');
  if (h < 24) return t('friends.seenHoursAgo', { n: h });
  return t('friends.seenDaysAgo', { n: Math.floor(h / 24) });
}

/** The presence dot: green = focusing, neutral = online, none = offline. */
function PresenceDot({ presence, size = 12 }: { presence: Presence; size?: number }) {
  const { colors } = useTheme();
  if (!presence.online && !presence.focusing) return null;
  return <View style={[styles.presenceDot, { width: size, height: size, borderRadius: size / 2, backgroundColor: presence.focusing ? colors.success : colors.textMuted, borderColor: colors.surfaceRaised }]} />;
}

function PersonRow({ person, presence, leadsMe, trailing, subtitle, onPress }: { person: Profile; presence?: Presence; leadsMe?: boolean; trailing?: React.ReactNode; subtitle?: string; onPress?: () => void }) {
  const { colors } = useTheme();
  return (
    <Card padding="md" onPress={onPress} accessibilityLabel={nameOf(person)} style={styles.row}>
      <View>
        <Avatar avatarId={person.avatarId} name={person.username ?? person.displayName} size={44} />
        {presence && <PresenceDot presence={presence} />}
      </View>
      <View style={{ flex: 1 }}>
        <View style={styles.nameRow}>
          <AppText variant="bodyStrong" numberOfLines={1} style={{ flexShrink: 1 }}>
            {nameOf(person)}
          </AppText>
          {presence?.inGroup && <Icon name="hand" size="xs" color="primary" />}
          {leadsMe && (
            <Text style={[styles.vsign, { color: colors.success }]} accessibilityLabel={t('friends.leadsA11y')}>
              ✌️
            </Text>
          )}
        </View>
        {(subtitle ?? person.displayName) && (
          <AppText variant="bodySmall" tone={presence?.focusing ? 'success' : 'secondary'} numberOfLines={1}>
            {subtitle ?? person.displayName}
          </AppText>
        )}
      </View>
      {trailing}
    </Card>
  );
}

export function FriendsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootTabParamList, 'Friends'>>();
  const tabInset = useTabBarInset();
  const { colors } = useTheme();
  useLanguage();
  const { status } = useAuth();
  const { enabled, connected, friendsData, refreshFriends, onGroupEvent } = useSocial();
  const [groups, setGroups] = useState<{ mine: GroupSessionView[]; joinable: GroupSessionView[] }>({ mine: [], joinable: [] });
  const refreshGroups = useCallback(async () => {
    if (!enabled) return;
    try {
      const [mine, joinable] = await Promise.all([group.mine(), group.joinable()]);
      setGroups({ mine: mine.items, joinable: joinable.items });
    } catch {
      // keep what we have
    }
  }, [enabled]);
  useEffect(() => onGroupEvent(() => void refreshGroups()), [onGroupEvent, refreshGroups]);
  const [tab, setTab] = useState<Tab>(route.params?.tab ?? 'friends');
  const [refreshing, setRefreshing] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const searchSeq = useRef(0);

  useEffect(() => {
    if (route.params?.tab) setTab(route.params.tab);
  }, [route.params?.tab]);

  const [searchNonce, setSearchNonce] = useState(0);
  useFocusEffect(
    useCallback(() => {
      void refreshFriends();
      void refreshGroups();
      // Search again too: someone blocked from the report screen disappears.
      setSearchNonce((n) => n + 1);
    }, [refreshFriends, refreshGroups])
  );

  // find people as they type
  useEffect(() => {
    const q = query.trim();
    setSearchError(null);
    if (q.length < 2) {
      setResults(null);
      setSearching(false);
      return;
    }
    const seq = ++searchSeq.current;
    setSearching(true);
    const timer = setTimeout(async () => {
      try {
        const res = await social.search(q);
        if (seq === searchSeq.current) setResults(res.items);
      } catch (e) {
        if (seq === searchSeq.current) setSearchError(friendlyError(e));
      } finally {
        if (seq === searchSeq.current) setSearching(false);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [query, searchNonce]);

  const data = friendsData;
  const focusing = useMemo(() => data?.friends.filter((f) => f.presence.focusing) ?? [], [data]);

  const act = async (id: string, fn: () => Promise<unknown>, after?: () => void) => {
    setBusyId(id);
    try {
      await fn();
      await refreshFriends();
      after?.();
    } catch (e) {
      Alert.alert(t('friends.couldNot'), friendlyError(e));
    } finally {
      setBusyId(null);
    }
  };

  const sendRequest = (p: Profile) =>
    act(p.id, () => social.sendRequest(p.id), () => setResults((cur) => cur?.map((r) => (r.id === p.id ? { ...r, relation: 'requested' } : r)) ?? null));

  const poke = (f: Friend) => {
    const key = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
    void act(f.id, async () => {
      const res = await social.poke(f.id, key);
      Alert.alert(t('friends.poked', { name: nameOf(f) }), res.delivered === 'live' ? t('friends.pokedLive') : t('friends.pokedLater'));
    });
  };

  const report = (p: Profile, context: ReportContext) => navigation.navigate('Report', { userId: p.id, name: nameOf(p), avatarId: p.avatarId, context });

  // Android shows at most three buttons in an alert, so blocking lives on the report screen.
  const friendMenu = (f: Friend) => {
    Alert.alert(nameOf(f), f.displayName ?? undefined, [
      { text: t('friends.reportOrBlock'), onPress: () => report(f, 'friends') },
      { text: t('friends.unfriend'), style: 'destructive', onPress: () => void act(f.id, () => social.unfriend(f.id)) },
      { text: t('cancel'), style: 'cancel' },
    ]);
  };

  const personMenu = (p: Profile, context: ReportContext) => {
    Alert.alert(nameOf(p), p.displayName ?? undefined, [
      { text: t('friends.reportOrBlock'), onPress: () => report(p, context) },
      { text: t('cancel'), style: 'cancel' },
    ]);
  };

  if (!enabled) {
    return (
      <Screen scroll bottomInset={tabInset}>
        <AppText variant="headingLarge" accessibilityRole="header">{t('friends.title')}</AppText>
        <Card padding="lg" style={styles.emptyCard}>
          <Icon name="users" size="lg" color="secondary" />
          <AppText variant="bodyStrong" align="center" style={{ marginTop: space.sm }}>{t('friends.signInTitle')}</AppText>
          <AppText variant="bodySmall" tone="secondary" align="center">{t('friends.signInBody')}</AppText>
          {status !== 'loading' && <Button label={t('auth.chip.signIn')} icon="user" onPress={() => navigation.navigate('Auth')} style={{ marginTop: space.md }} />}
        </Card>
      </Screen>
    );
  }

  const incomingCount = data?.incoming.length ?? 0;

  return (
    <Screen
      scroll
      bottomInset={tabInset}
      scrollProps={{
        refreshControl: (
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              void refreshFriends().finally(() => setRefreshing(false));
            }}
            tintColor={colors.primary}
          />
        ),
        keyboardShouldPersistTaps: 'handled',
      }}
    >
      <View style={styles.headerRow}>
        <AppText variant="headingLarge" accessibilityRole="header" style={{ flex: 1 }}>{t('friends.title')}</AppText>
        <View style={[styles.liveDot, { backgroundColor: connected ? colors.success : colors.textMuted }]} accessibilityLabel={connected ? t('friends.live') : t('friends.offlineYou')} />
        <IconButton icon="bell" label={t('notif.title')} variant="tinted" size={40} onPress={() => navigation.navigate('Notifications')} />
      </View>

      <SegmentedControl<Tab>
        value={tab}
        onChange={setTab}
        accessibilityLabel={t('friends.title')}
        segments={[
          { value: 'friends', label: t('friends.tab.friends') },
          { value: 'requests', label: incomingCount > 0 ? `${t('friends.tab.requests')} · ${incomingCount}` : t('friends.tab.requests') },
          { value: 'find', label: t('friends.tab.find') },
        ]}
      />

      {tab === 'friends' && (
        <View style={styles.section}>
          <Button label={t('group.focusTogether')} icon="users" size="lg" fullWidth onPress={() => navigation.navigate('GroupSetup')} disabled={(data?.friends.length ?? 0) === 0} />
          {groups.mine.map((g) => {
            const host = g.participants.find((p) => p.isHost);
            const what = g.proposal.kind === 'plant' ? plantName(g.proposal.speciesId) : g.proposal.title || t('home.revealJigsaws');
            const mineStatus = g.me?.status;
            return (
              <Card key={g.id} variant="tinted" padding="md" onPress={() => navigation.navigate('GroupLobby', { sessionId: g.id })} accessibilityLabel={t('group.open')} style={styles.groupCard}>
                <View style={styles.nameRow}>
                  <Icon name="users" size="sm" color="primary" />
                  <View style={{ flex: 1 }}>
                    <AppText variant="bodyStrong" numberOfLines={1}>
                      {g.status === 'running' ? t('group.runningCard', { what }) : mineStatus === 'invited' ? t('group.invitedCard', { host: host?.username ? `@${host.username}` : host?.displayName ?? '' , what }) : t('group.lobbyCard', { what })}
                    </AppText>
                    <AppText variant="bodySmall" tone="secondary">{t('group.minutesTogether', { minutes: g.plannedMinutes, count: g.participants.filter((p) => ['approved', 'ready', 'active', 'completed'].includes(p.status)).length })}</AppText>
                  </View>
                  <Icon name="chevronRight" size="sm" color="secondary" />
                </View>
              </Card>
            );
          })}
          {groups.joinable.map((g) => {
            const host = g.participants.find((p) => p.isHost);
            const left = Math.max(0, Math.round((new Date(g.endsAt!).getTime() - Date.now()) / 60_000));
            return (
              <Card key={g.id} padding="md" style={styles.groupCard}>
                <View style={styles.nameRow}>
                  <Icon name="hand" size="sm" color="primary" />
                  <View style={{ flex: 1 }}>
                    <AppText variant="bodyStrong" numberOfLines={1}>{t('group.joinableCard', { host: host?.username ? `@${host.username}` : host?.displayName ?? '' })}</AppText>
                    <AppText variant="bodySmall" tone="secondary">{t('group.minutesLeft', { minutes: left })}</AppText>
                  </View>
                  <Button label={t('group.askToJoin')} size="sm" disabled={busyId === g.id} onPress={() => void act(g.id, () => group.askToJoin(g.id), () => { Alert.alert(t('group.asked'), t('group.askedBody')); void refreshGroups(); })} />
                </View>
              </Card>
            );
          })}
          {focusing.length > 0 && (
            <Card variant="tinted" padding="md" style={styles.focusingCard}>
              <View style={styles.nameRow}>
                <View style={[styles.presenceInline, { backgroundColor: colors.success }]} />
                <AppText variant="bodySmallStrong">{t('friends.focusingCount', { count: focusing.length })}</AppText>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.focusingRow}>
                {focusing.map((f) => (
                  <View key={f.id} style={styles.focusingItem}>
                    <Avatar avatarId={f.avatarId} name={f.username ?? f.displayName} size={40} />
                    <AppText variant="caption" numberOfLines={1} style={{ maxWidth: 64 }}>{nameOf(f)}</AppText>
                  </View>
                ))}
              </ScrollView>
            </Card>
          )}
          {data && data.friends.length === 0 ? (
            <Card padding="lg" style={styles.emptyCard}>
              <Icon name="users" size="lg" color="secondary" />
              <AppText variant="bodyStrong" align="center" style={{ marginTop: space.sm }}>{t('friends.emptyTitle')}</AppText>
              <AppText variant="bodySmall" tone="secondary" align="center">{t('friends.emptyBody')}</AppText>
              <Button label={t('friends.findPeople')} icon="search" onPress={() => setTab('find')} style={{ marginTop: space.md }} />
            </Card>
          ) : (
            <>
              <AppText variant="caption" tone="muted" style={styles.weekLine}>
                {t('friends.myWeek', { minutes: data?.myWeekMinutes ?? 0 })}
              </AppText>
              {data?.friends.map((f) => (
                <PersonRow
                  key={f.id}
                  person={f}
                  presence={f.presence}
                  leadsMe={f.leadsMe}
                  subtitle={presenceLine(f.presence)}
                  onPress={() => friendMenu(f)}
                  trailing={<IconButton icon="hand" label={t('friends.poke', { name: nameOf(f) })} variant="tinted" size={40} onPress={() => poke(f)} disabled={busyId === f.id} />}
                />
              ))}
            </>
          )}
        </View>
      )}

      {tab === 'requests' && (
        <View style={styles.section}>
          <AppText variant="overline" tone="muted" style={styles.subhead}>{t('friends.incoming').toUpperCase()}</AppText>
          {incomingCount === 0 && <AppText variant="bodySmall" tone="secondary" style={styles.quiet}>{t('friends.noIncoming')}</AppText>}
          {data?.incoming.map((r: PendingRequest) => (
            <PersonRow
              key={r.requestId}
              person={r}
              onPress={() => personMenu(r, 'request')}
              trailing={
                <View style={styles.actions}>
                  <IconButton icon="close" label={t('friends.decline')} variant="tinted" size={40} onPress={() => void act(r.requestId, () => social.decline(r.requestId))} disabled={busyId === r.requestId} />
                  <IconButton icon="check" label={t('friends.accept')} variant="filled" size={40} onPress={() => void act(r.requestId, () => social.accept(r.requestId))} disabled={busyId === r.requestId} />
                </View>
              }
            />
          ))}
          <AppText variant="overline" tone="muted" style={styles.subhead}>{t('friends.sent').toUpperCase()}</AppText>
          {(data?.sent.length ?? 0) === 0 && <AppText variant="bodySmall" tone="secondary" style={styles.quiet}>{t('friends.noSent')}</AppText>}
          {data?.sent.map((r: PendingRequest) => (
            <PersonRow key={r.requestId} person={r} subtitle={t('friends.waiting')} trailing={<Button label={t('friends.cancelRequest')} variant="tertiary" size="sm" onPress={() => void act(r.requestId, () => social.cancel(r.requestId))} disabled={busyId === r.requestId} />} />
          ))}
        </View>
      )}

      {tab === 'find' && (
        <View style={styles.section}>
          <TextField
            label={t('friends.findLabel')}
            icon="search"
            value={query}
            onChangeText={setQuery}
            autoCapitalize="none"
            autoCorrect={false}
            placeholder={t('friends.findPlaceholder')}
            hint={searching ? t('friends.searching') : t('friends.findHint')}
            error={searchError}
            accessibilityLabel={t('friends.findLabel')}
          />
          {results && results.length === 0 && !searching && (
            <AppText variant="bodySmall" tone="secondary" style={styles.quiet}>{t('friends.noResults')}</AppText>
          )}
          {results?.map((p) => (
            <PersonRow
              key={p.id}
              person={p}
              onPress={() => personMenu(p, 'search')}
              trailing={
                p.relation === 'friends' ? (
                  <View style={styles.nameRow}>
                    <Icon name="userCheck" size="sm" color="success" />
                    <AppText variant="caption" tone="success">{t('friends.alreadyFriends')}</AppText>
                  </View>
                ) : p.relation === 'requested' ? (
                  <AppText variant="caption" tone="secondary">{t('friends.requested')}</AppText>
                ) : p.relation === 'incoming' && p.requestId ? (
                  <Button label={t('friends.accept')} size="sm" icon="check" onPress={() => void act(p.id, () => social.accept(p.requestId!), () => setResults((cur) => cur?.map((r) => (r.id === p.id ? { ...r, relation: 'friends' } : r)) ?? null))} disabled={busyId === p.id} />
                ) : (
                  <Button label={t('friends.add')} size="sm" icon="userPlus" onPress={() => void sendRequest(p)} disabled={busyId === p.id} />
                )
              }
            />
          ))}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm, marginBottom: space.md },
  liveDot: { width: 8, height: 8, borderRadius: 4, marginRight: space.xs },
  section: { marginTop: space.lg, gap: space.sm },
  subhead: { marginTop: space.sm, marginBottom: 2 },
  quiet: { paddingVertical: space.sm },
  weekLine: { marginBottom: 2 },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  vsign: { fontSize: 15, lineHeight: 18 },
  presenceDot: { position: 'absolute', right: -1, bottom: -1, borderWidth: 2 },
  presenceInline: { width: 8, height: 8, borderRadius: 4 },
  actions: { flexDirection: 'row', gap: space.xs },
  focusingCard: { borderRadius: radii.lg },
  groupCard: { borderRadius: radii.lg },
  focusingRow: { flexDirection: 'row', gap: space.md, paddingTop: space.sm },
  focusingItem: { alignItems: 'center', gap: 4 },
  emptyCard: { alignItems: 'center', marginTop: space.lg, borderRadius: radii.lg },
});
