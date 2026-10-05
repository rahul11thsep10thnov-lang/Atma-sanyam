// npm run plan:queue [-- --file seed/plans/<plan>.json] [--dry-run]
//
// Queues the generation jobs of a plan file (one job per chapter) through the
// same code path as the console's "Generate Questions" form: cost estimate,
// budget check, batches of `Batch size`, then the worker generates, validates,
// AI-reviews and lands questions in APPROVED / NEEDS_REVIEW / REJECTED with
// easy / medium / hard labels. Nothing is published automatically.
//
// With MOCK_AI=true (the default) the jobs produce placeholder questions for
// testing the pipeline. Real questions need MOCK_AI=false and AI_API_KEY in
// backend/.env — see docs/UP_CONSTABLE_2024_PAPER_ANALYSIS.md.
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { and, eq, sql } from 'drizzle-orm';
import { createDatabase } from './client.js';
import { admins, chapters, exams, subjects } from './schema.js';
import { loadDotEnv } from '../config/dotenv.js';
import { loadEnv } from '../config/env.js';
import { isMainModule } from '../lib/isMain.js';
import { createAiProvider } from '../pipeline/ai/index.js';
import { createJob, estimate } from '../services/generationService.js';
import { generateFigureQuestions } from '../services/figureService.js';
import { SEED_DIR, seedTaxonomy } from './seedTaxonomy.js';

interface FigurePlan {
  name: string;
  engine: 'figures';
  exam: string;
  subject: string;
  languages: string[];
  difficulty: { easy: number; medium: number; hard: number };
  jobs: { generator: string; count: number }[];
}

interface Plan {
  name: string;
  engine?: 'ai';
  exam: string;
  language: string;
  difficulty: { easy: number; medium: number; hard: number };
  explanationRequired: boolean;
  additionalInstructions?: string;
  jobs: { subject: string; chapter: string; count: number }[];
}

async function main() {
  loadDotEnv();
  const env = loadEnv();
  const args = process.argv.slice(2);
  const fileArg = args.includes('--file') ? args[args.indexOf('--file') + 1] : undefined;
  const file = path.resolve(fileArg ?? path.join(SEED_DIR, 'plans', 'up-police-constable-5000.json'));
  const dryRun = args.includes('--dry-run');
  const raw = JSON.parse(readFileSync(file, 'utf8')) as Plan | FigurePlan;
  const database = createDatabase(env.DATABASE_URL, 1);
  try {
    await database.migrate();
    await seedTaxonomy(database.db);
    const db = database.db;
    const ai = createAiProvider(env);
    const email = process.env.ADMIN_BOOTSTRAP_EMAIL?.toLowerCase();
    const [admin] = await db
      .select({ id: admins.id })
      .from(admins)
      .where(email ? sql`lower(${admins.email}) = ${email}` : eq(admins.role, 'super_admin'))
      .limit(1);
    if (!admin) throw new Error('No admin account found. Run npm run seed first.');
    if (raw.engine === 'figures') {
      await runFigurePlan(db, raw, admin.id, dryRun);
      return;
    }
    const plan = raw;
    const [exam] = await db.select().from(exams).where(eq(exams.slug, plan.exam)).limit(1);
    if (!exam) throw new Error(`Exam ${plan.exam} not found.`);
    const subjectRows = await db.select().from(subjects).where(eq(subjects.examId, exam.id));
    const chapterRows = await db.select().from(chapters);

    const total = plan.jobs.reduce((a, j) => a + j.count, 0);
    const est = await estimate(db, env, ai, total);
    console.log(`${plan.name}\n  ${plan.jobs.length} jobs, ${total} questions, mix ${plan.difficulty.easy}/${plan.difficulty.medium}/${plan.difficulty.hard}`);
    console.log(`  provider: ${ai.name}${env.MOCK_AI ? ' (MOCK_AI=true — placeholder questions, no cost)' : ''}`);
    console.log(`  estimated cost: $${est.estimatedCostUsd.toFixed(2)} (spent this month: $${est.monthToDateSpendUsd.toFixed(2)})`);
    if (dryRun) {
      console.log('  dry run — nothing queued.');
      return;
    }
    let queued = 0;
    for (const j of plan.jobs) {
      const subject = subjectRows.find((s) => s.slug === j.subject);
      const chapter = subject && chapterRows.find((c) => c.subjectId === subject.id && c.slug === j.chapter);
      if (!subject || !chapter) {
        console.log(`  ! skipped ${j.subject}/${j.chapter}: not in the taxonomy`);
        continue;
      }
      await createJob(
        db,
        env,
        ai,
        {
          examId: exam.id,
          subjectId: subject.id,
          chapterId: chapter.id,
          language: plan.language,
          questionCount: j.count,
          questionType: 'mcq',
          difficulty: plan.difficulty,
          explanationRequired: plan.explanationRequired,
          additionalInstructions: plan.additionalInstructions ?? null,
        },
        admin.id
      );
      queued += j.count;
      console.log(`  queued ${String(j.count).padStart(4)}  ${subject.name} › ${chapter.name}`);
    }
    console.log(`\n${queued} questions queued. Start the API (npm run dev:all) — its worker picks the jobs up; watch progress under Generate Questions.`);
  } finally {
    await database.close();
  }
}

/** Figure plans need no AI and no worker: questions are drawn and stored right away. */
async function runFigurePlan(db: Parameters<typeof generateFigureQuestions>[0], plan: FigurePlan, adminId: string, dryRun: boolean) {
  const [exam] = await db.select().from(exams).where(eq(exams.slug, plan.exam)).limit(1);
  if (!exam) throw new Error(`Exam ${plan.exam} not found.`);
  const [subject] = await db.select().from(subjects).where(and(eq(subjects.examId, exam.id), eq(subjects.slug, plan.subject))).limit(1);
  if (!subject) throw new Error(`Subject ${plan.subject} not found in ${plan.exam}.`);
  const perLang = plan.jobs.reduce((a, j) => a + j.count, 0);
  console.log(`${plan.name}\n  ${plan.jobs.length} figure types × ${plan.languages.join(' + ')} = ${perLang * plan.languages.length} questions (no AI, no cost)`);
  if (dryRun) {
    console.log('  dry run — nothing created.');
    return;
  }
  let total = 0;
  for (const language of plan.languages)
    for (const job of plan.jobs) {
      const r = await generateFigureQuestions(
        db,
        { examId: exam.id, subjectId: subject.id, generators: [job.generator], language, count: job.count, difficulty: plan.difficulty },
        adminId
      );
      total += r.created;
      console.log(`  ${language.padEnd(7)} ${job.generator.padEnd(18)} ${String(r.created).padStart(4)} created${r.duplicatesSkipped ? `, ${r.duplicatesSkipped} repeats skipped` : ''}`);
    }
  console.log(`\n${total} figure questions are waiting in Review Questions (filter Source: Figure).`);
}

if (isMainModule(import.meta.url)) {
  main().catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  });
}
