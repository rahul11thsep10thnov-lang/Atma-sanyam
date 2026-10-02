// The photoreal balcony, composited on device from the rendered layers
// (tools/balcony-render): sky → drifting clouds → landscape → the balcony →
// sunlight → objects far-to-near → art. Everything that moves is subtle and
// slow, runs on the native driver, and stops under reduce-motion.
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Image, LayoutChangeEvent, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { PACK } from '../pack.generated';
import { Rect, Variant } from '../packTypes';
import { BalconyState, drawOrder, focusVariant } from '../model';
import { ARTWORKS, PUZZLE_COLS, PUZZLE_ROWS } from '../catalog';
import { img } from './images';
import { useParallax } from './useParallax';
import { JigsawArt } from './JigsawArt';
import { useReducedMotion } from '../../hooks/useReducedMotion';

export interface SceneGeometry {
  /** plate px → screen px */
  scale: number;
  ox: number;
  oy: number;
}

interface Props {
  state: BalconyState;
  /** Override the focus plant (live growth during a session). */
  focusMinutes?: number;
  focusHealth?: number;
  /** 'live' animates; 'still' is a static frame (thumbnails, previews). */
  mode?: 'live' | 'still';
  /** Point of interest in plate fractions; the crop centres on it. */
  focus?: [number, number];
  parallax?: boolean;
  style?: StyleProp<ViewStyle>;
  /** Hide one placed item (it's being dragged in edit mode). */
  hiddenUid?: string | null;
  onGeometry?: (g: SceneGeometry) => void;
  children?: React.ReactNode;
}

const PW = PACK.plate.width;
const PH = PACK.plate.height;
const OVERSCAN = 1.035;

function place(rect: Rect, s: number) {
  return { position: 'absolute' as const, left: rect[0] * s, top: rect[1] * s, width: rect[2] * s, height: rect[3] * s };
}

export function BalconyScene({ state, focusMinutes, focusHealth, mode = 'live', focus = [0.5, 0.52], parallax = true, style, hiddenUid, onGeometry, children }: Props) {
  const reduced = useReducedMotion();
  const live = mode === 'live' && !reduced;
  const [size, setSize] = useState({ w: 0, h: 0 });
  const par = useParallax(live && parallax);

  const s = size.w > 0 ? Math.max(size.w / PW, size.h / PH) * (live && parallax ? OVERSCAN : 1) : 0;
  const ox = s ? Math.min(0, Math.max(size.w - PW * s, size.w / 2 - focus[0] * PW * s)) : 0;
  const oy = s ? Math.min(0, Math.max(size.h - PH * s, size.h / 2 - focus[1] * PH * s)) : 0;
  useEffect(() => {
    if (s) onGeometry?.({ scale: s, ox, oy });
  }, [s, ox, oy, onGeometry]);

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    if (width !== size.w || height !== size.h) setSize({ w: width, h: height });
  };

  const far = { transform: [{ translateX: Animated.multiply(par.x, -3) }, { translateY: Animated.multiply(par.y, -2) }] };
  const near = { transform: [{ translateX: Animated.multiply(par.x, -9) }, { translateY: Animated.multiply(par.y, -6) }] };

  const order = drawOrder(state).filter(({ p }) => p.uid !== hiddenUid);
  const fm = focusMinutes ?? state.focus.minutes;
  const fh = focusHealth ?? state.focus.health;
  const fv = focusVariant(fm, fh);
  const L = PACK.layers;

  return (
    <View style={[styles.root, style]} onLayout={onLayout}>
      {s > 0 && (
        <>
          <Animated.View style={[{ position: 'absolute', left: ox, top: oy, width: PW * s, height: PH * s }, far]}>
            <Image source={img(L.sky.file)} style={place(L.sky.rect, s)} />
            <Clouds s={s} live={live} />
            <Image source={img(L.landscape.file)} style={place(L.landscape.rect, s)} />
          </Animated.View>
          <Animated.View style={[{ position: 'absolute', left: ox, top: oy, width: PW * s, height: PH * s }, near]}>
            <Image source={img(L.architecture)} style={{ position: 'absolute', left: 0, top: 0, width: PW * s, height: PH * s }} />
            <SunBreath s={s} live={live} />
            {order.map(({ p, v }) => (
              <React.Fragment key={p.uid}>
                <SceneObject v={v} s={s} live={live} seed={p.uid} />
                {/* the artwork lies on the frame's mount, in front of it */}
                {p.itemId === 'art_frame' && <ArtContent state={state} s={s} />}
              </React.Fragment>
            ))}
            {fv.variant && <FocusPlant variant={fv.variant} s={s} live={live} />}
            <Dust s={s} live={live} />
          </Animated.View>
          {children}
        </>
      )}
    </View>
  );
}

// ---- pieces ----------------------------------------------------------------------

function hashSeed(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return h;
}

/** A 0→1 clock that loops forever on the native driver, starting part-way
 * through (`phase`) so things that share a duration never move in step. */
function useLoop(duration: number, enabled: boolean, phase = 0) {
  const v = useRef(new Animated.Value(phase)).current;
  useEffect(() => {
    if (!enabled) return;
    let stopped = false;
    const full = Animated.loop(Animated.timing(v, { toValue: 1, duration, easing: Easing.linear, useNativeDriver: true }));
    v.setValue(phase);
    const first = Animated.timing(v, { toValue: 1, duration: duration * (1 - phase), easing: Easing.linear, useNativeDriver: true });
    first.start(({ finished }) => {
      if (finished && !stopped) {
        v.setValue(0);
        full.start();
      }
    });
    return () => {
      stopped = true;
      first.stop();
      full.stop();
    };
  }, [duration, enabled, phase, v]);
  return v;
}

/** An object with its baked shadow. Plants and hanging things sway gently
 * about their base (or hook): a skew so the pot stays planted. */
export function SceneObject({ v, s, live, seed }: { v: Variant; s: number; live: boolean; seed: string }) {
  const sway = v.sway;
  const h = hashSeed(seed);
  const t = useLoop(((sway?.speed ? 1 / sway.speed : 2) * 4200) + (h % 1500), live && !!sway, (h % 1000) / 1000);
  const style = place(v.rect, s);
  if (!sway || !live) return <Image source={img(v.file)} style={style} />;
  const deg = 0.55 * sway.amp;
  const top = sway.pivot === 'top';
  const origin = [(v.pivot[0] - v.rect[0]) * s, (v.pivot[1] - v.rect[1]) * s, 0];
  const angle = t.interpolate({
    inputRange: [0, 0.25, 0.5, 0.75, 1],
    outputRange: ['0deg', `${deg}deg`, '0deg', `${-deg * 0.8}deg`, '0deg'],
  });
  return (
    <Animated.Image
      source={img(v.file)}
      style={[style, { transformOrigin: origin, transform: top ? [{ rotate: angle }] : [{ skewX: angle }] }]}
    />
  );
}

/** The focus plant: cross-fades between growth stages and health. */
function FocusPlant({ variant, s, live }: { variant: Variant; s: number; live: boolean }) {
  const [shown, setShown] = useState(variant);
  const [prev, setPrev] = useState<Variant | null>(null);
  const fade = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (variant.file === shown.file) return;
    setPrev(shown);
    setShown(variant);
    fade.setValue(0);
    Animated.timing(fade, { toValue: 1, duration: live ? 1600 : 0, easing: Easing.inOut(Easing.quad), useNativeDriver: true }).start(() => setPrev(null));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [variant.file]);
  return (
    <>
      {prev && (
        <Animated.View style={{ opacity: Animated.subtract(1, fade) }} pointerEvents="none">
          <SceneObject v={prev} s={s} live={false} seed="focus-prev" />
        </Animated.View>
      )}
      <Animated.View style={{ opacity: fade }} pointerEvents="none">
        <SceneObject v={shown} s={s} live={live} seed="focus" />
      </Animated.View>
    </>
  );
}

/** Two copies of the seamless cloud strip drifting very slowly, clipped to
 * the open sky. */
function Clouds({ s, live }: { s: number; live: boolean }) {
  const c = PACK.layers.clouds;
  const clip = c.rect ?? PACK.layers.sky.rect;
  const t = useLoop(420000, live, 0.3);
  const w = c.width * s;
  const tx = t.interpolate({ inputRange: [0, 1], outputRange: [0, -w] });
  return (
    <View style={[place(clip, s), { overflow: 'hidden' }]} pointerEvents="none">
      <Animated.View style={{ position: 'absolute', left: -clip[0] * s, top: (c.top - clip[1]) * s, width: w * 2, height: c.height * s, transform: [{ translateX: live ? tx : -w * 0.3 }] }}>
        <Image source={img(c.file)} style={{ position: 'absolute', left: 0, top: 0, width: w, height: c.height * s }} />
        <Image source={img(c.file)} style={{ position: 'absolute', left: w, top: 0, width: w, height: c.height * s }} />
      </Animated.View>
    </View>
  );
}

/** Sunlight brightening and easing back, as if thin cloud passes the sun. */
function SunBreath({ s, live }: { s: number; live: boolean }) {
  const t = useLoop(16000, live, 0.1);
  const m = PACK.layers.sunMask;
  if (!live) return null;
  const opacity = t.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.02, 0.13, 0.02] });
  // warm light whose alpha is the sunlit area (see gen_pack.py)
  return (
    <Animated.View style={[place(m.rect, s), { opacity }]} pointerEvents="none">
      <Image source={img(m.file)} style={styles.fill} />
    </Animated.View>
  );
}

/** A handful of dust motes drifting in the sunlit air. */
function Dust({ s, live }: { s: number; live: boolean }) {
  // only where the sun slants in over the railing, and barely there
  const motes = useMemo(() => Array.from({ length: 8 }, (_, i) => {
    const r = (n: number) => ((Math.sin(i * 12.9898 + n * 78.233) * 43758.5453) % 1 + 1) % 1;
    return { x: 0.42 + r(1) * 0.4, y: 0.5 + r(2) * 0.2, size: 1.6 + r(3) * 2, dur: 18000 + r(4) * 14000, phase: r(5), drift: (r(6) - 0.5) * 40 };
  }), []);
  if (!live) return null;
  return (
    <>
      {motes.map((m, i) => (
        <Mote key={i} m={m} s={s} />
      ))}
    </>
  );
}

function Mote({ m, s }: { m: { x: number; y: number; size: number; dur: number; phase: number; drift: number }; s: number }) {
  const t = useLoop(m.dur, true, m.phase);
  const ty = t.interpolate({ inputRange: [0, 1], outputRange: [0, -70 * s * 2] });
  const tx = t.interpolate({ inputRange: [0, 1], outputRange: [0, m.drift * s * 2] });
  const opacity = t.interpolate({ inputRange: [0, 0.2, 0.7, 1], outputRange: [0, 0.32, 0.22, 0] });
  const sz = m.size * s * 2;
  return (
    <Animated.View
      style={{ position: 'absolute', left: m.x * PW * s, top: m.y * PH * s, width: sz, height: sz, opacity, transform: [{ translateX: tx }, { translateY: ty }] }}
      pointerEvents="none"
    >
      <Image source={img(PACK.layers.dust)} style={styles.fill} />
    </Animated.View>
  );
}

/** What hangs in the frame: the mounted artwork, or the jigsaw in progress. */
function ArtContent({ state, s }: { state: BalconyState; s: number }) {
  const q = PACK.art.quad;
  const xs = q.map((p) => p[0]);
  const ys = q.map((p) => p[1]);
  const rect: Rect = [Math.min(...xs), Math.min(...ys), Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)];
  const mounted = ARTWORKS.find((a) => a.id === state.art.mountedId);
  const current = ARTWORKS.find((a) => a.id === state.art.currentId);
  const style = place(rect, s);
  // the scene's light on the frame opening: a veil that darkens the art
  // where the frame's shadow and the room's falloff would
  const shade = PACK.art.shade ? <Image source={img(PACK.art.shade.file)} style={place(PACK.art.shade.rect, s)} /> : null;
  if (mounted) {
    return (
      <>
        <Image source={mounted.image} style={style} resizeMode="cover" />
        {shade}
      </>
    );
  }
  if (current && state.art.pieces > 0) {
    return (
      <>
        <View style={style}>
          <JigsawArt artId={current.id} image={current.image} width={rect[2] * s} height={rect[3] * s} rows={PUZZLE_ROWS} cols={PUZZLE_COLS} revealed={state.art.pieces} seams={false} />
        </View>
        {shade}
      </>
    );
  }
  return null;
}

const styles = StyleSheet.create({
  root: { overflow: 'hidden', backgroundColor: '#3a2e26' },
  fill: { width: '100%', height: '100%' },
});
