import "@/lib/cms/server-guard";
import { chmodSync, existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

/**
 * Server-only API keys. Environment variables win; keys entered in
 * Admin → Image Providers are stored in data/cms/secrets.json, which is
 * git-ignored and never sent to the browser — the console only ever learns
 * whether a key is configured.
 */

export const SECRET_ENV = {
  google_places: "GOOGLE_PLACES_API_KEY",
  pixabay: "PIXABAY_API_KEY",
  unsplash: "UNSPLASH_ACCESS_KEY",
  pexels: "PEXELS_API_KEY"
} as const;
export type SecretName = keyof typeof SECRET_ENV;
export const SECRET_NAMES = Object.keys(SECRET_ENV) as SecretName[];

const FILE = join(process.cwd(), "data", "cms", "secrets.json");

function readAll(): Partial<Record<SecretName, string>> {
  try {
    return existsSync(FILE) ? (JSON.parse(readFileSync(FILE, "utf8")) as Partial<Record<SecretName, string>>) : {};
  } catch {
    return {};
  }
}

export function getSecret(name: SecretName): string | null {
  const env = process.env[SECRET_ENV[name]];
  if (env && env.trim()) return env.trim();
  const v = readAll()[name];
  return v && v.trim() ? v.trim() : null;
}

export interface SecretStatus {
  configured: boolean;
  source: "environment" | "saved" | null;
}

export function secretStatus(name: SecretName): SecretStatus {
  if (process.env[SECRET_ENV[name]]?.trim()) return { configured: true, source: "environment" };
  return readAll()[name]?.trim() ? { configured: true, source: "saved" } : { configured: false, source: null };
}

/** Saves (or with null, removes) a key. Values are trimmed and length-limited; nothing else is stored. */
export function setSecret(name: SecretName, value: string | null) {
  const all = readAll();
  if (value && value.trim()) all[name] = value.trim().slice(0, 300);
  else delete all[name];
  if (!existsSync(dirname(FILE))) mkdirSync(dirname(FILE), { recursive: true });
  const tmp = `${FILE}.${process.pid}.tmp`;
  writeFileSync(tmp, JSON.stringify(all, null, 2) + "\n", { encoding: "utf8", mode: 0o600 });
  renameSync(tmp, FILE);
  try {
    chmodSync(FILE, 0o600);
  } catch {
    /* Windows: permissions are managed by the OS */
  }
}
