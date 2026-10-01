import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import Svg, { Circle, Line } from 'react-native-svg';
import { EnvironmentVisual } from '../../config/environmentConfig';
import { useSceneMetrics } from '../SceneMetrics';

interface Props {
  visual: EnvironmentVisual;
}

const STAR_POSITIONS = [
  { x: 30, y: 40 }, { x: 80, y: 90 }, { x: 140, y: 30 }, { x: 190, y: 70 },
  { x: 240, y: 110 }, { x: 300, y: 50 }, { x: 330, y: 130 }, { x: 60, y: 150 },
  { x: 170, y: 140 }, { x: 270, y: 20 }, { x: 20, y: 100 }, { x: 210, y: 180 },
];

const FIREFLY_ANCHORS = [
  { x: 90, y: 480 }, { x: 180, y: 500 }, { x: 260, y: 470 }, { x: 130, y: 520 }, { x: 300, y: 500 },
];

const RAIN_X_POSITIONS = [10, 35, 60, 90, 115, 140, 168, 195, 220, 248, 272, 300, 325, 350, 22, 78, 200, 288];

/** Layer 8 — atmospheric effects: a few still stars with a shared slow
 * twinkle, fireflies that drift at night, and light rain. Each effect is
 * cheap on purpose (section 14) — a shared twinkle instead of N animated
 * stars, five fireflies instead of a swarm, ~18 rain streaks instead of a
 * full particle system — because the balcony has to stay smooth while a
 * focus session's timer is also running. */
export function AtmosphereLayer({ visual }: Props) {
  const { width, height } = useSceneMetrics();
  const twinkle = useRef(new Animated.Value(0.6)).current;
  const rainFall = useRef(new Animated.Value(0)).current;
  const fireflyDrift = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visual.showStars) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(twinkle, { toValue: 1, duration: 4200, useNativeDriver: true }),
        Animated.timing(twinkle, { toValue: 0.55, duration: 4200, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [visual.showStars, twinkle]);

  useEffect(() => {
    if (!visual.showRain) return;
    const loop = Animated.loop(Animated.timing(rainFall, { toValue: 1, duration: 550, useNativeDriver: true }));
    loop.start();
    return () => loop.stop();
  }, [visual.showRain, rainFall]);

  useEffect(() => {
    if (!visual.showFireflies) return;
    const loop = Animated.loop(
      Animated.timing(fireflyDrift, { toValue: 1, duration: 9000, useNativeDriver: true }),
    );
    loop.start();
    return () => loop.stop();
  }, [visual.showFireflies, fireflyDrift]);

  const rainY = rainFall.interpolate({ inputRange: [0, 1], outputRange: [0, 22] });

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {visual.showStars && (
        <Animated.View style={[styles.starLayer, { opacity: twinkle }]}>
          <Svg width={width} height={height * 0.32} viewBox="0 0 360 200">
            {STAR_POSITIONS.map((s, i) => (
              <Circle key={i} cx={s.x} cy={s.y} r={1.6} fill="#F6F0FF" />
            ))}
          </Svg>
        </Animated.View>
      )}

      {visual.showFireflies && FIREFLY_ANCHORS.map((f, i) => <Firefly key={i} anchor={f} drift={fireflyDrift} index={i} />)}

      {visual.showRain && (
        <Animated.View style={[styles.rainLayer, { transform: [{ translateY: rainY }] }]}>
          <Svg width={width} height={height + 24} viewBox="0 0 360 664">
            {RAIN_X_POSITIONS.map((x, i) => (
              <Line
                key={i}
                x1={x}
                y1={-20}
                x2={x - 10}
                y2={20}
                stroke="#E7EEF5"
                strokeOpacity={0.5}
                strokeWidth={1.5}
                transform={`translate(0, ${(i * 37) % 664})`}
              />
            ))}
          </Svg>
        </Animated.View>
      )}
    </View>
  );
}

function Firefly({ anchor, drift, index }: { anchor: { x: number; y: number }; drift: Animated.Value; index: number }) {
  const { width, height } = useSceneMetrics();
  const scaleX = width / 360;
  const scaleY = height / 640;
  const phase = index * 0.37;

  const dx = drift.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, 14 * Math.cos(phase * Math.PI), 0],
  });
  const dy = drift.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, -16 * Math.sin(phase * Math.PI), 0],
  });
  const glow = drift.interpolate({ inputRange: [0, 0.3, 0.6, 1], outputRange: [0.2, 0.9, 0.3, 0.2] });

  return (
    <Animated.View
      style={{
        position: 'absolute',
        left: anchor.x * scaleX - 3,
        top: anchor.y * scaleY - 3,
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#F4E7A0',
        opacity: glow,
        transform: [{ translateX: dx }, { translateY: dy }],
      }}
    />
  );
}

const styles = StyleSheet.create({
  starLayer: { position: 'absolute', top: 0, left: 0, right: 0, height: '32%' },
  rainLayer: { position: 'absolute', top: -24, left: 0, right: 0, bottom: 0 },
});
