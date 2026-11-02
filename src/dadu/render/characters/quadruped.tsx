// Shared quadruped builder for Buddy, Gauri and Nandu: body, four legs with a
// walk cycle, a wagging/swishing tail and a per-species head. Box 140 × 100,
// feet on y = 100, drawn facing right in side view.
import React from 'react';
import { Circle, Ellipse, G, Path, Rect } from 'react-native-svg';
import type { RigProps } from '../types';
import { Face, Shadow, SleepZ, rot } from './parts';
import { anim } from '../clock';

export interface QuadSpec {
  coat: string; coatShade: string; line: string; belly?: string;
  /** Body ellipse radii and leg length. */
  body: { rx: number; ry: number }; legLen: number; legW: number; hoof: string; hoofRound?: boolean;
  headR: number; iris: string; muzzle?: string; nose?: string;
  tail: 'curl' | 'swish' | 'short';
  patches?: { cx: number; cy: number; rx: number; ry: number; fill: string }[];
  horns?: boolean; ears: 'floppy' | 'cow'; collar?: string; bell?: boolean; tuft?: boolean; tongue?: string;
}

function Leg({ x, y, len, w, swing, hoof, round, coat, line }: { x: number; y: number; len: number; w: number; swing: number; hoof: string; round?: boolean; coat: string; line: string }) {
  return (
    <G transform={rot(swing, x, y)}>
      <Rect x={x - w / 2} y={y} width={w} height={len} rx={w / 2} fill={coat} stroke={line} strokeWidth={1} />
      {round ? <Ellipse cx={x} cy={y + len} rx={w * 0.7} ry={w * 0.4} fill={hoof} /> : <Rect x={x - w / 2 - 1} y={y + len - 5} width={w + 2} height={6} rx={2} fill={hoof} />}
    </G>
  );
}

function Head({ spec, view, expression, t, talking, grazing, tilt }: RigProps & { spec: QuadSpec; grazing: boolean; tilt: number }) {
  const r = spec.headR;
  const side = view === 'side'; const back = view === 'back';
  const cx = side ? 108 : 70; const cy = side ? 44 : 40;
  const ears = spec.ears === 'floppy' ? (
    back ? (
      <G><Ellipse cx={cx - r + 2} cy={cy + 2} rx={7} ry={14} fill={spec.coatShade} stroke={spec.line} strokeWidth={1} transform={rot(15, cx - r + 2, cy - 8)} /><Ellipse cx={cx + r - 2} cy={cy + 2} rx={7} ry={14} fill={spec.coatShade} stroke={spec.line} strokeWidth={1} transform={rot(-15, cx + r - 2, cy - 8)} /></G>
    ) : side ? (
      <Ellipse cx={cx - r + 4} cy={cy + 4} rx={7} ry={15} fill={spec.coatShade} stroke={spec.line} strokeWidth={1} transform={rot(20, cx - r + 4, cy - 8)} />
    ) : (
      <G><Ellipse cx={cx - r + 1} cy={cy + 4} rx={7} ry={15} fill={spec.coatShade} stroke={spec.line} strokeWidth={1} transform={rot(18, cx - r + 1, cy - 8)} /><Ellipse cx={cx + r - 1} cy={cy + 4} rx={7} ry={15} fill={spec.coatShade} stroke={spec.line} strokeWidth={1} transform={rot(-18, cx + r - 1, cy - 8)} /></G>
    )
  ) : (
    side ? (
      <Ellipse cx={cx - r + 6} cy={cy - r * 0.4} rx={9} ry={5} fill={spec.coat} stroke={spec.line} strokeWidth={1} transform={rot(-25, cx - r + 6, cy - r * 0.4)} />
    ) : (
      <G><Ellipse cx={cx - r - 2} cy={cy - r * 0.35} rx={10} ry={5.5} fill={spec.coat} stroke={spec.line} strokeWidth={1} transform={rot(-20, cx - r - 2, cy - r * 0.35)} /><Ellipse cx={cx + r + 2} cy={cy - r * 0.35} rx={10} ry={5.5} fill={spec.coat} stroke={spec.line} strokeWidth={1} transform={rot(20, cx + r + 2, cy - r * 0.35)} /></G>
    )
  );
  const horns = spec.horns && (
    side ? (
      <Path d={`M ${cx - 2} ${cy - r + 4} q -2 -16 10 -18 q -4 8 -2 16 Z`} fill="#E9D9C0" stroke="#C9B698" strokeWidth={1} />
    ) : (
      <G>
        <Path d={`M ${cx - r * 0.55} ${cy - r + 6} q -12 -8 -8 -20 q 8 6 12 18 Z`} fill="#E9D9C0" stroke="#C9B698" strokeWidth={1} />
        <Path d={`M ${cx + r * 0.55} ${cy - r + 6} q 12 -8 8 -20 q -8 6 -12 18 Z`} fill="#E9D9C0" stroke="#C9B698" strokeWidth={1} />
      </G>
    )
  );
  return (
    <G transform={rot(grazing ? (side ? 40 : 10) : tilt, side ? cx - r : cx, cy + r)}>
      {horns}
      {ears}
      <Circle cx={cx} cy={cy} r={r} fill={spec.coat} stroke={spec.line} strokeWidth={1.3} />
      {spec.patches?.filter((p) => p.cy < 60 && !back).map((p, i) => <Ellipse key={i} cx={p.cx + (side ? 40 : 0)} cy={p.cy} rx={p.rx} ry={p.ry} fill={p.fill} />)}
      {spec.tuft && !back && <Path d={`M ${cx - 6} ${cy - r + 2} q 2 -12 8 -10 q -2 4 0 8 q 4 -8 10 -4 q -6 2 -6 6 Z`} fill={spec.coatShade} />}
      {!back && (
        <G>
          {spec.muzzle && <Ellipse cx={side ? cx + r * 0.55 : cx} cy={cy + r * 0.55} rx={side ? r * 0.55 : r * 0.62} ry={r * 0.42} fill={spec.muzzle} stroke={spec.line} strokeWidth={1} />}
          {spec.nose && <Ellipse cx={side ? cx + r * 0.85 : cx} cy={cy + r * 0.4} rx={r * 0.18} ry={r * 0.14} fill={spec.nose} />}
          {!spec.nose && <G><Ellipse cx={(side ? cx + r * 0.55 : cx) - r * 0.2} cy={cy + r * 0.55} rx={r * 0.07} ry={r * 0.11} fill={spec.line} /><Ellipse cx={(side ? cx + r * 0.55 : cx) + r * 0.2} cy={cy + r * 0.55} rx={r * 0.07} ry={r * 0.11} fill={spec.line} /></G>}
          {spec.tongue && (expression === 'happy' || expression === 'laugh') && <Ellipse cx={side ? cx + r * 0.6 : cx} cy={cy + r * 0.9} rx={r * 0.14} ry={r * 0.22} fill={spec.tongue} />}
          <Face cx={side ? cx + r * 0.3 : cx} cy={cy - r * 0.1} gap={side ? 0 : r * 0.42} eye={r * 0.2} iris={spec.iris} expression={expression} t={t} talking={talking} mouthDy={r * 0.78} lineColour={spec.line} browColour={spec.coatShade} cheek={false} look={side ? 1.5 : 0} />
        </G>
      )}
      {spec.collar && (
        <G transform={`translate(0 ${r + 2})`}>
          <Path d={side ? `M ${cx - r * 0.9} ${cy - 4} q ${r * 0.9} 8 ${r * 1.8} 0` : `M ${cx - r * 0.95} ${cy - 6} q ${r * 0.95} 10 ${r * 1.9} 0`} stroke={spec.collar} strokeWidth={5} fill="none" strokeLinecap="round" />
          {spec.bell && <G><Path d={`M ${cx - 4} ${cy + 4} q 4 -6 8 0 l 1 6 h -10 Z`} fill="#FFC94D" stroke="#B8780F" strokeWidth={1} /><Circle cx={cx} cy={cy + 10} r={1.4} fill="#B8780F" /></G>}
          {!spec.bell && <Circle cx={cx} cy={cy + 2} r={3} fill="#FFC94D" stroke="#B8780F" strokeWidth={1} />}
        </G>
      )}
    </G>
  );
}

export function QuadrupedRig(p: RigProps & { spec: QuadSpec }) {
  const { spec, view, pose, t } = p;
  const side = view === 'side'; const back = view === 'back';
  const s = anim.swing(t, pose === 'run' ? 14 : 8);
  const moving = pose === 'walk' || pose === 'run';
  const amp = pose === 'run' ? 32 : pose === 'walk' ? 20 : 0;
  const lying = pose === 'sleep' || pose === 'sit';
  const wag = pose === 'sleep' ? 0 : anim.swing(t, pose === 'wave' || pose === 'happy' as string ? 12 : 5) * (spec.tail === 'curl' ? 18 : 8);
  const bob = moving ? anim.bob(t) * (pose === 'run' ? 4 : 2) : anim.breathe(t) * 0.8;
  const { rx, ry } = spec.body;
  const bodyCx = side ? 62 : 70; const bodyCy = 100 - spec.legLen - ry + (lying ? spec.legLen * 0.75 : 0);
  const legY = bodyCy + ry * 0.6;
  const grazing = pose === 'graze';
  const tilt = pose === 'think' ? 12 : pose === 'wave' ? -6 : 0;
  const legs = lying ? (
    side ? <Ellipse cx={bodyCx + rx * 0.7} cy={100 - 6} rx={rx * 0.3} ry={6} fill={spec.coat} stroke={spec.line} strokeWidth={1} /> : null
  ) : side ? (
    <G>
      <Leg x={bodyCx - rx * 0.55 + 6} y={legY} len={spec.legLen + ry * 0.4} w={spec.legW} swing={-s * amp} hoof={spec.hoof} round={spec.hoofRound} coat={spec.coatShade} line={spec.line} />
      <Leg x={bodyCx + rx * 0.55 + 4} y={legY} len={spec.legLen + ry * 0.4} w={spec.legW} swing={s * amp * 0.8} hoof={spec.hoof} round={spec.hoofRound} coat={spec.coatShade} line={spec.line} />
      <Leg x={bodyCx - rx * 0.55 - 4} y={legY} len={spec.legLen + ry * 0.4} w={spec.legW} swing={s * amp} hoof={spec.hoof} round={spec.hoofRound} coat={spec.coat} line={spec.line} />
      <Leg x={bodyCx + rx * 0.55 - 6} y={legY} len={spec.legLen + ry * 0.4} w={spec.legW} swing={pose === 'wave' ? -70 : -s * amp * 0.8} hoof={spec.hoof} round={spec.hoofRound} coat={spec.coat} line={spec.line} />
    </G>
  ) : (
    <G>
      <Leg x={bodyCx - rx * 0.45} y={legY} len={spec.legLen + ry * 0.4 - Math.max(0, s) * 2} w={spec.legW} swing={0} hoof={spec.hoof} round={spec.hoofRound} coat={spec.coat} line={spec.line} />
      <Leg x={bodyCx + rx * 0.45} y={legY} len={spec.legLen + ry * 0.4 - Math.max(0, -s) * 2} w={spec.legW} swing={pose === 'wave' && !back ? -60 : 0} hoof={spec.hoof} round={spec.hoofRound} coat={spec.coat} line={spec.line} />
    </G>
  );
  const tail = spec.tail === 'curl' ? (
    <Path d={side ? `M ${bodyCx - rx + 4} ${bodyCy - ry * 0.3} q -14 -18 -4 -30` : back ? `M ${bodyCx} ${bodyCy - ry * 0.4} q 6 -20 -4 -30` : `M ${bodyCx + rx * 0.6} ${bodyCy - ry * 0.6} q 8 -14 2 -22`} stroke={spec.coatShade} strokeWidth={7} fill="none" strokeLinecap="round" transform={rot(wag, side ? bodyCx - rx + 4 : bodyCx, bodyCy)} />
  ) : spec.tail === 'swish' ? (
    <G transform={rot(wag, side ? bodyCx - rx + 2 : bodyCx, bodyCy - ry)}>
      <Path d={side ? `M ${bodyCx - rx + 2} ${bodyCy - ry * 0.5} q -10 20 -4 40` : back ? `M ${bodyCx} ${bodyCy - ry * 0.3} q 2 22 0 42` : `M ${bodyCx + rx * 0.9} ${bodyCy - ry * 0.2} q 6 16 2 30`} stroke={spec.coat} strokeWidth={5} fill="none" strokeLinecap="round" />
      <Ellipse cx={side ? bodyCx - rx - 2 : back ? bodyCx : bodyCx + rx * 0.9 + 2} cy={bodyCy + ry * 0.9 + 10} rx={4} ry={7} fill={spec.coatShade} />
    </G>
  ) : null;
  return (
    <G>
      <Shadow cx={70} cy={97} rx={side ? rx + 10 : rx} />
      <G transform={`translate(0 ${-bob})`}>
        {(back || !side) && tail}
        {legs}
        {side && tail}
        <Ellipse cx={bodyCx} cy={bodyCy} rx={side ? rx : rx * 0.75} ry={lying ? ry * 0.8 : ry} fill={spec.coat} stroke={spec.line} strokeWidth={1.3} />
        {spec.belly && !back && <Ellipse cx={bodyCx + (side ? 6 : 0)} cy={bodyCy + ry * 0.45} rx={side ? rx * 0.6 : rx * 0.45} ry={ry * 0.45} fill={spec.belly} />}
        {spec.patches?.filter((pt) => pt.cy >= 60).map((pt, i) => <Ellipse key={i} cx={pt.cx + (side ? -8 : 0)} cy={pt.cy + (lying ? 8 : 0)} rx={pt.rx} ry={pt.ry} fill={pt.fill} />)}
        <Head {...p} grazing={grazing} tilt={tilt} />
      </G>
      {pose === 'sleep' && <SleepZ x={side ? 118 : 96} y={18} t={t} />}
    </G>
  );
}

export const QUAD_BOX = { w: 140, h: 100 };
