import "@/lib/cms/server-guard";
import { getSecret } from "../../secrets";
import { failureStatus, getJson } from "../http";
import { cleanPlaceName } from "../quality";
import type { Found, ProviderAdapter, ProviderResponse, Query, Subject } from "../types";

/**
 * Pexels through the official API. Disabled by default (no key yet): it is
 * skipped unless an admin enables it in Image Providers and a key is set.
 */

interface Photo { id: number; url: string; width: number; height: number; photographer: string; photographer_url: string; alt?: string; src: { original: string; large2x: string; large: string; medium: string } }

export const pexels: ProviderAdapter = {
  id: "pexels",
  needsKey: true,
  supportsGeo: false,
  queries(s: Subject) {
    const a = cleanPlaceName(s.name);
    const c = cleanPlaceName(s.city);
    return s.kind === "destination" ? [`${c} India`] : [`${a} ${c}`, `${c} India`];
  },
  async search(q: Query): Promise<ProviderResponse> {
    const key = getSecret("pexels");
    if (!key) return { status: "NOT_CONFIGURED", http_status: null, note: "No Pexels API key", items: [] };
    if (q.kind !== "text") return { status: "NO_RESULTS", http_status: null, note: "geo search not supported", items: [] };
    const params = `query=${encodeURIComponent(q.text)}&per_page=15&orientation=landscape`;
    const r = await getJson<{ photos?: Photo[] }>(`https://api.pexels.com/v1/search?${params}`, { headers: { Authorization: key }, cacheKey: `pexels:${params}` });
    if (!r.ok) return { status: failureStatus(r.status, r.error), http_status: r.status || null, note: r.error, items: [] };
    const now = new Date().toISOString();
    const items: Found[] = (r.data?.photos ?? []).map((p) => ({
      image: {
        id: `pe-${p.id}`, provider: "pexels", provider_image_id: String(p.id), url: p.src.large2x, thumbnail_url: p.src.medium, preview_url: p.src.large,
        original_url: p.src.original, source: "Pexels", source_page_url: p.url, photographer: p.photographer, photographer_url: p.photographer_url,
        license: "Pexels License", license_url: "https://www.pexels.com/license/", attribution_required: false, attribution_text: `Photo by ${p.photographer} on Pexels`,
        description: p.alt ?? null, download_status: "NOT_DOWNLOADED", local_path: null, approval_status: "PENDING", caption: null, alt: p.alt || q.text,
        width: p.width, height: p.height, latitude: null, longitude: null, hotlink_required: false, source_query: q.text, discovered_at: now, retrieved_at: now, sort_order: 0
      },
      text: p.alt ?? "",
      mime: null,
      hardReject: null,
      distance_m: null,
      quality_mark: false
    }));
    return { status: items.length ? "OK" : "NO_RESULTS", http_status: r.status, note: r.cached ? "cached" : null, items };
  }
};
