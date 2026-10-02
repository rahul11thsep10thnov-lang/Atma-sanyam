import { describe, it, expect } from "vitest";
import { extractCandidates, htmlToText, parseIndianDate } from "./html";

const LISTING = `
<html><head><title>Notice Board</title></head><body>
<nav><a href="/about">About Us</a><a href="/contact">Contact</a></nav>
<table class="notices">
  <tr><td>12-01-2027</td><td><a href="/pdf/cgl-2027-notice.pdf">Combined Graduate Level Examination 2027 – Notification</a></td></tr>
  <tr><td>15 Jan 2027</td><td><a href="admit/cgl-tier1.html">Admit Card for Tier-I</a></td></tr>
  <tr><td></td><td><a href="/pdf/holiday-list.pdf">Holiday list 2027</a></td></tr>
  <tr><td></td><td><a href="https://other.gov.in/result.php?id=9">Result of Stenographer Grade C</a></td></tr>
  <tr><td></td><td><a href="/pdf/cgl-2027-notice.pdf">(duplicate link)</a></td></tr>
  <tr><td></td><td><a href="javascript:void(0)">Open menu</a></td></tr>
</table>
<div id="footer"><a href="/sitemap.xml">Sitemap notice</a></div>
</body></html>`;

describe("extractCandidates", () => {
  it("keeps PDFs and keyword links, drops navigation noise and duplicates", () => {
    const items = extractCandidates(LISTING, "https://ssc.gov.in/home/notice-board");
    const urls = items.map((i) => i.url);
    expect(urls).toContain("https://ssc.gov.in/pdf/cgl-2027-notice.pdf");
    expect(urls).toContain("https://ssc.gov.in/home/admit/cgl-tier1.html");
    expect(urls).toContain("https://ssc.gov.in/pdf/holiday-list.pdf"); // every PDF is a candidate
    expect(urls).toContain("https://other.gov.in/result.php?id=9");
    expect(urls).not.toContain("https://ssc.gov.in/about");
    expect(urls.filter((u) => u.endsWith("cgl-2027-notice.pdf"))).toHaveLength(1);
    expect(items.some((i) => i.url.startsWith("javascript:"))).toBe(false);
  });

  it("marks PDFs and picks up a nearby date", () => {
    const items = extractCandidates(LISTING, "https://ssc.gov.in/");
    const notice = items.find((i) => i.url.endsWith("cgl-2027-notice.pdf"))!;
    expect(notice.isPdf).toBe(true);
    expect(notice.publishedAt?.toISOString().slice(0, 10)).toBe("2027-01-12");
    const admit = items.find((i) => i.url.includes("admit/"))!;
    expect(admit.isPdf).toBe(false);
    expect(admit.publishedAt?.toISOString().slice(0, 10)).toBe("2027-01-15");
  });

  it("honours a CSS hint to scope the search", () => {
    const items = extractCandidates(LISTING, "https://ssc.gov.in/", "table.notices");
    expect(items.some((i) => i.url.endsWith("sitemap.xml"))).toBe(false);
    expect(items.length).toBe(4);
  });
});

describe("parseIndianDate", () => {
  it.each([
    ["Last date 24-02-2027", "2027-02-24"],
    ["on 05/03/2027", "2027-03-05"],
    ["released 15 January 2027", "2027-01-15"],
    ["2027-01-31", "2027-01-31"],
    ["1.4.2027", "2027-04-01"],
  ])("%s → %s", (input, expected) => {
    expect(parseIndianDate(input)?.toISOString().slice(0, 10)).toBe(expected);
  });

  it("returns null for junk and out-of-range values", () => {
    expect(parseIndianDate("no date here")).toBeNull();
    expect(parseIndianDate("99-99-2027")).toBeNull();
  });
});

describe("htmlToText", () => {
  it("drops scripts, styles and chrome, keeps the content", () => {
    const text = htmlToText(
      "<html><body><nav>Menu</nav><script>x()</script><style>p{}</style><main><h1>Vacancies: 120</h1><p>Apply by  10-10-2027</p></main></body></html>",
    );
    expect(text).toContain("Vacancies: 120");
    expect(text).toContain("Apply by 10-10-2027");
    expect(text).not.toContain("Menu");
    expect(text).not.toContain("x()");
  });
});
