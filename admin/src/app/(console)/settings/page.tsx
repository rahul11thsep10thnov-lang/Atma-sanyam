'use client';

import { useState } from 'react';
import { useCan, useMe } from '@/components/ConsoleShell';
import { ErrorAlert, Loading, OkAlert, PageHead, StatusBadge } from '@/components/ui';
import { api, errorMessage, useApi } from '@/lib/api';
import { relTime } from '@/lib/format';

interface Settings {
  pipeline: {
    batchSize: number;
    maxRetries: number;
    generationTimeoutMs: number;
    reviewTimeoutMs: number;
    maxQuestionsPerJob: number;
    monthlyBudgetUsd: number | null;
    autoApprove: boolean;
    minReviewConfidence: number;
    reviewBatchSize: number;
  };
  ai: { provider: string; mockAi: boolean; generationModel: string; reviewModel: string; effort: string; apiKeyConfigured: boolean };
  worker: { enabled: boolean; concurrency: number };
}

export default function SettingsPage() {
  const can = useCan();
  return (
    <>
      <PageHead title="Settings" subtitle="AI pipeline and spending controls, console accounts and your password." />
      <PipelineSettings />
      {can('admins:write') && <Admins />}
      <Password />
    </>
  );
}

function PipelineSettings() {
  const can = useCan();
  const { data, error, setData } = useApi<Settings>('settings');
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  if (!data) return error ? <ErrorAlert error={error} /> : <Loading />;
  const p = data.pipeline;
  const editable = can('settings:write');
  const set = (patch: Partial<Settings['pipeline']>) => setData({ ...data, pipeline: { ...p, ...patch } });

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    try {
      const r = await api<{ pipeline: Settings['pipeline'] }>('settings', { method: 'PUT', body: p });
      setData({ ...data!, pipeline: r.pipeline });
      setMsg('Settings saved. New jobs use them immediately.');
    } catch (e2) {
      setErr(errorMessage(e2));
    }
  }

  const num = (label: string, value: number, onChange: (n: number) => void, hint: string, attrs: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <label className="field">
      <span>{label}</span>
      <input className="input" type="number" disabled={!editable} value={value} onChange={(e) => onChange(Number(e.target.value))} {...attrs} />
      <small>{hint}</small>
    </label>
  );

  return (
    <>
      <div className="card">
        <h2 style={{ marginBottom: 10 }}>AI provider</h2>
        {data.ai.mockAi ? (
          <div className="alert alert-warn">
            <strong>MOCK_AI is on.</strong> Questions are generated locally for testing — no AI provider is called and nothing is spent. Set
            MOCK_AI=false and AI_API_KEY in the API’s environment to generate real questions.
          </div>
        ) : null}
        <dl className="meta-grid">
          <dt>Provider</dt>
          <dd>{data.ai.provider}</dd>
          <dt>Generation model</dt>
          <dd>{data.ai.generationModel}</dd>
          <dt>Review model</dt>
          <dd>{data.ai.reviewModel}</dd>
          <dt>Effort</dt>
          <dd>{data.ai.effort}</dd>
          <dt>API key</dt>
          <dd>{data.ai.apiKeyConfigured ? 'configured on the server (never shown)' : 'not set'}</dd>
          <dt>Worker</dt>
          <dd>{data.worker.enabled ? `running in the API, ${data.worker.concurrency} batch(es) at a time` : 'separate worker process'}</dd>
        </dl>
        <p className="small muted" style={{ marginBottom: 0 }}>
          Models and keys are set in the API’s environment variables so they never reach a browser.
        </p>
      </div>

      <form className="card" onSubmit={save}>
        <h2 style={{ marginBottom: 10 }}>Pipeline & cost controls</h2>
        <OkAlert message={msg} />
        <ErrorAlert error={err} />
        <div className="form-grid">
          {num('Batch size', p.batchSize, (n) => set({ batchSize: n }), 'Questions per AI request (1–50). 20 is a good balance.', { min: 1, max: 50 })}
          {num('Maximum retries per batch', p.maxRetries, (n) => set({ maxRetries: n }), 'After this, the batch is FAILED (0–5). Never retried forever.', { min: 0, max: 5 })}
          {num('Generation timeout (seconds)', Math.round(p.generationTimeoutMs / 1000), (n) => set({ generationTimeoutMs: n * 1000 }), 'Per AI request.', { min: 10, max: 1800 })}
          {num('Review timeout (seconds)', Math.round(p.reviewTimeoutMs / 1000), (n) => set({ reviewTimeoutMs: n * 1000 }), 'Per AI review request.', { min: 10, max: 1800 })}
          {num('Max questions per job', p.maxQuestionsPerJob, (n) => set({ maxQuestionsPerJob: n }), 'Bigger requests are refused.', { min: 1, max: 10000 })}
          {num('Review batch size', p.reviewBatchSize, (n) => set({ reviewBatchSize: n }), 'Questions per AI review request.', { min: 1, max: 25 })}
          <label className="field">
            <span>Monthly AI budget (USD)</span>
            <input
              className="input"
              type="number"
              min={0}
              step="1"
              disabled={!editable}
              placeholder="No cap"
              value={p.monthlyBudgetUsd ?? ''}
              onChange={(e) => set({ monthlyBudgetUsd: e.target.value ? Number(e.target.value) : null })}
            />
            <small>Jobs that would exceed it are refused, and running jobs stop.</small>
          </label>
          {num(
            'Minimum AI reviewer confidence for approval',
            p.minReviewConfidence,
            (n) => set({ minReviewConfidence: n }),
            'Below this, questions wait in NEEDS_REVIEW.',
            { min: 0, max: 1, step: 0.05 }
          )}
        </div>
        <label className="check">
          <input type="checkbox" disabled={!editable} checked={p.autoApprove} onChange={(e) => set({ autoApprove: e.target.checked })} />
          Let the AI reviewer mark clean questions APPROVED (they still need an admin to publish). Turn off to review every question by hand.
        </label>
        {editable && <button className="btn btn-primary">Save settings</button>}
      </form>
    </>
  );
}

interface AdminRow {
  id: string;
  email: string;
  name: string;
  role: string;
  status: string;
  lastLoginAt: string | null;
}

function Admins() {
  const me = useMe();
  const { data, error, reload } = useApi<{ items: AdminRow[]; roles: { key: string; name: string }[] }>('admins');
  const [form, setForm] = useState({ email: '', name: '', role: 'reviewer', password: '' });
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    try {
      await api('admins', { method: 'POST', body: form });
      setMsg(`Account for ${form.email} created. Share the password privately; they can change it here.`);
      setForm({ email: '', name: '', role: 'reviewer', password: '' });
      await reload();
    } catch (e2) {
      setErr(errorMessage(e2));
    }
  }
  async function update(a: AdminRow, patch: Record<string, string>) {
    setErr(null);
    try {
      await api(`admins/${a.id}`, { method: 'PUT', body: patch });
      await reload();
    } catch (e) {
      setErr(errorMessage(e));
    }
  }

  return (
    <div className="card">
      <h2 style={{ marginBottom: 10 }}>Console accounts</h2>
      <p className="small muted" style={{ marginTop: 0 }}>
        Super Admin: everything. Admin: everything except accounts. Reviewer: inspect, edit, approve and reject — cannot publish or spend AI budget.
      </p>
      <OkAlert message={msg} />
      <ErrorAlert error={err ?? error} />
      <div className="table-wrap">
        <table>
          <tbody>
            {data?.items.map((a) => (
              <tr key={a.id}>
                <td>
                  <strong>{a.name}</strong>
                  <div className="small muted">{a.email}</div>
                </td>
                <td>
                  <select
                    className="input"
                    style={{ height: 30 }}
                    aria-label={`Role for ${a.email}`}
                    disabled={a.id === me.id}
                    value={a.role}
                    onChange={(e) => update(a, { role: e.target.value })}
                  >
                    {data.roles.map((r) => (
                      <option key={r.key} value={r.key}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                </td>
                <td>
                  <StatusBadge status={a.status === 'archived' ? 'disabled' : a.status} />
                </td>
                <td className="small muted">last login {relTime(a.lastLoginAt)}</td>
                <td style={{ textAlign: 'right' }}>
                  {a.id !== me.id && (
                    <button className="btn btn-sm" onClick={() => update(a, { status: a.status === 'active' ? 'archived' : 'active' })}>
                      {a.status === 'active' ? 'Disable' : 'Enable'}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <form onSubmit={create} style={{ marginTop: 16 }}>
        <h3 style={{ marginBottom: 8 }}>Add an account</h3>
        <div className="form-grid">
          <label className="field">
            <span>Email</span>
            <input className="input" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </label>
          <label className="field">
            <span>Name</span>
            <input className="input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </label>
          <label className="field">
            <span>Role</span>
            <select className="input" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              {data?.roles.map((r) => (
                <option key={r.key} value={r.key}>
                  {r.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Temporary password</span>
            <input className="input" type="password" autoComplete="new-password" required minLength={12} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
            <small>At least 12 characters with a letter and a number.</small>
          </label>
        </div>
        <button className="btn btn-primary">Create account</button>
      </form>
    </div>
  );
}

function Password() {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  async function save(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    try {
      await api('auth/password', { method: 'POST', body: { currentPassword: current, newPassword: next } });
      setMsg('Password changed. Signing you out everywhere…');
      // All sessions were revoked; a full reload lands on the sign-in page.
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      setTimeout(() => (window.location.href = '/login'), 1500);
    } catch (e2) {
      setErr(errorMessage(e2));
    }
  }
  return (
    <form className="card" onSubmit={save}>
      <h2 style={{ marginBottom: 10 }}>Change my password</h2>
      <OkAlert message={msg} />
      <ErrorAlert error={err} />
      <div className="form-grid">
        <label className="field">
          <span>Current password</span>
          <input className="input" type="password" autoComplete="current-password" required value={current} onChange={(e) => setCurrent(e.target.value)} />
        </label>
        <label className="field">
          <span>New password</span>
          <input className="input" type="password" autoComplete="new-password" required minLength={12} value={next} onChange={(e) => setNext(e.target.value)} />
        </label>
      </div>
      <button className="btn">Change password</button>
    </form>
  );
}
