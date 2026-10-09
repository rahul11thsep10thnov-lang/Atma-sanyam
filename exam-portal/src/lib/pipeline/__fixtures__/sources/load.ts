import { readFileSync } from "node:fs";
import path from "node:path";

/** Saved pages for deterministic tests (no live third-party sites). */
export function fixture(name: string): string {
  return readFileSync(path.join(import.meta.dirname, name), "utf8");
}
