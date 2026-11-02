// Mitthu: mountain parakeet, green body, slate-blue head, red-orange beak,
// long blue-green tail. Box 80 × 80, perch at y = 78.
import React from 'react';
import { Circle, Ellipse, G, Path, Rect } from 'react-native-svg';
import type { RigProps } from '../types';
import { characterColours } from '../palette';
import { Eyes, Shadow, SleepZ, rot } from './parts';
import { anim } from '../clock';

export const MITTHU_BOX = { w: 80, h: 80 };
const c = characterColours.mitthu;

export function MitthuRig(p: RigProps) {
  const { view, pose, expression, t, talking } = p;
  const side = view !== 'front' && view !== 'threeQuarter' && view !== 'back';
  const back = view === 'back';
  const bob = pose === 'walk' || pose === 'run' || pose === 'clap' ? anim.bob(t) * 4 : anim.breathe(t) * 0.8;
  const flap = pose === 'wave' || pose === 'clap' || pose === 'run' ? anim.swing(t, 12) * 25 : 0;
  const tilt = pose === 'think' ? -14 : pose === 'sleep' ? 18 : pose === 'graze' ? 25 : 0;
  const open = talking ? anim.mouthOpen(t) * 3 : expression === 'talk' || expression === 'laugh' ? 3 : 0;
  const cx = side ? 40 : 40; const cy = 30;
  const sleeping = pose === 'sleep' || expression === 'sleepy';
  return (
    <G>
      <Rect x={10} y={76} width={60} height={4} rx={2} fill="#8B5A2B" />
      <Shadow cx={40} cy={78} rx={14} ry={3} />
      <G transform={`translate(0 ${-bob})`}>
        {/* tail */}
        <Path d={side ? 'M 30 58 q -22 10 -26 26 q 14 -8 30 -18 Z' : back ? 'M 36 58 q -2 16 4 24 q 6 -8 4 -24 Z' : 'M 34 60 q 2 14 6 20 q 4 -6 6 -20 Z'} fill={c.tail} stroke="#1F6C8C" strokeWidth={1} />
        {/* body */}
        <Ellipse cx={cx} cy={56} rx={16} ry={20} fill={c.body} stroke="#2F7A22" strokeWidth={1.2} />
        {/* wing */}
        <G transform={rot(flap, cx + (side ? -8 : -14), 48)}>
          <Path d={side ? `M ${cx - 8} 44 q -14 10 -10 26 q 10 -4 18 -18 Z` : `M ${cx - 14} 46 q -10 10 -6 24 q 8 -4 12 -18 Z`} fill={c.wing} stroke="#2F7A22" strokeWidth={1} />
        </G>
        {!side && <G transform={rot(-flap, cx + 14, 48)}><Path d={`M ${cx + 14} 46 q 10 10 6 24 q -8 -4 -12 -18 Z`} fill={c.wing} stroke="#2F7A22" strokeWidth={1} /></G>}
        {/* feet */}
        <Path d={`M ${cx - 6} 72 l -3 6 M ${cx - 6} 72 l 0 6 M ${cx + 6} 72 l 3 6 M ${cx + 6} 72 l 0 6`} stroke={c.foot} strokeWidth={2.4} strokeLinecap="round" />
        {/* head */}
        <G transform={rot(tilt, cx, 44)}>
          <Circle cx={cx} cy={cy} r={17} fill={c.head} stroke={c.headShade} strokeWidth={1.2} />
          {!back && (
            <G>
              <Path d={side ? `M ${cx + 12} ${cy - 2} q 12 2 8 12 q -4 2 -8 -2 Z` : `M ${cx - 6} ${cy + 6} q 6 -6 12 0 q -1 6 -6 8 q -5 -2 -6 -8 Z`} fill={c.beak} stroke={c.beakShade} strokeWidth={1} />
              <Path d={side ? `M ${cx + 12} ${cy + 6 + open} q 8 2 8 6 q -6 0 -8 -4 Z` : `M ${cx - 5} ${cy + 12 + open} q 5 4 10 0 q -3 4 -5 4 q -3 -1 -5 -4 Z`} fill={c.beakShade} />
              {sleeping ? (
                <Path d={side ? `M ${cx + 2} ${cy - 2} q 4 3 8 0` : `M ${cx - 12} ${cy - 2} q 4 3 8 0 M ${cx + 4} ${cy - 2} q 4 3 8 0`} stroke={c.headShade} strokeWidth={2} fill="none" strokeLinecap="round" />
              ) : (
                <Eyes cx={side ? cx + 6 : cx} cy={cy - 2} gap={side ? 0 : 8} eye={side ? 4.5 : 4} iris="#2B1D14" expression={expression === 'wink' ? 'wink' : expression} t={t} mouthDy={0} lineColour="#FFFFFF" look={side ? 1 : 0} />
              )}
              <Path d={`M ${cx + (side ? 10 : -14)} ${cy + 2} q ${side ? 6 : 14} 8 ${side ? 2 : 28} 0`} stroke={c.beak} strokeWidth={1.4} fill="none" opacity={0.6} />
            </G>
          )}
        </G>
      </G>
      {pose === 'sleep' && <SleepZ x={60} y={20} t={t} />}
    </G>
  );
}
