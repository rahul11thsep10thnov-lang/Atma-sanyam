'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useApi } from '@/lib/api';
import { fmtDate, relTime } from '@/lib/format';
import { ErrorAlert, Forbidden, PageHead, Pager, StatusBadge } from '@/components/ui';
import { useCan } from '@/components/ConsoleShell';

interface Row {
  id: string;
  name: string;
  phoneMasked: string;
  email: string | null;
  status: string;
  createdAt: string;
  lastSeenAt: string | null;
  children: number;
  entitlement: { active: boolean; status: string };
}

export default function GuardiansPage() {
  const can = useCan();
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  useEffect(() => {
    const t = setTimeout(() => { setDebounced(search); setPage(1); }, 300);
    return () => clearTimeout(t);
  }, [search]);
  const { data, error, loading } = useApi<{ items: Row[]; total: number; page: number; pageSize: number }>(can('guardians:read') ? 'guardians' : null, { search: debounced, status, page, pageSize: 20 });
  if (!can('guardians:read')) return <Forbidden />;

  return (
    <div>
      <PageHead title="Guardians" subtitle="Family accounts. Children appear only as counts and age brackets; the console never shows a child's name or birth month." />
      <div className="filters">
        <input className="input" type="search" placeholder="Search name, phone or email" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search guardians" />
        <select className="input" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} aria-label="Status">
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="deactivated">Deactivated</option>
          <option value="deleted_pending">Deletion pending</option>
        </select>
      </div>
      <ErrorAlert error={error} />
      <section className={`card ${loading ? 'loading-dim' : ''}`}>
        {data && data.items.length === 0 ? (
          <div className="empty">No guardians match.</div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Guardian</th><th>Status</th><th>Subscription</th><th className="num">Children</th><th>Joined</th><th>Last seen</th></tr>
              </thead>
              <tbody>
                {data?.items.map((u) => (
                  <tr key={u.id}>
                    <td>
                      <Link href={`/guardians/${u.id}`}>{u.name}</Link>
                      <div className="small muted">{[u.phoneMasked, u.email].filter(Boolean).join(' · ')}</div>
                    </td>
                    <td><StatusBadge status={u.status} /></td>
                    <td><span className={`badge ${u.entitlement.active ? 'badge-good' : 'badge-warn'}`}>{u.entitlement.status.replace(/_/g, ' ')}</span></td>
                    <td className="num">{u.children}</td>
                    <td className="small">{fmtDate(u.createdAt)}</td>
                    <td className="small muted">{relTime(u.lastSeenAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {data && <Pager page={data.page} pageSize={data.pageSize} total={data.total} onPage={setPage} />}
      </section>
    </div>
  );
}
