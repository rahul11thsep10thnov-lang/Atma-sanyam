import { describe, it, expect } from "vitest";
import { pickLang, withLang } from "./lang";

describe("pickLang / withLang", () => {
  it("prefers the query param, then the cookie, then English", () => {
    expect(pickLang("hi", "en")).toBe("hi");
    expect(pickLang(undefined, "hi")).toBe("hi");
    expect(pickLang("fr", "de")).toBe("en");
    expect(pickLang(null, null)).toBe("en");
  });
  it("appends ?lang=hi only for Hindi", () => {
    expect(withLang("/recruitments", "en")).toBe("/recruitments");
    expect(withLang("/recruitments", "hi")).toBe("/recruitments?lang=hi");
    expect(withLang("/recruitments?category=police", "hi")).toBe("/recruitments?category=police&lang=hi");
  });
});
