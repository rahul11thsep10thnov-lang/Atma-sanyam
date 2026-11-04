// The miniature floating island. The island itself (grass top, soil sides, a
// little stone path) is drawn here; every plant on it is the app's existing
// sprite for that species and growth size, unchanged, only positioned and
// scaled. Nothing about a plant's artwork is altered.
import React, { useMemo } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import Svg, { Defs, Ellipse, LinearGradient, Path, Polygon, Stop } from 'react-native-svg';
import { PARADISE_IMAGES } from '../../paradise/sprites.generated';
import { SPECIES_BY_ID } from '../../paradise/catalog';
import { gardenMetres, spriteFor } from '../../paradise/model';
import { arrange } from './layout';

export interface IslandPlant {
  id: string;
  speciesId: string;
  size: number;
  scale: number;
  flip: boolean;
}

/** More than this many are drawn only as the biggest and newest; the record lists them all. */
export const MAX_DRAWN = 140;

interface Props {
  width: number;
  plants: IslandPlant[];
}

const ISO = 0.5;

export function GardenIsland({ width, plants }: Props) {
  const W = width;
  const H = W * ISO;
  const depth = W * 0.085;
  const height = H + depth + W * 0.32;
  const top = W * 0.32;

  const placed = useMemo(() => {
    const drawn = plants.length > MAX_DRAWN ? [...plants].sort((a, b) => b.size - a.size).slice(0, MAX_DRAWN) : plants;
    const spots = arrange(drawn.map((p) => ({ id: p.id, radius: SPECIES_BY_ID[p.speciesId]?.habit === 'tree' ? 1.7 : 1 })));
    const byId = new Map(drawn.map((p) => [p.id, p]));
    return spots
      .map((s) => ({ s, p: byId.get(s.id)! }))
      .sort((a, b) => a.s.u + a.s.v - (b.s.u + b.s.v));
  }, [plants]);

  // island corners (diamond): back, right, front, left
  const drawnCount = placed.length;
  const cx = W / 2;
  const back = `${cx},${top}`;
  const right = `${W * 0.985},${top + H / 2}`;
  const front = `${cx},${top + H}`;
  const left = `${W * 0.015},${top + H / 2}`;
  const pt = (u: number, v: number) => ({ x: cx + (u - v) * (W * 0.485), y: top + ((u + v) / 2) * H });

  return (
    <View style={{ width: W, height }} pointerEvents="none">
      <Svg width={W} height={height} style={StyleSheet.absoluteFill}>
        <Defs>
          <LinearGradient id="grass" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor="#8fd16a" />
            <Stop offset="1" stopColor="#5fb04a" />
          </LinearGradient>
          <LinearGradient id="soilL" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#9a6a3e" />
            <Stop offset="1" stopColor="#6a4426" />
          </LinearGradient>
          <LinearGradient id="soilR" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#7e5330" />
            <Stop offset="1" stopColor="#52341c" />
          </LinearGradient>
        </Defs>
        <Ellipse cx={cx} cy={top + H + depth + W * 0.05} rx={W * 0.36} ry={W * 0.045} fill="rgba(0,0,0,0.22)" />
        <Polygon points={`${left} ${front} ${cx},${top + H + depth} ${W * 0.015},${top + H / 2 + depth}`} fill="url(#soilL)" />
        <Polygon points={`${front} ${right} ${W * 0.985},${top + H / 2 + depth} ${cx},${top + H + depth}`} fill="url(#soilR)" />
        <Polygon points={`${back} ${right} ${front} ${left}`} fill="url(#grass)" />
        <Polygon points={`${back} ${right} ${front} ${left}`} fill="none" stroke="#b6e58f" strokeWidth={1.5} />
        {[0.18, 0.62, 0.82, 0.35].map((u, i) => {
          const a = pt(u, [0.3, 0.75, 0.2, 0.9][i]!);
          return <Ellipse key={i} cx={a.x} cy={a.y} rx={W * 0.07} ry={W * 0.035} fill="rgba(60,130,50,0.22)" />;
        })}
        <Path
          d={Array.from({ length: 24 }, (_, i) => {
            // the centre line of the path (see layout.pathDistance): u - v = 0.26 sin(2 pi a), u + v = 2a
            const a = 0.03 + (i / 23) * 0.94;
            const dd = 0.26 * Math.sin(a * Math.PI * 2);
            const q = pt(Math.max(0, Math.min(1, a + dd / 2)), Math.max(0, Math.min(1, a - dd / 2)));
            return `${i ? 'L' : 'M'} ${q.x} ${q.y}`;
          }).join(' ')}
          stroke="#e8dcc0"
          strokeWidth={W * 0.03}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          opacity={0.9}
        />
      </Svg>
      {placed.map(({ s, p }) => {
        const sp = spriteFor(p.speciesId, p.size);
        if (!sp) return null;
        const { sprite } = sp;
        const front01 = (s.u + s.v) / 2;
        // a quiet island draws its few plants larger; a busy one draws them smaller, so they fit the island
        const k = Math.max(0.6, Math.min(1.8, 1.8 - 0.02 * drawnCount));
        const cap = W * (0.34 - 0.0012 * Math.min(drawnCount, 100));
        const hPx = Math.max(12, Math.min(cap, gardenMetres(sprite.heightM) * (W / 9) * k * (0.85 + 0.3 * front01) * p.scale));
        const wPx = hPx * (sprite.px[0] / sprite.px[1]);
        const file = hPx < 90 && sprite.thumb ? sprite.thumb : sprite.file;
        const src = PARADISE_IMAGES[file] ?? PARADISE_IMAGES[sprite.file];
        if (!src) return null;
        const q = pt(s.u, s.v);
        return (
          <Image
            key={p.id}
            source={src}
            resizeMode="contain"
            style={{ position: 'absolute', width: wPx, height: hPx, left: q.x - wPx * sprite.pivot[0], top: q.y - hPx * sprite.pivot[1], transform: [{ scaleX: p.flip ? -1 : 1 }] }}
          />
        );
      })}
    </View>
  );
}
