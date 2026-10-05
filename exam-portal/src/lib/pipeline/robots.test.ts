import { describe, it, expect, beforeEach } from "vitest";
import { parseRobots, isAllowedByRules, checkRobots, _resetRobotsCache } from "./robots";

const ROBOTS = `
User-agent: *
Disallow: /admin/
Disallow: /private
Allow: /private/public-notices/

User-agent: NaukriChayanBot
Disallow: /internal/
`;

describe("robots", () => {
  it("uses our own group when present", () => {
    const rules = parseRobots(ROBOTS);
    expect(isAllowedByRules(rules, "https://x.gov.in/internal/x.pdf")).toBe(false);
    expect(isAllowedByRules(rules, "https://x.gov.in/admin/")).toBe(true); // only in the * group
  });

  it("falls back to * and lets the longest matching Allow win", () => {
    const rules = parseRobots(ROBOTS, "OtherBot");
    expect(isAllowedByRules(rules, "https://x.gov.in/admin/users")).toBe(false);
    expect(isAllowedByRules(rules, "https://x.gov.in/private/x")).toBe(false);
    expect(isAllowedByRules(rules, "https://x.gov.in/private/public-notices/a.pdf")).toBe(true);
    expect(isAllowedByRules(rules, "https://x.gov.in/notices/a.pdf")).toBe(true);
  });

  it("supports wildcards and $ anchors", () => {
    const rules = parseRobots("User-agent: *\nDisallow: /*.php$\nDisallow: /tmp*");
    expect(isAllowedByRules(rules, "https://x/a/b.php")).toBe(false);
    expect(isAllowedByRules(rules, "https://x/a/b.php?x=1")).toBe(true);
    expect(isAllowedByRules(rules, "https://x/tmpfiles/1")).toBe(false);
  });
});

describe("checkRobots", () => {
  beforeEach(() => _resetRobotsCache());

  it("allows everything when robots.txt is missing, blocks when it says so", async () => {
    const fetch404 = (async () => new Response("", { status: 404 })) as unknown as typeof fetch;
    expect((await checkRobots("https://a.gov.in/notices", fetch404)).allowed).toBe(true);

    const fetchBlock = (async () => new Response("User-agent: *\nDisallow: /notices")) as unknown as typeof fetch;
    const blocked = await checkRobots("https://b.gov.in/notices/x.pdf", fetchBlock);
    expect(blocked.allowed).toBe(false);
    expect(blocked.status).toMatch(/blocked/);
  });
});
