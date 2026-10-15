'use client';

import { useApi } from '@/lib/api';
import { ErrorAlert, Forbidden, Kpi, PageHead } from '@/components/ui';
import { useCan } from '@/components/ConsoleShell';

interface Health {
  ok: boolean;
  environment: string;
  uptimeSeconds: number;
  database: { ok: boolean; latencyMs: number };
  sms: { provider: string; testNumbers: number };
  billing: { googlePlay: boolean; razorpay: boolean; sandbox: boolean; productId: string; priceInr: number };
  runningGameSessions: number;
  pendingDeletionRequests: number;
  retention: { screenTimeDays: number; deletionCoolingOffDays: number };
}

const Flag = ({ on, label, warn }: { on: boolean; label: string; warn?: string }) => (
  <tr><td>{label}</td><td><span className={`badge ${on ? 'badge-good' : 'badge-warn'}`}>{on ? 'configured' : 'off'}</span>{!on && warn && <span className="small muted"> {warn}</span>}</td></tr>
);

export default function HealthPage() {
  const can = useCan();
  const { data, error, loading, reload } = useApi<Health>(can('dashboard:read') ? 'health' : null);
  if (!can('dashboard:read')) return <Forbidden />;
  const h = Math.floor((data?.uptimeSeconds ?? 0) / 3600);
  return (
    <div>
      <PageHead title="System health" subtitle="Live view of the API: database, providers and background state. Secrets are never shown here." actions={<button className="btn btn-sm" onClick={() => reload()}>Refresh</button>} />
      <ErrorAlert error={error} />
      {loading && !data && <div className="card empty">Checking…</div>}
      {data && (
        <>
          <div className="kpis">
            <Kpi label="API" value={data.ok ? 'OK' : 'Degraded'} sub={`${data.environment} · up ${h}h ${Math.floor((data.uptimeSeconds % 3600) / 60)}m`} />
            <Kpi label="Database" value={data.database.ok ? `${data.database.latencyMs} ms` : 'Unreachable'} sub="select 1 round trip" />
            <Kpi label="Games running now" value={data.runningGameSessions} />
            <Kpi label="Pending account deletions" value={data.pendingDeletionRequests} sub={`${data.retention.deletionCoolingOffDays}-day cooling-off`} />
          </div>
          <div className="grid grid-2">
            <section className="card">
              <h2>Providers</h2>
              <div className="table-wrap"><table><tbody>
                <tr><td>SMS / OTP provider</td><td><span className={`badge ${data.sms.provider === 'console' ? 'badge-warn' : 'badge-good'}`}>{data.sms.provider}</span>{data.sms.provider === 'console' && <span className="small muted"> codes print to the server log (development only)</span>}</td></tr>
                <tr><td>OTP test numbers</td><td>{data.sms.testNumbers}</td></tr>
                <Flag on={data.billing.googlePlay} label="Google Play Billing" warn="Android purchases cannot be verified" />
                <Flag on={data.billing.razorpay} label="Razorpay (web)" warn="website payments are disabled" />
                <tr><td>Sandbox billing</td><td><span className={`badge ${data.billing.sandbox ? 'badge-danger' : 'badge-good'}`}>{data.billing.sandbox ? 'ON (never in production)' : 'off'}</span></td></tr>
                <tr><td>Product</td><td><code>{data.billing.productId}</code> · ₹{data.billing.priceInr}/month</td></tr>
              </tbody></table></div>
            </section>
            <section className="card">
              <h2>Data retention</h2>
              <div className="table-wrap"><table><tbody>
                <tr><td>Screen-time records</td><td>{data.retention.screenTimeDays} days</td></tr>
                <tr><td>Account deletion cooling-off</td><td>{data.retention.deletionCoolingOffDays} days</td></tr>
                <tr><td>Game mirror snapshots</td><td>Only while a session runs; cleared at session end</td></tr>
              </tbody></table></div>
            </section>
          </div>
        </>
      )}
    </div>
  );
}
