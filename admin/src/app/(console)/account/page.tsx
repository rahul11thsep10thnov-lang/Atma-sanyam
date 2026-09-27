'use client';

import { useState } from 'react';
import { api, errorMessage } from '@/lib/api';
import { ErrorAlert, OkAlert, PageHead } from '@/components/ui';
import { useMe } from '@/components/ConsoleShell';

export default function AccountPage() {
  const me = useMe();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setOk(null);
    if (next !== confirm) {
      setError('The new passwords don’t match.');
      return;
    }
    setBusy(true);
    try {
      await api('auth/change-password', { method: 'POST', body: { currentPassword: current, newPassword: next } });
      setOk('Password changed. Other sessions were signed out.');
      setCurrent('');
      setNext('');
      setConfirm('');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <PageHead title="My account" subtitle={`${me.email} · ${me.role.name}`} />
      <div className="grid grid-2" style={{ alignItems: 'start' }}>
        <form className="card" onSubmit={submit}>
          <h2 style={{ marginBottom: 12 }}>Change password</h2>
          <ErrorAlert error={error} />
          <OkAlert message={ok} />
          <label className="field"><span>Current password</span><input className="input" type="password" autoComplete="current-password" required value={current} onChange={(e) => setCurrent(e.target.value)} /></label>
          <label className="field">
            <span>New password</span>
            <input className="input" type="password" autoComplete="new-password" required minLength={12} value={next} onChange={(e) => setNext(e.target.value)} />
            <small>At least 12 characters with upper- and lower-case letters and a number.</small>
          </label>
          <label className="field"><span>Confirm new password</span><input className="input" type="password" autoComplete="new-password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} /></label>
          <button className="btn btn-primary" disabled={busy}>{busy ? 'Saving…' : 'Change password'}</button>
        </form>
        <section className="card">
          <h2 style={{ marginBottom: 12 }}>Your permissions</h2>
          <div className="row">{me.permissions.map((p) => <span key={p} className="badge mono">{p}</span>)}</div>
        </section>
      </div>
    </div>
  );
}
