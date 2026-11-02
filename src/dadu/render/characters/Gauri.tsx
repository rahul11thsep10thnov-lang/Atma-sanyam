import React from 'react';
import type { RigProps } from '../types';
import { characterColours } from '../palette';
import { QuadrupedRig } from './quadruped';
const c = characterColours.gauri;
export const GAURI_SPEC = {
  coat: c.coat, coatShade: c.coatShade, line: '#B9AE9C',
  body: { rx: 44, ry: 26 }, legLen: 26, legW: 11, hoof: c.hoof,
  headR: 26, iris: '#2B1D14', muzzle: c.muzzle, tail: 'swish' as const, ears: 'cow' as const, horns: true, collar: '#D9663D', bell: true,
  patches: [{ cx: 58, cy: 64, rx: 14, ry: 10, fill: c.patch }, { cx: 86, cy: 72, rx: 10, ry: 8, fill: c.patch }, { cx: 52, cy: 22, rx: 10, ry: 7, fill: c.patch }],
};
export function GauriRig(p: RigProps) { return <QuadrupedRig {...p} spec={GAURI_SPEC} />; }
