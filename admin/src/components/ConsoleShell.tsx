'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { createContext, useContext, useEffect, useState } from 'react';
import type { AdminMe } from '@/lib/server';

const MeContext = createContext<AdminMe | null>(null);

export function useMe(): AdminMe {
  const me = useContext(MeContext);
  if (!me) throw new Error('useMe outside ConsoleShell');
  return me;
}

// UI gating only. The API enforces the same permissions on every request.
export function useCan() {
  const me = useMe();
  return (permission: string) => me.permissions.includes(permission);
}

const NAV: { href: string; label: string; permission?: string }[] = [
  { href: '/', label: 'Dashboard', permission: 'dashboard:read' },
  { href: '/users', label: 'Users', permission: 'users:read' },
  { href: '/content', label: 'Content', permission: 'content:read' },
  { href: '/categories', label: 'Categories', permission: 'content:read' },
  { href: '/config', label: 'App configuration', permission: 'settings:read' },
  { href: '/notifications', label: 'Notifications', permission: 'notifications:read' },
  { href: '/analytics', label: 'Analytics', permission: 'analytics:read' },
  { href: '/admins', label: 'Admins & roles', permission: 'admins:read' },
  { href: '/audit', label: 'Audit log', permission: 'audit:read' },
  { href: '/account', label: 'My account' },
];

export function ConsoleShell({ me, children }: { me: AdminMe; children: React.ReactNode }) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => setMenuOpen(false), [pathname]);

  const isActive = (href: string) => (href === '/' ? pathname === '/' : pathname.startsWith(href));

  async function signOut() {
    setSigningOut(true);
    await fetch('/api/auth/logout', { method: 'POST' }).catch(() => undefined);
    window.location.href = '/login';
  }

  return (
    <MeContext.Provider value={me}>
      <div className="shell" data-menu={menuOpen ? 'open' : 'closed'}>
        <aside className="sidebar" aria-label="Main navigation">
          <div className="brand">
            <img src="/icon.png" alt="" />
            <div>
              FOCUS
              <small>Admin console</small>
            </div>
          </div>
          <nav className="nav">
            {NAV.filter((n) => !n.permission || me.permissions.includes(n.permission)).map((n) => (
              <Link key={n.href} href={n.href} aria-current={isActive(n.href) ? 'page' : undefined}>
                {n.label}
              </Link>
            ))}
          </nav>
          <div className="sidebar-foot">
            <div className="who">
              <strong>{me.name}</strong>
              {me.email}
              <div className="small muted">{me.role.name}</div>
            </div>
            <button className="btn btn-sm" style={{ width: '100%' }} onClick={signOut} disabled={signingOut}>
              {signingOut ? 'Signing out…' : 'Sign out'}
            </button>
          </div>
        </aside>
        <div>
          <header className="topbar">
            <button className="btn btn-sm" onClick={() => setMenuOpen((o) => !o)} aria-expanded={menuOpen} aria-label="Menu">
              Menu
            </button>
            <strong style={{ letterSpacing: '0.08em' }}>FOCUS</strong>
            <span className="small muted">{me.role.name}</span>
          </header>
          <main className="main" onClick={() => menuOpen && setMenuOpen(false)}>
            {children}
          </main>
        </div>
      </div>
    </MeContext.Provider>
  );
}
