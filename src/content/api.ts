// Network layer — the ONLY file that knows how content is actually fetched.
// Everything above this (repository.ts, hooks, screens) talks in terms of
// ContentQuery/Page<ContentImage> and never touches HTTP or the mock data
// directly, so swapping the mock for a real backend is a change confined
// to this one file.
//
// Real REST contract this stands in for:
//
//   GET /v1/categories
//     -> CategoryNode[]                (flat list; client builds the tree)
//
//   GET /v1/images?search=&categoryId=&tags=a,b&sort=newest|popular|title
//                  &limit=20&cursor=<opaque>
//     -> { items: ContentImage[], nextCursor: string | null }
//
//   GET /v1/images/:imageId
//     -> ContentImage                  (full detail, e.g. for attribution)
//
// A real backend can add images/categories at any time — the client only
// ever asks for a page of results, so nothing here assumes a fixed catalog
// size or needs an app update to see new content.
import { CategoryNode, ContentImage, ContentQuery, Page } from './types';
import { MOCK_CATEGORIES, MOCK_IMAGES } from './mockCatalog';

const SIMULATED_LATENCY_MS = 350;

function delay<T>(value: T): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), SIMULATED_LATENCY_MS));
}

function matchesQuery(image: ContentImage, query: ContentQuery): boolean {
  if (query.categoryId) {
    const inCategory = image.category === query.categoryId || image.subcategory === query.categoryId;
    if (!inCategory) return false;
  }
  if (query.tags && query.tags.length > 0) {
    const hasAllTags = query.tags.every((t) => image.tags.includes(t));
    if (!hasAllTags) return false;
  }
  if (query.search) {
    const needle = query.search.toLowerCase();
    const haystack = [image.title, image.category, image.subcategory ?? '', ...image.tags].join(' ').toLowerCase();
    if (!haystack.includes(needle)) return false;
  }
  return true;
}

function sortImages(images: ContentImage[], sort: ContentQuery['sort']): ContentImage[] {
  const copy = [...images];
  switch (sort) {
    case 'popular':
      return copy.sort((a, b) => b.popularity - a.popularity);
    case 'title':
      return copy.sort((a, b) => a.title.localeCompare(b.title));
    case 'newest':
    default:
      return copy.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }
}

export async function fetchCategories(): Promise<CategoryNode[]> {
  return delay(MOCK_CATEGORIES);
}

export async function fetchImages(query: ContentQuery): Promise<Page<ContentImage>> {
  const limit = query.limit ?? 20;
  const filtered = sortImages(MOCK_IMAGES.filter((img) => matchesQuery(img, query)), query.sort);

  const startIndex = query.cursor ? Number(query.cursor) : 0;
  const page = filtered.slice(startIndex, startIndex + limit);
  const nextIndex = startIndex + limit;
  const nextCursor = nextIndex < filtered.length ? String(nextIndex) : null;

  return delay({ items: page, nextCursor });
}

export async function fetchImageById(imageId: string): Promise<ContentImage | null> {
  const found = MOCK_IMAGES.find((img) => img.imageId === imageId) ?? null;
  return delay(found);
}
