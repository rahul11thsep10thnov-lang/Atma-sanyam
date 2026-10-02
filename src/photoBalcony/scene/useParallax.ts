// Device-tilt parallax: a few pixels of shift that make the photograph feel
// like a place. Off under reduce-motion and whenever `enabled` is false.
import { useEffect, useRef } from 'react';
import { Animated, Platform } from 'react-native';
import { DeviceMotion } from 'expo-sensors';

export function useParallax(enabled: boolean) {
  const x = useRef(new Animated.Value(0)).current;
  const y = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!enabled || Platform.OS === 'web') return;
    let sub: { remove: () => void } | null = null;
    let fx = 0;
    let fy = 0;
    let cancelled = false;
    DeviceMotion.isAvailableAsync()
      .then((ok) => {
        if (!ok || cancelled) return;
        DeviceMotion.setUpdateInterval(33);
        sub = DeviceMotion.addListener((m) => {
          const r = m.rotation;
          if (!r) return;
          // gamma: left/right tilt, beta: front/back (radians); low-pass filtered
          const tx = Math.max(-1, Math.min(1, (r.gamma ?? 0) / 0.5));
          const ty = Math.max(-1, Math.min(1, ((r.beta ?? 0) - 0.9) / 0.5));
          fx += (tx - fx) * 0.08;
          fy += (ty - fy) * 0.08;
          x.setValue(fx);
          y.setValue(fy);
        });
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
      sub?.remove();
      Animated.parallel([
        Animated.timing(x, { toValue: 0, duration: 400, useNativeDriver: true }),
        Animated.timing(y, { toValue: 0, duration: 400, useNativeDriver: true }),
      ]).start();
    };
  }, [enabled, x, y]);
  return { x, y };
}
