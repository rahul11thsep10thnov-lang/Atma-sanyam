'use client';

import { useSearchParams } from 'next/navigation';
import { useState } from 'react';

export function LoginForm() {
  const params = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(params.get('expired') ? 'Your session expired. Please sign in again.' : null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error?.message ?? 'Sign-in failed');
        return;
      }
      // Only allow same-site relative redirects after login.
      const next = params.get('next');
      window.location.href = next && next.startsWith('/') && !next.startsWith('//') ? next : '/';
    } catch {
      setError('Network error. Check your connection and try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="card login-card" onSubmit={submit}>
      <div className="brand">
        <img src="/icon.png" alt="" />
        <div>
          FOCUS
          <small>Admin console</small>
        </div>
      </div>
      <h1 style={{ textAlign: 'center', fontSize: 18, marginBottom: 16 }}>Sign in</h1>
      {error && (
        <div className="alert alert-error" role="alert">
          {error}
        </div>
      )}
      <label className="field">
        <span>Email</span>
        <input className="input" type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} />
      </label>
      <label className="field">
        <span>Password</span>
        <input
          className="input"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </label>
      <button className="btn btn-primary" style={{ width: '100%' }} disabled={busy}>
        {busy ? 'Signing in…' : 'Sign in'}
      </button>
      <p className="small muted" style={{ textAlign: 'center', marginBottom: 0 }}>
        Accounts are created by a Super Admin.
      </p>
    </form>
  );
}
