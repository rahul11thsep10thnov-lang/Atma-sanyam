// Shared chibi face parts. Every rig composes eyes, brows, mouth and cheeks
// from here so expressions stay consistent across characters.
import React from 'react';
import { Circle, Ellipse, G, Path } from 'react-native-svg';
import type { SpriteExpression } from '../types';
import { anim } from '../clock';

export interface FaceProps {
  /** Face centre and eye spacing in local units. */
  cx: number;
  cy: number;
  gap: number;
  /** Eye size (white ellipse rx, ry). */
  eye: number;
  iris: string;
  expression: SpriteExpression;
  t: number;
  talking?: boolean;
  /** Mouth vertical offset from eye line. */
  mouthDy: number;
  mouthColour?: string;
  browColour?: string;
  cheek?: boolean;
  /** Horizontal offset of the pupil (side view looks sideways). */
  look?: number;
  lineColour: string;
}

export function Eyes({ cx, cy, gap, eye, iris, expression, t, look = 0, lineColour }: FaceProps) {
  const blink = anim.blink(t);
  const closedShape = expression === 'happy' || expression === 'laugh' || expression === 'proud';
  const sleepy = expression === 'sleepy' || expression === 'sad';
  const wide = expression === 'surprised' ? 1.25 : 1;
  const lookUp = expression === 'think' ? -eye * 0.35 : 0;
  const lookX = expression === 'think' ? eye * 0.3 : look;
  const eyes: React.ReactNode[] = [];
  for (const side of [-1, 1]) {
    const ex = cx + side * gap;
    const closed = blink || closedShape || (expression === 'wink' && side === 1) || (expression === 'oops' && side === -1) || expression === 'sleepy' && false;
    if (closed) {
      // happy arc (curved up) or blink (flat)
      const arc = closedShape && !blink
        ? `M ${ex - eye} ${cy + eye * 0.3} Q ${ex} ${cy - eye * 0.9} ${ex + eye} ${cy + eye * 0.3}`
        : `M ${ex - eye} ${cy} Q ${ex} ${cy + eye * 0.35} ${ex + eye} ${cy}`;
      eyes.push(<Path key={`e${side}`} d={arc} stroke={lineColour} strokeWidth={2.2} fill="none" strokeLinecap="round" />);
      continue;
    }
    const ry = eye * 1.25 * wide * (sleepy ? 0.7 : 1);
    eyes.push(
      <G key={`e${side}`}>
        <Ellipse cx={ex} cy={cy} rx={eye * wide} ry={ry} fill="#FFFFFF" stroke={lineColour} strokeWidth={1.2} />
        <Circle cx={ex + lookX} cy={cy + eye * 0.15 + lookUp} r={eye * 0.62} fill={iris} />
        <Circle cx={ex + lookX} cy={cy + eye * 0.2 + lookUp} r={eye * 0.38} fill="#1E1612" />
        <Circle cx={ex + lookX - eye * 0.25} cy={cy - eye * 0.2 + lookUp} r={eye * 0.2} fill="#FFFFFF" />
        <Circle cx={ex + lookX + eye * 0.22} cy={cy + eye * 0.35 + lookUp} r={eye * 0.1} fill="#FFFFFF" />
        {sleepy && <Path d={`M ${ex - eye} ${cy - ry * 0.25} Q ${ex} ${cy - ry * 0.05} ${ex + eye} ${cy - ry * 0.25} L ${ex + eye} ${cy - ry} L ${ex - eye} ${cy - ry} Z`} fill={lineColour} opacity={0.35} />}
      </G>
    );
  }
  return <G>{eyes}</G>;
}

export function Brows({ cx, cy, gap, eye, expression, browColour = '#3A2E2A', lineColour }: FaceProps) {
  const by = cy - eye * 1.9;
  const tilt = expression === 'sad' ? 1 : expression === 'surprised' ? -2 : expression === 'think' ? 1 : expression === 'oops' ? 1.5 : 0;
  const lift = expression === 'surprised' ? -eye * 0.6 : expression === 'think' ? -eye * 0.2 : 0;
  const c = browColour ?? lineColour;
  return (
    <G>
      <Path d={`M ${cx - gap - eye} ${by + lift + (tilt < 0 ? 0 : tilt)} Q ${cx - gap} ${by + lift - eye * 0.5} ${cx - gap + eye} ${by + lift + (tilt > 0 ? tilt : 0)}`} stroke={c} strokeWidth={2.4} fill="none" strokeLinecap="round" />
      <Path d={`M ${cx + gap - eye} ${by + lift + (tilt > 0 ? tilt : 0)} Q ${cx + gap} ${by + lift - eye * 0.5} ${cx + gap + eye} ${by + lift + (tilt < 0 ? 0 : tilt)}`} stroke={c} strokeWidth={2.4} fill="none" strokeLinecap="round" />
    </G>
  );
}

export function Mouth({ cx, cy, mouthDy, expression, t, talking, mouthColour = '#A85B3C', eye }: FaceProps) {
  const my = cy + mouthDy;
  const w = eye * 1.4;
  const open = talking ? anim.mouthOpen(t) : 0;
  if (talking || expression === 'talk') {
    const o = talking ? 0.4 + open * 1.2 : 1.1;
    return <Ellipse cx={cx} cy={my + eye * 0.2} rx={w * 0.55} ry={eye * 0.3 * o + 0.5} fill="#8E3B2E" stroke={mouthColour} strokeWidth={1} />;
  }
  switch (expression) {
    case 'laugh':
      return (
        <G>
          <Path d={`M ${cx - w} ${my - 1} Q ${cx} ${my + eye * 1.9} ${cx + w} ${my - 1} Z`} fill="#8E3B2E" />
          <Path d={`M ${cx - w * 0.7} ${my} Q ${cx} ${my + eye * 0.5} ${cx + w * 0.7} ${my} Z`} fill="#FFFFFF" />
        </G>
      );
    case 'happy':
    case 'proud':
    case 'wink':
      return <Path d={`M ${cx - w} ${my} Q ${cx} ${my + eye * 1.2} ${cx + w} ${my}`} stroke={mouthColour} strokeWidth={2.2} fill="none" strokeLinecap="round" />;
    case 'surprised':
      return <Ellipse cx={cx} cy={my + eye * 0.4} rx={eye * 0.5} ry={eye * 0.7} fill="#8E3B2E" />;
    case 'sad':
      return <Path d={`M ${cx - w * 0.8} ${my + eye * 0.6} Q ${cx} ${my - eye * 0.4} ${cx + w * 0.8} ${my + eye * 0.6}`} stroke={mouthColour} strokeWidth={2.2} fill="none" strokeLinecap="round" />;
    case 'sleepy':
      return <Ellipse cx={cx} cy={my + eye * 0.3} rx={eye * 0.35} ry={eye * 0.4} fill="#8E3B2E" />;
    case 'think':
      return <Path d={`M ${cx - w * 0.6} ${my + eye * 0.3} Q ${cx} ${my} ${cx + w * 0.5} ${my + eye * 0.45}`} stroke={mouthColour} strokeWidth={2.2} fill="none" strokeLinecap="round" />;
    case 'oops':
      return <Path d={`M ${cx - w * 0.7} ${my + eye * 0.2} L ${cx - w * 0.2} ${my + eye * 0.5} L ${cx + w * 0.3} ${my + eye * 0.1} L ${cx + w * 0.7} ${my + eye * 0.5}`} stroke={mouthColour} strokeWidth={2.2} fill="none" strokeLinecap="round" />;
    case 'listen':
      return <Path d={`M ${cx - w * 0.5} ${my + eye * 0.2} Q ${cx} ${my + eye * 0.7} ${cx + w * 0.5} ${my + eye * 0.2}`} stroke={mouthColour} strokeWidth={2.2} fill="none" strokeLinecap="round" />;
    default:
      return <Path d={`M ${cx - w * 0.7} ${my} Q ${cx} ${my + eye * 0.7} ${cx + w * 0.7} ${my}`} stroke={mouthColour} strokeWidth={2.2} fill="none" strokeLinecap="round" />;
  }
}

export function Cheeks({ cx, cy, gap, eye, expression }: FaceProps) {
  const strong = expression === 'happy' || expression === 'laugh' || expression === 'proud' || expression === 'oops';
  return (
    <G opacity={strong ? 0.5 : 0.3}>
      <Ellipse cx={cx - gap - eye * 0.5} cy={cy + eye * 1.6} rx={eye * 0.9} ry={eye * 0.5} fill="#F28DA6" />
      <Ellipse cx={cx + gap + eye * 0.5} cy={cy + eye * 1.6} rx={eye * 0.9} ry={eye * 0.5} fill="#F28DA6" />
    </G>
  );
}

/** Eyes + brows + mouth + cheeks in one call. */
export function Face(p: FaceProps) {
  return (
    <G>
      {p.cheek !== false && <Cheeks {...p} />}
      <Eyes {...p} />
      <Brows {...p} />
      <Mouth {...p} />
    </G>
  );
}

/** "Z z z" shown above a sleeping character. */
export function SleepZ({ x, y, t, colour = '#2F3C7E' }: { x: number; y: number; t: number; colour?: string }) {
  const f = t > 0 ? (t % 2) / 2 : 0.4;
  return (
    <G opacity={0.85}>
      <Path d={`M ${x} ${y - f * 6} h 6 l -6 6 h 6`} stroke={colour} strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <Path d={`M ${x + 9} ${y - 10 - f * 8} h 4 l -4 4 h 4`} stroke={colour} strokeWidth={1.6} fill="none" strokeLinecap="round" strokeLinejoin="round" opacity={0.7} />
    </G>
  );
}

export function Shadow({ cx, cy, rx, ry = rx * 0.28 }: { cx: number; cy: number; rx: number; ry?: number }) {
  return <Ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill="#3A2E2A" opacity={0.16} />;
}

/** Degrees to a transform string rotating about a pivot. */
export const rot = (deg: number, px: number, py: number) => `translate(${px} ${py}) rotate(${deg}) translate(${-px} ${-py})`;

export interface Limbs { armL: number; armR: number; legL: number; legR: number; lean: number; bob: number; headTilt: number }

/** Limb lift angles (degrees, positive = outward/up) and body motion for a pose at time t. */
export function limbAngles(pose: import('../types').SpritePose, t: number): Limbs {
  const s = anim.swing(t, pose === 'run' ? 14 : 8);
  const idle = anim.breathe(t);
  switch (pose) {
    case 'walk': return { armL: 18 * s, armR: -18 * s, legL: -22 * s, legR: 22 * s, lean: 2, bob: anim.bob(t) * 2, headTilt: 0 };
    case 'run': return { armL: 45 * s, armR: -45 * s, legL: -40 * s, legR: 40 * s, lean: 10, bob: anim.bob(t) * 4, headTilt: 3 };
    case 'wave': return { armL: 4 * idle, armR: 150 + 14 * anim.swing(t, 9), legL: 0, legR: 0, lean: 0, bob: 0, headTilt: -3 };
    case 'clap': return { armL: 70 + 18 * anim.swing(t, 10), armR: 70 + 18 * anim.swing(t, 10), legL: 0, legR: 0, lean: 0, bob: anim.bob(t), headTilt: 0 };
    case 'teach': return { armL: 10 + 3 * idle, armR: 135 + 4 * idle, legL: 0, legR: 0, lean: -2, bob: 0, headTilt: -2 };
    case 'think': return { armL: 5, armR: 115, legL: 0, legR: 0, lean: 0, bob: 0, headTilt: 6 };
    case 'sit': return { armL: 30, armR: 30, legL: 80, legR: 80, lean: 0, bob: 0, headTilt: 0 };
    case 'sleep': return { armL: 40, armR: 40, legL: 80, legR: 80, lean: 12, bob: 0, headTilt: 14 };
    case 'graze': return { armL: 0, armR: 0, legL: 0, legR: 0, lean: 0, bob: 0, headTilt: 30 };
    default: return { armL: 3 * idle, armR: 3 * idle, legL: 0, legR: 0, lean: 0, bob: 0, headTilt: 0 };
  }
}
