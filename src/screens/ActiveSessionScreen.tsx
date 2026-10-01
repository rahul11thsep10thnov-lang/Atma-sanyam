// The focus session (PHASE 8): the picture reveals itself tile by tile
// while a quiet timer floats over it. Controls shrink to one close button;
// the end of the session is a warm sheet, never an OS alert.
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Animated, BackHandler, Dimensions, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { PuzzleGrid } from '../components/PuzzleGrid';
import { PuzzleContent, attributionFor } from '../components/PuzzleContent';
import { SessionResultSheet, RewardLine } from '../components/session/SessionResultSheet';
import { creditCompletedSession, recordPausedSession } from '../balconyWorld/state/FocusRewards';
import { STAGE_LABEL } from '../balconyWorld/state/RewardState';
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

type Props = NativeStackScreenProps<RootStackParamList, 'ActiveSession'>;

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

function formatTime(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

type Result = { outcome: 'completed' } | { outcome: 'failed'; reason: 'left_app' | 'gave_up' };

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
    creditCompletedSession(config.durationMinutes)
      .then((summary) => {
        const lines: RewardLine[] = [{ icon: 'coins', text: `+${summary.coinsEarned + summary.bonusCoins} coins for your balcony` }];
        if (summary.plant) {
          const grew = summary.plant.after !== summary.plant.before;
          lines.push({ icon: 'sprout', text: summary.plant.revived ? `${summary.plant.name} revived` : grew ? `${summary.plant.name} is now ${STAGE_LABEL[summary.plant.after]}` : `${summary.plant.name} kept growing` });
        }
        for (const m of summary.milestones) lines.push({ icon: 'sparkles', text: `${m.title} — ${m.unlocksAssetId ? 'something new in the store' : `+${m.coins} coins`}` });
        setRewardLines(lines);
      })
      .catch(() => undefined);
  }, [finalizeSession, settings.soundEnabled, config.durationMinutes]);

  const handleFail = useCallback(
    (reason: 'left_app' | 'gave_up', revealedFraction: number) => {
      finalizeSession('failed', reason, revealedFraction);
      if (settings.soundEnabled) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => undefined);
      show({ outcome: 'failed', reason });
      recordPausedSession()
        .then((summary) => {
          if (summary.plant) setRewardLines([{ icon: 'leaf', text: summary.plant.wilted ? `${summary.plant.name} is wilting — give it another moment` : `${summary.plant.name} drooped a little` }]);
        })
        .catch(() => undefined);
    },
    [finalizeSession, settings.soundEnabled]
  );

  const { remainingSeconds, revealedCount, status, awaySecondsRemaining, giveUp, progress } = useFocusTimer({
    totalSeconds,
    totalPieces,
    notificationsEnabled: settings.notificationsEnabled,
    graceSeconds: remote.session.gracePeriodSeconds,
    onComplete: handleComplete,
    onFail: handleFail,
  });

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      confirmGiveUp();
      return true;
    });
    return () => sub.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const confirmGiveUp = () => {
    if (resultRef.current) return;
    Alert.alert('End this session?', 'The picture will stay unfinished.', [
      { text: 'Keep going', style: 'cancel' },
      { text: 'End session', style: 'destructive', onPress: giveUp },
    ]);
  };

  // Progress bar width animates with the native driver via scaleX.
  const barScale = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(barScale, { toValue: Math.max(0.002, progress), duration: 900, useNativeDriver: true }).start();
  }, [progress, barScale]);

  const leave = () => navigation.replace('Tabs', { screen: 'Home' });
  const attribution = attributionFor(config.image);

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <PuzzleGrid
        rows={config.grid.rows}
        cols={config.grid.cols}
        width={SCREEN_WIDTH}
        height={SCREEN_HEIGHT}
        revealedCount={revealedCount}
        frozen={status === 'failed'}
        fullBleed
      >
        <PuzzleContent image={config.image} width={SCREEN_WIDTH} height={SCREEN_HEIGHT} />
      </PuzzleGrid>

      {/* top: FOCUS chip · progress · close */}
      <View style={[styles.topRow, { top: insets.top + space.sm }]} pointerEvents="box-none">
        <View style={styles.chip}>
          <Icon name="timer" size="xs" color="#FFFFFF" />
          <AppText variant="overline" style={styles.white}>
            FOCUS
          </AppText>
        </View>
        <View style={styles.barTrack} pointerEvents="none">
          <Animated.View style={[styles.barFill, { backgroundColor: colors.accent, transform: [{ scaleX: barScale }] }]} />
        </View>
        {!result && <IconButton icon="close" label="End this session" variant="onImage" size={40} onPress={confirmGiveUp} haptic={false} />}
      </View>

      {!result && (
        <View style={styles.center} pointerEvents="none">
          <AppText style={[styles.timer, typography.timer]} accessibilityRole="timer" accessibilityLabel={`${Math.ceil(remainingSeconds / 60)} minutes remaining`}>
            {formatTime(remainingSeconds)}
          </AppText>
          <AppText variant="bodySmall" style={styles.tagline}>
            Your world is waiting.
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
            Come back within {awaySecondsRemaining}s to keep this session.
          </AppText>
        </View>
      )}

      {result?.outcome === 'completed' && (
        <SessionResultSheet outcome="completed" title={texts.sessionCompleteTitle} message={texts.sessionCompleteMessage} lines={rewardLines} primaryLabel="Back to my balcony" onPrimary={leave} />
      )}
      {result?.outcome === 'failed' && (
        <SessionResultSheet
          outcome="failed"
          title={texts.sessionFailedTitle}
          message={result.reason === 'left_app' ? texts.sessionLeftAppMessage : texts.sessionGaveUpMessage}
          lines={rewardLines}
          primaryLabel="Give it another moment"
          onPrimary={leave}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  topRow: { position: 'absolute', left: space.lg, right: space.lg, flexDirection: 'row', alignItems: 'center', gap: space.md },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(20,12,8,0.35)',
    paddingHorizontal: 10,
    height: 32,
    borderRadius: radii.pill,
  },
  white: { color: '#FFFFFF' },
  barTrack: { flex: 1, height: 3, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.35)', overflow: 'hidden' },
  barFill: { height: 3, width: '100%', borderRadius: 2, transformOrigin: 'left' },
  center: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  timer: {
    color: '#FFFFFF',
    opacity: 0.94,
    textShadowColor: 'rgba(20,12,8,0.45)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 18,
  },
  tagline: { color: 'rgba(255,255,255,0.8)', marginTop: space.xs, textShadowColor: 'rgba(20,12,8,0.4)', textShadowRadius: 8 },
  attribution: { position: 'absolute', left: space.lg, right: space.lg, alignItems: 'center' },
  attributionText: { color: 'rgba(255,255,255,0.78)', textAlign: 'center', textShadowColor: 'rgba(0,0,0,0.4)', textShadowRadius: 4 },
  grace: {
    position: 'absolute',
    left: space.lg,
    right: space.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: radii.md,
    borderWidth: 1,
  },
});
