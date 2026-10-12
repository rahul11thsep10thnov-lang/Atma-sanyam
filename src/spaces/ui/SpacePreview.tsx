// A still frame of one of the person's spaces, composited from the same
// layers as its tab — used by the Home hero and the picture picker.
import React from 'react';
import { StyleProp, View, ViewStyle } from 'react-native';
import { SpaceId } from '../packTypes';
import { SpaceScene } from '../scene/SpaceScene';
import { resolveState } from '../states';
import { useRackCount, useSpace } from '../useSpaces';
import { useCollection } from '../../collection/repository';

export function SpacePreview({ space, width, height, focus, style }: { space: SpaceId; width: number | `${number}%`; height: number | `${number}%`; focus?: [number, number]; style?: StyleProp<ViewStyle> }) {
  const [state] = useSpace(space);
  const [art] = useCollection();
  const rack = useRackCount();
  if (!state) return <View style={[{ width, height, backgroundColor: '#3a2e26' }, style]} />;
  return <SpaceScene space={space} state={state} art={art} light={resolveState(state.atmosphere)} rackCount={rack} mode="still" parallax={false} focus={focus} style={[{ width, height }, style]} />;
}
