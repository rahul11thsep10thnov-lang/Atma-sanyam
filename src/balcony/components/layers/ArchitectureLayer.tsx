import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Defs, Line, LinearGradient, Rect, Stop } from 'react-native-svg';
import { EnvironmentVisual } from '../../config/environmentConfig';
import { BALCONY_PALETTE as P } from '../../config/palette';
import { useSceneMetrics } from '../SceneMetrics';

interface Props {
  visual: EnvironmentVisual;
}

const WALL_BOTTOM = 540;
const RAIL_TOP = 555;
const RAIL_BOTTOM = 585;
const FLOOR_TOP = 585;

/** Layer 2 — the balcony's own architecture: a textured plaster wall with a
 * glass door glowing softly from indoors, a wood floor, and a brass
 * railing looking out over the city. Everything here is static geometry;
 * only the tint changes with the environment, which is what actually makes
 * the balcony feel like it belongs to whatever time of day it is. */
export function ArchitectureLayer({ visual }: Props) {
  const { width, height } = useSceneMetrics();
  const plankLines = Array.from({ length: 5 }, (_, i) => FLOOR_TOP + 12 + i * 12);
  const railBars = Array.from({ length: 13 }, (_, i) => 20 + i * 27);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Svg width={width} height={height} viewBox="0 0 360 640">
        <Defs>
          <LinearGradient id="wall" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={P.wallPlaster} />
            <Stop offset="1" stopColor={P.wallPlasterShadow} />
          </LinearGradient>
          <LinearGradient id="floor" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={P.floorWood} />
            <Stop offset="1" stopColor={P.floorWoodDark} />
          </LinearGradient>
          <LinearGradient id="doorGlow" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={visual.glowColor} stopOpacity={0.5 * visual.lightingWarmth + 0.08} />
            <Stop offset="1" stopColor={visual.glowColor} stopOpacity={0.12 * visual.lightingWarmth + 0.03} />
          </LinearGradient>
        </Defs>

        {/* wall */}
        <Rect x={0} y={0} width={360} height={WALL_BOTTOM} fill="url(#wall)" />
        <Rect x={0} y={0} width={360} height={WALL_BOTTOM} fill={visual.architectureTint} opacity={visual.architectureTintOpacity} />
        <Line x1={130} y1={0} x2={130} y2={WALL_BOTTOM} stroke={P.wallPlasterShadow} strokeOpacity={0.35} strokeWidth={1} />
        <Line x1={260} y1={0} x2={260} y2={WALL_BOTTOM} stroke={P.wallPlasterShadow} strokeOpacity={0.35} strokeWidth={1} />

        {/* glass door, left of the wall, warm interior glow behind the panes */}
        <Rect x={20} y={60} width={92} height={WALL_BOTTOM - 60} rx={2} fill="url(#doorGlow)" />
        <Rect x={20} y={60} width={92} height={WALL_BOTTOM - 60} rx={2} fill="none" stroke={P.woodFurnitureDark} strokeWidth={5} />
        <Line x1={66} y1={60} x2={66} y2={WALL_BOTTOM} stroke={P.woodFurnitureDark} strokeWidth={3} />
        <Line x1={20} y1={190} x2={112} y2={190} stroke={P.woodFurnitureDark} strokeWidth={3} />
        <Line x1={20} y1={340} x2={112} y2={340} stroke={P.woodFurnitureDark} strokeWidth={3} />

        {/* floor */}
        <Rect x={0} y={FLOOR_TOP} width={360} height={640 - FLOOR_TOP} fill="url(#floor)" />
        {plankLines.map((y) => (
          <Line key={y} x1={0} y1={y} x2={360} y2={y} stroke={P.floorWoodDark} strokeOpacity={0.4} strokeWidth={1} />
        ))}
        <Rect x={0} y={FLOOR_TOP} width={360} height={640 - FLOOR_TOP} fill={visual.architectureTint} opacity={visual.architectureTintOpacity * 0.6} />

        {/* brass railing */}
        <Rect x={0} y={RAIL_TOP} width={360} height={RAIL_BOTTOM - RAIL_TOP} fill={P.railingBrassDark} opacity={0.9} />
        <Rect x={0} y={RAIL_TOP} width={360} height={3} fill={P.brassLight} opacity={0.8} />
        {railBars.map((x) => (
          <Rect key={x} x={x} y={RAIL_TOP} width={3} height={RAIL_BOTTOM - RAIL_TOP} fill={P.railingBrass} opacity={0.7} />
        ))}
      </Svg>
    </View>
  );
}
