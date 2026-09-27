import { and, asc, count, desc, eq, inArray, ne } from 'drizzle-orm';
import type { Db } from '../database/client.js';
import {
  chapters,
  exams,
  mockBlueprints,
  mockTestQuestions,
  mockTests,
  questionOptions,
  questions,
  subjects,
  type BlueprintSection,
  type DifficultyDistribution,
} from '../database/schema.js';
import { audit } from '../lib/audit.js';
import { conflict, notFound, unprocessable } from '../lib/httpError.js';
import { ENABLED_LANGUAGE_CODES } from '../lib/languages.js';
import { splitByPercent } from './generationService.js';

type Difficulty = 'easy' | 'medium' | 'hard';
const FALLBACK: Record<Difficulty, Difficulty[]> = {
  easy: ['medium', 'hard'],
  medium: ['easy', 'hard'],
  hard: ['medium', 'easy'],
};

export interface MockSpec {
  examId: string;
  title: string;
  description?: string | null;
  language: string;
  totalQuestions: number;
  durationMinutes: number;
  marksPerQuestion: number;
  negativeMarks: number;
  /** Percentages adding up to 100. */
  difficulty: DifficultyDistribution;
  /** Optional subject (and chapter) distribution; counts must add up to totalQuestions. */
  sections?: BlueprintSection[];
  blueprintId?: string | null;
  /** Deterministic selection for tests. */
  random?: () => number;
}

interface Candidate {
  id: string;
  subjectId: string;
  chapterId: string;
  difficulty: Difficulty;
  duplicateOfId: string | null;
  fingerprint: string;
  usage: number;
  tiebreak: number;
}

export interface SelectionReport {
  sections: { subjectId: string; subjectName: string; requested: number; selected: number; byDifficulty: DifficultyDistribution; available: number }[];
  warnings: string[];
}

/**
 * Picks questions for one test. Pure selection logic: only PUBLISHED
 * questions of the exam+language, no repeats within the test, no two
 * questions from the same duplicate cluster, difficulty split per section,
 * and least-used questions first so a series of tests repeats as little
 * as possible.
 */
export async function selectQuestions(db: Db, spec: MockSpec): Promise<{ picks: { id: string; subjectId: string }[]; report: SelectionReport }> {
  const random = spec.random ?? Math.random;
  const rows = await db
    .select({
      id: questions.id,
      subjectId: questions.subjectId,
      chapterId: questions.chapterId,
      difficulty: questions.difficulty,
      duplicateOfId: questions.duplicateOfId,
      fingerprint: questions.fingerprint,
    })
    .from(questions)
    .where(and(eq(questions.examId, spec.examId), eq(questions.language, spec.language), eq(questions.status, 'published')));

  const usageRows = rows.length
    ? await db
        .select({ questionId: mockTestQuestions.questionId, n: count() })
        .from(mockTestQuestions)
        .innerJoin(mockTests, eq(mockTests.id, mockTestQuestions.mockTestId))
        .where(and(eq(mockTests.examId, spec.examId), ne(mockTests.status, 'archived')))
        .groupBy(mockTestQuestions.questionId)
    : [];
  const usage = new Map(usageRows.map((u) => [u.questionId, Number(u.n)]));
  const pool: Candidate[] = rows.map((r) => ({ ...r, usage: usage.get(r.id) ?? 0, tiebreak: random() }));

  const subjectRows = await db.select({ id: subjects.id, name: subjects.name }).from(subjects).where(eq(subjects.examId, spec.examId));
  const subjectName = new Map(subjectRows.map((s) => [s.id, s.name]));

  const sections: BlueprintSection[] = spec.sections?.length
    ? spec.sections
    : [{ subjectId: '*', count: spec.totalQuestions }];

  const chosen = new Set<string>();
  const clusters = new Set<string>();
  const clusterOf = (c: Candidate) => [c.id, c.duplicateOfId, `fp:${c.fingerprint}`].filter(Boolean) as string[];
  const usable = (c: Candidate) => !chosen.has(c.id) && !clusterOf(c).some((k) => clusters.has(k));
  const take = (c: Candidate) => {
    chosen.add(c.id);
    clusterOf(c).forEach((k) => clusters.add(k));
  };
  const byPreference = (a: Candidate, b: Candidate) => a.usage - b.usage || a.tiebreak - b.tiebreak;

  const picks: { id: string; subjectId: string }[] = [];
  const report: SelectionReport = { sections: [], warnings: [] };

  // Take `n` of difficulty `d` (falling back to neighbouring difficulties).
  function fill(candidates: Candidate[], target: DifficultyDistribution, label: string) {
    const got: DifficultyDistribution = { easy: 0, medium: 0, hard: 0 };
    const out: Candidate[] = [];
    for (const d of ['easy', 'medium', 'hard'] as const) {
      const bucket = candidates.filter((c) => c.difficulty === d).sort(byPreference);
      for (const c of bucket) {
        if (got[d] >= target[d]) break;
        if (!usable(c)) continue;
        take(c);
        out.push(c);
        got[d]++;
      }
    }
    for (const d of ['easy', 'medium', 'hard'] as const) {
      const shortfall = target[d] - got[d];
      let missing = shortfall;
      if (missing <= 0) continue;
      for (const alt of FALLBACK[d]) {
        const bucket = candidates.filter((c) => c.difficulty === alt).sort(byPreference);
        for (const c of bucket) {
          if (missing <= 0) break;
          if (!usable(c)) continue;
          take(c);
          out.push(c);
          got[alt]++;
          missing--;
        }
      }
      if (missing < shortfall) {
        report.warnings.push(`${label}: only ${target[d] - shortfall} ${d} question(s) available; used ${shortfall - missing} of another difficulty instead.`);
      }
    }
    return { out, got };
  }

  for (const section of sections) {
    const inSection = pool.filter((c) => section.subjectId === '*' || c.subjectId === section.subjectId);
    const name = section.subjectId === '*' ? 'All subjects' : (subjectName.get(section.subjectId) ?? 'Unknown subject');
    const sectionPicks: Candidate[] = [];
    const got: DifficultyDistribution = { easy: 0, medium: 0, hard: 0 };
    const chapterQuota = Object.entries(section.chapters ?? {}).filter(([, n]) => n > 0);
    let remaining = section.count;
    for (const [chapterId, n] of chapterQuota) {
      const r = fill(
        inSection.filter((c) => c.chapterId === chapterId),
        splitByPercent(Math.min(n, remaining), spec.difficulty),
        `${name} / chapter`
      );
      sectionPicks.push(...r.out);
      (['easy', 'medium', 'hard'] as const).forEach((d) => (got[d] += r.got[d]));
      remaining -= r.out.length;
    }
    if (remaining > 0) {
      // Difficulty target for the rest = section target minus what chapters gave.
      const full = splitByPercent(section.count, spec.difficulty);
      const rest: DifficultyDistribution = {
        easy: Math.max(0, full.easy - got.easy),
        medium: Math.max(0, full.medium - got.medium),
        hard: Math.max(0, full.hard - got.hard),
      };
      let over = rest.easy + rest.medium + rest.hard - remaining;
      for (const d of ['hard', 'medium', 'easy'] as const) {
        const cut = Math.min(over, rest[d]);
        rest[d] -= cut;
        over -= cut;
      }
      const r = fill(inSection, rest, name);
      sectionPicks.push(...r.out);
      (['easy', 'medium', 'hard'] as const).forEach((d) => (got[d] += r.got[d]));
    }
    // Mix difficulties within the section so the test doesn't run easy → hard.
    for (let i = sectionPicks.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [sectionPicks[i], sectionPicks[j]] = [sectionPicks[j]!, sectionPicks[i]!];
    }
    picks.push(...sectionPicks.map((c) => ({ id: c.id, subjectId: c.subjectId })));
    report.sections.push({
      subjectId: section.subjectId,
      subjectName: name,
      requested: section.count,
      selected: sectionPicks.length,
      byDifficulty: got,
      available: inSection.length,
    });
  }
  return { picks, report };
}

function validateSpec(spec: MockSpec) {
  if (!ENABLED_LANGUAGE_CODES.includes(spec.language)) throw unprocessable(`Language ${spec.language} is not enabled.`);
  const pct = spec.difficulty.easy + spec.difficulty.medium + spec.difficulty.hard;
  if (pct !== 100) throw unprocessable(`Difficulty percentages must add up to 100 (they add up to ${pct}).`);
  if (spec.sections?.length) {
    const sum = spec.sections.reduce((s, x) => s + x.count, 0);
    if (sum !== spec.totalQuestions) throw unprocessable(`Section counts add up to ${sum}, but the test has ${spec.totalQuestions} questions.`);
    for (const s of spec.sections) {
      const chapterSum = Object.values(s.chapters ?? {}).reduce((a, b) => a + b, 0);
      if (chapterSum > s.count) throw unprocessable('Chapter counts in a section cannot exceed the section total.');
    }
  }
}

export async function generateMockTest(db: Db, spec: MockSpec, adminId: string) {
  validateSpec(spec);
  const [exam] = await db.select().from(exams).where(eq(exams.id, spec.examId)).limit(1);
  if (!exam) throw notFound('Exam not found');
  const { picks, report } = await selectQuestions(db, spec);
  if (picks.length < spec.totalQuestions) {
    const detail = report.sections
      .filter((s) => s.selected < s.requested)
      .map((s) => `${s.subjectName}: needs ${s.requested}, ${s.selected} usable of ${s.available} published`)
      .join('; ');
    throw unprocessable(`Not enough published questions for this test. ${detail}. Publish more questions or reduce the counts.`, report);
  }
  const test = await db.transaction(async (tx) => {
    const [row] = await tx
      .insert(mockTests)
      .values({
        examId: spec.examId,
        blueprintId: spec.blueprintId ?? null,
        title: spec.title,
        description: spec.description ?? null,
        language: spec.language,
        durationMinutes: spec.durationMinutes,
        totalQuestions: picks.length,
        marksPerQuestion: String(spec.marksPerQuestion),
        negativeMarks: String(spec.negativeMarks),
        difficultyDistribution: spec.difficulty,
        createdBy: adminId,
      })
      .returning();
    await tx.insert(mockTestQuestions).values(
      picks.map((p, i) => ({ mockTestId: row!.id, questionId: p.id, position: i + 1, sectionSubjectId: p.subjectId }))
    );
    return row!;
  });
  await audit(db, adminId, 'mocktest.generated', 'mock_test', test.id, {
    questions: picks.length,
    blueprintId: spec.blueprintId ?? null,
    warnings: report.warnings.length,
  });
  return { test, report };
}

// ---------------------------------------------------------------------------
// Blueprints
// ---------------------------------------------------------------------------

export interface BlueprintInput {
  examId: string;
  name: string;
  language: string;
  totalQuestions: number;
  durationMinutes: number;
  marksPerQuestion: number;
  negativeMarks: number;
  difficulty: DifficultyDistribution;
  sections: BlueprintSection[];
}

export async function saveBlueprint(db: Db, input: BlueprintInput, adminId: string, id?: string) {
  validateSpec({ ...input, title: input.name });
  const values = {
    examId: input.examId,
    name: input.name,
    language: input.language,
    totalQuestions: input.totalQuestions,
    durationMinutes: input.durationMinutes,
    marksPerQuestion: String(input.marksPerQuestion),
    negativeMarks: String(input.negativeMarks),
    difficultyDistribution: input.difficulty,
    sections: input.sections,
  };
  if (id) {
    const [row] = await db.update(mockBlueprints).set({ ...values, updatedAt: new Date() }).where(eq(mockBlueprints.id, id)).returning();
    if (!row) throw notFound('Blueprint not found');
    await audit(db, adminId, 'blueprint.updated', 'mock_blueprint', id);
    return row;
  }
  const [row] = await db.insert(mockBlueprints).values({ ...values, createdBy: adminId }).returning();
  await audit(db, adminId, 'blueprint.created', 'mock_blueprint', row!.id);
  return row!;
}

export async function listBlueprints(db: Db, examId?: string) {
  const rows = await db
    .select({ bp: mockBlueprints, examName: exams.name })
    .from(mockBlueprints)
    .innerJoin(exams, eq(exams.id, mockBlueprints.examId))
    .where(and(eq(mockBlueprints.status, 'active'), examId ? eq(mockBlueprints.examId, examId) : undefined))
    .orderBy(desc(mockBlueprints.createdAt));
  const counts = await db
    .select({ blueprintId: mockTests.blueprintId, n: count() })
    .from(mockTests)
    .where(ne(mockTests.status, 'archived'))
    .groupBy(mockTests.blueprintId);
  return rows.map((r) => ({ ...r.bp, examName: r.examName, testsCreated: Number(counts.find((c) => c.blueprintId === r.bp.id)?.n ?? 0) }));
}

/** "Mock Test 1 … Mock Test N" from a blueprint, minimizing repetition. Stops
 * at the first test that cannot be filled and reports how far it got. */
export async function generateFromBlueprint(db: Db, blueprintId: string, howMany: number, publish: boolean, adminId: string) {
  const [bp] = await db.select().from(mockBlueprints).where(eq(mockBlueprints.id, blueprintId)).limit(1);
  if (!bp) throw notFound('Blueprint not found');
  const [existing] = await db.select({ n: count() }).from(mockTests).where(eq(mockTests.blueprintId, blueprintId));
  let next = Number(existing?.n ?? 0) + 1;
  const created: { id: string; title: string; warnings: string[] }[] = [];
  let stoppedReason: string | null = null;
  for (let i = 0; i < howMany; i++) {
    try {
      const { test, report } = await generateMockTest(
        db,
        {
          examId: bp.examId,
          title: `${bp.name} — Mock Test ${next}`,
          language: bp.language,
          totalQuestions: bp.totalQuestions,
          durationMinutes: bp.durationMinutes,
          marksPerQuestion: Number(bp.marksPerQuestion),
          negativeMarks: Number(bp.negativeMarks),
          difficulty: bp.difficultyDistribution,
          sections: bp.sections,
          blueprintId: bp.id,
        },
        adminId
      );
      if (publish) await setMockTestStatus(db, test.id, 'publish', adminId);
      created.push({ id: test.id, title: test.title, warnings: report.warnings });
      next++;
    } catch (e) {
      stoppedReason = (e as Error).message;
      break;
    }
  }
  return { created, stoppedReason };
}

// ---------------------------------------------------------------------------
// Lifecycle & reads
// ---------------------------------------------------------------------------

export async function setMockTestStatus(db: Db, id: string, action: 'publish' | 'unpublish' | 'archive', adminId: string) {
  const [test] = await db.select().from(mockTests).where(eq(mockTests.id, id)).limit(1);
  if (!test) throw notFound('Mock test not found');
  if (action === 'publish') {
    if (test.status === 'archived') throw conflict('Restore is not supported for archived tests; generate a new one.');
    const notLive = await db
      .select({ id: questions.id, status: questions.status })
      .from(mockTestQuestions)
      .innerJoin(questions, eq(questions.id, mockTestQuestions.questionId))
      .where(and(eq(mockTestQuestions.mockTestId, id), ne(questions.status, 'published')));
    if (notLive.length) {
      throw unprocessable(`${notLive.length} question(s) in this test are no longer published. Regenerate the test.`, notLive);
    }
  }
  const status = action === 'publish' ? 'published' : action === 'unpublish' ? 'draft' : 'archived';
  await db
    .update(mockTests)
    .set({ status, updatedAt: new Date(), ...(action === 'publish' ? { publishedAt: new Date() } : {}) })
    .where(eq(mockTests.id, id));
  await audit(db, adminId, `mocktest.${action === 'publish' ? 'published' : action === 'unpublish' ? 'unpublished' : 'archived'}`, 'mock_test', id);
  return { id, status };
}

export async function updateMockTest(db: Db, id: string, patch: { title?: string; description?: string | null; durationMinutes?: number }, adminId: string) {
  const [row] = await db.update(mockTests).set({ ...patch, updatedAt: new Date() }).where(eq(mockTests.id, id)).returning();
  if (!row) throw notFound('Mock test not found');
  await audit(db, adminId, 'mocktest.updated', 'mock_test', id, patch);
  return row;
}

export async function listMockTests(
  db: Db,
  f: { examId?: string; status?: 'draft' | 'published' | 'archived'; stateCode?: string; examType?: string; page?: number; pageSize?: number }
) {
  const page = Math.max(1, f.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, f.pageSize ?? 50));
  const where = and(
    f.examId ? eq(mockTests.examId, f.examId) : undefined,
    f.status ? eq(mockTests.status, f.status) : ne(mockTests.status, 'archived'),
    f.stateCode ? eq(exams.stateCode, f.stateCode) : undefined,
    f.examType ? eq(exams.examType, f.examType) : undefined
  );
  const [total] = await db.select({ n: count() }).from(mockTests).innerJoin(exams, eq(exams.id, mockTests.examId)).where(where);
  const rows = await db
    .select({ t: mockTests, examName: exams.name, examSlug: exams.slug, stateCode: exams.stateCode, examType: exams.examType })
    .from(mockTests)
    .innerJoin(exams, eq(exams.id, mockTests.examId))
    .where(where)
    .orderBy(desc(mockTests.publishedAt), desc(mockTests.createdAt))
    .limit(pageSize)
    .offset((page - 1) * pageSize);
  const ids = rows.map((r) => r.t.id);
  const sectionRows = ids.length
    ? await db
        .select({ mockTestId: mockTestQuestions.mockTestId, subjectId: mockTestQuestions.sectionSubjectId, name: subjects.name, n: count() })
        .from(mockTestQuestions)
        .leftJoin(subjects, eq(subjects.id, mockTestQuestions.sectionSubjectId))
        .where(inArray(mockTestQuestions.mockTestId, ids))
        .groupBy(mockTestQuestions.mockTestId, mockTestQuestions.sectionSubjectId, subjects.name)
    : [];
  return {
    page,
    pageSize,
    total: Number(total?.n ?? 0),
    items: rows.map((r) => ({
      ...r.t,
      marksPerQuestion: Number(r.t.marksPerQuestion),
      negativeMarks: Number(r.t.negativeMarks),
      examName: r.examName,
      examSlug: r.examSlug,
      stateCode: r.stateCode,
      examType: r.examType,
      sections: sectionRows
        .filter((s) => s.mockTestId === r.t.id)
        .map((s) => ({ subjectId: s.subjectId, subjectName: s.name ?? 'General', count: Number(s.n) })),
    })),
  };
}

/**
 * A test with its questions. `includeAnswers` is for the admin console only;
 * the public API never sends correct answers or explanations before submit.
 * Public reads only include questions that are still PUBLISHED.
 */
export async function getMockTest(db: Db, id: string, opts: { includeAnswers: boolean; publicOnly: boolean }) {
  const [row] = await db
    .select({ t: mockTests, examName: exams.name, stateCode: exams.stateCode, examType: exams.examType })
    .from(mockTests)
    .innerJoin(exams, eq(exams.id, mockTests.examId))
    .where(and(eq(mockTests.id, id), opts.publicOnly ? eq(mockTests.status, 'published') : undefined))
    .limit(1);
  if (!row) throw notFound('Mock test not found');
  const qs = await db
    .select({
      id: questions.id,
      position: mockTestQuestions.position,
      subjectId: mockTestQuestions.sectionSubjectId,
      subjectName: subjects.name,
      chapterName: chapters.name,
      questionText: questions.questionText,
      difficulty: questions.difficulty,
      status: questions.status,
      correctOption: questions.correctOption,
      explanation: questions.explanation,
    })
    .from(mockTestQuestions)
    .innerJoin(questions, eq(questions.id, mockTestQuestions.questionId))
    .leftJoin(subjects, eq(subjects.id, mockTestQuestions.sectionSubjectId))
    .innerJoin(chapters, eq(chapters.id, questions.chapterId))
    .where(and(eq(mockTestQuestions.mockTestId, id), opts.publicOnly ? eq(questions.status, 'published') : undefined))
    .orderBy(asc(mockTestQuestions.position));
  const optionRows = qs.length
    ? await db
        .select({ questionId: questionOptions.questionId, label: questionOptions.label, text: questionOptions.text })
        .from(questionOptions)
        .where(inArray(questionOptions.questionId, qs.map((q) => q.id)))
        .orderBy(asc(questionOptions.sortOrder))
    : [];
  const optionsFor = (qid: string) => optionRows.filter((o) => o.questionId === qid).map((o) => ({ label: o.label, text: o.text }));
  return {
    id: row.t.id,
    examId: row.t.examId,
    examName: row.examName,
    stateCode: row.stateCode,
    examType: row.examType,
    title: row.t.title,
    description: row.t.description,
    language: row.t.language,
    status: row.t.status,
    durationMinutes: row.t.durationMinutes,
    totalQuestions: qs.length,
    marksPerQuestion: Number(row.t.marksPerQuestion),
    negativeMarks: Number(row.t.negativeMarks),
    publishedAt: row.t.publishedAt,
    questions: qs.map((q) => ({
      id: q.id,
      position: q.position,
      subjectId: q.subjectId,
      subjectName: q.subjectName ?? 'General',
      chapterName: q.chapterName,
      questionText: q.questionText,
      difficulty: q.difficulty,
      options: optionsFor(q.id),
      ...(opts.includeAnswers ? { status: q.status, correctOption: q.correctOption, explanation: q.explanation } : {}),
    })),
  };
}

