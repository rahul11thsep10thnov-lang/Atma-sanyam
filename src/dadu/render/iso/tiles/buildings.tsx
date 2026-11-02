// Town and map props: library shelves and building, temple shikhara and
// gopuram, bazaar stalls, festival pandal, and the small buildings used on
// the Miniverse map.
import React from 'react';
import { Circle, Ellipse, G, Path, Rect } from 'react-native-svg';
import { Billboard, Box, Drop, Flat, Plane, shade } from './box';
import type { SpriteFn } from './box';
import { palette } from '../../palette';

const bookRow = (n: number, seed: number) => Array.from({ length: n }, (_, i) => <Rect key={i} x={i * 9} y={(i * 3 + seed) % 5} width={7} height={16 - ((i * 3 + seed) % 5)} rx={1} fill={['#D9663D', '#2E86AB', '#4E9F3D', '#F4A523', '#8E4585', '#2F3C7E', '#E07A95'][(i + seed) % 7]} />);

export const library_shelf: SpriteFn = ({ w = 2 }) => (
  <G>
    <Box w={w} d={0.5} h={96} colour="#7A4E2A" />
    <Billboard cy={0.25} z={0}>
      <G transform={`translate(${-w * 30} -92)`}>
        {[0, 1, 2, 3, 4].map((r) => (
          <G key={r} transform={`translate(0 ${r * 18})`}><Rect x={0} y={0} width={w * 60} height={17} fill="#5E3A1A" />{bookRow(Math.floor((w * 60) / 9), r)}</G>
        ))}
      </G>
    </Billboard>
  </G>
);

export const library_arch_shelf: SpriteFn = () => (
  <G>
    <Box w={1.6} d={0.5} h={110} colour="#7A4E2A" />
    <Billboard cy={0.25} z={0}>
      <Path d="M -44 0 V -70 Q -44 -108 0 -110 Q 44 -108 44 -70 V 0 Z" fill="#5E3A1A" stroke="#4A2E14" strokeWidth={1.5} />
      {[0, 1, 2, 3].map((r) => <G key={r} transform={`translate(-38 ${-100 + r * 22})`}>{bookRow(8, r + 2)}</G>)}
    </Billboard>
  </G>
);

export const reading_table: SpriteFn = () => (
  <G>
    <Box w={1.4} d={0.9} h={30} colour="#8B5A2B" top="#C98A5B" />
    <Billboard cx={-0.3} z={30}><Rect x={-10} y={-4} width={20} height={4} rx={1} fill="#FFF8EE" stroke="#C9C2BC" strokeWidth={0.8} /><Rect x={-9} y={-7} width={18} height={3} fill={palette.monsoon} /></Billboard>
    <Billboard cx={0.4} z={30}><Rect x={-3} y={-20} width={6} height={20} fill="#B8780F" /><Path d="M -10 -20 h 20 l -3 -10 h -14 Z" fill={palette.marigold} /></Billboard>
  </G>
);

export const librarian_desk: SpriteFn = () => (
  <G>
    <Box w={1.8} d={0.7} h={36} colour="#7A4E2A" top="#B07A45" />
    <Billboard cx={-0.5} z={36}><Rect x={-12} y={-18} width={24} height={16} rx={2} fill="#2A2F3A" /><Rect x={-10} y={-16} width={20} height={12} fill="#BFE6F7" /></Billboard>
    <Billboard cx={0.5} z={36}><Rect x={-9} y={-6} width={18} height={6} rx={1} fill="#2E86AB" /></Billboard>
  </G>
);

export const audio_corner: SpriteFn = () => (
  <G>
    <Box w={1} d={0.8} h={20} colour={palette.rose} top="#F6C6D0" />
    <Billboard z={20}><Path d="M -10 0 q 10 -16 20 0" stroke={palette.indigo} strokeWidth={3.5} fill="none" /><Rect x={-13} y={-3} width={6} height={10} rx={2} fill={palette.indigo} /><Rect x={7} y={-3} width={6} height={10} rx={2} fill={palette.indigo} /></Billboard>
  </G>
);

export const reading_carpet: SpriteFn = () => (
  <G><Flat w={1.8} d={1.4} colour={palette.monsoon} rx /><Flat w={1.3} d={0.9} colour="#5BA8C9" rx /></G>
);

export const shikhara: SpriteFn = () => (
  <G>
    <Drop rx={2} ry={1.6} />
    <Box w={1.6} d={1.6} h={56} colour="#D9663D" top="#E2795A" />
    <Billboard z={56}><Path d="M -40 0 L -26 -40 L -12 -72 L 0 -100 L 12 -72 L 26 -40 L 40 0 Z" fill="#D9663D" stroke="#A8482A" strokeWidth={1.5} /><Path d="M -26 -40 h 52 M -12 -72 h 24" stroke="#A8482A" strokeWidth={1.5} /><Rect x={-3} y={-114} width={6} height={16} fill={palette.saffron} /><Circle cx={0} cy={-116} r={5} fill={palette.marigold} /></Billboard>
    <Billboard cy={0.8} z={0}><Path d="M -12 0 V -28 Q -12 -42 0 -44 Q 12 -42 12 -28 V 0 Z" fill="#5E3A1A" /></Billboard>
  </G>
);

export const gopuram: SpriteFn = () => (
  <G>
    <Drop rx={2.2} ry={1.8} />
    <Box w={2} d={1.4} h={50} colour="#8E4585" top="#A85E9D" />
    <Billboard z={50}>
      <Path d="M -56 0 L -48 -30 L -40 -58 L -32 -84 L 32 -84 L 40 -58 L 48 -30 L 56 0 Z" fill="#8E4585" stroke="#6A2F62" strokeWidth={1.5} />
      {[0, 1, 2].map((r) => <G key={r}><Rect x={-44 + r * 8} y={-20 - r * 28} width={88 - r * 16} height={6} fill="#E07A95" />{[0, 1, 2, 3].map((i) => <Rect key={i} x={-32 + r * 6 + i * (20 - r * 3)} y={-30 - r * 28} width={5} height={8} rx={1} fill={palette.marigold} />)}</G>)}
      <Rect x={-36} y={-92} width={72} height={9} rx={4} fill={palette.marigold} />
    </Billboard>
    <Billboard cy={0.7} z={0}><Path d="M -12 0 V -26 Q -12 -38 0 -40 Q 12 -38 12 -26 V 0 Z" fill="#5E3A1A" /></Billboard>
  </G>
);

export const temple_bell: SpriteFn = ({ t }) => {
  const a = t ? Math.sin(t * 6) * (t % 8 < 1.5 ? 10 : 0) : 0;
  return (
    <G>
      <Box w={0.15} d={0.15} h={72} cx={-0.5} colour="#8B5A2B" />
      <Box w={0.15} d={0.15} h={72} cx={0.5} colour="#8B5A2B" />
      <Box w={1.1} d={0.12} h={5} z={72} colour="#8B5A2B" />
      <Billboard z={72}><G transform={`rotate(${a} 0 0)`}><Path d="M 0 0 V 10" stroke="#6F5F58" strokeWidth={2} /><Path d="M -12 36 Q -12 12 0 10 Q 12 12 12 36 Z" fill={palette.marigold} stroke="#C98310" strokeWidth={1.5} /><Rect x={-14} y={36} width={28} height={4} rx={2} fill="#C98310" /><Circle cx={0} cy={43} r={2.5} fill="#C98310" /></G></Billboard>
    </G>
  );
};

export const lamp_stand: SpriteFn = ({ t }) => (
  <Billboard>
    <Rect x={-3} y={-40} width={6} height={40} fill="#C98310" />
    {[0, 1, 2].map((i) => <G key={i} transform={`translate(0 ${-40 + i * 12})`}><Path d={`M ${-18 + i * 4} 0 h ${36 - i * 8} l -4 -6 h ${-28 + i * 8} Z`} fill={palette.saffron} /><Ellipse cx={0} cy={-8} rx={2.5} ry={5 + (t ? Math.sin(t * 9 + i) : 0)} fill={palette.marigold} /></G>)}
  </Billboard>
);

export const gallery_board: SpriteFn = ({ flags }) => (
  <G>
    <Box w={0.1} d={0.1} h={40} cx={-0.5} colour="#8B5A2B" />
    <Box w={0.1} d={0.1} h={40} cx={0.5} colour="#8B5A2B" />
    <Plane along="sw" length={1.2} h={30} z={30} colour="#FFF8EE" stroke={flags?.unlocked === false ? '#9AA3AD' : '#8B5A2B'} />
    <Billboard z={44}><Path d="M -24 0 h 48 M -20 7 h 40 M -16 14 h 32" stroke={palette.inkSoft} strokeWidth={1.5} /></Billboard>
  </G>
);

export const banyan_platform: SpriteFn = () => (
  <G><Box w={1.4} d={1.4} h={10} colour="#C9B698" top="#E9D9C0" /></G>
);

export const bazaar_stall: SpriteFn = ({ flags }) => {
  const i = flags?.on ? 1 : 0;
  const awning = ['#D9663D', '#2E86AB'][i];
  return (
    <G>
      <Box w={1.4} d={0.8} h={28} colour="#C98A5B" top="#E9D9C0" />
      <Box w={0.12} d={0.12} h={64} cx={-0.6} cy={-0.3} colour="#8B5A2B" />
      <Box w={0.12} d={0.12} h={64} cx={0.6} cy={-0.3} colour="#8B5A2B" />
      <Billboard cy={-0.3} z={64}><Path d="M -48 0 h 96 l -6 10 l -6 -6 l -6 6 l -6 -6 l -6 6 l -6 -6 l -6 6 l -6 -6 l -6 6 l -6 -6 l -6 6 l -6 -6 l -6 6 Z" fill={awning} stroke={shade(awning, -0.35)} strokeWidth={1} /></Billboard>
      <Billboard cx={-0.4} z={28}><Circle cx={-4} cy={-4} r={5} fill={palette.marigold} /><Circle cx={5} cy={-5} r={5} fill="#D9663D" /><Circle cx={0} cy={-11} r={5} fill={palette.leaf} /></Billboard>
      <Billboard cx={0.4} z={28}><Rect x={-10} y={-14} width={8} height={14} rx={2} fill="#8E4585" /><Rect x={0} y={-12} width={8} height={12} rx={2} fill="#2E86AB" /><Rect x={10} y={-16} width={6} height={16} rx={2} fill={palette.saffron} /></Billboard>
    </G>
  );
};

export const pandal: SpriteFn = () => (
  <G>
    {[[-1.4, -1], [1.4, -1], [-1.4, 1], [1.4, 1]].map(([x, y], i) => <Box key={i} w={0.12} d={0.12} h={80} cx={x} cy={y} colour="#8B5A2B" />)}
    <Box w={3.2} d={2.4} h={6} z={80} colour={palette.saffron} top={palette.marigold} />
    <Billboard cy={1} z={80}>{Array.from({ length: 9 }, (_, i) => <Path key={i} d={`M ${-96 + i * 24} 0 l 12 14 l 12 -14 Z`} fill={i % 2 ? palette.peepal : '#D9663D'} />)}</Billboard>
    <Box w={1.4} d={0.6} h={20} cy={-0.6} colour="#E9D9C0" top="#FFF8EE" />
  </G>
);

export const monument_mini: SpriteFn = () => (
  <G>
    <Box w={1.2} d={1.2} h={30} colour="#E9D9C0" top="#F7F1E6" />
    <Billboard z={30}><Path d="M -24 0 V -26 Q -24 -40 0 -42 Q 24 -40 24 -26 V 0 Z" fill="#F7F1E6" stroke="#C9B698" strokeWidth={1.2} /><Rect x={-30} y={-56} width={4} height={56} fill="#F7F1E6" stroke="#C9B698" strokeWidth={1} /><Rect x={26} y={-56} width={4} height={56} fill="#F7F1E6" stroke="#C9B698" strokeWidth={1} /><Path d="M -4 -42 h 8 v -8 h -8 Z" fill="#F7F1E6" /></Billboard>
  </G>
);

/** Small buildings for the Miniverse map. */
export const villa_mini: SpriteFn = () => (
  <G>
    <Drop rx={2.6} ry={1.8} />
    <Box w={2.4} d={1.6} h={60} colour="#FFF3DC" top="#F7F1E6" />
    <Box w={1.2} d={1.6} h={30} cx={0.6} cy={0} z={60} colour="#FFF3DC" top="#E9D9C0" />
    <Plane along="sw" length={0.5} h={34} cx={-0.6} cy={0.8} colour={palette.saffron} stroke="#B8780F" />
    <Plane along="sw" length={0.6} h={24} cx={0.4} cy={0.8} z={28} colour={palette.sky} stroke="#8CCBE0" />
    <Plane along="se" length={0.6} h={24} cx={1.2} cy={0.3} z={28} colour={palette.sky} stroke="#8CCBE0" />
  </G>
);

export const library_building: SpriteFn = () => (
  <G>
    <Drop rx={2.6} ry={1.8} />
    <Box w={2.4} d={1.6} h={54} colour="#E9D9C0" top="#C98A5B" />
    {[-0.8, -0.3, 0.2, 0.7].map((x) => <Box key={x} w={0.18} d={0.18} h={54} cx={x} cy={0.85} colour="#8B5A2B" />)}
    <Box w={2.6} d={1.8} h={8} z={54} colour="#8B5A2B" top="#A5733F" />
  </G>
);

export const temple_building: SpriteFn = () => (
  <G>
    <Box w={1.4} d={1.4} h={30} colour="#FFE9C7" top="#F7D8A8" />
    <Billboard z={30}><Path d="M -30 0 L -10 -54 L 0 -74 L 10 -54 L 30 0 Z" fill="#D9663D" stroke="#A8482A" strokeWidth={1.2} /><Circle cx={0} cy={-78} r={4} fill={palette.marigold} /></Billboard>
  </G>
);

export const park_mini: SpriteFn = () => (
  <G>
    <Flat w={3} d={2.2} colour="#8BC34A" stroke="#6DAE3C" rx />
    <Billboard cx={-0.9} cy={-0.3}><Circle cx={0} cy={-22} r={16} fill={palette.peepal} /><Rect x={-3} y={-14} width={6} height={14} fill="#8B5A2B" /></Billboard>
    <Billboard cx={0.8} cy={0.4}><Path d="M -10 0 L 0 -24 L 10 0" stroke="#D9663D" strokeWidth={3} fill="none" /></Billboard>
  </G>
);

export const bazaar_mini: SpriteFn = () => (
  <G>
    <Box w={2} d={1} h={24} colour="#C98A5B" top="#E9D9C0" />
    <Box w={2.2} d={1.2} h={6} z={24} colour="#D9663D" top="#E07A95" />
  </G>
);

export const balloon_portal: SpriteFn = ({ t }) => (
  <Billboard z={t ? Math.sin(t) * 4 : 0}>
    <Ellipse cx={0} cy={-62} rx={26} ry={30} fill={palette.saffron} stroke="#B8780F" strokeWidth={1} />
    <Path d="M -26 -62 q 26 -46 52 0" fill="#D9663D" />
    <Path d="M -14 -36 l -4 12 M 14 -36 l 4 12" stroke="#8B5A2B" strokeWidth={1.5} />
    <Rect x={-18} y={-24} width={36} height={18} rx={3} fill="#8B5A2B" />
  </Billboard>
);

export const river: SpriteFn = ({ w = 1, d = 1 }) => <Flat w={w} d={d} colour="#5BA8C9" />;
export const hill: SpriteFn = () => <Billboard><Path d="M -60 0 Q -30 -50 0 -46 Q 30 -60 60 0 Z" fill="#8FA6C9" /><Path d="M -8 -36 L 0 -46 L 8 -36 Z" fill="#FFFFFF" /></Billboard>;

export const BUILDINGS = { library_shelf, library_arch_shelf, reading_table, librarian_desk, audio_corner, reading_carpet, shikhara, gopuram, temple_bell, lamp_stand, gallery_board, banyan_platform, bazaar_stall, pandal, monument_mini, villa_mini, library_building, temple_building, park_mini, bazaar_mini, balloon_portal, river, hill } satisfies Record<string, SpriteFn>;
