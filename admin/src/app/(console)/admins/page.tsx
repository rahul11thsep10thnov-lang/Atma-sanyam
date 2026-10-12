'use client';

import { useState } from 'react';
import { api, errorMessage, useApi } from '@/lib/api';
import { relTime } from '@/lib/format';
import { ConfirmButton, ErrorAlert, Forbidden, OkAlert, PageHead, StatusBadge } from '@/components/ui';
import { useCan, useMe } from '@/components/ConsoleShell';

interface Admin {
  id: string;
  email: string;
  name: string;
  roleKey: string;
  status: string;
  lastLoginAt: string | null;
  lockedUntil: string | null;
  createdAt: string;
}
interface Role { key: string; name: string; description: string; permissions: string[] }

const PASSWORD_HINT = 'At least 12 characters with upper- and lower-case letters and a number.';

export default function AdminsPage() {
  const can = useCan();
  const me = useMe();
  const { data: admins, error, reload } = useApi<Admin[]>(can('admins:read') ? 'admins' : null);
  const { data: roles } = useApi<Role[]>(can('admins:read') ? 'roles' : null);
  const [form, setForm] = useState({ email: '', name: '', roleKey: 'editor', password: '' });
  const [actionError, setActionError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  if (!can('admins:read')) return <Forbidden />;
  const canWrite = can('admins:write');
  const roleName = (k: string) => roles?.find((r) => r.key === k)?.name ?? k;
  const allPerms = [...new Set((roles ?? []).flatMap((r) => r.permissions))].sort();

  async function run(fn: () => Promise<unknown>, message: string) {
    setActionError(null);
    setOk(null);
    try {
      await fn();
      setOk(message);
      await reload();
    } catch (e) {
      setActionError(errorMessage(e));
    }
  }

  function resetPassword(a: Admin) {
    const password = window.prompt(`New temporary password for ${a.email}.\n${PASSWORD_HINT}`);
    if (!password) return;
    void run(() => api(`admins/${a.id}`, { method: 'PATCH', body: { password } }), `Password reset for ${a.email}. Share it securely; they should change it on first sign-in.`);
  }

  return (
    <div>
      <PageHead title="Admins & roles" subtitle="Who can access this console, and what each role can do." />
      <ErrorAlert error={error || actionError} />
      <OkAlert message={ok} />
      <section className="card">
        <h2 style={{ marginBottom: 12 }}>Admin accounts</h2>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Admin</th><th>Role</th><th>Status</th><th>Last sign-in</th><th /></tr></thead>
            <tbody>
              {admins?.map((a) => {
                const self = a.id === me.id;
                const locked = a.lockedUntil && new Date(a.lockedUntil) > new Date();
                return (
                  <tr key={a.id}>
                    <td>
                      <strong>{a.name}</strong> {self && <span className="badge badge-info">you</span>}
                      <div className="small muted">{a.email}</div>
                    </td>
                    <td>
                      {canWrite && !self ? (
                        <select
                          className="input"
                          style={{ width: 150, height: 32 }}
                          value={a.roleKey}
                          onChange={(e) => {
                            const roleKey = e.target.value;
                            if (window.confirm(`Change ${a.email} to ${roleName(roleKey)}? They will be signed out.`)) {
                              void run(() => api(`admins/${a.id}`, { method: 'PATCH', body: { roleKey } }), 'Role updated.');
                            }
                          }}
                          aria-label={`Role for ${a.email}`}
                        >
                          {roles?.map((r) => <option key={r.key} value={r.key}>{r.name}</option>)}
                        </select>
                      ) : (
                        roleName(a.roleKey)
                      )}
                    </td>
                    <td>
                      <StatusBadge status={a.status} /> {locked && <span className="badge badge-warn">locked</span>}
                    </td>
                    <td className="small muted">{relTime(a.lastLoginAt)}</td>
                    <td>
                      {canWrite && !self && (
                        <div className="row" style={{ justifyContent: 'flex-end', flexWrap: 'nowrap' }}>
                          {locked && <button className="btn btn-sm" onClick={() => run(() => api(`admins/${a.id}`, { method: 'PATCH', body: { unlock: true } }), 'Account unlocked.')}>Unlock</button>}
                          <button className="btn btn-sm" onClick={() => resetPassword(a)}>Reset password</button>
                          {a.status === 'active' ? (
                            <ConfirmButton label="Deactivate" confirm={`Deactivate ${a.email}? They’ll be signed out immediately.`} onConfirm={() => run(() => api(`admins/${a.id}`, { method: 'PATCH', body: { status: 'deactivated' } }), 'Admin deactivated.')} />
                          ) : (
                            <button className="btn btn-sm" onClick={() => run(() => api(`admins/${a.id}`, { method: 'PATCH', body: { status: 'active' } }), 'Admin re-activated.')}>Activate</button>
                          )}
                          <ConfirmButton label="Delete" confirm={`Delete admin ${a.email}? This cannot be undone.`} onConfirm={() => run(() => api(`admins/${a.id}`, { method: 'DELETE' }), 'Admin deleted.')} />
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <div className="grid grid-2" style={{ alignItems: 'start', marginTop: 16 }}>
        {canWrite && (
          <section className="card">
            <h2 style={{ marginBottom: 12 }}>Add admin</h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void run(() => api('admins', { method: 'POST', body: form }), `Admin ${form.email} created. Share the temporary password securely.`).then(() =>
                  setForm({ email: '', name: '', roleKey: 'editor', password: '' })
                );
              }}
            >
              <label className="field"><span>Name</span><input className="input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
              <label className="field"><span>Email</span><input className="input" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label>
              <label className="field">
                <span>Role</span>
                <select className="input" value={form.roleKey} onChange={(e) => setForm({ ...form, roleKey: e.target.value })}>
                  {roles?.map((r) => <option key={r.key} value={r.key}>{r.name}</option>)}
                </select>
              </label>
              <label className="field">
                <span>Temporary password</span>
                <input className="input" type="password" autoComplete="new-password" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
                <small>{PASSWORD_HINT}</small>
              </label>
              <button className="btn btn-primary">Create admin</button>
            </form>
          </section>
        )}
        <section className="card" style={canWrite ? undefined : { gridColumn: '1 / -1' }}>
          <h2 style={{ marginBottom: 4 }}>Role permissions</h2>
          <p className="small muted" style={{ marginTop: 0 }}>Enforced by the API on every request.</p>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Permission</th>
                  {roles?.map((r) => <th key={r.key} className="num">{r.name}</th>)}
                </tr>
              </thead>
              <tbody>
                {allPerms.map((p) => (
                  <tr key={p}>
                    <td className="mono">{p}</td>
                    {roles?.map((r) => (
                      <td key={r.key} className="num" aria-label={r.permissions.includes(p) ? 'allowed' : 'not allowed'}>
                        {r.permissions.includes(p) ? '✓' : <span className="muted">—</span>}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
