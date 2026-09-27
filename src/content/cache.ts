// Disk cache for remote content-library images, keyed by imageId+variant so
// a thumbnail and its full-res sibling never collide. Backed by expo-file-system's
// SDK 57 File/Directory API (the legacy function-based API is gone in this SDK —
// see AGENTS.md). Everything above this (repository.ts) only calls
// getCachedImageUri(); it never touches File/Directory directly.
//
// expo-file-system's native module isn't available on every platform (e.g. its
// web shim throws on construction). All disk access here is guarded so a
// platform without it just falls back to streaming straight from remoteUrl
// instead of crashing the app — the same defensive pattern already used for
// expo-notifications elsewhere in this codebase.
import { Directory, File, Paths } from 'expo-file-system';

export type ImageVariant = 'thumbnail' | 'medium' | 'full';

const MAX_CACHE_BYTES = 200 * 1024 * 1024; // 200MB
const MAX_CACHE_FILES = 500;

let cacheDir: Directory | null | undefined; // undefined = not yet attempted

function getCacheDir(): Directory | null {
  if (cacheDir !== undefined) return cacheDir;
  try {
    const dir = new Directory(Paths.cache, 'content-images');
    if (!dir.exists) {
      dir.create({ intermediates: true });
    }
    cacheDir = dir;
  } catch {
    cacheDir = null;
  }
  return cacheDir;
}

function filenameFor(imageId: string, variant: ImageVariant): string {
  return `${imageId}__${variant}.jpg`;
}

// In-flight downloads by filename, so concurrent requests for the same image
// (e.g. a grid re-rendering while a download is still running) share one
// network request instead of firing duplicates.
const inFlight = new Map<string, Promise<string>>();

export function getCachedImageUriIfPresent(imageId: string, variant: ImageVariant): string | null {
  const dir = getCacheDir();
  if (!dir) return null;
  try {
    const file = new File(dir, filenameFor(imageId, variant));
    return file.exists ? file.uri : null;
  } catch {
    return null;
  }
}

export async function getCachedImageUri(imageId: string, variant: ImageVariant, remoteUrl: string): Promise<string> {
  const dir = getCacheDir();
  if (!dir) return remoteUrl;

  const filename = filenameFor(imageId, variant);

  try {
    const existingFile = new File(dir, filename);
    if (existingFile.exists) {
      return existingFile.uri;
    }
  } catch {
    return remoteUrl;
  }

  const existing = inFlight.get(filename);
  if (existing) {
    return existing;
  }

  const download = (async () => {
    try {
      const destination = new File(dir, filename);
      const downloaded = await File.downloadFileAsync(remoteUrl, destination, { idempotent: true });
      evictIfNeeded(dir);
      return downloaded.uri;
    } catch {
      return remoteUrl;
    } finally {
      inFlight.delete(filename);
    }
  })();

  inFlight.set(filename, download);
  return download;
}

function evictIfNeeded(dir: Directory): void {
  try {
    const entries = dir.list().filter((entry): entry is File => entry instanceof File);
    if (entries.length <= MAX_CACHE_FILES) {
      const totalBytes = entries.reduce((sum, f) => sum + (f.size ?? 0), 0);
      if (totalBytes <= MAX_CACHE_BYTES) return;
    }

    const withInfo = entries
      .map((f) => ({ file: f, modifiedAt: f.info().modificationTime ?? 0, size: f.size ?? 0 }))
      .sort((a, b) => a.modifiedAt - b.modifiedAt);

    let totalBytes = withInfo.reduce((sum, e) => sum + e.size, 0);
    let count = withInfo.length;
    let i = 0;
    while ((count > MAX_CACHE_FILES || totalBytes > MAX_CACHE_BYTES) && i < withInfo.length) {
      const entry = withInfo[i];
      try {
        entry.file.delete();
        totalBytes -= entry.size;
        count -= 1;
      } catch {
        // best-effort eviction; a locked/already-gone file just gets skipped
      }
      i += 1;
    }
  } catch {
    // best-effort; caching still functions without eviction on this run
  }
}

export async function clearImageCache(): Promise<void> {
  const dir = getCacheDir();
  if (!dir) return;
  try {
    if (dir.exists) {
      dir.delete();
    }
  } catch {
    // nothing to do if the cache directory can't be removed
  }
  cacheDir = undefined;
}
