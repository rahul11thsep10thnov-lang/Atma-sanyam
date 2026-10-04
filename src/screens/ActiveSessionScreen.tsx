// The focus session: a picture reveals itself tile by tile, or one of the
// person's spaces lives around them, while a quiet timer floats over it.
// The first ten seconds are a grace period — leaving then costs nothing.
// After that, abandoning a session droops the focus plant and leaves a
// wilted sapling and a broken picture behind. A completed picture session
// of thirty minutes or more earns the picture as a framed jigsaw, and a
// plant that just reached full growth earns a new one: the person is then
// asked where each should go.
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Animated, BackHandler, Dimensions, Image, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { PuzzleGrid } from '../components/PuzzleGrid';
import { PuzzleContent, attributionFor } from '../components/PuzzleContent';
import { SessionResultSheet, RewardLine } from '../components/session/SessionResultSheet';
import { PlacementOption, PlacementSheet } from '../components/session/PlacementSheet';
import { MaturedPlant, creditCompletedSession, recordPausedSession } from '../spaces/focusEngine';
import { STAGE_WORDS, addItem as addSpaceItem, hangArtwork as hangInSpace } from '../spaces/model';
import { GRACE_SECONDS } from '../spaces/catalog';
import { SpaceId } from '../spaces/packTypes';
import { packFor } from '../spaces/packs';
import { loadSpace, updateSpace } from '../spaces/repository';
import { SpaceSession } from '../spaces/ui/SpaceSession';
import { GardenSession } from '../garden/ui/GardenSession';
import { STAND_ITEM, STAND_LEVELS, addItem as addGardenItem, hangArtwork as hangInGarden, putOnStand } from '../garden/model';
import { loadGarden, updateGarden } from '../garden/repository';
import { SPRITES } from '../garden/sprites.generated';
import { ArtworkRecord, artworkImage, findArtwork, setHome } from '../collection/model';
import { loadCollection, updateCollection } from '../collection/repository';
import { placeArtworkInMuseum } from '../museum/repository';
import { gardenThumb } from '../garden/ui/GardenStoreSheet';
import { thumbFor } from '../spaces/ui/StoreSheet';
import { useFocusTimer } from '../hooks/useFocusTimer';
import { RootStackParamList } from '../navigation/types';
import { saveSessionRecord } from '../storage/history';
import { SessionRecord } from '../types';
import { useSettings } from '../context/SettingsContext';
import { useRemoteConfig } from '../context/RemoteConfigContext';
import { track } from '../services/analytics';
import { AppText } from '../ui/AppText';
import { IconButton } from '../ui/Button';
import { Icon } from '../ui/Icon';
import { typography } from '../theme/typography';
import { radii } from '../theme/radii';
import { space } from '../theme/spacing';
import { useTheme } from '../theme/ThemeContext';
import { t } from '../i18n';

type Props = NativeStackScreenProps<RootStackParamList, 'ActiveSession'>;

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

function formatTime(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

type Result = { outcome: 'completed' } | { outcome: 'failed'; reason: 'left_app' | 'gave_up' };

/** Something earned that still needs a home. */
type Pending = { kind: 'art'; artwork: ArtworkRecord } | { kind: 'plant'; plant: MaturedPlant };

function imageAspect(uri: string | number | undefined): Promise<number> {
  return new Promise((resolve) => {
    if (!uri) return resolve(0.75);
    if (typeof uri === 'number') {
      const r = Image.resolveAssetSource(uri);
      return resolve(r?.width && r?.height ? r.width / r.height : 0.75);
    }
    Image.getSize(
      uri,
      (w, h) => resolve(w && h ? w / h : 0.75),
      () => resolve(0.75),
    );
  });
}

export function ActiveSessionScreen({ route, navigation }: Props) {
  const { config } = route.params;
  const { settings } = useSettings();
  const { config: remote } = useRemoteConfig();
  const { colors } = useTheme();
  const texts = remote.texts;
  const insets = useSafeAreaInsets();
  const totalSeconds = config.durationMinutes * 60;
  const totalPieces = config.grid.rows * config.grid.cols;
  const startedAtRef = useRef(Date.now());
  const [result, setResult] = useState<Result | null>(null);
  const resultRef = useRef<Result | null>(null);
  const [rewardLines, setRewardLines] = useState<RewardLine[]>([]);
  const [pending, setPending] = useState<Pending[]>([]);
  const [placing, setPlacing] = useState(false);
  const [placeOptions, setPlaceOptions] = useState<PlacementOption[]>([]);
  const leftFreeRef = useRef(false);

  // where this session happens: a space, or the balcony for picture sessions
  const sessionSpace: SpaceId = config.image.kind === 'space' ? config.image.space : config.image.kind === 'balcony' ? 'balcony' : 'balcony';
  const inSpace = config.image.kind === 'space' || config.image.kind === 'balcony';
  const plantName = packFor(sessionSpace).focusPlant.name.toLowerCase();

  const finalizeSession = useCallback(
    async (outcome: SessionRecord['outcome'], failureReason: SessionRecord['failureReason'], revealedFraction: number) => {
      const record: SessionRecord = {
        id: `${startedAtRef.current}-${Math.random().toString(36).slice(2, 8)}`,
        startedAt: startedAtRef.current,
        endedAt: Date.now(),
        durationMinutes: config.durationMinutes,
        grid: config.grid,
        image: config.image,
        outcome,
        failureReason,
        revealedFraction,
      };
      await saveSessionRecord(record);
      track(outcome === 'completed' ? 'session_complete' : 'session_fail', {
        properties: {
          durationMinutes: config.durationMinutes,
          imageKind: config.image.kind,
          reason: failureReason,
          revealedPercent: Math.round(revealedFraction * 100),
        },
        contentId: config.image.kind === 'remote' ? config.image.imageId : undefined,
      });
    },
    [config]
  );

  useEffect(() => {
    track('session_start', { properties: { durationMinutes: config.durationMinutes, imageKind: config.image.kind } });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const show = (next: Result) => {
    if (resultRef.current) return;
    resultRef.current = next;
    setResult(next);
  };

  const handleComplete = useCallback(() => {
    finalizeSession('completed', null, 1);
    if (settings.soundEnabled) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
    show({ outcome: 'completed' });
    const img = config.image;
    const uri = img.kind === 'remote' || img.kind === 'custom' ? img.uri : img.kind === 'art' ? img.uri : undefined;
    imageAspect(uri)
      .then((aspect) => creditCompletedSession(config.durationMinutes, sessionSpace, img, aspect))
      .then((summary) => {
        const lines: RewardLine[] = [{ icon: 'coins', text: t('session.coinsLine', { coins: summary.coinsEarned + summary.bonusCoins }) }];
        const name = summary.plant.name.toLowerCase();
        const grew = summary.plant.after !== summary.plant.before;
        lines.push({
          icon: 'sprout',
          text: summary.plant.revived ? t('session.plantRevived', { plant: name }) : grew ? t('session.plantNow', { plant: name, stage: STAGE_WORDS[summary.plant.after] ?? summary.plant.after }) : t('session.plantKept', { plant: name }),
        });
        if (summary.artwork) lines.push({ icon: 'puzzle', text: t('session.jigsawEarned', { title: summary.artwork.title, tier: summary.artwork.tier }) });
        else if (summary.tooShortForJigsaw) lines.push({ icon: 'puzzle', text: t('session.noJigsaw') });
        for (const p of summary.matured) lines.push({ icon: 'flower', text: t('session.winningPlant', { plant: p.name }) });
        for (const m of summary.milestones) lines.push({ icon: 'sparkles', text: t('session.milestone', { title: m.title, coins: m.coins }) });
        setRewardLines(lines);
        const queue: Pending[] = [];
        if (summary.artwork) queue.push({ kind: 'art', artwork: summary.artwork });
        for (const p of summary.matured) queue.push({ kind: 'plant', plant: p });
        setPending(queue);
      })
      .catch(() => undefined);
  }, [finalizeSession, settings.soundEnabled, config.durationMinutes, sessionSpace, config.image]);

  // ---- placing what the session earned ----
  const current = pending[0] ?? null;
  const prepareOptions = useCallback(async (p: Pending): Promise<PlacementOption[]> => {
    if (p.kind === 'art') {
      const balcony = await loadSpace('balcony');
      const garden = await loadGarden();
      const balconyOk = hangInSpace(balcony, p.artwork.id) !== balcony;
      const gardenOk = hangInGarden(garden, p.artwork.id) !== garden;
      return [
        { id: 'museum', label: t('placement.museum'), icon: 'landmark' },
        { id: 'balconyWall', label: t('placement.balconyWall'), icon: 'image', disabledReason: balconyOk ? undefined : t('gallery.noFrameSpot') },
        { id: 'gardenEasel', label: t('placement.gardenEasel'), icon: 'trees', disabledReason: gardenOk ? undefined : t('placement.noRoom') },
        { id: 'keep', label: t('placement.keep'), icon: 'library' },
        { id: 'dump', label: t('placement.dump'), icon: 'trash', destructive: true },
      ];
    }
    const plant = p.plant;
    if (plant.space === 'garden') {
      const garden = await loadGarden();
      const standFree = garden.items.some((i) => i.itemId === STAND_ITEM && garden.items.filter((x) => x.standUid === i.uid).length < STAND_LEVELS);
      return [
        { id: 'garden', label: t('placement.garden'), icon: 'trees' },
        { id: 'stand', label: t('garden.onStand'), icon: 'armchair', disabledReason: standFree ? undefined : t('placement.needsStand') },
        { id: 'keepPlant', label: t('placement.keepPlant'), icon: 'library' },
        { id: 'dump', label: t('placement.dump'), icon: 'trash', destructive: true },
      ];
    }
    return [
      { id: 'balconyFloor', label: t('placement.balconyFloor'), icon: 'sprout' },
      { id: 'railing', label: t('placement.railing'), icon: 'armchair', disabledReason: t('placement.needsStand') },
      { id: 'keepPlant', label: t('placement.keepPlant'), icon: 'library' },
      { id: 'dump', label: t('placement.dump'), icon: 'trash', destructive: true },
    ];
  }, []);

  const startPlacing = () => {
    if (!current) return;
    setPlacing(true);
    prepareOptions(current).then(setPlaceOptions).catch(() => setPlaceOptions([]));
  };

  const choose = async (id: string) => {
    if (!current) return;
    try {
      if (current.kind === 'art') {
        const a = current.artwork;
        if (id === 'museum') {
          const c = await loadCollection();
          await placeArtworkInMuseum(a, (x) => findArtwork(c, x));
          await updateCollection((cc) => setHome(cc, a.id, 'museum'));
        } else if (id === 'balconyWall') {
          await updateSpace('balcony', (s) => hangInSpace(s, a.id));
          await updateCollection((cc) => setHome(cc, a.id, 'balcony'));
        } else if (id === 'gardenEasel') {
          await updateGarden((g) => hangInGarden(g, a.id));
          await updateCollection((cc) => setHome(cc, a.id, 'garden'));
        } else if (id === 'dump') {
          await updateCollection((cc) => setHome(cc, a.id, 'binned'));
        }
      } else {
        const p = current.plant;
        if (id === 'garden' || id === 'stand' || id === 'keepPlant') {
          await updateGarden((g) => {
            if (id === 'keepPlant') return { ...g, stored: [...g.stored, { uid: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`, itemId: p.itemId }] };
            const r = addGardenItem(g, p.itemId);
            if (id === 'stand' && r.placed) {
              const stand = r.state.items.find((i) => i.itemId === STAND_ITEM && r.state.items.filter((x) => x.standUid === i.uid).length < STAND_LEVELS);
              const on = stand ? putOnStand(r.state, r.placed.uid, stand.uid) : null;
              return on ?? r.state;
            }
            return r.state;
          });
        } else if (id === 'balconyFloor') {
          await updateSpace('balcony', (s) => addSpaceItem(s, p.itemId).state);
        }
      }
    } catch {
      // the artwork stays in the collection; the plant in the inventory
    }
    const rest = pending.slice(1);
    setPending(rest);
    if (rest[0]) prepareOptions(rest[0]).then(setPlaceOptions).catch(() => setPlaceOptions([]));
    else {
      setPlacing(false);
      leave();
    }
  };

  const handleFail = useCallback(
    (reason: 'left_app' | 'gave_up', revealedFraction: number) => {
      if (leftFreeRef.current) return;
      const elapsed = (Date.now() - startedAtRef.current) / 1000;
      finalizeSession('failed', reason, revealedFraction);
      if (settings.soundEnabled) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => undefined);
      show({ outcome: 'failed', reason });
      recordPausedSession(sessionSpace, elapsed)
        .then((summary) => {
          if (!summary) return;
          setRewardLines([
            { icon: 'leaf', text: summary.wilted ? t('space.plantDrooping') : t('session.droopLine', { plant: summary.plantName.toLowerCase() }) },
            { icon: 'alert', text: t('session.penaltyLine', { space: t(`space.${sessionSpace}`).toLowerCase() }) },
          ]);
        })
        .catch(() => undefined);
    },
    [finalizeSession, settings.soundEnabled, sessionSpace]
  );

  const { remainingSeconds, revealedCount, status, awaySecondsRemaining, giveUp, progress } = useFocusTimer({
    totalSeconds,
    totalPieces,
    notificationsEnabled: settings.notificationsEnabled,
    graceSeconds: remote.session.gracePeriodSeconds,
    onComplete: handleComplete,
    onFail: handleFail,
  });

  const elapsedSeconds = totalSeconds - remainingSeconds;
  const inGrace = elapsedSeconds < GRACE_SECONDS && !result;

  const leaveFree = () => {
    // within the grace period: no record, no penalty, no droop
    leftFreeRef.current = true;
    track('session_withdrawn', { properties: { durationMinutes: config.durationMinutes, imageKind: config.image.kind } });
    navigation.replace('Tabs', { screen: inSpace ? spaceTab(sessionSpace) : 'Home' });
  };

  const confirmGiveUp = () => {
    if (resultRef.current) return;
    if ((Date.now() - startedAtRef.current) / 1000 < GRACE_SECONDS) {
      leaveFree();
      return;
    }
    Alert.alert(t('session.endTitle'), t('session.endBody'), [
      { text: t('session.keepGoing'), style: 'cancel' },
      { text: t('session.endSession'), style: 'destructive', onPress: giveUp },
    ]);
  };

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      confirmGiveUp();
      return true;
    });
    return () => sub.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const barScale = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(barScale, { toValue: Math.max(0.002, progress), duration: 900, useNativeDriver: true }).start();
  }, [progress, barScale]);

  const leave = () => navigation.replace('Tabs', { screen: inSpace ? spaceTab(sessionSpace) : 'Home' });
  const attribution = attributionFor(config.image);
  const pendingImage = current ? (current.kind === 'art' ? artworkImage(current.artwork) : current.plant.space === 'garden' ? gardenThumb(current.plant.itemId) : thumbFor('balcony', current.plant.itemId)) : null;
  const pendingName = current ? (current.kind === 'art' ? current.artwork.title : current.plant.space === 'garden' ? SPRITES.items[current.plant.itemId]?.name ?? current.plant.name : packFor('balcony').items[current.plant.itemId]?.name ?? current.plant.name) : '';

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      {inSpace ? (
        sessionSpace === 'garden' ? (
          <GardenSession elapsedMinutes={result?.outcome === 'failed' ? 0 : elapsedSeconds / 60} />
        ) : (
          <SpaceSession space={sessionSpace} elapsedMinutes={result?.outcome === 'failed' ? 0 : elapsedSeconds / 60} />
        )
      ) : (
        <PuzzleGrid rows={config.grid.rows} cols={config.grid.cols} width={SCREEN_WIDTH} height={SCREEN_HEIGHT} revealedCount={revealedCount} frozen={status === 'failed'} fullBleed>
          <PuzzleContent image={config.image} width={SCREEN_WIDTH} height={SCREEN_HEIGHT} />
        </PuzzleGrid>
      )}

      <View style={[styles.topRow, { top: insets.top + space.sm }]} pointerEvents="box-none">
        <View style={styles.chip}>
          <Icon name="timer" size="xs" color="#FFFFFF" />
          <AppText variant="overline" style={styles.white}>
            {t('session.focus')}
          </AppText>
        </View>
        {inSpace ? (
          <View style={{ flex: 1 }} />
        ) : (
          <View style={styles.barTrack} pointerEvents="none">
            <Animated.View style={[styles.barFill, { backgroundColor: colors.accent, transform: [{ scaleX: barScale }] }]} />
          </View>
        )}
        {!result && <IconButton icon="close" label={t('session.end')} variant="onImage" size={40} onPress={confirmGiveUp} haptic={false} />}
      </View>

      {!result && (
        <View style={[styles.center, inSpace && { justifyContent: 'flex-start', paddingTop: insets.top + 72 }]} pointerEvents="none">
          <AppText style={[styles.timer, typography.timer]} accessibilityRole="timer" accessibilityLabel={`${Math.ceil(remainingSeconds / 60)} minutes remaining`}>
            {formatTime(remainingSeconds)}
          </AppText>
          <AppText variant="bodySmall" style={styles.tagline}>
            {inGrace ? t('session.graceHint', { seconds: GRACE_SECONDS - elapsedSeconds }) : inSpace ? t('session.plantGrowing', { plant: plantName }) : t('session.worldWaiting')}
          </AppText>
        </View>
      )}

      {attribution && !result && (
        <View style={[styles.attribution, { bottom: insets.bottom + space.md }]} pointerEvents="none">
          <AppText variant="caption" style={styles.attributionText} numberOfLines={2}>
            {attribution}
          </AppText>
        </View>
      )}

      {status === 'grace' && (
        <View style={[styles.grace, { top: insets.top + 64, backgroundColor: colors.warningSoft, borderColor: colors.warning }]} accessibilityLiveRegion="assertive">
          <Icon name="alert" size="sm" color={colors.warning} />
          <AppText variant="bodySmallStrong" style={{ color: colors.text, flex: 1 }}>
            {t('session.comeBack', { seconds: awaySecondsRemaining })}
          </AppText>
        </View>
      )}

      {result?.outcome === 'completed' && !placing && (
        <SessionResultSheet
          outcome="completed"
          title={texts.sessionCompleteTitle}
          message={texts.sessionCompleteMessage}
          lines={rewardLines}
          primaryLabel={current ? t('session.placeIt') : inSpace ? t('session.backTo', { space: t(`space.${sessionSpace}`).toLowerCase() }) : t('session.backHome')}
          onPrimary={current ? startPlacing : leave}
        />
      )}
      {placing && current && (
        <PlacementSheet
          title={current.kind === 'art' ? t('placement.artTitle') : t('placement.plantTitle')}
          body={`${pendingName}. ${current.kind === 'art' ? t('placement.artBody') : t('placement.plantBody')}`}
          image={pendingImage}
          options={placeOptions}
          onChoose={(id) => void choose(id)}
        />
      )}
      {result?.outcome === 'failed' && (
        <SessionResultSheet
          outcome="failed"
          title={texts.sessionFailedTitle}
          message={result.reason === 'left_app' ? texts.sessionLeftAppMessage : texts.sessionGaveUpMessage}
          lines={rewardLines}
          primaryLabel={t('session.anotherMoment')}
          onPrimary={leave}
        />
      )}
    </View>
  );
}

function spaceTab(space: SpaceId): 'History' | 'Garden' {
  return space === 'balcony' ? 'History' : 'Garden';
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  topRow: { position: 'absolute', left: space.lg, right: space.lg, flexDirection: 'row', alignItems: 'center', gap: space.md },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(20,12,8,0.35)', paddingHorizontal: 10, height: 32, borderRadius: radii.pill },
  white: { color: '#FFFFFF' },
  barTrack: { flex: 1, height: 3, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.35)', overflow: 'hidden' },
  barFill: { height: 3, width: '100%', borderRadius: 2, transformOrigin: 'left' },
  center: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  timer: { color: '#FFFFFF', opacity: 0.94, textShadowColor: 'rgba(20,12,8,0.45)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 18 },
  tagline: { color: 'rgba(255,255,255,0.8)', marginTop: space.xs, textShadowColor: 'rgba(20,12,8,0.4)', textShadowRadius: 8, paddingHorizontal: space.xl, textAlign: 'center' },
  attribution: { position: 'absolute', left: space.lg, right: space.lg, alignItems: 'center' },
  attributionText: { color: 'rgba(255,255,255,0.78)', textAlign: 'center', textShadowColor: 'rgba(0,0,0,0.4)', textShadowRadius: 4 },
  grace: { position: 'absolute', left: space.lg, right: space.lg, flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingVertical: 10, paddingHorizontal: 14, borderRadius: radii.md, borderWidth: 1 },
});
