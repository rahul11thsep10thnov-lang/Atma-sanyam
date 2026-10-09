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

describe("fetchUrl reliability rules", () => {
  beforeEach(() => _resetThrottle());

  it("never retries a 403 and reports it as blocked", async () => {
    const calls: RequestInit[] = [];
    const err = await fetchUrl("https://x.gov.in/n", { fetchImpl: fakeFetch([() => new Response("no", { status: 403 })], calls), sleep: noSleep, retries: 3 }).catch((e) => e);
    expect(err).toBeInstanceOf(FetchError);
    expect(err.kind).toBe("blocked");
    expect(err.transient).toBe(false);
    expect(calls).toHaveLength(1);
  });

  it("waits out a short Retry-After on 429 and then succeeds", async () => {
    const waits: number[] = [];
    const res = await fetchUrl("https://x.gov.in/n", {
      fetchImpl: fakeFetch([() => new Response("slow down", { status: 429, headers: { "retry-after": "2" } }), () => new Response("ok")]),
      sleep: async (ms) => void waits.push(ms),
      minHostIntervalMs: 0,
    });
    expect(res.status).toBe(200);
    expect(waits).toContain(2000);
  });

  it("stops on a long Retry-After and hands the delay to the scheduler", async () => {
    const calls: RequestInit[] = [];
    const err = await fetchUrl("https://x.gov.in/n", {
      fetchImpl: fakeFetch([() => new Response("", { status: 503, headers: { "retry-after": "3600" } })], calls),
      sleep: noSleep,
    }).catch((e) => e);
    expect(err.kind).toBe("rate_limited");
    expect(err.retryAfterMs).toBe(3_600_000);
    expect(calls).toHaveLength(1);
  });

  it("gives up on persistent 5xx after the retry budget, as a transient error", async () => {
    const calls: RequestInit[] = [];
    const err = await fetchUrl("https://x.gov.in/n", { fetchImpl: fakeFetch([() => new Response("", { status: 502 })], calls), sleep: noSleep, retries: 2 }).catch((e) => e);
    expect(calls).toHaveLength(3);
    expect(err.transient).toBe(true);
    expect(err.message).toMatch(/502/);
  });

  it("times out a hanging request and reports kind=timeout", async () => {
    const hang = ((_u: string, init?: RequestInit) =>
      new Promise((_r, reject) => init?.signal?.addEventListener("abort", () => reject(Object.assign(new Error("aborted"), { name: "AbortError" }))))) as unknown as typeof fetch;
    const err = await fetchUrl("https://x.gov.in/n", { fetchImpl: hang, timeoutMs: 20, retries: 1, sleep: noSleep }).catch((e) => e);
    expect(err.kind).toBe("timeout");
    expect(err.message).toMatch(/Timed out after 20 ms/);
  });

  it("follows redirects hop by hop and reports the final URL", async () => {
    const seen: string[] = [];
    const impl = (async (u: string) => {
      seen.push(String(u));
      if (String(u).endsWith("/old")) return new Response(null, { status: 301, headers: { location: "/new" } });
      return new Response("here");
    }) as unknown as typeof fetch;
    const res = await fetchUrl("https://x.gov.in/old", { fetchImpl: impl, sleep: noSleep });
    expect(res.finalUrl).toBe("https://x.gov.in/new");
    expect(res.redirects).toEqual(["https://x.gov.in/new"]);
    expect(seen).toEqual(["https://x.gov.in/old", "https://x.gov.in/new"]);
  });

  it("refuses a redirect into a private network before sending anything there", async () => {
    const prev = process.env.PIPELINE_ALLOW_PRIVATE_HOSTS;
    process.env.PIPELINE_ALLOW_PRIVATE_HOSTS = "false";
    try {
      const seen: string[] = [];
      const impl = (async (u: string) => {
        seen.push(String(u));
        return new Response(null, { status: 302, headers: { location: "http://169.254.169.254/latest/meta-data/" } });
      }) as unknown as typeof fetch;
      const err = await fetchUrl("https://x.gov.in/a", { fetchImpl: impl, sleep: noSleep }).catch((e) => e);
      expect(err.kind).toBe("redirect");
      expect(err.message).toMatch(/private or reserved/);
      expect(seen).toEqual(["https://x.gov.in/a"]);
    } finally {
      process.env.PIPELINE_ALLOW_PRIVATE_HOSTS = prev;
    }
  });

  it("stops redirect loops and applies the caller's redirect policy", async () => {
    const loop = (async () => new Response(null, { status: 302, headers: { location: "/again" } })) as unknown as typeof fetch;
    await expect(fetchUrl("https://x.gov.in/a", { fetchImpl: loop, sleep: noSleep, maxRedirects: 3 })).rejects.toThrow(/Too many redirects/);
    const away = (async () => new Response(null, { status: 302, headers: { location: "https://elsewhere.example.com/" } })) as unknown as typeof fetch;
    await expect(
      fetchUrl("https://x.gov.in/a", { fetchImpl: away, sleep: noSleep, allowRedirect: (_f, to) => (to.hostname.endsWith("gov.in") ? null : "off-site") }),
    ).rejects.toThrow(/off-site/);
  });

  it("refuses non-http schemes and private hosts up front", async () => {
    const prev = process.env.PIPELINE_ALLOW_PRIVATE_HOSTS;
    process.env.PIPELINE_ALLOW_PRIVATE_HOSTS = "false";
    try {
      const never = (async () => {
        throw new Error("must not be called");
      }) as unknown as typeof fetch;
      await expect(fetchUrl("file:///etc/passwd", { fetchImpl: never })).rejects.toMatchObject({ kind: "invalid_url" });
      await expect(fetchUrl("http://127.0.0.1:5432/", { fetchImpl: never })).rejects.toMatchObject({ kind: "invalid_url" });
    } finally {
      process.env.PIPELINE_ALLOW_PRIVATE_HOSTS = prev;
    }
  });

  it("keeps at most one request in flight per domain", async () => {
    let inFlight = 0;
    let peak = 0;
    const impl = (async () => {
      inFlight += 1;
      peak = Math.max(peak, inFlight);
      await new Promise((r) => setTimeout(r, 15));
      inFlight -= 1;
      return new Response("ok");
    }) as unknown as typeof fetch;
    await Promise.all([1, 2, 3].map(() => fetchUrl("https://same.gov.in/x", { fetchImpl: impl, minHostIntervalMs: 0 })));
    expect(peak).toBe(1);
  });
});

describe("backoff helpers", () => {
  it("grows exponentially with jitter inside the window", async () => {
    const { backoffDelay, parseRetryAfter } = await import("./http");
    expect(backoffDelay(1, () => 0)).toBe(500);
    expect(backoffDelay(1, () => 1)).toBe(1000);
    expect(backoffDelay(3, () => 0.5)).toBe(3000);
    expect(backoffDelay(10, () => 1)).toBe(15000); // capped
    expect(parseRetryAfter("120")).toBe(120_000);
    expect(parseRetryAfter(new Date(Date.now() + 60_000).toUTCString(), Date.now())).toBeGreaterThan(55_000);
    expect(parseRetryAfter("soon")).toBeNull();
  });
});
