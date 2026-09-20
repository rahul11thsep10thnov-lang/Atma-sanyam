import { XMLParser } from "fast-xml-parser";
import { NewsSourceProvider, RawArticleDTO } from "./NewsSourceProvider";
import { logger } from "../../lib/logger";

interface RssItem {
  link?: string;
  title?: string;
  description?: string;
  pubDate?: string;
  guid?: string | { "#text": string };
}

/**
 * Generic RSS/Atom provider for any publisher feed that permits
 * syndication under its terms (ARCHITECTURE.md §9). One instance per feed
 * URL so each can carry its own NewsSource record / license notes.
 */
export class RssFeedProvider implements NewsSourceProvider {
  readonly key: string;
  readonly displayName: string;
  private readonly feedUrl: string;

  constructor(feedUrl: string, displayName?: string) {
    this.feedUrl = feedUrl;
    this.key = `rss-${new URL(feedUrl).hostname}`;
    this.displayName = displayName ?? new URL(feedUrl).hostname;
  }

  async fetchLatest(): Promise<RawArticleDTO[]> {
    try {
      const response = await fetch(this.feedUrl);
      if (!response.ok) {
        logger.error({ feedUrl: this.feedUrl, status: response.status }, "RSS feed fetch failed");
        return [];
      }
      const xml = await response.text();
      const parser = new XMLParser({ ignoreAttributes: false });
      const parsed = parser.parse(xml);

      const items: RssItem[] =
        parsed?.rss?.channel?.item ?? parsed?.feed?.entry ?? [];
      const itemList = Array.isArray(items) ? items : [items];

      return itemList
        .filter((item) => item?.link || item?.title)
        .map((item) => {
          const guid =
            typeof item.guid === "string" ? item.guid : item.guid?.["#text"];
          return {
            externalId: guid,
            url: item.link ?? "",
            headline: item.title ?? "",
            publishedAt: item.pubDate ? new Date(item.pubDate) : new Date(),
            summary: (item.description ?? "").replace(/<[^>]+>/g, "").trim(),
            language: "en",
          };
        });
    } catch (error) {
      logger.error({ err: error, feedUrl: this.feedUrl }, "Failed to parse RSS feed");
      return [];
    }
  }
}
