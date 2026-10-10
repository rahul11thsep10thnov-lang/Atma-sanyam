// Orchestration layer: combines the network layer (api.ts) with the disk
// cache (cache.ts) behind one interface. Hooks/screens depend only on this
// file, never on api.ts or cache.ts directly, so caching policy can change
// without touching UI code.
import { CategoryNode, ContentImage, ContentQuery, Page } from './types';
import { fetchCategories, fetchImageById, fetchImages } from './api';
import { getCachedImageUri, getCachedImageUriIfPresent, ImageVariant } from './cache';
import { BUNDLED_IMAGES, bundledFor, bundledUri, bundledUriIfReady, isBundled, withBundledCategories } from './bundled';

export type { ImageVariant };

export async function listCategories(): Promise<CategoryNode[]> {
  return withBundledCategories(await fetchCategories());
}

export async function listImages(query: ContentQuery): Promise<Page<ContentImage>> {
  // the bundled pictures lead the first page of Nature (and of any search they match)
  const local = bundledFor(query);
  let page: Page<ContentImage>;
  try {
    page = await fetchImages(query);
  } catch (e) {
    if (!local.length) throw e;
    page = { items: [], nextCursor: null };
  }
  if (!local.length) return page;
  return { ...page, items: [...local, ...page.items.filter((im) => !isBundled(im))] };
}

export async function getImageDetail(imageId: string): Promise<ContentImage | null> {
  const local = BUNDLED_IMAGES.find((im) => im.imageId === imageId);
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
