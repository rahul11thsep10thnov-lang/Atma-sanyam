'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import { useCan } from '@/components/ConsoleShell';
import { ConfirmButton, DifficultyBadge, ErrorAlert, Kpi, Loading, OkAlert, PageHead, StatusBadge } from '@/components/ui';
import { api, errorMessage, useApi } from '@/lib/api';
import { fmtDate } from '@/lib/format';
import { languageName } from '@/lib/useTaxonomy';

interface TestDetail {
  id: string;
  title: string;
  examName: string;
  language: string;
  status: 'draft' | 'published' | 'archived';
  durationMinutes: number;
  totalQuestions: number;
  marksPerQuestion: number;
  negativeMarks: number;
  publishedAt: string | null;
  questions: {
    id: string;
    position: number;
    subjectName: string;
    chapterName: string;
    questionText: string;
    difficulty: string;
    status: string;
    correctOption: string;
    options: { label: string; text: string }[];
  }[];
}

export default function MockTestPage() {
  const { id } = useParams<{ id: string }>();
  const can = useCan();
  const { data: t, error, reload } = useApi<TestDetail>(`mock-tests/${id}`);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function act(a: 'publish' | 'unpublish') {
    setErr(null);
    try {
      await api(`mock-tests/${id}/${a}`, { method: 'POST' });
      setMsg(a === 'publish' ? 'Published — it is now listed on the website.' : 'Unpublished — hidden from the website.');
      await reload();
    } catch (e) {
      setErr(errorMessage(e));
    }
  }

  if (!t) return error ? <ErrorAlert error={error} /> : <Loading />;
  const bySubject = t.questions.reduce<Record<string, number>>((m, q) => ({ ...m, [q.subjectName]: (m[q.subjectName] ?? 0) + 1 }), {});
  const byDifficulty = t.questions.reduce<Record<string, number>>((m, q) => ({ ...m, [q.difficulty]: (m[q.difficulty] ?? 0) + 1 }), {});
  const notLive = t.questions.filter((q) => q.status !== 'published').length;

  return (
    <>
      <PageHead
        title={t.title}
        subtitle={`${t.examName} · ${languageName(t.language)} · created for the website’s Mock Tests section`}
        actions={
          <>
            <Link className="btn" href="/mock-tests">
              ← Mock Tests
            </Link>
            {can('mocktests:publish') && t.status === 'draft' && (
              <button className="btn btn-primary" onClick={() => act('publish')}>
                Publish
              </button>
            )}
            {can('mocktests:publish') && t.status === 'published' && (
              <button className="btn" onClick={() => act('unpublish')}>
                Unpublish
              </button>
            )}
            {can('mocktests:write') && t.status !== 'archived' && (
              <ConfirmButton
                label="Archive"
                confirm="Archive this test? It disappears from the website; past results stay."
                onConfirm={async () => {
                  await api(`mock-tests/${id}`, { method: 'DELETE' });
                  await reload();
                }}
              />
            )}
          </>
        }
      />
      <OkAlert message={msg} />
      <ErrorAlert error={err} />
      {notLive > 0 && (
        <div className="alert alert-warn">
          {notLive} question(s) here are no longer published and are hidden from candidates. Generate a fresh test to replace them.
        </div>
      )}
      <div className="kpis">
        <Kpi label="Status" value={t.status.toUpperCase()} sub={t.publishedAt ? `since ${fmtDate(t.publishedAt)}` : undefined} />
        <Kpi label="Questions" value={t.totalQuestions} sub={Object.entries(bySubject).map(([s, n]) => `${s} ${n}`).join(' · ')} />
        <Kpi label="Duration" value={`${t.durationMinutes} min`} />
        <Kpi label="Marking" value={`+${t.marksPerQuestion} / −${t.negativeMarks}`} sub={`max ${t.totalQuestions * t.marksPerQuestion}`} />
        <Kpi label="Difficulty" value={`${byDifficulty.easy ?? 0} / ${byDifficulty.medium ?? 0} / ${byDifficulty.hard ?? 0}`} sub="easy / medium / hard" />
      </div>
      <div className="card">
        <h2 style={{ marginBottom: 10 }}>Questions and answer key</h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th className="num">#</th>
                <th>Question</th>
                <th>Key</th>
                <th>Subject</th>
                <th>Difficulty</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {t.questions.map((q) => (
                <tr key={q.id}>
                  <td className="num">{q.position}</td>
                  <td style={{ maxWidth: 520 }}>
                    <Link href={`/questions/${q.id}`} className="clip-2" style={{ color: 'var(--text)' }}>
                      {q.questionText}
                    </Link>
                  </td>
                  <td className="small">
                    <strong>{q.correctOption}</strong> {q.options.find((o) => o.label === q.correctOption)?.text}
                  </td>
                  <td className="small">
                    {q.subjectName}
                    <div className="muted">{q.chapterName}</div>
                  </td>
                  <td>
                    <DifficultyBadge difficulty={q.difficulty} />
                  </td>
                  <td>
                    <StatusBadge status={q.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
