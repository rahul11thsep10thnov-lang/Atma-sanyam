// The balcony during a focus session: no controls at all, and the focus
// plant visibly moves through its growth stages as the minutes add up.
import React, { useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { BalconyScene } from '../scene/BalconyScene';
import { useBalcony } from '../useBalcony';

export function BalconySession({ elapsedMinutes }: { elapsedMinutes: number }) {
  const [state] = useBalcony();
  // growth already earned before this session began; the session adds to it
  const base = useRef<number | null>(null);
  if (state && base.current === null) base.current = state.focus.minutes;
  if (!state) return <View style={[StyleSheet.absoluteFill, { backgroundColor: '#3a2e26' }]} />;
  const minutes = Math.max(state.focus.minutes, (base.current ?? 0) + elapsedMinutes);
  // a session in progress is already caring for the plant
  const health = elapsedMinutes > 0 ? Math.max(state.focus.health, Math.min(1, state.focus.health + elapsedMinutes * 0.02)) : state.focus.health;
  return <BalconyScene state={state} focusMinutes={minutes} focusHealth={health} mode="live" focus={[0.58, 0.64]} style={StyleSheet.absoluteFill} />;
}
