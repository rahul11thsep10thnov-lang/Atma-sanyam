'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { ErrorAlert, Kpi, Loading, Money, OutcomeBar, PageHead, StatusBadge } from '@/components/ui';
import { useCan } from '@/components/ConsoleShell';
import { useApi } from '@/lib/api';
import { relTime } from '@/lib/format';

interface Dashboard {
  questions: { total: number; approved: number; pendingReview: number; published: number; rejected: number };
  mockTests: { total: number; published: number };
  users: number;
  generationJobs: { total: number; running: number; failed: number; completed: number };
  aiSpendMonthToDateUsd: number;
  recentJobs: {
    id: string;
    status: string;
    requested: number;
    generated: number;
    approved: number;
    needsReview: number;
    rejected: number;
    createdAt: string;
  }[];
}

export default function DashboardPage() {
  const can = useCan();
  const { data, error, reload } = useApi<Dashboard>('dashboard');

  // Keep numbers moving while generation is running.
  const running = (data?.generationJobs.running ?? 0) > 0;
  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => void reload(), 4000);
    return () => clearInterval(t);
  }, [running, reload]);

  return (
    <>
      <PageHead
        title="Dashboard"
        subtitle="Question bank, generation pipeline and mock tests at a glance."
        actions={
          <>
            {can('generation:run') && (
              <Link className="btn btn-primary" href="/generate">
                Generate questions
              </Link>
            )}
            {can('questions:review') && (
              <Link className="btn" href="/review">
                Review queue
              </Link>
            )}
          </>
        }
      />
      <ErrorAlert error={error} />
      {!data ? (
        <Loading />
      ) : (
        <>
          <div className="kpis">
            <Kpi label="Questions" value={data.questions.total} sub={`${data.questions.rejected} rejected`} />
            <Kpi label="Approved" value={data.questions.approved} sub="ready to publish" />
            <Kpi label="Pending review" value={data.questions.pendingReview} sub="NEEDS_REVIEW + DRAFT" />
            <Kpi label="Published" value={data.questions.published} sub="live on the website" />
            <Kpi label="Mock tests" value={data.mockTests.total} sub={`${data.mockTests.published} published`} />
            <Kpi label="Users" value={data.users} />
            <Kpi label="Generation jobs" value={data.generationJobs.total} sub={`${data.generationJobs.running} running`} />
            <Kpi label="Failed jobs" value={data.generationJobs.failed} sub={data.generationJobs.failed ? 'retry from Generate' : 'none'} />
            <Kpi label="AI spend this month" value={`$${data.aiSpendMonthToDateUsd.toFixed(2)}`} />
          </div>

          <div className="card">
            <div className="card-head">
              <h2>Recent generation jobs</h2>
              <Link href="/generate" className="small">
                All jobs →
              </Link>
            </div>
            {data.recentJobs.length === 0 ? (
              <div className="empty">No generation jobs yet. Start one from Generate Questions.</div>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Status</th>
                      <th>Progress</th>
                      <th style={{ width: '32%' }}>Outcome</th>
                      <th className="num">Approved</th>
                      <th className="num">Needs review</th>
                      <th className="num">Rejected</th>
                      <th>Started</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.recentJobs.map((j) => (
                      <tr key={j.id}>
                        <td>
                          <Link href={`/generate/${j.id}`}>
                            <StatusBadge status={j.status} />
                          </Link>
                        </td>
                        <td className="small">
                          {j.generated} / {j.requested}
                        </td>
                        <td>
                          <OutcomeBar approved={j.approved} review={j.needsReview} rejected={j.rejected} requested={j.requested} />
                        </td>
                        <td className="num">{j.approved}</td>
                        <td className="num">{j.needsReview}</td>
                        <td className="num">{j.rejected}</td>
                        <td className="small muted">{relTime(j.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div className="legend">
              <span>
                <i style={{ background: 'var(--good)' }} />
                Approved
              </span>
              <span>
                <i style={{ background: 'var(--warn)' }} />
                Needs review
              </span>
              <span>
                <i style={{ background: 'var(--danger)' }} />
                Rejected
              </span>
              <span>
                <i style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }} />
                Not generated yet
              </span>
            </div>
          </div>
          <p className="small muted" style={{ marginTop: 12 }}>
            AI spend this month: <Money value={data.aiSpendMonthToDateUsd} />. Questions are never published automatically —
            approve in Review, then publish.
          </p>
        </>
      )}
    </>
  );
}
