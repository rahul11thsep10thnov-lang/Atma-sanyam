'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { api, errorMessage } from '@/lib/api';
import { LANGS, LANG_NAMES, type DaduContentItem, type Lang } from '@/lib/dadu';
import { ErrorAlert, Forbidden, PageHead } from '@/components/ui';
import { useCan } from '@/components/ConsoleShell';

type Page = { items: DaduContentItem[]; total: number; page: number; pageSize: number };

export default function TranslationsPage() {
  const can = useCan();
  const [items, setItems] = useState<DaduContentItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [missing, setMissing] = useState<Lang | ''>('');
  const [kind, setKind] = useState<'lesson' | 'story' | 'assignment'>('lesson');
  const allowed = can('dadu:content:read');

  useEffect(() => {
    if (!allowed) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const all: DaduContentItem[] = [];
        let page = 1;
        for (;;) {
          const p = await api<Page>('dadu/content', { query: { kind, status: 'published', page, pageSize: 100 } });
          all.push(...p.items);
          if (p.items.length < p.pageSize || all.length >= p.total || page >= 50) break;
          page += 1;
        }
        if (!cancelled) { setItems(all); setError(null); }
      } catch (e) {
        if (!cancelled) setError(errorMessage(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [allowed, kind]);

  if (!allowed) return <Forbidden />;
  const rows = missing ? items.filter((i) => !i.languages.includes(missing)) : items;
  const totals = Object.fromEntries(LANGS.map((l) => [l, items.filter((i) => i.languages.includes(l)).length]));

  return (
    <div>
      <PageHead title="Translations" subtitle="Published items × fourteen languages. A tick means the item's languages field lists that language (set after proofreading)." />
      <div className="filters">
        <select className="input" value={kind} onChange={(e) => setKind(e.target.value as typeof kind)} aria-label="Kind">
          <option value="lesson">Lessons</option>
          <option value="story">Stories</option>
          <option value="assignment">Assignments</option>
        </select>
        <select className="input" value={missing} onChange={(e) => setMissing(e.target.value as Lang | '')} aria-label="Missing language">
          <option value="">Show all</option>
          {LANGS.map((l) => <option key={l} value={l}>Missing {LANG_NAMES[l]}</option>)}
        </select>
        <span className="small muted">{rows.length} of {items.length} published {kind}s</span>
      </div>
      <ErrorAlert error={error} />
      <section className={`card ${loading ? 'loading-dim' : ''}`}>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Item</th>
                {LANGS.map((l) => <th key={l} title={LANG_NAMES[l]} style={{ textAlign: 'center' }}>{l}</th>)}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="small muted">coverage</td>
                {LANGS.map((l) => <td key={l} className="small muted" style={{ textAlign: 'center' }}>{items.length ? Math.round((totals[l] / items.length) * 100) : 0}%</td>)}
              </tr>
              {rows.length === 0 && <tr><td colSpan={LANGS.length + 1} className="empty">{loading ? 'Loading…' : 'Nothing to show.'}</td></tr>}
              {rows.map((i) => (
                <tr key={i.id}>
                  <td><Link className="mono small" href={`/dadu/content/${encodeURIComponent(i.id)}`}>{i.id}</Link></td>
                  {LANGS.map((l) => (
                    <td key={l} style={{ textAlign: 'center' }}>
                      {i.languages.includes(l) ? <span className="badge badge-good" aria-label={`${LANG_NAMES[l]} done`} /> : <span className="muted" aria-label={`${LANG_NAMES[l]} missing`}>·</span>}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
