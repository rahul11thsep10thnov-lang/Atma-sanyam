import { PrismaClient, SourceType } from "@prisma/client";
import { NewsSourceProvider } from "./NewsSourceProvider";
import { logger } from "../../lib/logger";

export class IngestionService {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Fetches from every registered provider and persists new articles as
   * RawArticle rows (idempotent on sourceId + externalId, or on URL when a
   * provider has no external id). Does not run any AI — that happens in
   * later pipeline stages, kept separate so ingestion stays cheap and fast.
   */
  async ingestFrom(providers: NewsSourceProvider[]): Promise<{ inserted: number; skipped: number }> {
    let inserted = 0;
    let skipped = 0;

    for (const provider of providers) {
      const source = await this.prisma.newsSource.upsert({
        where: { providerKey: provider.key },
        update: {},
        create: {
          providerKey: provider.key,
          name: provider.displayName,
          homepageUrl: "",
          sourceType: inferSourceType(provider.key),
        },
      });

      if (source.isBlacklisted) {
        logger.info({ provider: provider.key }, "Skipping blacklisted source");
        continue;
      }

      const articles = await provider.fetchLatest();
      for (const article of articles) {
        const externalId = article.externalId ?? article.url;
        try {
          await this.prisma.rawArticle.create({
            data: {
              sourceId: source.id,
              externalId,
              url: article.url,
              headline: article.headline,
              publishedAt: article.publishedAt,
              rawSummary: article.summary,
              language: article.language ?? "en",
            },
          });
          inserted += 1;
        } catch (error) {
          // Unique constraint violation (sourceId, externalId) => already ingested.
          skipped += 1;
        }
      }
    }

    logger.info({ inserted, skipped }, "Ingestion cycle complete");
    return { inserted, skipped };
  }
}

function inferSourceType(providerKey: string): SourceType {
  if (providerKey.startsWith("rss-")) return "RSS";
  if (providerKey === "mock") return "MANUAL";
  return "NEWS_API";
}
