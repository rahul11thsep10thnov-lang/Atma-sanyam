'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { api, errorMessage } from '@/lib/api';
import { KINDS, WORKFLOW, statusLabel, type DaduContentItem, type Kind } from '@/lib/dadu';
import { ErrorAlert, Forbidden, Kpi, PageHead } from '@/components/ui';
import { useCan } from '@/components/ConsoleShell';
import { WorkflowLegend } from '@/components/dadu/WorkflowLegend';

type Page = { items: DaduContentItem[]; total: number; page: number; pageSize: number };

export default function DaduOverviewPage() {
  const can = useCan();
  const [byKind, setByKind] = useState<Record<string, number>>({});
  const [byStatus, setByStatus] = useState<Record<string, number>>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const allowed = can('dadu:content:read');

  useEffect(() => {
    if (!allowed) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        // No summary endpoint: one list call per kind (pageSize 1 for the total) and per status.
        const kinds = await Promise.all(KINDS.map((kind) => api<Page>('dadu/content', { query: { kind, page: 1, pageSize: 1 } }).then((p) => [kind, p.total] as const)));
        const statuses = await Promise.all(WORKFLOW.map((w) => api<Page>('dadu/content', { query: { status: w.key, page: 1, pageSize: 1 } }).then((p) => [w.key, p.total] as const)));
        if (cancelled) return;
        setByKind(Object.fromEntries(kinds));
        setByStatus(Object.fromEntries(statuses));
        setError(null);
      } catch (e) {
        if (!cancelled) setError(errorMessage(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [allowed]);

  if (!allowed) return <Forbidden />;
  const total = Object.values(byKind).reduce((a, b) => a + b, 0);
  const inReview = WORKFLOW.filter((w) => w.key !== 'draft' && w.key !== 'published' && w.key !== 'approved').reduce((a, w) => a + (byStatus[w.key] ?? 0), 0);

  return (
    <div>
      <PageHead title="DADU content" subtitle="Lessons, stories, assignments, objects, characters and locations for Dadaji's Miniverse." actions={can('dadu:content:write') && <Link className="btn btn-primary" href="/dadu/content/new">New item</Link>} />
      <ErrorAlert error={error} />
      <div className={`kpis ${loading ? 'loading-dim' : ''}`}>
        <Kpi label="All items" value={total} />
        <Kpi label="Published" value={byStatus.published ?? 0} />
        <Kpi label="In review" value={inReview} sub="educational → safety" />
        <Kpi label="Drafts" value={byStatus.draft ?? 0} />
        <Kpi label="Approved, not yet published" value={byStatus.approved ?? 0} />
      </div>
      <div className="grid grid-2" style={{ alignItems: 'start' }}>
        <section className="card">
          <h2 style={{ marginBottom: 12 }}>By kind</h2>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Kind</th><th className="num">Items</th><th /></tr></thead>
              <tbody>
                {KINDS.map((k: Kind) => (
                  <tr key={k}>
                    <td>{k}</td>
                    <td className="num">{byKind[k] ?? 0}</td>
                    <td><Link className="small" href={`/dadu/content?kind=${k}`}>Open</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
        <section className="card">
          <h2 style={{ marginBottom: 12 }}>By workflow step</h2>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Step</th><th className="num">Items</th><th /></tr></thead>
              <tbody>
                {WORKFLOW.map((w) => (
                  <tr key={w.key}>
                    <td>{statusLabel(w.key)}</td>
                    <td className="num">{byStatus[w.key] ?? 0}</td>
                    <td><Link className="small" href={`/dadu/content?status=${w.key}`}>Open</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
      <section className="card">
        <h2 style={{ marginBottom: 12 }}>Quick links</h2>
        <div className="row">
          <Link className="btn btn-sm" href="/dadu/content">Content</Link>
          <Link className="btn btn-sm" href="/dadu/translations">Translations</Link>
          <Link className="btn btn-sm" href="/dadu/assets">Media assets</Link>
          <Link className="btn btn-sm" href="/dadu/packs">Offline packs</Link>
          <Link className="btn btn-sm" href="/dadu/flags">Feature flags</Link>
          <Link className="btn btn-sm" href="/dadu/parents">Parent support</Link>
        </div>
      </section>
      <section className="card">
        <h2 style={{ marginBottom: 12 }}>The editorial workflow</h2>
        <WorkflowLegend />
      </section>
    </div>
  );
}
