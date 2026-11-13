// Sprite registry: every prop the isometric scenes can draw, keyed by name.
// Footprints (in tiles) let the scene block movement and sort depth for
// multi-tile props. Unknown sprite names draw a placeholder crate so a typo
// in content never crashes a scene.
import React from 'react';
import { Box } from './box';
import type { SpriteFn } from './box';
import { FURNITURE } from './furniture';
import { NATURE } from './nature';
import { BUILDINGS } from './buildings';
import { VILLA, VILLA_FOOTPRINT } from '../villa/VillaExterior';
import { ART } from '../../../art';
import { bitmapSprite } from './bitmap';

export const SPRITES: Record<string, SpriteFn> = { ...FURNITURE, ...NATURE, ...BUILDINGS, ...VILLA };

export const placeholder: SpriteFn = () => React.createElement(Box, { w: 0.6, d: 0.6, h: 20, colour: '#C9B698' });

const bitmapCache = new Map<string, SpriteFn>();

/** A picture from assets/dadu-art/props wins over the vector sprite of the same name. */
export function spriteFor(name: string): SpriteFn {
  const art = ART.props[name];
  if (art) {
    let fn = bitmapCache.get(name);
    if (!fn) { fn = bitmapSprite(art); bitmapCache.set(name, fn); }
    return fn;
  }
  return SPRITES[name] ?? placeholder;
}

/** Default footprints (w × d tiles) for props bigger than one tile. */
export const FOOTPRINTS: Record<string, { w: number; d: number }> = {
  sofa: { w: 2, d: 1 }, tv_wall: { w: 2, d: 1 }, bookshelf: { w: 2, d: 1 }, rug: { w: 2, d: 2 }, kitchen_island: { w: 2, d: 1 }, dining_table: { w: 2, d: 1 },
  bed: { w: 2, d: 1 }, desk: { w: 2, d: 1 }, harmonium: { w: 2, d: 1 }, lab_bench: { w: 2, d: 1 }, activity_mat: { w: 2, d: 2 }, pergola: { w: 3, d: 2 }, planter_rail: { w: 2, d: 1 },
  swing_seat: { w: 2, d: 1 }, bed_flower: { w: 1, d: 1 }, bed_veg: { w: 1, d: 1 }, bed_empty: { w: 1, d: 1 }, pond: { w: 3, d: 2 }, fountain: { w: 2, d: 2 }, greenhouse_frame: { w: 3, d: 2 },
  workbench: { w: 2, d: 1 }, cow_shed: { w: 3, d: 2 }, swing_set: { w: 3, d: 1 }, slide: { w: 3, d: 1 }, balance_beam: { w: 2, d: 1 }, yoga_mat: { w: 2, d: 1 }, bench: { w: 2, d: 1 },
  library_shelf: { w: 2, d: 1 }, library_arch_shelf: { w: 2, d: 1 }, reading_table: { w: 2, d: 1 }, librarian_desk: { w: 2, d: 1 }, reading_carpet: { w: 2, d: 2 }, shikhara: { w: 2, d: 2 }, gopuram: { w: 2, d: 2 },
  bazaar_stall: { w: 2, d: 1 }, pandal: { w: 3, d: 3 }, villa_mini: { w: 3, d: 2 }, library_building: { w: 3, d: 2 }, park_mini: { w: 3, d: 2 }, bazaar_mini: { w: 2, d: 1 }, villa_building: VILLA_FOOTPRINT,
  gate: { w: 2, d: 1 }, tree_banyan: { w: 2, d: 2 }, butterfly_bush: { w: 2, d: 1 }, bush: { w: 1, d: 1 },
};

export const SPRITE_NAMES = Object.keys(SPRITES);
export type { SpriteFn, SpriteProps } from './box';
