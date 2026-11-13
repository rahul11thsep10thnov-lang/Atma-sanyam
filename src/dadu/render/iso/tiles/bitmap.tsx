// A prop drawn from a picture instead of vector shapes. Used by spriteFor when
// assets/dadu-art/props has a picture with the same name as the sprite.
import React from 'react';
import { Image as SvgImage } from 'react-native-svg';
import { TILE_H, TILE_W } from '../isoMath';
import type { SpriteFn } from './box';
import type { ArtProp } from '../../../art/types';
import { bitmapGeometry, pickVariant } from '../../../art/logic';

export function bitmapSprite(art: ArtProp): SpriteFn {
  return function BitmapSprite({ flags, stage, w = 1, d = 1 }) {
    const src = pickVariant<number>(art.variants, flags, stage) ?? art.src;
    const g = bitmapGeometry(art, { w, d }, TILE_W, TILE_H);
    return <SvgImage href={src} x={g.x} y={g.y} width={g.width} height={g.height} preserveAspectRatio="xMidYMax meet" />;
  };
}
