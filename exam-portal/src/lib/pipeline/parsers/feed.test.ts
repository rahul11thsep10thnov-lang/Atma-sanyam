import { describe, it, expect } from "vitest";
import { parseFeed, parseSitemap } from "./feed";

const RSS = `<?xml version="1.0"?><rss version="2.0"><channel><title>UPSC</title>
<item><title>Civil Services (Preliminary) Examination, 2027 — Notification</title><link>https://upsc.gov.in/notice/cse-2027.pdf</link><pubDate>Wed, 04 Feb 2027 10:00:00 GMT</pubDate><description>Apply online till 24-02-2027</description></item>
<item><title>Engineering Services Result</title><link>https://upsc.gov.in/result/ese</link></item>
</channel></rss>`;

const ATOM = `<?xml version="1.0"?><feed xmlns="http://www.w3.org/2005/Atom">
<entry><title>Admit Card — NDA I 2027</title><link rel="alternate" href="https://upsc.gov.in/admit/nda-1-2027"/><updated>2027-03-01T09:00:00Z</updated></entry>
</feed>`;

describe("parseFeed", () => {
  it("reads RSS items with dates and summaries, and handles a single item", () => {
    const items = parseFeed(RSS);
    expect(items).toHaveLength(2);
    expect(items[0]).toMatchObject({
      url: "https://upsc.gov.in/notice/cse-2027.pdf",
      isPdf: true,
      summary: "Apply online till 24-02-2027",
    });
    expect(items[0].publishedAt?.toISOString()).toBe("2027-02-04T10:00:00.000Z");
    expect(items[1].publishedAt).toBeNull();
    const single = parseFeed(RSS.replace(/<item>Engineering[\s\S]*?<\/item>/, "").replace("<item><title>Engineering Services Result</title><link>https://upsc.gov.in/result/ese</link></item>", ""));
    expect(single.length).toBeGreaterThanOrEqual(1);
  });

  it("reads Atom entries", () => {
    const items = parseFeed(ATOM);
    expect(items).toHaveLength(1);
    expect(items[0].url).toBe("https://upsc.gov.in/admit/nda-1-2027");
    expect(items[0].title).toContain("NDA");
    expect(items[0].publishedAt?.toISOString()).toBe("2027-03-01T09:00:00.000Z");
  });

  it("returns an empty list for non-feed XML", () => {
    expect(parseFeed("<html><body>nope</body></html>")).toEqual([]);
  });
});

describe("parseSitemap", () => {
  it("keeps recruitment-looking URLs and PDFs only", () => {
    const items = parseSitemap(`<urlset><url><loc>https://x.gov.in/recruitment/constable-2027</loc><lastmod>2027-01-01</lastmod></url><url><loc>https://x.gov.in/about-us</loc></url><url><loc>https://x.gov.in/files/notice.pdf</loc></url></urlset>`);
    expect(items.map((i) => i.url)).toEqual([
      "https://x.gov.in/recruitment/constable-2027",
      "https://x.gov.in/files/notice.pdf",
    ]);
    expect(items[0].publishedAt?.toISOString().slice(0, 10)).toBe("2027-01-01");
  });
});
