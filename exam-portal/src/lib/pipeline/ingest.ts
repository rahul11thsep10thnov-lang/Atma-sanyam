import { prisma } from "@/lib/db/prisma";
import { getDocumentStorage } from "@/lib/documents/storage";
import { sha256 } from "@/lib/documents/checksum";
import type { DocumentType } from "@/generated/prisma/enums";
import type { Prisma } from "@/generated/prisma/client";
import { fetchUrl, type FetchOptions } from "./http";
import { extractPdfText, looksScanned } from "./parsers/pdf";
import { htmlToText, htmlTitle, isPdfUrl, officialLinksIn } from "./parsers/html";
import { getOcrEngine, isImageMime } from "./ocr";
import { diffText, pairChanges } from "./changeDetection";
import { recordPipelineError, resolvePipelineErrors } from "./errors";

export interface IngestInput {
  url: string;
  title?: string | null;
  sourceId?: string | null;
  pipelineRunId?: string | null;
  publishedAt?: Date | null;
  fetchOptions?: FetchOptions;
  /** Aggregator pages: append the official (gov.in/nic.in/…) links found on
   * the page to the extracted text, so the extractor records the recruiting
   * organization's own notice URL instead of the aggregator's. */
  collectOfficialLinks?: boolean;
}

export interface IngestResult {
  documentId: string;
  versionId: string;
  versionNumber: number;
  isNew: boolean;
  changed: boolean;
  diff: Array<{ old: string | null; new: string | null }> | null;
  extractedText: string | null;
  title: string;
  mimeType: string;
}

/** Cheap keyword classification of what kind of file this is; the notice
 * extractor (Phase 4) does the real typing. */
export function classifyDocumentType(title: string): DocumentType {
  const t = title.toLowerCase();
  if (/admit\s*card|hall\s*ticket|call\s*letter/.test(t)) return "ADMIT_CARD";
  if (/answer\s*key/.test(t)) return "ANSWER_KEY";
  if (/result|merit\s*list|score\s*card|marks/.test(t)) return "RESULT";
  if (/syllabus/.test(t)) return "SYLLABUS";
  if (/admission/.test(t)) return "ADMISSION";
  if (/scholarship/.test(t)) return "SCHOLARSHIP";
  if (/recruit|vacanc|notification|advertisement|advt|apply/.test(t)) return "JOB_NOTIFICATION";
  return "OTHER";
}

function filenameFor(url: string, mime: string, title?: string | null): string {
  const last = decodeURIComponent(new URL(url).pathname.split("/").filter(Boolean).pop() ?? "");
  if (last && /\.[a-z0-9]{2,5}$/i.test(last)) return last.slice(0, 180);
  const base = (title || last || "notice").replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 120) || "notice";
  const ext = mime.includes("pdf") ? ".pdf" : mime.startsWith("image/") ? "." + mime.split("/")[1].replace("jpeg", "jpg") : ".html";
  return base + ext;
}

/**
 * Fetches one notice document, stores the original bytes untouched,
 * extracts its text (PDF via pdf.js, HTML via cheerio, images via OCR
 * when enabled), and records it as a Document with a DocumentVersion.
 * A re-fetch with the same hash is a no-op; a different hash appends a
 * new version with a line diff — never an overwrite.
 */
export async function ingestDocument(input: IngestInput): Promise<IngestResult> {
  const existing = await prisma.document.findFirst({
    where: { sourceUrl: input.url },
    include: { versions: { orderBy: { versionNumber: "desc" }, take: 1 } },
  });

  const res = await fetchUrl(input.url, { ...input.fetchOptions, maxBytes: 25 * 1024 * 1024 });
  const checksum = sha256(res.body);
  const headerMime = (res.contentType ?? "").split(";")[0].trim().toLowerCase();
  const mime =
    headerMime && headerMime !== "application/octet-stream"
      ? headerMime
      : isPdfUrl(input.url) || res.body.subarray(0, 5).toString("latin1") === "%PDF-"
        ? "application/pdf"
        : "text/html";

  if (existing && existing.checksum === checksum && existing.versions[0]) {
    await prisma.document.update({ where: { id: existing.id }, data: { lastFetchedAt: new Date() } });
    return {
      documentId: existing.id,
      versionId: existing.versions[0].id,
      versionNumber: existing.versions[0].versionNumber,
      isNew: false,
      changed: false,
      diff: null,
      extractedText: existing.extractedText,
      title: input.title || existing.filename,
      mimeType: mime,
    };
  }

  // --- text extraction -----------------------------------------------
  let extractedText: string | null = null;
  let pageCount: number | null = null;
  let ocrUsed = false;
  let ocrProblem: string | null = null;
  let pageTitle: string | null = null;

  if (mime === "application/pdf") {
    const pdf = await extractPdfText(res.body);
    pageCount = pdf.pageCount;
    extractedText = pdf.text;
    if (looksScanned(pdf)) {
      ocrProblem = `Scanned PDF (${pdf.pageCount} page(s), no text layer): OCR of PDFs needs a page rasteriser, which is not configured. Upload a text PDF or an image of the notice.`;
    }
  } else if (isImageMime(mime)) {
    const engine = getOcrEngine();
    if (engine) {
      extractedText = await engine.recognize(res.body);
      ocrUsed = true;
    } else {
      ocrProblem = "Image notice but OCR_ENABLED is not set — text cannot be extracted.";
    }
  } else {
    const html = res.body.toString("utf8");
    extractedText = htmlToText(html);
    pageTitle = htmlTitle(html);
    if (input.collectOfficialLinks) {
      const links = officialLinksIn(html, res.finalUrl);
      if (links.length) extractedText = `${extractedText}\n\nOfficial links found on this page:\n${links.join("\n")}`;
    }
  }

  const title = (input.title || pageTitle || filenameFor(input.url, mime)).trim();
  const storage = getDocumentStorage();
  const stored = await storage.upload({ buffer: res.body, filename: filenameFor(input.url, mime, title), contentType: mime });

  const baseData = {
    storageUrl: stored.url,
    checksum,
    mimeType: mime,
    fileSize: res.body.length,
    pageCount,
    extractedText,
    ocrUsed,
    lastFetchedAt: new Date(),
    sourcePublishedAt: input.publishedAt ?? undefined,
  };

  let documentId: string;
  let versionNumber: number;
  let isNew = false;
  let diffPairs: IngestResult["diff"] = null;

  if (!existing) {
    const doc = await prisma.document.create({
      data: {
        filename: filenameFor(input.url, mime, title),
        documentType: classifyDocumentType(title),
        sourceUrl: input.url,
        sourceId: input.sourceId ?? null,
        uploadedBy: null,
        verificationStatus: "UNVERIFIED",
        ...baseData,
      },
    });
    documentId = doc.id;
    versionNumber = 1;
    isNew = true;
  } else {
    const previousText = existing.versions[0]?.extractedText ?? existing.extractedText;
    const diff = diffText(previousText, extractedText);
    diffPairs = pairChanges(diff);
    await prisma.document.update({ where: { id: existing.id }, data: baseData });
    documentId = existing.id;
    versionNumber = (existing.versions[0]?.versionNumber ?? 0) + 1;
  }

  const version = await prisma.documentVersion.create({
    data: {
      documentId,
      versionNumber,
      checksum,
      storageUrl: stored.url,
      extractedText,
      pageCount,
      ocrUsed,
      diff: diffPairs ? (diffPairs as unknown as Prisma.InputJsonValue) : undefined,
    },
  });

  if (ocrProblem) {
    await recordPipelineError({
      errorType: "OCR",
      message: ocrProblem,
      sourceId: input.sourceId ?? null,
      documentId,
      pipelineRunId: input.pipelineRunId ?? null,
    });
  } else {
    await resolvePipelineErrors({ documentId, errorType: "OCR" });
  }

  return {
    documentId,
    versionId: version.id,
    versionNumber,
    isNew,
    changed: !isNew,
    diff: diffPairs,
    extractedText,
    title,
    mimeType: mime,
  };
}
