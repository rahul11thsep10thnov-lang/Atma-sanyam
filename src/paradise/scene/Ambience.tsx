// Life over the garden, in screen space: butterflies that wander, a few
// birds now and then, drifting pollen, fireflies at the foot of the beds
// and clouds that slide across the sky. All of it is quiet by design, and
// most of it switches off at the calm and off motion levels.
import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, Image, StyleSheet, View } from 'react-native';
import Svg, { Ellipse, Path } from 'react-native-svg';
export type MotionLevel = 'full' | 'calm' | 'off';

const CLOUDS = require('../../../assets/paradise/clouds.png');

function Butterfly({ seed, width, height, color }: { seed: number; width: number; height: number; color: string }) {
  const x = useRef(new Animated.Value(0)).current;
  const y = useRef(new Animated.Value(0)).current;
  const flap = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const a = Animated.loop(
      Animated.sequence([
        Animated.timing(x, { toValue: 1, duration: 14000 + seed * 1900, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(x, { toValue: 0, duration: 15000 + seed * 1300, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    );
    const b = Animated.loop(
      Animated.sequence([
        Animated.timing(y, { toValue: 1, duration: 5200 + seed * 700, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(y, { toValue: 0, duration: 4700 + seed * 900, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    );
    const f = Animated.loop(Animated.sequence([Animated.timing(flap, { toValue: 1, duration: 160, useNativeDriver: true }), Animated.timing(flap, { toValue: 0, duration: 190, useNativeDriver: true })]));
    a.start();
    b.start();
    f.start();
    return () => {
      a.stop();
      b.stop();
      f.stop();
    };
  }, [x, y, flap, seed]);
  const left = 20 + (seed * 73) % Math.max(60, width - 120);
  const top = height * 0.3 + ((seed * 131) % Math.max(60, height * 0.4));
  const tx = x.interpolate({ inputRange: [0, 1], outputRange: [0, 90 + (seed % 3) * 50] });
  const tyv = y.interpolate({ inputRange: [0, 1], outputRange: [0, -(40 + (seed % 2) * 30)] });
  const sx = flap.interpolate({ inputRange: [0, 1], outputRange: [1, 0.25] });
  return (
    <Animated.View pointerEvents="none" style={{ position: 'absolute', left, top, transform: [{ translateX: tx }, { translateY: tyv }] }}>
      <Animated.View style={{ transform: [{ scaleX: sx }] }}>
        <Svg width={18} height={14} viewBox="0 0 18 14">
          <Ellipse cx="5" cy="6" rx="5" ry="4.2" fill={color} opacity={0.92} />
          <Ellipse cx="13" cy="6" rx="5" ry="4.2" fill={color} opacity={0.92} />
          <Ellipse cx="9" cy="7" rx="1.2" ry="3.5" fill="#3a2a1a" />
        </Svg>
      </Animated.View>
    </Animated.View>
  );
}

function Birds({ width, height }: { width: number; height: number }) {
  const x = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    let alive = true;
    const fly = () => {
      if (!alive) return;
      x.setValue(0);
      Animated.sequence([Animated.delay(9000 + Math.random() * 20000), Animated.timing(x, { toValue: 1, duration: 16000, easing: Easing.linear, useNativeDriver: true })]).start(({ finished }) => finished && fly());
    };
    fly();
    return () => {
      alive = false;
    };
  }, [x]);
  const tx = x.interpolate({ inputRange: [0, 1], outputRange: [width + 60, -120] });
  const ty = x.interpolate({ inputRange: [0, 0.5, 1], outputRange: [height * 0.12, height * 0.08, height * 0.14] });
  return (
    <Animated.View pointerEvents="none" style={{ position: 'absolute', left: 0, top: 0, transform: [{ translateX: tx }, { translateY: ty }], opacity: 0.55 }}>
      <Svg width={110} height={40} viewBox="0 0 110 40">
        {[
          [10, 20],
          [34, 10],
          [58, 18],
          [80, 8],
          [100, 16],
        ].map(([bx, by], i) => (
          <Path key={i} d={`M${bx - 6} ${by + 3} q6 -6 6 0 q0 -6 6 0`} stroke="#2a1f16" strokeWidth={1.6} fill="none" />
        ))}
      </Svg>
    </Animated.View>
  );
}

function Pollen({ count, width, height }: { count: number; width: number; height: number }) {
  const vals = useRef(Array.from({ length: count }, () => new Animated.Value(0))).current;
  useEffect(() => {
    const loops = vals.map((v, i) => Animated.loop(Animated.timing(v, { toValue: 1, duration: 9000 + (i % 5) * 2200, easing: Easing.linear, useNativeDriver: true })));
    loops.forEach((l, i) => setTimeout(() => l.start(), i * 530));
    return () => loops.forEach((l) => l.stop());
  }, [vals]);
  return (
    <>
      {vals.map((v, i) => {
        const left = ((i * 97) % Math.max(1, width - 10)) + 5;
        const base = height * 0.95 - ((i * 53) % Math.max(1, height * 0.5));
        return (
          <Animated.View
            key={i}
            pointerEvents="none"
            style={{
              position: 'absolute',
              left,
              top: base,
              width: 3 + (i % 2),
              height: 3 + (i % 2),
              borderRadius: 3,
              backgroundColor: '#FFF2C8',
              opacity: v.interpolate({ inputRange: [0, 0.15, 0.85, 1], outputRange: [0, 0.75, 0.6, 0] }),
              transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [0, -(120 + (i % 4) * 40)] }) }, { translateX: v.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, (i % 2 ? 1 : -1) * 18, 0] }) }],
            }}
          />
        );
      })}
    </>
  );
}

function Fireflies({ count, width, height }: { count: number; width: number; height: number }) {
  const vals = useRef(Array.from({ length: count }, () => new Animated.Value(0))).current;
  useEffect(() => {
    const loops = vals.map((v, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(4000 + (i * 1700) % 9000),
          Animated.timing(v, { toValue: 1, duration: 1400, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(v, { toValue: 0, duration: 1600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        ]),
      ),
    );
    loops.forEach((l) => l.start());
    return () => loops.forEach((l) => l.stop());
  }, [vals]);
  return (
    <>
      {vals.map((v, i) => (
        <Animated.View
          key={i}
          pointerEvents="none"
          style={{ position: 'absolute', left: ((i * 149) % Math.max(1, width - 20)) + 10, top: height * 0.55 + ((i * 71) % Math.max(1, height * 0.3)), width: 6, height: 6, borderRadius: 3, backgroundColor: '#FFE98A', opacity: v, transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [0, -14] }) }] }}
        />
      ))}
    </>
  );
}

export function Ambience({ width, height, motion, skyBottom }: { width: number; height: number; motion: MotionLevel; skyBottom: number }) {
  const cloud = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (motion === 'off') return;
    const loop = Animated.loop(Animated.timing(cloud, { toValue: 1, duration: 140000, easing: Easing.linear, useNativeDriver: true }));
    loop.start();
    return () => loop.stop();
  }, [cloud, motion]);
  const butterflies = useMemo(() => (motion === 'full' ? [1, 2, 3, 4] : []), [motion]);
  if (motion === 'off') return null;
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <View style={{ position: 'absolute', left: 0, top: 0, width, height: skyBottom, overflow: 'hidden', opacity: 0.5 }}>
        <Animated.Image source={CLOUDS} resizeMode="repeat" style={{ position: 'absolute', left: 0, top: 0, width: width * 2 + 1024, height: skyBottom, transform: [{ translateX: cloud.interpolate({ inputRange: [0, 1], outputRange: [0, -1024] }) }] }} />
      </View>
      {motion === 'full' && <Birds width={width} height={height} />}
      <Pollen count={motion === 'full' ? 14 : 6} width={width} height={height} />
      {motion === 'full' && <Fireflies count={7} width={width} height={height} />}
      {butterflies.map((s, i) => (
        <Butterfly key={s} seed={s} width={width} height={height} color={['#F6A8C8', '#F9D56E', '#9FD3F2', '#F2B4A0'][i]} />
      ))}
    </View>
  );
}

export { Image as AmbienceImage };
