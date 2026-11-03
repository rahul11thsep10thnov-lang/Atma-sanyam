import React from 'react';
import { Svg, Path, Circle, Rect } from 'react-native-svg';

/** Filled chibi-style tab icons in the DADU palette. */
export function TabIcon({ name, size, active }: { name: 'world' | 'learn' | 'stories' | 'tests' | 'me'; size: number; active: boolean }) {
  const c = active ? '#2F3C7E' : '#9A8C80';
  const a = active ? '#F4A523' : '#C9BDAF';
  switch (name) {
    case 'world':
      return <Svg width={size} height={size} viewBox="0 0 64 64"><Path d="M8 16 l16 -6 l16 6 l16 -6 v38 l-16 6 l-16 -6 l-16 6 Z" fill="#FFF3DC" stroke={c} strokeWidth={4} strokeLinejoin="round" /><Path d="M24 10 v38 M40 16 v38" stroke={c} strokeWidth={3} /><Circle cx={32} cy={30} r={6} fill={a} /></Svg>;
    case 'learn':
      return <Svg width={size} height={size} viewBox="0 0 64 64"><Path d="M8 32 L32 10 L56 32 Z" fill={a} /><Rect x={14} y={30} width={36} height={26} rx={3} fill="#FFF3DC" stroke={c} strokeWidth={3} /><Rect x={27} y={40} width={10} height={16} rx={2} fill={c} /></Svg>;
    case 'stories':
      return <Svg width={size} height={size} viewBox="0 0 64 64"><Path d="M8 14 q12 -4 24 2 v38 q-12 -6 -24 -2 Z" fill="#FFF8EE" stroke={c} strokeWidth={3} /><Path d="M56 14 q-12 -4 -24 2 v38 q12 -6 24 -2 Z" fill="#FFEFD2" stroke={c} strokeWidth={3} /><Path d="M14 24 h12 M14 32 h12 M38 24 h12 M38 32 h12" stroke={a} strokeWidth={3} strokeLinecap="round" /></Svg>;
    case 'tests':
      return <Svg width={size} height={size} viewBox="0 0 64 64"><Rect x={12} y={8} width={40} height={48} rx={6} fill="#FFF8EE" stroke={c} strokeWidth={3} /><Rect x={24} y={4} width={16} height={10} rx={3} fill={a} /><Path d="M20 26 l5 5 l9 -9 M20 42 l5 5 l9 -9" stroke="#4E9F3D" strokeWidth={4} fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg>;
    default:
      return <Svg width={size} height={size} viewBox="0 0 64 64"><Circle cx={32} cy={22} r={13} fill="#D9A070" stroke={c} strokeWidth={3} /><Path d="M10 58 q0 -20 22 -20 q22 0 22 20 Z" fill={a} stroke={c} strokeWidth={3} /><Path d="M20 18 q4 -12 12 -10 q10 -2 14 10 q-6 -6 -13 -4 q-7 -2 -13 4 Z" fill="#2B1D14" /></Svg>;
  }
}
