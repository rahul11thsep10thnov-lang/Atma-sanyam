import "@/lib/cms/server-guard";
import { fetchJson, nowIso } from "../http";
import type { CmsImage, SiteSettings, SourceRef } from "../../types";

/**
 * Image candidate collectors. Each returns openly licensed photographs with
 * their licence, creator and attribution text recorded on the candidate — the
 * admin approves from this evidence, and a licence is never assumed.
 *
 * - Wikimedia Commons: no key; only CC / public-domain files are kept.
 * - Unsplash, Pexels, Pixabay: API keys required (env first, then settings).
 */

const FREE_LICENSE = /^(cc|public domain|pd|cc0|gfdl|attribution)/i;

const mk = (partial: Partial<CmsImage> & Pick<CmsImage, "id" | "url" | "source" | "alt">): CmsImage => ({
  thumbnail_url: null, direct_url: null, source_page_url: null, photographer: null, license: null, license_url: null,
  attribution_required: true, attribution_text: null, download_status: "NOT_DOWNLOADED", local_path: null,
  approval_status: "CANDIDATE", caption: null, width: null, height: null, retrieved_at: nowIso(), sort_order: 0,
  ...partial
});

export interface ImageSearchResult {
  images: CmsImage[];
  sources: SourceRef[];
}

interface CommonsPage {
  title: string;
  imageinfo?: Array<{
    url: string; descriptionurl: string; thumburl?: string; width?: number; height?: number; mime?: string;
    extmetadata?: Record<string, { value: string }>;
  }>;
}

export async function commonsSearch(query: string, limit: number): Promise<ImageSearchResult> {
  const url = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(`${query} filetype:bitmap`)}&gsrnamespace=6&gsrlimit=${Math.min(limit * 2, 30)}&prop=imageinfo&iiprop=url|extmetadata|size|mime&iiurlwidth=640&format=json`;
  const r = await fetchJson<{ query?: { pages?: Record<string, CommonsPage> } }>(url, {}, 20000);
  const src: SourceRef = { label: "Wikimedia Commons", url: `https://commons.wikimedia.org/w/index.php?search=${encodeURIComponent(query)}&ns6=1`, retrieved_at: nowIso(), status: r.ok ? "OK" : "SOURCE_UNAVAILABLE", note: r.ok ? undefined : r.error ?? undefined };
  if (!r.ok || !r.data?.query?.pages) return { images: [], sources: [src] };
  const images: CmsImage[] = [];
  for (const p of Object.values(r.data.query.pages)) {
    const info = p.imageinfo?.[0];
    if (!info || !/^image\/(jpeg|png|webp)$/.test(info.mime ?? "")) continue;
    const meta = info.extmetadata ?? {};
    const license = meta.LicenseShortName?.value ?? meta.License?.value ?? null;
    if (!license || !FREE_LICENSE.test(license)) continue; // non-free or unknown licence: never a candidate
    const artist = meta.Artist?.value ? meta.Artist.value.replace(/<[^>]+>/g, "").trim() : null;
    const credit = meta.Credit?.value ? meta.Credit.value.replace(/<[^>]+>/g, "").trim() : null;
    const attributionRequired = meta.AttributionRequired?.value !== "false" && !/public domain|cc0/i.test(license);
    images.push(mk({
      id: `commons-${Buffer.from(p.title).toString("base64url").slice(0, 40)}`,
      url: info.url,
      direct_url: info.url,
      thumbnail_url: info.thumburl ?? info.url,
      source: "Wikimedia Commons",
      source_page_url: info.descriptionurl,
      photographer: artist,
      license,
      license_url: meta.LicenseUrl?.value ?? null,
      attribution_required: attributionRequired,
      attribution_text: attributionRequired ? [artist ?? credit, license].filter(Boolean).join(", ") : null,
      alt: p.title.replace(/^File:/, "").replace(/\.[a-z]+$/i, "").replace(/_/g, " "),
      caption: meta.ImageDescription?.value ? meta.ImageDescription.value.replace(/<[^>]+>/g, "").trim().slice(0, 200) : null,
      width: info.width ?? null,
      height: info.height ?? null
    }));
    if (images.length >= limit) break;
  }
  return { images, sources: [src] };
}

export async function unsplashSearch(query: string, limit: number, key: string): Promise<ImageSearchResult> {
  const r = await fetchJson<{ results?: Array<{ id: string; urls: { regular: string; small: string; raw: string }; links: { html: string }; user: { name: string; links: { html: string } }; alt_description?: string; width: number; height: number }> }>(
    `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=${limit}&orientation=landscape`,
    { headers: { Authorization: `Client-ID ${key}`, "Accept-Version": "v1" } }
  );
  const src: SourceRef = { label: "Unsplash", url: `https://unsplash.com/s/photos/${encodeURIComponent(query)}`, retrieved_at: nowIso(), status: r.ok ? "OK" : "SOURCE_UNAVAILABLE", note: r.ok ? undefined : r.error ?? undefined };
  const images = (r.data?.results ?? []).map((p) => mk({
    id: `unsplash-${p.id}`, url: p.urls.regular, direct_url: p.urls.regular, thumbnail_url: p.urls.small, source: "Unsplash", source_page_url: p.links.html,
    photographer: p.user.name, license: "Unsplash License", license_url: "https://unsplash.com/license", attribution_required: true,
    attribution_text: `Photo by ${p.user.name} on Unsplash`, alt: p.alt_description ?? query, width: p.width, height: p.height
  }));
  return { images, sources: [src] };
}

export async function pexelsSearch(query: string, limit: number, key: string): Promise<ImageSearchResult> {
  const r = await fetchJson<{ photos?: Array<{ id: number; url: string; photographer: string; photographer_url: string; alt?: string; width: number; height: number; src: { large: string; medium: string } }> }>(
    `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=${limit}&orientation=landscape`,
    { headers: { Authorization: key } }
  );
  const src: SourceRef = { label: "Pexels", url: `https://www.pexels.com/search/${encodeURIComponent(query)}/`, retrieved_at: nowIso(), status: r.ok ? "OK" : "SOURCE_UNAVAILABLE", note: r.ok ? undefined : r.error ?? undefined };
  const images = (r.data?.photos ?? []).map((p) => mk({
    id: `pexels-${p.id}`, url: p.src.large, direct_url: p.src.large, thumbnail_url: p.src.medium, source: "Pexels", source_page_url: p.url,
    photographer: p.photographer, license: "Pexels License", license_url: "https://www.pexels.com/license/", attribution_required: false,
    attribution_text: `Photo by ${p.photographer} on Pexels`, alt: p.alt ?? query, width: p.width, height: p.height
  }));
  return { images, sources: [src] };
}

export async function pixabaySearch(query: string, limit: number, key: string): Promise<ImageSearchResult> {
  const r = await fetchJson<{ hits?: Array<{ id: number; pageURL: string; user: string; largeImageURL: string; webformatURL: string; tags: string; imageWidth: number; imageHeight: number }> }>(
    `https://pixabay.com/api/?key=${encodeURIComponent(key)}&q=${encodeURIComponent(query)}&image_type=photo&orientation=horizontal&per_page=${Math.max(3, limit)}&safesearch=true`
  );
  const src: SourceRef = { label: "Pixabay", url: `https://pixabay.com/images/search/${encodeURIComponent(query)}/`, retrieved_at: nowIso(), status: r.ok ? "OK" : "SOURCE_UNAVAILABLE", note: r.ok ? undefined : r.error ?? undefined };
  const images = (r.data?.hits ?? []).slice(0, limit).map((p) => mk({
    id: `pixabay-${p.id}`, url: p.largeImageURL, direct_url: p.largeImageURL, thumbnail_url: p.webformatURL, source: "Pixabay", source_page_url: p.pageURL,
    photographer: p.user, license: "Pixabay Content License", license_url: "https://pixabay.com/service/license-summary/", attribution_required: false,
    attribution_text: `Image by ${p.user} on Pixabay`, alt: p.tags || query, width: p.imageWidth, height: p.imageHeight
  }));
  return { images, sources: [src] };
}

export function imageKeys(settings: SiteSettings) {
  return {
    unsplash: process.env.UNSPLASH_ACCESS_KEY || settings.unsplash_access_key || null,
    pexels: process.env.PEXELS_API_KEY || settings.pexels_api_key || null,
    pixabay: process.env.PIXABAY_API_KEY || settings.pixabay_api_key || null
  };
}

/** Collects ~N candidates for one subject from every enabled source, Commons first (real photographs of the actual place). */
export async function collectImageCandidates(subject: string, placeContext: string, settings: SiteSettings): Promise<ImageSearchResult> {
  const want = Math.max(1, Math.min(settings.images_per_attraction || 10, 20));
  const keys = imageKeys(settings);
  const query = `${subject} ${placeContext}`.trim();
  const out: ImageSearchResult = { images: [], sources: [] };
  const take = (r: ImageSearchResult) => {
    out.sources.push(...r.sources);
    for (const img of r.images) if (out.images.length < want && !out.images.some((x) => x.url === img.url)) out.images.push(img);
  };
  if (settings.image_sources.wikimedia_commons) take(await commonsSearch(query, want));
  if (out.images.length < want && settings.image_sources.unsplash && keys.unsplash) take(await unsplashSearch(query, want - out.images.length, keys.unsplash));
  if (out.images.length < want && settings.image_sources.pexels && keys.pexels) take(await pexelsSearch(query, want - out.images.length, keys.pexels));
  if (out.images.length < want && settings.image_sources.pixabay && keys.pixabay) take(await pixabaySearch(query, want - out.images.length, keys.pixabay));
  out.images = out.images.map((img, i) => ({ ...img, sort_order: i }));
  return out;
}
