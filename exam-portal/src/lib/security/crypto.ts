import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

/** AES-256-GCM for small identity fields (last four Aadhaar digits).
 * Key: IDENTITY_ENCRYPTION_KEY (32 bytes, base64). In development only, a
 * key is derived from NEXTAUTH_SECRET so the flow works locally. */
function key(): Buffer {
  const raw = process.env.IDENTITY_ENCRYPTION_KEY;
  if (raw) {
    const k = Buffer.from(raw, "base64");
    if (k.length !== 32) throw new Error("IDENTITY_ENCRYPTION_KEY must be 32 bytes, base64-encoded (openssl rand -base64 32).");
    return k;
  }
  if (process.env.NODE_ENV === "production") throw new Error("IDENTITY_ENCRYPTION_KEY is required in production.");
  return createHash("sha256").update(`dev-identity:${process.env.NEXTAUTH_SECRET ?? "dev"}`).digest();
}

export function encryptField(plain: string): string {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", key(), iv);
  const ct = Buffer.concat([c.update(plain, "utf8"), c.final()]);
  return ["v1", iv.toString("base64"), c.getAuthTag().toString("base64"), ct.toString("base64")].join(".");
}

export function decryptField(blob: string): string {
  const [v, iv, tag, ct] = blob.split(".");
  if (v !== "v1") throw new Error("Unknown ciphertext version");
  const d = createDecipheriv("aes-256-gcm", key(), Buffer.from(iv, "base64"));
  d.setAuthTag(Buffer.from(tag, "base64"));
  return Buffer.concat([d.update(Buffer.from(ct, "base64")), d.final()]).toString("utf8");
}

export const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");
