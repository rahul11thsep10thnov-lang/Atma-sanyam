// Stand-in for a real backend response. In production this data lives in a
// database behind the API in api.ts — nothing here ships new images or
// categories via an app release; this file exists only so the pagination,
// search, filter, cache, and browsing pipeline can be built and tested
// end-to-end before a real CDN/DB exists. Swap api.ts's implementation to
// call the real endpoints and every screen above it keeps working unchanged.
//
// Image URLs point at picsum.photos, a free placeholder-photo service made
// for exactly this kind of scaffolding — they are not meant to be the
// final licensed catalog. Replace with real, properly-licensed entries
// (each still carrying source/creator/license/attribution metadata) before
// shipping.
import { CategoryNode, ContentImage } from './types';

export const MOCK_CATEGORIES: CategoryNode[] = [
  { id: 'religion', name: 'Religion', parentId: null },
  { id: 'religion-shiva', name: 'Shiva', parentId: 'religion' },
  { id: 'religion-shiva-mahadev', name: 'Mahadev', parentId: 'religion-shiva' },

  { id: 'nature', name: 'Nature', parentId: null },
  { id: 'nature-mountains', name: 'Mountains', parentId: 'nature' },
  { id: 'nature-mountains-himalayas', name: 'Himalayas', parentId: 'nature-mountains' },

  { id: 'movies', name: 'Movies', parentId: null },
  { id: 'movies-bollywood', name: 'Bollywood', parentId: 'movies' },

  { id: 'series', name: 'Series', parentId: null },
  { id: 'series-netflix', name: 'Netflix', parentId: 'series' },

  { id: 'anime', name: 'Anime', parentId: null },
  { id: 'anime-naruto', name: 'Naruto', parentId: 'anime' },
];

function picsum(seed: string, size: number): string {
  return `https://picsum.photos/seed/${seed}/${size}/${size}`;
}

function makeImage(
  seed: string,
  title: string,
  categoryId: string,
  subcategoryId: string | null,
  tags: string[],
  popularity: number,
  daysAgo: number
): ContentImage {
  return {
    imageId: seed,
    title,
    category: categoryId,
    subcategory: subcategoryId,
    tags,
    thumbnailUrl: picsum(seed, 160),
    mediumImageUrl: picsum(seed, 640),
    fullImageUrl: picsum(seed, 1080),
    source: 'picsum.photos (placeholder)',
    creator: 'Unknown (mock data)',
    license: 'placeholder-mock-data',
    attributionRequired: false,
    attributionText: null,
    createdAt: new Date(Date.now() - daysAgo * 86400000).toISOString(),
    popularity,
  };
}

export const MOCK_IMAGES: ContentImage[] = [
  makeImage('mahadev-1', 'Mahadev at dawn', 'religion', 'religion-shiva-mahadev', ['shiva', 'temple', 'sunrise'], 92, 2),
  makeImage('mahadev-2', 'Trishul silhouette', 'religion', 'religion-shiva-mahadev', ['shiva', 'trishul'], 78, 10),
  makeImage('mahadev-3', 'Mahadev statue', 'religion', 'religion-shiva-mahadev', ['shiva', 'statue'], 65, 20),
  makeImage('himalaya-1', 'Snow ridge line', 'nature', 'nature-mountains-himalayas', ['himalayas', 'snow'], 95, 1),
  makeImage('himalaya-2', 'Prayer flags at altitude', 'nature', 'nature-mountains-himalayas', ['himalayas', 'flags'], 81, 5),
  makeImage('himalaya-3', 'Valley mist', 'nature', 'nature-mountains-himalayas', ['himalayas', 'mist'], 70, 14),
  makeImage('himalaya-4', 'Base camp view', 'nature', 'nature-mountains-himalayas', ['himalayas', 'camp'], 60, 30),
  makeImage('bollywood-1', 'Marquee lights', 'movies', 'movies-bollywood', ['bollywood', 'cinema'], 88, 3),
  makeImage('bollywood-2', 'Studio backlot', 'movies', 'movies-bollywood', ['bollywood', 'studio'], 55, 25),
  makeImage('netflix-1', 'Living room glow', 'series', 'series-netflix', ['netflix', 'screen'], 90, 4),
  makeImage('netflix-2', 'Popcorn night', 'series', 'series-netflix', ['netflix', 'snacks'], 68, 18),
  makeImage('naruto-1', 'Leaf village gate', 'anime', 'anime-naruto', ['naruto', 'konoha'], 97, 1),
  makeImage('naruto-2', 'Training grounds', 'anime', 'anime-naruto', ['naruto', 'training'], 84, 8),
  makeImage('naruto-3', 'Forest path', 'anime', 'anime-naruto', ['naruto', 'forest'], 62, 22),
];
