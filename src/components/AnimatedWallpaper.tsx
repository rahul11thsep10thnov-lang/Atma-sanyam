import React, { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, StyleSheet, View, ViewStyle } from 'react-native';
import Svg, { Defs, LinearGradient, Path, RadialGradient, Rect, Stop } from 'react-native-svg';

type Props = {
  style?: ViewStyle;
  children?: React.ReactNode;
};

const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedRadialGradient = Animated.createAnimatedComponent(RadialGradient);

// Colors sampled straight from the wallpaper photo, so this vector version is the
// same design — nothing added, its own curves and shading just move themselves.
const CREAM = '#FDF3EC';
const BLUSH = '#FCE2DE';
const TAN = '#FBD0AE';
const PINK = '#FBA2A4';

const SHADE_MS = 24000; // one slow breath of the color shading
const CURVE_MS = 28000; // one slow undulation of the ribbon curves

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

function useLoop(durationMs: number, enabled: boolean) {
  const value = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!enabled) return;
    // SVG attributes (path data, gradient position) can't use the native driver —
    // they aren't transforms — so this runs on the JS thread. The cycle is slow
    // (20-30s) and touches a handful of numbers, so the cost stays negligible.
    const loop = Animated.loop(
      Animated.timing(value, { toValue: 1, duration: durationMs, useNativeDriver: false }),
    );
    loop.start();
    return () => loop.stop();
  }, [value, durationMs, enabled]);
  return value;
}

// Same command shape (M + one C, 8 numbers) in every keyframe so Animated can morph
// each number in step — this is what actually bends the ribbon over time.
const RIBBON_HIGHLIGHT = [
  'M -20,250 C 90,300 170,120 400,60',
  'M -20,220 C 110,150 190,290 400,90',
];
const RIBBON_TAN = [
  'M -20,430 C 100,480 200,340 400,300',
  'M -20,400 C 120,340 210,470 400,330',
];
const RIBBON_PINK = [
  'M -20,530 C 100,500 220,580 400,540',
  'M -20,555 C 110,590 230,510 400,565',
];

/**
 * The wallpaper's own curves and color shading animate themselves — a slow, seamless
 * loop, no added elements. Two soft radial-gradient blobs (the same tan/pink shading
 * as the artwork) drift and pulse, and three flowing ribbon paths morph between close
 * bezier keyframes so the curves themselves bend. Honors the OS "reduce motion"
 * setting by rendering a single still frame.
 */
export function AnimatedWallpaper({ style, children }: Props) {
  const reducedMotion = useReducedMotion();
  const curve = useLoop(CURVE_MS, !reducedMotion);
  const shade = useLoop(SHADE_MS, !reducedMotion);

  const dHighlight = curve.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [RIBBON_HIGHLIGHT[0], RIBBON_HIGHLIGHT[1], RIBBON_HIGHLIGHT[0]],
  });
  const dTan = curve.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [RIBBON_TAN[0], RIBBON_TAN[1], RIBBON_TAN[0]],
  });
  const dPink = curve.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [RIBBON_PINK[0], RIBBON_PINK[1], RIBBON_PINK[0]],
  });

  const tanCx = shade.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.72, 0.85, 0.72] });
  const tanR = shade.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.5, 0.58, 0.5] });
  const pinkCy = shade.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.92, 0.82, 0.92] });
  const pinkR = shade.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.52, 0.44, 0.52] });

  return (
    <View style={[styles.container, style]}>
      <Svg width="100%" height="100%" viewBox="0 0 360 640" preserveAspectRatio="xMidYMid slice">
        <Defs>
          <LinearGradient id="base" x1="0" y1="0" x2="0.3" y2="1">
            <Stop offset="0" stopColor={CREAM} stopOpacity={1} />
            <Stop offset="1" stopColor={BLUSH} stopOpacity={1} />
          </LinearGradient>
          <AnimatedRadialGradient
            id="tan"
            cx={(reducedMotion ? 0.72 : tanCx) as unknown as number}
            cy={0.5}
            r={(reducedMotion ? 0.5 : tanR) as unknown as number}
          >
            <Stop offset="0" stopColor={TAN} stopOpacity={0.95} />
            <Stop offset="1" stopColor={TAN} stopOpacity={0} />
          </AnimatedRadialGradient>
          <AnimatedRadialGradient
            id="pink"
            cx={0.05}
            cy={(reducedMotion ? 0.92 : pinkCy) as unknown as number}
            r={(reducedMotion ? 0.52 : pinkR) as unknown as number}
          >
            <Stop offset="0" stopColor={PINK} stopOpacity={0.9} />
            <Stop offset="1" stopColor={PINK} stopOpacity={0} />
          </AnimatedRadialGradient>
        </Defs>

        <Rect x={0} y={0} width={360} height={640} fill="url(#base)" />
        <Rect x={0} y={0} width={360} height={640} fill="url(#tan)" />
        <Rect x={0} y={0} width={360} height={640} fill="url(#pink)" />

        <AnimatedPath
          d={(reducedMotion ? RIBBON_TAN[0] : dTan) as unknown as string}
          stroke={TAN}
          strokeOpacity={0.4}
          strokeWidth={64}
          fill="none"
          strokeLinecap="round"
        />
        <AnimatedPath
          d={(reducedMotion ? RIBBON_PINK[0] : dPink) as unknown as string}
          stroke={PINK}
          strokeOpacity={0.35}
          strokeWidth={56}
          fill="none"
          strokeLinecap="round"
        />
        <AnimatedPath
          d={(reducedMotion ? RIBBON_HIGHLIGHT[0] : dHighlight) as unknown as string}
          stroke="#FFFFFF"
          strokeOpacity={0.55}
          strokeWidth={16}
          fill="none"
          strokeLinecap="round"
        />
      </Svg>
      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, overflow: 'hidden', backgroundColor: CREAM },
  content: { flex: 1, position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
});
