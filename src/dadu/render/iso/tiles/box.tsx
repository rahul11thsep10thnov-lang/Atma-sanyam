// Isometric drawing helpers. Every prop sprite is drawn relative to the centre
// of its anchor tile's top face (0, 0) and composed from cuboids ("boxes"),
// so lighting is consistent: top face lightest, south-west face mid, south-east
// face darkest (sun from the north-east, as in the canon).
import React from 'react';
import { Ellipse, G, Path, Polygon } from 'react-native-svg';
import { TILE_H, TILE_W, tileToScreen } from '../isoMath';

export interface SpriteProps {
  /** Animation clock seconds (0 when static). */
  t: number;
  flags?: Partial<Record<'open' | 'on' | 'full' | 'clean' | 'ready' | 'inUse' | 'unlocked', boolean>>;
  stage?: 'seed' | 'germination' | 'seedling' | 'growing' | 'mature' | 'flowering' | 'fruiting' | 'harvest';
  season?: 'spring' | 'summer' | 'monsoon' | 'autumn' | 'winter';
  time?: 'morning' | 'afternoon' | 'evening' | 'night';
  /** Footprint in tiles when the sprite scales to it (fences, beds). */
  w?: number;
  d?: number;
}

export type SpriteFn = (p: SpriteProps) => React.ReactElement;

/** Darken/lighten a hex colour by a factor (-1..1). */
export function shade(hex: string, f: number): string {
  const n = parseInt(hex.slice(1), 16);
  const ch = (v: number) => Math.max(0, Math.min(255, Math.round(f < 0 ? v * (1 + f) : v + (255 - v) * f)));
  const r = ch((n >> 16) & 255), g = ch((n >> 8) & 255), b = ch(n & 255);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

/** Point on the floor plane for a fractional offset (in tiles) from the anchor tile centre, raised z px. */
export const pt = (ox: number, oy: number, z = 0) => tileToScreen(ox, oy, z);
const P = (ox: number, oy: number, z = 0) => { const { sx, sy } = pt(ox, oy, z); return `${sx},${sy}`; };

export interface BoxProps {
  /** Footprint in tiles, centred on (cx, cy) tile offsets. */
  w: number; d: number; h: number; cx?: number; cy?: number; z?: number;
  colour: string; top?: string; stroke?: string; strokeWidth?: number; opacity?: number;
}

/** A cuboid with the three visible faces. */
export function Box({ w, d, h, cx = 0, cy = 0, z = 0, colour, top, stroke, strokeWidth = 1, opacity }: BoxProps) {
  const x0 = cx - w / 2, x1 = cx + w / 2, y0 = cy - d / 2, y1 = cy + d / 2;
  const topC = top ?? shade(colour, 0.22);
  const left = shade(colour, -0.08);
  const right = shade(colour, -0.28);
  const line = stroke ?? shade(colour, -0.45);
  return (
    <G opacity={opacity}>
      <Polygon points={`${P(x0, y1, z)} ${P(x1, y1, z)} ${P(x1, y1, z + h)} ${P(x0, y1, z + h)}`} fill={left} stroke={line} strokeWidth={strokeWidth} strokeLinejoin="round" />
      <Polygon points={`${P(x1, y1, z)} ${P(x1, y0, z)} ${P(x1, y0, z + h)} ${P(x1, y1, z + h)}`} fill={right} stroke={line} strokeWidth={strokeWidth} strokeLinejoin="round" />
      <Polygon points={`${P(x0, y0, z + h)} ${P(x1, y0, z + h)} ${P(x1, y1, z + h)} ${P(x0, y1, z + h)}`} fill={topC} stroke={line} strokeWidth={strokeWidth} strokeLinejoin="round" />
    </G>
  );
}

/** A flat shape lying on the floor (rug, path, water). */
export function Flat({ w, d, cx = 0, cy = 0, colour, stroke, rx }: { w: number; d: number; cx?: number; cy?: number; colour: string; stroke?: string; rx?: boolean }) {
  const x0 = cx - w / 2, x1 = cx + w / 2, y0 = cy - d / 2, y1 = cy + d / 2;
  if (rx) {
    const c = pt(cx, cy);
    return <Ellipse cx={c.sx} cy={c.sy} rx={(w * TILE_W) / 2} ry={(d * TILE_H) / 2} fill={colour} stroke={stroke} strokeWidth={1} />;
  }
  return <Polygon points={`${P(x0, y0)} ${P(x1, y0)} ${P(x1, y1)} ${P(x0, y1)}`} fill={colour} stroke={stroke} strokeWidth={1} />;
}

/** A thin vertical plane along the south-west or south-east edge (fences, railings, backboards). */
export function Plane({ along, length, h, cx = 0, cy = 0, z = 0, colour, stroke }: { along: 'sw' | 'se'; length: number; h: number; cx?: number; cy?: number; z?: number; colour: string; stroke?: string }) {
  const a = along === 'sw' ? [pt(cx - length / 2, cy, z), pt(cx + length / 2, cy, z)] : [pt(cx, cy - length / 2, z), pt(cx, cy + length / 2, z)];
  return <Polygon points={`${a[0].sx},${a[0].sy} ${a[1].sx},${a[1].sy} ${a[1].sx},${a[1].sy - h} ${a[0].sx},${a[0].sy - h}`} fill={colour} stroke={stroke ?? shade(colour, -0.4)} strokeWidth={1} strokeLinejoin="round" />;
}

/** A billboard drawn upright at the tile centre: children are in a local space whose (0, 0) is the floor point. */
export function Billboard({ children, cx = 0, cy = 0, z = 0, scale = 1 }: { children: React.ReactNode; cx?: number; cy?: number; z?: number; scale?: number }) {
  const c = pt(cx, cy, z);
  return <G transform={`translate(${c.sx} ${c.sy}) scale(${scale})`}>{children}</G>;
}

export function Drop({ cx = 0, cy = 0, rx = 0.5, ry = 0.5, opacity = 0.18 }: { cx?: number; cy?: number; rx?: number; ry?: number; opacity?: number }) {
  const c = pt(cx, cy);
  return <Ellipse cx={c.sx} cy={c.sy} rx={rx * TILE_W * 0.5} ry={ry * TILE_H * 0.5} fill="#3A2E2A" opacity={opacity} />;
}

/** A leafy blob used by trees, bushes and bed plants. */
export function Canopy({ x, y, rx, ry, colour, light }: { x: number; y: number; rx: number; ry: number; colour: string; light?: string }) {
  return (
    <G>
      <Ellipse cx={x} cy={y} rx={rx} ry={ry} fill={colour} stroke={shade(colour, -0.35)} strokeWidth={1} />
      <Ellipse cx={x - rx * 0.3} cy={y - ry * 0.35} rx={rx * 0.5} ry={ry * 0.4} fill={light ?? shade(colour, 0.2)} opacity={0.8} />
    </G>
  );
}

export { Path as SvgPath, TILE_H, TILE_W };
