// npm run seed:pyq [-- --file seed/pyq/<paper>.json] [--dry-run]
//
// Loads a transcribed previous-year paper into the question bank:
//   1. stores the paper as Source Material (kind "pyq", reference only — the
//      generator never copies it; it stays unapproved until an admin decides);
//   2. imports every text-only question through the normal validator as
//      source = pyq, status NEEDS_REVIEW (never published automatically);
//   3. saves a mock-test blueprint matching the official exam pattern.
// Figure-based questions are listed in the report and skipped.
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { and, eq, sql } from 'drizzle-orm';
import { createDatabase, type Db } from './client.js';
import { admins, exams, mockBlueprints, sourceMaterials, subjects } from './schema.js';
import { loadDotEnv } from '../config/dotenv.js';
import { isMainModule } from '../lib/isMain.js';
import { importQuestions } from '../services/importService.js';
import { saveBlueprint } from '../services/mockTestService.js';
import { SEED_DIR, seedTaxonomy } from './seedTaxonomy.js';

interface PaperQuestion {
  n: number;
  subject: string;
  chapter: string;
  topic?: string;
  difficulty: 'easy' | 'medium' | 'hard';
  question: string;
  options: string[];
  answer: string;
  explanation: string;
  importable: boolean;
  note?: string;
  computation?: string;
}

export interface PaperFile {
  meta: {
    paper: string;
    sourceName: string;
    sourceReference: string;
    licenseNote: string;
    exam: string;
    language: string;
    pattern: { totalQuestions: number; durationMinutes: number; marksPerQuestion: number; negativeMarks: number };
    targetMix: { easy: number; medium: number; hard: number };
  };
  questions: PaperQuestion[];
}

/** Section counts for the official UP Police Constable pattern, expressed in
 * this taxonomy (its GK section is split across several subjects). */
export const UP_CONSTABLE_SECTIONS: { subject: string; count: number }[] = [
  { subject: 'gk', count: 20 },
  { subject: 'current-affairs', count: 6 },
  { subject: 'polity', count: 4 },
  { subject: 'history', count: 4 },
  { subject: 'science', count: 2 },
  { subject: 'geography', count: 2 },
  { subject: 'hindi', count: 37 },
  { subject: 'maths', count: 38 },
  { subject: 'reasoning', count: 37 },
];

export async function seedPyq(db: Db, paper: PaperFile, adminId: string, opts: { dryRun: boolean }) {
  const { meta } = paper;
  const [exam] = await db.select().from(exams).where(eq(exams.slug, meta.exam)).limit(1);
  if (!exam) throw new Error(`Exam ${meta.exam} is not in the taxonomy. Run npm run seed first.`);

  // 1. Source material (idempotent by name).
  let sourceMaterialId: string | null = null;
  if (!opts.dryRun) {
    const [existing] = await db.select({ id: sourceMaterials.id }).from(sourceMaterials).where(eq(sourceMaterials.name, meta.sourceName)).limit(1);
    if (existing) sourceMaterialId = existing.id;
    else {
      const [row] = await db
        .insert(sourceMaterials)
        .values({
          examId: exam.id,
          kind: 'pyq',
          name: meta.sourceName,
          reference: meta.sourceReference,
          content: paper.questions.map((q) => `Q${q.n}. ${q.question}\n${q.options.map((o, i) => `(${'ABCD'[i]}) ${o}`).join('  ')}`).join('\n\n'),
          licenseNote: meta.licenseNote,
          approved: false,
          createdBy: adminId,
        })
        .returning({ id: sourceMaterials.id });
      sourceMaterialId = row!.id;
    }
  }

  // 2. Questions → NEEDS_REVIEW as PYQ.
  const rows = paper.questions
    .filter((q) => q.importable)
    .map((q) => ({
      exam: meta.exam,
      subject: q.subject,
      chapter: q.chapter,
      question: q.question,
      options: q.options,
      correct_option: q.answer,
      explanation: q.explanation,
      difficulty: q.difficulty,
      language: meta.language,
      source_name: meta.sourceName,
      source_reference: `${meta.sourceReference} — Q${q.n}`,
      computation: q.computation ?? '',
    }));
  const report = await importQuestions(db, 'json', JSON.stringify(rows), adminId, { dryRun: opts.dryRun, source: 'pyq', sourceMaterialId });

  // 3. Blueprint for the official pattern (idempotent by name).
  const blueprintName = `${exam.name} — official pattern (${meta.pattern.totalQuestions} Q / ${meta.pattern.durationMinutes} min)`;
  let blueprintId: string | null = null;
  if (!opts.dryRun) {
    const [existing] = await db
      .select({ id: mockBlueprints.id })
      .from(mockBlueprints)
      .where(and(eq(mockBlueprints.examId, exam.id), eq(mockBlueprints.name, blueprintName)))
      .limit(1);
    if (existing) blueprintId = existing.id;
    else {
      const subjectRows = await db.select({ id: subjects.id, slug: subjects.slug }).from(subjects).where(eq(subjects.examId, exam.id));
      const sections = UP_CONSTABLE_SECTIONS.map((s) => {
        const row = subjectRows.find((r) => r.slug === s.subject);
        if (!row) throw new Error(`Subject ${s.subject} missing for ${exam.slug}`);
        return { subjectId: row.id, count: s.count };
      });
      const bp = await saveBlueprint(
        db,
        {
          examId: exam.id,
          name: blueprintName,
          language: 'hi-Latn',
          totalQuestions: meta.pattern.totalQuestions,
          durationMinutes: meta.pattern.durationMinutes,
          marksPerQuestion: meta.pattern.marksPerQuestion,
          negativeMarks: meta.pattern.negativeMarks,
          difficulty: meta.targetMix,
          sections,
        },
        adminId
      );
      blueprintId = bp.id;
    }
  }

  return {
    sourceMaterialId,
    blueprintId,
    skippedFigureBased: paper.questions.filter((q) => !q.importable).map((q) => q.n),
    imported: report.imported,
    failed: report.failed,
    withWarnings: report.needsReview,
    failures: report.rows.filter((r) => !r.ok).map((r) => ({ question: rows[r.row - 1]?.source_reference, issues: r.issues.map((i) => i.message) })),
  };
}

export function loadPaper(file: string): PaperFile {
  return JSON.parse(readFileSync(file, 'utf8')) as PaperFile;
}

async function main() {
  loadDotEnv();
  const args = process.argv.slice(2);
  const fileArg = args.includes('--file') ? args[args.indexOf('--file') + 1] : undefined;
  const file = path.resolve(fileArg ?? path.join(SEED_DIR, 'pyq', 'up-police-constable-2024-08-25-shift1.json'));
  const dryRun = args.includes('--dry-run');
  const database = createDatabase(process.env.DATABASE_URL, 1);
  try {
    await database.migrate();
    await seedTaxonomy(database.db);
    const email = process.env.ADMIN_BOOTSTRAP_EMAIL?.toLowerCase();
    const [admin] = await database.db
      .select({ id: admins.id })
      .from(admins)
      .where(email ? sql`lower(${admins.email}) = ${email}` : eq(admins.role, 'super_admin'))
      .limit(1);
    if (!admin) throw new Error('No admin account found. Run npm run seed (with ADMIN_BOOTSTRAP_EMAIL/PASSWORD) first.');
    const paper = loadPaper(file);
    const r = await seedPyq(database.db, paper, admin.id, { dryRun });
    console.log(`${paper.meta.paper}${dryRun ? ' (dry run)' : ''}`);
    console.log(`  imported as PYQ → NEEDS_REVIEW: ${r.imported} (${r.withWarnings} with validator warnings)`);
    console.log(`  rejected by validator: ${r.failed}`);
    for (const f of r.failures) console.log(`    - ${f.question}: ${f.issues.join('; ')}`);
    console.log(`  skipped (figure-based, listed in the analysis): ${r.skippedFigureBased.join(', ')}`);
    if (!dryRun) console.log(`  source material id: ${r.sourceMaterialId}\n  blueprint id: ${r.blueprintId}`);
  } finally {
    await database.close();
  }
}

if (isMainModule(import.meta.url)) {
  main().catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  });
}
