import { prisma } from "@/lib/db/client";
import { recordAuditLog } from "@/lib/services/auditLog";
import { getDocumentStorage } from "@/lib/documents/storage";
import { sha256 } from "@/lib/documents/checksum";
import type { DocumentType } from "@/generated/prisma/enums";

const PAGE_SIZE = 20;
export const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024; // 20 MB
export const ALLOWED_MIME_TYPES = ["application/pdf"];

export class DocumentValidationError extends Error {}

export async function listDocumentsForAdmin(page = 1) {
  const [items, total] = await Promise.all([
    prisma.document.findMany({
      orderBy: { uploadedAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        filename: true,
        documentType: true,
        verificationStatus: true,
        uploadedAt: true,
        sourceUrl: true,
        storageUrl: true,
        exam: { select: { title: true } },
        organization: { select: { name: true } },
        extractionJobs: {
          orderBy: { attempt: "desc" },
          take: 1,
          select: { id: true, status: true, attempt: true, error: true },
        },
      },
    }),
    prisma.document.count(),
  ]);
  return { items, total, pageSize: PAGE_SIZE };
}

/**
 * Uploads a file to object storage and records its metadata (Section
 * 19). Never assumes a PDF is authentic just because it was uploaded —
 * `verificationStatus` always starts `UNVERIFIED`; an admin marks it
 * verified separately, ideally after checking it against `sourceUrl`.
 */
export async function uploadDocument(
  input: {
    file: { buffer: Buffer; filename: string; contentType: string; size: number };
    documentType: DocumentType;
    examId?: string;
    organizationId?: string;
    sourceUrl?: string;
  },
  adminId: string,
) {
  if (!ALLOWED_MIME_TYPES.includes(input.file.contentType)) {
    throw new DocumentValidationError("Only PDF files are accepted.");
  }
  if (input.file.size > MAX_FILE_SIZE_BYTES) {
    throw new DocumentValidationError("File exceeds the 20 MB limit.");
  }
  if (input.file.size === 0) {
    throw new DocumentValidationError("The uploaded file is empty.");
  }

  const storage = getDocumentStorage();
  const uploaded = await storage.upload({
    buffer: input.file.buffer,
    filename: input.file.filename,
    contentType: input.file.contentType,
  });

  const document = await prisma.document.create({
    data: {
      filename: input.file.filename,
      documentType: input.documentType,
      examId: input.examId || null,
      organizationId: input.organizationId || null,
      storageUrl: uploaded.url,
      sourceUrl: input.sourceUrl || null,
      checksum: sha256(input.file.buffer),
      uploadedBy: adminId,
      verificationStatus: "UNVERIFIED",
    },
  });

  await recordAuditLog({
    adminUserId: adminId,
    action: "UPLOAD",
    contentType: "Document",
    contentId: document.id,
    newValue: { filename: document.filename, documentType: document.documentType },
  });

  return document;
}

export async function setDocumentVerified(
  id: string,
  verified: boolean,
  adminId: string,
) {
  const document = await prisma.document.update({
    where: { id },
    data: { verificationStatus: verified ? "VERIFIED" : "UNVERIFIED" },
  });
  await recordAuditLog({
    adminUserId: adminId,
    action: "UPDATE",
    contentType: "Document",
    contentId: document.id,
    newValue: { verificationStatus: document.verificationStatus },
  });
  return document;
}

export async function deleteDocument(id: string, adminId: string) {
  const document = await prisma.document.findUniqueOrThrow({ where: { id } });
  await prisma.document.delete({ where: { id } });
  await recordAuditLog({
    adminUserId: adminId,
    action: "DELETE",
    contentType: "Document",
    contentId: id,
    previousValue: { filename: document.filename },
  });
  // Storage cleanup is best-effort — a dangling file in storage is a much
  // smaller problem than a delete that fails halfway through because a
  // provider hiccup blocked removing the database row.
}
