// Drag helper on PanResponder (works on web, Android and iOS without extra
// native modules). Returns pan handlers for a draggable and reports the
// final position in board coordinates. Callers decide what a drop means.
import { useMemo, useRef } from 'react';
import { Animated, PanResponder } from 'react-native';

export interface DragCallbacks {
  onStart?: () => void;
  onMove?: (x: number, y: number) => void;
  /** dx/dy are the total displacement since the drag began. */
  onEnd: (dx: number, dy: number) => void;
  disabled?: boolean;
}

export function useDrag({ onStart, onMove, onEnd, disabled }: DragCallbacks) {
  const pan = useRef(new Animated.ValueXY()).current;
  const cb = useRef({ onStart, onMove, onEnd, disabled });
  cb.current = { onStart, onMove, onEnd, disabled };
  const responder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => !cb.current.disabled,
        onMoveShouldSetPanResponder: (_e, g) => !cb.current.disabled && (Math.abs(g.dx) > 2 || Math.abs(g.dy) > 2),
        onPanResponderGrant: () => {
          pan.setValue({ x: 0, y: 0 });
          cb.current.onStart?.();
        },
        onPanResponderMove: (_e, g) => {
          pan.setValue({ x: g.dx, y: g.dy });
          cb.current.onMove?.(g.dx, g.dy);
        },
        onPanResponderRelease: (_e, g) => {
          cb.current.onEnd(g.dx, g.dy);
          pan.setValue({ x: 0, y: 0 });
        },
        onPanResponderTerminate: () => pan.setValue({ x: 0, y: 0 }),
      }),
    [pan]
  );
  return { pan, panHandlers: responder.panHandlers };
}

/** A responder that reports pointer positions relative to the element (for drawing and swipes). */
export function usePointer(handlers: { onDown?: (x: number, y: number) => void; onMove?: (x: number, y: number) => void; onUp?: (x: number, y: number, dx: number, dy: number) => void; disabled?: boolean }) {
  const cb = useRef(handlers);
  cb.current = handlers;
  return useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => !cb.current.disabled,
        onMoveShouldSetPanResponder: () => !cb.current.disabled,
        onPanResponderGrant: (e) => cb.current.onDown?.(e.nativeEvent.locationX, e.nativeEvent.locationY),
        onPanResponderMove: (e) => cb.current.onMove?.(e.nativeEvent.locationX, e.nativeEvent.locationY),
        onPanResponderRelease: (e, g) => cb.current.onUp?.(e.nativeEvent.locationX, e.nativeEvent.locationY, g.dx, g.dy),
      }).panHandlers,
    []
  );
}
