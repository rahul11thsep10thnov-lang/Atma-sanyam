import React, { useCallback, useEffect, useRef } from 'react';
import { Alert, Dimensions, StyleSheet, Text, View, Pressable, BackHandler } from 'react-native';
import * as Haptics from 'expo-haptics';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { colors, radius, typography, buttonHeight } from '../theme/colors';
import { PuzzleGrid } from '../components/PuzzleGrid';
import { PuzzleContent } from '../components/PuzzleContent';
import { useFocusTimer } from '../hooks/useFocusTimer';
import { RootStackParamList } from '../navigation/types';
import { saveSessionRecord } from '../storage/history';
import { SessionRecord } from '../types';
import { useSettings } from '../context/SettingsContext';

type Props = NativeStackScreenProps<RootStackParamList, 'ActiveSession'>;

const SCREEN_WIDTH = Dimensions.get('window').width;
const GRID_SIZE = Math.min(SCREEN_WIDTH - 48, 420);

function formatTime(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function ActiveSessionScreen({ route, navigation }: Props) {
  const { config } = route.params;
  const { settings } = useSettings();
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
    },
    [config]
  );

  const handleComplete = useCallback(() => {
    finalizeSession('completed', null, 1);
    if (settings.soundEnabled) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
    }
    if (finishedNavigatingRef.current) return;
    finishedNavigatingRef.current = true;
    Alert.alert('Puzzle complete!', 'Great focus — your picture is fully assembled.', [
      { text: 'Nice', onPress: () => navigation.replace('Tabs', { screen: 'Home' }) },
    ]);
  }, [finalizeSession, navigation, settings.soundEnabled]);

  const handleFail = useCallback(
    (reason: 'left_app' | 'gave_up', revealedFraction: number) => {
      finalizeSession('failed', reason, revealedFraction);
      if (settings.soundEnabled) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => undefined);
      }
      if (finishedNavigatingRef.current) return;
      finishedNavigatingRef.current = true;
      const message =
        reason === 'left_app'
          ? "You left the app too long, so this puzzle didn't get finished."
          : 'Session ended early — the puzzle stays incomplete.';
      Alert.alert('Session failed', message, [
        { text: 'OK', onPress: () => navigation.replace('Tabs', { screen: 'Home' }) },
      ]);
    },
    [finalizeSession, navigation, settings.soundEnabled]
  );

  const { remainingSeconds, revealedCount, status, progress, awaySecondsRemaining, giveUp } = useFocusTimer({
    totalSeconds,
    totalPieces,
    notificationsEnabled: settings.notificationsEnabled,
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
      <View style={styles.header}>
        <Text style={styles.timerText}>{formatTime(remainingSeconds)}</Text>
        <Text style={styles.progressText}>
          {revealedCount}/{totalPieces} pieces · {Math.round(progress * 100)}%
        </Text>
      </View>

      {status === 'grace' && (
        <View style={styles.graceBanner}>
          <Text style={styles.graceBannerText}>
            Stay focused! Return within {awaySecondsRemaining}s or this session fails.
          </Text>
        </View>
      )}

      <View style={styles.gridWrap}>
        <PuzzleGrid
          rows={config.grid.rows}
          cols={config.grid.cols}
          size={GRID_SIZE}
          revealedCount={revealedCount}
          frozen={status === 'failed'}
        >
          <PuzzleContent image={config.image} size={GRID_SIZE} />
        </PuzzleGrid>
      </View>

      <Pressable style={styles.giveUpBtn} onPress={confirmGiveUp}>
        <Text style={styles.giveUpBtnText}>Give up</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background, alignItems: 'center', paddingTop: 32 },
  header: { alignItems: 'center', marginBottom: 12 },
  timerText: { fontSize: 52, fontWeight: '800', color: colors.text, fontVariant: ['tabular-nums'] },
  progressText: { ...typography.caption, color: colors.textSecondary, marginTop: 4 },
  graceBanner: {
    backgroundColor: colors.danger,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: radius.card,
    marginBottom: 12,
  },
  graceBannerText: { ...typography.caption, color: colors.white, fontWeight: '700' },
  gridWrap: {
    marginVertical: 24,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
  },
  giveUpBtn: {
    marginTop: 'auto',
    marginBottom: 40,
    height: buttonHeight,
    paddingHorizontal: 28,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.danger,
    justifyContent: 'center',
    alignItems: 'center',
  },
  giveUpBtnText: { ...typography.title, color: colors.danger },
});
