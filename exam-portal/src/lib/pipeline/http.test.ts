import { describe, it, expect, beforeEach } from "vitest";
import { fetchUrl, FetchError, _resetThrottle, USER_AGENT, describeNetworkError } from "./http";

const noSleep = async () => {};

function fakeFetch(responses: Array<() => Response>, calls: RequestInit[] = []) {
  let i = 0;
  const impl = (async (_url: string | URL | Request, init?: RequestInit) => {
    calls.push(init ?? {});
    const next = responses[Math.min(i, responses.length - 1)];
    i += 1;
    return next();
  }) as unknown as typeof fetch;
  return impl;
}

describe("fetchUrl", () => {
  beforeEach(() => _resetThrottle());

  it("sends a truthful User-Agent and conditional headers", async () => {
    const calls: RequestInit[] = [];
    await fetchUrl("https://x.gov.in/n", {
      fetchImpl: fakeFetch([() => new Response("ok", { status: 200, headers: { etag: '"e2"' } })], calls),
      etag: '"e1"',
      lastModified: "Mon, 01 Jan 2027 00:00:00 GMT",
      sleep: noSleep,
    });
    const headers = calls[0].headers as Record<string, string>;
    expect(headers["User-Agent"]).toBe(USER_AGENT);
    expect(headers["If-None-Match"]).toBe('"e1"');
    expect(headers["If-Modified-Since"]).toBe("Mon, 01 Jan 2027 00:00:00 GMT");
  });

  it("treats 304 as not-modified without a body", async () => {
    const res = await fetchUrl("https://x.gov.in/n", {
      fetchImpl: fakeFetch([() => new Response(null, { status: 304 })]),
      etag: '"e1"',
      sleep: noSleep,
    });
    expect(res.notModified).toBe(true);
    expect(res.body.length).toBe(0);
    expect(res.etag).toBe('"e1"');
  });

  it("retries 503 with backoff and succeeds", async () => {
    const calls: RequestInit[] = [];
    const res = await fetchUrl("https://x.gov.in/n", {
      fetchImpl: fakeFetch([() => new Response("busy", { status: 503 }), () => new Response("fine", { status: 200 })], calls),
      sleep: noSleep,
      retries: 2,
    });
    expect(res.status).toBe(200);
    expect(res.body.toString()).toBe("fine");
    expect(calls).toHaveLength(2);
  });

  it("does not retry a 404 and throws a FetchError with the status", async () => {
    const calls: RequestInit[] = [];
    await expect(
      fetchUrl("https://x.gov.in/missing", { fetchImpl: fakeFetch([() => new Response("", { status: 404 })], calls), sleep: noSleep }),
    ).rejects.toMatchObject({ status: 404 });
    expect(calls).toHaveLength(1);
  });

  it("gives up after the retry budget on network errors", async () => {
    const impl = (async () => {
      throw new Error("ECONNRESET");
    }) as unknown as typeof fetch;
    await expect(fetchUrl("https://x.gov.in/n", { fetchImpl: impl, sleep: noSleep, retries: 1 })).rejects.toBeInstanceOf(FetchError);
  });

  it("refuses oversized responses", async () => {
    await expect(
      fetchUrl("https://x.gov.in/big", { fetchImpl: fakeFetch([() => new Response("x".repeat(100))]), maxBytes: 10, sleep: noSleep }),
    ).rejects.toThrow(/too large/);
  });
});

describe("describeNetworkError", () => {
  it("surfaces the real cause behind fetch failed", () => {
    const e = new TypeError("fetch failed", { cause: Object.assign(new Error("unable to verify the first certificate"), { code: "UNABLE_TO_VERIFY_LEAF_SIGNATURE" }) });
    expect(describeNetworkError(e)).toMatch(/UNABLE_TO_VERIFY_LEAF_SIGNATURE.*chain is incomplete/);
    const r = new TypeError("fetch failed", { cause: Object.assign(new Error("read ECONNRESET"), { code: "ECONNRESET" }) });
    expect(describeNetworkError(r)).toMatch(/bot block/);
    expect(describeNetworkError(new Error("plain"))).toBe("plain");
  });
});
