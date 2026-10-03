import "@/lib/cms/server-guard";
import { getSecret } from "../../secrets";
import { failureStatus, getJson } from "../http";
import { cleanPlaceName } from "../quality";
import type { Found, ProviderAdapter, ProviderResponse, Query, Subject } from "../types";

/**
 * Pixabay through the official API (key kept server-side). Responses are
 * cached for 24 hours as the API terms require. Pixabay does not allow
 * permanent hotlinking: its URLs are only used to show candidates in the
 * review screen, and an approved image is downloaded to our own storage when
 * the destination is finalised.
 */

interface Hit {
  id: number; pageURL: string; type: string; tags: string; previewURL: string; webformatURL: string; largeImageURL: string;
  imageWidth: number; imageHeight: number; user: string; user_id: number;
}

export const pixabay: ProviderAdapter = {
  id: "pixabay",
  needsKey: true,
  supportsGeo: false,
  queries(s: Subject) {
    const a = cleanPlaceName(s.name);
    const c = cleanPlaceName(s.city);
    if (s.kind === "destination") return [`${c} India`, c];
    return [`${a} ${c}`, `${c} India`];
  },
  async search(q: Query): Promise<ProviderResponse> {
    const key = getSecret("pixabay");
    if (!key) return { status: "NOT_CONFIGURED", http_status: null, note: "No Pixabay API key", items: [] };
    if (q.kind !== "text") return { status: "NO_RESULTS", http_status: null, note: "geo search not supported", items: [] };
    const params = `q=${encodeURIComponent(q.text.slice(0, 100))}&image_type=photo&safesearch=true&per_page=20&lang=en&order=popular`;
    const r = await getJson<{ totalHits?: number; hits?: Hit[] }>(`https://pixabay.com/api/?key=${encodeURIComponent(key)}&${params}`, { cacheKey: `pixabay:${params}` });
    if (!r.ok) return { status: failureStatus(r.status, r.error), http_status: r.status || null, note: r.error, items: [] };
    const now = new Date().toISOString();
    const items: Found[] = (r.data?.hits ?? []).map((h) => ({
      image: {
        id: `pb-${h.id}`,
        provider: "pixabay",
        provider_image_id: String(h.id),
        url: h.largeImageURL,
        thumbnail_url: h.webformatURL,
        preview_url: h.largeImageURL,
        original_url: h.largeImageURL,
        source: "Pixabay",
        source_page_url: h.pageURL,
        photographer: h.user,
        photographer_url: `https://pixabay.com/users/${encodeURIComponent(h.user)}-${h.user_id}/`,
        license: "Pixabay Content License",
        license_url: "https://pixabay.com/service/license-summary/",
        attribution_required: false,
        attribution_text: `Image by ${h.user} from Pixabay`,
        description: h.tags,
        download_status: "NOT_DOWNLOADED",
        local_path: null,
        approval_status: "PENDING",
        caption: null,
        alt: h.tags.split(",").slice(0, 4).join(", ").trim() || q.text,
        width: h.imageWidth,
        height: h.imageHeight,
        latitude: null,
        longitude: null,
        hotlink_required: false,
        source_query: q.text,
        discovered_at: now,
        retrieved_at: now,
        sort_order: 0
      },
      text: h.tags,
      mime: null,
      hardReject: h.type !== "photo" ? `NOT_A_PHOTO: Pixabay type "${h.type}"` : null,
      distance_m: null,
      quality_mark: false
    }));
    return { status: items.length ? "OK" : "NO_RESULTS", http_status: r.status, note: r.cached ? "cached" : null, items };
  }
};
