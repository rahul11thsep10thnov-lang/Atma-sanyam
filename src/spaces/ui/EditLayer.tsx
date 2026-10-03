// Customize mode. Every object was photographed in each place it can
// stand, so moving one is choosing a place: drag it and it snaps to the
// nearest spot it fits, shown as it really looks there. In the garden,
// dropping something on the dustbin throws it away. Guides exist only in
// this mode — outside it the space is just a space.
import React, { useMemo, useRef, useState } from 'react';
import { PanResponder, StyleSheet, View } from 'react-native';
import { LightState, SpaceId } from '../packTypes';
import { packFor } from '../packs';
import { SpaceState, isFixed, isPenalty, moveItem, occupant, PlacedItem, slotAvailable, slotsFor, variantOf } from '../model';
import { SceneGeometry, SceneObject, layerFor } from '../scene/SpaceScene';
import { sourceState } from '../states';
import { Tactile } from '../../ui/Pressable';

interface Props {
  space: SpaceId;
  state: SpaceState;
  geometry: SceneGeometry;
  light: LightState;
  selected: PlacedItem | null;
  onSelect: (p: PlacedItem | null) => void;
  onChange: (next: SpaceState) => void;
  /** The item being dragged; the scene hides it while its ghost is shown. */
  onDragging: (uid: string | null) => void;
  /** Dropped on the dustbin. */
  onBin?: (p: PlacedItem) => void;
}

/** Nearest object under a point, judged by its body rather than its shadow. */
export function pickItem(space: SpaceId, state: SpaceState, x: number, y: number, g: SceneGeometry, light: LightState): PlacedItem | null {
  const pack = packFor(space);
  const { source } = sourceState(pack, light);
  const px = (x - g.ox) / g.scale;
  const py = (y - g.oy) / g.scale;
  let best: { p: PlacedItem; score: number } | null = null;
  for (const p of state.placed) {
    const v = variantOf(state, p);
    const layer = v ? layerFor(v, source) : null;
    if (!v || !layer) continue;
    const [rx, ry, rw, rh] = layer.rect;
    if (px < rx || px > rx + rw || py < ry || py > ry + rh) continue;
    const kind = pack.slots[p.slot]?.kind;
    const bodyY = kind === 'hanging' ? (v.pivot[1] + ry + rh) / 2 : kind === 'wall' ? ry + rh / 2 : (ry + v.pivot[1]) / 2;
    const d = Math.hypot(px - v.pivot[0], (py - bodyY) * 0.8) + v.depth * 6 + (pack.items[p.itemId]?.flat ? 60 : 0);
    if (!best || d < best.score) best = { p, score: d };
  }
  return best?.p ?? null;
}

export function EditLayer({ space, state, geometry: g, light, selected, onSelect, onChange, onDragging, onBin }: Props) {
  const pack = packFor(space);
  const FOCUS = pack.focusPlant.slot;
  const { source } = sourceState(pack, light);
  const [target, setTarget] = useState<string | null>(null);
  const [overBin, setOverBin] = useState(false);
  const drag = useRef<{ p: PlacedItem; dx: number; dy: number; moved: boolean } | null>(null);
  const live = useRef({ state, g, selected });
  live.current = { state, g, selected };

  const toScreen = (pt: [number, number]) => [g.ox + pt[0] * g.scale, g.oy + pt[1] * g.scale] as const;
  const bin = state.placed.find((p) => p.itemId === 'dustbin');
  const binPoint = bin ? toScreen(pack.slots[bin.slot].anchor) : null;

  const nearestSlot = (p: PlacedItem, sx: number, sy: number) => {
    const { g: geo, state: st } = live.current;
    let best: { slot: string; d: number } | null = null;
    for (const slot of slotsFor(space, p.itemId)) {
      if (slot === FOCUS || !slotAvailable(st, slot)) continue;
      const a = pack.slots[slot].anchor;
      const d = Math.hypot(geo.ox + a[0] * geo.scale - sx, geo.oy + a[1] * geo.scale - sy);
      if (!best || d < best.d) best = { slot, d };
    }
    return best?.slot ?? p.slot;
  };
  const nearBin = (sx: number, sy: number) => !!binPoint && Math.hypot(binPoint[0] - sx, binPoint[1] - sy) < 70;

  const responder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (e) => {
          const { state: st, g: geo } = live.current;
          const hit = pickItem(space, st, e.nativeEvent.pageX, e.nativeEvent.pageY, geo, light);
          if (!hit || pack.slots[hit.slot]?.kind === 'wall' || isFixed(space, hit.itemId)) {
            drag.current = null;
            return;
          }
          const a = pack.slots[hit.slot].anchor;
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
          const sx = e.nativeEvent.pageX + d.dx;
          const sy = e.nativeEvent.pageY + d.dy;
          const binnable = !isPenalty(d.p.itemId) && nearBin(e.nativeEvent.pageX, e.nativeEvent.pageY);
          setOverBin(binnable);
          setTarget(binnable ? null : nearestSlot(d.p, sx, sy));
        },
        onPanResponderRelease: (e) => {
          const d = drag.current;
          drag.current = null;
          const { state: st, g: geo } = live.current;
          if (d?.moved) {
            setTarget(null);
            onDragging(null);
            setOverBin(false);
            if (!isPenalty(d.p.itemId) && nearBin(e.nativeEvent.pageX, e.nativeEvent.pageY) && onBin) {
              onBin(d.p);
              onSelect(null);
              return;
            }
            const slot = nearestSlot(d.p, e.nativeEvent.pageX + d.dx, e.nativeEvent.pageY + d.dy);
            if (slot !== d.p.slot) {
              const next = moveItem(st, d.p.uid, slot);
              onChange(next);
              onSelect(next.placed.find((x) => x.uid === d.p.uid) ?? null);
            }
            return;
          }
          onSelect(pickItem(space, st, e.nativeEvent.pageX, e.nativeEvent.pageY, geo, light));
        },
        onPanResponderTerminate: () => {
          drag.current = null;
          setTarget(null);
          setOverBin(false);
          onDragging(null);
        },
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [onSelect, onChange, onDragging, onBin, light, space],
  );

  const sel = selected ? state.placed.find((x) => x.uid === selected.uid) ?? null : null;
  const ghostVariant = sel && target ? variantOf({ ...state, placed: state.placed.map((p) => (p.uid === sel.uid ? { ...p, slot: target, variant: 0 } : p)) }, { ...sel, slot: target, variant: 0 }) : null;
  const ghostLayer = ghostVariant ? layerFor(ghostVariant, source) : null;
  const guides = sel && !isFixed(space, sel.itemId) ? slotsFor(space, sel.itemId).filter((s) => s !== FOCUS && pack.slots[s].kind !== 'wall' && slotAvailable(state, s)) : [];

  return (
    <View style={StyleSheet.absoluteFill} {...responder.panHandlers}>
      {!sel &&
        state.placed
          .filter((p) => pack.slots[p.slot] && pack.slots[p.slot].kind !== 'wall' && !isFixed(space, p.itemId))
          .map((p) => {
            const [x, y] = toScreen(pack.slots[p.slot].anchor);
            return <View key={p.uid} pointerEvents="none" style={[styles.dot, isPenalty(p.itemId) && styles.dotPenalty, { left: x - 5, top: y - 5 }]} />;
          })}

      {guides.map((slot) => {
        const s = pack.slots[slot];
        const [x, y] = toScreen(s.anchor);
        const here = sel?.slot === slot;
        const hot = target === slot;
        const taken = !here && !!occupant(state, slot);
        const w = (s.kind === 'hanging' ? 34 : 74) * Math.min(1.4, Math.max(0.45, 5 / s.depth));
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
            style={[styles.guide, { left: x - w / 2, top: y - h / 2, width: w, height: h, borderRadius: w / 2 }, here && styles.guideHere, hot && styles.guideHot, taken && styles.guideTaken]}
          />
        );
      })}

      {binPoint && sel && !isPenalty(sel.itemId) && (
        <View pointerEvents="none" style={[styles.binRing, overBin && styles.binRingHot, { left: binPoint[0] - 36, top: binPoint[1] - 56 }]} />
      )}

      {ghostVariant && ghostLayer && (
        <View pointerEvents="none" style={{ position: 'absolute', left: g.ox, top: g.oy, opacity: 0.92 }}>
          <SceneObject space={space} v={ghostVariant} layer={ghostLayer} s={g.scale} live={false} seed="ghost" />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  dot: { position: 'absolute', width: 10, height: 10, borderRadius: 5, backgroundColor: 'rgba(255,250,240,0.92)', borderWidth: 2, borderColor: 'rgba(40,28,18,0.35)' },
  dotPenalty: { backgroundColor: 'rgba(240,160,120,0.95)' },
  guide: { position: 'absolute', borderWidth: 1.5, borderColor: 'rgba(255,250,240,0.85)', borderStyle: 'dashed', backgroundColor: 'rgba(255,250,240,0.10)' },
  guideHere: { borderStyle: 'solid', backgroundColor: 'rgba(255,250,240,0.22)' },
  guideHot: { borderStyle: 'solid', borderWidth: 2, borderColor: '#FFFFFF', backgroundColor: 'rgba(255,250,240,0.32)' },
  guideTaken: { borderColor: 'rgba(255,226,190,0.8)' },
  binRing: { position: 'absolute', width: 72, height: 72, borderRadius: 36, borderWidth: 2, borderColor: 'rgba(255,250,240,0.7)', borderStyle: 'dashed' },
  binRingHot: { borderStyle: 'solid', borderColor: '#FFB4A0', backgroundColor: 'rgba(255,120,90,0.25)' },
});
