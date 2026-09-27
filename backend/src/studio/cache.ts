import { PrismaClient } from "@prisma/client";
import { contentHash } from "./hashing";

/**
 * Read-through cache for expensive AI calls (analysis, script generation,
 * translation). Keys include provider + model + full prompt, so any change
 * to inputs produces a fresh call while identical re-runs cost nothing.
 */
export async function cachedAi<T>(prisma: PrismaClient, keyParts: unknown[], produce: () => Promise<T>): Promise<T> {
  const key = contentHash("ai", ...keyParts);
  const hit = await prisma.aiCache.findUnique({ where: { key } });
  if (hit) {
    await prisma.aiCache.update({ where: { key }, data: { hits: { increment: 1 } } }).catch(() => undefined);
    return hit.value as T;
  }
  const value = await produce();
  await prisma.aiCache
    .upsert({ where: { key }, create: { key, value: value as object }, update: { value: value as object } })
    .catch(() => undefined);
  return value;
}
