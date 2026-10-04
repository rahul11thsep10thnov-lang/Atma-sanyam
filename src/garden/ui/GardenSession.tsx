// The garden during a focus session: no controls, and the focus tree
// visibly grows as the minutes add up.
import React, { useCallback, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { resolveState } from '../../spaces/states';
import { useCollection } from '../../collection/repository';
import { counts, findArtwork } from '../../collection/model';
import { GardenView } from '../scene/GardenView';
import { useGarden } from '../repository';

export function GardenSession({ elapsedMinutes }: { elapsedMinutes: number }) {
  const [state] = useGarden();
  const [collection] = useCollection();
  const base = useRef<number | null>(null);
  if (state && base.current === null) base.current = state.focus.minutes;
  const artworkById = useCallback((id: string) => findArtwork(collection, id), [collection]);
  if (!state) return <View style={[StyleSheet.absoluteFill, { backgroundColor: '#2f3a26' }]} />;
  const minutes = Math.max(state.focus.minutes, (base.current ?? 0) + elapsedMinutes);
  const health = elapsedMinutes > 0 ? Math.max(state.focus.health, Math.min(1, state.focus.health + elapsedMinutes * 0.02)) : state.focus.health;
  return <GardenView state={state} light={resolveState(state.atmosphere)} mode="session" focusMinutes={minutes} focusHealth={health} rackCount={collection ? counts(collection).stored : 0} artworkById={artworkById} style={StyleSheet.absoluteFill} />;
}
