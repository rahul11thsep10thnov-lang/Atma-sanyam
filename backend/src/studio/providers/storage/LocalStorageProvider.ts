import { access, readFile } from "node:fs/promises";
import { saveBuffer, publicUrlFor, localPathFor } from "../../../lib/storage";
import { StorageProvider, StoredObject } from "./StorageProvider";

/** Wraps the existing lib/storage local-disk implementation (served at /media). */
export class LocalStorageProvider implements StorageProvider {
  readonly key = "local";

  async put(key: string, data: Buffer): Promise<StoredObject> {
    const url = await saveBuffer(key, data);
    return { key, url };
  }

  url(key: string): string {
    return publicUrlFor(key);
  }

  async exists(key: string): Promise<boolean> {
    try {
      await access(localPathFor(key));
      return true;
    } catch {
      return false;
    }
  }

  async materialize(key: string): Promise<string> {
    return localPathFor(key);
  }

  async read(key: string): Promise<Buffer> {
    return readFile(localPathFor(key));
  }
}
