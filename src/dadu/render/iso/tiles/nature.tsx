// Outdoor props: beds that grow through the eight plant stages, trees with
// seasons, water, compost, animal homes, playground and sports equipment.
import React from 'react';
import { Circle, Ellipse, G, Path, Rect } from 'react-native-svg';
import { Billboard, Box, Canopy, Drop, Flat, Plane, pt, shade } from './box';
import type { SpriteFn, SpriteProps } from './box';
import { palette } from '../../palette';

const STAGE_INDEX = { seed: 0, germination: 1, seedling: 2, growing: 3, mature: 4, flowering: 5, fruiting: 6, harvest: 7 } as const;

function plantSprout(stage: SpriteProps['stage'], kind: 'flower' | 'veg' | 'tulsi'): React.ReactElement {
  const i = STAGE_INDEX[stage ?? 'seed'];
  if (i === 0) return <Ellipse cx={0} cy={-1} rx={3} ry={1.5} fill="#8B5A2B" />;
  if (i === 1) return <Path d="M 0 0 v -5 q -3 -1 -3 -4 q 3 0 3 4" stroke={palette.leaf} strokeWidth={1.5} fill={palette.leaf} />;
  const h = 8 + i * 5;
  const leaves = Math.min(4, i);
  const colour = kind === 'tulsi' ? '#6DAE3C' : kind === 'veg' ? palette.peepal : palette.leaf;
  return (
    <G>
      <Path d={`M 0 0 V ${-h}`} stroke={shade(colour, -0.25)} strokeWidth={2} />
      {Array.from({ length: leaves }, (_, k) => <Ellipse key={k} cx={(k % 2 ? 1 : -1) * 6} cy={-h * 0.3 - k * (h * 0.18)} rx={6} ry={3} fill={colour} transform={`rotate(${k % 2 ? -25 : 25} ${(k % 2 ? 1 : -1) * 6} ${-h * 0.3 - k * (h * 0.18)})`} />)}
      {i >= 5 && kind === 'flower' && <G><Circle cx={0} cy={-h - 2} r={5} fill={palette.rose} /><Circle cx={0} cy={-h - 2} r={2} fill={palette.marigold} /></G>}
      {i >= 5 && kind === 'veg' && <Circle cx={0} cy={-h - 1} r={3} fill={i >= 6 ? '#D9663D' : palette.haldi} />}
      {i >= 6 && kind === 'flower' && <G><Circle cx={-7} cy={-h + 4} r={4} fill={palette.marigold} /><Circle cx={7} cy={-h + 2} r={4} fill={palette.rose} /></G>}
      {i >= 7 && <Circle cx={0} cy={-h - 4} r={2} fill="#FFFFFF" opacity={0.9} />}
    </G>
  );
}

const bedBase = (w: number, d: number) => (
  <G>
    <Box w={w} d={d} h={6} colour="#8B5A2B" top="#6B4423" />
    <Flat w={w - 0.15} d={d - 0.15} colour="#5E3A1A" />
  </G>
);

function bedWith(kind: 'flower' | 'veg'): SpriteFn {
  return ({ stage, w = 1, d = 1 }) => {
    const cols = Math.max(1, Math.round(w * 2)), rows = Math.max(1, Math.round(d * 2));
    const plants: React.ReactElement[] = [];
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      plants.push(<Billboard key={`${r}-${c}`} cx={-w / 2 + (c + 0.5) * (w / cols)} cy={-d / 2 + (r + 0.5) * (d / rows)} z={4}>{plantSprout(stage, kind)}</Billboard>);
    }
    return <G>{bedBase(w, d)}{plants}</G>;
  };
}
export const bed_flower = bedWith('flower');
export const bed_veg = bedWith('veg');
export const bed_empty: SpriteFn = ({ w = 1, d = 1 }) => bedBase(w, d);

const seasonCanopy = (season: SpriteProps['season'], base: string) => {
  switch (season) {
    case 'autumn': return '#D9A33D';
    case 'winter': return shade(base, -0.15);
    case 'spring': return shade(base, 0.12);
    case 'monsoon': return shade(base, -0.05);
    default: return base;
  }
};

function tree(kind: 'mango' | 'neem' | 'banyan' | 'coconut' | 'gulmohar'): SpriteFn {
  return ({ season, t }) => {
    const sway = t ? Math.sin(t * 1.2) * 1.5 : 0;
    const base = kind === 'gulmohar' ? '#D9663D' : kind === 'neem' ? '#4E9F3D' : palette.peepal;
    const col = season === 'spring' && kind === 'gulmohar' ? '#E85D3A' : seasonCanopy(season, base);
    if (kind === 'coconut') {
      return (
        <G>
          <Drop rx={1.2} ry={1} opacity={0.2} />
          <Billboard><Path d="M -4 0 q 2 -40 8 -78" stroke="#8B5A2B" strokeWidth={6} fill="none" strokeLinecap="round" /><G transform={`translate(4 -78) rotate(${sway})`}>{[-70, -30, 10, 50, 100, 140, 190].map((a) => <Path key={a} d="M 0 0 q 18 -4 34 4 q -16 6 -34 0" fill={col} stroke={shade(col, -0.3)} strokeWidth={1} transform={`rotate(${a})`} />)}<Circle cx={-5} cy={4} r={4} fill="#A5733F" /><Circle cx={4} cy={6} r={4} fill="#A5733F" /></G></Billboard>
        </G>
      );
    }
    const big = kind === 'banyan';
    return (
      <G>
        <Drop rx={big ? 2.4 : 1.6} ry={big ? 2 : 1.3} opacity={0.2} />
        <Billboard>
          <Path d={`M -${big ? 9 : 6} 0 q ${big ? 3 : 2} -30 ${big ? 9 : 6} -${big ? 60 : 50} q ${big ? 6 : 4} 30 ${big ? 9 : 6} ${big ? 60 : 50} Z`} fill="#8B5A2B" stroke="#5E3A1A" strokeWidth={1} />
          {big && <G><Path d="M -26 -50 q -6 30 -4 50" stroke="#8B5A2B" strokeWidth={3} fill="none" /><Path d="M 28 -48 q 4 30 2 48" stroke="#8B5A2B" strokeWidth={3} fill="none" /></G>}
          <G transform={`translate(${sway} 0)`}>
            <Canopy x={0} y={big ? -84 : -66} rx={big ? 54 : 36} ry={big ? 38 : 28} colour={col} />
            <Canopy x={big ? -28 : -20} y={big ? -66 : -52} rx={big ? 30 : 22} ry={big ? 22 : 16} colour={shade(col, 0.06)} />
            <Canopy x={big ? 28 : 22} y={big ? -64 : -50} rx={big ? 30 : 22} ry={big ? 22 : 16} colour={shade(col, -0.04)} />
            {kind === 'mango' && (season === 'summer' || season === 'spring') && [[-18, -58], [10, -46], [26, -62], [-4, -76]].map(([x, y]) => <Ellipse key={`${x}${y}`} cx={x} cy={y} rx={4} ry={6} fill={season === 'summer' ? palette.marigold : '#8BC34A'} stroke="#B8780F" strokeWidth={0.6} />)}
            {season === 'winter' && kind !== 'neem' && <Ellipse cx={0} cy={big ? -84 : -66} rx={big ? 54 : 36} ry={big ? 38 : 28} fill="#FFFFFF" opacity={0.08} />}
          </G>
        </Billboard>
      </G>
    );
  };
}
export const tree_mango = tree('mango');
export const tree_neem = tree('neem');
export const tree_banyan = tree('banyan');
export const tree_coconut = tree('coconut');
export const tree_gulmohar = tree('gulmohar');

export const bush: SpriteFn = ({ season }) => (
  <G>
    <Drop rx={0.9} ry={0.7} />
    <Billboard><Canopy x={0} y={-12} rx={22} ry={13} colour={seasonCanopy(season, palette.leaf)} />{season !== 'winter' && <G><Circle cx={-8} cy={-16} r={3} fill={palette.rose} /><Circle cx={9} cy={-10} r={3} fill={palette.marigold} /></G>}</Billboard>
  </G>
);

export const butterfly_bush: SpriteFn = ({ t }) => {
  const f = t ? Math.sin(t * 10) : 0;
  const fly = t ? Math.sin(t * 0.9) * 10 : 0;
  return (
    <G>
      <Billboard><Canopy x={0} y={-16} rx={26} ry={14} colour={palette.plum} />{[[-12, -22], [4, -28], [14, -14]].map(([x, y]) => <Circle key={`${x}${y}`} cx={x} cy={y} r={4} fill={palette.rose} />)}
        <G transform={`translate(${fly} ${-40 - Math.abs(fly) * 0.4})`}><Ellipse cx={-5} cy={0} rx={6} ry={4} fill={palette.saffron} transform={`scale(${0.6 + Math.abs(f) * 0.4} 1)`} /><Ellipse cx={5} cy={0} rx={6} ry={4} fill={palette.saffron} transform={`scale(${0.6 + Math.abs(f) * 0.4} 1)`} /><Rect x={-1} y={-4} width={2} height={8} fill="#3A2E2A" /></G>
      </Billboard>
    </G>
  );
};

export const pond: SpriteFn = ({ w = 3, d = 2, t }) => {
  const c = pt(0, 0);
  const r = t ? (t % 3) / 3 : 0.4;
  return (
    <G>
      <Flat w={w} d={d} colour="#8B5A2B" rx />
      <Flat w={w - 0.3} d={d - 0.2} colour={palette.monsoon} rx />
      <Ellipse cx={c.sx} cy={c.sy} rx={(w - 0.3) * 32 * r} ry={(d - 0.2) * 16 * r} fill="none" stroke="#8CCBE0" strokeWidth={1.2} opacity={1 - r} />
      <Billboard cx={-0.6} cy={0.3}><Ellipse cx={0} cy={0} rx={9} ry={4} fill={palette.leaf} /><Circle cx={0} cy={-3} r={4} fill={palette.rose} /></Billboard>
      <Billboard cx={0.7} cy={-0.3}><Ellipse cx={0} cy={0} rx={8} ry={3.5} fill={palette.leaf} /></Billboard>
      <Billboard cx={0.3} cy={0.5}><Circle cx={0} cy={-2} r={4} fill={palette.peepal} /><Circle cx={-1.5} cy={-3} r={1} fill="#000" /></Billboard>
    </G>
  );
};

export const fountain: SpriteFn = ({ t }) => {
  const h = t ? 18 + Math.sin(t * 6) * 4 : 20;
  return (
    <G>
      <Flat w={1.6} d={1.6} colour="#A9B7BF" rx />
      <Flat w={1.3} d={1.3} colour={palette.sky} rx />
      <Box w={0.3} d={0.3} h={22} colour="#A9B7BF" top="#DDE3E8" />
      <Billboard z={22}><Path d={`M 0 0 V ${-h} M -4 0 q 0 -${h * 0.7} -10 -${h * 0.2} M 4 0 q 0 -${h * 0.7} 10 -${h * 0.2}`} stroke="#BFE6F7" strokeWidth={3} fill="none" strokeLinecap="round" /><Ellipse cx={0} cy={0} rx={14} ry={5} fill="#BFE6F7" /></Billboard>
    </G>
  );
};

export const compost_bin: SpriteFn = ({ flags }) => (
  <G>
    <Box w={0.8} d={0.8} h={28} colour="#5E3A1A" top={flags?.full ? '#4E9F3D' : '#8B5A2B'} />
    {flags?.full && <Billboard z={28}><Path d="M -8 -2 l 4 -6 M 2 -1 l -3 -7 M 8 -3 l -2 -5" stroke={palette.leaf} strokeWidth={2} strokeLinecap="round" /></Billboard>}
  </G>
);

export const bird_feeder: SpriteFn = ({ t }) => (
  <Billboard>
    <Rect x={-1.5} y={-56} width={3} height={56} fill="#8B5A2B" />
    <Rect x={-14} y={-62} width={28} height={6} rx={2} fill="#D9663D" />
    <Rect x={-10} y={-56} width={20} height={8} fill="#C98A5B" />
    <G transform={`translate(-8 ${-66 + (t ? Math.sin(t * 5) : 0)})`}><Circle cx={0} cy={0} r={4} fill="#8B5A2B" /><Path d="M 0 0 l -5 2" stroke={palette.saffron} strokeWidth={1.5} /></G>
  </Billboard>
);

export const greenhouse_frame: SpriteFn = ({ w = 3, d = 2 }) => (
  <G>
    <Box w={w} d={d} h={60} colour="#BFE6F7" top="#DDF2FB" opacity={0.75} />
    <Plane along="sw" length={w} h={60} cy={d / 2} colour="#DDF2FB" stroke="#8CCBE0" />
  </G>
);

export const workbench: SpriteFn = () => (
  <G>
    <Box w={1.6} d={0.8} h={32} colour="#8B5A2B" top="#C98A5B" />
    <Billboard cx={-0.4} z={32}><Path d="M -6 0 v -16 M -10 -16 h 8" stroke="#6F7580" strokeWidth={3} strokeLinecap="round" /></Billboard>
    <Billboard cx={0.4} z={32}><Ellipse cx={0} cy={-6} rx={9} ry={6} fill={palette.monsoon} /><Path d="M 8 -8 l 8 -4" stroke={palette.monsoon} strokeWidth={3} /></Billboard>
  </G>
);

export const watering_can: SpriteFn = () => (
  <Billboard><Ellipse cx={0} cy={-8} rx={9} ry={7} fill={palette.monsoon} stroke="#1F6C8C" strokeWidth={1} /><Path d="M 8 -10 l 10 -5 M 0 -15 a 6 6 0 0 1 0 -1 q 0 -6 -6 -6" stroke="#1F6C8C" strokeWidth={2.5} fill="none" strokeLinecap="round" /></Billboard>
);

export const dog_house: SpriteFn = () => (
  <G>
    <Box w={1.2} d={1} h={30} colour="#C98A5B" top="#D9663D" />
    <Billboard cy={0.5} z={0}><Path d="M -10 0 V -18 a 10 10 0 0 1 20 0 V 0 Z" fill="#3A2E2A" /></Billboard>
    <Box w={1.3} d={1.1} h={8} z={30} colour="#D9663D" top="#C4532E" />
  </G>
);

export const rabbit_hutch: SpriteFn = () => (
  <G>
    <Box w={1.4} d={0.8} h={26} colour="#C98A5B" top="#8B5A2B" />
    <Plane along="sw" length={0.6} h={18} cx={0.35} cy={0.4} z={4} colour="#DDE3E8" stroke="#9AA3AD" />
    <Billboard cx={-0.4} cy={0.4} z={2}><Path d="M -7 0 V -12 a 7 7 0 0 1 14 0 V 0 Z" fill="#3A2E2A" /></Billboard>
    <Billboard cx={0.3} cy={0.6} z={0}><Ellipse cx={0} cy={0} rx={6} ry={3} fill={palette.saffron} /><Path d="M -2 -2 l 2 -6 l 2 6" fill={palette.leaf} /></Billboard>
  </G>
);

export const cow_shed: SpriteFn = ({ w = 3, d = 2 }) => (
  <G>
    <Flat w={w} d={d} colour="#B98F5F" stroke="#A5733F" />
    {[[-w / 2 + 0.2, -d / 2 + 0.2], [w / 2 - 0.2, -d / 2 + 0.2], [-w / 2 + 0.2, d / 2 - 0.2], [w / 2 - 0.2, d / 2 - 0.2]].map(([x, y], i) => <Box key={i} w={0.22} d={0.22} h={64} cx={x} cy={y} colour="#8B5A2B" />)}
    {/* back wall and side wall so it reads as a shelter, open to the front */}
    <Plane along="sw" length={w} h={64} cy={-d / 2} colour="#A5733F" stroke="#6B4423" />
    <Plane along="se" length={d} h={64} cx={-w / 2} colour="#8F6234" stroke="#6B4423" />
    <Billboard cy={-d / 2} z={20}><Path d={`M ${-w * 24} 0 h ${w * 48} M ${-w * 24} 12 h ${w * 48}`} stroke="#6B4423" strokeWidth={1.2} opacity={0.6} /></Billboard>
    <Billboard cx={w / 2 - 0.7} cy={-d / 2 + 0.35} z={4}><Ellipse cx={0} cy={-8} rx={14} ry={8} fill={palette.haldi} stroke="#C9A52E" strokeWidth={1} /></Billboard>
    {/* pitched roof: wide eave slab plus ridge block */}
    <Box w={w + 0.6} d={d + 0.6} h={8} z={64} colour="#B04A2C" top="#D9663D" />
    <Box w={w + 0.2} d={d * 0.5} h={16} z={72} colour="#A8482A" top="#C4532E" />
    <Box w={w + 0.2} d={0.12} h={6} z={88} colour="#8B3A20" top="#A8482A" />
    <Box w={0.6} d={0.3} h={12} cx={-w / 2 + 0.5} cy={d / 2 - 0.3} colour="#6F7580" top={palette.sky} />
  </G>
);

export const hay: SpriteFn = () => (
  <Billboard><Ellipse cx={0} cy={-8} rx={16} ry={9} fill={palette.haldi} stroke="#C9A52E" strokeWidth={1} /><Path d="M -8 -12 l 4 -6 M 2 -14 l 3 -6 M 8 -10 l 5 -4" stroke="#C9A52E" strokeWidth={1.5} /></Billboard>
);

export const fence: SpriteFn = ({ w = 1, d = 0 }) => (
  d > 0 ? <Plane along="se" length={d} h={22} colour="#C98A5B" stroke="#8B5A2B" /> : <Plane along="sw" length={w} h={22} colour="#C98A5B" stroke="#8B5A2B" />
);

export const sign_post: SpriteFn = () => (
  <Billboard><Rect x={-2} y={-40} width={4} height={40} fill="#8B5A2B" /><Rect x={-16} y={-52} width={32} height={14} rx={3} fill="#FFF8EE" stroke="#8B5A2B" strokeWidth={1.5} /><Path d="M -10 -45 h 20" stroke={palette.inkSoft} strokeWidth={2} /></Billboard>
);

export const swing_set: SpriteFn = ({ t }) => {
  const a = t ? Math.sin(t * 1.6) * 14 : 8;
  return (
    <G>
      <Billboard cx={-1}><Path d="M -16 0 L 0 -72 L 16 0" stroke="#D9663D" strokeWidth={4} fill="none" strokeLinecap="round" /></Billboard>
      <Billboard cx={1}><Path d="M -16 0 L 0 -72 L 16 0" stroke="#D9663D" strokeWidth={4} fill="none" strokeLinecap="round" /></Billboard>
      <Box w={2.2} d={0.1} h={4} z={72} colour="#C4532E" />
      <Billboard z={72}><G transform={`rotate(${a} 0 0)`}><Path d="M -10 0 V 46 M 10 0 V 46" stroke="#6F5F58" strokeWidth={1.5} /><Rect x={-14} y={44} width={28} height={6} rx={2} fill="#8B5A2B" /></G></Billboard>
    </G>
  );
};

export const slide: SpriteFn = () => (
  <G>
    <Drop rx={2} ry={1} />
    <Box w={0.5} d={0.5} h={60} cx={-0.8} colour="#2E86AB" />
    <Billboard cx={-0.8} z={60}><Rect x={-12} y={-6} width={24} height={6} rx={2} fill="#1F6C8C" /></Billboard>
    <Billboard cx={-0.8} z={0}><Path d="M 10 -58 L 80 -4 L 86 -10 L 20 -64 Z" fill={palette.marigold} stroke="#C98310" strokeWidth={1} /><Path d="M 12 -56 L 82 -2" stroke="#C98310" strokeWidth={1} /></Billboard>
    <Billboard cx={-0.8} z={0}><Path d="M -14 -52 h 10 M -14 -40 h 10 M -14 -28 h 10 M -14 -16 h 10" stroke="#1F6C8C" strokeWidth={2.5} /></Billboard>
  </G>
);

export const cricket_stumps: SpriteFn = () => (
  <Billboard><Rect x={-7} y={-28} width={3} height={28} fill="#FFF8EE" stroke="#C9B698" strokeWidth={0.6} /><Rect x={-1.5} y={-28} width={3} height={28} fill="#FFF8EE" stroke="#C9B698" strokeWidth={0.6} /><Rect x={4} y={-28} width={3} height={28} fill="#FFF8EE" stroke="#C9B698" strokeWidth={0.6} /><Rect x={-8} y={-31} width={16} height={3} fill="#FFF8EE" /></Billboard>
);

export const cricket_bat_ball: SpriteFn = () => (
  <Billboard><Path d="M -12 -2 l 16 -20" stroke="#C98A5B" strokeWidth={6} strokeLinecap="round" /><Circle cx={10} cy={-4} r={4} fill="#D9663D" /></Billboard>
);

export const football: SpriteFn = () => (
  <Billboard><Circle cx={0} cy={-6} r={6} fill="#FFFFFF" stroke="#3A2E2A" strokeWidth={1} /><Path d="M -3 -8 l 3 -2 l 3 2 l -1 3 h -4 Z" fill="#3A2E2A" /></Billboard>
);

export const balance_beam: SpriteFn = ({ w = 2 }) => (
  <G>
    <Box w={0.15} d={0.25} h={10} cx={-w / 2 + 0.2} colour="#5E3A1A" />
    <Box w={0.15} d={0.25} h={10} cx={w / 2 - 0.2} colour="#5E3A1A" />
    <Box w={w} d={0.2} h={5} z={10} colour="#8B5A2B" top="#C98A5B" />
  </G>
);

export const sundial: SpriteFn = ({ t }) => (
  <G>
    <Box w={0.8} d={0.8} h={18} colour="#A9B7BF" top="#E9D9C0" />
    <Billboard z={18}><Path d="M 0 0 L 9 -16" stroke="#3A2E2A" strokeWidth={2.5} /><Path d={`M 0 0 L ${-12 + (t ? Math.sin(t * 0.2) * 4 : 0)} 5`} stroke="#3A2E2A" strokeWidth={1.5} opacity={0.5} /></Billboard>
  </G>
);

export const yoga_mat: SpriteFn = () => <Flat w={1.6} d={0.7} colour={palette.plum} stroke="#6A2F62" />;

export const bench: SpriteFn = () => (
  <G>
    <Box w={1.4} d={0.4} h={16} colour="#8B5A2B" top="#C98A5B" />
    <Plane along="sw" length={1.4} h={16} cy={-0.2} z={16} colour="#C98A5B" />
  </G>
);

export const lawn_patch: SpriteFn = ({ w = 1, d = 1 }) => <Flat w={w} d={d} colour="#7FBF55" />;
export const path_stone: SpriteFn = ({ w = 1, d = 1 }) => <Flat w={w} d={d} colour="#E9D9C0" stroke="#D9C4A4" />;
export const water_trough: SpriteFn = ({ flags }) => (
  <G><Box w={1} d={0.4} h={12} colour="#6F7580" top={flags?.full ? palette.sky : '#9AA3AD'} /></G>
);
export const feed_bowl: SpriteFn = ({ flags }) => (
  <Billboard><Ellipse cx={0} cy={-2} rx={10} ry={5} fill="#D9663D" stroke="#A8482A" strokeWidth={1} />{flags?.full && <Ellipse cx={0} cy={-4} rx={7} ry={3} fill={palette.haldi} />}</Billboard>
);
export const hide: SpriteFn = () => (
  <G>
    <Box w={1.2} d={0.8} h={40} colour="#6B8E4E" top="#5A7A40" />
    <Plane along="sw" length={0.6} h={12} cy={0.4} z={22} colour="#1E1612" />
  </G>
);

export const NATURE = { bed_flower, bed_veg, bed_empty, tree_mango, tree_neem, tree_banyan, tree_coconut, tree_gulmohar, bush, butterfly_bush, pond, fountain, compost_bin, bird_feeder, greenhouse_frame, workbench, watering_can, dog_house, rabbit_hutch, cow_shed, hay, fence, sign_post, swing_set, slide, cricket_stumps, cricket_bat_ball, football, balance_beam, sundial, yoga_mat, bench, lawn_patch, path_stone, water_trough, feed_bowl, hide } satisfies Record<string, SpriteFn>;
