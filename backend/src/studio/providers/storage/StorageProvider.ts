export interface StoredObject {
  key: string;
  url: string;
}

/**
 * Object storage used by every Studio stage. Render workers need files on
 * local disk for FFmpeg, so `materialize` returns a local path (the local
 * implementation returns the file itself; an S3 implementation would
 * download to a temp dir and cache).
 */
export interface StorageProvider {
  readonly key: string;
  put(key: string, data: Buffer, contentType?: string): Promise<StoredObject>;
  url(key: string): string;
  exists(key: string): Promise<boolean>;
  materialize(key: string): Promise<string>;
  read(key: string): Promise<Buffer>;
}
