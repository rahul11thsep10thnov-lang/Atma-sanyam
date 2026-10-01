import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { ScenePosition } from '../types';
import { useSceneMetrics } from './SceneMetrics';

type Anchor = 'bottom' | 'top' | 'center';

interface Props {
  position: ScenePosition;
  width: number;
  height: number;
  /** Which point of the sprite sits at `position` — 'bottom' for anything
   * standing on the floor, 'top' for anything hanging from the railing or
   * wall, 'center' for wall-mounted pieces. Always horizontally centered. */
  anchor?: Anchor;
  scale?: number;
  rotation?: number;
  style?: ViewStyle;
  children: React.ReactNode;
}

/** Places a small piece of the scene (a plant, a chair, a lantern…) at a
 * normalized 0..1 position within the balcony's own measured size, avoiding
 * any dependency on percentage-based transforms RN doesn't reliably support. */
export function AnchoredSprite({
  position,
  width,
  height,
  anchor = 'bottom',
  scale = 1,
  rotation = 0,
  style,
  children,
}: Props) {
  const { width: sceneWidth, height: sceneHeight } = useSceneMetrics();
  const anchorY = anchor === 'top' ? 0 : anchor === 'center' ? 0.5 : 1;
  const left = position.x * sceneWidth - width / 2;
  const top = position.y * sceneHeight - height * anchorY;

  return (
    <View
      pointerEvents="box-none"
      style={[
        styles.wrap,
        { left, top, width, height, transform: [{ scale }, { rotate: `${rotation}deg` }] },
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute' },
});
