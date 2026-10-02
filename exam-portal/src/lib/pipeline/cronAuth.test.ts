import { describe, it, expect } from "vitest";
import { cronAuthorized } from "./cronAuth";

const h = (o: Record<string, string>) => new Headers(o);

describe("cronAuthorized", () => {
  it("accepts the exact secret as Bearer or x-cron-secret and nothing else", () => {
    expect(cronAuthorized(h({ authorization: "Bearer s3cret" }), "s3cret")).toBe(true);
    expect(cronAuthorized(h({ "x-cron-secret": "s3cret" }), "s3cret")).toBe(true);
    expect(cronAuthorized(h({ authorization: "Bearer s3cre" }), "s3cret")).toBe(false);
    expect(cronAuthorized(h({ authorization: "Bearer s3cretX" }), "s3cret")).toBe(false);
    expect(cronAuthorized(h({ authorization: "s3cret" }), "s3cret")).toBe(false);
    expect(cronAuthorized(h({}), "s3cret")).toBe(false);
  });
  it("is closed when no secret is configured", () => {
    expect(cronAuthorized(h({ authorization: "Bearer " }), "")).toBe(false);
    expect(cronAuthorized(h({ authorization: "Bearer anything" }), undefined)).toBe(false);
  });
});
