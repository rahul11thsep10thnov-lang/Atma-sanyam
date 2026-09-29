import { describe, it, expect } from "vitest";
import { slugify, uniqueSlug } from "./slug";

describe("slugify", () => {
  it("lowercases, trims, and hyphenates", () => {
    expect(slugify("  SSC CGL 2026 Notification  ")).toBe("ssc-cgl-2026-notification");
  });

  it("collapses runs of non-alphanumeric characters into a single hyphen", () => {
    expect(slugify("Group C / D -- Recruitment!!")).toBe("group-c-d-recruitment");
  });

  it("never leaves a leading or trailing hyphen", () => {
    expect(slugify("---Exam Result 2026---")).toBe("exam-result-2026");
  });

  it("truncates to 200 characters", () => {
    const long = "a".repeat(500);
    expect(slugify(long).length).toBe(200);
  });
});

describe("uniqueSlug", () => {
  it("returns the base slug when it's free", async () => {
    const slug = await uniqueSlug("Clerk Recruitment 2026", async () => false);
    expect(slug).toBe("clerk-recruitment-2026");
  });

  it("appends -2, -3, ... until it finds a free candidate", async () => {
    const taken = new Set(["clerk-recruitment-2026", "clerk-recruitment-2026-2"]);
    const slug = await uniqueSlug("Clerk Recruitment 2026", async (candidate) => taken.has(candidate));
    expect(slug).toBe("clerk-recruitment-2026-3");
  });

  it("falls back to \"item\" when the input slugifies to nothing", async () => {
    const slug = await uniqueSlug("!!!", async () => false);
    expect(slug).toBe("item");
  });
});
