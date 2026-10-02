import { createHash } from "node:crypto";

/** SHA-256 of a file's bytes — stored so a re-upload or re-fetch of the
 * exact same file is detectable, and so a changed government PDF is
 * noticed as a new version rather than silently overwriting. Shared by
 * the admin upload path and the pipeline (which runs outside Next's
 * bundler, hence no `server-only` marker). */
export function sha256(buffer: Buffer): string {
  return createHash("sha256").update(buffer).digest("hex");
}
