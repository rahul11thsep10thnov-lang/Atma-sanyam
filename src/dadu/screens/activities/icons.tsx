// Small inline SVG pictures for picture-choice activities (Little mode). Keys
// are the ActivityItem.icon or key used by src/dadu/content/lessons; unknown
// keys get a coloured circle with the first letter.
import React from 'react';
import Svg, { Circle, Ellipse, Path, Rect, Text as SvgText, G, Line } from 'react-native-svg';
import { P } from '../../ui/palette';

const PIC: Record<string, React.ReactNode> = {
  moon: <><Circle cx={32} cy={32} r={20} fill="#FFE08A" /><Circle cx={26} cy={30} r={3} fill="#E9C76A" /><Circle cx={36} cy={40} r={2} fill="#E9C76A" /></>,
  sun: <><Circle cx={32} cy={32} r={14} fill="#FFC94D" /><G stroke="#F4A523" strokeWidth={4} strokeLinecap="round"><Line x1={32} y1={6} x2={32} y2={14} /><Line x1={32} y1={50} x2={32} y2={58} /><Line x1={6} y1={32} x2={14} y2={32} /><Line x1={50} y1={32} x2={58} y2={32} /></G></>,
  leaf: <><Path d="M14 50 Q14 14 50 14 Q50 50 14 50 Z" fill="#8BC34A" /><Path d="M16 48 Q30 34 46 18" stroke="#4E9F3D" strokeWidth={3} fill="none" /></>,
  ball: <><Circle cx={32} cy={32} r={22} fill="#D9663D" /><Path d="M14 24 q18 8 36 0 M14 40 q18 -8 36 0" stroke="#fff" strokeWidth={2.5} fill="none" /></>,
  water: <Path d="M32 8 q20 26 12 40 a14 14 0 0 1 -24 0 q-8 -14 12 -40 Z" fill="#2E86AB" />,
  mango: <><Ellipse cx={32} cy={36} rx={16} ry={20} fill="#FFC94D" transform="rotate(-20 32 36)" /><Path d="M36 18 q8 -8 14 -4 q-8 2 -12 8 Z" fill="#4E9F3D" /></>,
  banana: <Path d="M14 30 q18 30 40 10 q-6 10 -22 14 q-14 0 -18 -24 Z" fill="#FFE08A" stroke="#C9A227" strokeWidth={2} />,
  apple: <><Circle cx={32} cy={36} r={18} fill="#D9663D" /><Path d="M32 18 v-8" stroke="#8B5A2B" strokeWidth={3} /><Path d="M34 14 q8 -6 12 0 q-6 4 -12 0" fill="#4E9F3D" /></>,
  star: <Path d="M32 8 l7 15 16 2 -12 11 3 16 -14 -8 -14 8 3 -16 -12 -11 16 -2 Z" fill="#FFC94D" stroke="#F4A523" strokeWidth={2} />,
  bell: <><Path d="M22 50 Q22 26 32 24 Q42 26 42 50 Z" fill="#FFC94D" stroke="#C98310" strokeWidth={2} /><Rect x={18} y={50} width={28} height={4} rx={2} fill="#C98310" /></>,
  kite: <><Path d="M32 6 l20 22 -20 28 -20 -28 Z" fill="#E07A95" /><Path d="M32 56 q-6 8 2 12" stroke="#2F3C7E" strokeWidth={2} fill="none" /></>,
  nail: <><Rect x={28} y={10} width={8} height={40} fill="#8A8F99" /><Rect x={22} y={8} width={20} height={6} rx={2} fill="#6F7580" /></>,
  pencil: <><Rect x={26} y={10} width={12} height={36} fill="#FFC94D" /><Path d="M26 46 l6 10 l6 -10 Z" fill="#E9B98E" /><Rect x={26} y={8} width={12} height={6} fill="#F28DA6" /></>,
  flower: <><G fill="#E07A95"><Circle cx={32} cy={18} r={8} /><Circle cx={46} cy={28} r={8} /><Circle cx={42} cy={44} r={8} /><Circle cx={22} cy={44} r={8} /><Circle cx={18} cy={28} r={8} /></G><Circle cx={32} cy={32} r={7} fill="#FFC94D" /></>,
  root: <><Rect x={20} y={8} width={24} height={18} rx={3} fill="#8B5A2B" /><Path d="M32 26 v10 M32 32 l-10 12 M32 36 l10 14" stroke="#E9D9C0" strokeWidth={3} fill="none" strokeLinecap="round" /></>,
  india: <Path d="M20 10 h20 l10 14 l-6 18 l-12 14 l-8 -10 l-6 -18 Z" fill="#F4A523" />,
  africa: <Path d="M20 14 h22 l8 14 l-6 20 l-10 10 l-8 -12 l-8 -14 Z" fill="#4E9F3D" />,
  australia: <Path d="M14 30 q10 -12 24 -8 q14 4 12 18 q-8 10 -22 8 q-14 0 -14 -18 Z" fill="#D9663D" />,
  asia: <Path d="M12 30 q6 -16 24 -14 q18 2 18 18 q-4 14 -18 16 q-10 4 -16 -4 q-10 -4 -8 -16 Z" fill="#4E9F3D" />,
  europe: <Path d="M14 26 q10 -14 24 -8 l12 6 l-6 12 l-10 2 l-6 8 l-10 -6 Z" fill="#2E86AB" />,
  red: <Circle cx={32} cy={32} r={20} fill="#D9663D" />, blue: <Circle cx={32} cy={32} r={20} fill="#2E86AB" />, yellow: <Circle cx={32} cy={32} r={20} fill="#FFC94D" />,
  green: <Circle cx={32} cy={32} r={20} fill="#4E9F3D" />, orange: <Circle cx={32} cy={32} r={20} fill="#F4A523" />, purple: <Circle cx={32} cy={32} r={20} fill="#8E4585" />, white: <Circle cx={32} cy={32} r={20} fill="#FFF8EE" stroke="#EAD9BF" strokeWidth={2} />, pink: <Circle cx={32} cy={32} r={20} fill="#F28DA6" />, brown: <Circle cx={32} cy={32} r={20} fill="#8B5A2B" />,
  croc: <><Path d="M6 36 q0 -10 10 -10 h30 l12 -8 v14 l-12 -2 h-30 q-10 0 -10 6 Z" fill="#4E9F3D" /><Circle cx={24} cy={26} r={3} fill="#fff" /><Circle cx={24} cy={26} r={1.5} fill="#000" /></>,
  fish: <><Path d="M10 32 q14 -16 32 0 q-18 16 -32 0 Z" fill="#F4A523" /><Path d="M42 32 l12 -10 v20 Z" fill="#F4A523" /></>,
  tree: <><Rect x={28} y={34} width={8} height={22} fill="#8B5A2B" /><Circle cx={32} cy={26} r={18} fill="#4E9F3D" /></>,
  house: <><Path d="M8 32 L32 10 L56 32 Z" fill="#D9663D" /><Rect x={14} y={30} width={36} height={26} rx={3} fill="#FFF3DC" /><Rect x={27} y={40} width={10} height={16} fill="#8B5A2B" /></>,
  book: <><Path d="M10 14 q11 -4 22 2 v34 q-11 -6 -22 -2 Z" fill="#FFF8EE" stroke="#8B5A2B" strokeWidth={2} /><Path d="M54 14 q-11 -4 -22 2 v34 q11 -6 22 -2 Z" fill="#FFEFD2" stroke="#8B5A2B" strokeWidth={2} /></>,
  can: <><Rect x={14} y={26} width={30} height={26} rx={4} fill="#2E86AB" /><Path d="M44 34 l12 -8" stroke="#2E86AB" strokeWidth={6} strokeLinecap="round" /><Circle cx={56} cy={25} r={4} fill="#5BA8C9" /></>,
  bowl: <><Path d="M10 30 q22 28 44 0 Z" fill="#E9D9C0" stroke="#C9B698" strokeWidth={2} /><Ellipse cx={32} cy={30} rx={22} ry={6} fill="#A5733F" /></>,
  brush: <><Rect x={16} y={36} width={32} height={12} rx={4} fill="#8B5A2B" /><Rect x={18} y={28} width={28} height={8} fill="#E9D9C0" /></>,
  seed: <Ellipse cx={32} cy={34} rx={10} ry={14} fill="#8B5A2B" />,
  soil: <Ellipse cx={32} cy={40} rx={24} ry={10} fill="#8B5A2B" />,
  clock: <><Circle cx={32} cy={32} r={22} fill="#FFF8EE" stroke="#8B5A2B" strokeWidth={4} /><Path d="M32 32 V16 M32 32 L42 38" stroke="#3A2E2A" strokeWidth={3} strokeLinecap="round" /></>,
  eye: <><Ellipse cx={32} cy={32} rx={24} ry={14} fill="#fff" stroke="#3A2E2A" strokeWidth={2} /><Circle cx={32} cy={32} r={8} fill="#2F3C7E" /></>,
  ear: <Path d="M26 14 q20 -6 20 16 q0 14 -10 20 q-6 10 -12 2 q-4 -8 2 -14 q6 -8 -2 -14 Z" fill="#E9B98E" stroke="#C98F6A" strokeWidth={2} />,
  hand: <><Rect x={20} y={30} width={24} height={24} rx={8} fill="#E9B98E" /><G stroke="#E9B98E" strokeWidth={6} strokeLinecap="round"><Line x1={24} y1={30} x2={22} y2={14} /><Line x1={32} y1={30} x2={32} y2={10} /><Line x1={40} y1={30} x2={42} y2={14} /></G></>,
  cup: <><Path d="M16 20 h30 l-4 32 h-22 Z" fill="#BFE6F7" stroke="#6F8F9C" strokeWidth={2} /><Path d="M46 26 q12 0 8 12 q-2 6 -10 6" stroke="#6F8F9C" strokeWidth={3} fill="none" /></>,
  half: <><Circle cx={32} cy={32} r={20} fill="#FFF8EE" stroke="#2F3C7E" strokeWidth={2} /><Path d="M32 12 A20 20 0 0 1 32 52 Z" fill="#F4A523" /></>,
  quarter: <><Circle cx={32} cy={32} r={20} fill="#FFF8EE" stroke="#2F3C7E" strokeWidth={2} /><Path d="M32 32 L32 12 A20 20 0 0 1 52 32 Z" fill="#F4A523" /></>,
  magnet: <Path d="M18 48 V24 a14 14 0 0 1 28 0 V48 h-9 V24 a5 5 0 0 0 -10 0 V48 Z" fill="#D9663D" />,
  battery: <><Rect x={14} y={22} width={34} height={20} rx={3} fill="#3A2E2A" /><Rect x={48} y={28} width={6} height={8} fill="#3A2E2A" /><Rect x={18} y={26} width={18} height={12} fill="#4E9F3D" /></>,
  bulb: <><Circle cx={32} cy={26} r={14} fill="#FFE08A" stroke="#C98310" strokeWidth={2} /><Rect x={26} y={40} width={12} height={10} fill="#8A8F99" /></>,
  wire: <Path d="M8 40 q12 -24 24 0 t24 0" stroke="#D9663D" strokeWidth={4} fill="none" />,
  switch: <><Rect x={12} y={28} width={40} height={10} rx={5} fill="#EAD9BF" /><Circle cx={22} cy={33} r={8} fill="#2F3C7E" /></>,
  carrot: <><Path d="M32 56 l-10 -30 h20 Z" fill="#F4A523" /><Path d="M26 26 q6 -14 12 0" fill="#4E9F3D" /></>,
  cow: <><Ellipse cx={34} cy={36} rx={20} ry={14} fill="#F3EBDD" /><Circle cx={18} cy={30} r={10} fill="#F3EBDD" /><Circle cx={40} cy={34} r={6} fill="#A5733F" /></>,
  dog: <><Ellipse cx={34} cy={38} rx={18} ry={12} fill="#D9A066" /><Circle cx={18} cy={30} r={10} fill="#D9A066" /><Ellipse cx={10} cy={30} rx={4} ry={7} fill="#A5733F" /></>,
  rabbit: <><Ellipse cx={32} cy={42} rx={14} ry={11} fill="#fff" stroke="#EAD9BF" /><Circle cx={32} cy={26} r={10} fill="#fff" stroke="#EAD9BF" /><Ellipse cx={26} cy={12} rx={4} ry={10} fill="#fff" stroke="#F6C6D0" /><Ellipse cx={38} cy={12} rx={4} ry={10} fill="#fff" stroke="#F6C6D0" /></>,
  bird: <><Ellipse cx={32} cy={34} rx={14} ry={10} fill="#5BAE3C" /><Circle cx={44} cy={26} r={7} fill="#4A6D9C" /><Path d="M50 26 l8 2 l-8 3 Z" fill="#E8603C" /></>,
  butterfly: <><Ellipse cx={22} cy={30} rx={12} ry={9} fill="#F4A523" transform="rotate(-20 22 30)" /><Ellipse cx={42} cy={30} rx={12} ry={9} fill="#F4A523" transform="rotate(20 42 30)" /><Rect x={30} y={22} width={4} height={20} rx={2} fill="#3A2E2A" /></>,
  rain: <><Ellipse cx={32} cy={24} rx={18} ry={10} fill="#A9B7BF" /><G stroke="#2E86AB" strokeWidth={3} strokeLinecap="round"><Line x1={22} y1={38} x2={18} y2={50} /><Line x1={32} y1={38} x2={28} y2={50} /><Line x1={42} y1={38} x2={38} y2={50} /></G></>,
  cloud: <Ellipse cx={32} cy={34} rx={22} ry={12} fill="#DDEFF7" stroke="#A9B7BF" />,
  earth: <><Circle cx={32} cy={32} r={20} fill="#2E86AB" /><Path d="M20 26 q8 -6 14 2 q6 8 14 0 M18 40 q10 10 24 2" stroke="#8BC34A" strokeWidth={5} fill="none" strokeLinecap="round" /></>,
  rocket: <><Path d="M32 6 q14 14 8 40 h-16 q-6 -26 8 -40 Z" fill="#E9D9C0" stroke="#8A8F99" /><Circle cx={32} cy={26} r={5} fill="#2E86AB" /><Path d="M24 46 l8 12 l8 -12 Z" fill="#F4A523" /></>,
};

export function ActivityIcon({ name, size = 64, label }: { name?: string; size?: number; label?: string }) {
  const k = (name ?? '').toLowerCase();
  const pic = PIC[k];
  const letter = (label ?? name ?? '?').trim().charAt(0).toUpperCase();
  const hue = ['#2E86AB', '#4E9F3D', '#F4A523', '#8E4585', '#D9663D', '#E0901C'][(k.length + letter.charCodeAt(0)) % 6];
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64" accessibilityLabel={label ?? name}>
      {pic ?? <><Circle cx={32} cy={32} r={24} fill={hue} /><SvgText x={32} y={41} fontSize={26} fontWeight="bold" fill="#fff" textAnchor="middle">{letter}</SvgText></>}
    </Svg>
  );
}

export const ICON_KEYS = Object.keys(PIC);
export const INK = P.ink;
