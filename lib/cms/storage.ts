import "@/lib/cms/server-guard";
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { extname, join, normalize, sep } from "node:path";

/**
 * Image file storage. Binary files are kept on disk (never in the database),
 * outside public/ so files added at runtime are served in production too:
 * the route app/media/[...path] streams them from here. Set CMS_MEDIA_DIR to
 * point at a mounted volume; swapping this module for S3/R2 keeps the
 * /media/… URLs stored on the records.
 */

export const MEDIA_ROOT = process.env.CMS_MEDIA_DIR || join(process.cwd(), "data", "media");

export const MEDIA_TYPES: Record<string, string> = { ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp" };
export const EXT_FOR_TYPE: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

const safe = (s: string) => s.replace(/[^A-Za-z0-9_-]/g, "_").slice(0, 120);

/** Writes a file under {MEDIA_ROOT}/{folder}/ and returns its public URL (/media/{folder}/{file}). */
export function saveMedia(folder: string, baseName: string, ext: string, data: Buffer): string {
  const dir = join(MEDIA_ROOT, safe(folder));
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  const file = `${safe(baseName)}.${ext.replace(/[^a-z0-9]/gi, "")}`;
  writeFileSync(join(dir, file), data);
  return `/media/${safe(folder)}/${file}`;
}

/** Resolves a /media/… request path to a file inside MEDIA_ROOT, refusing anything that escapes it. */
export function readMedia(parts: string[]): { data: Buffer; type: string; size: number } | null {
  if (!parts.length || parts.some((p) => !p || p === "." || p === ".." || p.includes(sep) || p.includes("/"))) return null;
  const full = normalize(join(MEDIA_ROOT, ...parts));
  if (!full.startsWith(normalize(MEDIA_ROOT + sep))) return null;
  const type = MEDIA_TYPES[extname(full).toLowerCase()];
  if (!type || !existsSync(full)) return null;
  const st = statSync(full);
  if (!st.isFile()) return null;
  return { data: readFileSync(full), type, size: st.size };
}
