import "server-only";
import { createHash } from "node:crypto";

/** SHA-256 of the uploaded bytes — stored so a re-upload of the exact
 * same file is detectable, and so the file's integrity can be verified
 * later (Section 19: "checksum/hash where useful"). */
export function sha256(buffer: Buffer): string {
  return createHash("sha256").update(buffer).digest("hex");
}
