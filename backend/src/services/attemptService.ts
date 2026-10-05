import { and, asc, desc, eq, inArray, lt, sql } from 'drizzle-orm';
import type { Db } from '../database/client.js';
import { exams, mockTestQuestions, mockTests, questionOptions, questions, subjects, testAnswers, testAttempts } from '../database/schema.js';
import { badRequest, conflict, notFound } from '../lib/httpError.js';
import { log } from '../lib/logger.js';

export interface SubmittedAnswer {
  questionId: string;
  selectedOption: string | null;
  markedForReview?: boolean;
  timeSpentSeconds?: number | null;
}

/** Starts (or resumes) an attempt. The questions served are recorded now, so
 * scoring later uses exactly the set the user saw. */
export async function startAttempt(db: Db, userId: string, mockTestId: string, graceSeconds: number) {
  const [test] = await db.select().from(mockTests).where(and(eq(mockTests.id, mockTestId), eq(mockTests.status, 'published'))).limit(1);
  if (!test) throw notFound('Mock test not found');

  const now = new Date();
  const [open] = await db
    .select()
    .from(testAttempts)
    .where(and(eq(testAttempts.userId, userId), eq(testAttempts.mockTestId, mockTestId), eq(testAttempts.status, 'in_progress')))
    .orderBy(desc(testAttempts.startedAt))
    .limit(1);
  if (open && open.deadlineAt.getTime() + graceSeconds * 1000 > now.getTime()) {
    return { attemptId: open.id, startedAt: open.startedAt, deadlineAt: open.deadlineAt, serverTime: now, resumed: true, totalQuestions: open.totalQuestions };
  }
  // Close expired attempts before starting a new one, so an old attempt can't
  // be submitted later with answers learned from a newer attempt's result.
  await closeExpiredAttempts(db, userId, mockTestId, graceSeconds);

  const served = await db
    .select({ id: questions.id, position: mockTestQuestions.position })
    .from(mockTestQuestions)
    .innerJoin(questions, eq(questions.id, mockTestQuestions.questionId))
    .where(and(eq(mockTestQuestions.mockTestId, mockTestId), eq(questions.status, 'published')))
    .orderBy(asc(mockTestQuestions.position));
  if (served.length === 0) throw conflict('This test has no questions available right now.');

  const deadlineAt = new Date(now.getTime() + test.durationMinutes * 60_000);
  const attempt = await db.transaction(async (tx) => {
    const [row] = await tx
      .insert(testAttempts)
      .values({ userId, mockTestId, startedAt: now, deadlineAt, totalQuestions: served.length })
      .returning();
    await tx.insert(testAnswers).values(served.map((q) => ({ attemptId: row!.id, questionId: q.id, position: q.position })));
    return row!;
  });
  log.info('attempt.started', { attemptId: attempt.id, mockTestId, questions: served.length });
  return { attemptId: attempt.id, startedAt: attempt.startedAt, deadlineAt, serverTime: now, resumed: false, totalQuestions: served.length };
}

async function closeExpiredAttempts(db: Db, userId: string, mockTestId: string, graceSeconds: number) {
  const cutoff = new Date(Date.now() - graceSeconds * 1000);
  const stale = await db
    .select()
    .from(testAttempts)
    .where(
      and(
        eq(testAttempts.userId, userId),
        eq(testAttempts.mockTestId, mockTestId),
        eq(testAttempts.status, 'in_progress'),
        lt(testAttempts.deadlineAt, cutoff)
      )
    );
  if (!stale.length) return;
  const [test] = await db.select({ marks: mockTests.marksPerQuestion }).from(mockTests).where(eq(mockTests.id, mockTestId)).limit(1);
  const marks = Number(test?.marks ?? 0);
  for (const a of stale) {
    // Nothing was submitted in time: every question counts as unanswered.
    await db
      .update(testAttempts)
      .set({
        status: 'submitted',
        submittedAt: a.deadlineAt,
        timeTakenSeconds: Math.round((a.deadlineAt.getTime() - a.startedAt.getTime()) / 1000),
        attemptedCount: 0,
        correctCount: 0,
        incorrectCount: 0,
        unansweredCount: a.totalQuestions,
        score: '0.00',
        maxScore: (a.totalQuestions * marks).toFixed(2),
        percentage: '0.00',
        late: true,
      })
      .where(and(eq(testAttempts.id, a.id), eq(testAttempts.status, 'in_progress')));
    log.info('attempt.expired', { attemptId: a.id, mockTestId });
  }
}

/** Scores an attempt from the database answer key. Scores sent by a client
 * are never read. Submitting twice returns the stored result. */
export async function submitAttempt(
  db: Db,
  userId: string,
  mockTestId: string,
  attemptId: string,
  answers: SubmittedAnswer[],
  graceSeconds: number
) {
  const [attempt] = await db.select().from(testAttempts).where(eq(testAttempts.id, attemptId)).limit(1);
  if (!attempt || attempt.userId !== userId || attempt.mockTestId !== mockTestId) throw notFound('Attempt not found');
  if (attempt.status === 'submitted') return getResult(db, userId, attemptId);

  const [test] = await db.select().from(mockTests).where(eq(mockTests.id, mockTestId)).limit(1);
  if (!test) throw notFound('Mock test not found');

  const served = await db
    .select({ answerId: testAnswers.id, questionId: testAnswers.questionId, correctOption: questions.correctOption })
    .from(testAnswers)
    .innerJoin(questions, eq(questions.id, testAnswers.questionId))
    .where(eq(testAnswers.attemptId, attemptId));
  const servedIds = new Set(served.map((s) => s.questionId));

  const byQuestion = new Map<string, SubmittedAnswer>();
  for (const a of answers) {
    if (!servedIds.has(a.questionId)) throw badRequest(`Question ${a.questionId} is not part of this attempt.`);
    if (a.selectedOption !== null && !/^[A-D]$/.test(a.selectedOption)) throw badRequest(`Invalid option "${a.selectedOption}".`);
    byQuestion.set(a.questionId, a);
  }

  const marks = Number(test.marksPerQuestion);
  const negative = Number(test.negativeMarks);
  let correct = 0;
  let incorrect = 0;
  const now = new Date();
  const late = now.getTime() > attempt.deadlineAt.getTime() + graceSeconds * 1000;
  const maxSeconds = test.durationMinutes * 60;
  const timeTaken = Math.max(0, Math.min(maxSeconds, Math.round((now.getTime() - attempt.startedAt.getTime()) / 1000)));

  await db.transaction(async (tx) => {
    for (const s of served) {
      const a = byQuestion.get(s.questionId);
      const selected = a?.selectedOption ?? null;
      const isCorrect = selected === null ? null : selected === s.correctOption;
      if (isCorrect === true) correct++;
      else if (isCorrect === false) incorrect++;
      await tx
        .update(testAnswers)
        .set({
          selectedOption: selected,
          isCorrect,
          markedForReview: a?.markedForReview ?? false,
          timeSpentSeconds: a?.timeSpentSeconds != null ? Math.max(0, Math.min(maxSeconds, Math.round(a.timeSpentSeconds))) : null,
        })
        .where(eq(testAnswers.id, s.answerId));
    }
    const total = served.length;
    const score = correct * marks - incorrect * negative;
    const maxScore = total * marks;
    await tx
      .update(testAttempts)
      .set({
        status: 'submitted',
        submittedAt: now,
        timeTakenSeconds: timeTaken,
        attemptedCount: correct + incorrect,
        correctCount: correct,
        incorrectCount: incorrect,
        unansweredCount: total - correct - incorrect,
        score: score.toFixed(2),
        maxScore: maxScore.toFixed(2),
        percentage: (maxScore > 0 ? (score / maxScore) * 100 : 0).toFixed(2),
        late,
      })
      .where(eq(testAttempts.id, attemptId));
  });
  log.info('attempt.submitted', { attemptId, mockTestId, correct, incorrect, late });
  return getResult(db, userId, attemptId);
}

export async function getResult(db: Db, userId: string, attemptId: string) {
  const [row] = await db
    .select({ a: testAttempts, title: mockTests.title, marks: mockTests.marksPerQuestion, negative: mockTests.negativeMarks, examName: exams.name })
    .from(testAttempts)
    .innerJoin(mockTests, eq(mockTests.id, testAttempts.mockTestId))
    .innerJoin(exams, eq(exams.id, mockTests.examId))
    .where(eq(testAttempts.id, attemptId))
    .limit(1);
  if (!row || row.a.userId !== userId) throw notFound('Attempt not found');
  if (row.a.status !== 'submitted') throw conflict('This attempt has not been submitted yet.');

  const items = await db
    .select({
      questionId: testAnswers.questionId,
      selectedOption: testAnswers.selectedOption,
      isCorrect: testAnswers.isCorrect,
      markedForReview: testAnswers.markedForReview,
      questionText: questions.questionText,
      correctOption: questions.correctOption,
      explanation: questions.explanation,
      // The question number the candidate saw. A question swapped out of the
      // test afterwards is no longer in mock_test_questions, so the answer row
      // carries its own position.
      position: sql<number>`coalesce(${testAnswers.position}, ${mockTestQuestions.position}, 0)`,
      subjectId: questions.subjectId,
      subjectName: subjects.name,
    })
    .from(testAnswers)
    .innerJoin(questions, eq(questions.id, testAnswers.questionId))
    .leftJoin(
      mockTestQuestions,
      and(eq(mockTestQuestions.questionId, testAnswers.questionId), eq(mockTestQuestions.mockTestId, row.a.mockTestId))
    )
    .leftJoin(subjects, eq(subjects.id, questions.subjectId))
    .where(eq(testAnswers.attemptId, attemptId))
    .orderBy(sql`coalesce(${testAnswers.position}, ${mockTestQuestions.position}, 0)`);
  const opts = items.length
    ? await db
        .select({ questionId: questionOptions.questionId, label: questionOptions.label, text: questionOptions.text })
        .from(questionOptions)
        .where(inArray(questionOptions.questionId, items.map((i) => i.questionId)))
        .orderBy(asc(questionOptions.sortOrder))
    : [];

  const sections = new Map<string, { subjectName: string; total: number; correct: number; incorrect: number; unanswered: number }>();
  for (const i of items) {
    const key = i.subjectId ?? 'general';
    const s = sections.get(key) ?? { subjectName: i.subjectName ?? 'General', total: 0, correct: 0, incorrect: 0, unanswered: 0 };
    s.total++;
    if (i.isCorrect === true) s.correct++;
    else if (i.isCorrect === false) s.incorrect++;
    else s.unanswered++;
    sections.set(key, s);
  }

  const a = row.a;
  return {
    attemptId: a.id,
    mockTestId: a.mockTestId,
    title: row.title,
    examName: row.examName,
    startedAt: a.startedAt,
    submittedAt: a.submittedAt,
    timeTakenSeconds: a.timeTakenSeconds,
    late: a.late,
    marksPerQuestion: Number(row.marks),
    negativeMarks: Number(row.negative),
    summary: {
      totalQuestions: a.totalQuestions,
      attempted: a.attemptedCount ?? 0,
      correct: a.correctCount ?? 0,
      incorrect: a.incorrectCount ?? 0,
      unanswered: a.unansweredCount ?? 0,
      score: Number(a.score ?? 0),
      maxScore: Number(a.maxScore ?? 0),
      percentage: Number(a.percentage ?? 0),
    },
    sections: [...sections.entries()].map(([subjectId, s]) => ({ subjectId, ...s })),
    questions: items.map((i) => ({
      questionId: i.questionId,
      position: i.position,
      subjectName: i.subjectName ?? 'General',
      questionText: i.questionText,
      options: opts.filter((o) => o.questionId === i.questionId).map((o) => ({ label: o.label, text: o.text })),
      selectedOption: i.selectedOption,
      correctOption: i.correctOption,
      isCorrect: i.isCorrect,
      markedForReview: i.markedForReview,
      explanation: i.explanation,
    })),
  };
}

export async function listAttempts(db: Db, userId: string) {
  const rows = await db
    .select({ a: testAttempts, title: mockTests.title, examName: exams.name })
    .from(testAttempts)
    .innerJoin(mockTests, eq(mockTests.id, testAttempts.mockTestId))
    .innerJoin(exams, eq(exams.id, mockTests.examId))
    .where(and(eq(testAttempts.userId, userId), eq(testAttempts.status, 'submitted')))
    .orderBy(desc(testAttempts.submittedAt))
    .limit(100);
  return rows.map((r) => ({
    attemptId: r.a.id,
    mockTestId: r.a.mockTestId,
    title: r.title,
    examName: r.examName,
    submittedAt: r.a.submittedAt,
    score: Number(r.a.score ?? 0),
    maxScore: Number(r.a.maxScore ?? 0),
    percentage: Number(r.a.percentage ?? 0),
    correct: r.a.correctCount ?? 0,
    incorrect: r.a.incorrectCount ?? 0,
    unanswered: r.a.unansweredCount ?? 0,
    timeTakenSeconds: r.a.timeTakenSeconds,
  }));
}
