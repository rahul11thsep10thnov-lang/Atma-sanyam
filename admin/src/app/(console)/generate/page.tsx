'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useCan } from '@/components/ConsoleShell';
import { EMPTY_SCOPE, ScopePicker, type Scope } from '@/components/ScopePicker';
import { ErrorAlert, Loading, Money, OutcomeBar, PageHead, Pager, StatusBadge } from '@/components/ui';
import { api, errorMessage, useApi } from '@/lib/api';
import { relTime } from '@/lib/format';
import type { Job, Paged } from '@/lib/types';
import { languageName, useLanguages, useTaxonomy } from '@/lib/useTaxonomy';

interface Estimate {
  provider: string;
  generationModel: string;
  reviewModel: string;
  batchSize: number;
  batches: number;
  estimatedCostUsd: number;
  monthToDateSpendUsd: number;
  monthlyBudgetUsd: number | null;
  maxQuestionsPerJob: number;
}

const QUESTION_TYPES = [
  { value: 'mcq', label: 'MCQ (single correct)', ready: true },
  { value: 'multiple_select', label: 'Multiple select', ready: false },
  { value: 'true_false', label: 'True / False', ready: false },
  { value: 'numerical', label: 'Numerical', ready: false },
  { value: 'assertion_reason', label: 'Assertion–Reason', ready: false },
  { value: 'matching', label: 'Matching', ready: false },
  { value: 'passage_based', label: 'Passage based', ready: false },
];

export default function GeneratePage() {
  const can = useCan();
  return (
    <>
      <PageHead title="Generate Questions" subtitle="AI writes questions in batches; every question is validated and reviewed before it can be published." />
      {can('generation:run') && <GenerateForm />}
      <JobList />
    </>
  );
}

function GenerateForm() {
  const router = useRouter();
  const { tree, loading } = useTaxonomy();
  const languages = useLanguages();
  const sources = useApi<{ items: { id: string; name: string; kind: string; approved: boolean }[] }>('source-materials');
  const [scope, setScope] = useState<Scope>(EMPTY_SCOPE);
  const [language, setLanguage] = useState('hi');
  const [count, setCount] = useState(100);
  const [questionType, setQuestionType] = useState('mcq');
  const [pct, setPct] = useState({ easy: 30, medium: 50, hard: 20 });
  const [explanationRequired, setExplanationRequired] = useState(true);
  const [sourceMaterialId, setSourceMaterialId] = useState('');
  const [sourceReference, setSourceReference] = useState('');
  const [instructions, setInstructions] = useState('');
  const [maxCost, setMaxCost] = useState('');
  const [estimate, setEstimate] = useState<Estimate | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Default the language to the chosen exam's language.
  const exam = tree.find((e) => e.id === scope.examId);
  const [lastExam, setLastExam] = useState('');
  if (exam && exam.id !== lastExam) {
    setLastExam(exam.id);
    if (languages.some((l) => l.code === exam.defaultLanguage)) setLanguage(exam.defaultLanguage);
  }

  useEffect(() => {
    if (!count || count < 1) return;
    const t = setTimeout(() => {
      api<Estimate>('generation-jobs/estimate', { method: 'POST', body: { questionCount: count } })
        .then(setEstimate)
        .catch(() => setEstimate(null));
    }, 300);
    return () => clearTimeout(t);
  }, [count]);

  const pctTotal = pct.easy + pct.medium + pct.hard;
  const overBudget =
    estimate?.monthlyBudgetUsd != null && estimate.monthToDateSpendUsd + estimate.estimatedCostUsd > estimate.monthlyBudgetUsd;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (pctTotal !== 100) return setError(`Difficulty percentages must add up to 100 (now ${pctTotal}).`);
    setBusy(true);
    try {
      const job = await api<Job>('generation-jobs', {
        method: 'POST',
        body: {
          examId: scope.examId,
          subjectId: scope.subjectId,
          chapterId: scope.chapterId,
          topicId: scope.topicId || null,
          language,
          questionCount: count,
          questionType,
          difficulty: pct,
          explanationRequired,
          sourceMaterialId: sourceMaterialId || null,
          sourceReference: sourceReference.trim() || null,
          additionalInstructions: instructions.trim() || null,
          maxCostUsd: maxCost ? Number(maxCost) : null,
        },
      });
      router.push(`/generate/${job.id}`);
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  }

  if (loading) return <Loading what="Loading exams…" />;

  return (
    <form className="card" onSubmit={submit} style={{ marginBottom: 16 }}>
      <div className="card-head">
        <h2>New generation job</h2>
        {estimate?.provider === 'mock' && <span className="badge badge-purple">MOCK_AI — no AI cost</span>}
      </div>
      <ErrorAlert error={error} />
      <div className="form-grid">
        <ScopePicker tree={tree} value={scope} onChange={setScope} />
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
          <span>Number of questions</span>
          <input
            className="input"
            type="number"
            min={1}
            max={estimate?.maxQuestionsPerJob ?? 2000}
            required
            value={count}
            onChange={(e) => setCount(Number(e.target.value))}
          />
          {estimate && (
            <small>
              {estimate.batches} batch{estimate.batches === 1 ? '' : 'es'} of up to {estimate.batchSize}
            </small>
          )}
        </label>
        <label className="field">
          <span>Question type</span>
          <select className="input" value={questionType} onChange={(e) => setQuestionType(e.target.value)}>
            {QUESTION_TYPES.map((t) => (
              <option key={t.value} value={t.value} disabled={!t.ready}>
                {t.label}
                {t.ready ? '' : ' — coming later'}
              </option>
            ))}
          </select>
        </label>
        <fieldset className="field" style={{ border: 0, padding: 0, margin: '0 0 14px' }}>
          <legend style={{ fontWeight: 600, marginBottom: 5 }}>
            Difficulty mix{' '}
            <span className={pctTotal === 100 ? 'muted' : ''} style={pctTotal === 100 ? undefined : { color: 'var(--danger)' }}>
              ({pctTotal}%)
            </span>
          </legend>
          <div className="pct-row">
            {(['easy', 'medium', 'hard'] as const).map((d) => (
              <label key={d} className="small" style={{ textTransform: 'capitalize' }}>
                {d} %
                <input
                  className="input"
                  type="number"
                  min={0}
                  max={100}
                  value={pct[d]}
                  onChange={(e) => setPct({ ...pct, [d]: Number(e.target.value) })}
                />
              </label>
            ))}
          </div>
        </fieldset>
        <label className="field">
          <span>Approved source material (optional)</span>
          <select className="input" value={sourceMaterialId} onChange={(e) => setSourceMaterialId(e.target.value)}>
            <option value="">None — only stable, well-known facts</option>
            {sources.data?.items
              .filter((s) => s.approved)
              .map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.kind})
                </option>
              ))}
          </select>
          <small>Facts are taken only from approved material. Manage it under Source Material.</small>
        </label>
        <label className="field">
          <span>Source / reference note (optional)</span>
          <input
            className="input"
            placeholder="e.g. UPPRPB 2024 syllabus, NCERT Class 8 Maths"
            value={sourceReference}
            onChange={(e) => setSourceReference(e.target.value)}
          />
        </label>
        <label className="field" style={{ gridColumn: '1 / -1' }}>
          <span>Additional instructions (optional)</span>
          <textarea
            className="input"
            rows={2}
            maxLength={2000}
            placeholder="e.g. Use Indian rupee amounts; avoid questions on compound percentage."
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
          />
        </label>
        <label className="check">
          <input type="checkbox" checked={explanationRequired} onChange={(e) => setExplanationRequired(e.target.checked)} />
          Explanation required
        </label>
        <label className="field">
          <span>Stop if this job costs more than (USD, optional)</span>
          <input className="input" type="number" min={0} step="0.01" placeholder="Default: 2× the estimate" value={maxCost} onChange={(e) => setMaxCost(e.target.value)} />
        </label>
      </div>

      <div className="sticky-actions row">
        {estimate && (
          <span className="small">
            Estimated cost <strong><Money value={estimate.estimatedCostUsd} /></strong> · {estimate.generationModel} + {estimate.reviewModel}{' '}
            review · this month <Money value={estimate.monthToDateSpendUsd} />
            {estimate.monthlyBudgetUsd != null && (
              <>
                {' '}
                of <Money value={estimate.monthlyBudgetUsd} />
              </>
            )}
          </span>
        )}
        <span className="spacer" />
        {overBudget && <span className="badge badge-danger">Over monthly budget</span>}
        <button className="btn btn-primary" disabled={busy || pctTotal !== 100 || !scope.chapterId || overBudget}>
          {busy ? 'Starting…' : 'Start generation'}
        </button>
      </div>
    </form>
  );
}

function JobList() {
  const [page, setPage] = useState(1);
  const { data, error, reload } = useApi<Paged<Job>>('generation-jobs', { page, pageSize: 20 });
  const active = data?.items.some((j) => ['queued', 'generating', 'validating'].includes(j.status));
  useEffect(() => {
    if (!active) return;
    const t = setInterval(() => void reload(), 3000);
    return () => clearInterval(t);
  }, [active, reload]);

  return (
    <div className="card">
      <div className="card-head">
        <h2>Generation jobs</h2>
        {active && <span className="small muted">Updating live…</span>}
      </div>
      <ErrorAlert error={error} />
      {!data ? (
        <div className="empty">Loading…</div>
      ) : data.items.length === 0 ? (
        <div className="empty">No jobs yet.</div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Job</th>
                <th>Status</th>
                <th style={{ minWidth: 200 }}>Generation</th>
                <th className="num">Approved</th>
                <th className="num">Needs review</th>
                <th className="num">Rejected</th>
                <th className="num">Cost</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((j) => (
                <tr key={j.id}>
                  <td>
                    <Link href={`/generate/${j.id}`}>
                      <strong>{j.chapterName}</strong>
                    </Link>
                    <div className="small muted">
                      {j.examName} · {j.subjectName} · {languageName(j.language)}
                    </div>
                  </td>
                  <td>
                    <StatusBadge status={j.status} />
                  </td>
                  <td>
                    <OutcomeBar approved={j.approvedCount} review={j.needsReviewCount} rejected={j.rejectedCount} requested={j.requestedCount} />
                    <div className="small muted" style={{ marginTop: 4 }}>
                      {j.progress.percent}% · {j.progress.generated} / {j.progress.requested} generated
                    </div>
                  </td>
                  <td className="num">{j.approvedCount}</td>
                  <td className="num">{j.needsReviewCount}</td>
                  <td className="num">{j.rejectedCount}</td>
                  <td className="num small">
                    <Money value={j.actualCostUsd} />
                    <div className="muted">est. <Money value={j.estimatedCostUsd} /></div>
                  </td>
                  <td className="small muted">{relTime(j.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {data && data.total > data.pageSize && <Pager page={page} pageSize={data.pageSize} total={data.total} onPage={setPage} />}
    </div>
  );
}
