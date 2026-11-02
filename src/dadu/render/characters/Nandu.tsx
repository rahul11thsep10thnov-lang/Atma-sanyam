import React from 'react';
import type { RigProps } from '../types';
import { characterColours } from '../palette';
import { QuadrupedRig } from './quadruped';
const c = characterColours.nandu;
export const NANDU_SPEC = {
  coat: c.coat, coatShade: c.coatShade, line: '#7A5027', belly: c.white,
  body: { rx: 30, ry: 18 }, legLen: 18, legW: 8, hoof: c.hoof,
  headR: 22, iris: '#2B1D14', muzzle: c.muzzle, tail: 'swish' as const, ears: 'cow' as const, tuft: true,
  patches: [{ cx: 76, cy: 66, rx: 10, ry: 7, fill: c.white }, { cx: 56, cy: 26, rx: 8, ry: 6, fill: c.white }],
};
export function NanduRig(p: RigProps) { return <QuadrupedRig {...p} spec={NANDU_SPEC} />; }
