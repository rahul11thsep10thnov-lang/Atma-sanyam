import { prisma } from "@/lib/db/client";
import { recordAuditLog } from "@/lib/services/auditLog";
import { getAIProvider } from "@/lib/ai/provider";

export class ExtractionError extends Error {}

/// Fields a completed extraction must have at least one non-null value
/// for, per document type, before the job can move to READY_FOR_REVIEW.
/// Anything short of this is VALIDATION_FAILED rather than silently
/// accepted — an admin still reviews every field either way (Phase 15),
/// this just stops obviously-empty extractions from queuing for review.
const REQUIRED_FIELDS: Record<string, string[]> = {
  JOB_NOTIFICATION: ["title"],
  RESULT: ["title"],
  ADMIT_CARD: ["title"],
  ANSWER_KEY: ["title"],
  SYLLABUS: ["title"],
  ADMISSION: ["title"],
  SCHOLARSHIP: ["title"],
  OTHER: ["title"],
};

/**
 * Runs the extraction pipeline for a document (Section 21A Steps 14–15):
 * create a job, call the configured AI provider, persist one
 * ExtractionResult row per field, then land the job on a terminal
 * status. AI output only ever reaches `ExtractionResult` rows here — it
 * is never written to a published content table. Only a human approval
 * action (Phase 15) can do that.
 */
export async function startExtractionJob(documentId: string, adminId: string) {
  const document = await prisma.document.findUnique({ where: { id: documentId } });
  if (!document) throw new ExtractionError("Document not found.");

  const lastJob = await prisma.extractionJob.findFirst({
    where: { documentId },
    orderBy: { attempt: "desc" },
  });
  const attempt = (lastJob?.attempt ?? 0) + 1;

  const provider = getAIProvider();
  const job = await prisma.extractionJob.create({
    data: { documentId, attempt, status: "EXTRACTING", aiModel: provider.modelName },
  });

  try {
    const fields = await provider.extractFields({
      documentType: document.documentType,
      filename: document.filename,
      storageUrl: document.storageUrl,
      sourceUrl: document.sourceUrl,
    });

    await prisma.extractionResult.createMany({
      data: fields.map((f) => ({
        extractionJobId: job.id,
        fieldPath: f.fieldPath,
        value: f.value === null ? undefined : (f.value as object),
        sourcePage: f.sourcePage,
        confidence: f.confidence,
        isUncertain: f.isUncertain,
      })),
    });

    const required = REQUIRED_FIELDS[document.documentType] ?? [];
    const byPath = new Map(fields.map((f) => [f.fieldPath, f.value]));
    const missing = required.filter((path) => byPath.get(path) == null || byPath.get(path) === "");

    const finalStatus = missing.length > 0 ? "VALIDATION_FAILED" : "READY_FOR_REVIEW";
    const updated = await prisma.extractionJob.update({
      where: { id: job.id },
      data: {
        status: finalStatus,
        error:
          missing.length > 0
            ? `Extraction is missing required field(s): ${missing.join(", ")}.`
            : null,
      },
    });

    await recordAuditLog({
      adminUserId: adminId,
      action: "UPDATE",
      contentType: "ExtractionJob",
      contentId: job.id,
      newValue: { status: updated.status, documentId, attempt },
    });

    return updated;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown extraction error.";
    const failed = await prisma.extractionJob.update({
      where: { id: job.id },
      data: { status: "FAILED", error: message },
    });
    await recordAuditLog({
      adminUserId: adminId,
      action: "UPDATE",
      contentType: "ExtractionJob",
      contentId: job.id,
      newValue: { status: failed.status, error: message },
    });
    return failed;
  }
}

export async function listExtractionJobsForDocument(documentId: string) {
  return prisma.extractionJob.findMany({
    where: { documentId },
    orderBy: { attempt: "desc" },
    include: { results: { orderBy: { fieldPath: "asc" } } },
  });
}

export async function getExtractionJob(jobId: string) {
  return prisma.extractionJob.findUnique({
    where: { id: jobId },
    include: {
      document: true,
      results: { orderBy: { fieldPath: "asc" }, include: { overrides: true } },
    },
  });
}
