// Pictures that ship inside the app, so the library has something to reveal
// even with no server: two Himalayan landscapes under Nature. They appear
// alongside whatever the catalog (mock or real) returns, on the first page.
import { Asset } from 'expo-asset';
import { CategoryNode, ContentImage, ContentQuery } from './types';
import type { ImageVariant } from './cache';

const FILES: Record<string, Record<ImageVariant, number>> = {
  'bundled-himalaya-1': {
    thumbnail: require('../../assets/library/001_mountains__thumb.jpg'),
    medium: require('../../assets/library/001_mountains__medium.jpg'),
    full: require('../../assets/library/001_mountains.jpg'),
  },
  'bundled-himalaya-2': {
    thumbnail: require('../../assets/library/002_mountains__thumb.jpg'),
    medium: require('../../assets/library/002_mountains__medium.jpg'),
    full: require('../../assets/library/002_mountains.jpg'),
  },
};

const CC_BY = 'CC BY 4.0';

function bundled(imageId: string, title: string, commons: string, tags: string[], popularity: number): ContentImage {
  return {
    imageId,
    title,
    category: 'nature',
    subcategory: 'nature-himalayas',
    tags,
    thumbnailUrl: `bundled://${imageId}/thumbnail`,
    mediumImageUrl: `bundled://${imageId}/medium`,
    fullImageUrl: `bundled://${imageId}/full`,
    source: `https://commons.wikimedia.org/wiki/${commons}`,
    creator: 'Vyacheslav Argenberg',
    license: CC_BY,
    attributionRequired: true,
    attributionText: `Photo: Vyacheslav Argenberg, ${CC_BY}, via Wikimedia Commons (cropped)`,
    createdAt: '2026-10-10T00:00:00.000Z',
    popularity,
  };
}

export const BUNDLED_IMAGES: ContentImage[] = [
  bundled('bundled-himalaya-1', 'Sagarmatha, Everest zone', 'File:Sagarmatha_Everest_Zone,_Nepal,_Himalayas.jpg', ['himalayas', 'mountains', 'everest', 'nepal', 'snow'], 1000),
  bundled('bundled-himalaya-2', 'Himalayas, Nepal', 'File:Himalayas,_Nepal.jpg', ['himalayas', 'mountains', 'nepal', 'snow'], 999),
];

export const BUNDLED_CATEGORIES: CategoryNode[] = [
  { id: 'nature', name: 'Nature', parentId: null },
  { id: 'nature-himalayas', name: 'Himalayas', parentId: 'nature' },
];

export function isBundled(image: Pick<ContentImage, 'imageId'>): boolean {
  return image.imageId in FILES;
}

/** Bundled pictures matching a query (only on the first page, never twice). */
export function bundledFor(query: ContentQuery): ContentImage[] {
  if (query.cursor) return [];
  return BUNDLED_IMAGES.filter((im) => {
    if (query.categoryId && im.category !== query.categoryId && im.subcategory !== query.categoryId) return false;
    if (query.tags?.length && !query.tags.every((tag) => im.tags.includes(tag))) return false;
    if (query.search) {
      const needle = query.search.toLowerCase();
      if (![im.title, im.category, im.subcategory ?? '', ...im.tags].join(' ').toLowerCase().includes(needle)) return false;
    }
    return true;
  });
}

/** Categories from the catalog plus the bundled ones it lacks. */
export function withBundledCategories(categories: CategoryNode[]): CategoryNode[] {
  const out = [...categories];
  for (const c of BUNDLED_CATEGORIES) {
    // the catalog's own Nature root (whatever its id) keeps the pictures
    if (c.parentId === null && out.some((x) => x.parentId === null && /nature|landscape/i.test(`${x.id} ${x.name}`))) continue;
    if (!out.some((x) => x.id === c.id)) out.push(c);
  }
  return out;
}

/** A local file for a bundled picture. */
export async function bundledUri(imageId: string, variant: ImageVariant): Promise<string> {
  const asset = Asset.fromModule(FILES[imageId][variant]);
  if (!asset.localUri) await asset.downloadAsync();
  return asset.localUri ?? asset.uri;
}

export function bundledUriIfReady(imageId: string, variant: ImageVariant): string | null {
  const asset = Asset.fromModule(FILES[imageId][variant]);
  return asset.localUri ?? null;
}
