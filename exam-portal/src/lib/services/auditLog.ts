import type { Prisma } from "@/generated/prisma/client";
import type { AuditAction } from "@/generated/prisma/enums";
import { prisma } from "@/lib/db/client";

/**
 * Centralized audit logging (Section 27). Every admin action that
 * matters — login, create, update, delete, publish/unpublish, approve/
 * reject, upload/download — is recorded through this single function so
 * the audit trail always has a consistent shape, whatever calls it.
 */
export async function recordAuditLog(entry: {
  adminUserId: string;
  action: AuditAction;
  contentType?: string;
  contentId?: string;
  previousValue?: Prisma.InputJsonValue;
  newValue?: Prisma.InputJsonValue;
}) {
  await prisma.auditLog.create({
    data: {
      adminUserId: entry.adminUserId,
      action: entry.action,
      contentType: entry.contentType,
      contentId: entry.contentId,
      previousValue: entry.previousValue,
      newValue: entry.newValue,
    },
  });
}
