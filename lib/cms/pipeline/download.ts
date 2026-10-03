import "@/lib/cms/server-guard";
import { userAgent } from "../discovery/http";
import { EXT_FOR_TYPE, saveMedia } from "../storage";
import type { CmsImage } from "../types";

const MAX_BYTES = 15 * 1024 * 1024;

/**
 * Copies an approved image into the site's media storage (data/media, served at /media/…),
 * so pages never depend on the provider's servers. Web-size versions are stored
 * (Commons: the 1280px rendition; Pixabay: largeImageURL); the licence and attribution
 * stay on the record. Never used for Unsplash, whose terms require hotlinking.
 */
export async function downloadImage(img: CmsImage, destSlug: string): Promise<CmsImage> {
  if (img.download_status === "DOWNLOADED" || img.download_status === "LOCAL" || img.url.startsWith("/") || img.url.startsWith("placeholder://") || img.hotlink_required) return img;
  const src = img.provider === "wikimedia" ? img.preview_url ?? img.original_url ?? img.url : img.original_url ?? img.url;
  try {
    const res = await fetch(src, { headers: { "User-Agent": userAgent() }, signal: AbortSignal.timeout(30000), cache: "no-store" });
    if (!res.ok) return { ...img, download_status: "FAILED" };
    const type = (res.headers.get("content-type") ?? "").split(";")[0].trim();
    const ext = EXT_FOR_TYPE[type];
    if (!ext) return { ...img, download_status: "FAILED" };
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.byteLength === 0 || buf.byteLength > MAX_BYTES) return { ...img, download_status: "FAILED" };
    const local = saveMedia(destSlug, img.id, ext, buf);
    return { ...img, url: local, local_path: local, download_status: "DOWNLOADED" };
  } catch {
    return { ...img, download_status: "FAILED" };
  }
}
