/**
 * A fetched article before any AI processing. Only factual metadata and a
 * short extract are kept — never the full copyrighted article body
 * (ARCHITECTURE.md §9 / docs/LEGAL_AND_PRIVACY.md).
 */
export interface RawArticleDTO {
  /** Provider's own article id, when available — used for idempotent re-fetches. */
  externalId?: string;
  url: string;
  headline: string;
  publishedAt: Date;
  /** Short factual extract (a few sentences / the API's own summary field) — not the full body. */
  summary: string;
  language?: string;
}

/**
 * Every news source (a licensed API, an RSS feed, a future provider) implements
 * this interface. The ingestion service and the rest of the pipeline only ever
 * depend on this contract, so a new provider can be registered without
 * touching any downstream code (ARCHITECTURE.md §6).
 */
export interface NewsSourceProvider {
  /** Unique key used to register this provider and to key it in NewsSource.providerKey. */
  readonly key: string;
  readonly displayName: string;
  fetchLatest(): Promise<RawArticleDTO[]>;
}
