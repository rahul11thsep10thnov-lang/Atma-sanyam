'use client';

import { useState } from 'react';
import { ErrorAlert, PageHead, Pager } from '@/components/ui';
import { useApi } from '@/lib/api';
import { fmtDate, humanizeAction } from '@/lib/format';

interface Row {
  id: string;
  action: string;
  actor: string;
  entityType: string;
  entityId: string | null;
  details: Record<string, unknown> | null;
  createdAt: string;
  adminEmail: string | null;
}

export default function AuditPage() {
  const [page, setPage] = useState(1);
  const [entityType, setEntityType] = useState('');
  const { data, error } = useApi<{ items: Row[]; page: number; pageSize: number; total: number }>('audit', { page, pageSize: 50, entityType });
  return (
    <>
      <PageHead title="Audit log" subtitle="Every approval, rejection, publish, edit, generation job and settings change — who and when." />
      <div className="card">
        <div className="filters">
          <select className="input" aria-label="Type" value={entityType} onChange={(e) => (setEntityType(e.target.value), setPage(1))}>
            <option value="">Everything</option>
            <option value="question">Questions</option>
            <option value="generation_job">Generation jobs</option>
            <option value="mock_test">Mock tests</option>
            <option value="mock_blueprint">Blueprints</option>
            <option value="import">Imports</option>
            <option value="source_material">Source material</option>
            <option value="settings">Settings</option>
            <option value="admin">Admins</option>
          </select>
        </div>
        <ErrorAlert error={error} />
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>When</th>
                <th>Who</th>
                <th>Action</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {data?.items.map((r) => (
                <tr key={r.id}>
                  <td className="small" style={{ whiteSpace: 'nowrap' }}>
                    {fmtDate(r.createdAt)}
                  </td>
                  <td className="small">{r.adminEmail ?? r.actor}</td>
                  <td>
                    <strong className="small">{humanizeAction(r.action)}</strong>
                    <div className="small muted mono">{r.entityId?.slice(0, 8)}</div>
                  </td>
                  <td className="small mono muted" style={{ maxWidth: 460, overflowWrap: 'anywhere' }}>
                    {r.details ? JSON.stringify(r.details).slice(0, 240) : ''}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {data && <Pager page={page} pageSize={data.pageSize} total={data.total} onPage={setPage} />}
      </div>
    </>
  );
}
