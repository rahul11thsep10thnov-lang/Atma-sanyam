import { describe, it, expect } from "vitest";
import { fixture } from "../__fixtures__/sources/load";
import { extractConfiguredCandidates, findNextPageUrl, officialLinksIn } from "./html";
import { parseFeed } from "./feed";
import { parseJsonListing } from "./json";
import { readParserConfig, readPaginationConfig } from "./config";

const BASE = "https://psc.example.gov.in/notices";

describe("HTML listing parser", () => {
  it("generic scan: PDFs and recruitment links, resolves relative URLs, skips mailto/javascript", () => {
    const items = extractConfiguredCandidates(fixture("psc-notice-board-page1.html"), BASE, {});
    const urls = items.map((i) => i.url);
    expect(urls).toContain("https://psc.example.gov.in/uploads/advt-12-2026.pdf");
    expect(urls).toContain("https://psc.example.gov.in/admit-card/css-2026");
    expect(urls.some((u) => u.startsWith("mailto:") || u.startsWith("javascript:"))).toBe(false);
    expect(urls).not.toContain("https://psc.example.gov.in/about-us");
  });

  it("per-site config: one candidate per row with title and date from their own cells, exclude pattern applied", () => {
    const items = extractConfiguredCandidates(fixture("psc-notice-board-page1.html"), BASE, {
      itemSelector: "table.notices tbody tr",
      titleSelector: "td:nth-child(2)",
      dateSelector: "td:first-child",
      excludeUrlPattern: "/tender/",
      keywordFilter: false,
    });
    expect(items.map((i) => i.title)).toEqual([
      "Advertisement No. 12/2026 — Recruitment of Assistant Engineer (Civil)",
      "Admit Card for Combined State Services Prelims 2026",
      "Correction window for online application — Lecturer 2026",
    ]);
    expect(items[0].publishedAt?.toISOString().slice(0, 10)).toBe("2026-10-05");
    expect(items[1].publishedAt?.toISOString().slice(0, 10)).toBe("2026-10-03");
    expect(items[2].publishedAt?.toISOString().slice(0, 10)).toBe("2026-10-01");
    expect(items[0].isPdf).toBe(true);
    expect(items[1].isPdf).toBe(false);
  });

  it("sameSiteOnly keeps an aggregator on its own site", () => {
    const items = extractConfiguredCandidates(fixture("aggregator-home.html"), "https://www.sarkariresult.com.cm/", { sameSiteOnly: true, keywordFilter: false });
    expect(items.every((i) => new URL(i.url).hostname.endsWith("sarkariresult.com.cm"))).toBe(true);
    expect(items.map((i) => i.url)).toContain("https://www.sarkariresult.com.cm/ssc-cgl-2026/");
  });

  it("a JavaScript-only page yields nothing (the check must call that EMPTY, not healthy)", () => {
    expect(extractConfiguredCandidates(fixture("empty-js-app.html"), BASE, {})).toEqual([]);
  });

  it("finds the next page by link text, rel=next or an explicit selector", () => {
    expect(findNextPageUrl(fixture("psc-notice-board-page1.html"), BASE)).toBe("https://psc.example.gov.in/notices?page=2");
    expect(findNextPageUrl(fixture("psc-notice-board-page2.html"), "https://psc.example.gov.in/notices?page=2")).toBeNull();
    expect(findNextPageUrl(`<link rel="next" href="/p/3">`, BASE)).toBe("https://psc.example.gov.in/p/3");
    expect(findNextPageUrl(`<div class="pg"><a href="?page=9">9</a></div>`, BASE, ".pg")).toBe("https://psc.example.gov.in/notices?page=9");
  });

  it("recovers official notice links from an aggregator write-up, PDFs first, ignoring social links", () => {
    expect(officialLinksIn(fixture("aggregator-post.html"), "https://www.sarkariresult.com.cm/ssc-cgl-2026/")).toEqual([
      "https://ssc.gov.in/api/attachment/uploads/cgl-2026-notice.pdf",
      "https://ssc.gov.in/login",
      "https://ssc.gov.in/",
    ]);
  });
});

describe("feeds", () => {
  it("RSS 2.0 with relative links and dates", () => {
    const items = parseFeed(fixture("feed.rss.xml"), "https://board.example.gov.in/rss.xml");
    expect(items).toHaveLength(2);
    expect(items[0]).toMatchObject({ url: "https://board.example.gov.in/files/constable-2026.pdf", isPdf: true });
    expect(items[1].url).toBe("https://board.example.gov.in/notices/exam-calendar-2027");
    expect(items[0].publishedAt?.toISOString()).toBe("2026-10-05T04:30:00.000Z");
  });

  it("Atom picks the alternate link and published/updated dates", () => {
    const items = parseFeed(fixture("feed.atom.xml"));
    expect(items.map((i) => i.url)).toEqual(["https://univ.example.ac.in/recruitment/ap-2026", "https://univ.example.ac.in/files/interview.pdf"]);
    expect(items[0].publishedAt?.toISOString()).toBe("2026-10-04T08:00:00.000Z");
  });
});

describe("JSON listing", () => {
  it("reads the configured path and fields, skipping items without a safe URL", () => {
    const items = parseJsonListing(fixture("notices.json"), "https://health.example.gov.in/api/notices", { itemsPath: "data.notices", urlField: "link", titleField: "heading" });
    expect(items.map((i) => i.url)).toEqual(["https://health.example.gov.in/docs/staff-nurse-2026.pdf", "https://health.example.gov.in/results/lt-2026"]);
    expect(items[0].publishedAt?.toISOString().slice(0, 10)).toBe("2026-10-06");
  });

  it("explains a wrong path instead of guessing", () => {
    expect(() => parseJsonListing(fixture("notices.json"), "https://x.gov.in/", { itemsPath: "data.items" })).toThrow(/not an array/);
  });
});

describe("parser/pagination configuration", () => {
  it("rejects unknown fields, bad regexes and templates without {page}", () => {
    expect(readParserConfig({ selector: "x" }).error).toMatch(/Invalid parser configuration/);
    expect(readParserConfig({ includeUrlPattern: "(" }).error).toMatch(/regular expression/);
    expect(readParserConfig(null)).toEqual({ config: {}, error: null });
    expect(readPaginationConfig({ type: "pattern", urlTemplate: "https://x.gov.in/p" }).error).toMatch(/\{page\}/);
    expect(readPaginationConfig({ type: "nextLink", maxPages: 50 }).error).toMatch(/Invalid pagination/);
    expect(readPaginationConfig({ type: "nextLink" }).config).toEqual({ type: "nextLink", maxPages: 3 });
  });
});
