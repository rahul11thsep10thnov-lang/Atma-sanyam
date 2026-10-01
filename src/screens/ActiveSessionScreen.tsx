import React, { useCallback, useEffect, useRef } from 'react';
import { Alert, Dimensions, Platform, StyleSheet, Text, View, Pressable, BackHandler } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { colors, typography } from '../theme/colors';
import { PuzzleGrid } from '../components/PuzzleGrid';
import { PuzzleContent, attributionFor } from '../components/PuzzleContent';
import { useFocusTimer } from '../hooks/useFocusTimer';
import { RootStackParamList } from '../navigation/types';
import { saveSessionRecord } from '../storage/history';
import { SessionRecord } from '../types';
import { useSettings } from '../context/SettingsContext';
import { useRemoteConfig } from '../context/RemoteConfigContext';
import { track } from '../services/analytics';
import { focusEnvironment, recordSessionOutcome } from '../balconyWorld/engine/focusEnvironmentBridge';

type Props = NativeStackScreenProps<RootStackParamList, 'ActiveSession'>;

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

function formatTime(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function ActiveSessionScreen({ route, navigation }: Props) {
  const { config } = route.params;
  const { settings } = useSettings();
  const { config: remote } = useRemoteConfig();
  const texts = remote.texts;
  const insets = useSafeAreaInsets();
  const totalSeconds = config.durationMinutes * 60;
  const totalPieces = config.grid.rows * config.grid.cols;
  const startedAtRef = useRef(Date.now());
  const finishedNavigatingRef = useRef(false);

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
      // The balcony plays the sunlight reward (or the gentle fade) next time it's on screen.
      recordSessionOutcome(outcome, outcome === 'completed' ? config.durationMinutes : Math.round(config.durationMinutes * revealedFraction));
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
    focusEnvironment.dispatch({ type: 'FOCUS_START' }, performance.now() / 1000);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleComplete = useCallback(() => {
    finalizeSession('completed', null, 1);
    if (settings.soundEnabled) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
    }
    if (finishedNavigatingRef.current) return;
    finishedNavigatingRef.current = true;
    Alert.alert(texts.sessionCompleteTitle, texts.sessionCompleteMessage, [
      { text: 'Nice', onPress: () => navigation.replace('Tabs', { screen: 'Home' }) },
    ]);
  }, [finalizeSession, navigation, settings.soundEnabled, texts]);

  const handleFail = useCallback(
    (reason: 'left_app' | 'gave_up', revealedFraction: number) => {
      finalizeSession('failed', reason, revealedFraction);
      if (settings.soundEnabled) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => undefined);
      }
      if (finishedNavigatingRef.current) return;
      finishedNavigatingRef.current = true;
      const message = reason === 'left_app' ? texts.sessionLeftAppMessage : texts.sessionGaveUpMessage;
      Alert.alert(texts.sessionFailedTitle, message, [
        { text: 'OK', onPress: () => navigation.replace('Tabs', { screen: 'Home' }) },
      ]);
    },
    [finalizeSession, navigation, settings.soundEnabled, texts]
  );

  const { remainingSeconds, revealedCount, status, awaySecondsRemaining, giveUp } = useFocusTimer({
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
    if (finishedNavigatingRef.current) return;
    Alert.alert('Give up on this puzzle?', 'Your progress will be lost and this session marked incomplete.', [
      { text: 'Keep going', style: 'cancel' },
      { text: 'Give up', style: 'destructive', onPress: giveUp },
    ]);
  };

  return (
    <View style={styles.screen}>
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

      <View style={styles.watermark} pointerEvents="none">
        <Text style={styles.watermarkText} accessibilityRole="timer" accessibilityLabel={`${Math.ceil(remainingSeconds / 60)} minutes remaining`}>
          {formatTime(remainingSeconds)}
        </Text>
      </View>

      {attributionFor(config.image) && (
        <View style={[styles.attributionBadge, { bottom: insets.bottom + 12 }]} pointerEvents="none">
          <Text style={styles.attributionText}>{attributionFor(config.image)}</Text>
        </View>
      )}

      {status === 'grace' && (
        <View style={[styles.graceBanner, { top: insets.top + 12 }]}>
          <Text style={styles.graceBannerText}>
            Come back within {awaySecondsRemaining}s or this session fails
          </Text>
        </View>
      )}

      <Pressable
        style={[styles.giveUpBtn, { top: insets.top + 8 }]}
        onPress={confirmGiveUp}
        hitSlop={12}
        accessibilityRole="button"
        accessibilityLabel="Give up this session"
      >
        <Text style={styles.giveUpBtnText}>✕</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  watermark: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  watermarkText: {
    ...typography.heading,
    fontSize: 64,
    color: colors.white,
    opacity: 0.9,
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    fontVariant: ['tabular-nums'],
    textShadowColor: 'rgba(0,0,0,0.35)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  graceBanner: {
    position: 'absolute',
    left: 24,
    right: 24,
    backgroundColor: colors.danger,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  graceBannerText: { ...typography.caption, color: colors.white, fontWeight: '700' },
  giveUpBtn: {
    position: 'absolute',
    right: 20,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  giveUpBtnText: { color: colors.white, fontSize: 16, fontWeight: '700' },
  attributionBadge: {
    position: 'absolute',
    left: 12,
    right: 12,
    alignItems: 'center',
  },
  attributionText: {
    ...typography.caption,
    color: 'rgba(255,255,255,0.75)',
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
});
