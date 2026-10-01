import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { BALCONY_PALETTE as P } from '../../config/palette';
import { useSceneMetrics } from '../SceneMetrics';

/** Layer 7 — foreground: two quiet leaf silhouettes framing the bottom
 * corners, as if the camera were sitting just behind a plant of its own.
 * Purely a depth cue — static, low-opacity, never competing for attention
 * with anything unlocked. */
export function ForegroundLayer() {
  const { width, height } = useSceneMetrics();
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Svg width={width} height={height} viewBox="0 0 360 640">
        <Path
          d="M -10 640 C 10 560, 60 540, 60 480 C 40 540, 0 560, -10 610 Z"
          fill={P.leaf}
          opacity={0.35}
        />
        <Path
          d="M -10 640 C 30 610, 50 590, 40 540 C 55 590, 40 620, -10 640 Z"
          fill={P.leafLight}
          opacity={0.3}
        />
        <Path
          d="M 370 640 C 350 550, 300 530, 300 470 C 320 540, 360 560, 370 600 Z"
          fill={P.leaf}
          opacity={0.3}
        />
      </Svg>
    </View>
  );
}
