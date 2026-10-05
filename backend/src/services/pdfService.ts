// Stored, server-made PDFs of mock tests (question paper / answer key / both).
// A PDF is a snapshot: `content_hash` records exactly what was printed, and a
// PDF whose hash no longer matches the test (after an edit, a swap or a fix to
// one of its questions) is listed as outdated.
import { createHash } from 'node:crypto';
import { and, desc, eq, inArray, notInArray } from 'drizzle-orm';
import type { Db } from '../database/client.js';
import { admins, mockTestPdfs } from '../database/schema.js';
import { audit } from '../lib/audit.js';
import { notFound, unprocessable } from '../lib/httpError.js';
import { LANGUAGE_MAP } from '../lib/languages.js';
import { getMockTest } from './mockTestService.js';
import type { PaperTest, PdfVariant } from './pdf/paperPdf.js';
import { renderPaperPdfInWorker } from './pdf/renderPdf.js';

/** Bump when the PDF layout changes so older files show as outdated. */
const LAYOUT_VERSION = 1;
/** Files kept per test and variant; older ones are removed when a new one is made. */
export const KEEP_PER_VARIANT = 10;

const VARIANT_SLUG: Record<PdfVariant, string> = {
  paper: 'question-paper',
  key: 'answer-key',
  both: 'paper-and-key',
};

async function loadPaperTest(db: Db, testId: string): Promise<PaperTest> {
  const t = await getMockTest(db, testId, { includeAnswers: true, publicOnly: false });
  return {
    title: t.title,
    description: t.description,
    examName: t.examName,
    language: t.language,
    languageName: LANGUAGE_MAP.get(t.language)?.name ?? t.language,
    durationMinutes: t.durationMinutes,
    marksPerQuestion: t.marksPerQuestion,
    negativeMarks: t.negativeMarks,
    questions: t.questions.map((q) => ({
      position: q.position,
      subjectName: q.subjectName,
      chapterName: q.chapterName,
      questionText: q.questionText,
      figureSvg: q.figureSvg,
      difficulty: q.difficulty,
      correctOption: q.correctOption ?? '',
      explanation: q.explanation ?? null,
      options: q.options,
    })),
  };
}

/** Hash of everything a PDF of this variant prints. */
export function contentHash(t: PaperTest, variant: PdfVariant, showDetails: boolean): string {
  const withKey = variant !== 'paper';
  const payload = {
    v: LAYOUT_VERSION,
    variant,
    showDetails: withKey && showDetails,
    head: [t.title, t.description, t.examName, t.language, t.durationMinutes, t.marksPerQuestion, t.negativeMarks],
    questions: t.questions.map((q) => [
      q.position,
      q.subjectName,
      q.questionText,
      q.figureSvg,
      q.options.map((o) => [o.label, o.text, o.svg]),
      ...(withKey ? [q.correctOption, q.explanation] : []),
      ...(withKey && showDetails ? [q.chapterName, q.difficulty] : []),
    ]),
  };
  return createHash('sha256').update(JSON.stringify(payload)).digest('hex');
}

function fileNameFor(t: PaperTest, testId: string, variant: PdfVariant, at: Date): string {
  const slug =
    t.title
      .normalize('NFKD')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60)
      .replace(/-+$/, '') || `mock-test-${testId.slice(0, 8)}`;
  return `${slug}-${VARIANT_SLUG[variant]}-${at.toISOString().slice(0, 10)}.pdf`;
}

const metaColumns = {
  id: mockTestPdfs.id,
  mockTestId: mockTestPdfs.mockTestId,
  variant: mockTestPdfs.variant,
  showDetails: mockTestPdfs.showDetails,
  fileName: mockTestPdfs.fileName,
  sizeBytes: mockTestPdfs.sizeBytes,
  pages: mockTestPdfs.pages,
  sha256: mockTestPdfs.sha256,
  contentHash: mockTestPdfs.contentHash,
  createdAt: mockTestPdfs.createdAt,
  createdByName: admins.name,
};

export async function createTestPdf(db: Db, testId: string, input: { variant: PdfVariant; showDetails: boolean }, adminId: string) {
  const t = await loadPaperTest(db, testId);
  if (!t.questions.length) throw unprocessable('This test has no questions to print.');
  const showDetails = input.variant !== 'paper' && input.showDetails;
  const { data, pages } = await renderPaperPdfInWorker(t, { variant: input.variant, showDetails });
  const now = new Date();
  const [row] = await db
    .insert(mockTestPdfs)
    .values({
      mockTestId: testId,
      variant: input.variant,
      showDetails,
      fileName: fileNameFor(t, testId, input.variant, now),
      sizeBytes: data.length,
      pages,
      sha256: createHash('sha256').update(data).digest('hex'),
      contentHash: contentHash(t, input.variant, showDetails),
      data,
      createdBy: adminId,
    })
    .returning({ id: mockTestPdfs.id });

  // Keep the newest files of this variant; older snapshots are removed.
  const keep = await db
    .select({ id: mockTestPdfs.id })
    .from(mockTestPdfs)
    .where(and(eq(mockTestPdfs.mockTestId, testId), eq(mockTestPdfs.variant, input.variant)))
    .orderBy(desc(mockTestPdfs.createdAt), desc(mockTestPdfs.id))
    .limit(KEEP_PER_VARIANT);
  await db
    .delete(mockTestPdfs)
    .where(
      and(
        eq(mockTestPdfs.mockTestId, testId),
        eq(mockTestPdfs.variant, input.variant),
        notInArray(
          mockTestPdfs.id,
          keep.map((k) => k.id)
        )
      )
    );

  await audit(db, adminId, 'mocktest.pdf_created', 'mock_test', testId, { pdfId: row!.id, variant: input.variant, pages, sizeBytes: data.length });
  const [created] = (await listTestPdfs(db, testId)).items.filter((p) => p.id === row!.id);
  return created!;
}

export async function listTestPdfs(db: Db, testId: string) {
  const t = await loadPaperTest(db, testId);
  const rows = await db
    .select(metaColumns)
    .from(mockTestPdfs)
    .leftJoin(admins, eq(admins.id, mockTestPdfs.createdBy))
    .where(eq(mockTestPdfs.mockTestId, testId))
    .orderBy(desc(mockTestPdfs.createdAt), desc(mockTestPdfs.id));
  const current = new Map<string, string>();
  const hashFor = (variant: PdfVariant, showDetails: boolean) => {
    const k = `${variant}:${showDetails}`;
    if (!current.has(k)) current.set(k, contentHash(t, variant, showDetails));
    return current.get(k)!;
  };
  return {
    items: rows.map(({ contentHash: hash, ...r }) => ({ ...r, outdated: hash !== hashFor(r.variant, r.showDetails) })),
    keepPerVariant: KEEP_PER_VARIANT,
  };
}

export async function getTestPdfFile(db: Db, testId: string, pdfId: string) {
  const [row] = await db
    .select({ fileName: mockTestPdfs.fileName, data: mockTestPdfs.data, sha256: mockTestPdfs.sha256 })
    .from(mockTestPdfs)
    .where(and(eq(mockTestPdfs.id, pdfId), eq(mockTestPdfs.mockTestId, testId)))
    .limit(1);
  if (!row) throw notFound('PDF not found');
  return { fileName: row.fileName, sha256: row.sha256, data: Buffer.from(row.data) };
}

export async function deleteTestPdfs(db: Db, testId: string, pdfIds: string[], adminId: string) {
  const deleted = await db
    .delete(mockTestPdfs)
    .where(and(eq(mockTestPdfs.mockTestId, testId), inArray(mockTestPdfs.id, pdfIds)))
    .returning({ id: mockTestPdfs.id });
  if (!deleted.length) throw notFound('PDF not found');
  await audit(db, adminId, 'mocktest.pdf_deleted', 'mock_test', testId, { pdfIds: deleted.map((d) => d.id) });
  return { deleted: deleted.length };
}
