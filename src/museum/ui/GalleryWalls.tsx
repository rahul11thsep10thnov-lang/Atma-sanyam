// The gallery, one wall at a time. Each wall is the rendered plate of a
// carved white bay; its framed jigsaw hangs in the niche, sized by the
// jigsaw's size (1..7). Swiping walks round the curved gallery: the walls
// either side turn in on the curve as they slide past, so the room reads
// as a circle. Tap a picture for its card; tap elsewhere to hide controls.
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Image, PanResponder, StyleSheet, View } from 'react-native';
import { artworkImage } from '../../collection/model';
import { AppText } from '../../ui/AppText';
import { t } from '../../i18n';
import { NICHE, WALL_IMAGES, WALL_PLATE, Wall, frameBox } from '../walls';

interface Props {
  walls: Wall[];
  index: number;
  onIndex: (i: number) => void;
  onTapArt: (wall: Wall) => void;
  onTapEmpty: () => void;
  width: number;
  height: number;
  reduceMotion?: boolean;
}

/** Degrees a neighbouring wall turns in on the curve. */
const TURN = 34;

export function GalleryWalls({ walls, index, onIndex, onTapArt, onTapEmpty, width, height, reduceMotion }: Props) {
  const pos = useRef(new Animated.Value(index)).current;
  const at = useRef(index);
  const [shown, setShown] = useState(index);

  // the plate covers the screen; where the niche lands on it
  const geo = useMemo(() => {
    const s = Math.max(width / WALL_PLATE.width, height / WALL_PLATE.height);
    const ox = (width - WALL_PLATE.width * s) / 2;
    const oy = (height - WALL_PLATE.height * s) / 2;
    return {
      s,
      ox,
      oy,
      niche: { x: ox + NICHE.left * s, y: oy + NICHE.top * s, w: (NICHE.right - NICHE.left) * s, h: (NICHE.bottom - NICHE.top) * s },
    };
  }, [width, height]);

  const go = (i: number, velocity = 0) => {
    const target = Math.max(0, Math.min(walls.length - 1, i));
    at.current = target;
    setShown(target);
    if (reduceMotion) pos.setValue(target);
    else Animated.spring(pos, { toValue: target, velocity, useNativeDriver: true, friction: 9, tension: 50 }).start();
    if (target !== index) onIndex(target);
  };

  // follow the index from outside (the arrows)
  useEffect(() => {
    if (index === at.current) return;
    at.current = index;
    setShown(index);
    if (reduceMotion) pos.setValue(index);
    else Animated.timing(pos, { toValue: index, duration: 650, easing: Easing.inOut(Easing.cubic), useNativeDriver: true }).start();
  }, [index, pos, reduceMotion]);

  const pan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 6,
        onPanResponderMove: (_, g) => {
          let p = at.current - g.dx / width;
          // resist past the ends
          if (p < 0) p = p * 0.3;
          if (p > walls.length - 1) p = walls.length - 1 + (p - walls.length + 1) * 0.3;
          pos.setValue(p);
        },
        onPanResponderRelease: (e, g) => {
          if (Math.abs(g.dx) < 8 && Math.abs(g.dy) < 8) {
            pos.setValue(at.current);
            const { locationX: x, locationY: y } = e.nativeEvent as { locationX: number; locationY: number };
            const ev = e.nativeEvent as unknown as { offsetX?: number; offsetY?: number };
            const px = x ?? ev.offsetX ?? 0;
            const py = y ?? ev.offsetY ?? 0;
            const w = walls[at.current];
            const n = geo.niche;
            if (w?.kind === 'art' && px > n.x && px < n.x + n.w && py > n.y && py < n.y + n.h) onTapArt(w);
            else onTapEmpty();
            return;
          }
          const step = g.dx < -width * 0.18 || g.vx < -0.45 ? 1 : g.dx > width * 0.18 || g.vx > 0.45 ? -1 : 0;
          go(at.current + step, -g.vx);
        },
        onPanResponderTerminate: () => go(at.current),
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [walls.length, width, geo],
  );

  const range = [shown - 2, shown - 1, shown, shown + 1, shown + 2].filter((i) => i >= 0 && i < walls.length);

  return (
    <View style={[StyleSheet.absoluteFill, styles.room]} {...pan.panHandlers}>
      {range.map((i) => {
        const d = Animated.subtract(i, pos);
        const transform = [
          { perspective: width * 2.2 },
          { translateX: d.interpolate({ inputRange: [-2, -1, 0, 1, 2], outputRange: [-width * 1.62, -width * 0.86, 0, width * 0.86, width * 1.62], extrapolate: 'clamp' }) },
          { rotateY: d.interpolate({ inputRange: [-2, -1, 0, 1, 2], outputRange: [`${TURN * 1.9}deg`, `${TURN}deg`, '0deg', `${-TURN}deg`, `${-TURN * 1.9}deg`], extrapolate: 'clamp' }) },
          { scale: d.interpolate({ inputRange: [-1, 0, 1], outputRange: [0.92, 1, 0.92], extrapolate: 'clamp' }) },
        ];
        const shade = d.interpolate({ inputRange: [-1.5, -1, 0, 1, 1.5], outputRange: [0.55, 0.32, 0, 0.32, 0.55], extrapolate: 'clamp' });
        return (
          <Animated.View key={i} pointerEvents="none" style={[StyleSheet.absoluteFill, { zIndex: 10 - Math.abs(i - shown), transform }]}>
            <WallView wall={walls[i]} index={i} geo={geo} width={width} height={height} />
            <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: '#1b1612', opacity: shade }]} />
          </Animated.View>
        );
      })}
    </View>
  );
}

function WallView({ wall, index, geo, width, height }: { wall: Wall; index: number; geo: { s: number; ox: number; oy: number; niche: { x: number; y: number; w: number; h: number } }; width: number; height: number }) {
  const n = geo.niche;
  return (
    <View style={{ width, height, overflow: 'hidden' }}>
      <Image source={WALL_IMAGES[index % WALL_IMAGES.length]} style={{ position: 'absolute', left: geo.ox, top: geo.oy, width: WALL_PLATE.width * geo.s, height: WALL_PLATE.height * geo.s }} fadeDuration={0} />
      {wall.kind === 'art' ? <Framed wall={wall} niche={n} /> : <Placard niche={n} n={wall.n} />}
    </View>
  );
}

function Framed({ wall, niche }: { wall: Extract<Wall, { kind: 'art' }>; niche: { x: number; y: number; w: number; h: number } }) {
  const a = wall.art;
  const box = frameBox(a.tier, a.aspect || 0.75, niche.w, niche.h);
  const border = Math.max(4, Math.min(box.w, box.h) * 0.07);
  const mat = Math.max(3, Math.min(box.w, box.h) * 0.045);
  const left = niche.x + (niche.w - box.w) / 2;
  const top = niche.y + (niche.h - box.h) / 2;
  return (
    <>
      {/* the shadow it casts in the niche, a little down and to the right under the spotlight */}
      <View style={{ position: 'absolute', left: left + border * 0.5, top: top + border * 0.9, width: box.w, height: box.h, borderRadius: 2, backgroundColor: 'rgba(40,30,20,0.28)' }} />
      <View style={[styles.frame, { left, top, width: box.w, height: box.h, padding: border, borderColor: '#8a6526', borderTopColor: '#d8b664', borderLeftColor: '#c49a45', borderRightColor: '#7a571f', borderBottomColor: '#6a4a18', borderWidth: border * 0.35 }]}>
        <View style={{ flex: 1, padding: mat, backgroundColor: '#f3ede0', borderWidth: border * 0.15, borderColor: '#b98f3d' }}>
          <Image source={artworkImage(a)} style={{ flex: 1 }} resizeMode="cover" fadeDuration={0} />
        </View>
      </View>
    </>
  );
}

function Placard({ niche, n }: { niche: { x: number; y: number; w: number; h: number }; n: number }) {
  const w = Math.min(niche.w * 0.62, 220);
  return (
    <View style={{ position: 'absolute', left: niche.x + (niche.w - w) / 2, top: niche.y + niche.h * 0.36, width: w, alignItems: 'center' }}>
      <View style={styles.placard}>
        <AppText variant="caption" style={styles.placardNo}>
          {t('museum.wallNo', { n })}
        </AppText>
        <AppText variant="caption" align="center" style={styles.placardText}>
          {t('museum.hangsHere')}
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  room: { backgroundColor: '#2a2420', overflow: 'hidden' },
  frame: { position: 'absolute', backgroundColor: '#b48a3a' },
  placard: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 3, backgroundColor: 'rgba(250,246,238,0.92)', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(120,100,70,0.5)', alignItems: 'center', gap: 2 },
  placardNo: { color: '#8a6a3a', letterSpacing: 1.2, fontSize: 10 },
  placardText: { color: '#3b2f22' },
});
