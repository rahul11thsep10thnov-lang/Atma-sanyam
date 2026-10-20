// Network layer — the ONLY file that knows how content is actually fetched.
// Everything above this (repository.ts, hooks, screens) talks in terms of
// ContentQuery/Page<ContentImage> and never touches HTTP directly.
//
// The REST contract:
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
import { isBackendConfigured } from '../config/env';
import { apiRequest } from '../services/apiClient';

// With EXPO_PUBLIC_API_URL set, every call below goes to the real Tame API
// (backend/src/routes/public). Without it there is no remote catalog at all:
// the app shows only the pictures bundled with it (bundled.ts, merged in by
// repository.ts) and makes no network request for content.

export async function fetchCategories(): Promise<CategoryNode[]> {
  if (isBackendConfigured) return apiRequest<CategoryNode[]>('/v1/categories', { auth: false });
  return [];
}

export async function fetchImages(query: ContentQuery): Promise<Page<ContentImage>> {
  if (!isBackendConfigured) return { items: [], nextCursor: null };
  return apiRequest<Page<ContentImage>>('/v1/images', {
    auth: false,
    query: {
      search: query.search,
      categoryId: query.categoryId,
      tags: query.tags?.join(','),
      sort: query.sort,
      limit: query.limit,
      cursor: query.cursor ?? undefined,
    },
  });
}

export async function fetchImageById(imageId: string): Promise<ContentImage | null> {
  if (!isBackendConfigured) return null;
  try {
    return await apiRequest<ContentImage>(`/v1/images/${encodeURIComponent(imageId)}`, { auth: false });
  } catch {
    return null;
  }
}
