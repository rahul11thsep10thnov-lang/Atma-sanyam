import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { env } from "../config/env";

const LOCAL_STORAGE_ROOT = path.join(process.cwd(), "storage");

/**
 * Minimal object-storage abstraction. The local-disk implementation below
 * is what runs in development/tests; swap this module's internals for an
 * S3-compatible client (e.g. Cloudflare R2, AWS S3) in production by
 * pointing STORAGE_ENDPOINT/credentials at a real bucket and replacing
 * writeFile/publicUrl with the S3 SDK equivalents. Nothing outside this
 * file needs to change (modules only call saveBuffer/publicUrlFor).
 */
export async function saveBuffer(key: string, data: Buffer): Promise<string> {
  if (env.storage.endpoint) {
    throw new Error("Remote object storage not yet wired up — set STORAGE_ENDPOINT only once an S3 client is configured.");
  }

  const filePath = path.join(LOCAL_STORAGE_ROOT, key);
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, data);
  return publicUrlFor(key);
}

export function publicUrlFor(key: string): string {
  return `${env.storage.publicBaseUrl.replace(/\/$/, "")}/${key}`;
}

export function localStorageRoot(): string {
  return LOCAL_STORAGE_ROOT;
}

/** Resolves a storage key to its on-disk path (local-storage implementation only). */
export function localPathFor(key: string): string {
  return path.join(LOCAL_STORAGE_ROOT, key);
}
