// The focus session as a planting: a soft garden sky, a strip of real
// soil along the bottom tenth of the screen, and the chosen plant growing
// through its stages as the minutes pass. The seed drops in when the
// session begins; roots reach down; the shoot comes up; the stages
// cross-fade so the growth is continuous and always matches the timer.
import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, Image, StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { growthProgress, sizeForMinutes } from '../../growth/size';
import { gardenMetres, spriteFor } from '../model';
import { PARADISE_IMAGES } from '../sprites.generated';
import { Ambience, MotionLevel } from './Ambience';

const BG = require('../../../assets/paradise/growth_bg.webp');
const SOIL = require('../../../assets/paradise/soil.png');
const SEED = require('../../../assets/paradise/seed.png');

export interface GrowthSceneProps {
  speciesId: string;
  elapsedMinutes: number;
  targetMinutes: number;
  width: number;
  height: number;
  motion: MotionLevel;
  /** The session ended: hold the final state, no further growth. */
  done?: boolean;
}

/** Screen pixels per metre in the growth scene, so a size-7 tree still fits. */
function scaleFor(speciesId: string, height: number): number {
  const final = spriteFor(speciesId, 7)?.sprite;
  const tallest = gardenMetres(final?.heightM ?? 1);
  const room = height * 0.62;
  return room / Math.max(0.3, tallest);
}

export function GrowthScene({ speciesId, elapsedMinutes, targetMinutes, width, height, motion, done }: GrowthSceneProps) {
  const soilTop = height * 0.9;
  const soilH = height * 0.1 + 6;
  const ppm = useMemo(() => scaleFor(speciesId, height), [speciesId, height]);

  // where the growth is, 0 (seed) .. 7, continuous
  const finalSize = sizeForMinutes(targetMinutes) ?? 1;
  const progress = done ? Math.min(finalSize, growthProgress(elapsedMinutes, targetMinutes)) : growthProgress(elapsedMinutes, targetMinutes);
  const stage = Math.floor(progress);
  const frac = progress - stage;

  // the seed: falls in during the first moments, then the soil closes over it
  const drop = useRef(new Animated.Value(0)).current;
  const planted = useRef(false);
  useEffect(() => {
    if (planted.current) return;
    planted.current = true;
    if (elapsedMinutes > 0.5) {
      drop.setValue(1);
      return;
    }
    Animated.sequence([
      Animated.delay(400),
      Animated.timing(drop, { toValue: 0.9, duration: 1100, easing: Easing.in(Easing.quad), useNativeDriver: true }),
      Animated.spring(drop, { toValue: 1, useNativeDriver: true, friction: 4, tension: 60 }),
    ]).start();
  }, [drop, elapsedMinutes]);
  const seedY = drop.interpolate({ inputRange: [0, 0.9, 1], outputRange: [-height * 0.6, 0, 10] });
  const seedOpacity = drop.interpolate({ inputRange: [0, 0.9, 0.97, 1], outputRange: [1, 1, 1, 0] });

  // breathing sway of the growing plant
  const sway = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (motion !== 'full') return;
    const loop = Animated.loop(Animated.sequence([Animated.timing(sway, { toValue: 1, duration: 2800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }), Animated.timing(sway, { toValue: 0, duration: 2800, easing: Easing.inOut(Easing.sin), useNativeDriver: true })]));
    loop.start();
    return () => loop.stop();
  }, [sway, motion]);

  // the two stages in play and their sizes on screen
  const a = spriteFor(speciesId, stage);
  const b = spriteFor(speciesId, Math.min(7, stage + 1));
  const sizeOf = (s: typeof a) => {
    if (!s) return { w: 0, h: 0, px: 0, py: 0 };
    const g = gardenMetres(s.sprite.heightM) / s.sprite.heightM;
    let h = s.sprite.heightM * ppm * g;
    let w = s.sprite.widthM * ppm * g;
    const cap = height * 0.66;
    if (h > cap) {
      w *= cap / h;
      h = cap;
    }
    return { w, h, px: s.sprite.pivot[0], py: s.sprite.pivot[1] };
  };
  const sa = sizeOf(a);
  const sb = sizeOf(b);
  // continuous: the current stage grows toward the next stage's size, then the next fades in
  const grow = 1 + frac * (sb.h && sa.h ? Math.min(1.6, sb.h / sa.h) - 1 : 0.15);
  const groundX = width / 2;
  const groundY = soilTop + 2;
  const showSeed = stage === 0 && frac < 0.6;
  const root = Math.min(1, progress / 1.2);

  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: '#F2D5C3' }]}>
      <Image source={BG} style={{ position: 'absolute', left: 0, top: 0, width, height }} resizeMode="cover" fadeDuration={0} />
      <Ambience width={width} height={height} motion={motion} skyBottom={height * 0.5} />
      {/* the soil: the bottom tenth, with a ragged top edge */}
      <Image source={SOIL} style={{ position: 'absolute', left: 0, top: soilTop - 8, width, height: soilH + 8 }} resizeMode="cover" fadeDuration={0} />
      {/* roots, under the soil line */}
      {root > 0.02 && (
        <View pointerEvents="none" style={{ position: 'absolute', left: groundX - 70, top: groundY, width: 140, height: soilH, overflow: 'hidden' }}>
          <Svg width={140} height={soilH} viewBox="0 0 140 90">
            {[
              'M70 2 C68 20 60 30 50 48 C44 58 40 70 36 84',
              'M70 2 C72 22 80 32 90 46 C96 56 100 68 104 82',
              'M70 2 C70 24 66 40 64 60 C63 72 62 80 60 88',
              'M70 2 C71 18 76 28 82 36',
              'M70 2 C68 16 62 24 56 30',
            ].map((d, i) => (
              <Path key={i} d={d} stroke="#E8D6B8" strokeWidth={i < 3 ? 2.2 : 1.4} fill="none" strokeLinecap="round" strokeDasharray={[200, 200]} strokeDashoffset={200 - 200 * Math.min(1, root * (i < 3 ? 1 : 0.8))} opacity={0.85} />
            ))}
          </Svg>
        </View>
      )}
      {/* the seed, dropping in */}
      {showSeed && (
        <Animated.Image source={SEED} style={{ position: 'absolute', left: groundX - 16, top: groundY - 20, width: 32, height: 24, opacity: seedOpacity, transform: [{ translateY: seedY }] }} />
      )}
      {/* the plant, stage A growing toward stage B, B fading in over it */}
      {a && !showSeed && (
        <Animated.View pointerEvents="none" style={{ position: 'absolute', left: groundX - sa.px * sa.w, top: groundY - sa.py * sa.h, width: sa.w, height: sa.h, transform: [{ translateY: sa.py * sa.h }, { scale: grow }, { translateY: -sa.py * sa.h }, { rotate: sway.interpolate({ inputRange: [0, 1], outputRange: ['-1.2deg', '1.2deg'] }) }] }}>
          <Image source={PARADISE_IMAGES[a.sprite.file]} style={{ width: sa.w, height: sa.h }} resizeMode="stretch" fadeDuration={0} />
        </Animated.View>
      )}
      {b && !showSeed && b.stage !== a?.stage && frac > 0.55 && (
        <Animated.View pointerEvents="none" style={{ position: 'absolute', left: groundX - sb.px * sb.w, top: groundY - sb.py * sb.h, width: sb.w, height: sb.h, opacity: (frac - 0.55) / 0.45, transform: [{ rotate: sway.interpolate({ inputRange: [0, 1], outputRange: ['-1.2deg', '1.2deg'] }) }] }}>
          <Image source={PARADISE_IMAGES[b.sprite.file]} style={{ width: sb.w, height: sb.h }} resizeMode="stretch" fadeDuration={0} />
        </Animated.View>
      )}
      {/* a soft shadow at the foot */}
      {!showSeed && <View pointerEvents="none" style={{ position: 'absolute', left: groundX - Math.max(20, sa.w * 0.35), top: groundY - 5, width: Math.max(40, sa.w * 0.7), height: 10, borderRadius: 999, backgroundColor: 'rgba(30,18,6,0.18)' }} />}
      <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 4, backgroundColor: '#3a2412' }} />
    </View>
  );
}

export { scaleFor as growthScaleFor };
