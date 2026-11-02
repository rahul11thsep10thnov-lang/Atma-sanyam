// Interior props. Each sprite is anchored at its tile centre; multi-tile
// furniture reports its footprint through FOOTPRINTS (see index.ts).
import React from 'react';
import { Circle, Ellipse, G, Path, Rect } from 'react-native-svg';
import { Billboard, Box, Drop, Flat, Plane, pt } from './box';
import type { SpriteFn } from './box';
import { palette } from '../../palette';

const wood = '#B07A45';
const darkWood = '#7A4E2A';
const cream = '#FFF3DC';

export const sofa: SpriteFn = () => (
  <G>
    <Drop rx={2} ry={1} />
    <Box w={2} d={0.9} h={16} colour="#D9663D" />
    <Box w={2} d={0.35} h={34} cy={-0.3} colour="#C4532E" />
    <Box w={0.3} d={0.9} h={26} cx={-0.85} colour="#C4532E" />
    <Box w={0.3} d={0.9} h={26} cx={0.85} colour="#C4532E" />
    <Box w={0.6} d={0.5} h={8} cx={-0.35} cy={0.1} z={16} colour="#FFC94D" />
    <Box w={0.6} d={0.5} h={8} cx={0.35} cy={0.1} z={16} colour="#2E86AB" />
  </G>
);

export const tv_wall: SpriteFn = ({ flags }) => (
  <G>
    <Box w={2.2} d={0.3} h={70} colour={darkWood} />
    <Billboard cy={-0.15} z={62}>
      <Rect x={-44} y={-24} width={88} height={50} rx={3} fill="#1E1612" stroke="#3A2E2A" strokeWidth={1.5} />
      <Rect x={-40} y={-20} width={80} height={42} fill={flags?.on ? '#5BA8C9' : '#2A2F3A'} />
      {flags?.on && <G><Circle cx={-12} cy={2} r={8} fill="#FFC94D" /><Path d="M 4 -4 l 14 6 l -14 6 Z" fill="#FFF8EE" /></G>}
    </Billboard>
    <Box w={2.2} d={0.3} h={12} z={0} colour={wood} />
  </G>
);

export const bookshelf: SpriteFn = () => (
  <G>
    <Box w={1.4} d={0.45} h={88} colour={darkWood} />
    <Billboard cy={0.23} z={0}>
      <G transform="translate(-40 -84)">
        {[0, 1, 2, 3].map((r) => (
          <G key={r} transform={`translate(0 ${r * 20})`}>
            <Rect x={2} y={0} width={76} height={18} fill="#5E3A1A" />
            {[0, 1, 2, 3, 4, 5, 6].map((i) => <Rect key={i} x={5 + i * 10.5} y={3 + ((i * 3 + r) % 4)} width={8} height={15 - ((i * 3 + r) % 4)} rx={1} fill={['#D9663D', '#2E86AB', '#4E9F3D', '#F4A523', '#8E4585', '#2F3C7E', '#E07A95'][(i + r) % 7]} />)}
          </G>
        ))}
      </G>
    </Billboard>
  </G>
);

export const telescope: SpriteFn = () => (
  <G>
    <Drop rx={0.8} ry={0.8} />
    <Billboard>
      <Path d="M -14 0 L 0 -38 M 14 0 L 0 -38 M 0 0 L 0 -38" stroke="#5E3A1A" strokeWidth={3} strokeLinecap="round" />
      <G transform="rotate(-35 0 -40)">
        <Rect x={-26} y={-47} width={52} height={14} rx={5} fill={palette.indigo} stroke="#1F2A5C" strokeWidth={1} />
        <Rect x={20} y={-49} width={14} height={18} rx={4} fill={palette.saffron} stroke="#B8780F" strokeWidth={1} />
      </G>
      <Circle cx={0} cy={-40} r={5} fill={palette.saffron} stroke="#B8780F" strokeWidth={1} />
    </Billboard>
  </G>
);

export const globe: SpriteFn = ({ t }) => (
  <G>
    <Box w={0.5} d={0.5} h={30} colour={wood} />
    <Billboard z={30}>
      <Circle cx={0} cy={-18} r={17} fill={palette.monsoon} stroke="#1F6C8C" strokeWidth={1} />
      <Path d={`M ${-14 + (t ? (t * 6) % 10 : 0)} -22 q 8 -6 14 2 q 6 8 12 0 M -12 -10 q 10 10 22 2`} stroke={palette.leaf} strokeWidth={4} fill="none" strokeLinecap="round" />
      <Path d="M 0 -36 A 18 18 0 0 1 0 0" fill="none" stroke={palette.saffron} strokeWidth={2.5} />
    </Billboard>
  </G>
);

export const rug: SpriteFn = ({ w = 2.4, d = 1.6 }) => (
  <G>
    <Flat w={w} d={d} colour="#D9663D" rx />
    <Flat w={w * 0.8} d={d * 0.8} colour={palette.saffron} rx />
    <Flat w={w * 0.5} d={d * 0.5} colour="#D9663D" rx />
  </G>
);

export const kitchen_island: SpriteFn = ({ flags }) => (
  <G>
    <Drop rx={2.2} ry={1.2} />
    <Box w={2.2} d={1} h={40} colour="#E9D9C0" top="#F7F1E6" />
    <Box w={2.3} d={1.1} h={4} z={40} colour="#9AA3AD" top="#C9D1D8" />
    <Billboard cx={-0.5} z={44}><Circle cx={0} cy={-2} r={9} fill="#6F7580" /><Circle cx={0} cy={-2} r={6} fill="#3A2E2A" /></Billboard>
    <Billboard cx={0.5} z={44}><Ellipse cx={0} cy={-3} rx={12} ry={6} fill="#A9B7BF" stroke="#6F7580" strokeWidth={1} /><Path d="M 0 -3 v -16 h 8" stroke="#6F7580" strokeWidth={3} fill="none" strokeLinecap="round" /></Billboard>
    {flags?.on && <Billboard cx={-0.5} z={50}><Ellipse cx={0} cy={-6} rx={5} ry={8} fill="#F4A523" opacity={0.8} /></Billboard>}
  </G>
);

export const stove: SpriteFn = ({ flags }) => (
  <G>
    <Box w={1} d={1} h={38} colour="#A9B7BF" top="#DDE3E8" />
    <Billboard cx={-0.2} cy={-0.2} z={38}><Circle cx={0} cy={0} r={7} fill="#3A2E2A" />{flags?.on && <Circle cx={0} cy={0} r={4} fill="#F4A523" />}</Billboard>
    <Billboard cx={0.25} cy={0.25} z={38}><Circle cx={0} cy={0} r={7} fill="#3A2E2A" /></Billboard>
  </G>
);

export const fridge: SpriteFn = ({ flags }) => (
  <G>
    <Box w={0.8} d={0.8} h={78} colour="#DDE3E8" top="#F2F5F7" />
    <Plane along="sw" length={0.7} h={30} cy={0.4} z={44} colour={flags?.open ? '#FFF8EE' : '#CFD6DC'} />
    <Billboard cy={0.4} z={40}><Rect x={-3} y={-14} width={3} height={12} rx={1.5} fill="#6F7580" /></Billboard>
  </G>
);

export const dining_table: SpriteFn = ({ flags }) => (
  <G>
    <Drop rx={2} ry={1.3} />
    <Box w={0.25} d={0.25} h={30} cx={-0.7} cy={-0.4} colour={darkWood} />
    <Box w={0.25} d={0.25} h={30} cx={0.7} cy={0.4} colour={darkWood} />
    <Box w={2} d={1.2} h={6} z={30} colour={wood} top="#D4A06A" />
    {flags?.full !== false && (
      <G>
        <Billboard cx={-0.5} cy={-0.2} z={36}><Circle cx={0} cy={0} r={8} fill="#FFFFFF" stroke="#C9C2BC" strokeWidth={1} /><Circle cx={0} cy={0} r={5} fill="#F4A523" /></Billboard>
        <Billboard cx={0.5} cy={0.2} z={36}><Circle cx={0} cy={0} r={8} fill="#FFFFFF" stroke="#C9C2BC" strokeWidth={1} /><Circle cx={0} cy={0} r={5} fill="#4E9F3D" /></Billboard>
        <Billboard z={36}><Ellipse cx={0} cy={-3} rx={7} ry={4} fill="#A9B7BF" /><Path d="M -4 -5 q 4 -8 8 0" stroke="#6F7580" strokeWidth={1.5} fill="none" /></Billboard>
      </G>
    )}
  </G>
);

export const chair: SpriteFn = () => (
  <G>
    <Box w={0.6} d={0.6} h={22} colour={wood} />
    <Plane along="sw" length={0.6} h={30} cy={-0.3} z={22} colour={darkWood} />
  </G>
);

export const bed: SpriteFn = ({ flags }) => (
  <G>
    <Drop rx={2.2} ry={1.3} />
    <Box w={2} d={1.2} h={18} colour={darkWood} />
    <Box w={1.9} d={1.1} h={12} z={18} colour="#FFFFFF" top="#F7F7F7" />
    <Box w={1.8} d={0.8} h={8} z={30} cy={0.15} colour={flags?.clean === false ? '#C9B698' : palette.monsoon} top={flags?.clean === false ? '#E9D9C0' : '#5BA8C9'} />
    <Box w={0.6} d={0.4} h={8} z={30} cy={-0.35} colour="#FFF8EE" top="#FFFFFF" />
    <Plane along="sw" length={2} h={36} cy={-0.6} z={18} colour={darkWood} />
  </G>
);

export const desk: SpriteFn = ({ flags }) => (
  <G>
    <Drop rx={1.6} ry={1} />
    <Box w={0.5} d={0.8} h={32} cx={-0.5} colour={darkWood} />
    <Box w={0.2} d={0.2} h={32} cx={0.6} cy={0.3} colour={darkWood} />
    <Box w={1.6} d={0.9} h={5} z={32} colour={wood} top="#D4A06A" />
    <Billboard cx={-0.2} z={37}><Rect x={-16} y={-24} width={32} height={22} rx={2} fill="#2A2F3A" stroke="#1E1612" strokeWidth={1} /><Rect x={-14} y={-22} width={28} height={18} fill={flags?.on ? '#BFE6F7' : '#3A3F4A'} /><Rect x={-8} y={-2} width={16} height={3} fill="#6F7580" /></Billboard>
    <Billboard cx={0.45} cy={0.1} z={37}><Rect x={-8} y={-5} width={16} height={5} rx={1} fill="#FFF8EE" stroke="#C9C2BC" strokeWidth={0.8} /><Rect x={-6} y={-9} width={12} height={4} rx={1} fill="#D9663D" /></Billboard>
  </G>
);

export const easel: SpriteFn = () => (
  <G>
    <Drop rx={0.9} ry={0.7} />
    <Billboard>
      <Path d="M -16 0 L 0 -60 L 16 0 M 0 -60 V 0" stroke="#8B5A2B" strokeWidth={3} strokeLinecap="round" />
      <Rect x={-20} y={-58} width={40} height={32} fill="#FFFFFF" stroke="#8B5A2B" strokeWidth={2} />
      <Path d="M -16 -32 q 10 -22 18 -8 q 8 -16 14 -2" stroke={palette.plum} strokeWidth={3} fill="none" />
      <Circle cx={10} cy={-50} r={5} fill={palette.saffron} />
    </Billboard>
  </G>
);

export const paint_table: SpriteFn = () => (
  <G>
    <Box w={1} d={0.7} h={28} colour={wood} top="#D4A06A" />
    {['#D9663D', '#2E86AB', '#4E9F3D', '#FFC94D'].map((c, i) => <Box key={c} w={0.16} d={0.16} h={10} z={28} cx={-0.33 + i * 0.22} colour={c} />)}
  </G>
);

export const harmonium: SpriteFn = () => (
  <G>
    <Drop rx={1.6} ry={0.9} />
    <Box w={1.5} d={0.7} h={26} colour={darkWood} />
    <Billboard cy={0.35} z={26}>
      <G transform="translate(-40 -2)">{Array.from({ length: 14 }, (_, i) => <Rect key={i} x={i * 5.8} y={0} width={5.4} height={12} rx={1} fill="#FFF8EE" stroke="#C9B698" strokeWidth={0.6} />)}{[0, 1, 3, 4, 5, 7, 8, 10, 11, 12].map((i) => <Rect key={`b${i}`} x={i * 5.8 + 4} y={0} width={3} height={7} fill="#3A2E2A" />)}</G>
    </Billboard>
    <Box w={0.4} d={0.3} h={14} z={26} cx={-0.45} cy={-0.2} colour={wood} />
  </G>
);

export const tabla: SpriteFn = () => (
  <G>
    <Billboard cx={-0.2}><Path d="M -11 0 q 0 -22 11 -22 q 11 0 11 22 Z" fill="#8B5A2B" /><Ellipse cx={0} cy={-22} rx={11} ry={5} fill="#E9D9C0" stroke="#8B5A2B" strokeWidth={1} /><Circle cx={0} cy={-22} r={4} fill="#3A2E2A" /></Billboard>
    <Billboard cx={0.25}><Path d="M -13 0 q 0 -20 13 -20 q 13 0 13 20 Z" fill="#A9B7BF" /><Ellipse cx={0} cy={-20} rx={13} ry={6} fill="#E9D9C0" stroke="#8B5A2B" strokeWidth={1} /><Circle cx={0} cy={-20} r={5} fill="#3A2E2A" /></Billboard>
  </G>
);

export const sitar: SpriteFn = () => (
  <Billboard>
    <Ellipse cx={0} cy={-12} rx={13} ry={12} fill="#C98A5B" stroke="#8B5A2B" strokeWidth={1} />
    <Rect x={-3} y={-70} width={6} height={60} rx={3} fill="#8B5A2B" />
    <Rect x={-5} y={-76} width={10} height={9} rx={3} fill="#5E3A1A" />
    <Circle cx={0} cy={-12} r={4} fill="#5E3A1A" />
  </Billboard>
);

export const lab_bench: SpriteFn = ({ flags }) => (
  <G>
    <Drop rx={2.2} ry={1.1} />
    <Box w={2.2} d={0.9} h={34} colour="#5E3A1A" top="#8B5A2B" />
    <Billboard cx={-0.7} z={34}><Path d="M -7 0 V -16 h 14 V 0 Z" fill="#DDEFF7" stroke="#6F8F9C" strokeWidth={1} /><Rect x={-6} y={-8} width={12} height={7} fill={palette.monsoon} /></Billboard>
    <Billboard cx={-0.2} z={34}><Path d="M -8 0 L -5 -18 h 10 L 8 0 Z" fill="#DDEFF7" stroke="#6F8F9C" strokeWidth={1} /><Path d="M -6 0 l 2 -8 h 8 l 2 8 Z" fill={palette.peepal} /></Billboard>
    <Billboard cx={0.35} z={34}><Path d="M -7 0 V -14 a 7 7 0 0 1 14 0 V 0 h -4 V -14 a 3 3 0 0 0 -6 0 V 0 Z" fill="#D9663D" /></Billboard>
    <Billboard cx={0.85} z={34}><Rect x={-9} y={-5} width={18} height={5} rx={2} fill={palette.indigo} /><Path d="M 0 -5 V -20 q -8 -2 -6 -12" stroke={palette.indigo} strokeWidth={4} fill="none" strokeLinecap="round" /><Circle cx={4} cy={-10} r={3} fill="#BFE6F7" /></Billboard>
    {flags?.on && <Billboard cx={0.6} cy={-0.3} z={48}><Circle cx={0} cy={0} r={5} fill="#FFC94D" /></Billboard>}
  </G>
);

export const activity_mat: SpriteFn = () => (
  <G>
    <Flat w={2} d={2} colour="#BFE6F7" stroke="#8CCBE0" />
    <Flat w={1} d={1} cx={-0.5} cy={-0.5} colour="#FFC94D" /><Flat w={1} d={1} cx={0.5} cy={0.5} colour="#F28DA6" />
  </G>
);

export const toy_box: SpriteFn = ({ flags }) => (
  <G>
    <Box w={0.8} d={0.6} h={22} colour={palette.monsoon} />
    {flags?.open && <G><Billboard z={22} cx={-0.2}><Circle cx={0} cy={-6} r={6} fill="#D9663D" /></Billboard><Billboard z={22} cx={0.2}><Rect x={-5} y={-12} width={10} height={10} fill="#FFC94D" /></Billboard></G>}
  </G>
);

export const wardrobe: SpriteFn = () => (
  <G>
    <Box w={1.2} d={0.5} h={84} colour={darkWood} />
    <Plane along="sw" length={1.1} h={76} cy={0.25} z={4} colour={wood} />
    <Billboard cy={0.25} z={40}><Circle cx={-2} cy={0} r={2} fill="#FFC94D" /><Circle cx={4} cy={0} r={2} fill="#FFC94D" /></Billboard>
  </G>
);

export const lamp: SpriteFn = ({ flags, time }) => {
  const lit = flags?.on ?? (time === 'evening' || time === 'night');
  return (
    <Billboard>
      <Rect x={-2} y={-46} width={4} height={46} fill="#8B5A2B" />
      <Ellipse cx={0} cy={0} rx={9} ry={3.5} fill="#5E3A1A" />
      <Path d="M -14 -46 h 28 l -4 -16 h -20 Z" fill={lit ? '#FFE08A' : '#E9D9C0'} stroke="#C9B698" strokeWidth={1} />
      {lit && <Ellipse cx={0} cy={-40} rx={20} ry={10} fill="#FFE08A" opacity={0.3} />}
    </Billboard>
  );
};

export const washbasin: SpriteFn = ({ flags }) => (
  <G>
    <Box w={0.8} d={0.6} h={30} colour="#DDE3E8" top="#FFFFFF" />
    <Billboard z={30}><Ellipse cx={0} cy={-1} rx={14} ry={6} fill={flags?.on ? '#BFE6F7' : '#F2F5F7'} stroke="#A9B7BF" strokeWidth={1} /><Path d="M 0 -4 v -12 h 6" stroke="#6F7580" strokeWidth={3} fill="none" strokeLinecap="round" /></Billboard>
    <Plane along="sw" length={0.8} h={34} cy={-0.3} z={30} colour="#BFE6F7" stroke="#8CCBE0" />
  </G>
);

export const bathtub: SpriteFn = ({ flags }) => (
  <G>
    <Box w={1.6} d={0.9} h={20} colour="#DDE3E8" top="#FFFFFF" />
    <Flat w={1.3} d={0.6} colour={flags?.full ? '#BFE6F7' : '#F2F5F7'} rx />
    <Billboard cx={0.6} cy={0} z={20}><Path d="M 0 0 v -10 h -6" stroke="#6F7580" strokeWidth={3} fill="none" strokeLinecap="round" /></Billboard>
  </G>
);

export const toothbrush_shelf: SpriteFn = () => (
  <Plane along="sw" length={0.8} h={6} cy={-0.3} z={46} colour={wood} />
);

export const pergola: SpriteFn = () => (
  <G>
    {[[-1.4, -0.8], [1.4, -0.8], [-1.4, 0.8], [1.4, 0.8]].map(([x, y], i) => <Box key={i} w={0.15} d={0.15} h={70} cx={x} cy={y} colour={darkWood} />)}
    {[-0.8, -0.3, 0.2, 0.7].map((y, i) => <Box key={i} w={3} d={0.12} h={5} cy={y} z={70} colour={wood} />)}
    <Box w={1.2} d={0.6} h={14} cy={0.2} colour="#D9663D" top="#F4A523" />
  </G>
);

export const planter_rail: SpriteFn = ({ w = 2 }) => (
  <G>
    <Plane along="sw" length={w} h={18} colour="#9AA3AD" stroke="#6F7580" />
    {Array.from({ length: Math.round(w * 2) }, (_, i) => <Billboard key={i} cx={-w / 2 + 0.25 + i * 0.5} z={14}><Ellipse cx={0} cy={0} rx={9} ry={5} fill={['#E07A95', '#FFC94D', '#8E4585'][i % 3]} /><Ellipse cx={0} cy={-4} rx={8} ry={5} fill={palette.leaf} /></Billboard>)}
  </G>
);

export const swing_seat: SpriteFn = ({ t }) => {
  const a = t ? Math.sin(t * 1.4) * 6 : 0;
  return (
    <G>
      <Box w={0.12} d={0.12} h={90} cx={-0.7} colour={darkWood} />
      <Box w={0.12} d={0.12} h={90} cx={0.7} colour={darkWood} />
      <Box w={1.6} d={0.12} h={5} z={90} colour={darkWood} />
      <Billboard z={90}>
        <G transform={`rotate(${a} 0 0)`}>
          <Path d="M -20 0 V 52 M 20 0 V 52" stroke="#6F5F58" strokeWidth={1.5} />
          <Rect x={-26} y={50} width={52} height={8} rx={3} fill={wood} stroke={darkWood} strokeWidth={1} />
          <Rect x={-24} y={44} width={48} height={8} rx={3} fill="#D9663D" />
        </G>
      </Billboard>
    </G>
  );
};

export const shoe_rack: SpriteFn = () => (
  <G>
    <Box w={0.8} d={0.4} h={18} colour={wood} />
    <Billboard cy={0.2} z={6}><Ellipse cx={-8} cy={0} rx={6} ry={3} fill="#D9663D" /><Ellipse cx={6} cy={0} rx={6} ry={3} fill="#4E9F3D" /></Billboard>
  </G>
);

export const tulsi_pot: SpriteFn = () => (
  <G>
    <Box w={0.5} d={0.5} h={22} colour="#D9663D" top="#E9B98E" />
    <Billboard z={22}><Path d="M 0 0 V -22 M 0 -12 q -8 -2 -8 -9 q 8 0 8 9 q 8 -2 8 -9 q -8 0 -8 9 M 0 -20 q -6 -2 -6 -7 q 6 0 6 7 q 6 -2 6 -7 q -6 0 -6 7" stroke={palette.peepal} strokeWidth={2} fill={palette.leaf} /></Billboard>
  </G>
);

export const rangoli: SpriteFn = () => {
  const c = pt(0, 0);
  return (
    <G>
      <Ellipse cx={c.sx} cy={c.sy} rx={22} ry={11} fill={palette.saffron} />
      <Ellipse cx={c.sx} cy={c.sy} rx={14} ry={7} fill="#FFF8EE" />
      <Ellipse cx={c.sx} cy={c.sy} rx={7} ry={3.5} fill="#D9663D" />
      {[0, 1, 2, 3].map((i) => <Ellipse key={i} cx={c.sx + [0, 18, 0, -18][i]} cy={c.sy + [-9, 0, 9, 0][i]} rx={3} ry={1.6} fill={palette.peepal} />)}
    </G>
  );
};

export const door: SpriteFn = ({ flags }) => (
  <G>
    <Plane along="se" length={0.9} h={60} colour={flags?.open ? '#8B5A2B' : palette.saffron} stroke="#B8780F" />
    <Billboard cy={0.3} z={30}><Circle cx={2} cy={0} r={2.5} fill="#B8780F" /></Billboard>
  </G>
);

export const carrom: SpriteFn = () => (
  <G>
    <Box w={0.9} d={0.9} h={16} colour={wood} top="#E9D9C0" />
    <Billboard z={16}><Circle cx={0} cy={0} r={2.5} fill="#3A2E2A" /><Circle cx={-6} cy={-2} r={2} fill="#D9663D" /><Circle cx={5} cy={2} r={2} fill="#FFF8EE" /></Billboard>
  </G>
);

export const clock: SpriteFn = ({ t }) => (
  <Billboard z={120}>
    <Circle cx={0} cy={0} r={11} fill="#FFF8EE" stroke="#8B5A2B" strokeWidth={2.5} />
    <Path d={`M 0 0 V -7 M 0 0 L ${Math.sin(t) * 6} ${-Math.cos(t) * 6}`} stroke="#3A2E2A" strokeWidth={1.5} strokeLinecap="round" />
  </Billboard>
);

export const chess_table: SpriteFn = () => (
  <G>
    <Box w={0.8} d={0.8} h={26} colour={darkWood} />
    <Billboard z={26} cy={0}><G transform="translate(-12 -12)">{Array.from({ length: 16 }, (_, i) => <Rect key={i} x={(i % 4) * 6} y={Math.floor(i / 4) * 6 * 0.5 + (i % 4) * 0} width={6} height={3} fill={(i + Math.floor(i / 4)) % 2 ? '#3A2E2A' : '#FFF8EE'} transform="skewX(-26)" />)}</G></Billboard>
  </G>
);

export const bookcase_low: SpriteFn = () => (
  <G>
    <Box w={1.2} d={0.4} h={30} colour={darkWood} />
    <Billboard cy={0.2} z={4}><G transform="translate(-30 -24)">{[0, 1, 2, 3, 4, 5].map((i) => <Rect key={i} x={i * 10} y={2 + (i % 3)} width={8} height={18 - (i % 3)} rx={1} fill={['#D9663D', '#2E86AB', '#4E9F3D', '#F4A523', '#8E4585', '#2F3C7E'][i]} />)}</G></Billboard>
  </G>
);

export const FURNITURE = { sofa, tv_wall, bookshelf, telescope, globe, rug, kitchen_island, stove, fridge, dining_table, chair, bed, desk, easel, paint_table, harmonium, tabla, sitar, lab_bench, activity_mat, toy_box, wardrobe, lamp, washbasin, bathtub, toothbrush_shelf, pergola, planter_rail, swing_seat, shoe_rack, tulsi_pot, rangoli, door, carrom, clock, chess_table, bookcase_low } satisfies Record<string, SpriteFn>;
