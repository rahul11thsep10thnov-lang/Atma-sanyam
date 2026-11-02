import React from 'react';
import type { RigProps } from '../types';
import { characterColours } from '../palette';
import { QuadrupedRig } from './quadruped';
const c = characterColours.buddy;
export const BUDDY_SPEC = {
  coat: c.coat, coatShade: c.coatShade, line: '#8C5F2A', belly: c.belly,
  body: { rx: 34, ry: 20 }, legLen: 22, legW: 9, hoof: '#FFF2DC', hoofRound: true,
  headR: 24, iris: '#4A2E14', muzzle: c.belly, nose: c.nose, tail: 'curl' as const, ears: 'floppy' as const, collar: c.collar, tongue: c.tongue,
};
export function BuddyRig(p: RigProps) { return <QuadrupedRig {...p} spec={BUDDY_SPEC} />; }
