import React, { useEffect, useRef } from 'react';
import { Animated, ViewStyle } from 'react-native';
import Svg, { Circle, Line, Path, Rect } from 'react-native-svg';
import { BalconyObjectState } from '../types';
import { BALCONY_PALETTE as P } from '../config/palette';

interface Props {
  object: BalconyObjectState;
  width: number;
  height: number;
  style?: ViewStyle;
}

const SWAY_MS = 5200;
const GLOW_MS = 3400;

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

/** Generic renderer for every non-plant unlockable (section 6) — furniture,
 * pots, decoration, lighting. New objects only ever need a new `case` here
 * and a catalog entry (`objectCatalog.ts`); nothing about the balcony
 * engine or the layers that place these has to change. */
export function BalconyObjectView({ object, width, height, style }: Props) {
  const sway = useRef(new Animated.Value(0)).current;
  const glow = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    if (object.animationType !== 'SWAY') return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(sway, { toValue: 1, duration: SWAY_MS, useNativeDriver: true }),
        Animated.timing(sway, { toValue: -1, duration: SWAY_MS * 2, useNativeDriver: true }),
        Animated.timing(sway, { toValue: 0, duration: SWAY_MS, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [object.animationType, sway]);

  useEffect(() => {
    if (object.animationType !== 'GLOW') return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(glow, { toValue: 1, duration: GLOW_MS, useNativeDriver: true }),
        Animated.timing(glow, { toValue: 0.55, duration: GLOW_MS, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [object.animationType, glow]);

  const rotate = sway.interpolate({ inputRange: [-1, 1], outputRange: ['-3deg', '3deg'] });
  const isHanging = object.animationType === 'SWAY' || object.asset === 'hanging-lantern';

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          transformOrigin: (isHanging ? 'top' : 'bottom') as 'top' | 'bottom',
          transform: object.animationType === 'SWAY' ? [{ rotate }] : undefined,
        },
        style,
      ]}
    >
      <Svg width={width} height={height} viewBox="0 0 100 140">
        <AssetArt asset={object.asset} glow={glow} />
      </Svg>
    </Animated.View>
  );
}

function AssetArt({ asset, glow }: { asset: string; glow: Animated.Value }) {
  switch (asset) {
    case 'terracotta-pot':
      return (
        <>
          <Path d="M 32 118 L 68 118 L 62 138 L 38 138 Z" fill={P.terracotta} />
          <Rect x={30} y={110} width={40} height={9} rx={2} fill={P.terracottaDark} />
        </>
      );
    case 'hanging-planter':
      return (
        <>
          <Line x1={50} y1={0} x2={50} y2={30} stroke={P.railingBrassDark} strokeWidth={2} />
          <Path d="M 30 30 L 70 30 L 64 52 L 36 52 Z" fill={P.terracotta} />
          <Path d="M 34 52 C 24 66, 22 80, 28 96" stroke={P.leaf} strokeWidth={2.5} fill="none" strokeLinecap="round" />
          <Path d="M 50 52 C 46 70, 48 86, 44 100" stroke={P.leafLight} strokeWidth={2.5} fill="none" strokeLinecap="round" />
          <Path d="M 66 52 C 76 66, 78 80, 72 96" stroke={P.leaf} strokeWidth={2.5} fill="none" strokeLinecap="round" />
        </>
      );
    case 'wood-chair':
      return (
        <>
          <Rect x={30} y={60} width={6} height={70} fill={P.woodFurnitureDark} />
          <Rect x={74} y={60} width={6} height={70} fill={P.woodFurnitureDark} />
          <Rect x={30} y={95} width={50} height={7} fill={P.woodFurniture} />
          <Rect x={26} y={55} width={58} height={7} fill={P.woodFurniture} />
          <Line x1={30} y1={55} x2={30} y2={30} stroke={P.woodFurnitureDark} strokeWidth={6} />
          <Line x1={40} y1={55} x2={40} y2={32} stroke={P.woodFurnitureDark} strokeWidth={5} />
        </>
      );
    case 'brass-wall-plate':
      return (
        <>
          <Circle cx={50} cy={70} r={26} fill={P.brass} opacity={0.9} />
          <Circle cx={50} cy={70} r={19} fill="none" stroke={P.brassLight} strokeWidth={2} />
          <Circle cx={50} cy={70} r={10} fill="none" stroke={P.brassLight} strokeWidth={1.5} />
        </>
      );
    case 'hanging-lantern':
      return (
        <>
          <Line x1={50} y1={0} x2={50} y2={26} stroke={P.railingBrassDark} strokeWidth={2} />
          <AnimatedCircle cx={50} cy={44} r={20} fill={P.brassLight} opacity={glow as unknown as number} />
          <Rect x={38} y={30} width={24} height={30} rx={4} fill={P.brass} />
          <Rect x={34} y={58} width={32} height={5} rx={2} fill={P.brassLight} />
        </>
      );
    default:
      return null;
  }
}
