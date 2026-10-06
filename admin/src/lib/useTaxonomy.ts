'use client';

import { useApi } from './api';
import type { ExamNode, Language } from './types';

export function useTaxonomy(includeArchived = false) {
  const t = useApi<{ items: ExamNode[] }>('taxonomy', includeArchived ? { includeArchived: 'true' } : undefined);
  return { tree: t.data?.items ?? [], loading: t.loading, error: t.error, reload: t.reload };
}

export function useLanguages() {
  const l = useApi<{ items: Language[] }>('languages');
  return (l.data?.items ?? []).filter((x) => x.enabled);
}

export const languageName = (code: string) =>
  ({ 'hi-Latn': 'Hinglish', hi: 'Hindi', en: 'English', 'en-hi': 'English + Hindi' })[code] ?? code;
