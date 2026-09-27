import { Prisma, PrismaClient } from "@prisma/client";

/** Immutable snapshot in the `versions` table (script, scene, render history). */
export async function snapshotVersion(
  prisma: PrismaClient,
  v: { storyId: string; entityType: "ARTICLE" | "MASTER_SCRIPT" | "LANGUAGE_SCRIPT" | "SCENE" | "RENDER"; entityId: string; languageCode?: string; version: number; snapshot: unknown; reason?: string; createdByAdminId?: string | null }
) {
  await prisma.contentVersion.create({
    data: {
      storyId: v.storyId,
      entityType: v.entityType,
      entityId: v.entityId,
      languageCode: v.languageCode,
      version: v.version,
      snapshot: JSON.parse(JSON.stringify(v.snapshot)) as Prisma.InputJsonValue,
      reason: v.reason,
      createdByAdminId: v.createdByAdminId ?? undefined,
    },
  });
}
