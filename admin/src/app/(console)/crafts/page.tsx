'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useApi } from '@/lib/api';
import { ErrorAlert, Forbidden, PageHead, StatusBadge } from '@/components/ui';
import { useCan } from '@/components/ConsoleShell';
import type { Craft } from '@/components/CraftForm';

export default function CraftsPage() {
  const can = useCan();
  const [status, setStatus] = useState('');
  const [kind, setKind] = useState('');
  const { data, error, loading } = useApi<Craft[]>(can('content:read') ? 'crafts' : null, { status, kind });
  if (!can('content:read')) return <Forbidden />;
  return (
    <div>
      <PageHead title="Art & Craft tutorials" subtitle="Origami, paper crafts, drawing guides and on-screen activities, with materials, hazards and fold diagrams." actions={can('content:write') && <Link href="/crafts/new" className="btn btn-primary btn-sm">New tutorial</Link>} />
      <div className="filters">
        <select className="input" value={kind} onChange={(e) => setKind(e.target.value)} aria-label="Kind"><option value="">All kinds</option><option value="origami">Origami</option><option value="paper_craft">Paper craft</option><option value="drawing">Drawing</option><option value="digital">On-screen</option></select>
        <select className="input" value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Status"><option value="">All statuses</option><option value="published">Published</option><option value="draft">Draft</option><option value="in_development">In development</option><option value="archived">Archived</option></select>
      </div>
      <ErrorAlert error={error} />
      <section className={`card ${loading ? 'loading-dim' : ''}`}>
        <div className="table-wrap"><table>
          <thead><tr><th>Tutorial</th><th>Kind</th><th>Brackets</th><th className="num">Steps</th><th>Safety</th><th>Status</th></tr></thead>
          <tbody>
            {data?.map((c) => (
              <tr key={c.id}>
                <td><Link href={`/crafts/${c.id}`}>{c.title}</Link><div className="small muted">{c.id} · {c.estimatedMinutes} min · difficulty {c.difficulty}</div></td>
                <td>{c.kind.replace('_', ' ')}{!c.physical && <span className="small muted"> · on screen</span>}</td>
                <td>{c.brackets.join(' ')}</td>
                <td className="num">{c.steps.length}</td>
                <td className="small">{c.adultSupervision ? `grown-up · ${c.hazards.join(', ') || 'no hazards'}` : '—'}</td>
                <td><StatusBadge status={c.status} /></td>
              </tr>
            ))}
            {data && data.length === 0 && <tr><td colSpan={6} className="empty">No tutorials match.</td></tr>}
          </tbody>
        </table></div>
      </section>
    </div>
  );
}
