'use client';

import { useState } from 'react';
import { useApi } from '@/lib/api';
import { fmtDate, humanizeAction } from '@/lib/format';
import { ErrorAlert, Forbidden, PageHead, Pager } from '@/components/ui';
import { useCan } from '@/components/ConsoleShell';

interface Entry {
  id: number;
  action: string;
  entityType: string;
  entityId: string | null;
  details: Record<string, unknown> | null;
  createdAt: string;
  adminName: string | null;
  adminEmail: string | null;
}

export default function AuditPage() {
  const can = useCan();
  const [page, setPage] = useState(1);
  const { data, error, loading } = useApi<{ items: Entry[]; total: number; page: number; pageSize: number }>(
    can('audit:read') ? 'audit-log' : null,
    { page, pageSize: 50 }
  );
  if (!can('audit:read')) return <Forbidden />;
  return (
    <div>
      <PageHead title="Audit log" subtitle="Every change made through this console, newest first." />
      <ErrorAlert error={error} />
      <section className={`card ${loading ? 'loading-dim' : ''}`}>
        <div className="table-wrap">
          <table>
            <thead><tr><th>When</th><th>Admin</th><th>Action</th><th>Details</th></tr></thead>
            <tbody>
              {data?.items.map((e) => (
                <tr key={e.id}>
                  <td className="small" style={{ whiteSpace: 'nowrap' }}>{fmtDate(e.createdAt)}</td>
                  <td className="small">{e.adminName ?? 'Deleted admin'}<div className="muted">{e.adminEmail}</div></td>
                  <td>{humanizeAction(e.action)}</td>
                  <td className="small mono" style={{ maxWidth: 380, wordBreak: 'break-word' }}>{e.details ? JSON.stringify(e.details) : e.entityId ?? ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {data && data.items.length === 0 && <div className="empty">Nothing yet.</div>}
        {data && <Pager page={data.page} pageSize={data.pageSize} total={data.total} onPage={setPage} />}
      </section>
    </div>
  );
}
