'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useApi } from '@/lib/api';
import { relTime } from '@/lib/format';
import { KINDS, LANGS, LANG_NAMES, SECTIONS, SECTION_BY_KEY, WORKFLOW, statusLabel, type DaduContentItem } from '@/lib/dadu';
import { ErrorAlert, Forbidden, PageHead, Pager } from '@/components/ui';
import { useCan } from '@/components/ConsoleShell';

const TONE: Record<string, string> = { draft: 'badge-warn', approved: 'badge-info', published: 'badge-good' };

export function DaduStatusBadge({ status }: { status: string }) {
  return <span className={`badge ${TONE[status] ?? ''}`}>{statusLabel(status)}</span>;
}

export default function DaduContentListPage() {
  const can = useCan();
  const params = useSearchParams();
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [kind, setKind] = useState(params.get('kind') ?? '');
  const [section, setSection] = useState(params.get('section') ?? '');
  const [status, setStatus] = useState(params.get('status') ?? '');
  const [language, setLanguage] = useState(params.get('language') ?? '');
  const [page, setPage] = useState(1);

  useEffect(() => {
    const t = setTimeout(() => { setDebounced(search); setPage(1); }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const { data, error, loading } = useApi<{ items: DaduContentItem[]; total: number; page: number; pageSize: number }>(
    can('dadu:content:read') ? 'dadu/content' : null,
    { q: debounced, kind, section, status, language, page, pageSize: 25 }
  );
  if (!can('dadu:content:read')) return <Forbidden />;

  const pick = (set: (v: string) => void) => (e: React.ChangeEvent<HTMLSelectElement>) => { set(e.target.value); setPage(1); };

  return (
    <div>
      <PageHead title="DADU content" subtitle="Every learning item with its workflow status." actions={can('dadu:content:write') && <Link className="btn btn-primary" href="/dadu/content/new">New item</Link>} />
      <div className="filters">
        <input className="input" type="search" placeholder="Search id, subject, topic, title" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search" />
        <select className="input" value={kind} onChange={pick(setKind)} aria-label="Kind">
          <option value="">All kinds</option>
          {KINDS.map((k) => <option key={k} value={k}>{k}</option>)}
        </select>
        <select className="input" value={section} onChange={pick(setSection)} aria-label="Section">
          <option value="">All sections</option>
          {SECTIONS.map((s) => <option key={s.key} value={s.key}>{s.name}</option>)}
        </select>
        <select className="input" value={status} onChange={pick(setStatus)} aria-label="Status">
          <option value="">All statuses</option>
          {WORKFLOW.map((w) => <option key={w.key} value={w.key}>{w.label}</option>)}
        </select>
        <select className="input" value={language} onChange={pick(setLanguage)} aria-label="Language">
          <option value="">Any language</option>
          {LANGS.map((l) => <option key={l} value={l}>{LANG_NAMES[l]}</option>)}
        </select>
      </div>
      <ErrorAlert error={error} />
      <section className={`card ${loading ? 'loading-dim' : ''}`}>
        {data && data.items.length === 0 ? (
          <div className="empty">No items match. {can('dadu:content:write') && <Link href="/dadu/content/new">Create one</Link>}</div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>ID</th><th>Kind</th><th>Section</th><th>Bands</th><th>Languages</th><th>Status</th><th className="num">Ver.</th><th>Updated</th></tr>
              </thead>
              <tbody>
                {data?.items.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <Link className="mono" href={`/dadu/content/${encodeURIComponent(c.id)}`}>{c.id}</Link>
                      <div className="small muted">{c.subject} · {c.topic}</div>
                    </td>
                    <td className="small">{c.kind}</td>
                    <td className="small"><span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 4, background: SECTION_BY_KEY[c.section]?.colour ?? '#999', marginRight: 6 }} />{SECTION_BY_KEY[c.section]?.name ?? c.section}</td>
                    <td className="small">{c.bands.join(' ')}</td>
                    <td className="small">{c.languages.length}/14</td>
                    <td><DaduStatusBadge status={c.status} /></td>
                    <td className="num">{c.version}</td>
                    <td className="small muted">{relTime(c.updatedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {data && <Pager page={data.page} pageSize={data.pageSize} total={data.total} onPage={setPage} />}
      </section>
    </div>
  );
}
