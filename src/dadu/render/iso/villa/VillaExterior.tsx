// The modern Indian family villa (visual canon v3 section 2) drawn as one
// isometric prop anchored on its centre tile: two storeys, flat roof terrace
// with a pergola, first-floor balcony with planters, large windows, saffron
// front door, entrance veranda with a swing, tulsi pot and rangoli.
import React from 'react';
import { Circle, Ellipse, G, Path, Rect } from 'react-native-svg';
import { Billboard, Box, Drop, Flat, Plane, pt, shade } from '../tiles/box';
import type { SpriteFn, SpriteProps } from '../tiles/box';
import { palette } from '../../palette';

const WALL = '#FFF6EA';
const STONE = '#B9A58A';
const TEAK = '#8B5A2B';
const GLASS = '#BFE6F7';
const FLOOR_H = 74;

function Window({ along, length, cx, cy, z, lit }: { along: 'sw' | 'se'; length: number; cx: number; cy: number; z: number; lit: boolean }) {
  return (
    <G>
      <Plane along={along} length={length} h={34} cx={cx} cy={cy} z={z} colour={lit ? palette.haldi : GLASS} stroke="#6F8F9C" />
      <Plane along={along} length={length} h={3} cx={cx} cy={cy} z={z + 34} colour={TEAK} />
    </G>
  );
}

export const VILLA_FOOTPRINT = { w: 7, d: 5 };

/** Draw the villa centred on (0, 0) tile offsets. `lit` lights the windows in the evening and at night. */
export function VillaBuilding({ t, time, season }: SpriteProps) {
  const lit = time === 'evening' || time === 'night';
  const swing = t ? Math.sin(t * 1.3) * 5 : 0;
  return (
    <G>
      <Drop rx={VILLA_FOOTPRINT.w + 1} ry={VILLA_FOOTPRINT.d + 1} opacity={0.14} />
      {/* plinth and entrance path */}
      <Flat w={VILLA_FOOTPRINT.w + 0.6} d={VILLA_FOOTPRINT.d + 0.6} colour="#E9D9C0" stroke="#D9C4A4" />
      <Flat w={1.2} d={1.6} cy={VILLA_FOOTPRINT.d / 2 + 0.9} cx={-1.2} colour="#E9D9C0" stroke="#D9C4A4" />
      {/* ground floor: main block */}
      <Box w={5} d={4} h={FLOOR_H} cx={-0.5} cy={0} colour={WALL} top="#F4ECDE" />
      {/* stone-clad accent wing on the east */}
      <Box w={2} d={3} h={FLOOR_H} cx={3} cy={-0.5} colour={STONE} top="#D4C4A8" />
      {/* veranda roof slab on the south-west */}
      <Box w={2.6} d={1.2} h={6} cx={-1.2} cy={2.4} z={FLOOR_H - 14} colour="#E9D9C0" top="#F4ECDE" />
      <Box w={0.14} d={0.14} h={FLOOR_H - 14} cx={-2.4} cy={2.9} colour={TEAK} />
      <Box w={0.14} d={0.14} h={FLOOR_H - 14} cx={0} cy={2.9} colour={TEAK} />
      {/* front door and windows (south-west face) */}
      <Plane along="sw" length={0.9} h={52} cx={-1.2} cy={2} colour={palette.saffron} stroke="#B8780F" />
      <Billboard cx={-1.2} cy={2} z={28}><Circle cx={10} cy={0} r={2.5} fill="#B8780F" /><Rect x={-14} y={-20} width={28} height={6} rx={1} fill="#C98310" /></Billboard>
      <Window along="sw" length={1.2} cx={0.9} cy={2} z={22} lit={lit} />
      <Window along="sw" length={1.2} cx={-2.4} cy={2} z={22} lit={lit} />
      <Window along="sw" length={1.4} cx={3} cy={1} z={22} lit={lit} />
      {/* windows on the south-east face */}
      <Window along="se" length={1.2} cx={4} cy={-1.2} z={22} lit={lit} />
      <Window along="se" length={1.2} cx={2} cy={1} z={22} lit={lit} />
      {/* first floor set back, with balcony */}
      <Box w={4} d={3} h={FLOOR_H} cx={-1} cy={-0.5} z={FLOOR_H} colour={WALL} top="#F4ECDE" />
      <Window along="sw" length={1.6} cx={-1} cy={1} z={FLOOR_H + 22} lit={lit} />
      <Window along="se" length={1.2} cx={1} cy={-0.8} z={FLOOR_H + 22} lit={lit} />
      {/* balcony with glass railing and planters */}
      <Box w={2.6} d={1} h={8} cx={1.8} cy={0.8} z={FLOOR_H} colour="#E9D9C0" top="#F4ECDE" />
      <Plane along="sw" length={2.6} h={22} cx={1.8} cy={1.3} z={FLOOR_H + 8} colour={GLASS} stroke="#8CCBE0" />
      <Plane along="se" length={1} h={22} cx={3.1} cy={0.8} z={FLOOR_H + 8} colour={GLASS} stroke="#8CCBE0" />
      {[0.8, 1.8, 2.8].map((x) => <Billboard key={x} cx={x} cy={1.3} z={FLOOR_H + 26}><Ellipse cx={0} cy={0} rx={9} ry={4} fill="#D9663D" /><Ellipse cx={0} cy={-5} rx={9} ry={5} fill={palette.leaf} /><Circle cx={-4} cy={-7} r={2.5} fill={palette.rose} /><Circle cx={4} cy={-6} r={2.5} fill={palette.marigold} /></Billboard>)}
      {/* roof terrace: parapet, pergola, water tank, solar panel */}
      <Box w={4.2} d={3.2} h={6} cx={-1} cy={-0.5} z={FLOOR_H * 2} colour="#E9D9C0" top="#F4ECDE" />
      <Plane along="sw" length={4.2} h={10} cx={-1} cy={1.1} z={FLOOR_H * 2 + 6} colour="#F4ECDE" stroke="#D9C4A4" />
      <Plane along="se" length={3.2} h={10} cx={1.1} cy={-0.5} z={FLOOR_H * 2 + 6} colour="#E9D9C0" stroke="#D9C4A4" />
      {[[-2.3, -1.5], [-0.3, -1.5], [-2.3, 0.3], [-0.3, 0.3]].map(([x, y], i) => <Box key={i} w={0.12} d={0.12} h={40} cx={x} cy={y} z={FLOOR_H * 2 + 6} colour={TEAK} />)}
      {[-1.5, -1, -0.5, 0, 0.3].map((y) => <Box key={y} w={2.3} d={0.1} h={4} cx={-1.3} cy={y} z={FLOOR_H * 2 + 46} colour={TEAK} />)}
      <Box w={0.7} d={0.7} h={22} cx={0.6} cy={-1.4} z={FLOOR_H * 2 + 6} colour="#3A3F4A" top="#6F7580" />
      <Box w={1} d={0.8} h={4} cx={0.5} cy={0.2} z={FLOOR_H * 2 + 8} colour="#2F3C7E" top="#5BA8C9" />
      {/* nameplate */}
      <Billboard cx={-0.4} cy={2} z={44}><Rect x={-11} y={-6} width={22} height={9} rx={2} fill={palette.marigold} stroke="#B8780F" strokeWidth={0.8} /><Path d="M -7 -2 h 14" stroke="#8B5A2B" strokeWidth={1.5} /></Billboard>
      {/* veranda: swing, tulsi, rangoli, shoe rack */}
      <Billboard cx={-2} cy={2.6} z={FLOOR_H - 14}><G transform={`rotate(${swing} 0 0)`}><Path d="M -16 0 V 42 M 16 0 V 42" stroke="#6F5F58" strokeWidth={1.4} /><Rect x={-20} y={40} width={40} height={7} rx={2} fill={TEAK} /><Rect x={-18} y={35} width={36} height={6} rx={2} fill="#D9663D" /></G></Billboard>
      <Box w={0.4} d={0.4} h={18} cx={0.2} cy={2.8} colour="#D9663D" top="#E9B98E" />
      <Billboard cx={0.2} cy={2.8} z={18}><Path d="M 0 0 V -18 M 0 -10 q -7 -2 -7 -8 q 7 0 7 8 q 7 -2 7 -8 q -7 0 -7 8" stroke={palette.peepal} strokeWidth={2} fill={palette.leaf} /></Billboard>
      <G transform={`translate(${pt(-1.2, 3.6).sx} ${pt(-1.2, 3.6).sy})`}><Ellipse cx={0} cy={0} rx={18} ry={9} fill={palette.saffron} /><Ellipse cx={0} cy={0} rx={11} ry={5.5} fill="#FFF8EE" /><Ellipse cx={0} cy={0} rx={5} ry={2.5} fill="#D9663D" /></G>
      {season === 'monsoon' && <Billboard cx={-1} cy={2.2} z={FLOOR_H}><Path d="M -40 -4 q 40 10 80 0" stroke="#8CCBE0" strokeWidth={1.2} fill="none" opacity={0.6} /></Billboard>}
    </G>
  );
}

export const villa_building: SpriteFn = (p) => <VillaBuilding {...p} />;

/** Garden lamp used along the driveway. */
export const garden_lamp: SpriteFn = ({ time }) => {
  const lit = time === 'evening' || time === 'night';
  return <Billboard><Rect x={-1.5} y={-44} width={3} height={44} fill="#3A3F4A" /><Rect x={-6} y={-54} width={12} height={10} rx={2} fill={lit ? palette.haldi : '#9AA3AD'} stroke="#3A3F4A" strokeWidth={1} />{lit && <Ellipse cx={0} cy={-48} rx={16} ry={9} fill={palette.haldi} opacity={0.25} />}</Billboard>;
};

/** Gate pillars and the compound wall segment. */
export const gate: SpriteFn = () => (
  <G>
    <Box w={0.4} d={0.4} h={44} cx={-0.8} colour={STONE} top="#D4C4A8" />
    <Box w={0.4} d={0.4} h={44} cx={0.8} colour={STONE} top="#D4C4A8" />
    <Plane along="sw" length={1.2} h={30} z={4} colour={shade(TEAK, 0.1)} stroke="#5E3A1A" />
  </G>
);

export const compound_wall: SpriteFn = ({ w = 1, d = 0 }) => (d > 0 ? <Plane along="se" length={d} h={26} colour="#E9D9C0" stroke="#C9B698" /> : <Plane along="sw" length={w} h={26} colour="#E9D9C0" stroke="#C9B698" />);

export const bicycle: SpriteFn = () => (
  <Billboard><Circle cx={-10} cy={-6} r={6} fill="none" stroke="#3A2E2A" strokeWidth={2} /><Circle cx={10} cy={-6} r={6} fill="none" stroke="#3A2E2A" strokeWidth={2} /><Path d="M -10 -6 L -2 -16 L 10 -6 M -2 -16 L 4 -16 M 2 -10 L 8 -18" stroke="#D9663D" strokeWidth={2} fill="none" /></Billboard>
);

export const VILLA = { villa_building, garden_lamp, gate, compound_wall, bicycle } satisfies Record<string, SpriteFn>;
