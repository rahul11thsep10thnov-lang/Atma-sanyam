// React hook layer: turns repository.ts's promise-based calls into
// loading/error/retry/pagination state a screen can render directly.
// Screens never call repository.ts or api.ts themselves.
import { useCallback, useEffect, useRef, useState } from 'react';
import { CategoryNode, ContentImage, SortOrder } from './types';
import { listCategories, listImages } from './repository';

const PAGE_SIZE = 20;

export interface ContentLibraryFilters {
  search: string;
  categoryId: string | null;
  sort: SortOrder;
}

const DEFAULT_FILTERS: ContentLibraryFilters = { search: '', categoryId: null, sort: 'popular' };

export function useContentLibrary(initialFilters: Partial<ContentLibraryFilters> = {}) {
  const [filters, setFilters] = useState<ContentLibraryFilters>({ ...DEFAULT_FILTERS, ...initialFilters });
  const [images, setImages] = useState<ContentImage[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Guards against a stale response (from a filter change that's since been
  // superseded) landing after a newer request and overwriting fresher results.
  const requestIdRef = useRef(0);

  const runInitialLoad = useCallback(async (activeFilters: ContentLibraryFilters) => {
    const requestId = ++requestIdRef.current;
    setLoading(true);
    setError(null);
    try {
      const page = await listImages({
        search: activeFilters.search || undefined,
        categoryId: activeFilters.categoryId ?? undefined,
        sort: activeFilters.sort,
        limit: PAGE_SIZE,
        cursor: null,
      });
      if (requestIdRef.current !== requestId) return;
      setImages(page.items);
      setCursor(page.nextCursor);
    } catch (e) {
      if (requestIdRef.current !== requestId) return;
      setError(e instanceof Error ? e.message : 'Failed to load images.');
    } finally {
      if (requestIdRef.current === requestId) setLoading(false);
    }
  }, []);

  useEffect(() => {
    runInitialLoad(filters);
  }, [filters, runInitialLoad]);

  const loadMore = useCallback(async () => {
    if (loading || loadingMore || cursor === null) return;
    const requestId = requestIdRef.current;
    setLoadingMore(true);
    try {
      const page = await listImages({
        search: filters.search || undefined,
        categoryId: filters.categoryId ?? undefined,
        sort: filters.sort,
        limit: PAGE_SIZE,
        cursor,
      });
      if (requestIdRef.current !== requestId) return;
      setImages((prev) => [...prev, ...page.items]);
      setCursor(page.nextCursor);
    } catch (e) {
      if (requestIdRef.current !== requestId) return;
      setError(e instanceof Error ? e.message : 'Failed to load more images.');
    } finally {
      if (requestIdRef.current === requestId) setLoadingMore(false);
    }
  }, [cursor, filters, loading, loadingMore]);

  const retry = useCallback(() => {
    runInitialLoad(filters);
  }, [filters, runInitialLoad]);

  const setSearch = useCallback((search: string) => setFilters((f) => ({ ...f, search })), []);
  const setCategoryId = useCallback((categoryId: string | null) => setFilters((f) => ({ ...f, categoryId })), []);
  const setSort = useCallback((sort: SortOrder) => setFilters((f) => ({ ...f, sort })), []);

  return {
    images,
    loading,
    loadingMore,
    error,
    hasMore: cursor !== null,
    filters,
    setSearch,
    setCategoryId,
    setSort,
    loadMore,
    retry,
  };
}

export function useContentCategories() {
  const [categories, setCategories] = useState<CategoryNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const cats = await listCategories();
      setCategories(cats);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load categories.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { categories, loading, error, retry: load };
}
