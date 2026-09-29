import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  DimensionValue,
  Easing,
  ImageSourcePropType,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';

type Props = {
  source: ImageSourcePropType;
  style?: ViewStyle;
  children?: React.ReactNode;
};

const CYCLE_MS = 50000; // one full slow pan/zoom breath, ~50s — calm, not noticeable frame-to-frame
const PARTICLES = [
  { left: '12%', size: 5, delay: 0, duration: 10000 },
  { left: '30%', size: 7, delay: 1800, duration: 12500 },
  { left: '52%', size: 4, delay: 3600, duration: 9500 },
  { left: '71%', size: 6, delay: 900, duration: 11500 },
  { left: '86%', size: 5, delay: 2700, duration: 10800 },
] as const;

function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled?.()
      .then((value) => mounted && setReduced(!!value))
      .catch(() => {});
    const subscription = AccessibilityInfo.addEventListener?.('reduceMotionChanged', (value) =>
      setReduced(!!value),
    );
    return () => {
      mounted = false;
      subscription?.remove?.();
    };
  }, []);
  return reduced;
}

/**
 * A calm, battery-friendly "living" wallpaper: a slow Ken Burns pan/zoom on the photo
 * plus a few soft drifting light particles. The existing wallpaper artwork is kept
 * exactly as-is — this only adds gentle motion on top of it.
 *
 * Pure Animated API with useNativeDriver, so it runs on the native thread at almost
 * no cost and stays smooth for the length of a full focus session. Honors the OS
 * "reduce motion" accessibility setting by freezing to a plain static image.
 */
export function AnimatedWallpaper({ source, style, children }: Props) {
  const reducedMotion = useReducedMotion();
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (reducedMotion) return;
    const loop = Animated.loop(
      Animated.timing(progress, {
        toValue: 1,
        duration: CYCLE_MS,
        easing: Easing.inOut(Easing.sin),
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [progress, reducedMotion]);

  const scale = progress.interpolate({ inputRange: [0, 1], outputRange: [1.06, 1.16] });
  const translateX = progress.interpolate({ inputRange: [0, 1], outputRange: [-10, 10] });
  const translateY = progress.interpolate({ inputRange: [0, 1], outputRange: [8, -8] });

  return (
    <View style={[styles.container, style]}>
      <Animated.Image
        source={source}
        resizeMode="cover"
        style={[
          styles.image,
          reducedMotion ? undefined : { transform: [{ scale }, { translateX }, { translateY }] },
        ]}
      />
      {!reducedMotion &&
        PARTICLES.map((particle, index) => <Particle key={index} {...particle} />)}
      <View style={styles.content}>{children}</View>
    </View>
  );
}

function Particle({
  left,
  size,
  delay,
  duration,
}: {
  left: DimensionValue;
  size: number;
  delay: number;
  duration: number;
}) {
  const rise = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(rise, { toValue: 1, duration, easing: Easing.linear, useNativeDriver: true }),
        Animated.timing(rise, { toValue: 0, duration: 0, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [rise, delay, duration]);

  const translateY = rise.interpolate({ inputRange: [0, 1], outputRange: [40, -260] });
  const opacity = rise.interpolate({ inputRange: [0, 0.15, 0.8, 1], outputRange: [0, 0.55, 0.3, 0] });

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.particle,
        { left, width: size, height: size, borderRadius: size / 2, opacity, transform: [{ translateY }] },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, overflow: 'hidden' },
  image: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  content: { flex: 1 },
  particle: {
    position: 'absolute',
    bottom: 0,
    backgroundColor: 'rgba(255, 235, 214, 0.9)',
    shadowColor: '#FFE0B2',
    shadowOpacity: 0.9,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 },
  },
});
