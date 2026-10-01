import React, { useEffect, useRef } from 'react';
import { Animated, ViewStyle } from 'react-native';
import Svg, { Circle, Ellipse, Path, Rect } from 'react-native-svg';
import { Plant } from '../types';
import { BALCONY_PALETTE as P } from '../config/palette';

interface Props {
  plant: Plant;
  width: number;
  height: number;
  style?: ViewStyle;
}

const SWAY_MS = 4600;

/** Layer 4 — one plant, drawn as flat vector shapes rather than a bitmap so
 * every growth stage is just a different arrangement of the same handful
 * of paths (section 3). Swaps to a small tree silhouette for `type`s that
 * are trees; everything else renders as a potted plant. A slow, subtle
 * rotation about the base is the "leaf movement / very slow sway" the
 * animation spec calls for — muted almost to nothing once wilted. */
export function PlantView({ plant, width, height, style }: Props) {
  const sway = useRef(new Animated.Value(0)).current;
  const isTree = plant.type.includes('tree');
  const isWilted = plant.growthLevel === 'WILTED';
  const isSeed = plant.growthLevel === 'SEED';

  useEffect(() => {
    if (isSeed) return;
    const amplitude = isWilted ? 0.4 : 1;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(sway, { toValue: amplitude, duration: SWAY_MS, useNativeDriver: true }),
        Animated.timing(sway, { toValue: -amplitude, duration: SWAY_MS * 2, useNativeDriver: true }),
        Animated.timing(sway, { toValue: 0, duration: SWAY_MS, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [sway, isSeed, isWilted]);

  const rotate = sway.interpolate({ inputRange: [-1, 1], outputRange: ['-2.5deg', '2.5deg'] });

  return (
    <Animated.View style={[{ width, height, transformOrigin: 'bottom' as const, transform: [{ rotate }] }, style]}>
      <Svg width={width} height={height} viewBox="0 0 100 140">
        {isTree ? <TreeArt plant={plant} /> : <PottedPlantArt plant={plant} />}
      </Svg>
    </Animated.View>
  );
}

function foliageColor(plant: Plant): string {
  if (plant.growthLevel === 'WILTED') return P.leafDry;
  if (plant.growthLevel === 'REVIVING') return P.leafLight;
  return P.leaf;
}

function bloomColor(plant: Plant): string {
  if (plant.type === 'marigold') return P.flowerMarigold;
  return P.flowerCoral;
}

function PottedPlantArt({ plant }: { plant: Plant }) {
  const leaf = foliageColor(plant);
  const level = plant.growthLevel;
  const droop = level === 'WILTED' ? 10 : 0;

  return (
    <>
      {/* pot */}
      <Path d="M 30 120 L 70 120 L 64 140 L 36 140 Z" fill={P.terracotta} />
      <Rect x={28} y={112} width={44} height={10} rx={2} fill={P.terracottaDark} />

      {level === 'SEED' && <Ellipse cx={50} cy={110} rx={14} ry={5} fill={P.floorWoodDark} opacity={0.5} />}

      {level !== 'SEED' && (
        <>
          <Path
            d={`M 50 112 C ${50 + droop} 95, ${48 - droop} 75, 50 ${level === 'SPROUT' ? 96 : 55}`}
            stroke={leaf}
            strokeWidth={3}
            fill="none"
            strokeLinecap="round"
          />
          {level !== 'SPROUT' && (
            <>
              <Path d={`M 50 90 C 34 84, 24 92, 22 ${102 + droop}`} stroke={leaf} strokeWidth={2.5} fill="none" strokeLinecap="round" />
              <Path d={`M 50 78 C 66 72, 78 80, 80 ${92 + droop}`} stroke={leaf} strokeWidth={2.5} fill="none" strokeLinecap="round" />
              <Ellipse cx={20} cy={100 + droop} rx={9} ry={5} fill={leaf} rotation={-25} origin="20, 100" />
              <Ellipse cx={82} cy={90 + droop} rx={9} ry={5} fill={leaf} rotation={25} origin="82, 90" />
            </>
          )}
          {(level === 'MATURE' || level === 'FLOWERING' || level === 'REVIVING') && (
            <>
              <Ellipse cx={38} cy={70} rx={11} ry={6} fill={leaf} rotation={-15} origin="38, 70" />
              <Ellipse cx={62} cy={64} rx={11} ry={6} fill={leaf} rotation={15} origin="62, 64" />
              <Ellipse cx={50} cy={58} rx={10} ry={13} fill={leaf} />
            </>
          )}
          {level === 'FLOWERING' && (
            <>
              <Circle cx={50} cy={44} r={7} fill={bloomColor(plant)} />
              <Circle cx={38} cy={52} r={5} fill={bloomColor(plant)} opacity={0.9} />
              <Circle cx={63} cy={50} r={5} fill={bloomColor(plant)} opacity={0.9} />
              <Circle cx={50} cy={44} r={3} fill={P.brassLight} />
            </>
          )}
          {level === 'WILTED' && (
            <>
              <Ellipse cx={30} cy={128} rx={5} ry={2.5} fill={P.leafDry} opacity={0.7} />
              <Ellipse cx={70} cy={130} rx={5} ry={2.5} fill={P.leafDry} opacity={0.6} />
            </>
          )}
          {level === 'REVIVING' && (
            <>
              <Circle cx={30} cy={50} r={1.6} fill={P.brassLight} />
              <Circle cx={70} cy={60} r={1.6} fill={P.brassLight} />
              <Circle cx={50} cy={38} r={1.8} fill={P.brassLight} />
            </>
          )}
        </>
      )}
    </>
  );
}

function TreeArt({ plant }: { plant: Plant }) {
  const leaf = foliageColor(plant);
  const level = plant.growthLevel;
  const small = level === 'SEED' || level === 'SPROUT';
  const canopyR = small ? 14 : level === 'YOUNG' ? 22 : 30;
  const trunkTop = small ? 108 : level === 'YOUNG' ? 88 : 60;

  return (
    <>
      <Rect x={45} y={trunkTop} width={10} height={140 - trunkTop} fill={P.woodFurnitureDark} />
      {!small && (
        <>
          <Circle cx={35} cy={trunkTop + 6} r={canopyR * 0.7} fill={leaf} opacity={0.95} />
          <Circle cx={65} cy={trunkTop + 6} r={canopyR * 0.7} fill={leaf} opacity={0.95} />
        </>
      )}
      <Circle cx={50} cy={trunkTop - canopyR * 0.4} r={canopyR} fill={leaf} />
      {level === 'FLOWERING' && (
        <>
          <Circle cx={38} cy={trunkTop - canopyR * 0.6} r={4} fill="#FDF3EC" />
          <Circle cx={58} cy={trunkTop - canopyR * 1.1} r={4} fill="#FDF3EC" />
          <Circle cx={68} cy={trunkTop - canopyR * 0.4} r={4} fill="#FDF3EC" />
          <Circle cx={50} cy={trunkTop - canopyR * 1.3} r={4} fill={P.flowerCoral} />
        </>
      )}
    </>
  );
}
