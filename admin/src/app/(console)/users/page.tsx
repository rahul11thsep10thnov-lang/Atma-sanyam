'use client';

import { useState } from 'react';
import { ErrorAlert, PageHead, Pager } from '@/components/ui';
import { useApi } from '@/lib/api';
import { relTime } from '@/lib/format';

interface UserRow {
  id: string;
  display_name: string | null;
  auth_provider: string;
  email: string | null;
  status: string;
  created_at: string;
  last_seen_at: string | null;
  attempts: number;
  avg_percentage: number | null;
  subscription: { status: string; expiresAt: string | null; provider: string } | null;
}

export default function UsersPage() {
  const [page, setPage] = useState(1);
  const { data, error } = useApi<{ items: UserRow[]; page: number; pageSize: number; total: number }>('users', { page, pageSize: 50 });
  return (
    <>
      <PageHead title="Users" subtitle="Website users who have signed in or started a test. Guests appear until they log in with Google or OTP." />
      <div className="card">
        <ErrorAlert error={error} />
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>User</th>
                <th>Login</th>
                <th>Plan</th>
                <th className="num">Tests</th>
                <th className="num">Avg score</th>
                <th>Last seen</th>
                <th>Joined</th>
              </tr>
            </thead>
            <tbody>
              {data?.items.map((u) => (
                <tr key={u.id}>
                  <td>
                    {u.display_name || <span className="muted">Unnamed</span>}
                    {u.email && <div className="small muted">{u.email}</div>}
                  </td>
                  <td>
                    <span className={`badge ${u.auth_provider === 'guest' ? '' : 'badge-info'}`}>{u.auth_provider === 'guest' ? 'guest' : 'Google / OTP'}</span>
                  </td>
                  <td className="small">
                    {u.subscription ? (
                      <span className="badge badge-good" title={`via ${u.subscription.provider}`}>
                        Pass · till {u.subscription.expiresAt ? new Date(u.subscription.expiresAt).toLocaleDateString('en-IN') : '—'}
                      </span>
                    ) : (
                      <span className="muted">free</span>
                    )}
                  </td>
                  <td className="num">{u.attempts}</td>
                  <td className="num">{u.avg_percentage == null ? '—' : `${Math.round(u.avg_percentage)}%`}</td>
                  <td className="small muted">{relTime(u.last_seen_at)}</td>
                  <td className="small muted">{relTime(u.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {data?.items.length === 0 && <div className="empty">No users yet.</div>}
        </div>
        {data && <Pager page={page} pageSize={data.pageSize} total={data.total} onPage={setPage} />}
      </div>
    </>
  );
}
