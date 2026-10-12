// Pictures that ship inside the app, so the library has something to reveal
// even with no server: two Himalayan landscapes from Wikimedia Commons, and
// the 104 landscape, river, waterfall, coast, flower, bird and butterfly
// pictures supplied for the app (bundledLibrary.generated.ts, built by
// tools/library/build_library.py), and 100 Inspirational quote cards
// (bundledQuotes.generated.ts, tools/library/build_quotes.py). They lead each collection they belong
// to, ahead of whatever the catalog (mock or real) returns.
import { Asset } from 'expo-asset';
import { CategoryNode, ContentImage, ContentQuery } from './types';
import type { ImageVariant } from './cache';
import { LIBRARY_ITEMS, LibraryItem } from './bundledLibrary.generated';
import { QUOTE_ITEMS, QuoteItem } from './bundledQuotes.generated';
import { getLanguage, StringKey, t } from '../i18n';

const HIMALAYA_FILES: Record<string, Record<ImageVariant, number>> = {
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

function himalaya(imageId: string, title: string, commons: string, tags: string[], popularity: number): ContentImage {
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

const HIMALAYA: ContentImage[] = [
  himalaya('bundled-himalaya-1', 'Sagarmatha, Everest zone', 'File:Sagarmatha_Everest_Zone,_Nepal,_Himalayas.jpg', ['himalayas', 'mountains', 'everest', 'nepal', 'snow'], 1000),
  himalaya('bundled-himalaya-2', 'Himalayas, Nepal', 'File:Himalayas,_Nepal.jpg', ['himalayas', 'mountains', 'nepal', 'snow'], 999),
];

const LIBRARY_BY_ID = new Map<string, LibraryItem>(LIBRARY_ITEMS.map((l) => [l.id, l]));
const FILES: Record<string, Record<ImageVariant, number>> = {
  ...HIMALAYA_FILES,
  ...Object.fromEntries(LIBRARY_ITEMS.map((l) => [l.id, { thumbnail: l.thumb, medium: l.full, full: l.full }])),
  ...Object.fromEntries(QUOTE_ITEMS.map((q) => [q.id, { thumbnail: q.thumb, medium: q.full, full: q.full }])),
};

/** An Inspirational card: a quote over a soft background, supplied for the app. */
function quoteImage(q: QuoteItem): ContentImage {
  return {
    imageId: q.id,
    title: `${t('lib.kind.quote')} ${String(q.n).padStart(2, '0')}`,
    category: 'inspirational',
    subcategory: 'inspirational-quotes',
    tags: ['quote', 'inspirational', 'motivation'],
    thumbnailUrl: `bundled://${q.id}/thumbnail`,
    mediumImageUrl: `bundled://${q.id}/full`,
    fullImageUrl: `bundled://${q.id}/full`,
    source: 'App library',
    creator: '',
    license: 'supplied with the app',
    attributionRequired: false,
    attributionText: null,
    createdAt: new Date(Date.UTC(2026, 9, 12) - q.n * 60000).toISOString(),
    popularity: 700 - q.n,
  };
}

// credits printed on the supplied pictures themselves; the rest came without any
const LIBRARY_CREDITS: Record<string, { source: string; creator: string; text: string }> = {
  ls_051: { source: 'Copernicus Sentinel-2 imagery, European Union', creator: 'European Union, Copernicus', text: 'Zemu Glacier: European Union, Copernicus Sentinel-2 imagery, processed by @DEFIS_EU' },
};

function libraryImage(l: LibraryItem): ContentImage {
  const credit = LIBRARY_CREDITS[l.id];
  return {
    imageId: l.id,
    // "Lake 03" / "झील 03": the picture's kind, in the current language, and its number
    title: `${t(`lib.kind.${l.kind}` as StringKey)} ${String(l.n).padStart(2, '0')}`,
    category: l.cat,
    subcategory: `${l.cat}-${l.sub}`,
    tags: [l.kind, l.sub, l.cat],
    thumbnailUrl: `bundled://${l.id}/thumbnail`,
    mediumImageUrl: `bundled://${l.id}/full`,
    fullImageUrl: `bundled://${l.id}/full`,
    source: credit?.source ?? 'App library',
    creator: credit?.creator ?? '',
    license: credit ? 'credit printed on the picture' : 'supplied with the app',
    attributionRequired: !!credit,
    attributionText: credit?.text ?? null,
    createdAt: new Date(Date.UTC(2026, 9, 11) - (800 - l.pop) * 60000).toISOString(),
    popularity: l.pop,
  };
}

// titles follow the language, so the list is built once per language
const built = new Map<string, ContentImage[]>();
export function bundledImages(): ContentImage[] {
  const lang = getLanguage();
  let list = built.get(lang);
  if (!list) {
    list = [...HIMALAYA, ...LIBRARY_ITEMS.map(libraryImage), ...QUOTE_ITEMS.map(quoteImage)];
    built.set(lang, list);
  }
  return list;
}

export const BUNDLED_CATEGORIES: CategoryNode[] = [
  { id: 'nature', name: 'Nature', parentId: null },
  { id: 'wildlife', name: 'Wildlife', parentId: null },
  { id: 'inspirational', name: 'Inspirational', parentId: null },
  { id: 'inspirational-quotes', name: 'Quotes', parentId: 'inspirational' },
  { id: 'nature-himalayas', name: 'Himalayas', parentId: 'nature' },
  { id: 'nature-mountains', name: 'Mountains', parentId: 'nature' },
  { id: 'nature-lakes', name: 'Lakes', parentId: 'nature' },
  { id: 'nature-rivers', name: 'Rivers', parentId: 'nature' },
  { id: 'nature-waterfalls', name: 'Waterfalls', parentId: 'nature' },
  { id: 'nature-valleys', name: 'Valleys', parentId: 'nature' },
  { id: 'nature-coast', name: 'Coast', parentId: 'nature' },
  { id: 'nature-forests', name: 'Forests', parentId: 'nature' },
  { id: 'nature-flowers', name: 'Flowers', parentId: 'nature' },
  { id: 'nature-vintage', name: 'Vintage prints', parentId: 'nature' },
  { id: 'wildlife-birds', name: 'Birds', parentId: 'wildlife' },
  { id: 'wildlife-butterflies', name: 'Butterflies', parentId: 'wildlife' },
  { id: 'wildlife-animals', name: 'Animals', parentId: 'wildlife' },
];

/** A catalog root that already holds the same collection keeps the pictures under it. */
const ROOT_MATCH: Record<string, RegExp> = { nature: /nature|landscape/i, wildlife: /wildlife|animal/i, inspirational: /inspirational|quotes?|motivation/i };

export function isBundled(image: Pick<ContentImage, 'imageId'>): boolean {
  return image.imageId in FILES;
}

export function bundledById(imageId: string): ContentImage | undefined {
  return bundledImages().find((im) => im.imageId === imageId);
}

/** One page of the bundled pictures matching a query, in the query's order. */
export function bundledPage(query: ContentQuery, offset: number, limit: number): { items: ContentImage[]; total: number } {
  const all = bundledImages().filter((im) => {
    if (query.categoryId && im.category !== query.categoryId && im.subcategory !== query.categoryId) return false;
    if (query.tags?.length && !query.tags.every((tag) => im.tags.includes(tag))) return false;
    if (query.search) {
      const needle = query.search.toLowerCase();
      if (![im.title, im.category, im.subcategory ?? '', ...im.tags].join(' ').toLowerCase().includes(needle)) return false;
    }
    return true;
  });
  switch (query.sort) {
    case 'title':
      all.sort((a, b) => a.title.localeCompare(b.title));
      break;
    case 'newest':
      all.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      break;
    case 'popular':
    default:
      all.sort((a, b) => b.popularity - a.popularity);
  }
  return { items: all.slice(offset, offset + limit), total: all.length };
}

/** Categories from the catalog plus the bundled ones it lacks. */
export function withBundledCategories(categories: CategoryNode[]): CategoryNode[] {
  const out = [...categories];
  for (const c of BUNDLED_CATEGORIES) {
    const rootMatch = c.parentId === null ? ROOT_MATCH[c.id] : null;
    if (rootMatch && out.some((x) => x.parentId === null && rootMatch.test(`${x.id} ${x.name}`))) continue;
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
