import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { cancelScheduledNotificationAsync, scheduleWarningNotificationAsync } from '../notifications/safeNotifications';

export type TimerStatus = 'running' | 'grace' | 'completed' | 'failed';
export type FailReason = 'left_app' | 'gave_up';

const TICK_MS = 200;
export const GRACE_SECONDS = 5;

interface UseFocusTimerOptions {
  totalSeconds: number;
  totalPieces: number;
  notificationsEnabled: boolean;
  onComplete: () => void;
  onFail: (reason: FailReason, revealedFraction: number) => void;
}

interface UseFocusTimerResult {
  remainingSeconds: number;
  revealedCount: number;
  status: TimerStatus;
  progress: number;
  awaySecondsRemaining: number;
  giveUp: () => void;
}

export function useFocusTimer({
  totalSeconds,
  totalPieces,
  notificationsEnabled,
  onComplete,
  onFail,
}: UseFocusTimerOptions): UseFocusTimerResult {
  const [remainingSeconds, setRemainingSeconds] = useState(totalSeconds);
  const [status, setStatus] = useState<TimerStatus>('running');
  const [awaySecondsRemaining, setAwaySecondsRemaining] = useState(GRACE_SECONDS);

  const anchorRemainingMsRef = useRef(totalSeconds * 1000);
  const runStartedAtRef = useRef<number | null>(Date.now());
  const backgroundedAtRef = useRef<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const graceIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const finishedRef = useRef(false);
  const warnNotificationIdRef = useRef<string | null>(null);

  const clearMainInterval = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const clearGraceInterval = useCallback(() => {
    if (graceIntervalRef.current) {
      clearInterval(graceIntervalRef.current);
      graceIntervalRef.current = null;
    }
  }, []);

  const cancelWarningNotification = useCallback(async () => {
    if (warnNotificationIdRef.current) {
      await cancelScheduledNotificationAsync(warnNotificationIdRef.current);
      warnNotificationIdRef.current = null;
    }
  }, []);

  const finish = useCallback(
    (finalStatus: 'completed' | 'failed', reason: FailReason | null) => {
      if (finishedRef.current) return;
      finishedRef.current = true;
      clearMainInterval();
      clearGraceInterval();
      cancelWarningNotification();
      setStatus(finalStatus);
      if (finalStatus === 'completed') {
        setRemainingSeconds(0);
        onComplete();
      } else {
        const elapsedMs = totalSeconds * 1000 - anchorRemainingMsRef.current;
        const fraction = Math.max(0, Math.min(1, elapsedMs / (totalSeconds * 1000)));
        onFail(reason ?? 'gave_up', fraction);
      }
    },
    [cancelWarningNotification, clearGraceInterval, clearMainInterval, onComplete, onFail, totalSeconds]
  );

  const giveUp = useCallback(() => {
    finish('failed', 'gave_up');
  }, [finish]);

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      if (runStartedAtRef.current == null) return;
      const elapsedSinceResume = Date.now() - runStartedAtRef.current;
      const remainingMs = anchorRemainingMsRef.current - elapsedSinceResume;
      if (remainingMs <= 0) {
        finish('completed', null);
        return;
      }
      setRemainingSeconds(Math.ceil(remainingMs / 1000));
    }, TICK_MS);
    return () => clearMainInterval();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const handleAppStateChange = (next: AppStateStatus) => {
      if (finishedRef.current) return;

      if (next !== 'active') {
        if (backgroundedAtRef.current != null) return;
        backgroundedAtRef.current = Date.now();

        if (runStartedAtRef.current != null) {
          const elapsedSinceResume = Date.now() - runStartedAtRef.current;
          anchorRemainingMsRef.current = Math.max(0, anchorRemainingMsRef.current - elapsedSinceResume);
          runStartedAtRef.current = null;
        }
        setStatus('grace');
        setAwaySecondsRemaining(GRACE_SECONDS);

        if (notificationsEnabled) {
          scheduleWarningNotificationAsync(
            `Come back within ${GRACE_SECONDS}s or your puzzle session will fail.`
          ).then((id) => {
            warnNotificationIdRef.current = id;
          });
        }

        clearGraceInterval();
        graceIntervalRef.current = setInterval(() => {
          if (backgroundedAtRef.current == null) return;
          const awayMs = Date.now() - backgroundedAtRef.current;
          const left = Math.max(0, Math.ceil((GRACE_SECONDS * 1000 - awayMs) / 1000));
          setAwaySecondsRemaining(left);
          if (awayMs >= GRACE_SECONDS * 1000) {
            clearGraceInterval();
            finish('failed', 'left_app');
          }
        }, 500);
      } else {
        if (backgroundedAtRef.current == null) return;
        const awayMs = Date.now() - backgroundedAtRef.current;
        backgroundedAtRef.current = null;
        clearGraceInterval();
        cancelWarningNotification();

        if (awayMs >= GRACE_SECONDS * 1000) {
          finish('failed', 'left_app');
          return;
        }

        runStartedAtRef.current = Date.now();
        setStatus('running');
      }
    };

    const sub = AppState.addEventListener('change', handleAppStateChange);
    return () => sub.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notificationsEnabled]);

  const elapsedSeconds = totalSeconds - remainingSeconds;
  const progress = totalSeconds > 0 ? Math.max(0, Math.min(1, elapsedSeconds / totalSeconds)) : 0;
  const revealedCount =
    status === 'completed'
      ? totalPieces
      : Math.max(0, Math.min(totalPieces, Math.floor(progress * totalPieces)));

  return {
    remainingSeconds: Math.max(0, remainingSeconds),
    revealedCount,
    status,
    progress,
    awaySecondsRemaining,
    giveUp,
  };
}
