'use client';

import Link from 'next/link';
import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { ColumnChart } from '@/components/ColumnChart';
import { DifficultyBadge, ErrorAlert, Kpi, Loading, Money, PageHead, StatusBadge } from '@/components/ui';
import { useApi } from '@/lib/api';
import { fmtNumber } from '@/lib/format';

interface QStat {
  id: string;
  question_text: string;
  difficulty: string;
  status: string;
  attempts: number;
  correct: number;
  accuracy: number;
  expectedAccuracy?: number | null;
}

interface Analytics {
  users: { total: number; activeLast7Days: number };
  testsAttempted: number;
  questionsAttempted: number;
  averageScorePercentage: number | null;
  averageCompletionSeconds: number | null;
  mostAttemptedExams: { examId: string; name: string; attempts: number }[];
  mostAttemptedSubjects: { subject_id: string; name: string; exam_name: string; answers: number; accuracy: number | null }[];
  mostDifficultQuestions: QStat[];
  highErrorRateQuestions: QStat[];
  attemptsLast30Days: { day: string; attempts: number }[];
  minAttemptsForQuestionStats: number;
  pipeline: {
    generated: number;
    approved: number;
    needsReview: number;
    rejected: number;
    estimatedCostUsd: number;
    actualCostUsd: number;
    inputTokens: number;
    outputTokens: number;
  };
}

/** Every day of the last 30, so quiet days show as zero instead of vanishing. */
function last30(days: { day: string; attempts: number }[]) {
  const byDay = new Map(days.map((d) => [d.day, d.attempts]));
  const out: { date: string; count: number }[] = [];
  const today = new Date();
  for (let i = 29; i >= 0; i--) {
    const d = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() - i));
    const key = d.toISOString().slice(0, 10);
    out.push({ date: key, count: byDay.get(key) ?? 0 });
  }
  return out;
}

const pct = (n: number | null | undefined) => (n == null ? '—' : `${Math.round(n * 100)}%`);

function Meter({ value, label }: { value: number; label: string }) {
  return (
    <div className="row" style={{ gap: 8, flexWrap: 'nowrap' }}>
      <div className="meter" style={{ flex: 1 }} role="img" aria-label={label}>
        <div style={{ width: `${Math.max(0, Math.min(1, value)) * 100}%` }} />
      </div>
      <span className="small" style={{ minWidth: 36, textAlign: 'right' }}>
        {pct(value)}
      </span>
    </div>
  );
}

function QuestionTable({ rows, showExpected }: { rows: QStat[]; showExpected?: boolean }) {
  if (!rows.length) return <div className="empty">Not enough answers yet.</div>;
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Question</th>
            <th>Difficulty</th>
            <th className="num">Answers</th>
            <th style={{ width: 150 }}>Accuracy</th>
            {showExpected && <th className="num">Typical</th>}
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((q) => (
            <tr key={q.id}>
              <td style={{ maxWidth: 420 }}>
                <Link href={`/questions/${q.id}`} className="clip-2" style={{ color: 'var(--text)' }}>
                  {q.question_text}
                </Link>
              </td>
              <td>
                <DifficultyBadge difficulty={q.difficulty} />
              </td>
              <td className="num">{q.attempts}</td>
              <td>
                <Meter value={q.accuracy} label={`${pct(q.accuracy)} answered correctly`} />
              </td>
              {showExpected && <td className="num small">{pct(q.expectedAccuracy)}</td>}
              <td>
                <StatusBadge status={q.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function AnalyticsPage() {
  const [minAttempts, setMinAttempts] = useState(5);
  const { data, error } = useApi<Analytics>('analytics', { minAttempts });

  if (!data) return error ? <ErrorAlert error={error} /> : <Loading />;
  const secs = data.averageCompletionSeconds;
  const duration = secs == null ? '—' : secs < 60 ? `${secs} s` : `${Math.round(secs / 60)} min`;

  return (
    <>
      <PageHead title="Analytics" subtitle="How candidates use the tests, and which questions may need a second look." />
      <div className="kpis">
        <Kpi label="Total users" value={data.users.total} />
        <Kpi label="Active users" value={data.users.activeLast7Days} sub="started a test in the last 7 days" />
        <Kpi label="Tests attempted" value={data.testsAttempted} sub="submitted" />
        <Kpi label="Questions attempted" value={data.questionsAttempted} sub="answered, not skipped" />
        <Kpi label="Average score" value={data.averageScorePercentage == null ? '—' : `${data.averageScorePercentage}%`} />
        <Kpi label="Avg completion time" value={duration} />
      </div>

      <div className="card">
        <div className="card-head">
          <h2>Tests submitted per day — last 30 days</h2>
        </div>
        <ColumnChart data={last30(data.attemptsLast30Days)} valueLabel="tests" />
      </div>

      <div className="grid grid-2" style={{ marginTop: 16 }}>
        <div className="card">
          <h2 style={{ marginBottom: 10 }}>Most attempted exams</h2>
          {data.mostAttemptedExams.length === 0 ? (
            <div className="empty">No submitted tests yet.</div>
          ) : (
            <table>
              <tbody>
                {data.mostAttemptedExams.map((e) => (
                  <tr key={e.examId}>
                    <td>{e.name}</td>
                    <td className="num">
                      {fmtNumber(e.attempts)} test{e.attempts === 1 ? '' : 's'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <div className="card">
          <h2 style={{ marginBottom: 10 }}>Most attempted subjects</h2>
          {data.mostAttemptedSubjects.length === 0 ? (
            <div className="empty">No answers yet.</div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Subject</th>
                  <th className="num">Answers</th>
                  <th style={{ width: 150 }}>Accuracy</th>
                </tr>
              </thead>
              <tbody>
                {data.mostAttemptedSubjects.map((s) => (
                  <tr key={s.subject_id}>
                    <td>
                      {s.name}
                      <div className="small muted">{s.exam_name}</div>
                    </td>
                    <td className="num">{fmtNumber(s.answers)}</td>
                    <td>{s.accuracy == null ? '—' : <Meter value={s.accuracy} label={`${pct(s.accuracy)} correct`} />}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <div className="card">
        <div className="card-head">
          <h2 className="row">
            <AlertTriangle size={16} color="var(--warn)" aria-hidden /> Questions with unusually high error rates
          </h2>
          <label className="small row">
            Minimum answers
            <select className="input" style={{ width: 80, height: 30 }} value={minAttempts} onChange={(e) => setMinAttempts(Number(e.target.value))}>
              {[1, 3, 5, 10, 25, 50].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
        </div>
        <p className="small muted" style={{ marginTop: 0 }}>
          Accuracy = correct answers ÷ answers. Listed when far below other questions of the same difficulty — often a wrong key, an ambiguous
          question or a confusing option. Open one to check it.
        </p>
        <QuestionTable rows={data.highErrorRateQuestions} showExpected />
      </div>

      <div className="card">
        <h2 style={{ marginBottom: 10 }}>Most difficult questions</h2>
        <QuestionTable rows={data.mostDifficultQuestions} />
      </div>

      <div className="card">
        <h2 style={{ marginBottom: 10 }}>Generation pipeline & AI cost</h2>
        <div className="kpis" style={{ marginBottom: 0 }}>
          <Kpi label="Generated" value={data.pipeline.generated} />
          <Kpi label="Approved by AI review" value={data.pipeline.approved} />
          <Kpi label="Sent to human review" value={data.pipeline.needsReview} />
          <Kpi label="Rejected" value={data.pipeline.rejected} />
          <Kpi label="Estimated cost" value={`$${data.pipeline.estimatedCostUsd.toFixed(2)}`} />
          <Kpi label="Actual cost" value={`$${data.pipeline.actualCostUsd.toFixed(2)}`} sub={`${fmtNumber(data.pipeline.inputTokens + data.pipeline.outputTokens)} tokens`} />
        </div>
        <p className="small muted" style={{ marginBottom: 0 }}>
          Cost per approved question:{' '}
          {data.pipeline.approved ? <Money value={data.pipeline.actualCostUsd / data.pipeline.approved} /> : '—'}
        </p>
      </div>
    </>
  );
}
