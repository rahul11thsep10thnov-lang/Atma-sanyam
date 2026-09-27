import { count, desc, eq, gte, isNotNull, ne, sql } from 'drizzle-orm';
import type { Db } from '../database/client.js';
import { rowsOf } from '../database/client.js';
import { exams, generationJobs, mockTests, questions, testAnswers, testAttempts, users } from '../database/schema.js';
import { monthToDateSpend } from './generationService.js';

export async function dashboard(db: Db) {
  const statusRows = await db.select({ status: questions.status, n: count() }).from(questions).groupBy(questions.status);
  const byStatus = Object.fromEntries(statusRows.map((r) => [r.status, Number(r.n)])) as Record<string, number>;
  const [mt] = await db
    .select({ total: count(), published: sql<number>`count(*) filter (where ${mockTests.status} = 'published')` })
    .from(mockTests)
    .where(ne(mockTests.status, 'archived'));
  const [u] = await db.select({ n: count() }).from(users);
  const jobRows = await db.select({ status: generationJobs.status, n: count() }).from(generationJobs).groupBy(generationJobs.status);
  const jobs = Object.fromEntries(jobRows.map((r) => [r.status, Number(r.n)])) as Record<string, number>;
  const recentJobs = await db
    .select({
      id: generationJobs.id,
      status: generationJobs.status,
      requested: generationJobs.requestedCount,
      generated: generationJobs.generatedCount,
      approved: generationJobs.approvedCount,
      needsReview: generationJobs.needsReviewCount,
      rejected: generationJobs.rejectedCount,
      createdAt: generationJobs.createdAt,
    })
    .from(generationJobs)
    .orderBy(desc(generationJobs.createdAt))
    .limit(5);
  return {
    questions: {
      total: statusRows.reduce((s, r) => s + Number(r.n), 0),
      approved: byStatus.approved ?? 0,
      pendingReview: (byStatus.needs_review ?? 0) + (byStatus.draft ?? 0),
      published: byStatus.published ?? 0,
      rejected: byStatus.rejected ?? 0,
      byStatus,
    },
    mockTests: { total: Number(mt?.total ?? 0), published: Number(mt?.published ?? 0) },
    users: Number(u?.n ?? 0),
    generationJobs: {
      total: jobRows.reduce((s, r) => s + Number(r.n), 0),
      running: (jobs.queued ?? 0) + (jobs.generating ?? 0) + (jobs.validating ?? 0),
      failed: jobs.failed ?? 0,
      completed: jobs.completed ?? 0,
    },
    aiSpendMonthToDateUsd: await monthToDateSpend(db),
    recentJobs,
  };
}

export async function analytics(db: Db, opts: { minAttempts?: number } = {}) {
  const minAttempts = opts.minAttempts ?? 5;
  const weekAgo = new Date(Date.now() - 7 * 86_400_000);

  const [totalUsers] = await db.select({ n: count() }).from(users);
  const [activeUsers] = await db
    .select({ n: sql<number>`count(distinct ${testAttempts.userId})` })
    .from(testAttempts)
    .where(gte(testAttempts.startedAt, weekAgo));
  const [attemptStats] = await db
    .select({
      submitted: count(),
      avgPercentage: sql<string | null>`avg(${testAttempts.percentage})`,
      avgSeconds: sql<string | null>`avg(${testAttempts.timeTakenSeconds})`,
    })
    .from(testAttempts)
    .where(eq(testAttempts.status, 'submitted'));
  const [answered] = await db.select({ n: count() }).from(testAnswers).where(isNotNull(testAnswers.selectedOption));

  const mostAttemptedExams = await db
    .select({ examId: exams.id, name: exams.name, attempts: count() })
    .from(testAttempts)
    .innerJoin(mockTests, eq(mockTests.id, testAttempts.mockTestId))
    .innerJoin(exams, eq(exams.id, mockTests.examId))
    .where(eq(testAttempts.status, 'submitted'))
    .groupBy(exams.id, exams.name)
    .orderBy(desc(count()))
    .limit(10);

  const mostAttemptedSubjects = rowsOf<{ subject_id: string; name: string; exam_name: string; answers: number; accuracy: number | null }>(
    await db.execute(sql`
      select s.id as subject_id, s.name, e.name as exam_name, count(*)::int as answers,
             avg(case when ta.is_correct then 1.0 else 0.0 end)::float as accuracy
      from test_answers ta
      join questions q on q.id = ta.question_id
      join subjects s on s.id = q.subject_id
      join exams e on e.id = s.exam_id
      where ta.selected_option is not null
      group by s.id, s.name, e.name
      order by answers desc
      limit 10`)
  );

  // Per-question accuracy = correct answers / answered attempts.
  const perQuestion = rowsOf<{
    id: string;
    question_text: string;
    difficulty: string;
    status: string;
    attempts: number;
    correct: number;
    accuracy: number;
  }>(
    await db.execute(sql`
      select q.id, q.question_text, q.difficulty, q.status, count(*)::int as attempts,
             count(*) filter (where ta.is_correct)::int as correct,
             (count(*) filter (where ta.is_correct))::float / count(*) as accuracy
      from test_answers ta
      join questions q on q.id = ta.question_id
      where ta.selected_option is not null
      group by q.id, q.question_text, q.difficulty, q.status
      having count(*) >= ${minAttempts}`)
  );
  const mostDifficult = [...perQuestion].sort((a, b) => a.accuracy - b.accuracy).slice(0, 15);

  // "Unusually high error rate": accuracy far below questions of the same
  // difficulty — often a wrong key, an ambiguous stem or a confusing option.
  const avgByDifficulty = new Map<string, number>();
  for (const d of ['easy', 'medium', 'hard']) {
    const rows = perQuestion.filter((q) => q.difficulty === d);
    if (rows.length) avgByDifficulty.set(d, rows.reduce((s, q) => s + q.accuracy, 0) / rows.length);
  }
  const suspicious = perQuestion
    .map((q) => ({ ...q, expectedAccuracy: avgByDifficulty.get(q.difficulty) ?? null }))
    .filter((q) => q.expectedAccuracy !== null && (q.accuracy < 0.25 || q.expectedAccuracy - q.accuracy >= 0.35))
    .sort((a, b) => a.accuracy - b.accuracy)
    .slice(0, 25);

  const daily = rowsOf<{ day: string; attempts: number }>(
    await db.execute(sql`
      select to_char(date_trunc('day', submitted_at), 'YYYY-MM-DD') as day, count(*)::int as attempts
      from test_attempts
      where status = 'submitted' and submitted_at >= now() - interval '30 days'
      group by 1 order by 1`)
  );

  const [pipeline] = await db
    .select({
      generated: sql<number>`coalesce(sum(${generationJobs.generatedCount}), 0)`,
      approved: sql<number>`coalesce(sum(${generationJobs.approvedCount}), 0)`,
      needsReview: sql<number>`coalesce(sum(${generationJobs.needsReviewCount}), 0)`,
      rejected: sql<number>`coalesce(sum(${generationJobs.rejectedCount}), 0)`,
      estimatedCostUsd: sql<string>`coalesce(sum(${generationJobs.estimatedCostUsd}), 0)`,
      actualCostUsd: sql<string>`coalesce(sum(${generationJobs.actualCostUsd}), 0)`,
      inputTokens: sql<number>`coalesce(sum(${generationJobs.inputTokens}), 0)`,
      outputTokens: sql<number>`coalesce(sum(${generationJobs.outputTokens}), 0)`,
    })
    .from(generationJobs);

  return {
    users: { total: Number(totalUsers?.n ?? 0), activeLast7Days: Number(activeUsers?.n ?? 0) },
    testsAttempted: Number(attemptStats?.submitted ?? 0),
    questionsAttempted: Number(answered?.n ?? 0),
    averageScorePercentage: attemptStats?.avgPercentage != null ? Number(Number(attemptStats.avgPercentage).toFixed(2)) : null,
    averageCompletionSeconds: attemptStats?.avgSeconds != null ? Math.round(Number(attemptStats.avgSeconds)) : null,
    mostAttemptedExams: mostAttemptedExams.map((e) => ({ ...e, attempts: Number(e.attempts) })),
    mostAttemptedSubjects,
    mostDifficultQuestions: mostDifficult,
    highErrorRateQuestions: suspicious,
    attemptsLast30Days: daily,
    minAttemptsForQuestionStats: minAttempts,
    pipeline: {
      generated: Number(pipeline?.generated ?? 0),
      approved: Number(pipeline?.approved ?? 0),
      needsReview: Number(pipeline?.needsReview ?? 0),
      rejected: Number(pipeline?.rejected ?? 0),
      estimatedCostUsd: Number(pipeline?.estimatedCostUsd ?? 0),
      actualCostUsd: Number(pipeline?.actualCostUsd ?? 0),
      inputTokens: Number(pipeline?.inputTokens ?? 0),
      outputTokens: Number(pipeline?.outputTokens ?? 0),
    },
  };
}

export async function listUsers(db: Db, page = 1, pageSize = 50) {
  const [total] = await db.select({ n: count() }).from(users);
  const rows = rowsOf<{
    id: string;
    display_name: string | null;
    auth_provider: string;
    email: string | null;
    status: string;
    created_at: string;
    last_seen_at: string | null;
    attempts: number;
    avg_percentage: number | null;
  }>(
    await db.execute(sql`
      select u.id, u.display_name, u.auth_provider, u.email, u.status, u.created_at, u.last_seen_at,
             count(a.id) filter (where a.status = 'submitted')::int as attempts,
             avg(a.percentage) filter (where a.status = 'submitted')::float as avg_percentage
      from users u
      left join test_attempts a on a.user_id = u.id
      group by u.id
      order by u.created_at desc
      limit ${pageSize} offset ${(page - 1) * pageSize}`)
  );
  return { page, pageSize, total: Number(total?.n ?? 0), items: rows };
}

