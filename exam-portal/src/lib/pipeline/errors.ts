import { prisma } from "@/lib/db/prisma";
import type { PipelineErrorType } from "@/generated/prisma/enums";
import type { Prisma } from "@/generated/prisma/client";

const BASE_RETRY_MS = 15 * 60 * 1000;
const MAX_RETRY_MS = 24 * 60 * 60 * 1000;

/** Exponential backoff: 15 min, 30 min, 1 h, 2 h … capped at 24 h. */
export function nextRetryAt(retryCount: number, now = new Date()): Date {
  const delay = Math.min(BASE_RETRY_MS * 2 ** retryCount, MAX_RETRY_MS);
  return new Date(now.getTime() + delay);
}

/**
 * Dead-letter queue entry. Re-raising the same failure for the same
 * source/document bumps `retryCount` and pushes `nextRetryAt` out instead
 * of creating a pile of duplicate rows.
 */
export async function recordPipelineError(input: {
  errorType: PipelineErrorType;
  message: string;
  pipelineRunId?: string | null;
  sourceId?: string | null;
  documentId?: string | null;
  noticeId?: string | null;
  payload?: Prisma.InputJsonValue;
}) {
  const existing = await prisma.pipelineError.findFirst({
    where: {
      resolvedAt: null,
      errorType: input.errorType,
      sourceId: input.sourceId ?? null,
      documentId: input.documentId ?? null,
      noticeId: input.noticeId ?? null,
    },
    orderBy: { lastAttemptAt: "desc" },
  });
  const now = new Date();
  if (existing) {
    const retryCount = existing.retryCount + 1;
    return prisma.pipelineError.update({
      where: { id: existing.id },
      data: {
        message: input.message.slice(0, 2000),
        payload: input.payload,
        pipelineRunId: input.pipelineRunId ?? existing.pipelineRunId,
        retryCount,
        lastAttemptAt: now,
        nextRetryAt: nextRetryAt(retryCount, now),
      },
    });
  }
  return prisma.pipelineError.create({
    data: {
      errorType: input.errorType,
      message: input.message.slice(0, 2000),
      payload: input.payload,
      pipelineRunId: input.pipelineRunId ?? null,
      sourceId: input.sourceId ?? null,
      documentId: input.documentId ?? null,
      noticeId: input.noticeId ?? null,
      retryCount: 0,
      lastAttemptAt: now,
      nextRetryAt: nextRetryAt(0, now),
    },
  });
}

export async function resolvePipelineErrors(where: {
  sourceId?: string | null;
  documentId?: string | null;
  noticeId?: string | null;
  errorType?: PipelineErrorType;
}) {
  await prisma.pipelineError.updateMany({
    where: { resolvedAt: null, ...where },
    data: { resolvedAt: new Date() },
  });
}
