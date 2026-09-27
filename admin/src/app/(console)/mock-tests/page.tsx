'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useCan } from '@/components/ConsoleShell';
import { ErrorAlert, OkAlert, PageHead, Pager, StatusBadge } from '@/components/ui';
import { api, errorMessage, useApi } from '@/lib/api';
import { relTime } from '@/lib/format';
import type { MockTestRow, Paged } from '@/lib/types';
import { languageName, useLanguages, useTaxonomy } from '@/lib/useTaxonomy';

interface Blueprint {
  id: string;
  name: string;
  examName: string;
  language: string;
  totalQuestions: number;
  durationMinutes: number;
  marksPerQuestion: string;
  negativeMarks: string;
  difficultyDistribution: { easy: number; medium: number; hard: number };
  sections: { subjectId: string; count: number }[];
  testsCreated: number;
}

export default function MockTestsPage() {
  const can = useCan();
  const [tab, setTab] = useState<'tests' | 'blueprints'>('tests');
  return (
    <>
      <PageHead
        title="Mock Tests"
        subtitle="Built only from PUBLISHED questions. Published tests appear on the website automatically."
        actions={
          <div className="segmented" role="tablist">
            <button role="tab" aria-selected={tab === 'tests'} onClick={() => setTab('tests')}>
              Tests
            </button>
            <button role="tab" aria-selected={tab === 'blueprints'} onClick={() => setTab('blueprints')}>
              Blueprints
            </button>
          </div>
        }
      />
      {can('mocktests:write') && <Builder onBlueprintSaved={() => setTab('blueprints')} />}
      {tab === 'tests' ? <TestList /> : <BlueprintList />}
    </>
  );
}

function Builder({ onBlueprintSaved }: { onBlueprintSaved: () => void }) {
  const router = useRouter();
  const { tree } = useTaxonomy();
  const languages = useLanguages();
  const [open, setOpen] = useState(false);
  const [examId, setExamId] = useState('');
  const [title, setTitle] = useState('');
  const [language, setLanguage] = useState('hi-Latn');
  const [duration, setDuration] = useState(120);
  const [marks, setMarks] = useState(2);
  const [negative, setNegative] = useState(0.5);
  const [pct, setPct] = useState({ easy: 30, medium: 50, hard: 20 });
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const exam = tree.find((e) => e.id === examId);
  const total = Object.values(counts).reduce((a, b) => a + (b || 0), 0);
  const pctTotal = pct.easy + pct.medium + pct.hard;
  const sections = Object.entries(counts)
    .filter(([, n]) => n > 0)
    .map(([subjectId, count]) => ({ subjectId, count }));

  const common = {
    examId,
    language,
    totalQuestions: total,
    durationMinutes: duration,
    marksPerQuestion: marks,
    negativeMarks: negative,
    difficulty: pct,
    sections,
  };

  async function generate() {
    setBusy(true);
    setError(null);
    try {
      const r = await api<{ test: { id: string } }>('mock-tests/generate', { method: 'POST', body: { ...common, title: title || 'Mock Test' } });
      router.push(`/mock-tests/${r.test.id}`);
    } catch (e) {
      setError(errorMessage(e));
      setBusy(false);
    }
  }
  async function saveBlueprint() {
    setBusy(true);
    setError(null);
    try {
      await api('blueprints', { method: 'POST', body: { ...common, name: title || `${exam?.name} blueprint` } });
      setOpen(false);
      onBlueprintSaved();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <div className="card row" style={{ marginBottom: 16, justifyContent: 'space-between' }}>
        <span>Create a test from the published question bank, or save the settings as a reusable blueprint.</span>
        <button className="btn btn-primary" onClick={() => setOpen(true)}>
          New mock test / blueprint
        </button>
      </div>
    );
  }

  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <div className="card-head">
        <h2>New mock test</h2>
        <button className="btn btn-sm btn-ghost" onClick={() => setOpen(false)}>
          Close
        </button>
      </div>
      <ErrorAlert error={error} />
      <div className="form-grid">
        <label className="field">
          <span>Exam</span>
          <select
            className="input"
            value={examId}
            onChange={(e) => {
              setExamId(e.target.value);
              setCounts({});
              const ex = tree.find((x) => x.id === e.target.value);
              if (ex && languages.some((l) => l.code === ex.defaultLanguage)) setLanguage(ex.defaultLanguage);
            }}
          >
            <option value="">Choose exam…</option>
            {tree.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Title / blueprint name</span>
          <input className="input" placeholder="e.g. UP Constable Full Mock" value={title} onChange={(e) => setTitle(e.target.value)} />
        </label>
        <label className="field">
          <span>Language</span>
          <select className="input" value={language} onChange={(e) => setLanguage(e.target.value)}>
            {languages.map((l) => (
              <option key={l.code} value={l.code}>
                {l.name}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Duration (minutes)</span>
          <input className="input" type="number" min={1} max={600} value={duration} onChange={(e) => setDuration(Number(e.target.value))} />
        </label>
        <label className="field">
          <span>Marks per correct answer</span>
          <input className="input" type="number" min={0} step="0.25" value={marks} onChange={(e) => setMarks(Number(e.target.value))} />
        </label>
        <label className="field">
          <span>Negative marks per wrong answer</span>
          <input className="input" type="number" min={0} step="0.25" value={negative} onChange={(e) => setNegative(Number(e.target.value))} />
        </label>
      </div>
      <fieldset style={{ border: 0, padding: 0, margin: '0 0 14px' }}>
        <legend style={{ fontWeight: 600, marginBottom: 6 }}>
          Difficulty mix <span className="muted">({pctTotal}%)</span>
        </legend>
        <div className="pct-row" style={{ maxWidth: 420 }}>
          {(['easy', 'medium', 'hard'] as const).map((d) => (
            <label key={d} className="small" style={{ textTransform: 'capitalize' }}>
              {d} %
              <input className="input" type="number" min={0} max={100} value={pct[d]} onChange={(e) => setPct({ ...pct, [d]: Number(e.target.value) })} />
            </label>
          ))}
        </div>
      </fieldset>
      {exam && (
        <fieldset style={{ border: 0, padding: 0, margin: '0 0 14px' }}>
          <legend style={{ fontWeight: 600, marginBottom: 6 }}>
            Questions per subject <span className="muted">(total {total})</span>
          </legend>
          <div className="table-wrap" style={{ margin: 0 }}>
            <table>
              <tbody>
                {exam.subjects.map((s) => {
                  const published = s.chapters.reduce((a, c) => a + c.questionCounts.published, 0);
                  return (
                    <tr key={s.id}>
                      <td>{s.name}</td>
                      <td className="small muted">{published} published (all languages)</td>
                      <td style={{ width: 120 }}>
                        <input
                          className="input"
                          type="number"
                          min={0}
                          max={500}
                          aria-label={`${s.name} questions`}
                          value={counts[s.id] ?? 0}
                          onChange={(e) => setCounts({ ...counts, [s.id]: Number(e.target.value) })}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </fieldset>
      )}
      <div className="row">
        <button className="btn btn-primary" disabled={busy || !examId || total < 1 || pctTotal !== 100} onClick={generate}>
          {busy ? 'Working…' : `Generate test (${total} questions)`}
        </button>
        <button className="btn" disabled={busy || !examId || total < 1 || pctTotal !== 100} onClick={saveBlueprint}>
          Save as blueprint
        </button>
        <span className="small muted">Questions are picked least-used first, never repeated within a test.</span>
      </div>
    </div>
  );
}

function TestList() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const { data, error } = useApi<Paged<MockTestRow>>('mock-tests', { page, pageSize: 25, status });
  return (
    <div className="card">
      <div className="filters">
        <select className="input" aria-label="Status" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">Draft + published</option>
          <option value="draft">Draft</option>
          <option value="published">Published</option>
          <option value="archived">Archived</option>
        </select>
      </div>
      <ErrorAlert error={error} />
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Test</th>
              <th>Status</th>
              <th className="num">Questions</th>
              <th className="num">Minutes</th>
              <th>Marking</th>
              <th>Sections</th>
              <th>Created</th>
            </tr>
          </thead>
          <tbody>
            {data?.items.map((t) => (
              <tr key={t.id}>
                <td>
                  <Link href={`/mock-tests/${t.id}`}>
                    <strong>{t.title}</strong>
                  </Link>
                  <div className="small muted">
                    {t.examName} · {languageName(t.language)}
                  </div>
                </td>
                <td>
                  <StatusBadge status={t.status} />
                </td>
                <td className="num">{t.totalQuestions}</td>
                <td className="num">{t.durationMinutes}</td>
                <td className="small">
                  +{t.marksPerQuestion} / −{t.negativeMarks}
                </td>
                <td className="small">{t.sections.map((s) => `${s.subjectName} ${s.count}`).join(' · ')}</td>
                <td className="small muted">{relTime(t.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {data && data.items.length === 0 && <div className="empty">No mock tests yet.</div>}
      </div>
      {data && data.total > data.pageSize && <Pager page={page} pageSize={data.pageSize} total={data.total} onPage={setPage} />}
    </div>
  );
}

function BlueprintList() {
  const can = useCan();
  const { data, error, reload } = useApi<{ items: Blueprint[] }>('blueprints');
  const { tree } = useTaxonomy();
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const subjectName = (id: string) => tree.flatMap((e) => e.subjects).find((s) => s.id === id)?.name ?? 'Subject';

  async function generate(bp: Blueprint) {
    const n = Number(window.prompt(`How many tests should be generated from "${bp.name}"? (1–100)`, '5'));
    if (!n || n < 1) return;
    const publish = can('mocktests:publish') && window.confirm('Publish them immediately? (Cancel = keep as drafts)');
    setBusy(bp.id);
    setErr(null);
    try {
      const r = await api<{ created: { title: string }[]; stoppedReason: string | null }>(`blueprints/${bp.id}/generate`, {
        method: 'POST',
        body: { count: Math.min(100, n), publish },
      });
      setMsg(`Created ${r.created.length} test(s)${publish ? ' and published them' : ''}.${r.stoppedReason ? ` Stopped early: ${r.stoppedReason}` : ''}`);
      await reload();
    } catch (e) {
      setErr(errorMessage(e));
    } finally {
      setBusy(null);
    }
  }

  async function archive(bp: Blueprint) {
    if (!window.confirm(`Archive blueprint "${bp.name}"? Tests already created stay.`)) return;
    await api(`blueprints/${bp.id}`, { method: 'DELETE' }).catch((e) => setErr(errorMessage(e)));
    await reload();
  }

  return (
    <div className="card">
      <OkAlert message={msg} />
      <ErrorAlert error={err ?? error} />
      {data?.items.length === 0 && <div className="empty">No blueprints yet. Use “New mock test / blueprint” → Save as blueprint.</div>}
      <div className="table-wrap">
        <table>
          <tbody>
            {data?.items.map((bp) => (
              <tr key={bp.id}>
                <td>
                  <strong>{bp.name}</strong>
                  <div className="small muted">
                    {bp.examName} · {languageName(bp.language)} · {bp.totalQuestions} questions · {bp.durationMinutes} min · +{Number(bp.marksPerQuestion)}/−
                    {Number(bp.negativeMarks)}
                  </div>
                  <div className="small">
                    {bp.sections.map((s) => `${subjectName(s.subjectId)} ${s.count}`).join(' · ')} — Easy {bp.difficultyDistribution.easy}% · Medium{' '}
                    {bp.difficultyDistribution.medium}% · Hard {bp.difficultyDistribution.hard}%
                  </div>
                </td>
                <td className="num small">{bp.testsCreated} tests made</td>
                <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                  {can('mocktests:write') && (
                    <>
                      <button className="btn btn-sm btn-primary" disabled={busy === bp.id} onClick={() => generate(bp)}>
                        {busy === bp.id ? 'Generating…' : 'Generate tests'}
                      </button>{' '}
                      <button className="btn btn-sm" onClick={() => archive(bp)}>
                        Archive
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
