// A still frame of the person's own balcony, composited from the same layers
// as the Balcony tab — used by the Home hero and the picture picker.
import React from 'react';
import { StyleProp, View, ViewStyle } from 'react-native';
import { BalconyScene } from '../scene/BalconyScene';
import { useBalcony } from '../useBalcony';

export function BalconyPreview({ width, height, focus, style }: { width: number | `${number}%`; height: number | `${number}%`; focus?: [number, number]; style?: StyleProp<ViewStyle> }) {
  const [state] = useBalcony();
  if (!state) return <View style={[{ width, height, backgroundColor: '#3a2e26' }, style]} />;
  return <BalconyScene state={state} mode="still" parallax={false} focus={focus} style={[{ width, height }, style]} />;
}
