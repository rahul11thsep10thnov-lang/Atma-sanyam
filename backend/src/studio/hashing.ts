import { createHash } from "node:crypto";

/** Deterministic JSON serialisation (sorted keys) so equal content hashes equally. */
export function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value ?? null);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, v]) => v !== undefined)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${stableStringify(v)}`).join(",")}}`;
}

/** Content hash used for every cache key in the Studio (assets, audio, renders, AI calls). */
export function contentHash(...parts: unknown[]): string {
  const hash = createHash("sha256");
  for (const part of parts) hash.update(typeof part === "string" ? part : stableStringify(part)).update("\u0000");
  return hash.digest("hex").slice(0, 32);
}
