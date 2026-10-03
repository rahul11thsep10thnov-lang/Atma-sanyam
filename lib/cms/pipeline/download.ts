import "@/lib/cms/server-guard";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { USER_AGENT } from "./http";
import type { CmsImage } from "../types";

const MAX_BYTES = 15 * 1024 * 1024;
const EXT: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

/**
 * Stores an approved image under public/media/{destination}/ so pages never
 * hot-link a source server. The licence and attribution stay on the record.
 */
export async function downloadImage(img: CmsImage, destSlug: string): Promise<CmsImage> {
  if (img.download_status === "DOWNLOADED" || img.download_status === "LOCAL" || img.url.startsWith("/") || img.url.startsWith("placeholder://")) return img;
  const src = img.direct_url ?? img.url;
  try {
    const res = await fetch(src, { headers: { "User-Agent": USER_AGENT }, signal: AbortSignal.timeout(30000), cache: "no-store" });
    if (!res.ok) return { ...img, download_status: "FAILED" };
    const type = (res.headers.get("content-type") ?? "").split(";")[0].trim();
    const ext = EXT[type];
    if (!ext) return { ...img, download_status: "FAILED" };
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.byteLength === 0 || buf.byteLength > MAX_BYTES) return { ...img, download_status: "FAILED" };
    const dir = join(process.cwd(), "public", "media", destSlug.replace(/[^a-z0-9-]/g, ""));
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    const file = `${img.id.replace(/[^A-Za-z0-9_-]/g, "_")}.${ext}`;
    writeFileSync(join(dir, file), buf);
    const local = `/media/${destSlug}/${file}`;
    return { ...img, download_status: "DOWNLOADED", local_path: local };
  } catch {
    return { ...img, download_status: "FAILED" };
  }
}
