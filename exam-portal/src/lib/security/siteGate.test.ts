import { describe, it, expect } from "vitest";
import { checkSiteGate } from "./siteGate";

const basic = (user: string, pw: string) => `Basic ${btoa(`${user}:${pw}`)}`;

describe("private-preview gate", () => {
  it("does nothing when no password is configured", () => {
    expect(checkSiteGate({ pathname: "/jobs", authorization: null, password: undefined })).toBe("allow");
    expect(checkSiteGate({ pathname: "/jobs", authorization: null, password: "" })).toBe("allow");
  });

  it("asks for the password on public pages, with any user name", () => {
    expect(checkSiteGate({ pathname: "/", authorization: null, password: "s3cret" })).toBe("challenge");
    expect(checkSiteGate({ pathname: "/jobs", authorization: basic("x", "wrong"), password: "s3cret" })).toBe("challenge");
    expect(checkSiteGate({ pathname: "/jobs", authorization: basic("anyone", "s3cret"), password: "s3cret" })).toBe("allow");
    expect(checkSiteGate({ pathname: "/jobs", authorization: basic("", "pass:with:colons"), password: "pass:with:colons" })).toBe("allow");
  });

  it("rejects malformed or non-Basic headers", () => {
    expect(checkSiteGate({ pathname: "/", authorization: "Bearer abc", password: "s3cret" })).toBe("challenge");
    expect(checkSiteGate({ pathname: "/", authorization: "Basic !!!not-base64", password: "s3cret" })).toBe("challenge");
  });

  it("leaves admin, webhook, cron and robots.txt to their own protection", () => {
    for (const p of ["/admin", "/admin/login", "/admin/automation/sources", "/api/payments/razorpay/webhook", "/api/admin/pipeline/run", "/robots.txt"]) {
      expect(checkSiteGate({ pathname: p, authorization: null, password: "s3cret" })).toBe("allow");
    }
    expect(checkSiteGate({ pathname: "/administrator", authorization: null, password: "s3cret" })).toBe("challenge");
  });
});
