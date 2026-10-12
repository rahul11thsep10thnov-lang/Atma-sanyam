// Orchestration layer: combines the network layer (api.ts) with the disk
// cache (cache.ts) behind one interface. Hooks/screens depend only on this
// file, never on api.ts or cache.ts directly, so caching policy can change
// without touching UI code.
import { CategoryNode, ContentImage, ContentQuery, Page } from './types';
import { fetchCategories, fetchImageById, fetchImages } from './api';
import { getCachedImageUri, getCachedImageUriIfPresent, ImageVariant } from './cache';
import { bundledById, bundledPage, bundledUri, bundledUriIfReady, isBundled, withBundledCategories } from './bundled';

export type { ImageVariant };

export async function listCategories(): Promise<CategoryNode[]> {
  return withBundledCategories(await fetchCategories());
}

export async function listImages(query: ContentQuery): Promise<Page<ContentImage>> {
  // Paging runs through the bundled pictures first (cursor "b:<offset>"), then
  // the catalog (cursor "r:<its cursor>"). The catalog's first page joins the
  // page on which the bundled pictures end, so a short collection still shows
  // what the catalog holds.
  const limit = query.limit ?? 20;
  const cur = query.cursor ?? null;
  const notBundled = (im: ContentImage) => !isBundled(im);
  if (cur && cur.startsWith('r:')) {
    const page = await fetchImages({ ...query, cursor: cur.slice(2) || null });
    return { items: page.items.filter(notBundled), nextCursor: page.nextCursor ? `r:${page.nextCursor}` : null };
  }
  const offset = cur && cur.startsWith('b:') ? Number(cur.slice(2)) || 0 : 0;
  const { items: local, total } = bundledPage(query, offset, limit);
  if (total > offset + local.length) return { items: local, nextCursor: `b:${offset + local.length}` };
  let page: Page<ContentImage> = { items: [], nextCursor: null };
  try {
    page = await fetchImages({ ...query, cursor: null });
  } catch (e) {
    if (!local.length) throw e;
  }
  return { items: [...local, ...page.items.filter(notBundled)], nextCursor: page.nextCursor ? `r:${page.nextCursor}` : null };
}

export async function getImageDetail(imageId: string): Promise<ContentImage | null> {
  const local = bundledById(imageId);
  if (local) return local;
  return fetchImageById(imageId);
}

const urlForVariant = (image: ContentImage, variant: ImageVariant): string => {
  switch (variant) {
    case 'thumbnail':
      return image.thumbnailUrl;
    case 'medium':
      return image.mediumImageUrl;
    case 'full':
      return image.fullImageUrl;
  }
};

// Returns a local file:// URI, downloading and caching to disk on first use.
// Safe to call every time a component using this image mounts — repeat
// calls after the first resolve instantly from the on-disk cache.
export async function resolveImageUri(image: ContentImage, variant: ImageVariant): Promise<string> {
  if (isBundled(image)) return bundledUri(image.imageId, variant);
  return getCachedImageUri(image.imageId, variant, urlForVariant(image, variant));
}

// Synchronous best-effort lookup for an already-cached variant, useful for
// rendering instantly on remount without waiting on a promise.
export function peekCachedImageUri(image: ContentImage, variant: ImageVariant): string | null {
  if (isBundled(image)) return bundledUriIfReady(image.imageId, variant);
  return getCachedImageUriIfPresent(image.imageId, variant);
}
