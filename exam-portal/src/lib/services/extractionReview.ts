import { prisma } from "@/lib/db/client";
import { recordAuditLog } from "@/lib/services/auditLog";
import type { AdminRole } from "@/generated/prisma/enums";
import { Prisma } from "@/generated/prisma/client";

export class ReviewError extends Error {}

const REVIEW_ROLES: AdminRole[] = ["REVIEWER", "EDITOR", "SUPER_ADMIN"];
const REVIEWABLE_JOB_STATUSES = ["READY_FOR_REVIEW", "UNDER_REVIEW"];

function assertCanReview(role: AdminRole) {
  if (!REVIEW_ROLES.includes(role)) {
    throw new ReviewError("Only reviewers, editors, and super admins can review extracted fields.");
  }
}

async function ensureUnderReview(jobId: string) {
  const job = await prisma.extractionJob.findUniqueOrThrow({ where: { id: jobId } });
  if (!REVIEWABLE_JOB_STATUSES.includes(job.status)) {
    throw new ReviewError(`Cannot review a field on a job with status ${job.status}.`);
  }
  if (job.status === "READY_FOR_REVIEW") {
    await prisma.extractionJob.update({ where: { id: jobId }, data: { status: "UNDER_REVIEW" } });
  }
  return job;
}

/**
 * Human-approved data always wins over AI output (Section 17) — every
 * decision is recorded as a `FieldOverride` row rather than an in-place
 * edit, so both the AI's original value and the human's decision stay
 * auditable side by side.
 */
async function recordOverride(
  resultId: string,
  jobId: string,
  humanValue: Prisma.InputJsonValue | null,
  reason: string | null,
  adminId: string,
  adminRole: AdminRole,
) {
  assertCanReview(adminRole);
  await ensureUnderReview(jobId);

  const result = await prisma.extractionResult.findUniqueOrThrow({ where: { id: resultId } });
  const override = await prisma.fieldOverride.create({
    data: {
      extractionResultId: resultId,
      aiValue: result.value ?? undefined,
      humanValue: humanValue ?? Prisma.JsonNull,
      adminUserId: adminId,
      reason,
    },
  });

  await recordAuditLog({
    adminUserId: adminId,
    action: "UPDATE",
    contentType: "ExtractionResult",
    contentId: resultId,
    previousValue: result.value === null ? undefined : (result.value as Prisma.InputJsonValue),
    newValue: humanValue ?? undefined,
  });

  return override;
}

// A reviewer's decision (accept/edit/reject) is recorded as a prefix on
// `reason` rather than inferred from `humanValue`, because `humanValue`
// can legitimately be JSON null both when a reviewer accepts an AI
// value that itself was null/"not extracted" AND when a reviewer
// rejects a field outright — the two are not distinguishable from
// `humanValue` alone.
export const DECISION_PREFIX = { ACCEPTED: "ACCEPTED", EDITED: "EDITED", REJECTED: "REJECTED" } as const;

export async function acceptField(
  resultId: string,
  jobId: string,
  adminId: string,
  adminRole: AdminRole,
) {
  const result = await prisma.extractionResult.findUniqueOrThrow({ where: { id: resultId } });
  return recordOverride(
    resultId,
    jobId,
    (result.value ?? Prisma.JsonNull) as Prisma.InputJsonValue,
    `${DECISION_PREFIX.ACCEPTED}: Accepted AI value as-is.`,
    adminId,
    adminRole,
  );
}

export async function editField(
  resultId: string,
  jobId: string,
  humanValue: string,
  adminId: string,
  adminRole: AdminRole,
) {
  return recordOverride(
    resultId,
    jobId,
    humanValue,
    `${DECISION_PREFIX.EDITED}: Edited by reviewer.`,
    adminId,
    adminRole,
  );
}

export async function rejectField(
  resultId: string,
  jobId: string,
  reason: string,
  adminId: string,
  adminRole: AdminRole,
) {
  return recordOverride(
    resultId,
    jobId,
    null,
    `${DECISION_PREFIX.REJECTED}: ${reason || "Rejected by reviewer."}`,
    adminId,
    adminRole,
  );
}

/**
 * Approving requires every extracted field to have a reviewer decision
 * already recorded (Section 17: nothing reaches an approved state on AI
 * output alone). Rejecting the whole job has no such requirement — an
 * obviously bad extraction (wrong document scanned, garbled OCR) can be
 * thrown out without reviewing every field individually.
 */
export async function approveExtractionJob(jobId: string, adminId: string, adminRole: AdminRole) {
  assertCanReview(adminRole);
  const job = await prisma.extractionJob.findUniqueOrThrow({
    where: { id: jobId },
    include: { results: { include: { overrides: true } } },
  });
  if (!REVIEWABLE_JOB_STATUSES.includes(job.status)) {
    throw new ReviewError(`Cannot approve a job with status ${job.status}.`);
  }
  const unreviewed = job.results.filter((r) => r.overrides.length === 0);
  if (unreviewed.length > 0) {
    throw new ReviewError(
      `${unreviewed.length} field(s) still need a reviewer decision before this job can be approved: ${unreviewed
        .map((r) => r.fieldPath)
        .join(", ")}.`,
    );
  }

  const updated = await prisma.extractionJob.update({ where: { id: jobId }, data: { status: "APPROVED" } });
  await recordAuditLog({
    adminUserId: adminId,
    action: "APPROVE",
    contentType: "ExtractionJob",
    contentId: jobId,
  });
  return updated;
}

export async function rejectExtractionJob(
  jobId: string,
  reason: string,
  adminId: string,
  adminRole: AdminRole,
) {
  assertCanReview(adminRole);
  const job = await prisma.extractionJob.findUniqueOrThrow({ where: { id: jobId } });
  if (!REVIEWABLE_JOB_STATUSES.includes(job.status)) {
    throw new ReviewError(`Cannot reject a job with status ${job.status}.`);
  }
  const updated = await prisma.extractionJob.update({
    where: { id: jobId },
    data: { status: "REJECTED", error: reason || null },
  });
  await recordAuditLog({
    adminUserId: adminId,
    action: "REJECT",
    contentType: "ExtractionJob",
    contentId: jobId,
    newValue: { reason },
  });
  return updated;
}
