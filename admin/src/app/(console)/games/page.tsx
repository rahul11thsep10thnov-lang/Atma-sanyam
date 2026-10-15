'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useApi } from '@/lib/api';
import { ErrorAlert, Forbidden, PageHead, StatusBadge } from '@/components/ui';
import { useCan } from '@/components/ConsoleShell';

interface Game { id: string; name: string; tagline: string; categoryId: string | null; brackets: string[]; difficulties: { key: string; label: string }[]; status: string; estimatedMinutes: number; sortOrder: number; updatedAt: string }
interface Category { id: string; name: string }

export default function GamesPage() {
  const can = useCan();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [bracket, setBracket] = useState('');
  const { data, error, loading } = useApi<{ items: Game[]; categories: Category[] }>(can('content:read') ? 'games' : null, { search, status, bracket });
  if (!can('content:read')) return <Forbidden />;
  const cat = (id: string | null) => data?.categories.find((c) => c.id === id)?.name ?? '—';
  return (
    <div>
      <PageHead title="Games" subtitle="The catalogue children see. Rules and artwork ship with the app; here you control names, age brackets, difficulties and whether a game is live." actions={can('content:write') && <Link href="/games/new" className="btn btn-primary btn-sm">New game entry</Link>} />
      <div className="filters">
        <input className="input" type="search" placeholder="Search name or id" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search games" />
        <select className="input" value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Status"><option value="">All statuses</option><option value="published">Published</option><option value="in_development">In development</option><option value="draft">Draft</option><option value="archived">Archived</option></select>
        <select className="input" value={bracket} onChange={(e) => setBracket(e.target.value)} aria-label="Bracket"><option value="">All brackets</option><option value="A">A · 3–5</option><option value="B">B · 6–8</option><option value="C">C · 9–10</option><option value="D">D · 11–12</option></select>
      </div>
      <ErrorAlert error={error} />
      <section className={`card ${loading ? 'loading-dim' : ''}`}>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Game</th><th>Category</th><th>Brackets</th><th>Difficulties</th><th>Status</th><th className="num">Min</th></tr></thead>
            <tbody>
              {data?.items.map((g) => (
                <tr key={g.id}>
                  <td><Link href={`/games/${g.id}`}>{g.name}</Link><div className="small muted">{g.id} · {g.tagline}</div></td>
                  <td>{cat(g.categoryId)}</td>
                  <td>{g.brackets.join(' ')}</td>
                  <td className="small">{g.difficulties.map((d) => d.label).join(', ')}</td>
                  <td><StatusBadge status={g.status} /></td>
                  <td className="num">{g.estimatedMinutes}</td>
                </tr>
              ))}
              {data && data.items.length === 0 && <tr><td colSpan={6} className="empty">No games match.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
