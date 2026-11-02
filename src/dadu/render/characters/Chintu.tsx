// Chintu: 5–7 years old, messy black hair with a cowlick, large brown eyes,
// yellow T-shirt, blue shorts, colourful sneakers. Local box 100 × 100.
import React from 'react';
import { Circle, Ellipse, G, Path, Rect } from 'react-native-svg';
import type { RigProps } from '../types';
import { characterColours, skin } from '../palette';
import { Face, Shadow, SleepZ, limbAngles, rot } from './parts';
import { anim } from '../clock';

export const CHINTU_BOX = { w: 100, h: 100 };
const c = characterColours.chintu;
const s = skin.chintu;

function Sneaker({ x, y, colour, side }: { x: number; y: number; colour: string; side: -1 | 1 }) {
  return (
    <G>
      <Path d={`M ${x - 8} ${y} q 0 -7 7 -7 h 6 q 7 1 7 7 Z`} fill={colour} />
      <Rect x={x - 8} y={y - 1} width={16} height={4} rx={2} fill={c.sole} stroke="#D9CFC0" strokeWidth={0.8} />
      <Path d={`M ${x - 2 * side} ${y - 5} h ${5 * side}`} stroke="#FFFFFF" strokeWidth={1.4} />
    </G>
  );
}

function Arm({ px, py, lift, side }: { px: number; py: number; lift: number; side: -1 | 1 }) {
  return (
    <G transform={rot(-side * lift, px, py)}>
      <Rect x={px - 5} y={py - 2} width={10} height={9} rx={3} fill={c.tee} stroke={c.teeShade} strokeWidth={1} />
      <Rect x={px - 4} y={py + 5} width={8} height={20} rx={4} fill={s.base} stroke={s.line} strokeWidth={1} />
      <Circle cx={px} cy={py + 26} r={5} fill={s.base} stroke={s.line} strokeWidth={1} />
    </G>
  );
}

function Leg({ px, py, swing, colour, side, view }: { px: number; py: number; swing: number; colour: string; side: -1 | 1; view: RigProps['view'] }) {
  const deg = view === 'side' ? swing : 0;
  const lift = view === 'side' ? 0 : Math.max(0, -swing) * 0.08;
  return (
    <G transform={`${rot(deg, px, py)} translate(0 ${-lift})`}>
      <Rect x={px - 5} y={py} width={10} height={16} rx={4} fill={s.base} stroke={s.line} strokeWidth={1} />
      <Sneaker x={px} y={py + 20} colour={colour} side={side} />
    </G>
  );
}

function Head({ view, expression, t, talking, tilt }: RigProps & { tilt: number }) {
  const cx = 50; const cy = 30;
  const side = view === 'side'; const back = view === 'back';
  const tq = view === 'threeQuarter' ? 3 : 0;
  const hairFront = `M ${cx - 27 + tq} ${cy - 2} q 2 -30 27 -30 q 26 0 27 30 q -6 -10 -14 -12 q -4 -8 -12 -4 q -6 -8 -14 2 q -10 -2 -14 14 Z`;
  return (
    <G transform={rot(tilt, cx, 56)}>
      <Rect x={45} y={50} width={10} height={8} fill={s.shade} />
      <Ellipse cx={cx + tq} cy={cy} rx={27} ry={26} fill={s.base} stroke={s.line} strokeWidth={1.3} />
      {!side && <Ellipse cx={cx - 26} cy={cy + 4} rx={4.5} ry={5.5} fill={s.base} stroke={s.line} strokeWidth={1} />}
      <Ellipse cx={cx + 26} cy={cy + 4} rx={4.5} ry={5.5} fill={s.base} stroke={s.line} strokeWidth={1} />
      {back ? (
        <Path d={`M ${cx - 27} ${cy + 2} q 0 -32 27 -32 q 27 0 27 32 q -4 12 -12 12 q -4 -8 -8 0 q -7 -6 -14 0 q -4 -8 -8 0 q -10 0 -10 -12 Z`} fill={c.hair} stroke={c.hairShade} strokeWidth={1} />
      ) : side ? (
        <Path d={`M ${cx - 27} ${cy + 4} q -2 -34 24 -32 q 22 0 28 20 q -8 -6 -14 -2 q -4 -8 -10 -2 q -8 -8 -14 2 q -8 4 -14 14 Z`} fill={c.hair} stroke={c.hairShade} strokeWidth={1} />
      ) : (
        <Path d={hairFront} fill={c.hair} stroke={c.hairShade} strokeWidth={1} />
      )}
      {/* cowlick */}
      <Path d={side ? `M ${cx + 2} ${cy - 27} q 4 -10 12 -8 q -6 2 -6 10 Z` : `M ${cx + 6 + tq} ${cy - 27} q 6 -12 14 -8 q -8 2 -8 10 Z`} fill={c.hair} stroke={c.hairShade} strokeWidth={1} />
      {!back && (side ? (
        <G>
          <Path d={`M ${cx + 25} ${cy + 6} q 6 4 1 8`} stroke={s.line} strokeWidth={1.5} fill="none" strokeLinecap="round" />
          <Face cx={cx + 14} cy={cy + 4} gap={0} eye={7.5} iris="#5A3A1E" expression={expression} t={t} talking={talking} mouthDy={17} lineColour={s.line} browColour={c.hair} cheek={false} look={2} />
        </G>
      ) : (
        <G>
          <Face cx={cx + tq} cy={cy + 4} gap={12} eye={7.5} iris="#5A3A1E" expression={expression} t={t} talking={talking} mouthDy={17} lineColour={s.line} browColour={c.hair} look={tq * 0.6} />
          <Path d={`M ${cx + tq} ${cy + 9} q -3 5 1 7`} stroke={s.line} strokeWidth={1.4} fill="none" strokeLinecap="round" />
        </G>
      ))}
    </G>
  );
}

export function ChintuRig(p: RigProps) {
  const { view, pose, t } = p;
  const L = limbAngles(pose, t);
  const breathe = anim.breathe(t) * 0.7;
  const sitting = pose === 'sit' || pose === 'sleep';
  const side = view === 'side'; const back = view === 'back';
  const bodyY = (sitting ? 14 : 0) - L.bob;
  return (
    <G>
      <Shadow cx={50} cy={97} rx={sitting ? 26 : 20} />
      <G transform={`translate(0 ${bodyY}) ${rot(L.lean, 50, 95)}`}>
        {sitting ? (
          <G>
            <Rect x={34} y={70} width={32} height={12} rx={5} fill={c.shorts} stroke={c.shortsShade} strokeWidth={1} />
            <Rect x={30} y={76} width={14} height={9} rx={4} fill={s.base} stroke={s.line} strokeWidth={1} />
            <Rect x={56} y={76} width={14} height={9} rx={4} fill={s.base} stroke={s.line} strokeWidth={1} />
            <Sneaker x={32} y={90} colour={c.shoeL} side={-1} />
            <Sneaker x={68} y={90} colour={c.shoeR} side={1} />
          </G>
        ) : (
          <G>
            {side ? (
              <G>
                <Leg px={46} py={76} swing={L.legL} colour={c.shoeL} side={1} view={view} />
                <Leg px={54} py={76} swing={L.legR} colour={c.shoeR} side={1} view={view} />
                <Rect x={38} y={66} width={24} height={14} rx={5} fill={c.shorts} stroke={c.shortsShade} strokeWidth={1} />
              </G>
            ) : (
              <G>
                <Leg px={41} py={76} swing={L.legL} colour={c.shoeL} side={-1} view={view} />
                <Leg px={59} py={76} swing={L.legR} colour={c.shoeR} side={1} view={view} />
                <Path d="M 34 66 h 32 v 12 q -4 2 -8 1 l -2 -6 l -2 6 q -8 1 -8 -1 Z" fill={c.shorts} stroke={c.shortsShade} strokeWidth={1} />
              </G>
            )}
          </G>
        )}
        {side && <Arm px={47} py={58} lift={L.armL} side={-1} />}
        <G transform={`translate(0 ${breathe * 0.4})`}>
          <Path d={side ? 'M 38 56 q 0 -3 4 -3 h 16 q 4 0 4 3 l 1 16 h -26 Z' : 'M 33 56 q 0 -4 5 -4 h 24 q 5 0 5 4 l 2 16 h -38 Z'} fill={c.tee} stroke={c.teeShade} strokeWidth={1.2} />
          {!back && !side && (
            <G>
              <Ellipse cx={50} cy={64} rx={4} ry={5} fill="#F4A523" transform={rot(-20, 50, 64)} />
              <Path d="M 52 59 q 3 -4 6 -2 q -3 1 -5 3 Z" fill="#4E9F3D" />
            </G>
          )}
        </G>
        {side ? <Arm px={53} py={58} lift={L.armR} side={1} /> : (
          <G>
            <Arm px={34} py={58} lift={back ? L.armR : L.armL} side={-1} />
            <Arm px={66} py={58} lift={back ? L.armL : L.armR} side={1} />
          </G>
        )}
        <G transform={`translate(0 ${breathe * 0.6})`}>
          <Head {...p} tilt={L.headTilt} />
        </G>
      </G>
      {pose === 'sleep' && <SleepZ x={78} y={22} t={t} />}
    </G>
  );
}
