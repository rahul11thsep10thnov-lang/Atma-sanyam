import { useMemo, useRef } from 'react';
import { Animated, GestureResponderHandlers, PanResponder } from 'react-native';

// A drag across roughly a third of the screen reaches the clamp, so even a
// big, deliberate swipe never sends the background layers flying.
const MAX_OFFSET = 14;
const DRAG_DIVISOR = 8;

export interface Parallax {
  panHandlers: GestureResponderHandlers;
  /** Style to spread onto a layer's wrapping Animated.View — larger
   * `strength` values (per the spec: sky 0.2, background 0.5, architecture
   * 1, plants 1.5, foreground 2) drift further for the same drag. Typed
   * loosely (it's only ever spread into an Animated.View's style array) —
   * matching react-native-svg/Animated's own transform typings exactly here
   * would buy nothing a reader couldn't already see from the implementation. */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  layerStyle: (strength: number) => any;
}

/**
 * A lightweight stand-in for device-tilt parallax (section 9) built entirely
 * on RN's core PanResponder — no new native module, so it works today
 * without a rebuild. A finger drag across the balcony nudges each layer by
 * its own strength and springs back to center on release. Gated by the
 * `enabled` flag wired to the "Motion Effects: ON/OFF" setting; swapping
 * this hook's internals for a real accelerometer feed later (e.g.
 * expo-sensors) wouldn't need to touch BalconyScene or any layer at all —
 * they only ever consume `layerStyle`.
 */
export function useParallax(enabled: boolean): Parallax {
  const pan = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;

  const responder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => enabled,
        onMoveShouldSetPanResponder: () => enabled,
        onPanResponderMove: (_evt, gesture) => {
          const x = Math.max(-MAX_OFFSET, Math.min(MAX_OFFSET, gesture.dx / DRAG_DIVISOR));
          const y = Math.max(-MAX_OFFSET, Math.min(MAX_OFFSET, gesture.dy / DRAG_DIVISOR));
          pan.setValue({ x, y });
        },
        onPanResponderRelease: () => {
          Animated.spring(pan, { toValue: { x: 0, y: 0 }, useNativeDriver: true, friction: 6 }).start();
        },
        onPanResponderTerminate: () => {
          Animated.spring(pan, { toValue: { x: 0, y: 0 }, useNativeDriver: true, friction: 6 }).start();
        },
      }),
    [enabled, pan],
  );

  const layerStyle = (strength: number) => ({
    transform: [
      { translateX: Animated.multiply(pan.x, strength) },
      { translateY: Animated.multiply(pan.y, strength) },
    ],
  });

  return { panHandlers: responder.panHandlers, layerStyle };
}
