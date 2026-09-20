import { NewsSourceProvider } from "./NewsSourceProvider";
import { NewsApiOrgProvider } from "./NewsApiOrgProvider";
import { RssFeedProvider } from "./RssFeedProvider";
import { MockProvider } from "./MockProvider";
import { env } from "../../config/env";

/**
 * Central place where NewsSourceProvider implementations are registered.
 * Adding a new source (another licensed API, another RSS feed) means
 * adding one line here — the ingestion service and pipeline never change.
 */
export function buildProviderRegistry(): NewsSourceProvider[] {
  const providers: NewsSourceProvider[] = [];

  if (env.newsApiOrgKey) {
    providers.push(new NewsApiOrgProvider());
  }

  for (const feedUrl of env.rssFeedUrls) {
    providers.push(new RssFeedProvider(feedUrl));
  }

  if (providers.length === 0) {
    // Development/test fallback so the pipeline is always runnable.
    providers.push(new MockProvider());
  }

  return providers;
}
