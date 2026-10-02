// Customize mode. Every object was photographed (rendered) in each place it
// can stand, so moving one is choosing a place: drag it and it snaps to the
// nearest spot it fits, shown as it really looks there. Guides exist only
// in this mode — outside it the balcony is just a balcony.
import React, { useMemo, useRef, useState } from 'react';
import { PanResponder, StyleSheet, View } from 'react-native';
import { PACK } from '../pack.generated';
import { BalconyState, moveItem, occupant, PlacedItem, slotsFor, variantOf } from '../model';
import { SceneGeometry, SceneObject } from '../scene/BalconyScene';
import { Tactile } from '../../ui/Pressable';

interface Props {
  state: BalconyState;
  geometry: SceneGeometry;
  selected: PlacedItem | null;
  onSelect: (p: PlacedItem | null) => void;
  onChange: (next: BalconyState) => void;
  /** The item being dragged; the scene hides it while its ghost is shown. */
  onDragging: (uid: string | null) => void;
}

const FOCUS = PACK.focusPlant.slot;

/** Nearest object under a point, judged by its body rather than its shadow. */
export function pickItem(state: BalconyState, x: number, y: number, g: SceneGeometry): PlacedItem | null {
  const px = (x - g.ox) / g.scale;
  const py = (y - g.oy) / g.scale;
  let best: { p: PlacedItem; score: number } | null = null;
  for (const p of state.placed) {
    const v = variantOf(p);
    if (!v) continue;
    const [rx, ry, rw, rh] = v.rect;
    if (px < rx || px > rx + rw || py < ry || py > ry + rh) continue;
    const kind = PACK.slots[p.slot]?.kind;
    // the body sits above the floor pivot (or below a hook)
    const bodyY = kind === 'hanging' ? (v.pivot[1] + ry + rh) / 2 : kind === 'wall' ? ry + rh / 2 : (ry + v.pivot[1]) / 2;
    const d = Math.hypot(px - v.pivot[0], (py - bodyY) * 0.8) + v.depth * 6 + (PACK.items[p.itemId]?.flat ? 60 : 0);
    if (!best || d < best.score) best = { p, score: d };
  }
  return best?.p ?? null;
}

export function EditLayer({ state, geometry: g, selected, onSelect, onChange, onDragging }: Props) {
  const [target, setTarget] = useState<string | null>(null);
  const drag = useRef<{ p: PlacedItem; dx: number; dy: number; moved: boolean } | null>(null);
  const live = useRef({ state, g, selected });
  live.current = { state, g, selected };

  const toScreen = (pt: [number, number]) => [g.ox + pt[0] * g.scale, g.oy + pt[1] * g.scale] as const;

  const nearestSlot = (p: PlacedItem, sx: number, sy: number) => {
    const { g: geo } = live.current;
    let best: { slot: string; d: number } | null = null;
    for (const slot of slotsFor(p.itemId)) {
      if (slot === FOCUS) continue;
      const a = PACK.slots[slot].anchor;
      const d = Math.hypot(geo.ox + a[0] * geo.scale - sx, geo.oy + a[1] * geo.scale - sy);
      if (!best || d < best.d) best = { slot, d };
    }
    return best?.slot ?? p.slot;
  };

  const responder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (e) => {
          const { state: st, g: geo } = live.current;
          const hit = pickItem(st, e.nativeEvent.pageX, e.nativeEvent.pageY, geo);
          if (!hit || PACK.slots[hit.slot]?.kind === 'wall') {
            drag.current = null;
            return;
          }
          const a = PACK.slots[hit.slot].anchor;
          drag.current = { p: hit, dx: geo.ox + a[0] * geo.scale - e.nativeEvent.pageX, dy: geo.oy + a[1] * geo.scale - e.nativeEvent.pageY, moved: false };
        },
        onPanResponderMove: (e, gs) => {
          const d = drag.current;
          if (!d) return;
          if (!d.moved && Math.hypot(gs.dx, gs.dy) < 8) return;
          if (!d.moved) {
            d.moved = true;
            onSelect(d.p);
            onDragging(d.p.uid);
          }
          setTarget(nearestSlot(d.p, e.nativeEvent.pageX + d.dx, e.nativeEvent.pageY + d.dy));
        },
        onPanResponderRelease: (e) => {
          const d = drag.current;
          drag.current = null;
          const { state: st, g: geo } = live.current;
          if (d?.moved) {
            const slot = nearestSlot(d.p, e.nativeEvent.pageX + d.dx, e.nativeEvent.pageY + d.dy);
            setTarget(null);
            onDragging(null);
            if (slot !== d.p.slot) {
              const next = moveItem(st, d.p.uid, slot);
              onChange(next);
              onSelect(next.placed.find((x) => x.uid === d.p.uid) ?? null);
            }
            return;
          }
          // a tap: select what's under the finger, or clear
          onSelect(pickItem(st, e.nativeEvent.pageX, e.nativeEvent.pageY, geo));
        },
        onPanResponderTerminate: () => {
          drag.current = null;
          setTarget(null);
          onDragging(null);
        },
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [onSelect, onChange, onDragging],
  );

  const sel = selected ? state.placed.find((x) => x.uid === selected.uid) ?? null : null;
  const ghost = sel && target ? PACK.items[sel.itemId]?.variants[target]?.[0] : null;
  const guides = sel ? slotsFor(sel.itemId).filter((s) => s !== FOCUS && PACK.slots[s].kind !== 'wall') : [];

  return (
    <View style={StyleSheet.absoluteFill} {...responder.panHandlers}>
      {/* every movable object gets a soft marker at its base */}
      {!sel &&
        state.placed
          .filter((p) => PACK.slots[p.slot] && PACK.slots[p.slot].kind !== 'wall')
          .map((p) => {
            const [x, y] = toScreen(PACK.slots[p.slot].anchor);
            return <View key={p.uid} pointerEvents="none" style={[styles.dot, { left: x - 5, top: y - 5 }]} />;
          })}

      {/* where the selected object can go */}
      {guides.map((slot) => {
        const s = PACK.slots[slot];
        const [x, y] = toScreen(s.anchor);
        const here = sel?.slot === slot;
        const hot = target === slot;
        const taken = !here && !!occupant(state, slot);
        const w = (s.kind === 'hanging' ? 34 : 74) * Math.min(1.4, Math.max(0.55, 5 / s.depth));
        const h = s.kind === 'hanging' ? w : w * 0.36;
        return (
          <Tactile
            key={slot}
            haptic
            scaleTo={0.92}
            accessibilityRole="button"
            accessibilityLabel={`Move to ${s.label}${taken ? ' (swap)' : ''}`}
            onPress={() => {
              if (!sel || here) return;
              const next = moveItem(state, sel.uid, slot);
              onChange(next);
              onSelect(next.placed.find((x2) => x2.uid === sel.uid) ?? null);
            }}
            hitSlop={12}
            style={[
              styles.guide,
              { left: x - w / 2, top: y - h / 2, width: w, height: h, borderRadius: w / 2 },
              here && styles.guideHere,
              hot && styles.guideHot,
              taken && styles.guideTaken,
            ]}
          />
        );
      })}

      {ghost && (
        <View pointerEvents="none" style={{ position: 'absolute', left: g.ox, top: g.oy, opacity: 0.92 }}>
          <SceneObject v={ghost} s={g.scale} live={false} seed="ghost" />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  dot: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: 'rgba(255,250,240,0.92)',
    borderWidth: 2,
    borderColor: 'rgba(40,28,18,0.35)',
  },
  guide: {
    position: 'absolute',
    borderWidth: 1.5,
    borderColor: 'rgba(255,250,240,0.85)',
    borderStyle: 'dashed',
    backgroundColor: 'rgba(255,250,240,0.10)',
  },
  guideHere: { borderStyle: 'solid', backgroundColor: 'rgba(255,250,240,0.22)' },
  guideHot: { borderStyle: 'solid', borderWidth: 2, borderColor: '#FFFFFF', backgroundColor: 'rgba(255,250,240,0.32)' },
  guideTaken: { borderColor: 'rgba(255,226,190,0.8)' },
});
