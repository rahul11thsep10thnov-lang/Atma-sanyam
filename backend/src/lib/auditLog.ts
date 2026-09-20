import { PrismaClient } from "@prisma/client";

export async function logAdminAction(
  prisma: PrismaClient,
  adminUserId: string,
  action: string,
  entity: string,
  entityId: string,
  diff?: unknown
) {
  await prisma.adminAuditLog.create({
    data: { adminUserId, action, entity, entityId, diff: diff ? (diff as object) : undefined },
  });
}
