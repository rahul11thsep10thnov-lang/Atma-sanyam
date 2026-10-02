// No `server-only` marker here on purpose: the pipeline worker and tests
// use this storage layer under plain Node, where the marker throws. It is
// Node-only regardless (fs, AWS SDK) and is never imported by client code.
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";

/**
 * Object storage abstraction (Section 19): the rest of the app calls
 * `getDocumentStorage().upload(...)` and never knows or cares whether
 * files land on local disk or in a real bucket. Swapping providers is an
 * environment-variable change, not a code change — never hard-coded to
 * local filesystem storage in the sense the spec warns against, even
 * though the *default* adapter (no `STORAGE_*` vars set) is local disk,
 * clearly marked dev-only below.
 */
export interface UploadedFile {
  /** Public URL the browser can fetch the file from. */
  url: string;
  /** Provider-specific key, needed to delete the file later. */
  key: string;
}

export interface DocumentStorage {
  upload(file: { buffer: Buffer; filename: string; contentType: string }): Promise<UploadedFile>;
  delete(key: string): Promise<void>;
}

/**
 * DEV-ONLY fallback: writes into `public/uploads`, served by Next.js's
 * static file handling. Never used in production — see `getDocumentStorage`
 * below, which requires `STORAGE_*` env vars once `NODE_ENV=production`.
 */
class LocalDiskStorage implements DocumentStorage {
  private readonly uploadsDir = path.join(process.cwd(), "public", "uploads", "documents");

  async upload(file: { buffer: Buffer; filename: string; contentType: string }): Promise<UploadedFile> {
    await mkdir(this.uploadsDir, { recursive: true });
    const key = `${Date.now()}-${file.filename.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    await writeFile(path.join(this.uploadsDir, key), file.buffer);
    return { url: `/uploads/documents/${key}`, key };
  }

  async delete(key: string): Promise<void> {
    const { unlink } = await import("node:fs/promises");
    await unlink(path.join(this.uploadsDir, key)).catch(() => {
      // Already gone — deleting a missing file isn't an error here.
    });
  }
}

class S3CompatibleStorage implements DocumentStorage {
  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly publicBaseUrl: string;

  constructor(env: {
    endpoint: string;
    bucket: string;
    accessKeyId: string;
    secretAccessKey: string;
    publicBaseUrl: string;
  }) {
    this.client = new S3Client({
      endpoint: env.endpoint,
      region: "auto",
      credentials: { accessKeyId: env.accessKeyId, secretAccessKey: env.secretAccessKey },
      forcePathStyle: true,
    });
    this.bucket = env.bucket;
    this.publicBaseUrl = env.publicBaseUrl.replace(/\/$/, "");
  }

  async upload(file: { buffer: Buffer; filename: string; contentType: string }): Promise<UploadedFile> {
    const key = `documents/${Date.now()}-${file.filename.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: file.buffer,
        ContentType: file.contentType,
      }),
    );
    return { url: `${this.publicBaseUrl}/${key}`, key };
  }

  async delete(key: string): Promise<void> {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }
}

let cached: DocumentStorage | undefined;

export function getDocumentStorage(): DocumentStorage {
  if (cached) return cached;

  const endpoint = process.env.STORAGE_ENDPOINT;
  const bucket = process.env.STORAGE_BUCKET;
  const accessKeyId = process.env.STORAGE_ACCESS_KEY_ID;
  const secretAccessKey = process.env.STORAGE_SECRET_ACCESS_KEY;
  const publicBaseUrl = process.env.STORAGE_PUBLIC_BASE_URL;

  if (endpoint && bucket && accessKeyId && secretAccessKey && publicBaseUrl) {
    cached = new S3CompatibleStorage({
      endpoint,
      bucket,
      accessKeyId,
      secretAccessKey,
      publicBaseUrl,
    });
    return cached;
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "STORAGE_ENDPOINT/STORAGE_BUCKET/STORAGE_ACCESS_KEY_ID/STORAGE_SECRET_ACCESS_KEY/STORAGE_PUBLIC_BASE_URL must all be set in production — local disk storage is dev-only.",
    );
  }

  cached = new LocalDiskStorage();
  return cached;
}
