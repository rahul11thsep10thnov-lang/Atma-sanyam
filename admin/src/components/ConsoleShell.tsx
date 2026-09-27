'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { createContext, useContext, useEffect, useState } from 'react';
import {
  BarChart3,
  BookOpenCheck,
  ClipboardCheck,
  FileUp,
  FolderTree,
  LayoutDashboard,
  Library,
  ListChecks,
  ScrollText,
  Settings,
  Sparkles,
  Users,
  type LucideIcon,
} from 'lucide-react';
import type { AdminMe } from '@/lib/server';
import { api } from '@/lib/api';
import { Brand } from './Brand';

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

type NavItem = { href: string; label: string; icon: LucideIcon; permission?: string; badge?: 'review' };
const NAV: { group: string; items: NavItem[] }[] = [
  { group: 'Overview', items: [{ href: '/', label: 'Dashboard', icon: LayoutDashboard, permission: 'dashboard:read' }] },
  {
    group: 'Content',
    items: [
      { href: '/exams', label: 'Exams, Subjects & Chapters', icon: FolderTree, permission: 'questions:read' },
      { href: '/questions', label: 'Question Bank', icon: Library, permission: 'questions:read' },
      { href: '/generate', label: 'Generate Questions', icon: Sparkles, permission: 'questions:read' },
      { href: '/review', label: 'Review Questions', icon: ClipboardCheck, permission: 'questions:review', badge: 'review' },
      { href: '/import', label: 'Import', icon: FileUp, permission: 'questions:write' },
      { href: '/sources', label: 'Source Material', icon: BookOpenCheck, permission: 'questions:read' },
    ],
  },
  { group: 'Tests', items: [{ href: '/mock-tests', label: 'Mock Tests', icon: ListChecks, permission: 'questions:read' }] },
  {
    group: 'Insights',
    items: [
      { href: '/users', label: 'Users', icon: Users, permission: 'users:read' },
      { href: '/analytics', label: 'Analytics', icon: BarChart3, permission: 'analytics:read' },
    ],
  },
  {
    group: 'System',
    items: [
      { href: '/settings', label: 'Settings', icon: Settings, permission: 'dashboard:read' },
      { href: '/audit', label: 'Audit log', icon: ScrollText, permission: 'audit:read' },
    ],
  },
];

export function ConsoleShell({ me, children }: { me: AdminMe; children: React.ReactNode }) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [pending, setPending] = useState<number | null>(null);
  const [lastPath, setLastPath] = useState(pathname);

  // Close the mobile menu on navigation.
  if (lastPath !== pathname) {
    setLastPath(pathname);
    setMenuOpen(false);
  }

  useEffect(() => {
    if (!me.permissions.includes('dashboard:read')) return;
    let alive = true;
    const load = () =>
      api<{ questions: { pendingReview: number } }>('dashboard')
        .then((d) => alive && setPending(d.questions.pendingReview))
        .catch(() => undefined);
    void load();
    const t = setInterval(load, 60_000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [me.permissions, pathname]);

  const isActive = (href: string) => (href === '/' ? pathname === '/' : pathname.startsWith(href));

  async function signOut() {
    setSigningOut(true);
    await fetch('/api/auth/logout', { method: 'POST' }).catch(() => undefined);
    // Full reload so no client state from the old session survives.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.href = '/login';
  }

  return (
    <MeContext.Provider value={me}>
      <div className="shell" data-menu={menuOpen ? 'open' : 'closed'}>
        <aside className="sidebar" aria-label="Main navigation">
          <Brand />
          <nav className="nav">
            {NAV.map((g) => {
              const items = g.items.filter((n) => !n.permission || me.permissions.includes(n.permission));
              if (!items.length) return null;
              return (
                <div key={g.group}>
                  <div className="nav-group">{g.group}</div>
                  {items.map((n) => (
                    <Link key={n.href} href={n.href} aria-current={isActive(n.href) ? 'page' : undefined}>
                      <n.icon size={16} aria-hidden />
                      {n.label}
                      {n.badge === 'review' && pending ? (
                        <span className="count" aria-label={`${pending} waiting`}>
                          {pending > 999 ? '999+' : pending}
                        </span>
                      ) : null}
                    </Link>
                  ))}
                </div>
              );
            })}
          </nav>
          <div className="sidebar-foot">
            <div className="who">
              <strong>{me.name}</strong>
              {me.email}
              <div className="small muted">{me.roleName}</div>
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
            <strong>
              Police<span style={{ color: 'var(--brand)' }}>Exams</span>
            </strong>
            <span className="small muted">{me.roleName}</span>
          </header>
          <main className="main" onClick={() => menuOpen && setMenuOpen(false)}>
            {children}
          </main>
        </div>
      </div>
    </MeContext.Provider>
  );
}
