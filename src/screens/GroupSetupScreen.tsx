// Focus together: pick friends, what to focus on (a plant or a picture) and
// for how long, then open the lobby. The host also comes back here to change
// the plan after someone declines it.
import React, { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSocial } from '../social/SocialContext';
import { group, GroupProposal, GroupSessionView } from '../social/groupApi';
import { friendlyError } from '../services/apiClient';
import { GrowPlantsTab, PlantPick } from '../components/home/GrowPlantsTab';
import { JigsawPicturesTab, JigsawPick } from '../components/home/JigsawPicturesTab';
import { DialTimerPicker } from '../components/DialTimerPicker';
import { RootStackParamList } from '../navigation/types';
import { AppText } from '../ui/AppText';
import { Avatar } from '../ui/Avatar';
import { Button, IconButton } from '../ui/Button';
import { Card } from '../ui/Card';
import { Icon } from '../ui/Icon';
import { ModeChips } from '../ui/ModeChips';
import { Tactile } from '../ui/Pressable';
import { space } from '../theme/spacing';
import { radii } from '../theme/radii';
import { useTheme } from '../theme/ThemeContext';
import { t, useLanguage } from '../i18n';

type Mode = 'plants' | 'jigsaw';

export function GroupSetupScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'GroupSetup'>>();
  const editId = route.params?.editSessionId;
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  useLanguage();
  const { friendsData } = useSocial();
  const [mode, setMode] = useState<Mode>('plants');
  const [plant, setPlant] = useState<PlantPick | null>(null);
  const [picture, setPicture] = useState<JigsawPick | null>(null);
  const [minutes, setMinutes] = useState(25);
  const [chosen, setChosen] = useState<Set<string>>(new Set());
  const [existing, setExisting] = useState<GroupSessionView | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!editId) return;
    group
      .get(editId)
      .then((s) => {
        setExisting(s);
        setMinutes(s.plannedMinutes);
        if (s.proposal.kind === 'plant') {
          setMode('plants');
          setPlant(s.proposal.place === 'balcony' ? { kind: 'balcony' } : { kind: 'species', speciesId: s.proposal.speciesId, segment: 'flowers' });
        } else {
          setMode('jigsaw');
          setPicture({ kind: 'remote', uri: s.proposal.uri, imageId: s.proposal.imageId, title: s.proposal.title ?? '', attributionText: null, category: s.proposal.category });
        }
      })
      .catch((e) => Alert.alert(t('friends.couldNot'), friendlyError(e)));
  }, [editId]);

  const openLibrary = (initialCategoryId?: string) =>
    navigation.navigate('ContentBrowser', {
      initialCategoryId,
      onSelect: (image) => {
        setPicture(image);
        setMode('jigsaw');
      },
    });

  const proposal = (): GroupProposal | null => {
    if (mode === 'plants') {
      if (!plant) return null;
      return plant.kind === 'balcony' ? { kind: 'plant', speciesId: 'peace_lily', place: 'balcony' } : { kind: 'plant', speciesId: plant.speciesId };
    }
    if (!picture || picture.kind !== 'remote') return null;
    return { kind: 'remote', imageId: picture.imageId, uri: picture.uri, title: picture.title, category: picture.category };
  };

  const toggle = (id: string) =>
    setChosen((cur) => {
      const next = new Set(cur);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const submit = async () => {
    const p = proposal();
    if (!p) {
      Alert.alert(t('home.pickPicture'), t('group.pickBody'));
      return;
    }
    setBusy(true);
    try {
      if (existing) {
        await group.revise(existing.id, { proposal: p, plannedMinutes: minutes });
        navigation.replace('GroupLobby', { sessionId: existing.id });
      } else {
        const s = await group.create(p, minutes, [...chosen]);
        navigation.replace('GroupLobby', { sessionId: s.id });
      }
    } catch (e) {
      Alert.alert(t('friends.couldNot'), friendlyError(e));
    } finally {
      setBusy(false);
    }
  };

  const friends = friendsData?.friends ?? [];
  const canSubmit = !busy && !!proposal() && (existing ? true : chosen.size > 0);

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + space.lg, paddingBottom: insets.bottom + space.xxl, paddingHorizontal: space.screen }} keyboardShouldPersistTaps="handled">
        <View style={styles.headerRow}>
          <AppText variant="headingLarge" accessibilityRole="header" style={{ flex: 1 }}>
            {existing ? t('group.changePlan') : t('group.title')}
          </AppText>
          <IconButton icon="close" label={t('close')} variant="filled" size={40} onPress={() => navigation.goBack()} />
        </View>
        <AppText variant="body" tone="secondary" style={styles.subtitle}>
          {existing ? t('group.changePlanBody') : t('group.body')}
        </AppText>

        {!existing && (
          <>
            <AppText variant="overline" tone="muted" style={styles.subhead}>{t('group.whoWith').toUpperCase()}</AppText>
            {friends.length === 0 ? (
              <Card padding="md"><AppText variant="bodySmall" tone="secondary">{t('group.noFriends')}</AppText></Card>
            ) : (
              <View style={styles.friendGrid}>
                {friends.map((f) => {
                  const on = chosen.has(f.id);
                  return (
                    <Tactile key={f.id} onPress={() => toggle(f.id)} accessibilityRole="checkbox" accessibilityState={{ checked: on }} accessibilityLabel={f.username ? `@${f.username}` : f.displayName ?? ''} style={[styles.friendChip, { backgroundColor: on ? colors.primarySoft : colors.surfaceRaised, borderColor: on ? colors.primary : colors.border }]}>
                      <Avatar avatarId={f.avatarId} name={f.username ?? f.displayName} size={28} />
                      <AppText variant="bodySmallStrong" numberOfLines={1} style={{ flexShrink: 1 }}>{f.username ? `@${f.username}` : f.displayName}</AppText>
                      {on && <Icon name="check" size="xs" color="primary" />}
                    </Tactile>
                  );
                })}
              </View>
            )}
          </>
        )}

        <AppText variant="overline" tone="muted" style={styles.subhead}>{t('group.whatOn').toUpperCase()}</AppText>
        <ModeChips<Mode>
          value={mode}
          onChange={setMode}
          accessibilityLabel={t('home.focusOnA11y')}
          chips={[
            { value: 'plants', label: t('home.growPlants') },
            { value: 'jigsaw', label: t('home.revealJigsaws') },
          ]}
        />
        <View style={styles.modeBody}>
          {mode === 'plants' ? (
            <GrowPlantsTab selected={plant} onPick={setPlant} onSeeAll={() => undefined} />
          ) : (
            <JigsawPicturesTab selected={picture} onPick={setPicture} onSeeAll={(c) => openLibrary(c?.id)} />
          )}
        </View>

        <AppText variant="overline" tone="muted" style={styles.subhead}>{t('group.howLong').toUpperCase()}</AppText>
        <View style={styles.dial}>
          <DialTimerPicker value={minutes} onChange={setMinutes} size={200} />
        </View>

        <Button label={existing ? t('group.sendNewPlan') : t('group.invite', { count: chosen.size })} icon={existing ? 'send' : 'users'} size="lg" fullWidth loading={busy} disabled={!canSubmit} onPress={() => void submit()} style={styles.submit} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  subtitle: { marginTop: space.xs },
  subhead: { marginTop: space.xl, marginBottom: space.sm },
  friendGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  friendChip: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6, paddingLeft: 6, paddingRight: 12, borderRadius: radii.pill, borderWidth: 1.5, maxWidth: '100%' },
  modeBody: { marginTop: space.md },
  dial: { alignItems: 'center' },
  submit: { marginTop: space.xl },
});
