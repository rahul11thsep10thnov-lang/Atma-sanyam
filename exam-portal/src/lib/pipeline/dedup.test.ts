import { describe, it, expect } from "vitest";
import { canonicalizeUrl } from "./dedup";

describe("canonicalizeUrl", () => {
  it("ignores scheme, www, case, tracking params, fragments and trailing slashes", () => {
    expect(canonicalizeUrl("HTTP://WWW.ssc.gov.in/Notice.pdf?utm_source=x&b=2&a=1#top")).toBe("ssc.gov.in/Notice.pdf?a=1&b=2");
    expect(canonicalizeUrl("https://ssc.gov.in/Notice.pdf?a=1&b=2")).toBe("ssc.gov.in/Notice.pdf?a=1&b=2");
    expect(canonicalizeUrl("https://uppbpb.gov.in/")).toBe("uppbpb.gov.in/");
    expect(canonicalizeUrl("https://uppbpb.gov.in/files/")).toBe("uppbpb.gov.in/files");
    expect(canonicalizeUrl("http://127.0.0.1:4567/files/x.pdf")).toBe("127.0.0.1:4567/files/x.pdf");
    expect(canonicalizeUrl(null)).toBeNull();
    expect(canonicalizeUrl("not a url")).toBe("not a url");
  });
});
