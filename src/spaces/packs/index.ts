// The rendered packs and their images, by space id.
import { ImageSourcePropType } from 'react-native';
import { SpaceId, SpacePack } from '../packTypes';
import * as balcony from './balcony.generated';
import * as garden from './garden.generated';

const PACKS: Record<SpaceId, { pack: SpacePack; images: Record<string, number> }> = {
  balcony: { pack: balcony.PACK, images: balcony.IMAGES },
  garden: { pack: garden.PACK, images: garden.IMAGES },
};

export function packFor(space: SpaceId): SpacePack {
  return PACKS[space].pack;
}

export function img(space: SpaceId, file: string): ImageSourcePropType {
  const src = PACKS[space].images[file];
  if (src === undefined) throw new Error(`${space} pack has no image ${file}`);
  return src;
}

export function hasImg(space: SpaceId, file: string): boolean {
  return PACKS[space].images[file] !== undefined;
}
