// Side-view backgrounds (activity view). ViewBox 360 × 220, ground line at
// y = 190. Every background is composed from the shared parts below so the
// villa wall, window, sky and floor look the same from room to room.
import React from 'react';
import { Circle, Defs, Ellipse, G, LinearGradient, Path, Rect, Stop } from 'react-native-svg';
import type { Season, TimeOfDay, Weather } from '../../core/worldState';
import { palette, skyGradient } from '../palette';

export const SIDE_W = 360;
export const SIDE_H = 220;
export const GROUND_Y = 190;

export type SideBackgroundKey =
  | 'living' | 'kitchen' | 'activity_art' | 'activity_music' | 'activity_lab' | 'bedroom' | 'veranda' | 'terrace' | 'bathroom' | 'study' | 'dining'
  | 'garden_bed' | 'cowshed' | 'rabbit' | 'dog' | 'pond' | 'public_garden' | 'library' | 'temple' | 'bazaar'
  | 'space' | 'museum' | 'forest' | 'ocean' | 'mountains' | 'monument';

export interface BgProps { time: TimeOfDay; weather?: Weather; season?: Season; t: number; id: string }

function Sky({ time, id }: { time: TimeOfDay; id: string }) {
  const [a, b] = skyGradient[time];
  return (
    <G>
      <Defs><LinearGradient id={`${id}-sky`} x1="0" y1="0" x2="0" y2="1"><Stop offset="0" stopColor={a} /><Stop offset="1" stopColor={b} /></LinearGradient></Defs>
      <Rect x={0} y={0} width={SIDE_W} height={SIDE_H} fill={`url(#${id}-sky)`} />
      {time === 'night' ? (
        <G><Circle cx={300} cy={40} r={16} fill="#FFE08A" />{[30, 90, 150, 210, 250, 330].map((x, i) => <Circle key={x} cx={x} cy={20 + (i % 3) * 18} r={1.4} fill="#FFFFFF" />)}</G>
      ) : (
        <Circle cx={time === 'morning' ? 70 : time === 'evening' ? 300 : 200} cy={time === 'afternoon' ? 30 : 48} r={18} fill={time === 'evening' ? palette.saffron : palette.marigold} />
      )}
    </G>
  );
}

function Clouds({ t, dark }: { t: number; dark?: boolean }) {
  return <G opacity={0.9}>{[40, 170, 290].map((x, i) => <G key={x} transform={`translate(${x + (t ? (t * 5 + i * 20) % 60 : 0) - 30} ${26 + i * 10})`}><Ellipse cx={0} cy={0} rx={28} ry={9} fill={dark ? '#CFD6DC' : '#FFFFFF'} /><Ellipse cx={-12} cy={-5} rx={14} ry={9} fill={dark ? '#CFD6DC' : '#FFFFFF'} /><Ellipse cx={14} cy={-3} rx={12} ry={8} fill={dark ? '#CFD6DC' : '#FFFFFF'} /></G>)}</G>;
}

function Rain({ t }: { t: number }) {
  const shift = t ? (t * 200) % 30 : 0;
  return <G>{Array.from({ length: 36 }, (_, i) => <Path key={i} d={`M ${(i * 41) % SIDE_W} ${((i * 37 + shift * 5) % 230) - 20} l -3 10`} stroke="#8CCBE0" strokeWidth={1.2} opacity={0.7} strokeLinecap="round" />)}</G>;
}

export function WeatherLayer({ weather, t }: { weather?: Weather; t: number }) {
  if (!weather || weather === 'sunny') return null;
  if (weather === 'foggy') return <Rect x={0} y={0} width={SIDE_W} height={SIDE_H} fill="#FFFFFF" opacity={0.35} />;
  if (weather === 'cloudy') return <Clouds t={t} />;
  return <G><Rect x={0} y={0} width={SIDE_W} height={SIDE_H} fill="#2F3C7E" opacity={weather === 'stormy' ? 0.2 : 0.1} /><Clouds t={t} dark /><Rain t={t} /></G>;
}

function Hills({ colour = '#8FA6C9', y = 150 }: { colour?: string; y?: number }) {
  return <Path d={`M 0 ${y + 20} Q 60 ${y - 30} 120 ${y} T 240 ${y} T 360 ${y + 10} V ${GROUND_Y} H 0 Z`} fill={colour} />;
}

function Grass({ colour = '#7FBF55' }: { colour?: string }) {
  return <G><Rect x={0} y={GROUND_Y - 24} width={SIDE_W} height={SIDE_H - GROUND_Y + 24} fill={colour} /><Path d="M 0 170 q 90 -14 180 0 t 180 0" stroke="#8BC34A" strokeWidth={6} fill="none" /></G>;
}

function Floor({ colour, line }: { colour: string; line: string }) {
  return <G><Rect x={0} y={GROUND_Y} width={SIDE_W} height={SIDE_H - GROUND_Y} fill={colour} /><Path d={`M 0 ${GROUND_Y} H ${SIDE_W}`} stroke={line} strokeWidth={2} /><Path d={`M 0 ${GROUND_Y + 14} H ${SIDE_W}`} stroke={line} strokeWidth={1} opacity={0.5} /></G>;
}

function Wall({ colour, trim, border }: { colour: string; trim: string; border?: boolean }) {
  return <G><Rect x={0} y={0} width={SIDE_W} height={GROUND_Y} fill={colour} />{border && <G><Rect x={0} y={0} width={SIDE_W} height={14} fill={trim} />{Array.from({ length: 18 }, (_, i) => <Circle key={i} cx={10 + i * 20} cy={7} r={2.5} fill={palette.marigold} />)}</G>}</G>;
}

function Window({ x, time, w = 70, h = 70, y = 40 }: { x: number; time: TimeOfDay; w?: number; h?: number; y?: number }) {
  const [a] = skyGradient[time];
  return (
    <G>
      <Rect x={x - 4} y={y - 4} width={w + 8} height={h + 8} rx={4} fill="#8B5A2B" />
      <Rect x={x} y={y} width={w} height={h} fill={a} />
      <Path d={`M ${x} ${y + h * 0.65} Q ${x + w * 0.3} ${y + h * 0.45} ${x + w * 0.6} ${y + h * 0.6} T ${x + w} ${y + h * 0.5} V ${y + h} H ${x} Z`} fill={palette.leaf} />
      {time !== 'night' && <Circle cx={x + w * 0.75} cy={y + h * 0.25} r={7} fill={palette.marigold} />}
      <Path d={`M ${x + w / 2} ${y} V ${y + h} M ${x} ${y + h / 2} H ${x + w}`} stroke="#8B5A2B" strokeWidth={3} />
    </G>
  );
}

function Shelf({ x, y, w }: { x: number; y: number; w: number }) {
  return <G><Rect x={x} y={y} width={w} height={5} fill="#8B5A2B" />{Array.from({ length: Math.floor(w / 9) }, (_, i) => <Rect key={i} x={x + 2 + i * 9} y={y - 14 + (i % 3)} width={7} height={14 - (i % 3)} rx={1} fill={['#D9663D', '#2E86AB', '#4E9F3D', '#F4A523', '#8E4585'][i % 5]} />)}</G>;
}

const Tree = ({ x, scale = 1, colour = palette.peepal }: { x: number; scale?: number; colour?: string }) => (
  <G transform={`translate(${x} ${GROUND_Y}) scale(${scale})`}>
    <Path d="M -6 0 q 2 -30 6 -60 q 4 30 6 60 Z" fill="#8B5A2B" />
    <Ellipse cx={0} cy={-72} rx={34} ry={26} fill={colour} /><Ellipse cx={-20} cy={-58} rx={20} ry={14} fill={colour} /><Ellipse cx={22} cy={-56} rx={20} ry={14} fill={colour} />
    <Ellipse cx={-8} cy={-80} rx={14} ry={9} fill="#FFFFFF" opacity={0.15} />
  </G>
);

export const BACKGROUNDS: Record<SideBackgroundKey, (p: BgProps) => React.ReactElement> = {
  living: ({ time }) => (
    <G><Wall colour="#F7E9D3" trim={palette.indigo} border /><Window x={40} time={time} /><Shelf x={210} y={70} w={110} /><Shelf x={210} y={100} w={110} />
      <Rect x={140} y={120} width={40} height={70} fill="#8B5A2B" /><Rect x={146} y={126} width={28} height={28} fill="#E9D9C0" /><Circle cx={160} cy={140} r={10} fill="#FFF8EE" stroke="#8B5A2B" strokeWidth={2} />
      <Floor colour="#F3E6D0" line="#EAD9BF" /><Ellipse cx={180} cy={205} rx={110} ry={12} fill="#D9663D" opacity={0.8} /></G>
  ),
  kitchen: ({ time }) => (
    <G><Wall colour="#EAF5FA" trim={palette.monsoon} />{Array.from({ length: 8 }, (_, r) => Array.from({ length: 18 }, (_, c) => <Rect key={`${r}${c}`} x={c * 20} y={r * 20} width={19} height={19} fill={(r + c) % 2 ? '#DDEFF7' : '#E9F5FA'} />))}
      <Window x={250} time={time} w={60} h={50} y={44} /><Rect x={0} y={130} width={360} height={60} fill="#E9D9C0" /><Rect x={0} y={126} width={360} height={6} fill="#9AA3AD" />
      <Rect x={40} y={70} width={120} height={40} fill="#8B5A2B" /><Rect x={46} y={76} width={48} height={28} fill="#5E3A1A" /><Rect x={100} y={76} width={54} height={28} fill="#5E3A1A" />
      <Rect x={200} y={96} width={40} height={30} fill="#6F7580" /><Circle cx={212} cy={111} r={6} fill="#3A2E2A" /><Circle cx={228} cy={111} r={6} fill="#3A2E2A" />
      <Floor colour="#DDE3E8" line="#CFD6DC" /></G>
  ),
  dining: ({ time }) => (
    <G><Wall colour="#FFF1DC" trim="#D9663D" border /><Window x={230} time={time} /><Rect x={30} y={60} width={90} height={60} rx={4} fill="#FFF8EE" stroke="#8B5A2B" strokeWidth={3} /><Path d="M 45 110 q 30 -40 60 0" stroke={palette.plum} strokeWidth={3} fill="none" /><Circle cx={95} cy={78} r={8} fill={palette.saffron} /><Floor colour="#F0DEC2" line="#E6D0AE" /></G>
  ),
  study: ({ time }) => (
    <G><Wall colour="#FFF8EE" trim={palette.indigo} /><Window x={240} time={time} w={60} h={60} y={36} /><Shelf x={20} y={50} w={160} /><Shelf x={20} y={80} w={160} /><Shelf x={20} y={110} w={160} /><Rect x={14} y={40} width={172} height={6} fill="#8B5A2B" /><Floor colour="#E6D7BF" line="#DCCBAE" /></G>
  ),
  activity_art: ({ time }) => (
    <G><Wall colour="#FFFBF2" trim={palette.plum} border /><Window x={250} time={time} /><Path d="M 20 60 q 140 24 220 0" stroke="#8B5A2B" strokeWidth={2} fill="none" />
      {[[40, 62, palette.peepal], [100, 70, palette.saffron], [160, 72, palette.monsoon], [220, 66, palette.rose]].map(([x, y, c]) => <G key={String(x)}><Rect x={Number(x)} y={Number(y)} width={30} height={38} fill="#FFFFFF" stroke="#EAD9BF" /><Circle cx={Number(x) + 15} cy={Number(y) + 18} r={8} fill={String(c)} /></G>)}
      <Floor colour="#E9D9C0" line="#D9C4A4" /></G>
  ),
  activity_music: ({ time }) => (
    <G><Wall colour="#F8D7DF" trim={palette.rose} border /><Window x={40} time={time} w={60} h={60} y={40} /><Rect x={150} y={60} width={110} height={9} rx={4.5} fill="#C98A5B" transform="rotate(-8 205 64)" />{[170, 185, 200, 215, 230].map((x) => <Circle key={x} cx={x} cy={64 - (x - 170) * 0.14} r={2} fill="#5E3A1A" />)}
      <Rect x={300} y={40} width={14} height={60} rx={3} fill={palette.saffron} /><Ellipse cx={307} cy={36} rx={12} ry={6} fill={palette.marigold} />
      <Floor colour="#8E4585" line="#6A2F62" /><Ellipse cx={180} cy={206} rx={120} ry={12} fill="#A85E9D" opacity={0.6} /></G>
  ),
  activity_lab: ({ time }) => (
    <G><Wall colour="#E9F5FA" trim={palette.monsoon} border />{Array.from({ length: 8 }, (_, r) => Array.from({ length: 18 }, (_, c) => <Rect key={`${r}${c}`} x={c * 20} y={14 + r * 20} width={19} height={19} fill={(r + c) % 2 ? '#DDEFF7' : '#E9F5FA'} />))}
      <Rect x={26} y={40} width={80} height={60} rx={4} fill="#FFF8EE" stroke={palette.indigo} strokeWidth={2} /><Circle cx={66} cy={70} r={14} fill="none" stroke={palette.saffron} strokeWidth={3} /><Circle cx={66} cy={70} r={4} fill="#D9663D" />
      <Rect x={130} y={54} width={200} height={6} fill="#8B5A2B" />{[140, 166, 192, 218].map((x, i) => <Rect key={x} x={x} y={30 + (i % 2) * 4} width={18} height={24 - (i % 2) * 4} rx={3} fill={[palette.marigold, palette.leaf, palette.rose, palette.monsoon][i]} opacity={0.85} />)}
      <Rect x={20} y={150} width={320} height={14} rx={4} fill="#8B5A2B" /><Rect x={30} y={164} width={300} height={26} fill="#5E3A1A" />
      <Floor colour="#A9B7BF" line="#8A939B" /><G transform="translate(0 0)">{time === 'night' && <Rect x={0} y={0} width={360} height={220} fill="#1B2142" opacity={0.2} />}</G></G>
  ),
  bedroom: ({ time }) => (
    <G><Wall colour={time === 'night' ? '#2A3058' : '#EAF6FF'} trim={palette.monsoon} /><Window x={240} time={time} w={70} h={60} y={36} />
      <Rect x={30} y={110} width={140} height={80} rx={6} fill="#8B5A2B" /><Rect x={36} y={120} width={128} height={30} rx={4} fill="#FFFFFF" /><Rect x={36} y={140} width={128} height={44} rx={4} fill={palette.monsoon} /><Rect x={44} y={122} width={40} height={18} rx={4} fill="#FFF8EE" />
      <Rect x={200} y={140} width={10} height={50} fill="#8B5A2B" /><Path d="M 186 140 h 38 l -5 -16 h -28 Z" fill={time === 'night' ? palette.haldi : '#E9D9C0'} />{time === 'night' && <Ellipse cx={205} cy={132} rx={30} ry={16} fill={palette.haldi} opacity={0.25} />}
      <Floor colour={time === 'night' ? '#272C52' : '#DDF2FB'} line={time === 'night' ? '#3B4270' : '#CDE9F5'} /></G>
  ),
  bathroom: () => (
    <G><Wall colour="#F2FAFD" trim={palette.monsoon} />{Array.from({ length: 9 }, (_, r) => Array.from({ length: 18 }, (_, c) => <Rect key={`${r}${c}`} x={c * 20} y={r * 20} width={19} height={19} fill={(r + c) % 2 ? '#DDEFF7' : '#EAF6FF'} />))}
      <Rect x={40} y={110} width={70} height={30} rx={8} fill="#FFFFFF" stroke="#A9B7BF" strokeWidth={2} /><Rect x={60} y={80} width={40} height={30} fill="#BFE6F7" stroke="#8CCBE0" strokeWidth={2} /><Path d="M 75 110 v -10 h 8" stroke="#6F7580" strokeWidth={3} fill="none" />
      <Rect x={200} y={140} width={120} height={50} rx={12} fill="#FFFFFF" stroke="#A9B7BF" strokeWidth={2} /><Ellipse cx={260} cy={150} rx={54} ry={8} fill="#BFE6F7" />
      <Floor colour="#E3F2F8" line="#D4E9F1" /></G>
  ),
  veranda: ({ time, t, id }) => (
    <G><Sky time={time} id={id} /><Hills /><Grass /><Rect x={0} y={0} width={360} height={150} fill="#FFF6EA" opacity={0.92} /><Rect x={0} y={0} width={360} height={14} fill="#8B5A2B" />
      <Rect x={150} y={30} width={90} height={120} fill={palette.saffron} stroke="#B8780F" strokeWidth={3} /><Circle cx={226} cy={92} r={3} fill="#B8780F" /><Rect x={160} y={40} width={70} height={8} rx={1} fill="#C98310" />
      <G transform={`translate(60 20) rotate(${t ? Math.sin(t * 1.3) * 4 : 0} 0 0)`}><Path d="M -22 0 V 110 M 22 0 V 110" stroke="#6F5F58" strokeWidth={2} /><Rect x={-30} y={108} width={60} height={10} rx={3} fill="#8B5A2B" /><Rect x={-28} y={100} width={56} height={9} rx={3} fill="#D9663D" /></G>
      <Floor colour="#E9D9C0" line="#D9C4A4" /><G transform="translate(300 190)"><Ellipse cx={0} cy={8} rx={26} ry={10} fill={palette.saffron} /><Ellipse cx={0} cy={8} rx={16} ry={6} fill="#FFF8EE" /><Ellipse cx={0} cy={8} rx={7} ry={3} fill="#D9663D" /></G></G>
  ),
  terrace: ({ time, id, t }) => (
    <G><Sky time={time} id={id} /><WeatherLayerNone /><Hills y={140} /><Rect x={0} y={160} width={360} height={30} fill="#E9D9C0" /><Rect x={0} y={156} width={360} height={6} fill="#D9C4A4" />
      {[40, 120, 200, 280].map((x) => <Rect key={x} x={x} y={60} width={8} height={100} fill="#8B5A2B" />)}{[70, 90, 110].map((y) => <Rect key={y} x={30} y={y} width={300} height={5} fill="#B07A45" />)}
      <G transform={`translate(0 ${t ? Math.sin(t) : 0})`}>{[60, 140, 220, 300].map((x, i) => <G key={x}><Rect x={x - 10} y={146} width={20} height={14} rx={2} fill="#D9663D" /><Ellipse cx={x} cy={144} rx={12} ry={7} fill={palette.leaf} /><Circle cx={x - 4} cy={140} r={3} fill={[palette.rose, palette.marigold][i % 2]} /></G>)}</G>
      <Floor colour="#E0CFAE" line="#C9B698" /></G>
  ),
  garden_bed: ({ time, id, season }) => (
    <G><Sky time={time} id={id} /><Hills /><Tree x={50} scale={0.8} colour={season === 'autumn' ? '#D9A33D' : palette.peepal} /><Tree x={320} scale={0.7} /><Grass />
      <Rect x={0} y={GROUND_Y - 6} width={360} height={36} fill="#8B5A2B" /><Rect x={0} y={GROUND_Y} width={360} height={30} fill="#5E3A1A" /><Path d="M 0 198 H 360 M 0 206 H 360" stroke="#6B4423" strokeWidth={1} />
      <Rect x={0} y={0} width={0} height={0} /><G transform="translate(0 0)"><Rect x={-10} y={GROUND_Y - 30} width={60} height={24} rx={3} fill="#FFF8EE" stroke="#8B5A2B" strokeWidth={1.5} transform="rotate(-6 20 178)" /></G></G>
  ),
  cowshed: ({ time, id }) => (
    <G><Sky time={time} id={id} /><Hills /><Grass colour="#A8D27A" /><Rect x={30} y={40} width={300} height={150} fill="#C9A071" /><Rect x={20} y={30} width={320} height={16} fill="#D9663D" /><Path d="M 20 30 L 180 6 L 340 30 Z" fill="#B04A2C" />
      {[40, 320].map((x) => <Rect key={x} x={x - 6} y={40} width={12} height={150} fill="#8B5A2B" />)}<Ellipse cx={90} cy={182} rx={40} ry={14} fill={palette.haldi} stroke="#C9A52E" strokeWidth={1} /><Rect x={240} y={160} width={70} height={24} rx={4} fill="#6F7580" /><Rect x={244} y={164} width={62} height={10} fill={palette.sky} />
      <Floor colour="#B98F5F" line="#A5733F" /></G>
  ),
  rabbit: ({ time, id }) => (
    <G><Sky time={time} id={id} /><Hills /><Tree x={300} scale={0.7} /><Grass /><Rect x={30} y={100} width={130} height={90} fill="#C98A5B" stroke="#8B5A2B" strokeWidth={2} /><Path d="M 24 100 L 95 70 L 166 100 Z" fill="#8B5A2B" /><Rect x={50} y={130} width={40} height={60} rx={20} fill="#3A2E2A" /><Rect x={100} y={120} width={48} height={50} fill="#DDE3E8" stroke="#9AA3AD" />{[0, 1, 2, 3].map((i) => <Path key={i} d={`M ${100 + i * 12} 120 V 170`} stroke="#9AA3AD" strokeWidth={1} />)}
      {[200, 230, 260].map((x) => <G key={x}><Rect x={x} y={150} width={6} height={40} fill="#C98A5B" /><Rect x={196} y={160} width={80} height={5} fill="#C98A5B" /></G>)}<Floor colour="#8BC34A" line="#7FB542" /></G>
  ),
  dog: ({ time, id }) => (
    <G><Sky time={time} id={id} /><Hills /><Tree x={60} scale={0.75} /><Grass /><Rect x={210} y={110} width={110} height={80} fill="#C98A5B" stroke="#8B5A2B" strokeWidth={2} /><Path d="M 204 110 L 265 72 L 326 110 Z" fill="#D9663D" /><Path d="M 245 190 V 150 a 20 20 0 0 1 40 0 V 190 Z" fill="#3A2E2A" />
      <Ellipse cx={140} cy={186} rx={18} ry={7} fill="#D9663D" /><Floor colour="#8BC34A" line="#7FB542" /></G>
  ),
  pond: ({ time, id, t }) => (
    <G><Sky time={time} id={id} /><Hills /><Tree x={40} scale={0.8} /><Tree x={330} scale={0.6} /><Grass /><Ellipse cx={180} cy={GROUND_Y + 8} rx={140} ry={26} fill="#8B5A2B" /><Ellipse cx={180} cy={GROUND_Y + 6} rx={128} ry={20} fill={palette.monsoon} />
      <Ellipse cx={180} cy={GROUND_Y + 6} rx={60 * (t ? ((t % 3) / 3) : 0.5)} ry={10 * (t ? ((t % 3) / 3) : 0.5)} fill="none" stroke="#8CCBE0" strokeWidth={1.5} opacity={0.7} />
      <G transform="translate(120 190)"><Ellipse cx={0} cy={0} rx={14} ry={6} fill={palette.leaf} /><Circle cx={0} cy={-6} r={6} fill={palette.rose} /></G><G transform="translate(250 194)"><Ellipse cx={0} cy={0} rx={12} ry={5} fill={palette.leaf} /></G></G>
  ),
  public_garden: ({ time, id }) => (
    <G><Sky time={time} id={id} /><Hills /><Tree x={40} /><Tree x={330} scale={0.9} colour="#5BAE3C" /><Grass /><G transform="translate(180 190)"><Path d="M -40 0 L -24 -80 L -8 0 M 40 0 L 24 -80 L 8 0 M -24 -80 H 24" stroke="#D9663D" strokeWidth={5} fill="none" strokeLinecap="round" /><Path d="M -6 -78 V -30 M 6 -78 V -30" stroke="#6F5F58" strokeWidth={1.5} /><Rect x={-14} y={-32} width={28} height={6} rx={2} fill="#8B5A2B" /></G>
      <Path d="M 0 210 q 180 -16 360 0 v 10 H 0 Z" fill="#E9D9C0" /></G>
  ),
  library: ({ time }) => (
    <G><Wall colour="#FFF3DC" trim="#8B5A2B" border />{[20, 130, 240].map((x) => <G key={x}><Path d={`M ${x} 190 V 70 Q ${x} 36 ${x + 50} 34 Q ${x + 100} 36 ${x + 100} 70 V 190 Z`} fill="#8B5A2B" /><Path d={`M ${x + 6} 190 V 72 Q ${x + 6} 42 ${x + 50} 40 Q ${x + 94} 42 ${x + 94} 72 V 190 Z`} fill="#5E3A1A" />{[0, 1, 2, 3, 4].map((r) => <Shelf key={r} x={x + 8} y={70 + r * 24} w={84} />)}</G>)}
      <Floor colour="#D4A06A" line="#C98A5B" />{time === 'night' && <Rect x={0} y={0} width={360} height={220} fill="#1B2142" opacity={0.25} />}</G>
  ),
  temple: ({ time, id }) => (
    <G><Sky time={time} id={id} /><Hills /><G transform="translate(80 190)"><Rect x={-30} y={-80} width={60} height={80} fill="#D9663D" /><Path d="M -36 -80 L -22 -130 L 0 -170 L 22 -130 L 36 -80 Z" fill="#D9663D" stroke="#A8482A" strokeWidth={1.5} /><Rect x={-3} y={-184} width={6} height={16} fill={palette.saffron} /><Circle cx={0} cy={-186} r={5} fill={palette.marigold} /><Path d="M -12 0 V -36 Q -12 -50 0 -52 Q 12 -50 12 -36 V 0 Z" fill="#5E3A1A" /></G>
      <G transform="translate(280 190)"><Rect x={-40} y={-70} width={80} height={70} fill="#8E4585" /><Path d="M -46 -70 L -34 -120 L -22 -150 H 22 L 34 -120 L 46 -70 Z" fill="#8E4585" stroke="#6A2F62" strokeWidth={1.5} />{[0, 1, 2].map((r) => <Rect key={r} x={-36 + r * 8} y={-86 - r * 26} width={72 - r * 16} height={6} fill="#E07A95" />)}<Rect x={-26} y={-158} width={52} height={8} rx={4} fill={palette.marigold} /></G>
      <G transform="translate(180 190)"><Path d="M -24 -120 h 48" stroke="#8B5A2B" strokeWidth={5} /><Path d="M 0 -118 V -104" stroke="#6F5F58" strokeWidth={2} /><Path d="M -12 -74 Q -12 -102 0 -104 Q 12 -102 12 -74 Z" fill={palette.marigold} stroke="#C98310" strokeWidth={2} /><Rect x={-15} y={-74} width={30} height={5} rx={2} fill="#C98310" /></G>
      <Floor colour="#E9D9C0" line="#D9C4A4" /></G>
  ),
  bazaar: ({ time, id }) => (
    <G><Sky time={time} id={id} />{[20, 140, 260].map((x, i) => <G key={x}><Rect x={x} y={120} width={100} height={70} fill="#C98A5B" stroke="#8B5A2B" strokeWidth={2} /><Rect x={x + 4} y={70} width={6} height={50} fill="#8B5A2B" /><Rect x={x + 90} y={70} width={6} height={50} fill="#8B5A2B" /><Path d={`M ${x - 6} 70 h 112 l -6 12 l -6 -6 l -6 6 l -6 -6 l -6 6 l -6 -6 l -6 6 l -6 -6 l -6 6 l -6 -6 l -6 6 l -6 -6 l -6 6 l -6 -6 l -6 6 l -6 -6 l -6 6 Z`} fill={[palette.clay, palette.monsoon, palette.plum][i]} />{[0, 1, 2, 3].map((k) => <Circle key={k} cx={x + 20 + k * 20} cy={116} r={8} fill={[palette.marigold, '#D9663D', palette.leaf, palette.rose][(k + i) % 4]} />)}</G>)}
      <Floor colour="#D9C4A4" line="#CDB58F" /></G>
  ),
  space: ({ t }) => (
    <G><Rect x={0} y={0} width={360} height={220} fill="#1B2142" />{Array.from({ length: 50 }, (_, i) => <Circle key={i} cx={(i * 73) % 360} cy={(i * 41) % 220} r={0.8 + (i % 3) * 0.5} fill="#FFFFFF" opacity={t ? 0.5 + 0.5 * Math.abs(Math.sin(t * 2 + i)) : 0.8} />)}
      <Circle cx={40} cy={60} r={30} fill={palette.marigold} /><Circle cx={40} cy={60} r={40} fill={palette.marigold} opacity={0.15} /><Circle cx={300} cy={50} r={18} fill={palette.monsoon} /><Path d="M 292 46 q 6 -4 10 2 q 4 6 8 0" stroke={palette.leaf} strokeWidth={3} fill="none" /><Circle cx={230} cy={100} r={9} fill="#D9663D" /><Ellipse cx={120} cy={120} rx={14} ry={14} fill={palette.haldi} /><Ellipse cx={120} cy={120} rx={26} ry={6} fill="none" stroke="#E9D9C0" strokeWidth={3} />
      <Path d="M 0 200 Q 180 170 360 200 V 220 H 0 Z" fill="#8FA6C9" /></G>
  ),
  museum: () => (
    <G><Wall colour="#F4ECDE" trim="#8B5A2B" />{[40, 140, 240].map((x, i) => <G key={x}><Rect x={x} y={60} width={80} height={60} fill="#FFFFFF" stroke="#8B5A2B" strokeWidth={4} />{i === 0 && <Path d="M 50 110 q 20 -46 40 -20 q 10 -20 24 10 Z" fill="#A5733F" />}{i === 1 && <G><Ellipse cx={180} cy={92} rx={26} ry={14} fill="#6B8E4E" /><Path d="M 160 92 q -14 -20 4 -30 M 200 92 q 14 -20 -4 -30" stroke="#6B8E4E" strokeWidth={6} fill="none" /></G>}{i === 2 && <Path d="M 250 110 L 280 70 L 310 110 Z" fill="#E9D9C0" stroke="#C9B698" />}</G>)}
      <Rect x={150} y={150} width={60} height={40} fill="#A9B7BF" /><Rect x={158} y={120} width={44} height={30} fill="#E9D9C0" /><Floor colour="#DDE3E8" line="#C9D1D8" /></G>
  ),
  forest: ({ time, id, season }) => (
    <G><Sky time={time} id={id} /><Hills colour="#6B8E4E" y={120} /><Tree x={30} scale={1.1} colour="#3E8E2C" /><Tree x={100} scale={0.9} colour={season === 'autumn' ? '#D9A33D' : '#4E9F3D'} /><Tree x={200} scale={1.2} colour="#2F7A22" /><Tree x={300} scale={1} colour="#4E9F3D" /><Tree x={350} scale={0.7} colour="#3E8E2C" />
      <Grass colour="#5A8A3C" /><Path d="M 0 200 q 90 -8 180 0 t 180 0" stroke="#8B5A2B" strokeWidth={10} fill="none" opacity={0.6} /><G transform="translate(260 170)"><Ellipse cx={0} cy={0} rx={10} ry={6} fill="#6B4423" /><Circle cx={-6} cy={-4} r={4} fill="#6B4423" /></G></G>
  ),
  ocean: ({ time, id, t }) => (
    <G><Sky time={time} id={id} /><Rect x={0} y={120} width={360} height={100} fill={palette.monsoon} /><Rect x={0} y={150} width={360} height={70} fill="#1F6C8C" opacity={0.6} />{[0, 1, 2].map((i) => <Path key={i} d={`M ${-40 + (t ? (t * 20 + i * 40) % 80 : 0)} ${130 + i * 20} q 20 -8 40 0 t 40 0 t 40 0 t 40 0 t 40 0 t 40 0 t 40 0 t 40 0 t 40 0`} stroke="#8CCBE0" strokeWidth={2} fill="none" opacity={0.6} />)}
      <G transform="translate(90 170)"><Path d="M -16 0 q 16 -12 32 0 q -16 12 -32 0 Z" fill={palette.saffron} /><Path d="M 16 0 l 10 -8 v 16 Z" fill={palette.saffron} /></G><G transform="translate(260 190)"><Path d="M -20 0 q 20 -16 40 0 q -20 16 -40 0 Z" fill="#E07A95" /><Circle cx={0} cy={-2} r={4} fill="#FFF8EE" /></G>
      <Rect x={0} y={200} width={360} height={20} fill="#E9D9C0" /></G>
  ),
  mountains: ({ time, id }) => (
    <G><Sky time={time} id={id} /><Path d="M 0 150 L 60 60 L 110 120 L 160 40 L 210 110 L 260 50 L 320 120 L 360 90 V 190 H 0 Z" fill="#8FA6C9" /><Path d="M 150 55 L 160 40 L 170 55 Z M 250 65 L 260 50 L 270 65 Z M 50 75 L 60 60 L 70 75 Z" fill="#FFFFFF" /><Path d="M 0 170 Q 90 130 180 160 T 360 150 V 190 H 0 Z" fill="#6B8E4E" />
      <Tree x={60} scale={0.5} colour="#2F7A22" /><Tree x={300} scale={0.6} colour="#2F7A22" /><Grass colour="#5A8A3C" /></G>
  ),
  monument: ({ time, id }) => (
    <G><Sky time={time} id={id} /><Hills y={160} /><G transform="translate(180 190)"><Rect x={-110} y={-40} width={220} height={40} fill="#F7F1E6" stroke="#C9B698" /><Path d="M -50 -40 V -100 Q -50 -140 0 -142 Q 50 -140 50 -100 V -40 Z" fill="#F7F1E6" stroke="#C9B698" strokeWidth={1.5} /><Path d="M -16 -142 h 32 M -4 -150 h 8 v -10 h -8 Z" fill="#F7F1E6" stroke="#C9B698" /><Rect x={-100} y={-120} width={8} height={80} fill="#F7F1E6" stroke="#C9B698" /><Rect x={92} y={-120} width={8} height={80} fill="#F7F1E6" stroke="#C9B698" /><Path d="M -14 -40 V -80 Q -14 -96 0 -98 Q 14 -96 14 -80 V -40 Z" fill="#8FA6C9" /></G>
      <Rect x={0} y={GROUND_Y} width={360} height={30} fill="#E9D9C0" /><Path d="M 0 190 H 360" stroke="#D9C4A4" strokeWidth={2} /></G>
  ),
};

function WeatherLayerNone() { return null; }

export const SIDE_BACKGROUND_KEYS = Object.keys(BACKGROUNDS) as SideBackgroundKey[];

/** Map a location id to its side-view background. */
export function backgroundForLocation(locationId: string): SideBackgroundKey {
  const table: Record<string, SideBackgroundKey> = {
    'villa.living': 'living', 'villa.kitchen': 'kitchen', 'villa.dining': 'dining', 'villa.bedroom_dadaji': 'bedroom', 'villa.bedroom_chintu': 'bedroom', 'villa.study': 'study', 'villa.activity': 'activity_art',
    'villa.bathroom': 'bathroom', 'villa.veranda': 'veranda', 'villa.terrace': 'terrace', 'villa.exterior': 'public_garden', 'villa.driveway': 'public_garden',
    'garden.flowers': 'garden_bed', 'garden.vegetables': 'garden_bed', 'garden.fruit': 'garden_bed', 'garden.butterfly': 'garden_bed', 'garden.greenhouse': 'garden_bed', 'garden.pond': 'pond', 'garden.fountain': 'pond', 'garden.workshop': 'garden_bed', 'garden.compost': 'garden_bed',
    'animalia.dog': 'dog', 'animalia.rabbit': 'rabbit', 'animalia.cowshed': 'cowshed', 'animalia.calf': 'cowshed', 'animalia.wild': 'forest',
    'town.public_garden': 'public_garden', 'town.library': 'library', 'town.temple': 'temple', 'town.bazaar': 'bazaar', 'town.festival_ground': 'bazaar',
    'excursion.space': 'space', 'excursion.museum': 'museum', 'excursion.forest': 'forest', 'excursion.ocean': 'ocean', 'excursion.mountains': 'mountains', 'excursion.monument': 'monument',
  };
  return table[locationId] ?? 'living';
}
