import "@/lib/cms/server-guard";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { getSecret } from "../../secrets";
import { failureStatus, getJson, userAgent } from "../http";
import { cleanPlaceName } from "../quality";
import type { Found, ProviderAdapter, ProviderResponse, Query, Subject } from "../types";
import type { CmsImage } from "../../types";

/**
 * Unsplash (optional) through the official API with the Access Key kept
 * server-side. Unsplash's API guidelines differ from the other providers and
 * are followed as written:
 *  - images are hotlinked from images.unsplash.com (never downloaded/re-hosted);
 *  - the photo's download_location is called when an admin approves it;
 *  - the photographer and Unsplash are credited with links (UTM parameters);
 *  - Unsplash+ (premium) and sponsored results are not used;
 *  - the hourly rate limit is respected (demo apps: 50 requests/hour) — when
 *    it is exhausted the provider is marked RATE_LIMITED until the hour resets.
 * It is queried last, and only when the free-licence providers did not
 * already supply enough candidates.
 */

const UTM = "utm_source=budgettourism&utm_medium=referral";
const withUtm = (u: string) => `${u}${u.includes("?") ? "&" : "?"}${UTM}`;
const RATE_FILE = join(process.cwd(), "data", "cms", "cache", "unsplash-rate.json");

function rateState(): { remaining: number | null; reset_at: number } {
  try {
    return existsSync(RATE_FILE) ? JSON.parse(readFileSync(RATE_FILE, "utf8")) : { remaining: null, reset_at: 0 };
  } catch {
    return { remaining: null, reset_at: 0 };
  }
}
function saveRate(remaining: number | null) {
  try {
    const dir = join(process.cwd(), "data", "cms", "cache");
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    const now = new Date();
    const reset = new Date(now);
    reset.setMinutes(0, 0, 0);
    reset.setHours(reset.getHours() + 1);
    writeFileSync(RATE_FILE, JSON.stringify({ remaining, reset_at: reset.getTime() }));
  } catch {
    /* best effort */
  }
}

interface Photo {
  id: string; width: number; height: number; description: string | null; alt_description: string | null;
  urls: { raw: string; full: string; regular: string; small: string; thumb: string };
  links: { html: string; download_location: string };
  user: { name: string; username: string; links: { html: string } };
  tags?: Array<{ title: string }>;
  premium?: boolean; plus?: boolean; sponsorship?: unknown;
}

export const unsplash: ProviderAdapter = {
  id: "unsplash",
  needsKey: true,
  supportsGeo: false,
  queries(s: Subject) {
    const a = cleanPlaceName(s.name);
    const c = cleanPlaceName(s.city);
    return s.kind === "destination" ? [`${c} India`] : [`${a} ${c}`];
  },
  async search(q: Query): Promise<ProviderResponse> {
    const key = getSecret("unsplash");
    if (!key) return { status: "NOT_CONFIGURED", http_status: null, note: "No Unsplash Access Key", items: [] };
    if (q.kind !== "text") return { status: "NO_RESULTS", http_status: null, note: "geo search not supported", items: [] };
    const rate = rateState();
    if (rate.remaining !== null && rate.remaining <= 1 && Date.now() < rate.reset_at) return { status: "RATE_LIMITED", http_status: 403, note: `Hourly limit reached — resumes ${new Date(rate.reset_at).toLocaleTimeString()}`, items: [] };
    const params = `query=${encodeURIComponent(q.text)}&per_page=15&orientation=landscape&content_filter=high`;
    const r = await getJson<{ results?: Photo[] }>(`https://api.unsplash.com/search/photos?${params}`, { headers: { Authorization: `Client-ID ${key}`, "Accept-Version": "v1" }, cacheKey: `unsplash:${params}` });
    const remaining = r.headers?.get("x-ratelimit-remaining");
    if (remaining !== null && remaining !== undefined) saveRate(Number(remaining));
    if (!r.ok) {
      if (r.status === 403 && /rate limit/i.test(r.error ?? "")) saveRate(0);
      return { status: failureStatus(r.status, r.error), http_status: r.status || null, note: r.error, items: [] };
    }
    const now = new Date().toISOString();
    const items: Found[] = (r.data?.results ?? []).map((p) => {
      const desc = [p.description, p.alt_description].filter(Boolean).join(" — ") || null;
      return {
        image: {
          id: `us-${p.id}`,
          provider: "unsplash",
          provider_image_id: p.id,
          url: p.urls.regular,
          thumbnail_url: p.urls.small,
          preview_url: p.urls.regular,
          original_url: p.urls.full,
          source: "Unsplash",
          source_page_url: withUtm(p.links.html),
          photographer: p.user.name,
          photographer_url: withUtm(p.user.links.html),
          license: "Unsplash License",
          license_url: "https://unsplash.com/license",
          attribution_required: true,
          attribution_text: `Photo by ${p.user.name} on Unsplash`,
          description: desc,
          download_status: "HOTLINKED",
          local_path: null,
          approval_status: "PENDING",
          caption: null,
          alt: p.alt_description ?? q.text,
          width: p.width,
          height: p.height,
          latitude: null,
          longitude: null,
          hotlink_required: true,
          download_location: p.links.download_location,
          source_query: q.text,
          discovered_at: now,
          retrieved_at: now,
          sort_order: 0
        },
        text: [desc ?? "", (p.tags ?? []).map((t) => t.title).join(" ")].join(" "),
        mime: null,
        hardReject: p.premium || p.plus ? "NON_FREE: Unsplash+ (premium) photo" : p.sponsorship ? "PROVIDER_REJECT: sponsored result" : null,
        distance_m: null,
        quality_mark: false
      };
    });
    return { status: items.length ? "OK" : "NO_RESULTS", http_status: r.status, note: r.cached ? "cached" : null, items };
  }
};

/** Unsplash requires its download endpoint to be called when a photo is used. Returns true when the event was recorded. */
export async function sendUnsplashDownloadEvent(img: CmsImage): Promise<boolean> {
  const key = getSecret("unsplash");
  if (!key || !img.download_location) return false;
  try {
    const res = await fetch(img.download_location, { headers: { Authorization: `Client-ID ${key}`, "Accept-Version": "v1", "User-Agent": userAgent() }, signal: AbortSignal.timeout(15000), cache: "no-store" });
    return res.ok;
  } catch {
    return false;
  }
}
