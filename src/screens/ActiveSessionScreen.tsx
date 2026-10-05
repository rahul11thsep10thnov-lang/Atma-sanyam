// The focus session: a seed goes into the soil and a plant grows as the
// minutes pass; or a picture reveals itself tile by tile; or the balcony
// lives around the person while its peace lily grows. A quiet timer
// floats at the top. The first ten seconds are a grace period: leaving
// then costs nothing. After that, abandoning a session grows nothing and
// leaves a wilted sapling behind. A completed plant session places the
// plant in the garden at the size its minutes earned; a completed picture
// session of fifteen minutes or more keeps the picture as a framed jigsaw
// and asks where it should hang.
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Animated, BackHandler, Dimensions, Image, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { PuzzleGrid } from '../components/PuzzleGrid';
import { PuzzleContent, attributionFor } from '../components/PuzzleContent';
import { SessionResultSheet, RewardLine } from '../components/session/SessionResultSheet';
import { PlacementOption, PlacementSheet } from '../components/session/PlacementSheet';
import { NewPlant, creditCompletedSession, recordPausedSession } from '../spaces/focusEngine';
import { STAGE_WORDS, hangArtwork as hangInSpace } from '../spaces/model';
import { GRACE_SECONDS } from '../spaces/catalog';
import { packFor } from '../spaces/packs';
import { loadSpace, updateSpace } from '../spaces/repository';
import { SpaceSession } from '../spaces/ui/SpaceSession';
import { ArtworkRecord, artworkImage, findArtwork, setHome } from '../collection/model';
import { loadCollection, updateCollection } from '../collection/repository';
import { placeArtworkInMuseum } from '../museum/repository';
import { GrowthScene } from '../paradise/scene/GrowthScene';
import { SPECIES_BY_ID } from '../paradise/catalog';
import { useFocusTimer } from '../hooks/useFocusTimer';
import { useReducedMotion } from '../hooks/useReducedMotion';
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
  const reduced = useReducedMotion();
  const texts = remote.texts;
  const insets = useSafeAreaInsets();
  const totalSeconds = config.durationMinutes * 60;
  const totalPieces = config.grid.rows * config.grid.cols;
  const startedAtRef = useRef(Date.now());
  const sessionIdRef = useRef(`${startedAtRef.current}-${Math.random().toString(36).slice(2, 8)}`);
  const [result, setResult] = useState<Result | null>(null);
  const resultRef = useRef<Result | null>(null);
  const [rewardLines, setRewardLines] = useState<RewardLine[]>([]);
  const [pendingArt, setPendingArt] = useState<ArtworkRecord | null>(null);
  const [newPlant, setNewPlant] = useState<NewPlant | null>(null);
  const [placing, setPlacing] = useState(false);
  const [placeOptions, setPlaceOptions] = useState<PlacementOption[]>([]);
  const leftFreeRef = useRef(false);

  const isPlant = config.image.kind === 'plant';
  const inSpace = config.image.kind === 'space' || config.image.kind === 'balcony';
  const plantName = isPlant ? (SPECIES_BY_ID[(config.image as { speciesId: string }).speciesId]?.name ?? '').toLowerCase() : packFor('balcony').focusPlant.name.toLowerCase();
  const motion: 'full' | 'calm' | 'off' = reduced ? 'off' : (settings.gardenMotion ?? 'full');

  const finalizeSession = useCallback(
    async (outcome: SessionRecord['outcome'], failureReason: SessionRecord['failureReason'], revealedFraction: number) => {
      const record: SessionRecord = {
        id: sessionIdRef.current,
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
      .then((aspect) => creditCompletedSession(config.durationMinutes, img, sessionIdRef.current, aspect))
      .then((summary) => {
        const lines: RewardLine[] = [{ icon: 'coins', text: t('session.coinsLine', { coins: summary.coinsEarned + summary.bonusCoins }) }];
        if (summary.newPlant) {
          lines.push({ icon: 'flower', text: t('session.plantGrown', { name: summary.newPlant.name, size: summary.newPlant.size, segment: t(`paradise.segment.${summary.newPlant.segment}` as never) }) });
          setNewPlant(summary.newPlant);
        }
        if (summary.plant) {
          const name = summary.plant.name.toLowerCase();
          const grew = summary.plant.after !== summary.plant.before;
          lines.push({
            icon: 'sprout',
            text: summary.plant.revived ? t('session.plantRevived', { plant: name }) : grew ? t('session.plantNow', { plant: name, stage: STAGE_WORDS[summary.plant.after] ?? summary.plant.after }) : t('session.plantKept', { plant: name }),
          });
        }
        if (summary.artwork) {
          lines.push({ icon: 'puzzle', text: t('session.jigsawEarned', { title: summary.artwork.title, tier: summary.artwork.tier }) });
          setPendingArt(summary.artwork);
        } else if (summary.tooShortForJigsaw) lines.push({ icon: 'puzzle', text: t('session.noJigsaw') });
        for (const m of summary.milestones) lines.push({ icon: 'sparkles', text: t('session.milestone', { title: m.title, coins: m.coins }) });
        setRewardLines(lines);
      })
      .catch(() => undefined);
  }, [finalizeSession, settings.soundEnabled, config.durationMinutes, config.image]);

  const handleFail = useCallback(
    (reason: 'left_app' | 'gave_up', revealedFraction: number) => {
      if (leftFreeRef.current) return;
      const elapsed = (Date.now() - startedAtRef.current) / 1000;
      finalizeSession('failed', reason, revealedFraction);
      if (settings.soundEnabled) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => undefined);
      show({ outcome: 'failed', reason });
      if (!isPlant && !inSpace) return;
      recordPausedSession(config.image, elapsed)
        .then((summary) => {
          if (!summary) return;
          if (summary.where === 'balcony') {
            setRewardLines([
              { icon: 'leaf', text: summary.wilted ? t('space.plantDrooping') : t('session.droopLine', { plant: summary.plantName.toLowerCase() }) },
              { icon: 'alert', text: t('session.penaltyLine', { space: t('space.balcony').toLowerCase() }) },
            ]);
          } else {
            setRewardLines([
              { icon: 'leaf', text: t('session.noPlantGrew', { plant: summary.plantName.toLowerCase() }) },
              { icon: 'alert', text: t('session.saplingLeft', { segment: t(`paradise.segment.${summary.where}` as never) }) },
            ]);
          }
        })
        .catch(() => undefined);
    },
    [finalizeSession, settings.soundEnabled, config.image, isPlant, inSpace]
  );

  // ---- hanging the framed picture ----
  const prepareOptions = useCallback(async (a: ArtworkRecord): Promise<PlacementOption[]> => {
    const balcony = await loadSpace('balcony');
    const balconyOk = hangInSpace(balcony, a.id) !== balcony;
    return [
      { id: 'museum', label: t('placement.museum'), icon: 'landmark' },
      { id: 'balconyWall', label: t('placement.balconyWall'), icon: 'image', disabledReason: balconyOk ? undefined : t('gallery.noFrameSpot') },
      { id: 'keep', label: t('placement.keep'), icon: 'library' },
      { id: 'dump', label: t('placement.dump'), icon: 'trash', destructive: true },
    ];
  }, []);

  const startPlacing = () => {
    if (!pendingArt) return;
    setPlacing(true);
    prepareOptions(pendingArt).then(setPlaceOptions).catch(() => setPlaceOptions([]));
  };

  const choose = async (id: string) => {
    const a = pendingArt;
    if (!a) return;
    try {
      if (id === 'museum') {
        const c = await loadCollection();
        await placeArtworkInMuseum(a, (x) => findArtwork(c, x));
        await updateCollection((cc) => setHome(cc, a.id, 'museum'));
      } else if (id === 'balconyWall') {
        await updateSpace('balcony', (s) => hangInSpace(s, a.id));
        await updateCollection((cc) => setHome(cc, a.id, 'balcony'));
      } else if (id === 'dump') {
        await updateCollection((cc) => setHome(cc, a.id, 'binned'));
      }
    } catch {
      // the artwork stays in the collection
    }
    setPendingArt(null);
    setPlacing(false);
    leave();
  };

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
    navigation.replace('Tabs', { screen: isPlant ? 'Garden' : inSpace ? 'History' : 'Home' });
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

  const leave = () => {
    if (newPlant) {
      navigation.replace('Tabs', { screen: 'Garden', params: { arrival: newPlant.id } });
      return;
    }
    navigation.replace('Tabs', { screen: isPlant ? 'Garden' : inSpace ? 'History' : 'Home' });
  };
  const attribution = attributionFor(config.image);
  const timerAtTop = inSpace || isPlant;
  const frozenMinutes = result?.outcome === 'failed' ? 0 : elapsedSeconds / 60;

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      {isPlant ? (
        <GrowthScene speciesId={(config.image as { speciesId: string }).speciesId} elapsedMinutes={frozenMinutes} targetMinutes={config.durationMinutes} width={SCREEN_WIDTH} height={SCREEN_HEIGHT} motion={motion} done={!!result} />
      ) : inSpace ? (
        <SpaceSession space="balcony" elapsedMinutes={frozenMinutes} />
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
        {timerAtTop ? (
          <View style={{ flex: 1 }} />
        ) : (
          <View style={styles.barTrack} pointerEvents="none">
            <Animated.View style={[styles.barFill, { backgroundColor: colors.accent, transform: [{ scaleX: barScale }] }]} />
          </View>
        )}
        {!result && <IconButton icon="close" label={t('session.end')} variant="onImage" size={40} onPress={confirmGiveUp} haptic={false} />}
      </View>

      {!result && (
        <View style={[styles.center, timerAtTop && { justifyContent: 'flex-start', paddingTop: insets.top + 64 }]} pointerEvents="none">
          <AppText style={[styles.timer, typography.timer, isPlant && styles.timerPlant]} accessibilityRole="timer" accessibilityLabel={`${Math.ceil(remainingSeconds / 60)} minutes remaining`}>
            {formatTime(remainingSeconds)}
          </AppText>
          <AppText variant="bodySmall" style={[styles.tagline, isPlant && styles.taglinePlant]}>
            {inGrace ? t('session.graceHint', { seconds: GRACE_SECONDS - elapsedSeconds }) : timerAtTop ? t('session.plantGrowing', { plant: plantName }) : t('session.worldWaiting')}
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
          title={isPlant ? (newPlant ? t('session.plantDoneTitle', { name: newPlant.name }) : t('session.plantShortTitle')) : texts.sessionCompleteTitle}
          message={isPlant ? (newPlant ? t('session.plantDoneBody', { size: newPlant.size }) : t('session.plantShortBody')) : texts.sessionCompleteMessage}
          lines={rewardLines}
          primaryLabel={pendingArt ? t('session.placeIt') : newPlant ? t('session.seeInGarden') : inSpace ? t('session.backTo', { space: t('space.balcony').toLowerCase() }) : isPlant ? t('session.backTo', { space: t('tabs.garden').toLowerCase() }) : t('session.backHome')}
          onPrimary={pendingArt ? startPlacing : leave}
        />
      )}
      {placing && pendingArt && (
        <PlacementSheet title={t('placement.artTitle')} body={`${pendingArt.title}. ${t('placement.artBody')}`} image={artworkImage(pendingArt)} options={placeOptions} onChoose={(id) => void choose(id)} />
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

const styles = StyleSheet.create({
  screen: { flex: 1 },
  topRow: { position: 'absolute', left: space.lg, right: space.lg, flexDirection: 'row', alignItems: 'center', gap: space.md },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(20,12,8,0.35)', paddingHorizontal: 10, height: 32, borderRadius: radii.pill },
  white: { color: '#FFFFFF' },
  barTrack: { flex: 1, height: 3, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.35)', overflow: 'hidden' },
  barFill: { height: 3, width: '100%', borderRadius: 2, transformOrigin: 'left' },
  center: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  timer: { color: '#FFFFFF', opacity: 0.94, textShadowColor: 'rgba(20,12,8,0.45)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 18 },
  timerPlant: { color: '#3A2412', opacity: 0.9, textShadowColor: 'rgba(255,245,225,0.7)', textShadowRadius: 14 },
  tagline: { color: 'rgba(255,255,255,0.8)', marginTop: space.xs, textShadowColor: 'rgba(20,12,8,0.4)', textShadowRadius: 8, paddingHorizontal: space.xl, textAlign: 'center' },
  taglinePlant: { color: 'rgba(58,36,18,0.8)', textShadowColor: 'rgba(255,245,225,0.6)' },
  attribution: { position: 'absolute', left: space.lg, right: space.lg, alignItems: 'center' },
  attributionText: { color: 'rgba(255,255,255,0.78)', textAlign: 'center', textShadowColor: 'rgba(0,0,0,0.4)', textShadowRadius: 4 },
  grace: { position: 'absolute', left: space.lg, right: space.lg, flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingVertical: 10, paddingHorizontal: 14, borderRadius: radii.md, borderWidth: 1 },
});
