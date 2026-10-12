// The focus session as a planting, and nothing else: a plain background,
// real soil across the bottom fifth of the screen, and the chosen plant
// growing out of it with the timer. It starts as a seed lying in the soil;
// the seed swells and splits, roots reach down, a shoot comes up, and the
// plant passes through its sizes. The growth is continuous and follows the
// timer exactly, and every passing second gives the plant a small visible
// lift, so it is always seen to grow.
import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, Image, StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { growthProgress, sizeForMinutes } from '../../growth/size';
import { gardenMetres, spriteFor } from '../model';
import { PARADISE_IMAGES } from '../sprites.generated';
import { MotionLevel } from './Ambience';

const SOIL = require('../../../assets/paradise/soil.png');
const SEED = require('../../../assets/paradise/seed.png');

/** The soil takes the bottom fifth of the screen. */
export const SOIL_FRACTION = 0.2;

/** Species rendered in a pot: the pot's height and radius (metres), from
 * tools/balcony-render. Here the pot sinks into the soil up to its rim, so
 * every plant is seen coming straight out of the ground. */
const POTS: Record<string, [number, number]> = {
  lotus: [0.16, 0.34], orchid: [0.14, 0.09], monstera: [0.3, 0.18], areca_palm: [0.46, 0.24], snake_plant: [0.36, 0.17],
  peace_lily: [0.3, 0.17], fiddle_leaf_fig: [0.4, 0.22], rubber_plant: [0.38, 0.22], philodendron: [0.24, 0.16], calathea: [0.2, 0.15],
  croton: [0.26, 0.17], zz_plant: [0.22, 0.14], fern: [0.18, 0.17], bonsai: [0.1, 0.26], bamboo: [0.34, 0.2], spider_plant: [0.18, 0.14],
  anthurium: [0.18, 0.13], tulsi: [0.32, 0.19], mint: [0.17, 0.15],
};
/** How far above the sprite's foot the plant leaves the soil, in metres on screen (22° view). */
function emergeM(speciesId: string): number {
  const p = POTS[speciesId];
  return p ? p[0] * 0.927 + p[1] * 0.2 : 0;
}

export interface GrowthSceneProps {
  speciesId: string;
  elapsedMinutes: number;
  targetMinutes: number;
  width: number;
  height: number;
  motion: MotionLevel;
  /** The plain colour behind the plant. */
  background?: string;
  /** The session ended: hold the final state, no further growth. */
  done?: boolean;
}

/** Screen pixels per metre, so the plant this session ends with fills the space
 * between the timer and the soil (what shows above the soil, not its pot). */
function scaleFor(speciesId: string, height: number, finalSize = 7): number {
  const final = spriteFor(speciesId, finalSize)?.sprite;
  const hM = final?.heightM ?? 1;
  const g = gardenMetres(hM) / hM;
  const visible = Math.max(0.12, hM - emergeM(speciesId)) * g;
  const room = height * 0.5;
  return room / visible;
}

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));

export function GrowthScene({ speciesId, elapsedMinutes, targetMinutes, width, height, motion, background = '#FBF5EC', done }: GrowthSceneProps) {
  const soilTop = Math.round(height * (1 - SOIL_FRACTION));
  const soilH = height - soilTop;
  // where the growth is: 0 → 0.6 the seed, then 0.6 → 1 the shoot to size 1, then sizes 1 → 7
  const finalSize = sizeForMinutes(targetMinutes) ?? 1;
  const ppm = useMemo(() => scaleFor(speciesId, height, finalSize), [speciesId, height, finalSize]);
  const progress = done ? Math.min(finalSize, growthProgress(elapsedMinutes, targetMinutes)) : growthProgress(elapsedMinutes, targetMinutes);

  // the seed drops into the soil when the session begins
  const drop = useRef(new Animated.Value(0)).current;
  const planted = useRef(false);
  useEffect(() => {
    if (planted.current) return;
    planted.current = true;
    if (elapsedMinutes > 0.1 || motion === 'off') {
      drop.setValue(1);
      return;
    }
    Animated.sequence([
      Animated.delay(300),
      Animated.timing(drop, { toValue: 0.9, duration: 1000, easing: Easing.in(Easing.quad), useNativeDriver: true }),
      Animated.spring(drop, { toValue: 1, useNativeDriver: true, friction: 4, tension: 60 }),
    ]).start();
  }, [drop, elapsedMinutes, motion]);
  const seedFall = drop.interpolate({ inputRange: [0, 0.9, 1], outputRange: [-height * 0.55, 0, 0] });

  // every second: a small lift, as if the plant had just grown a little
  const second = Math.floor(elapsedMinutes * 60);
  const tick = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (done || motion === 'off' || second === 0) return;
    tick.setValue(1);
    Animated.timing(tick, { toValue: 0, duration: 900, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [second, done, motion, tick]);
  const lift = tick.interpolate({ inputRange: [0, 1], outputRange: [1, 1.025] });

  // a slow breathing sway
  const sway = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (motion !== 'full') return;
    const loop = Animated.loop(Animated.sequence([Animated.timing(sway, { toValue: 1, duration: 2800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }), Animated.timing(sway, { toValue: 0, duration: 2800, easing: Easing.inOut(Easing.sin), useNativeDriver: true })]));
    loop.start();
    return () => loop.stop();
  }, [sway, motion]);
  const swayDeg = sway.interpolate({ inputRange: [0, 1], outputRange: ['-1.2deg', '1.2deg'] });

  const sizeOf = (stage: number) => {
    const s = spriteFor(speciesId, stage);
    if (!s) return null;
    const g = gardenMetres(s.sprite.heightM) / s.sprite.heightM;
    let h = s.sprite.heightM * ppm * g;
    let w = s.sprite.widthM * ppm * g;
    // never wider than the screen, never taller than the room above the soil
    const k = Math.min(1, (width * 0.92) / w, (height * 0.66) / h);
    w *= k;
    h *= k;
    // ey: where the plant leaves the soil, from the sprite's top (the pivot, or a pot's rim)
    const ey = s.sprite.pivot[1] * h - emergeM(speciesId) * (h / s.sprite.heightM);
    return { s, w, h, px: s.sprite.pivot[0], ey };
  };

  const groundX = width / 2;
  const groundY = soilTop + 4;

  // the seed: lies in the soil, swells and splits as the shoot starts
  const seedPhase = clamp01(progress / 0.6);
  const seedVisible = progress < 0.85;
  const seedScale = 1 + 0.35 * seedPhase;
  const seedOpacity = progress < 0.6 ? 1 : clamp01(1 - (progress - 0.6) / 0.25);

  // the plant: before size 1 the shoot is the size-1 plant coming up from the seed
  const stage = Math.max(1, Math.min(7, Math.floor(progress)));
  const frac = progress < 1 ? 0 : progress - Math.floor(progress);
  const a = sizeOf(stage);
  const b = progress >= 1 && stage < 7 ? sizeOf(stage + 1) : null;
  let grow: number;
  if (progress < 0.3) grow = 0;
  else if (progress < 1) grow = 0.04 + 0.96 * Math.pow((progress - 0.3) / 0.7, 1.15);
  else grow = 1 + frac * (a && b ? Math.min(1.6, b.h / a.h) - 1 : 0.12);
  const fadeIn = b && b.s.stage !== a?.s.stage ? clamp01((frac - 0.55) / 0.45) : 0;
  const root = clamp01(progress / 1.4);

  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: background }]}>
      {/* the plant: this size growing toward the next, the next fading in over it */}
      {a && grow > 0 && (
        <Animated.View pointerEvents="none" style={{ position: 'absolute', left: groundX - a.px * a.w, top: groundY - a.ey, width: a.w, height: a.h, transform: [{ translateY: a.ey - a.h / 2 }, { scale: grow }, { scaleY: lift }, { translateY: a.h / 2 - a.ey }, { rotate: swayDeg }] }}>
          <Image source={PARADISE_IMAGES[a.s.sprite.file]} style={{ width: a.w, height: a.h }} resizeMode="stretch" fadeDuration={0} />
        </Animated.View>
      )}
      {b && fadeIn > 0 && (
        <Animated.View pointerEvents="none" style={{ position: 'absolute', left: groundX - b.px * b.w, top: groundY - b.ey, width: b.w, height: b.h, opacity: fadeIn, transform: [{ translateY: b.ey - b.h / 2 }, { scaleY: lift }, { translateY: b.h / 2 - b.ey }, { rotate: swayDeg }] }}>
          <Image source={PARADISE_IMAGES[b.s.sprite.file]} style={{ width: b.w, height: b.h }} resizeMode="stretch" fadeDuration={0} />
        </Animated.View>
      )}
      {/* the soil: the bottom fifth, in front of the plant's foot (and any pot) */}
      <Image source={SOIL} style={{ position: 'absolute', left: 0, top: soilTop - 10, width, height: soilH + 10 }} resizeMode="cover" fadeDuration={0} />
      {/* roots, under the soil line */}
      {root > 0.02 && (
        <View pointerEvents="none" style={{ position: 'absolute', left: groundX - 80, top: groundY, width: 160, height: soilH * 0.8, overflow: 'hidden' }}>
          <Svg width={160} height={soilH * 0.8} viewBox="0 0 160 120">
            {[
              'M80 2 C78 26 68 40 56 62 C49 76 44 92 40 112',
              'M80 2 C82 28 92 42 104 60 C111 73 116 90 120 110',
              'M80 2 C80 30 76 52 74 78 C73 94 72 106 70 118',
              'M80 2 C81 22 87 34 94 44',
              'M80 2 C78 20 71 30 64 38',
            ].map((d, i) => (
              <Path key={i} d={d} stroke="#EADBC0" strokeWidth={i < 3 ? 2.4 : 1.5} fill="none" strokeLinecap="round" strokeDasharray={[240, 240]} strokeDashoffset={240 - 240 * clamp01(root * (i < 3 ? 1 : 0.8))} opacity={0.9} />
            ))}
          </Svg>
        </View>
      )}
      {/* the seed */}
      {seedVisible && (
        <Animated.View pointerEvents="none" style={{ position: 'absolute', left: groundX - 18, top: groundY - 16, width: 36, height: 27, opacity: seedOpacity, transform: [{ translateY: seedFall }, { scale: seedScale }, { rotate: `${-8 + seedPhase * 14}deg` }] }}>
          <Image source={SEED} style={{ width: 36, height: 27 }} fadeDuration={0} />
          {seedPhase > 0.45 && <View style={[styles.crack, { opacity: clamp01((seedPhase - 0.45) / 0.3) }]} />}
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  crack: { position: 'absolute', left: 16, top: 3, width: 3, height: 18, borderRadius: 2, backgroundColor: '#9BC46A' },
});

export { scaleFor as growthScaleFor };
