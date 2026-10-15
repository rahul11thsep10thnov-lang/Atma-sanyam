'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useApi } from '@/lib/api';
import { relTime } from '@/lib/format';
import { ErrorAlert, Forbidden, PageHead, Pager, StatusBadge } from '@/components/ui';
import { useCan } from '@/components/ConsoleShell';
import { FACT_CATEGORIES, type Fact } from '@/components/FactForm';

type Row = Fact & { sourceTitle: string | null; sourcePublisher: string | null; questionCount: number };

export default function FactsPage() {
  const can = useCan();
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [status, setStatus] = useState('');
  const [category, setCategory] = useState('');
  const [page, setPage] = useState(1);
  useEffect(() => { const t = setTimeout(() => { setDebounced(search); setPage(1); }, 300); return () => clearTimeout(t); }, [search]);
  const { data, error, loading } = useApi<{ items: Row[]; total: number; page: number; pageSize: number }>(can('content:read') ? 'facts' : null, { search: debounced, status, category, page, pageSize: 50 });
  if (!can('content:read')) return <Forbidden />;
  const catName = (k: string) => FACT_CATEGORIES.find((c) => c.key === k)?.name ?? k;
  return (
    <div>
      <PageHead title="Did You Know?" subtitle="Facts go draft → verified (checked against the source by a fact checker) → published. Nothing reaches a child without a source, a verification and a quiz question." actions={can('content:write') && <Link href="/facts/new" className="btn btn-primary btn-sm">New fact</Link>} />
      <div className="filters">
        <input className="input" type="search" placeholder="Search headline or text" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search facts" />
        <select className="input" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} aria-label="Status"><option value="">All statuses</option><option value="draft">Draft</option><option value="verified">Verified</option><option value="published">Published</option><option value="archived">Archived</option></select>
        <select className="input" value={category} onChange={(e) => { setCategory(e.target.value); setPage(1); }} aria-label="Category"><option value="">All categories</option>{FACT_CATEGORIES.map((c) => <option key={c.key} value={c.key}>{c.name}</option>)}</select>
      </div>
      <ErrorAlert error={error} />
      <section className={`card ${loading ? 'loading-dim' : ''}`}>
        <div className="table-wrap"><table>
          <thead><tr><th>Fact</th><th>Category</th><th>Brackets</th><th>Source</th><th className="num">Quiz</th><th>Status</th><th>Updated</th></tr></thead>
          <tbody>
            {data?.items.map((f) => (
              <tr key={f.id}>
                <td><Link href={`/facts/${f.id}`}>{f.headline}</Link><div className="small muted">{f.slug}</div></td>
                <td className="small">{catName(f.category)}</td>
                <td>{f.brackets.join(' ')}</td>
                <td className="small">{f.sourcePublisher ? <span title={f.sourceTitle ?? ''}>{f.sourcePublisher}</span> : <span className="badge badge-danger">none</span>}</td>
                <td className="num">{f.questionCount === 0 ? <span className="badge badge-warn">0</span> : f.questionCount}</td>
                <td><StatusBadge status={f.status} /></td>
                <td className="small muted">{relTime(f.updatedAt)}</td>
              </tr>
            ))}
            {data && data.items.length === 0 && <tr><td colSpan={7} className="empty">No facts match.</td></tr>}
          </tbody>
        </table></div>
        {data && <Pager page={data.page} pageSize={data.pageSize} total={data.total} onPage={setPage} />}
      </section>
    </div>
  );
}
