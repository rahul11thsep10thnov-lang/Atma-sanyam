/** A link discovered on a listing page/feed that may be a notice. */
export interface CandidateItem {
  url: string;
  title: string;
  isPdf: boolean;
  publishedAt?: Date | null;
  summary?: string | null;
}

export type FetchImpl = typeof fetch;
