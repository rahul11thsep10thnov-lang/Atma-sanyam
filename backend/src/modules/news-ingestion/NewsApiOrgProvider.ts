import { NewsSourceProvider, RawArticleDTO } from "./NewsSourceProvider";
import { env } from "../../config/env";
import { logger } from "../../lib/logger";

/**
 * Family-dispute-oriented search terms used to keep the ingestion query
 * scoped at the source. This is a coarse pre-filter only — the real
 * relevance decision happens in the classification module (§5); this just
 * avoids pulling in obviously unrelated general news at fetch time.
 */
const FAMILY_NEWS_QUERY =
  '("family dispute" OR "property dispute" OR "domestic violence" OR "husband" OR "in-laws" OR "dowry" OR "family feud" OR "inheritance dispute") AND India';

interface NewsApiOrgArticle {
  url: string;
  title: string;
  description?: string;
  content?: string;
  publishedAt: string;
}

interface NewsApiOrgResponse {
  status: string;
  articles: NewsApiOrgArticle[];
}

/**
 * Adapter for NewsAPI.org-style REST APIs. Any similarly-shaped licensed
 * news API can reuse this pattern; swap the fetch/parse logic if the
 * concrete vendor differs.
 */
export class NewsApiOrgProvider implements NewsSourceProvider {
  readonly key = "newsapi-org";
  readonly displayName = "NewsAPI.org";

  async fetchLatest(): Promise<RawArticleDTO[]> {
    if (!env.newsApiOrgKey) {
      logger.warn("NEWS_API_ORG_KEY not set — skipping NewsApiOrgProvider fetch");
      return [];
    }

    const url = new URL(`${env.newsApiOrgBaseUrl}/everything`);
    url.searchParams.set("q", FAMILY_NEWS_QUERY);
    url.searchParams.set("language", "en");
    url.searchParams.set("sortBy", "publishedAt");
    url.searchParams.set("pageSize", "100");
    url.searchParams.set("apiKey", env.newsApiOrgKey);

    const response = await fetch(url.toString());
    if (!response.ok) {
      logger.error({ status: response.status }, "NewsAPI.org request failed");
      return [];
    }

    const data = (await response.json()) as NewsApiOrgResponse;
    return (data.articles ?? []).map((article) => ({
      url: article.url,
      headline: article.title,
      publishedAt: new Date(article.publishedAt),
      summary: article.description ?? article.content ?? "",
      language: "en",
    }));
  }
}
