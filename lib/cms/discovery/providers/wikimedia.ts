import "@/lib/cms/server-guard";
import { failureStatus, getJson } from "../http";
import { cleanPlaceName } from "../quality";
import type { Found, ProviderAdapter, ProviderResponse, Query, Subject } from "../types";

/**
 * Wikimedia Commons through the official MediaWiki API (no key — Commons is
 * open to all API clients that identify themselves). Never scrapes HTML.
 * Text search over the File: namespace plus geosearch around the subject's
 * coordinates; licence, creator, attribution, description, categories and
 * camera location come from the file's extmetadata. Only openly licensed
 * files (CC BY / CC BY-SA / CC0 / public domain) are usable.
 */

const API = "https://commons.wikimedia.org/w/api.php";
const PROPS = [
  "action=query", "format=json", "formatversion=2", "maxlag=5", "prop=imageinfo|coordinates",
  "iiprop=url|size|mime|extmetadata", "iiurlwidth=480", "iiextmetadatalanguage=en",
  "iiextmetadatafilter=LicenseShortName|LicenseUrl|Artist|Credit|AttributionRequired|ImageDescription|Categories|ObjectName|NonFree|Copyrighted"
].join("&");

const FREE = /^(cc[ -]?by|cc[ -]?zero|cc0|cc[ -]?pd|public domain|pdm|pd[ -]|attribution$)/i;

interface Page {
  pageid?: number;
  title: string;
  coordinates?: Array<{ lat: number; lon: number }>;
  imageinfo?: Array<{
    url: string; descriptionurl: string; thumburl?: string; width?: number; height?: number; mime?: string;
    extmetadata?: Record<string, { value: string } | undefined>;
  }>;
}
interface Resp {
  query?: { pages?: Page[] };
  error?: { code: string; info: string };
}

const strip = (html: string | undefined) => (html ?? "").replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#0?39;/g, "'").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
const firstHref = (html: string | undefined) => {
  const m = (html ?? "").match(/href="([^"]+)"/);
  if (!m) return null;
  const u = m[1].startsWith("//") ? `https:${m[1]}` : m[1].startsWith("/") ? `https://commons.wikimedia.org${m[1]}` : m[1];
  return /^https?:\/\//.test(u) ? u : null;
};

function toFound(p: Page, q: Query, center: { lat: number; lon: number } | null): Found | null {
  const info = p.imageinfo?.[0];
  if (!info) return null;
  const meta = info.extmetadata ?? {};
  const v = (k: string) => meta[k]?.value;
  const license = strip(v("LicenseShortName")) || null;
  const nonFree = v("NonFree") === "true" || (license !== null && !FREE.test(license));
  const artist = strip(v("Artist")) || null;
  const pd = /public domain|cc0|cc[ -]?zero|pdm/i.test(license ?? "");
  const attributionRequired = v("AttributionRequired") === "true" || (!pd && v("AttributionRequired") !== "false");
  const title = p.title.replace(/^File:/, "").replace(/\.[a-z0-9]+$/i, "").replace(/_/g, " ");
  const description = strip(v("ImageDescription")).slice(0, 400) || null;
  const categories = strip(v("Categories")).replace(/\|/g, " · ");
  const coord = p.coordinates?.[0] ?? null;
  const thumb = info.thumburl ?? info.url;
  const preview = info.thumburl && (info.width ?? 0) > 1280 ? info.thumburl.replace(/\/\d+px-/, "/1280px-") : info.url;
  let distance: number | null = null;
  if (center && coord) {
    const dLat = (coord.lat - center.lat) * 111320;
    const dLon = (coord.lon - center.lon) * 111320 * Math.cos((center.lat * Math.PI) / 180);
    distance = Math.round(Math.sqrt(dLat * dLat + dLon * dLon));
  }
  const id = String(p.pageid ?? title);
  return {
    image: {
      id: `wm-${id}`,
      provider: "wikimedia",
      provider_image_id: id,
      url: info.url,
      thumbnail_url: thumb,
      preview_url: preview,
      original_url: info.url,
      source: "Wikimedia Commons",
      source_page_url: info.descriptionurl,
      photographer: artist,
      photographer_url: firstHref(v("Artist")),
      license,
      license_url: v("LicenseUrl") ?? null,
      attribution_required: attributionRequired,
      attribution_text: attributionRequired ? `${artist ?? strip(v("Credit")) ?? "Unknown author"}, ${license}, via Wikimedia Commons` : null,
      description,
      download_status: "NOT_DOWNLOADED",
      local_path: null,
      approval_status: "PENDING",
      caption: description ? description.slice(0, 200) : null,
      alt: title,
      width: info.width ?? null,
      height: info.height ?? null,
      latitude: coord?.lat ?? null,
      longitude: coord?.lon ?? null,
      hotlink_required: false,
      source_query: q.kind === "text" ? q.text : `geo:${q.lat.toFixed(4)},${q.lon.toFixed(4)}`,
      discovered_at: new Date().toISOString(),
      retrieved_at: new Date().toISOString(),
      sort_order: 0
    },
    text: [title, strip(v("ObjectName")), description ?? "", categories].join(" \n "),
    mime: info.mime ?? null,
    hardReject: !license ? null : nonFree ? `NON_FREE: ${license}` : null,
    distance_m: q.kind === "geo" ? distance : null,
    quality_mark: /featured pictures|quality images|valued images/i.test(categories)
  };
}

export const wikimedia: ProviderAdapter = {
  id: "wikimedia",
  needsKey: false,
  supportsGeo: true,
  queries(s: Subject) {
    const a = cleanPlaceName(s.name);
    const c = cleanPlaceName(s.city);
    if (s.kind === "destination") return [`${c} ${s.state ?? ""}`.trim(), `${c} India`, c];
    return [`${a} ${c}`, a, s.state ? `${a} ${s.state}` : null, `${c} India`].filter((x): x is string => Boolean(x));
  },
  async search(q: Query): Promise<ProviderResponse> {
    const url = q.kind === "text"
      ? `${API}?${PROPS}&generator=search&gsrnamespace=6&gsrlimit=20&gsrsearch=${encodeURIComponent(`${q.text} filetype:bitmap`)}`
      : `${API}?${PROPS}&generator=geosearch&ggsnamespace=6&ggslimit=20&ggsradius=${q.radius_m}&ggscoord=${q.lat}|${q.lon}`;
    const r = await getJson<Resp>(url);
    if (!r.ok) return { status: failureStatus(r.status, r.error), http_status: r.status || null, note: r.error, items: [] };
    if (r.data?.error) return { status: r.data.error.code === "maxlag" ? "PROVIDER_UNAVAILABLE" : "ERROR", http_status: r.status, note: `${r.data.error.code}: ${r.data.error.info}`.slice(0, 200), items: [] };
    const center = q.kind === "geo" ? { lat: q.lat, lon: q.lon } : null;
    const items = (r.data?.query?.pages ?? []).map((p) => toFound(p, q, center)).filter((x): x is Found => Boolean(x));
    return { status: items.length ? "OK" : "NO_RESULTS", http_status: r.status, note: r.cached ? "cached" : null, items };
  }
};
