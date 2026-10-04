// The rendered packs and their images, by space id. Only the balcony is
// a photographed pack now; the garden is the real-time scene in
// src/garden/ and has no pack, so any lookup for it gets the balcony's
// (the generic space rules are never run for the garden).
import { ImageSourcePropType } from 'react-native';
import { SpaceId, SpacePack } from '../packTypes';
import * as balcony from './balcony.generated';

const PACKS: Partial<Record<SpaceId, { pack: SpacePack; images: Record<string, number> }>> = {
  balcony: { pack: balcony.PACK, images: balcony.IMAGES },
};

function entry(space: SpaceId) {
  return PACKS[space] ?? PACKS.balcony!;
}

export function packFor(space: SpaceId): SpacePack {
  return entry(space).pack;
}

export function img(space: SpaceId, file: string): ImageSourcePropType {
  const src = entry(space).images[file];
  if (src === undefined) throw new Error(`${space} pack has no image ${file}`);
  return src;
}

export function hasImg(space: SpaceId, file: string): boolean {
  return entry(space).images[file] !== undefined;
}
