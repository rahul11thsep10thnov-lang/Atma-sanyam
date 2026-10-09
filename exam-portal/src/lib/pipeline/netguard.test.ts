import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { isBlockedAddress, validateFetchUrl, guardedLookup, redactUrl, siteOf, sameSite, isOfficialHost, BlockedUrlError } from "./netguard";

// vitest.config enables PIPELINE_ALLOW_PRIVATE_HOSTS for loopback test
// servers; these tests switch it off to exercise the real guard.
let saved: string | undefined;
beforeEach(() => {
  saved = process.env.PIPELINE_ALLOW_PRIVATE_HOSTS;
  process.env.PIPELINE_ALLOW_PRIVATE_HOSTS = "false";
});
afterEach(() => {
  process.env.PIPELINE_ALLOW_PRIVATE_HOSTS = saved;
});

describe("isBlockedAddress", () => {
  it.each([
    "127.0.0.1", "127.8.9.10", "10.1.2.3", "172.16.0.1", "172.31.255.255", "192.168.1.1", "169.254.169.254", "100.64.0.1", "0.0.0.0", "224.0.0.1", "255.255.255.255", "198.18.0.5",
    "::1", "::", "fe80::1", "fc00::1", "fd12:3456::1", "::ffff:127.0.0.1", "::ffff:10.0.0.1", "64:ff9b::a9fe:a9fe", "ff02::1", "2001:db8::1", "not-an-ip",
  ])("blocks %s", (ip) => expect(isBlockedAddress(ip)).toBe(true));

  it.each(["164.100.1.1", "8.8.8.8", "172.32.0.1", "100.128.0.1", "2404:6800:4009::200e", "::ffff:164.100.1.1"])("allows public %s", (ip) =>
    expect(isBlockedAddress(ip)).toBe(false),
  );
});

describe("validateFetchUrl", () => {
  it("accepts ordinary public http(s) URLs and drops the fragment", () => {
    expect(validateFetchUrl("https://ssc.gov.in/notices#top").toString()).toBe("https://ssc.gov.in/notices");
    expect(validateFetchUrl("http://psc.example.gov.in:8080/x").port).toBe("8080");
  });

  it.each([
    ["file:///etc/passwd", /Only http/],
    ["ftp://x.gov.in/a", /Only http/],
    ["javascript:alert(1)", /Only http/],
    ["https://user:pw@x.gov.in/", /credentials/],
    ["http://localhost/", /not a public host/],
    ["http://intranet/", /not a public host/],
    ["http://printer.local/", /not a public host/],
    ["http://127.0.0.1/", /private or reserved/],
    ["http://[::1]/", /private or reserved/],
    ["http://169.254.169.254/latest/meta-data/", /private or reserved/],
    ["http://2130706433/", /private or reserved/], // decimal 127.0.0.1, normalised by WHATWG URL
    ["https://x.gov.in:22/", /Port 22/],
    ["not a url", /Not a valid URL/],
  ])("refuses %s", (url, why) => {
    expect(() => validateFetchUrl(url)).toThrow(BlockedUrlError);
    expect(() => validateFetchUrl(url)).toThrow(why);
  });
});

describe("guardedLookup (connection-time DNS check)", () => {
  it("refuses a name that resolves to loopback", async () => {
    const err = await new Promise<NodeJS.ErrnoException | null>((resolve) => guardedLookup("localhost", {}, (e) => resolve(e)));
    expect(err?.code).toBe("ESSRFBLOCKED");
  });
});

describe("helpers", () => {
  it("redacts credentials and secret-looking parameters", () => {
    expect(redactUrl("https://u:p@x.gov.in/a?token=abc&page=2&api_key=z")).toBe("https://x.gov.in/a?token=REDACTED&page=2&api_key=REDACTED");
  });

  it("knows Indian second-level zones when comparing sites", () => {
    expect(siteOf("www.rrbcdg.gov.in")).toBe("rrbcdg.gov.in");
    expect(siteOf("cisfrectt.cisf.gov.in")).toBe("cisfrectt.cisf.gov.in"); // gov.in subdomains are separate bodies
    expect(siteOf("bpsc.bihar.gov.in")).not.toBe(siteOf("bssc.bihar.gov.in"));
    expect(siteOf("www.ibps.in")).toBe("ibps.in");
    expect(siteOf("univ.example.ac.in")).toBe("example.ac.in");
    expect(siteOf("www.sarkariresult.com.cm")).toBe("sarkariresult.com.cm");
    expect(sameSite("https://ssc.gov.in/a", "https://www.ssc.gov.in/b")).toBe(true);
    expect(sameSite("https://ssc.gov.in/a", "https://upsc.gov.in/b")).toBe(false);
    expect(sameSite("https://sarkariresult.com.cm/", "https://sarkariresult.com/")).toBe(false);
  });

  it("recognises official hosts and an explicit allowlist", () => {
    expect(isOfficialHost("bpsc.bihar.gov.in")).toBe(true);
    expect(isOfficialHost("joinindianarmy.nic.in")).toBe(true);
    expect(isOfficialHost("www.ibps.in")).toBe(false);
    expect(isOfficialHost("www.ibps.in", ["ibps.in"])).toBe(true);
    expect(isOfficialHost("evilibps.in", ["ibps.in"])).toBe(false);
  });
});
