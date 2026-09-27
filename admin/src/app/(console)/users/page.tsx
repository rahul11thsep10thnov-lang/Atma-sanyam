'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useApi } from '@/lib/api';
import { fmtDate, relTime } from '@/lib/format';
import { ErrorAlert, Forbidden, PageHead, Pager, StatusBadge } from '@/components/ui';
import { useCan } from '@/components/ConsoleShell';

interface UserRow {
  id: string;
  email: string;
  displayName: string | null;
  status: string;
  createdAt: string;
  lastSeenAt: string | null;
}

export default function UsersPage() {
  const can = useCan();
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    const t = setTimeout(() => {
      setDebounced(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const { data, error, loading } = useApi<{ items: UserRow[]; total: number; page: number; pageSize: number }>(
    can('users:read') ? 'users' : null,
    { search: debounced, status, page, pageSize: 20 }
  );
  if (!can('users:read')) return <Forbidden />;

  return (
    <div>
      <PageHead title="Users" subtitle="People who created an account in the app." />
      <div className="filters">
        <input className="input" type="search" placeholder="Search email or name" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search users" />
        <select className="input" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} aria-label="Status">
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="deactivated">Deactivated</option>
        </select>
      </div>
      <ErrorAlert error={error} />
      <section className={`card ${loading ? 'loading-dim' : ''}`}>
        {data && data.items.length === 0 ? (
          <div className="empty">No users match.</div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>User</th>
                  <th>Status</th>
                  <th>Joined</th>
                  <th>Last seen</th>
                </tr>
              </thead>
              <tbody>
                {data?.items.map((u) => (
                  <tr key={u.id}>
                    <td>
                      <Link href={`/users/${u.id}`}>{u.displayName || u.email}</Link>
                      {u.displayName && <div className="small muted">{u.email}</div>}
                    </td>
                    <td><StatusBadge status={u.status} /></td>
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
