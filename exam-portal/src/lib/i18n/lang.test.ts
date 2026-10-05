import { describe, it, expect } from "vitest";
import { resolveLang } from "./lang";

describe("resolveLang", () => {
  it("is always English — there is no language switch", async () => {
    expect(await resolveLang("hi")).toBe("en");
    expect(await resolveLang(undefined)).toBe("en");
  });
});
