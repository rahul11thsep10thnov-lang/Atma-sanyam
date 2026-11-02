// Dadaji: bald crown, white side hair, thick curved white moustache, large
// rectangular tinted spectacles, forehead wrinkles, cream kurta, white dhoti,
// green sandals. Local box 100 × 130, feet on y = 130.
import React from 'react';
import { Circle, Ellipse, G, Path, Rect } from 'react-native-svg';
import type { RigProps } from '../types';
import { characterColours, skin } from '../palette';
import { Face, Shadow, SleepZ, limbAngles, rot } from './parts';
import { anim } from '../clock';

export const DADAJI_BOX = { w: 100, h: 130 };
const c = characterColours.dadaji;
const s = skin.dadaji;

function Sandal({ x, y, side }: { x: number; y: number; side: -1 | 1 }) {
  return (
    <G>
      <Ellipse cx={x} cy={y} rx={9} ry={4} fill={c.sandal} stroke={c.sandalShade} strokeWidth={1.2} />
      <Path d={`M ${x - 4 * side} ${y - 2} q ${4 * side} -5 ${8 * side} 0`} stroke={c.sandalShade} strokeWidth={1.6} fill="none" />
      <Ellipse cx={x + 1 * side} cy={y - 2} rx={5} ry={2.5} fill={s.base} />
    </G>
  );
}

function Arm({ pivotX, pivotY, lift, side, hand }: { pivotX: number; pivotY: number; lift: number; side: -1 | 1; hand: 'open' | 'point' | 'fist' }) {
  const deg = -side * lift;
  return (
    <G transform={rot(deg, pivotX, pivotY)}>
      <Path d={`M ${pivotX - 6} ${pivotY} h 12 v 30 q 0 5 -6 5 q -6 0 -6 -5 Z`} fill={c.kurta} stroke={c.kurtaLine} strokeWidth={1.2} />
      <Rect x={pivotX - 6.5} y={pivotY + 28} width={13} height={4} rx={2} fill={c.kurtaShade} />
      <Circle cx={pivotX} cy={pivotY + 38} r={6} fill={s.base} stroke={s.line} strokeWidth={1} />
      {hand === 'point' && <Rect x={pivotX - 2} y={pivotY + 38} width={4} height={10} rx={2} fill={s.base} stroke={s.line} strokeWidth={0.8} />}
    </G>
  );
}

function Head({ view, expression, t, talking, tilt }: RigProps & { tilt: number }) {
  const cx = 50; const cy = 32;
  const side = view === 'side';
  const back = view === 'back';
  const tq = view === 'threeQuarter' ? 3 : 0;
  return (
    <G transform={rot(tilt, cx, 58)}>
      {/* neck */}
      <Rect x={44} y={52} width={12} height={10} fill={s.shade} />
      {/* head */}
      <Ellipse cx={cx + tq} cy={cy} rx={26} ry={28} fill={s.base} stroke={s.line} strokeWidth={1.3} />
      {/* ears */}
      {!side && <Ellipse cx={cx - 25 + tq * 0.4} cy={cy + 4} rx={4.5} ry={6} fill={s.base} stroke={s.line} strokeWidth={1} />}
      <Ellipse cx={cx + 25 + tq * 0.4} cy={cy + 4} rx={4.5} ry={6} fill={s.base} stroke={s.line} strokeWidth={1} />
      {/* white side and back hair; the crown stays bald */}
      {back ? (
        <Path d={`M ${cx - 25} ${cy - 2} q 0 24 25 26 q 25 -2 25 -26 q -6 10 -25 10 q -19 0 -25 -10 Z`} fill={c.hair} stroke={c.hairShade} strokeWidth={1} />
      ) : side ? (
        <Path d={`M ${cx - 25} ${cy - 2} q -4 16 2 26 q 8 2 14 -2 q -10 -8 -8 -24 Z`} fill={c.hair} stroke={c.hairShade} strokeWidth={1} />
      ) : (
        <G>
          <Path d={`M ${cx - 25 + tq} ${cy - 4} q -4 14 1 24 q 6 2 9 -2 q -6 -8 -6 -22 Z`} fill={c.hair} stroke={c.hairShade} strokeWidth={1} />
          <Path d={`M ${cx + 25 + tq} ${cy - 4} q 4 14 -1 24 q -6 2 -9 -2 q 6 -8 6 -22 Z`} fill={c.hair} stroke={c.hairShade} strokeWidth={1} />
        </G>
      )}
      {!back && (
        <G>
          {/* forehead wrinkles */}
          <Path d={`M ${cx - 10 + tq} 13 q 10 -3 20 0 M ${cx - 8 + tq} 17 q 8 -2 16 0`} stroke={s.line} strokeWidth={1} fill="none" opacity={0.6} />
          {side ? (
            <G>
              {/* profile nose and single eye */}
              <Path d={`M ${cx + 24} ${cy + 8} q 8 4 2 10`} stroke={s.line} strokeWidth={1.6} fill="none" strokeLinecap="round" />
              <Face cx={cx + 14} cy={cy + 2} gap={0} eye={7} iris="#5A4634" expression={expression} t={t} talking={talking} mouthDy={24} lineColour={s.line} browColour="#DDD8D0" cheek={false} look={2} />
              <Rect x={cx + 3} y={cy - 8} width={22} height={19} rx={4} fill={c.lens} fillOpacity={0.18} stroke={c.specs} strokeWidth={2} />
              <Path d={`M ${cx + 5} ${cy - 2} L ${cx - 20} ${cy + 2}`} stroke={c.specs} strokeWidth={1.6} />
              <Path d={`M ${cx + 6} ${cy + 20} q 12 -6 20 2 q -4 7 -12 5 q -8 -1 -8 -7 Z`} fill={c.hair} stroke={c.hairShade} strokeWidth={1} />
            </G>
          ) : (
            <G>
              <Face cx={cx + tq} cy={cy + 2} gap={12} eye={7} iris="#5A4634" expression={expression} t={t} talking={talking} mouthDy={25} lineColour={s.line} browColour="#DDD8D0" look={tq * 0.6} />
              {/* nose */}
              <Path d={`M ${cx + tq} ${cy + 9} q -4 7 2 9`} stroke={s.line} strokeWidth={1.6} fill="none" strokeLinecap="round" />
              {/* rectangular tinted spectacles */}
              <Rect x={cx - 23 + tq} y={cy - 8} width={21} height={19} rx={4} fill={c.lens} fillOpacity={0.18} stroke={c.specs} strokeWidth={2} />
              <Rect x={cx + 2 + tq} y={cy - 8} width={21} height={19} rx={4} fill={c.lens} fillOpacity={0.18} stroke={c.specs} strokeWidth={2} />
              <Path d={`M ${cx - 2 + tq} ${cy - 1} h 4 M ${cx - 23 + tq} ${cy - 2} L ${cx - 27 + tq * 0.4} ${cy + 1} M ${cx + 23 + tq} ${cy - 2} L ${cx + 27 + tq * 0.4} ${cy + 1}`} stroke={c.specs} strokeWidth={1.8} />
              {/* thick curved moustache */}
              <Path d={`M ${cx - 20 + tq} ${cy + 20} q 8 -10 20 -4 q 12 -6 20 4 q -3 8 -11 7 q -6 -1 -9 -3 q -3 2 -9 3 q -8 1 -11 -7 Z`} fill={c.hair} stroke={c.hairShade} strokeWidth={1.2} />
            </G>
          )}
        </G>
      )}
    </G>
  );
}

export function DadajiRig(p: RigProps) {
  const { view, pose, t } = p;
  const L = limbAngles(pose, t);
  const breathe = anim.breathe(t) * 0.8;
  const sitting = pose === 'sit' || pose === 'sleep';
  const back = view === 'back';
  const side = view === 'side';
  const bodyY = (sitting ? 18 : 0) - L.bob;
  const handR = pose === 'teach' ? 'point' : 'open';
  return (
    <G>
      <Shadow cx={50} cy={127} rx={sitting ? 30 : 24} />
      <G transform={`translate(0 ${bodyY}) ${rot(L.lean, 50, 120)}`}>
        {/* legs / dhoti */}
        {sitting ? (
          <G>
            <Path d="M 30 100 q 20 -4 40 0 l 6 16 q -26 6 -52 0 Z" fill={c.dhoti} stroke={c.dhotiShade} strokeWidth={1.2} />
            <Sandal x={38} y={112} side={-1} />
            <Sandal x={62} y={112} side={1} />
          </G>
        ) : (
          <G>
            {side ? (
              <G>
                <G transform={rot(L.legL * 0.6, 50, 100)}><Sandal x={56} y={126} side={1} /></G>
                <G transform={rot(L.legR * 0.6, 50, 100)}><Sandal x={48} y={126} side={1} /></G>
                <Path d="M 36 96 L 34 122 q 16 4 32 0 L 64 96 Z" fill={c.dhoti} stroke={c.dhotiShade} strokeWidth={1.2} />
                <Path d="M 50 98 L 49 120" stroke={c.dhotiShade} strokeWidth={1} />
              </G>
            ) : (
              <G>
                <G transform={`translate(0 ${-Math.max(0, L.legL) * 0.12})`}><Sandal x={38} y={126} side={-1} /></G>
                <G transform={`translate(0 ${-Math.max(0, L.legR) * 0.12})`}><Sandal x={62} y={126} side={1} /></G>
                <Path d="M 34 96 L 32 122 q 18 5 36 0 L 66 96 Z" fill={c.dhoti} stroke={c.dhotiShade} strokeWidth={1.2} />
                <Path d="M 44 100 L 43 120 M 56 100 L 57 120 M 50 100 L 50 121" stroke={c.dhotiShade} strokeWidth={1} />
              </G>
            )}
          </G>
        )}
        {/* back arm (side view) */}
        {side && <Arm pivotX={46} pivotY={64} lift={L.armL} side={-1} hand="open" />}
        {/* kurta */}
        <G transform={`translate(0 ${breathe * 0.4})`}>
          <Path d={side ? 'M 36 60 q 0 -4 6 -4 h 16 q 6 0 6 4 l 2 46 h -32 Z' : 'M 28 60 q 0 -5 7 -5 h 30 q 7 0 7 5 l 3 46 h -50 Z'} fill={c.kurta} stroke={c.kurtaLine} strokeWidth={1.3} />
          {!back && !side && (
            <G>
              <Path d="M 44 55 L 50 70 L 56 55" fill="none" stroke={c.kurtaLine} strokeWidth={1.4} strokeLinejoin="round" />
              <Path d="M 50 70 V 92" stroke={c.kurtaShade} strokeWidth={1.2} />
              <Circle cx={50} cy={76} r={1.3} fill={c.kurtaLine} />
              <Circle cx={50} cy={84} r={1.3} fill={c.kurtaLine} />
              <Path d="M 36 96 q 14 4 28 0" stroke={c.kurtaShade} strokeWidth={1} fill="none" />
            </G>
          )}
          {back && <Path d="M 50 58 V 100" stroke={c.kurtaShade} strokeWidth={1} />}
        </G>
        {/* arms */}
        {side ? (
          <Arm pivotX={54} pivotY={64} lift={L.armR} side={1} hand={handR} />
        ) : (
          <G>
            <Arm pivotX={30} pivotY={64} lift={back ? L.armR : L.armL} side={-1} hand="open" />
            <Arm pivotX={70} pivotY={64} lift={back ? L.armL : L.armR} side={1} hand={back ? 'open' : handR} />
          </G>
        )}
        <G transform={`translate(0 ${breathe * 0.6})`}>
          <Head {...p} tilt={L.headTilt} />
        </G>
      </G>
      {pose === 'sleep' && <SleepZ x={76} y={30} t={t} />}
    </G>
  );
}
