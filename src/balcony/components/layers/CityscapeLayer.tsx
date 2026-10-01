import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Rect } from 'react-native-svg';
import { EnvironmentVisual } from '../../config/environmentConfig';
import { useSceneMetrics } from '../SceneMetrics';

interface Props {
  visual: EnvironmentVisual;
}

interface Building {
  x: number;
  w: number;
  h: number;
}

// Just enough shapes to read as "a city out there" without competing with
// the balcony itself for attention (section 1: "do NOT make the scene
// visually busy").
const BUILDINGS: Building[] = [
  { x: -20, w: 70, h: 150 },
  { x: 50, w: 55, h: 210 },
  { x: 105, w: 80, h: 170 },
  { x: 185, w: 60, h: 230 },
  { x: 245, w: 70, h: 190 },
  { x: 315, w: 65, h: 160 },
];

const WINDOW_LIGHTS: { x: number; y: number }[] = [
  { x: 30, y: 470 },
  { x: 75, y: 440 },
  { x: 160, y: 480 },
  { x: 210, y: 450 },
  { x: 270, y: 470 },
];

/** Layer 1 — distant buildings, silhouetted against the sky and tinted by
 * whatever light the current environment casts. A handful of warm window
 * lights only show once it's dark enough to matter. */
export function CityscapeLayer({ visual }: Props) {
  const { width, height } = useSceneMetrics();
  const baseline = 640; // where the balcony floor begins in the shared 360x640 space
  const showLights = visual.lightingWarmth > 0.4;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Svg width={width} height={height} viewBox="0 0 360 640">
        {BUILDINGS.map((b, i) => (
          <Rect
            key={i}
            x={b.x}
            y={baseline - b.h}
            width={b.w}
            height={b.h}
            fill={visual.architectureTint}
            opacity={0.28 + Math.min(0.25, visual.architectureTintOpacity)}
          />
        ))}
        {showLights &&
          WINDOW_LIGHTS.map((w, i) => (
            <Rect key={i} x={w.x} y={w.y} width={5} height={7} fill={visual.glowColor} opacity={0.6} />
          ))}
      </Svg>
    </View>
  );
}
