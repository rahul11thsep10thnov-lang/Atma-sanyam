// Animated hand-over between the isometric world view and the side activity
// view: the outgoing view scales down and fades while the incoming one
// scales up from 0.94 and fades in (400 ms). With reduced motion the swap is
// an instant cut. Both children are built by the screen from the same world
// state, so nothing is duplicated here.
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import type { ViewStyle } from 'react-native';
import type { CameraKind } from '../../core/locations';

export interface CameraTransitionProps {
  kind: CameraKind;
  iso: React.ReactNode;
  side: React.ReactNode;
  reducedMotion?: boolean;
  duration?: number;
  style?: ViewStyle;
  onTransitionEnd?: (kind: CameraKind) => void;
}

export function CameraTransition({ kind, iso, side, reducedMotion = false, duration = 400, style, onTransitionEnd }: CameraTransitionProps) {
  const progress = useRef(new Animated.Value(kind === 'side' ? 1 : 0)).current;
  const [mounted, setMounted] = useState<CameraKind>(kind);
  const [transitioning, setTransitioning] = useState(false);
  useEffect(() => {
    if (kind === mounted) return;
    if (reducedMotion) { progress.setValue(kind === 'side' ? 1 : 0); setMounted(kind); onTransitionEnd?.(kind); return; }
    setTransitioning(true);
    Animated.timing(progress, { toValue: kind === 'side' ? 1 : 0, duration, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start(({ finished }) => {
      if (finished) { setMounted(kind); setTransitioning(false); onTransitionEnd?.(kind); }
    });
  }, [kind, mounted, reducedMotion, duration, progress, onTransitionEnd]);

  const isoStyle = { opacity: progress.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }), transform: [{ scale: progress.interpolate({ inputRange: [0, 1], outputRange: [1, 1.06] }) }] };
  const sideStyle = { opacity: progress, transform: [{ scale: progress.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1] }) }] };
  const showIso = kind === 'iso' || mounted === 'iso' || transitioning;
  const showSide = kind === 'side' || mounted === 'side' || transitioning;
  return (
    <View style={[styles.frame, style]}>
      {showIso && <Animated.View style={[StyleSheet.absoluteFill, isoStyle]} pointerEvents={kind === 'iso' ? 'auto' : 'none'}>{iso}</Animated.View>}
      {showSide && <Animated.View style={[StyleSheet.absoluteFill, sideStyle]} pointerEvents={kind === 'side' ? 'auto' : 'none'}>{side}</Animated.View>}
    </View>
  );
}

/** Convenience: renders whichever view the camera asks for, with the transition. */
export function CameraFrame(props: CameraTransitionProps) {
  return <CameraTransition {...props} />;
}

const styles = StyleSheet.create({ frame: { flex: 1, overflow: 'hidden' } });
