// The paradise, drawn: the painted panorama as the world, every grown
// plant standing on it at its slot (bigger toward the front), water that
// shimmers, waterfalls that fall, and one camera with two states: the
// whole garden, or a segment up close. The world is a single transformed
// view, so panning and the cinematic move between the two states cost
// nothing per plant.
import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, Image, PanResponder, StyleSheet, View } from 'react-native';
import { Tactile } from '../../ui/Pressable';
import { AppText } from '../../ui/AppText';
import { Icon } from '../../ui/Icon';
import { SegmentId, SPECIES_BY_ID } from '../catalog';
import { PLATE_H, PLATE_W, SEGMENT_LABEL_POS, SEGMENT_RANGE, Slot, pxPerMetre, slotsFor } from '../layout';
import { ParadiseState, PlantInstance, Penalty, gardenMetres, spriteFor } from '../model';
import { PARADISE_EXTRAS, PARADISE_IMAGES } from '../sprites.generated';

import { MotionLevel } from './Ambience';

export type { MotionLevel };
export type SceneView = { mode: 'full' } | { mode: 'segment'; segment: SegmentId };

export interface ParadiseSceneProps {
  state: ParadiseState;
  view: SceneView;
  width: number;
  height: number;
  /** Where the plate's top sits in the full view (below the minimap). */
  plateTop: number;
  /** Space kept clear at the bottom of the full view (the dock). */
  bottomClear: number;
  motion: MotionLevel;
  selectedId: string | null;
  /** A plant that just arrived: it settles in with a little ceremony. */
  arrivalId: string | null;
  onTapPlant: (plant: PlantInstance) => void;
  onTapPenalty: (penalty: Penalty) => void;
  onTapSegment: (segment: SegmentId) => void;
  onTapEmpty: () => void;
  /** Pan offset reported for the minimap (fraction of the plate at the screen centre). */
  onCentre?: (fraction: number) => void;
  centreRequest?: { fraction: number; nonce: number } | null;
  segmentLabel: (segment: SegmentId) => string;
}

const PLATE = require('../../../assets/paradise/plate_full.webp');
const RIPPLE = require('../../../assets/paradise/ripple.png');
const STREAKS = require('../../../assets/paradise/streaks.png');
const GLOW = require('../../../assets/paradise/glow.png');
const DEAD = require('../../../assets/paradise/dead_sapling.webp');
/** The plinth is drawn at the scale of a potted plant on it. */
const PLINTH_SCALE = 1.35;

/** Water (shimmer scrolls sideways) and waterfalls (streaks fall) on the plate, as fractions. */
const WATER = [
  { x: 0.345, y: 0.73, w: 0.275, h: 0.27, r: 0.06 },
  { x: 0.2, y: 0.57, w: 0.1, h: 0.06, r: 0.03 },
];
const FALLS = [
  { x: 0.405, y: 0.56, w: 0.06, h: 0.16 },
  { x: 0.53, y: 0.56, w: 0.075, h: 0.16 },
  { x: 0.207, y: 0.12, w: 0.03, h: 0.3 },
  { x: 0.835, y: 0.14, w: 0.04, h: 0.22 },
  { x: 0.57, y: 0.18, w: 0.012, h: 0.22 },
];

interface Camera {
  zoom: number;
  tx: number;
  ty: number;
}

/** Order plants by depth so the ones in front draw last. */
function drawOrder(plants: { y: number }[]): number[] {
  return plants.map((p, i) => ({ y: p.y, i })).sort((a, b) => a.y - b.y).map((x) => x.i);
}

export function ParadiseScene(props: ParadiseSceneProps) {
  const { state, view, width, height, plateTop, bottomClear, motion, selectedId, arrivalId, onTapPlant, onTapPenalty, onTapSegment, onTapEmpty, onCentre, centreRequest, segmentLabel } = props;
  // the world: the plate at k screen pixels per plate pixel in the full view
  const k = Math.max(0.2, (height - plateTop - bottomClear) / PLATE_H);
  const worldW = PLATE_W * k;
  const worldH = PLATE_H * k;
  const zoomSeg = height / worldH;

  // an arriving plant: the camera centres on it rather than on the segment
  const focusFraction = useMemo(() => {
    if (!arrivalId || view.mode !== 'segment') return null;
    const p = state.plants.find((x) => x.id === arrivalId);
    if (!p || p.segment !== view.segment || p.slot < 0) return null;
    return slotsFor(p.segment, state.layoutSeed[p.segment])[p.slot]?.x ?? null;
  }, [arrivalId, view, state.plants, state.layoutSeed]);

  const cameraFor = useCallback(
    (v: SceneView, panX = 0): Camera => {
      if (v.mode === 'full') {
        // the plate sits below the minimap; pan sideways
        return { zoom: 1, tx: panX, ty: plateTop };
      }
      const [a, b] = SEGMENT_RANGE[v.segment];
      const fx = (focusFraction ?? (a + b) / 2) * worldW;
      const fy = worldH / 2;
      const cx = width / 2;
      const cy = height / 2;
      return { zoom: zoomSeg, tx: cx - worldW / 2 - zoomSeg * (fx - worldW / 2) + panX, ty: cy - worldH / 2 - zoomSeg * (fy - worldH / 2) };
    },
    [plateTop, worldW, worldH, width, height, zoomSeg, focusFraction],
  );

  const zoom = useRef(new Animated.Value(1)).current;
  const tx = useRef(new Animated.Value(0)).current;
  const ty = useRef(new Animated.Value(plateTop)).current;
  const cam = useRef<Camera>({ zoom: 1, tx: 0, ty: plateTop });
  const pan = useRef(0); // the user's sideways pan within the current state
  const viewRef = useRef(view);
  viewRef.current = view;
  const drift = useRef<Animated.CompositeAnimation | null>(null);

  const bounds = useCallback(
    (v: SceneView, z: number): [number, number] => {
      // the world is scaled about its centre: these keep the plate covering the screen
      const txMax = (worldW * (z - 1)) / 2; // the plate's left edge at the screen's left
      const txMin = width - (worldW * (1 + z)) / 2; // its right edge at the screen's right
      if (v.mode === 'full') return [Math.min(txMin, txMax), txMax];
      // in a segment, the screen centre may travel across the segment and no further
      const [a, b] = SEGMENT_RANGE[v.segment];
      const centreTx = (f: number) => width / 2 - worldW / 2 - z * (f * worldW - worldW / 2);
      const lo = Math.max(txMin, centreTx(b));
      const hi = Math.min(txMax, centreTx(a));
      return lo <= hi ? [lo, hi] : [hi, hi];
    },
    [worldW, width],
  );

  const apply = useCallback(
    (c: Camera, animate: boolean) => {
      cam.current = c;
      if (!animate) {
        zoom.setValue(c.zoom);
        tx.setValue(c.tx);
        ty.setValue(c.ty);
        return;
      }
      Animated.parallel([
        Animated.timing(zoom, { toValue: c.zoom, duration: 900, easing: Easing.inOut(Easing.cubic), useNativeDriver: true }),
        Animated.timing(tx, { toValue: c.tx, duration: 900, easing: Easing.inOut(Easing.cubic), useNativeDriver: true }),
        Animated.timing(ty, { toValue: c.ty, duration: 900, easing: Easing.inOut(Easing.cubic), useNativeDriver: true }),
      ]).start();
    },
    [zoom, tx, ty],
  );

  // report where the screen centre is, for the minimap
  const report = useCallback(
    (c: Camera) => {
      const centreWorld = worldW / 2 + (width / 2 - worldW / 2 - c.tx) / c.zoom;
      onCentre?.(Math.max(0, Math.min(1, centreWorld / worldW)));
    },
    [onCentre, worldW, width],
  );

  // the view changed: travel there
  const first = useRef(true);
  useEffect(() => {
    drift.current?.stop();
    const initial = view.mode === 'full' ? -(worldW - width) * 0.5 : 0;
    pan.current = view.mode === 'full' && first.current ? initial : 0;
    const c = cameraFor(view, pan.current);
    const [lo, hi] = bounds(view, c.zoom);
    c.tx = Math.max(lo, Math.min(hi, c.tx));
    apply(c, !first.current);
    report(c);
    first.current = false;
    // a slow cinematic drift while the whole garden is shown
    if (view.mode === 'full' && motion === 'full') {
      const run = () => {
        const target = cam.current.tx < -(worldW - width) * 0.5 ? hi : lo;
        drift.current = Animated.timing(tx, { toValue: target, duration: 60000 * Math.abs(target - cam.current.tx) / Math.max(1, worldW - width), easing: Easing.inOut(Easing.sin), useNativeDriver: true });
        drift.current.start(({ finished }) => {
          if (finished) {
            cam.current = { ...cam.current, tx: target };
            report(cam.current);
            run();
          }
        });
      };
      const t = setTimeout(run, 2500);
      return () => {
        clearTimeout(t);
        drift.current?.stop();
      };
    }
    return undefined;
  }, [view, cameraFor, bounds, apply, report, motion, worldW, width, tx]);

  // the minimap asked for a place
  useEffect(() => {
    if (!centreRequest || view.mode !== 'full') return;
    drift.current?.stop();
    const c = cameraFor(view, 0);
    c.tx = width / 2 - centreRequest.fraction * worldW;
    const [lo, hi] = bounds(view, c.zoom);
    c.tx = Math.max(lo, Math.min(hi, c.tx));
    apply(c, true);
    report(c);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [centreRequest]);

  // ---- touch: pan sideways, tap to pick ----
  const start = useRef(0);
  const moved = useRef(false);
  const responder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_e, g) => Math.abs(g.dx) > 4 || Math.abs(g.dy) > 4,
        onPanResponderGrant: () => {
          drift.current?.stop();
          tx.stopAnimation((v) => {
            cam.current.tx = v;
            start.current = v;
          });
          moved.current = false;
        },
        onPanResponderMove: (_e, g) => {
          if (Math.abs(g.dx) > 6) moved.current = true;
          const [lo, hi] = bounds(viewRef.current, cam.current.zoom);
          const v = Math.max(lo - 40, Math.min(hi + 40, start.current + g.dx));
          cam.current.tx = v;
          tx.setValue(v);
        },
        onPanResponderRelease: (e, g) => {
          if (!moved.current) {
            // through the ref: the responder is created once, the plants move on every render
            pickRef.current(e.nativeEvent.pageX, e.nativeEvent.pageY);
            return;
          }
          const [lo, hi] = bounds(viewRef.current, cam.current.zoom);
          Animated.decay(tx, { velocity: g.vx, deceleration: 0.996, useNativeDriver: true }).start(() => {
            tx.stopAnimation((v) => {
              const c = Math.max(lo, Math.min(hi, v));
              cam.current.tx = c;
              if (c !== v) Animated.spring(tx, { toValue: c, useNativeDriver: true, bounciness: 2 }).start();
              report(cam.current);
            });
          });
        },
        onPanResponderTerminate: () => undefined,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [bounds, tx],
  );

  // ---- the plants, in world coordinates ----
  const slotsBySegment = useMemo(() => {
    const m = new Map<SegmentId, Slot[]>();
    for (const seg of Object.keys(state.layoutSeed) as SegmentId[]) m.set(seg, slotsFor(seg, state.layoutSeed[seg]));
    return m;
  }, [state.layoutSeed]);

  interface Placed {
    key: string;
    kind: 'plant' | 'penalty' | 'plinth';
    plant?: PlantInstance;
    penalty?: Penalty;
    x: number;
    y: number;
    w: number;
    h: number;
    left: number;
    top: number;
    source: number;
    sway: boolean;
    phase: number;
  }
  const placed = useMemo<Placed[]>(() => {
    const out: Placed[] = [];
    const near = view.mode === 'segment' ? SEGMENT_RANGE[view.segment] : null;
    const visible = (x: number) => !near || (x > near[0] - 0.12 && x < near[1] + 0.12);
    for (const p of state.plants) {
      const slot = p.slot >= 0 ? slotsBySegment.get(p.segment)?.[p.slot] : undefined;
      if (!slot || !visible(slot.x)) continue;
      const sp = spriteFor(p.speciesId, p.size);
      if (!sp) continue;
      const ppm = pxPerMetre(slot.y) * k * p.scale * (gardenMetres(sp.sprite.heightM) / sp.sprite.heightM);
      let h = sp.sprite.heightM * ppm;
      let w = sp.sprite.widthM * ppm;
      // nothing towers over the garden: cap at a share of the plate height
      const cap = worldH * (slot.band === 'back' ? 0.42 : slot.band === 'mid' ? 0.34 : 0.3);
      if (h > cap) {
        w *= cap / h;
        h = cap;
      }
      // level of detail: the 256 px thumbnail while the plant is small on screen
      const useThumb = h * (view.mode === 'full' ? 1 : zoomSeg) < 120;
      const file = useThumb && sp.sprite.thumb ? sp.sprite.thumb : sp.sprite.file;
      const source = PARADISE_IMAGES[file] ?? PARADISE_IMAGES[sp.sprite.file];
      if (source === undefined) continue;
      const X = slot.x * worldW;
      let Y = slot.y * worldH;
      // in the pond, the pot stands on a sandstone plinth rising from the water
      const pl = slot.plinth ? PARADISE_EXTRAS.plinth : undefined;
      if (pl && PARADISE_IMAGES[pl.file] !== undefined) {
        const pk = pxPerMetre(slot.y) * k * PLINTH_SCALE;
        const pw = pl.widthM * pk;
        const ph = pl.heightM * pk;
        out.push({ key: `${p.id}:plinth`, kind: 'plinth', x: X, y: Y - 0.01, w: pw, h: ph, left: X - pl.pivot[0] * pw, top: Y - pl.pivot[1] * ph, source: PARADISE_IMAGES[pl.file], sway: false, phase: 0 });
        Y -= pl.boxM[2] * Math.cos((22 * Math.PI) / 180) * pk;
      }
      out.push({ key: p.id, kind: 'plant', plant: p, x: X, y: slot.y * worldH, w, h, left: X - sp.sprite.pivot[0] * w, top: Y - sp.sprite.pivot[1] * h, source, sway: !!sp.sprite.sway && view.mode === 'segment' && motion === 'full' && h > 40, phase: p.id.charCodeAt(p.id.length - 1) % 4 });
    }
    for (const pen of state.penalties) {
      const slot = pen.slot >= 0 ? slotsBySegment.get(pen.segment)?.[pen.slot] : undefined;
      if (!slot || !visible(slot.x)) continue;
      const ppm = pxPerMetre(slot.y) * k;
      const h = 0.9 * ppm;
      const w = 0.5 * ppm;
      const X = slot.x * worldW;
      const Y = slot.y * worldH;
      out.push({ key: pen.id, kind: 'penalty', penalty: pen, x: X, y: Y, w, h, left: X - w / 2, top: Y - h * 0.95, source: DEAD, sway: false, phase: 0 });
    }
    const order = drawOrder(out);
    return order.map((i) => out[i]);
  }, [state.plants, state.penalties, slotsBySegment, view, k, worldW, worldH, motion, zoomSeg]);

  // ---- the shuffle: plants that changed place glide (with a little hop) to the new one ----
  const prevPos = useRef(new Map<string, { left: number; top: number }>());
  const glide = useRef(new Animated.Value(1)).current;
  const moves = useMemo(() => {
    const m = new Map<string, { dx: number; dy: number }>();
    for (const p of placed) {
      const prev = prevPos.current.get(p.key);
      if (prev && (Math.abs(prev.left - p.left) > 0.5 || Math.abs(prev.top - p.top) > 0.5)) m.set(p.key, { dx: prev.left - p.left, dy: prev.top - p.top });
    }
    return m;
  }, [placed]);
  useEffect(() => {
    prevPos.current = new Map(placed.map((p) => [p.key, { left: p.left, top: p.top }]));
    if (!moves.size) return;
    glide.setValue(0);
    Animated.timing(glide, { toValue: 1, duration: motion === 'off' ? 1 : 1100, easing: Easing.inOut(Easing.cubic), useNativeDriver: true }).start();
  }, [placed, moves, glide, motion]);

  const pick = (pageX: number, pageY: number) => {
    const c = cam.current;
    // screen → world (the world view is transformed about its centre)
    const wx = worldW / 2 + (pageX - worldW / 2 - c.tx) / c.zoom;
    const wy = worldH / 2 + (pageY - worldH / 2 - c.ty) / c.zoom;
    let hit: Placed | null = null;
    for (let i = placed.length - 1; i >= 0; i--) {
      const p = placed[i];
      if (p.kind === 'plinth') continue;
      const pad = Math.max(0, 22 / c.zoom - p.w / 2);
      if (wx >= p.left - pad && wx <= p.left + p.w + pad && wy >= p.top - pad && wy <= p.top + p.h + pad) {
        hit = p;
        break;
      }
    }
    if (hit?.plant) onTapPlant(hit.plant);
    else if (hit?.penalty) onTapPenalty(hit.penalty);
    else onTapEmpty();
  };

  const pickRef = useRef(pick);
  pickRef.current = pick;

  // ---- shared sway phases (four, so the beds do not move in unison) ----
  const phases = useRef([0, 1, 2, 3].map(() => new Animated.Value(0))).current;
  useEffect(() => {
    if (motion !== 'full') return;
    const loops = phases.map((v, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(v, { toValue: 1, duration: 2600 + i * 420, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(v, { toValue: 0, duration: 2600 + i * 420, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        ]),
      ),
    );
    loops.forEach((l, i) => setTimeout(() => l.start(), i * 700));
    return () => loops.forEach((l) => l.stop());
  }, [motion, phases]);
  const rotations = useMemo(() => phases.map((v) => v.interpolate({ inputRange: [0, 1], outputRange: ['-1.4deg', '1.4deg'] })), [phases]);

  // ---- water ----
  const flow = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (motion === 'off') return;
    const loop = Animated.loop(Animated.timing(flow, { toValue: 1, duration: motion === 'full' ? 9000 : 16000, easing: Easing.linear, useNativeDriver: true }));
    loop.start();
    return () => loop.stop();
  }, [motion, flow]);

  // ---- the selected and the arriving plant ----
  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!selectedId) return;
    const loop = Animated.loop(Animated.sequence([Animated.timing(pulse, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.sin), useNativeDriver: true }), Animated.timing(pulse, { toValue: 0, duration: 900, easing: Easing.inOut(Easing.sin), useNativeDriver: true })]));
    loop.start();
    return () => loop.stop();
  }, [selectedId, pulse]);
  const arrive = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!arrivalId) return;
    arrive.setValue(0);
    Animated.sequence([Animated.delay(900), Animated.spring(arrive, { toValue: 1, useNativeDriver: true, friction: 5, tension: 40 })]).start();
  }, [arrivalId, arrive]);

  const z = zoom;
  return (
    <View style={StyleSheet.absoluteFill} {...responder.panHandlers}>
      <Animated.View style={{ position: 'absolute', left: 0, top: 0, width: worldW, height: worldH, transform: [{ translateX: tx }, { translateY: ty }, { scale: z }] }}>
        {/* the garden */}
        <Image source={PLATE} style={{ position: 'absolute', left: 0, top: 0, width: worldW, height: worldH }} resizeMode="stretch" fadeDuration={0} />
        {/* a soft reflection below the plate, where the full view's foreground would be */}
        <Image source={PLATE} blurRadius={12} style={{ position: 'absolute', left: 0, top: worldH, width: worldW, height: worldH * 0.3, opacity: 0.7, transform: [{ scaleY: -1 }] }} resizeMode="stretch" fadeDuration={0} />
        <View style={{ position: 'absolute', left: 0, top: worldH, width: worldW, height: worldH * 0.3, backgroundColor: 'rgba(28,34,16,0.55)' }} />
        {/* water shimmer and the waterfalls */}
        {motion !== 'off' &&
          WATER.map((wv, i) => (
            <View key={`w${i}`} pointerEvents="none" style={{ position: 'absolute', left: wv.x * worldW, top: wv.y * worldH, width: wv.w * worldW, height: wv.h * worldH, borderRadius: wv.r * worldW, overflow: 'hidden', opacity: 0.22 }}>
              <Animated.Image source={RIPPLE} resizeMode="repeat" style={{ position: 'absolute', left: 0, top: 0, width: wv.w * worldW * 2, height: wv.h * worldH, transform: [{ translateX: flow.interpolate({ inputRange: [0, 1], outputRange: [0, -(wv.w * worldW)] }) }] }} />
            </View>
          ))}
        {motion !== 'off' &&
          FALLS.map((f, i) => (
            <View key={`f${i}`} pointerEvents="none" style={{ position: 'absolute', left: f.x * worldW, top: f.y * worldH, width: f.w * worldW, height: f.h * worldH, overflow: 'hidden', opacity: 0.28 }}>
              <Animated.Image source={STREAKS} resizeMode="repeat" style={{ position: 'absolute', left: 0, top: -f.h * worldH, width: f.w * worldW, height: f.h * worldH * 2, transform: [{ translateY: flow.interpolate({ inputRange: [0, 1], outputRange: [0, f.h * worldH] }) }] }} />
            </View>
          ))}
        {/* the plants */}
        {placed.map((p) => {
          const selected = p.key === selectedId;
          const arriving = p.key === arrivalId;
          const glowSize = Math.max(p.w, p.h) * 1.3;
          const transform: Animated.WithAnimatedArray<unknown> = [];
          const mv = moves.get(p.key);
          if (mv) {
            transform.push({ translateX: glide.interpolate({ inputRange: [0, 1], outputRange: [mv.dx, 0] }) });
            transform.push({ translateY: glide.interpolate({ inputRange: [0, 0.5, 1], outputRange: [mv.dy, mv.dy / 2 - Math.min(40, p.h * 0.3), 0] }) });
          }
          if (p.plant?.flip) transform.push({ scaleX: -1 });
          if (p.plant?.rotation) transform.push({ rotate: `${p.plant.rotation}deg` });
          if (p.sway) transform.push({ rotate: rotations[p.phase] });
          if (selected) transform.push({ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.05] }) });
          if (arriving) transform.push({ scale: arrive.interpolate({ inputRange: [0, 1], outputRange: [0.15, 1] }) });
          return (
            <React.Fragment key={p.key}>
              {(selected || arriving) && (
                <Animated.Image source={GLOW} style={{ position: 'absolute', left: p.x - glowSize / 2, top: p.y - glowSize * 0.62, width: glowSize, height: glowSize, opacity: arriving ? arrive.interpolate({ inputRange: [0, 0.6, 1], outputRange: [0, 0.9, 0.55] }) : pulse.interpolate({ inputRange: [0, 1], outputRange: [0.45, 0.8] }) }} />
              )}
              <Animated.View pointerEvents="none" style={{ position: 'absolute', left: p.left, top: p.top, width: p.w, height: p.h, transform: transform as never }}>
                <Image source={p.source} style={{ width: p.w, height: p.h, opacity: p.kind === 'penalty' ? 0.92 : 1 }} resizeMode="stretch" fadeDuration={0} />
              </Animated.View>
            </React.Fragment>
          );
        })}
        {/* the segment labels, over the painted ones, in the full view only */}
        {view.mode === 'full' &&
          (Object.keys(SEGMENT_LABEL_POS) as SegmentId[]).map((seg, i) => {
            const pos = SEGMENT_LABEL_POS[seg];
            return (
              <View key={seg} style={{ position: 'absolute', left: pos.x * worldW, top: pos.y * worldH, alignItems: 'center' }}>
                <Tactile onPress={() => onTapSegment(seg)} accessibilityRole="button" accessibilityLabel={segmentLabel(seg)} scaleTo={0.95} style={[styles.label, { transform: [{ translateX: -70 }, { translateY: -18 }] }]}>
                  <Icon name={['flower', 'trees', 'leaf', 'sun', 'sprout'][i] as never} size="xs" color="#7A3E1E" />
                  <AppText variant="bodySmallStrong" style={styles.labelText} numberOfLines={1}>
                    {i + 1}. {segmentLabel(seg)}
                  </AppText>
                </Tactile>
              </View>
            );
          })}
      </Animated.View>
    </View>
  );
}

export function placedSpeciesName(p: PlantInstance): string {
  return SPECIES_BY_ID[p.speciesId]?.name ?? p.speciesId;
}

const styles = StyleSheet.create({
  label: { flexDirection: 'row', alignItems: 'center', gap: 6, width: 140, height: 36, justifyContent: 'center', borderRadius: 18, backgroundColor: 'rgba(251,241,224,0.94)', borderWidth: 1.5, borderColor: 'rgba(120,78,36,0.35)' },
  labelText: { color: '#3A2412' },
});
