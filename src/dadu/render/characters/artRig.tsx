// Wraps a vector rig so that character pictures dropped into
// assets/dadu-art/characters/<key>/ replace it automatically. With no pictures
// (or none that fit the pose) the vector rig is drawn as before.
import React from 'react';
import { G, Image as SvgImage } from 'react-native-svg';
import type { CharacterKey } from '../../core/characters';
import type { RigProps } from '../types';
import { ART } from '../../art';
import { pickCharacterImage } from '../../art/logic';
import { anim } from '../clock';

export function withArt(key: CharacterKey, Rig: (p: RigProps) => React.ReactElement, box: { w: number; h: number }): (p: RigProps) => React.ReactElement {
  return function ArtOrVectorRig(p: RigProps) {
    const images = ART.characters[key];
    if (!images) return <Rig {...p} />;
    const name = pickCharacterImage(Object.keys(images), p.view, p.pose, p.expression, !!p.talking, p.t);
    if (!name) return <Rig {...p} />;
    // Light movement from code: breathing while standing, a small bob while walking or running.
    const moving = p.pose === 'walk' || p.pose === 'run';
    const lift = moving ? -4 * anim.bob(p.t) : 0;
    const squash = 1 + 0.012 * anim.breathe(p.t);
    return (
      <G transform={`translate(0 ${box.h + lift}) scale(1 ${squash}) translate(0 ${-box.h})`}>
        <SvgImage href={images[name].src} x={0} y={0} width={box.w} height={box.h} preserveAspectRatio="xMidYMax meet" />
      </G>
    );
  };
}
