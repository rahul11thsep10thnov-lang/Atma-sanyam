import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, Ellipse, LinearGradient, Rect, Stop } from 'react-native-svg';
import { EnvironmentVisual } from '../../config/environmentConfig';
import { useSceneMetrics } from '../SceneMetrics';

interface Props {
  visual: EnvironmentVisual;
}

// Extremely slow — a cloud crossing the whole sky over a minute, per the
// "clouds: extremely slow movement" note in the animation spec.
const CLOUD_DRIFT_MS = 70000;

/** Layer 0 — sky/environment: the gradient, the sun/moon glow, and clouds
 * that barely move. Everything else in the scene reads its lighting off
 * `visual`, so switching environments only ever means swapping this data,
 * never touching rendering code. */
export function SkyLayer({ visual }: Props) {
  const { width, height } = useSceneMetrics();
  const drift = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(drift, { toValue: 1, duration: CLOUD_DRIFT_MS, useNativeDriver: true }),
    );
    loop.start();
    return () => loop.stop();
  }, [drift]);

  const cloudX = drift.interpolate({ inputRange: [0, 1], outputRange: [-30, 30] });

  return (
    <View style={StyleSheet.absoluteFill}>
      <Svg width={width} height={height} viewBox="0 0 360 640">
        <Defs>
          <LinearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={visual.skyTop} stopOpacity={1} />
            <Stop offset="1" stopColor={visual.skyBottom} stopOpacity={1} />
          </LinearGradient>
          <LinearGradient id="skyGlow" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={visual.glowColor} stopOpacity={visual.glowOpacity} />
            <Stop offset="1" stopColor={visual.glowColor} stopOpacity={0} />
          </LinearGradient>
        </Defs>
        <Rect x={0} y={0} width={360} height={640} fill="url(#sky)" />
        <Circle cx={visual.glowX * 360} cy={visual.glowY * 640} r={130} fill="url(#skyGlow)" />
      </Svg>
      <Animated.View
        style={[styles.cloudLayer, { opacity: visual.cloudOpacity, transform: [{ translateX: cloudX }] }]}
      >
        <Svg width={width} height={height * 0.4} viewBox="0 0 360 260">
          <Cloud cx={70} cy={70} scale={1} />
          <Cloud cx={230} cy={40} scale={0.7} />
          <Cloud cx={320} cy={110} scale={0.9} />
        </Svg>
      </Animated.View>
    </View>
  );
}

function Cloud({ cx, cy, scale }: { cx: number; cy: number; scale: number }) {
  return (
    <>
      <Ellipse cx={cx} cy={cy} rx={38 * scale} ry={16 * scale} fill="#FFFFFF" fillOpacity={0.55} />
      <Ellipse cx={cx + 24 * scale} cy={cy + 4 * scale} rx={26 * scale} ry={13 * scale} fill="#FFFFFF" fillOpacity={0.5} />
      <Ellipse cx={cx - 22 * scale} cy={cy + 6 * scale} rx={22 * scale} ry={11 * scale} fill="#FFFFFF" fillOpacity={0.45} />
    </>
  );
}

const styles = StyleSheet.create({
  cloudLayer: { position: 'absolute', top: 0, left: 0, right: 0, height: '40%' },
});
