import type { AdminRole, ContentStatus } from "@/generated/prisma/enums";

/**
 * Section 16's per-role rules, beyond the publish/approve workflow
 * (`workflow.ts`):
 *  - AUTHOR: create content, edit only their own drafts.
 *  - EDITOR / SUPER_ADMIN: create/edit anything.
 *  - REVIEWER: reviews and approves/rejects (via `workflow.ts`'s
 *    transitions), but doesn't create or directly edit content fields.
 */

export function canCreateContent(role: AdminRole): boolean {
  return role === "AUTHOR" || role === "EDITOR" || role === "SUPER_ADMIN";
}

export function canEditContent(
  content: { createdBy: string; status: ContentStatus },
  admin: { id: string; role: AdminRole },
): boolean {
  if (admin.role === "SUPER_ADMIN" || admin.role === "EDITOR") return true;
  if (admin.role === "AUTHOR") {
    return content.createdBy === admin.id && content.status === "DRAFT";
  }
  return false;
}
