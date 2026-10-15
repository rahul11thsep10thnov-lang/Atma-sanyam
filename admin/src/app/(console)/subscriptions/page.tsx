'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { api, errorMessage, useApi } from '@/lib/api';
import { fmtDate, fmtNumber } from '@/lib/format';
import { ColumnChart } from '@/components/ColumnChart';
import { ConfirmButton, ErrorAlert, Forbidden, Kpi, OkAlert, PageHead, Pager, StatusBadge } from '@/components/ui';
import { useCan } from '@/components/ConsoleShell';

interface Sub { id: string; provider: string; status: string; currentPeriodEnd: string | null; cancelAtPeriodEnd?: boolean; createdAt?: string; guardianId: string; guardianName: string; guardianPhoneMasked: string }
interface Stats { byStatus: { status: string; provider: string; n: number }[]; entitlements: { active: number; lapsed: number }; startsLast30Days: { date: string; started: number }[] }
interface BillingEvent { id: string; type: string; provider: string; createdAt: string; payload: Record<string, unknown> }

const STATUSES = ['pending', 'active', 'grace', 'billing_retry', 'expired', 'cancelled', 'revoked'];

export default function SubscriptionsPage() {
  const can = useCan();
  const params = useSearchParams();
  const [status, setStatus] = useState('');
  const [provider, setProvider] = useState('');
  const [page, setPage] = useState(1);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const { data: stats } = useApi<Stats>(can('subscriptions:read') ? 'subscriptions/stats' : null);
  const { data, error, loading, reload } = useApi<{ items: Sub[]; total: number; page: number; pageSize: number }>(can('subscriptions:read') ? 'subscriptions' : null, { status, provider, page, pageSize: 25 });
  const { data: events } = useApi<BillingEvent[]>(open ? `subscriptions/${open}/events` : null);
  if (!can('subscriptions:read')) return <Forbidden />;
  const highlight = params.get('guardian');

  async function revoke(id: string) {
    setErr(null);
    try { await api(`subscriptions/${id}/revoke`, { method: 'POST' }); setMsg('Subscription revoked; access ends now.'); await reload(); } catch (e) { setErr(errorMessage(e)); }
  }
  async function extend(id: string) {
    const days = Number(window.prompt('Extend by how many days? (1–90)', '7'));
    if (!days) return;
    const reason = window.prompt('Reason (recorded in the billing events and audit log)') ?? '';
    if (!reason.trim()) return;
    setErr(null);
    try { await api(`subscriptions/${id}/extend`, { method: 'POST', body: { days, reason } }); setMsg(`Extended by ${days} day(s).`); await reload(); } catch (e) { setErr(errorMessage(e)); }
  }

  const byStatus = (s: string) => stats?.byStatus.filter((x) => x.status === s).reduce((n, x) => n + x.n, 0) ?? 0;
  return (
    <div>
      <PageHead title="Subscriptions" subtitle="Every plan is verified with the store or payment provider; the console can only revoke access or extend a period for support." />
      {stats && (
        <div className="kpis">
          <Kpi label="Entitled families" value={stats.entitlements.active} sub={`${stats.entitlements.lapsed} lapsed`} />
          <Kpi label="Active" value={byStatus('active')} />
          <Kpi label="Grace / retry" value={byStatus('grace') + byStatus('billing_retry')} />
          <Kpi label="Cancelled (still entitled)" value={byStatus('cancelled')} />
          <Kpi label="Expired / revoked" value={byStatus('expired') + byStatus('revoked')} />
        </div>
      )}
      {stats && (
        <section className="card">
          <div className="card-head"><h2>New subscriptions, last 30 days</h2><span className="small muted">{fmtNumber(stats.startsLast30Days.reduce((n, d) => n + d.started, 0))} total</span></div>
          <ColumnChart data={stats.startsLast30Days.map((d) => ({ date: d.date, count: d.started }))} valueLabel="subscriptions" />
        </section>
      )}
      <div className="filters" style={{ marginTop: 16 }}>
        <select className="input" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} aria-label="Status"><option value="">All statuses</option>{STATUSES.map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}</select>
        <select className="input" value={provider} onChange={(e) => { setProvider(e.target.value); setPage(1); }} aria-label="Provider"><option value="">All providers</option><option value="google_play">Google Play</option><option value="razorpay">Razorpay</option><option value="sandbox">Sandbox</option></select>
      </div>
      <ErrorAlert error={error ?? err} />
      <OkAlert message={msg} />
      <section className={`card ${loading ? 'loading-dim' : ''}`}>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Guardian</th><th>Provider</th><th>Status</th><th>Period end</th><th /></tr></thead>
            <tbody>
              {data?.items.map((s) => (
                <tr key={s.id} style={highlight === s.guardianId ? { background: 'var(--accent-soft)' } : undefined}>
                  <td><Link href={`/guardians/${s.guardianId}`}>{s.guardianName}</Link><div className="small muted">{s.guardianPhoneMasked}</div></td>
                  <td>{s.provider}</td>
                  <td><StatusBadge status={s.status} />{s.cancelAtPeriodEnd && <span className="small muted"> ends at period end</span>}</td>
                  <td className="small">{fmtDate(s.currentPeriodEnd)}</td>
                  <td className="num">
                    <div className="row" style={{ justifyContent: 'flex-end' }}>
                      <button className="btn btn-sm" onClick={() => setOpen(open === s.id ? null : s.id)}>{open === s.id ? 'Hide events' : 'Events'}</button>
                      {can('subscriptions:write') && <button className="btn btn-sm" onClick={() => extend(s.id)}>Extend</button>}
                      {can('subscriptions:write') && s.status !== 'revoked' && <ConfirmButton label="Revoke" confirm={`Revoke ${s.guardianName}'s subscription? Their children lose access immediately.`} onConfirm={() => revoke(s.id)} />}
                    </div>
                  </td>
                </tr>
              ))}
              {data && data.items.length === 0 && <tr><td colSpan={5} className="empty">No subscriptions match.</td></tr>}
            </tbody>
          </table>
        </div>
        {data && <Pager page={data.page} pageSize={data.pageSize} total={data.total} onPage={setPage} />}
      </section>
      {open && (
        <section className="card">
          <div className="card-head"><h2>Billing events</h2><button className="btn btn-sm btn-ghost" onClick={() => setOpen(null)}>Close</button></div>
          {!events ? <div className="empty">Loading…</div> : events.length === 0 ? <div className="empty">No events recorded.</div> : (
            <div className="table-wrap"><table><thead><tr><th>When</th><th>Type</th><th>Provider</th><th>Payload</th></tr></thead><tbody>
              {events.map((e) => <tr key={e.id}><td className="small">{fmtDate(e.createdAt)}</td><td>{e.type}</td><td>{e.provider}</td><td className="small muted"><code>{JSON.stringify(e.payload).slice(0, 160)}</code></td></tr>)}
            </tbody></table></div>
          )}
        </section>
      )}
    </div>
  );
}
