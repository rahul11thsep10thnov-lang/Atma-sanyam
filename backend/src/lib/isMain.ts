import path from 'node:path';
import { fileURLToPath } from 'node:url';

/** True when this file is the script that was run (`node file.js` / `tsx file.ts`).
 * Windows paths are compared ignoring letter case (C:\ vs c:\). */
export function isMainModule(metaUrl: string): boolean {
  const entry = process.argv[1];
  if (!entry) return false;
  const a = path.resolve(entry);
  const b = fileURLToPath(metaUrl);
  return process.platform === 'win32' ? a.toLowerCase() === b.toLowerCase() : a === b;
}
