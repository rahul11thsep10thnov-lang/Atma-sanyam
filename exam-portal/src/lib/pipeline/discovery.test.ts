import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { fixture } from "./__fixtures__/sources/load";
import { proposeSources } from "./discovery";

let saved: string | undefined;
beforeEach(() => {
  saved = process.env.PIPELINE_ALLOW_PRIVATE_HOSTS;
  process.env.PIPELINE_ALLOW_PRIVATE_HOSTS = "false";
});
afterEach(() => {
  process.env.PIPELINE_ALLOW_PRIVATE_HOSTS = saved;
});

describe("proposeSources (controlled discovery)", () => {
  const page = "https://ssc.example.gov.in/";

  it("proposes same-site sections and advertised feeds, never PDFs or the page itself", () => {
    const { proposals } = proposeSources(fixture("official-homepage.html"), page);
    const byUrl = Object.fromEntries(proposals.map((p) => [p.url, p]));
    expect(byUrl["https://ssc.example.gov.in/recruitment"]).toMatchObject({ kind: "section", sourceType: "HTML" });
    expect(byUrl["https://ssc.example.gov.in/results"]).toBeDefined();
    expect(byUrl["https://ssc.example.gov.in/admit-card"]).toBeDefined();
    expect(byUrl["https://ssc.example.gov.in/notice-board"]).toBeDefined();
    expect(byUrl["https://ssc.example.gov.in/rss/notices.xml"]).toMatchObject({ kind: "feed", sourceType: "RSS" });
    expect(proposals.some((p) => p.url.endsWith(".pdf"))).toBe(false);
    expect(byUrl["https://ssc.example.gov.in/about"]).toBeUndefined();
  });

  it("proposes another official authority at its home page only", () => {
    const { proposals } = proposeSources(fixture("official-homepage.html"), page);
    const authority = proposals.find((p) => p.kind === "authority");
    expect(authority?.url).toBe("https://police.example.gov.in/");
    expect(proposals.some((p) => p.url.includes("tourism"))).toBe(false); // official but not an authority link
  });

  it("skips non-official external sites and private/loopback targets (SSRF)", () => {
    const { proposals, skipped } = proposeSources(fixture("official-homepage.html"), page);
    expect(proposals.some((p) => p.url.includes("example-jobs-blog"))).toBe(false);
    expect(proposals.some((p) => p.url.includes("127.0.0.1") || p.url.includes("169.254"))).toBe(false);
    expect(skipped.map((s) => s.reason).join("\n")).toMatch(/non-official/);
    expect(skipped.map((s) => s.reason).join("\n")).toMatch(/private or reserved/);
  });

  it("an aggregator only proposes pages on its own site", () => {
    const { proposals, skipped } = proposeSources(fixture("aggregator-home.html").replace("SSC Official Website", "SSC Recruitment (official)"), "https://www.sarkariresult.com.cm/", { aggregator: true });
    expect(proposals.map((p) => p.url).sort()).toEqual(
      ["admission", "admit-card", "answer-key", "latest-jobs", "result", "syllabus"].map((p) => `https://www.sarkariresult.com.cm/${p}/`).sort(),
    );
    expect(proposals.some((p) => p.url.includes("ssc.gov.in"))).toBe(false);
    expect(skipped.map((s) => s.reason)).toContain("aggregators only propose pages on their own site");
  });
});
