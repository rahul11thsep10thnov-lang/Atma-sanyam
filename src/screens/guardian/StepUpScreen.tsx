// Asks for a fresh code before a sensitive action, then runs it.
import React, { useEffect, useState } from 'react';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import { useGuardian } from '../../context/GuardianContext';
import { LoadingState, ErrorState } from '../../ui';
import { friendlyError } from '../../services/apiClient';

export function StepUpScreen({ navigation, route }: NativeStackScreenProps<RootStackParamList, 'StepUp'>) {
  const g = useGuardian();
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    (async () => {
      try {
        const c = await g.stepUpStart();
        navigation.replace('GuardianOtp', { purpose: 'stepUp', challengeId: c.challengeId, phoneMasked: c.phoneMasked, resendAfterSeconds: c.resendAfterSeconds, onDone: route.params?.onDone });
      } catch (e) {
        setError(friendlyError(e));
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  if (error) return <ErrorState message={error} onRetry={() => navigation.goBack()} />;
  return <LoadingState />;
}

/** Runs `action` now if the session recently verified a code, else via the StepUp screen. */
export function useStepUp() {
  const g = useGuardian();
  return (navigation: { navigate: (name: 'StepUp', params: { onDone: () => void }) => void }, action: () => void) => {
    if (g.stepUpValid) action();
    else navigation.navigate('StepUp', { onDone: action });
  };
}
