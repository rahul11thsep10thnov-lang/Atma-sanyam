'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Fragment, useEffect, useState } from 'react';
import { useCan } from '@/components/ConsoleShell';
import { ConfirmButton, ErrorAlert, Kpi, Loading, Money, OkAlert, OutcomeBar, PageHead, StatusBadge } from '@/components/ui';
import { api, errorMessage, useApi } from '@/lib/api';
import { fmtDate, fmtNumber } from '@/lib/format';
import type { Job } from '@/lib/types';
import { languageName } from '@/lib/useTaxonomy';

export default function JobPage() {
  const { id } = useParams<{ id: string }>();
  const can = useCan();
  const { data: job, error, reload } = useApi<Job>(`generation-jobs/${id}`);
  const [msg, setMsg] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const running = job && ['queued', 'generating', 'validating'].includes(job.status);
  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => void reload(), 2000);
    return () => clearInterval(t);
  }, [running, reload]);

  async function act(action: 'retry' | 'cancel') {
    setActionError(null);
    try {
      await api(`generation-jobs/${id}/${action}`, { method: 'POST' });
      setMsg(action === 'retry' ? 'Failed batches were queued again.' : 'Job cancelled. Questions already generated are kept.');
      await reload();
    } catch (e) {
      setActionError(errorMessage(e));
    }
  }

  if (!job) return error ? <ErrorAlert error={error} /> : <Loading />;
  const failedBatches = job.batches?.filter((b) => b.status === 'failed').length ?? 0;
  const bar = Math.round(job.progress.percent / 5);

  return (
    <>
      <PageHead
        title={`${job.chapterName}${job.topicName ? ` › ${job.topicName}` : ''}`}
        subtitle={`${job.examName} · ${job.subjectName} · ${languageName(job.language)} · ${job.requestedCount} questions`}
        actions={
          <>
            <Link className="btn" href={`/questions?jobId=${job.id}`}>
              View questions
            </Link>
            {can('questions:review') && (job.currentStatusCounts?.needs_review ?? 0) > 0 && (
              <Link className="btn btn-primary" href={`/review?jobId=${job.id}`}>
                Review {job.currentStatusCounts?.needs_review}
              </Link>
            )}
          </>
        }
      />
      <OkAlert message={msg} />
      <ErrorAlert error={actionError} />

      <div className="card">
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <div className="row">
            <StatusBadge status={job.status} />
            {running && <span className="small muted">Updating live…</span>}
          </div>
          <div className="row">
            {can('generation:run') && failedBatches > 0 && (
              <button className="btn btn-primary btn-sm" onClick={() => act('retry')}>
                Retry failed batches ({failedBatches})
              </button>
            )}
            {can('generation:run') && running && (
              <ConfirmButton label="Cancel job" confirm="Cancel the remaining batches? Questions already generated are kept." onConfirm={() => act('cancel')} />
            )}
          </div>
        </div>
        <p className="mono" style={{ margin: '14px 0 6px', fontSize: 15 }} aria-label={`${job.progress.percent} percent generated`}>
          Generation: {'█'.repeat(bar)}
          <span className="muted">{'░'.repeat(20 - bar)}</span> {job.progress.percent}%
        </p>
        <p style={{ margin: 0 }}>
          <strong>
            {fmtNumber(job.progress.generated)} / {fmtNumber(job.progress.requested)}
          </strong>{' '}
          generated · batches {job.progress.batches.done} / {job.progress.batches.total} done
        </p>
        <div style={{ marginTop: 12 }}>
          <OutcomeBar approved={job.approvedCount} review={job.needsReviewCount} rejected={job.rejectedCount} requested={job.requestedCount} />
        </div>
        {job.errorMessage && (
          <div className="alert alert-warn" style={{ marginTop: 12 }}>
            {job.errorMessage}
          </div>
        )}
      </div>

      <div className="kpis" style={{ marginTop: 16 }}>
        <Kpi label="Approved" value={job.approvedCount} sub="by AI review (not published)" />
        <Kpi label="Needs review" value={job.needsReviewCount} />
        <Kpi label="Rejected" value={job.rejectedCount} />
        <Kpi label="Actual cost" value={`$${Number(job.actualCostUsd).toFixed(4)}`} sub={`estimate $${Number(job.estimatedCostUsd).toFixed(2)}`} />
        <Kpi label="Tokens" value={job.inputTokens + job.outputTokens} sub={`${fmtNumber(job.inputTokens)} in · ${fmtNumber(job.outputTokens)} out`} />
      </div>

      <div className="grid grid-2">
        <div className="card">
          <h2 style={{ marginBottom: 10 }}>Settings</h2>
          <dl className="meta-grid">
            <dt>Difficulty</dt>
            <dd>
              Easy {job.difficultyDistribution.easy}% · Medium {job.difficultyDistribution.medium}% · Hard {job.difficultyDistribution.hard}%
            </dd>
            <dt>Batch size</dt>
            <dd>{job.batchSize}</dd>
            <dt>Provider</dt>
            <dd>
              {job.provider} ({job.generationModel} → {job.reviewModel} review)
            </dd>
            <dt>Cost cap</dt>
            <dd>{job.maxCostUsd ? <Money value={job.maxCostUsd} /> : 'none'}</dd>
            <dt>Source</dt>
            <dd>{job.sourceReference ?? '—'}</dd>
            <dt>Instructions</dt>
            <dd>{job.additionalInstructions ?? '—'}</dd>
            <dt>Created</dt>
            <dd>{fmtDate(job.createdAt)}</dd>
            <dt>Finished</dt>
            <dd>{fmtDate(job.completedAt ?? job.failedAt)}</dd>
          </dl>
        </div>
        <div className="card">
          <h2 style={{ marginBottom: 10 }}>Questions now</h2>
          <p className="small muted" style={{ marginTop: 0 }}>
            Where this job’s questions are after human review.
          </p>
          {Object.keys(job.currentStatusCounts ?? {}).length === 0 && <p className="small muted">No questions stored yet.</p>}
          <dl className="meta-grid">
            {Object.entries(job.currentStatusCounts ?? {}).map(([s, n]) => (
              <Fragment key={s}>
                <dt>
                  <StatusBadge status={s} />
                </dt>
                <dd>
                  <Link href={`/questions?jobId=${job.id}&status=${s}`}>{n}</Link>
                </dd>
              </Fragment>
            ))}
          </dl>
        </div>
      </div>

      <div className="card">
        <h2 style={{ marginBottom: 10 }}>Batches</h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Status</th>
                <th>Mix (E/M/H)</th>
                <th className="num">Generated</th>
                <th className="num">Approved</th>
                <th className="num">Review</th>
                <th className="num">Rejected</th>
                <th className="num">Retries</th>
                <th className="num">Cost</th>
                <th>Error</th>
              </tr>
            </thead>
            <tbody>
              {job.batches?.map((b) => (
                <tr key={b.id}>
                  <td>{b.batchIndex}</td>
                  <td>
                    <StatusBadge status={b.status} />
                  </td>
                  <td className="small">
                    {b.difficultyMix.easy}/{b.difficultyMix.medium}/{b.difficultyMix.hard}
                  </td>
                  <td className="num">
                    {b.generatedCount}/{b.requestedCount}
                  </td>
                  <td className="num">{b.approvedCount}</td>
                  <td className="num">{b.needsReviewCount}</td>
                  <td className="num">{b.rejectedCount}</td>
                  <td className="num">
                    {b.retryCount}/{b.maxRetries}
                  </td>
                  <td className="num small">
                    <Money value={b.costUsd} />
                  </td>
                  <td className="small" style={{ color: b.status === 'failed' ? 'var(--danger)' : 'var(--muted)', maxWidth: 320 }}>
                    {b.errorMessage ?? ''}
                    {b.status === 'queued' && b.retryCount > 0 && ` (next try ${fmtDate(b.nextAttemptAt)})`}
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
