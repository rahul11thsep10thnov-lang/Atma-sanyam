'use client';

import { useEffect, useState } from 'react';
import { api, errorMessage, useApi } from '@/lib/api';
import { fmtDate } from '@/lib/format';
import { ConfirmButton, ErrorAlert, Forbidden, OkAlert, PageHead, Pager, StatusBadge } from '@/components/ui';
import { useCan } from '@/components/ConsoleShell';

type Target =
  | { type: 'all' }
  | { type: 'signed_in' }
  | { type: 'platform'; platform: 'ios' | 'android' }
  | { type: 'users'; userIds: string[] };

interface Notification {
  id: string;
  title: string;
  body: string;
  target: Target;
  status: string;
  recipientCount: number;
  successCount: number;
  failureCount: number;
  error: string | null;
  createdAt: string;
  sentAt: string | null;
  createdByName: string | null;
}

function describeTarget(t: Target) {
  switch (t.type) {
    case 'all': return 'Everyone with notifications on';
    case 'signed_in': return 'Signed-in users';
    case 'platform': return t.platform === 'ios' ? 'iPhone users' : 'Android users';
    case 'users': return `${t.userIds.length} specific user${t.userIds.length === 1 ? '' : 's'}`;
  }
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default function NotificationsPage() {
  const can = useCan();
  const [page, setPage] = useState(1);
  const { data, error, reload } = useApi<{ items: Notification[]; total: number; page: number; pageSize: number }>(
    can('notifications:read') ? 'notifications' : null,
    { page, pageSize: 20 }
  );
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [targetType, setTargetType] = useState<Target['type']>('all');
  const [platform, setPlatform] = useState<'ios' | 'android'>('ios');
  const [userIds, setUserIds] = useState('');
  const [recipients, setRecipients] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const ids = userIds.split(/[\s,]+/).filter(Boolean);
  const invalidIds = ids.filter((i) => !UUID.test(i));
  const target: Target =
    targetType === 'platform' ? { type: 'platform', platform } : targetType === 'users' ? { type: 'users', userIds: ids } : { type: targetType };

  // Live recipient count so admins know the reach before sending.
  const targetKey = JSON.stringify(target);
  useEffect(() => {
    if (!can('notifications:send')) return;
    if (target.type === 'users' && (ids.length === 0 || invalidIds.length)) {
      setRecipients(null);
      return;
    }
    const t = setTimeout(() => {
      api<{ recipients: number }>('notifications/preview', { method: 'POST', body: { target } })
        .then((r) => setRecipients(r.recipients))
        .catch(() => setRecipients(null));
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetKey]);

  // Poll while something is still sending.
  const sending = data?.items.some((n) => n.status === 'sending');
  useEffect(() => {
    if (!sending) return;
    const t = setInterval(() => void reload(), 2000);
    return () => clearInterval(t);
  }, [sending, reload]);

  if (!can('notifications:read')) return <Forbidden />;

  async function submit(sendNow: boolean) {
    setBusy(true);
    setFormError(null);
    setOk(null);
    try {
      await api('notifications', { method: 'POST', body: { title, body, target, sendNow } });
      setOk(sendNow ? 'Sending… delivery results will appear below.' : 'Draft saved.');
      setTitle('');
      setBody('');
      setPage(1);
      await reload();
    } catch (e) {
      setFormError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  async function act(fn: () => Promise<unknown>) {
    setFormError(null);
    try {
      await fn();
      await reload();
    } catch (e) {
      setFormError(errorMessage(e));
    }
  }

  const canSubmit = title.trim() && body.trim() && !(targetType === 'users' && (ids.length === 0 || invalidIds.length));

  return (
    <div>
      <PageHead title="Notifications" subtitle="Push announcements to the app. People only receive them if they turned on “News & announcements”." />
      <ErrorAlert error={error || formError} />
      <OkAlert message={ok} />
      <div className="grid grid-2" style={{ alignItems: 'start' }}>
        {can('notifications:send') && (
          <section className="card">
            <h2 style={{ marginBottom: 12 }}>New notification</h2>
            <label className="field">
              <span>Title</span>
              <input className="input" maxLength={65} value={title} onChange={(e) => setTitle(e.target.value)} />
              <small>{title.length}/65</small>
            </label>
            <label className="field">
              <span>Message</span>
              <textarea className="input" maxLength={240} value={body} onChange={(e) => setBody(e.target.value)} />
              <small>{body.length}/240</small>
            </label>
            <label className="field">
              <span>Send to</span>
              <select className="input" value={targetType} onChange={(e) => setTargetType(e.target.value as Target['type'])}>
                <option value="all">Everyone with notifications on</option>
                <option value="signed_in">Signed-in users only</option>
                <option value="platform">One platform</option>
                <option value="users">Specific users</option>
              </select>
            </label>
            {targetType === 'platform' && (
              <label className="field">
                <span>Platform</span>
                <select className="input" value={platform} onChange={(e) => setPlatform(e.target.value as 'ios' | 'android')}>
                  <option value="ios">iOS</option>
                  <option value="android">Android</option>
                </select>
              </label>
            )}
            {targetType === 'users' && (
              <label className="field">
                <span>User IDs</span>
                <textarea className="input mono" placeholder="Paste user IDs from the Users page, separated by commas or new lines" value={userIds} onChange={(e) => setUserIds(e.target.value)} />
                {invalidIds.length > 0 && <small style={{ color: 'var(--danger)' }}>{invalidIds.length} invalid ID(s)</small>}
              </label>
            )}
            <p className="small muted">
              {recipients === null ? 'Estimating reach…' : `Will reach ${recipients} device${recipients === 1 ? '' : 's'}.`}
            </p>
            <div className="row">
              <button className="btn btn-primary" disabled={!canSubmit || busy} onClick={() => { if (window.confirm(`Send “${title}” now to ${recipients ?? 'the selected'} devices?`)) void submit(true); }}>
                Send now
              </button>
              <button className="btn" disabled={!canSubmit || busy} onClick={() => submit(false)}>Save draft</button>
            </div>
          </section>
        )}
        <section className="card" style={can('notifications:send') ? undefined : { gridColumn: '1 / -1' }}>
          <h2 style={{ marginBottom: 12 }}>History</h2>
          {data && data.items.length === 0 ? (
            <div className="empty">No notifications yet.</div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead><tr><th>Notification</th><th>Status</th><th className="num">Delivered</th><th /></tr></thead>
                <tbody>
                  {data?.items.map((n) => (
                    <tr key={n.id}>
                      <td>
                        <strong>{n.title}</strong>
                        <div className="small">{n.body}</div>
                        <div className="small muted">
                          {describeTarget(n.target)} · {n.createdByName ?? 'unknown'} · {fmtDate(n.sentAt ?? n.createdAt)}
                        </div>
                        {n.error && <div className="small" style={{ color: 'var(--danger)' }}>{n.error}</div>}
                      </td>
                      <td><StatusBadge status={n.status} /></td>
                      <td className="num">{n.status === 'draft' ? '—' : `${n.successCount}/${n.recipientCount}`}</td>
                      <td>
                        {n.status === 'draft' && can('notifications:send') && (
                          <div className="row" style={{ flexWrap: 'nowrap', justifyContent: 'flex-end' }}>
                            <ConfirmButton className="btn btn-sm btn-primary" label="Send" confirm={`Send “${n.title}” now?`} onConfirm={() => act(() => api(`notifications/${n.id}/send`, { method: 'POST' }))} />
                            <ConfirmButton label="Delete" confirm="Delete this draft?" onConfirm={() => act(() => api(`notifications/${n.id}`, { method: 'DELETE' }))} />
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {data && <Pager page={data.page} pageSize={data.pageSize} total={data.total} onPage={setPage} />}
        </section>
      </div>
    </div>
  );
}
