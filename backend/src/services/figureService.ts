// Non-verbal (figure) questions into the question bank. The figure engine
// (src/figures) draws each question and computes its answer; this service
// picks chapters, rejects duplicates, runs the normal validator and stores
// the questions in NEEDS_REVIEW for a human to look at before publishing.
import { createHash } from 'node:crypto';
import { and, eq, inArray } from 'drizzle-orm';
import type { Db } from '../database/client.js';
import { chapters, exams, questions, subjects } from '../database/schema.js';
import { audit } from '../lib/audit.js';
import { badRequest, notFound, unprocessable } from '../lib/httpError.js';
import { log } from '../lib/logger.js';
import { ENGINE_VERSION, FIGURE_LANGS, GENERATORS, GENERATOR_MAP, generateFigureQuestion, type Difficulty, type FigLang } from '../figures/index.js';
import { randomSeed } from '../figures/rng.js';
import { normalizeText } from '../pipeline/similarity.js';
import { splitByPercent } from './generationService.js';
import { evaluate, insertQuestion } from './questionService.js';
import { resolveScope } from './taxonomyService.js';

export const MAX_FIGURES_PER_REQUEST = 500;
export const MAX_PREVIEW = 12;

export function listFigureGenerators() {
  return GENERATORS.map((g) => ({ id: g.id, chapter: g.chapter, title: g.title, description: g.description }));
}

function assertLanguage(lang: string): asserts lang is FigLang {
  if (!FIGURE_LANGS.includes(lang as FigLang)) throw badRequest(`Figure questions are available in ${FIGURE_LANGS.join(', ')}.`);
}

export function previewFigures(input: { generator: string; difficulty: Difficulty; language: string; count: number; seed?: number }) {
  if (!GENERATOR_MAP.has(input.generator)) throw notFound(`Unknown figure type "${input.generator}".`);
  assertLanguage(input.language);
  const base = input.seed ?? randomSeed();
  return Array.from({ length: Math.min(MAX_PREVIEW, input.count) }, (_, i) => {
    const q = generateFigureQuestion(input.generator, input.difficulty, input.language as FigLang, base + i);
    return {
      generator: q.generator,
      difficulty: q.difficulty,
      seed: q.seed,
      stem: q.stem,
      figureSvg: q.stimulus,
      options: q.options.map((o, k) => ({ label: 'ABCD'[k]!, text: o.text, svg: o.svg })),
      correctOption: 'ABCD'[q.correct]!,
      explanation: q.explanation,
    };
  });
}

export interface FigureBatchInput {
  examId: string;
  subjectId: string;
  generators: string[];
  language: string;
  count: number;
  difficulty: { easy: number; medium: number; hard: number };
  /** Optional: put every question in this chapter instead of the type's own chapter. */
  chapterId?: string | null;
}

const fingerprintOf = (language: string, key: string) => `fig:${createHash('sha256').update(`${language}\n${key}`).digest('hex').slice(0, 40)}`;

export async function generateFigureQuestions(db: Db, input: FigureBatchInput, adminId: string) {
  assertLanguage(input.language);
  const lang = input.language as FigLang;
  if (input.count < 1 || input.count > MAX_FIGURES_PER_REQUEST) throw badRequest(`Ask for 1–${MAX_FIGURES_PER_REQUEST} questions at a time.`);
  const pct = input.difficulty.easy + input.difficulty.medium + input.difficulty.hard;
  if (pct !== 100) throw unprocessable(`Difficulty percentages must add up to 100 (they add up to ${pct}).`);
  const gens = [...new Set(input.generators)];
  if (!gens.length) throw badRequest('Choose at least one figure type.');
  for (const g of gens) if (!GENERATOR_MAP.has(g)) throw notFound(`Unknown figure type "${g}".`);

  const [exam] = await db.select().from(exams).where(eq(exams.id, input.examId)).limit(1);
  if (!exam) throw notFound('Exam not found');
  const [subject] = await db.select().from(subjects).where(and(eq(subjects.id, input.subjectId), eq(subjects.examId, exam.id))).limit(1);
  if (!subject) throw notFound('Subject not found in this exam');

  // Chapter for each figure type: the override, or the chapter with the type's slug.
  const chapterRows = await db.select().from(chapters).where(and(eq(chapters.subjectId, subject.id), eq(chapters.status, 'active')));
  const chapterFor = new Map<string, string>();
  const missing: string[] = [];
  for (const g of gens) {
    if (input.chapterId) {
      if (!chapterRows.some((c) => c.id === input.chapterId)) throw notFound('Chapter not found in this subject');
      chapterFor.set(g, input.chapterId);
      continue;
    }
    const slug = GENERATOR_MAP.get(g)!.chapter;
    const ch = chapterRows.find((c) => c.slug === slug);
    if (ch) chapterFor.set(g, ch.id);
    else missing.push(slug);
  }
  if (missing.length) {
    throw unprocessable(
      `${subject.name} has no chapter(s) ${[...new Set(missing)].map((m) => `"${m}"`).join(', ')}. Add them under Exams, Subjects & Chapters, or choose one chapter for all questions.`
    );
  }

  // Existing figure fingerprints in this subject, to reject repeats.
  const existing = await db
    .select({ fp: questions.fingerprint })
    .from(questions)
    .where(and(eq(questions.examId, exam.id), eq(questions.subjectId, subject.id), inArray(questions.source, ['figure'])));
  const seen = new Set(existing.map((e) => e.fp));

  // Split the whole request by difficulty first (so 30/50/20 holds for the
  // total), then deal the slots out over the chosen types in turn.
  const split = splitByPercent(input.count, input.difficulty);
  const slots: { g: string; d: Difficulty }[] = [];
  let turn = 0;
  for (const d of ['easy', 'medium', 'hard'] as const)
    for (let k = 0; k < split[d]; k++) slots.push({ g: gens[turn++ % gens.length]!, d });

  const report = {
    requested: input.count,
    created: 0,
    duplicatesSkipped: 0,
    failed: 0,
    byType: {} as Record<string, { easy: number; medium: number; hard: number }>,
    questionIds: [] as string[],
    errors: [] as string[],
  };
  const scopeCache = new Map<string, boolean>();

  for (const { g, d } of slots) {
    report.byType[g] ??= { easy: 0, medium: 0, hard: 0 };
    let saved = false;
    for (let attempt = 0; attempt < 12 && !saved; attempt++) {
      let q;
      try {
        q = generateFigureQuestion(g, d, lang, randomSeed());
      } catch (e) {
        report.errors.push((e as Error).message);
        break;
      }
      const fp = fingerprintOf(lang, q.key);
      if (seen.has(fp)) {
        report.duplicatesSkipped++;
        continue;
      }
      const chapterId = chapterFor.get(g)!;
      if (!scopeCache.has(chapterId)) scopeCache.set(chapterId, (await resolveScope(db, { examId: exam.id, subjectId: subject.id, chapterId })).ok);
      const ev = evaluate(
        {
          question_text: q.stem,
          options: q.options.map((o, i) => ({ id: 'ABCD'[i]!, text: o.text })),
          correct_option: 'ABCD'[q.correct]!,
          explanation: q.explanation,
          difficulty: q.difficulty,
          computation: null,
          language: lang,
          question_type: 'mcq',
          examId: exam.id,
          subjectId: subject.id,
          chapterId,
          topicId: null,
        },
        { explanationRequired: true, metadataOk: scopeCache.get(chapterId)!, sourceProvided: true, pool: [] }
      );
      if (ev.validation.decision === 'rejected') {
        report.errors.push(`${g}/${d}: ${ev.validation.issues.map((i) => i.message).join('; ')}`);
        break;
      }
      ev.normalizedText = `${normalizeText(q.stem)} ${fp}`;
      ev.fingerprint = fp;
      const row = await insertQuestion(db, ev, {
        status: 'needs_review',
        source: 'figure',
        sourceName: `Figure engine (${ENGINE_VERSION})`,
        sourceReference: `${g}, seed ${q.seed}`,
        createdBy: adminId,
        figure: {
          svg: q.stimulus,
          kind: g,
          params: { engine: ENGINE_VERSION, generator: g, difficulty: d, language: lang, seed: q.seed },
          optionSvgs: q.options.map((o) => o.svg),
        },
      });
      seen.add(fp);
      report.created++;
      report.byType[g]![d]++;
      report.questionIds.push(row.id);
      saved = true;
    }
    if (!saved) report.failed++;
  }
  report.errors = [...new Set(report.errors)].slice(0, 10);
  await audit(db, adminId, 'figures.generated', 'question', null, {
    examId: exam.id,
    subjectId: subject.id,
    language: lang,
    requested: input.count,
    created: report.created,
    duplicatesSkipped: report.duplicatesSkipped,
    types: gens,
  });
  log.info('figures.generated', { created: report.created, requested: input.count, language: lang });
  return report;
}
