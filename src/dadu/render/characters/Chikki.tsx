// Chikki: white rabbit, pink inner ears, soft rounded proportions, a small
// green scarf (her v2 maths-helper prop). Box 100 × 100, feet on y = 100.
import React from 'react';
import { Circle, Ellipse, G, Path, Rect } from 'react-native-svg';
import type { RigProps } from '../types';
import { characterColours } from '../palette';
import { Face, Shadow, SleepZ, limbAngles, rot } from './parts';
import { anim } from '../clock';

export const CHIKKI_BOX = { w: 100, h: 100 };
const c = characterColours.chikki;

function Ear({ x, y, tilt, t, inner }: { x: number; y: number; tilt: number; t: number; inner: boolean }) {
  const twitch = anim.swing(t, 3) * 3;
  return (
    <G transform={rot(tilt + twitch, x, y)}>
      <Ellipse cx={x} cy={y - 20} rx={8} ry={22} fill={c.fur} stroke={c.line} strokeWidth={1.2} />
      {inner && <Ellipse cx={x} cy={y - 19} rx={4} ry={16} fill={c.innerEar} />}
    </G>
  );
}

export function ChikkiRig(p: RigProps) {
  const { view, pose, expression, t, talking } = p;
  const L = limbAngles(pose, t);
  const side = view === 'side'; const back = view === 'back';
  const tq = view === 'threeQuarter' ? 3 : 0;
  const hop = pose === 'walk' || pose === 'run' ? anim.bob(t) * (pose === 'run' ? 10 : 6) : 0;
  const lying = pose === 'sleep';
  const cx = side ? 54 : 50 + tq; const cy = lying ? 60 : 48;
  const tilt = pose === 'think' ? 10 : pose === 'sleep' ? 20 : 0;
  return (
    <G>
      <Shadow cx={50} cy={97} rx={22} />
      <G transform={`translate(0 ${-hop})`}>
        {/* ears */}
        {side ? <G><Ear x={cx - 6} y={cy - 14} tilt={-25} t={t} inner={false} /><Ear x={cx + 2} y={cy - 14} tilt={-12} t={t} inner={true} /></G>
          : <G><Ear x={cx - 11} y={cy - 16} tilt={-18} t={t} inner={!back} /><Ear x={cx + 11} y={cy - 16} tilt={18 - (pose === 'think' ? 30 : 0)} t={t} inner={!back} /></G>}
        {/* body */}
        <Ellipse cx={50 + tq} cy={lying ? 84 : 78} rx={lying ? 30 : 22} ry={lying ? 14 : 20} fill={c.fur} stroke={c.line} strokeWidth={1.2} />
        {!back && <Ellipse cx={50 + tq} cy={lying ? 86 : 82} rx={12} ry={lying ? 8 : 13} fill="#FFF8EE" />}
        {/* feet */}
        {!lying && <G><Ellipse cx={38 + tq} cy={96} rx={11} ry={5} fill={c.fur} stroke={c.line} strokeWidth={1} transform={`translate(0 ${-Math.max(0, L.legL) * 0.05})`} /><Ellipse cx={62 + tq} cy={96} rx={11} ry={5} fill={c.fur} stroke={c.line} strokeWidth={1} transform={`translate(0 ${-Math.max(0, L.legR) * 0.05})`} /></G>}
        {/* arms / paws */}
        {!back && !lying && (
          <G>
            <G transform={rot(L.armL, 33 + tq, 66)}><Ellipse cx={30 + tq} cy={74} rx={5} ry={10} fill={c.fur} stroke={c.line} strokeWidth={1} /></G>
            <G transform={rot(-L.armR, 67 + tq, 66)}><Ellipse cx={70 + tq} cy={74} rx={5} ry={10} fill={c.fur} stroke={c.line} strokeWidth={1} /></G>
          </G>
        )}
        {/* scarf */}
        {!lying && <Path d={side ? `M ${cx - 16} 60 q 16 10 30 0 l 2 6 q -16 8 -34 0 Z` : `M ${28 + tq} 60 q 22 10 44 0 l 2 6 q -22 8 -48 0 Z`} fill={c.scarf} stroke="#35702A" strokeWidth={1} />}
        {/* head */}
        <G transform={rot(tilt, cx, cy + 20)}>
          <Circle cx={cx} cy={cy} r={24} fill={c.fur} stroke={c.line} strokeWidth={1.3} />
          {!back && (side ? (
            <G>
              <Ellipse cx={cx + 16} cy={cy + 8} rx={9} ry={6} fill="#FFF8EE" stroke={c.line} strokeWidth={0.8} />
              <Ellipse cx={cx + 22} cy={cy + 5} rx={3} ry={2.2} fill={c.nose} />
              <Face cx={cx + 8} cy={cy - 2} gap={0} eye={6.5} iris="#5A3A3E" expression={expression} t={t} talking={talking} mouthDy={13} lineColour={c.line} browColour="#D9D2CC" cheek={false} look={2} mouthColour="#C9788B" />
            </G>
          ) : (
            <G>
              <Ellipse cx={cx} cy={cy + 10} rx={10} ry={6} fill="#FFF8EE" stroke={c.line} strokeWidth={0.8} />
              <Ellipse cx={cx} cy={cy + 6} rx={3.2} ry={2.4} fill={c.nose} />
              <Path d={`M ${cx - 14} ${cy + 8} l -10 -2 M ${cx - 14} ${cy + 11} l -10 2 M ${cx + 14} ${cy + 8} l 10 -2 M ${cx + 14} ${cy + 11} l 10 2`} stroke={c.line} strokeWidth={0.9} />
              <Face cx={cx} cy={cy - 2} gap={11} eye={6.5} iris="#5A3A3E" expression={expression} t={t} talking={talking} mouthDy={14} lineColour={c.line} browColour="#D9D2CC" look={tq * 0.6} mouthColour="#C9788B" />
            </G>
          ))}
        </G>
        {/* tail */}
        {(back || side) && <Circle cx={side ? 26 : 50} cy={side ? 80 : 90} r={7} fill="#FFFFFF" stroke={c.line} strokeWidth={1} />}
      </G>
      {pose === 'sleep' && <SleepZ x={80} y={34} t={t} />}
    </G>
  );
}
