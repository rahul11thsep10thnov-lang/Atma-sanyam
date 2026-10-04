// A space, composited on device from its rendered layers: sky → drifting
// clouds → landscape → the base plate → sunlight → objects far-to-near
// (plants sway, hanging things swing) → artworks in their frames → dust,
// rain. States that were not rendered are derived from the nearest one with
// a colour veil. Everything that moves is slow, on the native driver, and
// stops under reduce-motion.
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Image, LayoutChangeEvent, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { LightState, Rect, SpaceId, Variant } from '../packTypes';
import { img, hasImg, packFor } from '../packs';
import { SpaceState, drawOrder, focusVariant, PlacedItem } from '../model';
import { CollectionState, artworkImage, findArtwork } from '../../collection/model';
import { sourceState, isDark } from '../states';
import { useParallax } from './useParallax';
import { useReducedMotion } from '../../hooks/useReducedMotion';

export interface SceneGeometry {
  /** plate px → screen px */
  scale: number;
  ox: number;
  oy: number;
}

interface Props {
  space: SpaceId;
  state: SpaceState;
  art?: CollectionState | null;
  light: LightState;
  /** Finished artworks hanging nowhere (the garden's rack). */
  rackCount?: number;
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

const OVERSCAN = 1.035;

function place(rect: Rect, s: number) {
  return { position: 'absolute' as const, left: rect[0] * s, top: rect[1] * s, width: rect[2] * s, height: rect[3] * s };
}

export function layerFor(v: Variant, source: LightState): { file: string; rect: Rect } | null {
  const f = v.files?.[source] ?? v.files?.morning ?? Object.values(v.files ?? {})[0];
  return f ?? null;
}

export function SpaceScene({ space, state, art, light, rackCount = 0, focusMinutes, focusHealth, mode = 'live', focus = [0.5, 0.52], parallax = true, style, hiddenUid, onGeometry, children }: Props) {
  const pack = packFor(space);
  const PW = pack.plate.width;
  const PH = pack.plate.height;
  const reduced = useReducedMotion();
  const live = mode === 'live' && !reduced;
  const [size, setSize] = useState({ w: 0, h: 0 });
  const par = useParallax(live && parallax);
  const { source, veil } = sourceState(pack, light);
  const L = pack.states[source] ?? pack.states[pack.renderedStates[0]];

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

  const order = drawOrder(state, rackCount).filter(({ p }) => p.uid !== hiddenUid);
  const fm = focusMinutes ?? state.focus.minutes;
  const fh = focusHealth ?? state.focus.health;
  const fv = focusVariant(pack, fm, fh);
  const focusLayer = fv.variant ? layerFor(fv.variant, source) : null;

  if (!L) return <View style={[styles.root, style]} onLayout={onLayout} />;

  return (
    <View style={[styles.root, style]} onLayout={onLayout}>
      {s > 0 && (
        <>
          <Animated.View style={[{ position: 'absolute', left: ox, top: oy, width: PW * s, height: PH * s }, far]}>
            <Image source={img(space, L.sky.file)} style={place(L.sky.rect, s)} />
            {!isDark(light) && light !== 'rain' && <Clouds space={space} skyRect={L.sky.rect} s={s} live={live} />}
            <Image source={img(space, L.landscape.file)} style={place(L.landscape.rect, s)} />
          </Animated.View>
          <Animated.View style={[{ position: 'absolute', left: ox, top: oy, width: PW * s, height: PH * s }, near]}>
            <Image source={img(space, L.base.file)} style={place(L.base.rect, s)} />
            {L.sunMask && live && !isDark(light) && light !== 'rain' && <SunBreath space={space} file={L.sunMask.file} rect={L.sunMask.rect} s={s} />}
            {order.map(({ p, v, item }) => {
              const layer = layerFor(v, source);
              if (!layer || !hasImg(space, layer.file)) return null;
              return (
                <React.Fragment key={p.uid}>
                  <SceneObject space={space} v={v} layer={layer} s={s} live={live} seed={p.uid} />
                  {item.art && v.artQuad && <ArtContent space={space} p={p} v={v} art={art ?? null} source={source} s={s} />}
                </React.Fragment>
              );
            })}
            {fv.variant && focusLayer && hasImg(space, focusLayer.file) && <FocusPlant space={space} variant={fv.variant} layer={focusLayer} s={s} live={live} />}
            {live && !isDark(light) && light !== 'rain' && pack.dust && <Dust space={space} file={pack.dust} PW={PW} PH={PH} s={s} />}
          </Animated.View>
          {veil && <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: veil.color, opacity: veil.opacity }]} />}
          {light === 'rain' && pack.rain && live && (pack.enclosed && L.openAir ? (
            <View pointerEvents="none" style={[{ position: 'absolute', left: ox + L.openAir[0] * s, top: oy + L.openAir[1] * s, width: L.openAir[2] * s, height: L.openAir[3] * s, overflow: 'hidden' }]}>
              <Rain space={space} rain={pack.rain} width={L.openAir[2] * s} height={L.openAir[3] * s} />
            </View>
          ) : (
            <Rain space={space} rain={pack.rain} width={size.w} height={size.h} />
          ))}
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
export function SceneObject({ space, v, layer, s, live, seed }: { space: SpaceId; v: Variant; layer: { file: string; rect: Rect }; s: number; live: boolean; seed: string }) {
  const sway = v.sway ?? undefined;
  const h = hashSeed(seed);
  const t = useLoop((sway?.speed ? 1 / sway.speed : 2) * 4200 + (h % 1500), live && !!sway, (h % 1000) / 1000);
  const style = place(layer.rect, s);
  if (!sway || !live) return <Image source={img(space, layer.file)} style={style} />;
  const deg = 0.55 * sway.amp;
  const top = sway.pivot === 'top';
  const origin = [(v.pivot[0] - layer.rect[0]) * s, (v.pivot[1] - layer.rect[1]) * s, 0];
  const angle = t.interpolate({
    inputRange: [0, 0.25, 0.5, 0.75, 1],
    outputRange: ['0deg', `${deg}deg`, '0deg', `${-deg * 0.8}deg`, '0deg'],
  });
  return <Animated.Image source={img(space, layer.file)} style={[style, { transformOrigin: origin, transform: top ? [{ rotate: angle }] : [{ skewX: angle }] }]} />;
}

/** The focus plant: cross-fades between growth stages and health. */
function FocusPlant({ space, variant, layer, s, live }: { space: SpaceId; variant: Variant; layer: { file: string; rect: Rect }; s: number; live: boolean }) {
  const [shown, setShown] = useState({ variant, layer });
  const [prev, setPrev] = useState<{ variant: Variant; layer: { file: string; rect: Rect } } | null>(null);
  const fade = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (layer.file === shown.layer.file) return;
    setPrev(shown);
    setShown({ variant, layer });
    fade.setValue(0);
    Animated.timing(fade, { toValue: 1, duration: live ? 1600 : 0, easing: Easing.inOut(Easing.quad), useNativeDriver: true }).start(() => setPrev(null));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layer.file]);
  return (
    <>
      {prev && (
        <Animated.View style={{ opacity: Animated.subtract(1, fade) }} pointerEvents="none">
          <SceneObject space={space} v={prev.variant} layer={prev.layer} s={s} live={false} seed="focus-prev" />
        </Animated.View>
      )}
      <Animated.View style={{ opacity: fade }} pointerEvents="none">
        <SceneObject space={space} v={shown.variant} layer={shown.layer} s={s} live={live} seed="focus" />
      </Animated.View>
    </>
  );
}

/** Two copies of the seamless cloud strip drifting very slowly, clipped to
 * the open sky. */
function Clouds({ space, skyRect, s, live }: { space: SpaceId; skyRect: Rect; s: number; live: boolean }) {
  const c = packFor(space).clouds;
  const t = useLoop(420000, live, 0.3);
  if (!c || !hasImg(space, c.file)) return null;
  const clip = c.rect ?? skyRect;
  const w = c.width * s;
  const tx = t.interpolate({ inputRange: [0, 1], outputRange: [0, -w] });
  return (
    <View style={[place(clip, s), { overflow: 'hidden' }]} pointerEvents="none">
      <Animated.View style={{ position: 'absolute', left: -clip[0] * s, top: (c.top - clip[1]) * s, width: w * 2, height: c.height * s, transform: [{ translateX: live ? tx : -w * 0.3 }] }}>
        <Image source={img(space, c.file)} style={{ position: 'absolute', left: 0, top: 0, width: w, height: c.height * s }} />
        <Image source={img(space, c.file)} style={{ position: 'absolute', left: w, top: 0, width: w, height: c.height * s }} />
      </Animated.View>
    </View>
  );
}

/** Sunlight brightening and easing back, as if thin cloud passes the sun:
 * warm light whose alpha is the sunlit area (see gen_space_pack.py). */
function SunBreath({ space, file, rect, s }: { space: SpaceId; file: string; rect: Rect; s: number }) {
  const t = useLoop(16000, true, 0.1);
  const opacity = t.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.02, 0.13, 0.02] });
  if (!hasImg(space, file)) return null;
  return (
    <Animated.View style={[place(rect, s), { opacity }]} pointerEvents="none">
      <Image source={img(space, file)} style={styles.fill} />
    </Animated.View>
  );
}

/** A handful of dust motes drifting in the sunlit air. */
function Dust({ space, file, PW, PH, s }: { space: SpaceId; file: string; PW: number; PH: number; s: number }) {
  const motes = useMemo(() => Array.from({ length: 8 }, (_, i) => {
    const r = (n: number) => ((Math.sin(i * 12.9898 + n * 78.233) * 43758.5453) % 1 + 1) % 1;
    return { x: 0.42 + r(1) * 0.4, y: 0.5 + r(2) * 0.2, size: 1.6 + r(3) * 2, dur: 18000 + r(4) * 14000, phase: r(5), drift: (r(6) - 0.5) * 40 };
  }), []);
  if (!hasImg(space, file)) return null;
  return (
    <>
      {motes.map((m, i) => (
        <Mote key={i} source={img(space, file)} m={m} PW={PW} PH={PH} s={s} />
      ))}
    </>
  );
}

function Mote({ source, m, PW, PH, s }: { source: ReturnType<typeof img>; m: { x: number; y: number; size: number; dur: number; phase: number; drift: number }; PW: number; PH: number; s: number }) {
  const t = useLoop(m.dur, true, m.phase);
  const ty = t.interpolate({ inputRange: [0, 1], outputRange: [0, -70 * s * 2] });
  const tx = t.interpolate({ inputRange: [0, 1], outputRange: [0, m.drift * s * 2] });
  const opacity = t.interpolate({ inputRange: [0, 0.2, 0.7, 1], outputRange: [0, 0.32, 0.22, 0] });
  const sz = m.size * s * 2;
  return (
    <Animated.View style={{ position: 'absolute', left: m.x * PW * s, top: m.y * PH * s, width: sz, height: sz, opacity, transform: [{ translateX: tx }, { translateY: ty }] }} pointerEvents="none">
      <Image source={source} style={styles.fill} />
    </Animated.View>
  );
}

/** Rain: the streak tile scrolling down, twice over for a loop. */
function Rain({ space, rain, width, height }: { space: SpaceId; rain: { file: string; width: number; height: number }; width: number; height: number }) {
  const t = useLoop(1400, true, 0);
  if (!hasImg(space, rain.file)) return null;
  const scale = width / rain.width;
  const th = rain.height * scale;
  const copies = Math.ceil(height / th) + 1;
  const ty = t.interpolate({ inputRange: [0, 1], outputRange: [-th, 0] });
  return (
    <Animated.View pointerEvents="none" style={{ position: 'absolute', left: 0, top: 0, width, height: th * copies, opacity: 0.55, transform: [{ translateY: ty }] }}>
      {Array.from({ length: copies }, (_, i) => (
        <Image key={i} source={img(space, rain.file)} style={{ position: 'absolute', left: 0, top: i * th, width, height: th }} />
      ))}
    </Animated.View>
  );
}

/** What hangs in a frame: the artwork hung there, then the scene's light
 * as a veil over it. An empty frame shows nothing. */
function ArtContent({ space, p, v, art, source, s }: { space: SpaceId; p: PlacedItem; v: Variant; art: CollectionState | null; source: LightState; s: number }) {
  const q = v.artQuad!;
  const xs = q.map((c) => c[0]);
  const ys = q.map((c) => c[1]);
  const rect: Rect = [Math.min(...xs), Math.min(...ys), Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)];
  const hung = findArtwork(art ?? null, p.artId);
  if (!hung) return null;
  const style = place(rect, s);
  const shadeLayer = v.artShade?.[source] ?? v.artShade?.morning;
  const shade = shadeLayer && hasImg(space, shadeLayer.file) ? <Image source={img(space, shadeLayer.file)} style={place(shadeLayer.rect, s)} /> : null;
  return (
    <>
      <Image source={artworkImage(hung)} style={style} resizeMode="cover" />
      {shade}
    </>
  );
}

const styles = StyleSheet.create({
  root: { overflow: 'hidden', backgroundColor: '#3a2e26' },
  fill: { width: '100%', height: '100%' },
});
