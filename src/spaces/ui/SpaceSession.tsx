// A space during a focus session: no controls at all, and its focus plant
// visibly moves through its growth stages as the minutes add up.
import React, { useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { SpaceId } from '../packTypes';
import { SpaceScene } from '../scene/SpaceScene';
import { resolveState } from '../states';
import { useRackCount, useSpace } from '../useSpaces';
import { useCollection } from '../../collection/repository';

const FOCUS: Record<SpaceId, [number, number]> = { balcony: [0.58, 0.64], garden: [0.5, 0.6] };

export function SpaceSession({ space, elapsedMinutes }: { space: SpaceId; elapsedMinutes: number }) {
  const [state] = useSpace(space);
  const [art] = useCollection();
  const rack = useRackCount();
  // growth already earned before this session began; the session adds to it
  const base = useRef<number | null>(null);
  if (state && base.current === null) base.current = state.focus.minutes;
  if (!state) return <View style={[StyleSheet.absoluteFill, { backgroundColor: '#3a2e26' }]} />;
  const minutes = Math.max(state.focus.minutes, (base.current ?? 0) + elapsedMinutes);
  const health = elapsedMinutes > 0 ? Math.max(state.focus.health, Math.min(1, state.focus.health + elapsedMinutes * 0.02)) : state.focus.health;
  return (
    <SpaceScene space={space} state={state} art={art} light={resolveState(state.atmosphere)} rackCount={rack} focusMinutes={minutes} focusHealth={health} mode="live" focus={FOCUS[space]} style={StyleSheet.absoluteFill} />
  );
}
