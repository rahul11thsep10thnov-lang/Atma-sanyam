'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { api, errorMessage, useApi } from '@/lib/api';
import { relTime } from '@/lib/format';
import { categoryOptions, type Category } from '@/components/categories';
import type { ContentItem } from '@/components/ContentForm';
import { ConfirmButton, ErrorAlert, Forbidden, PageHead, Pager, StatusBadge } from '@/components/ui';
import { useCan } from '@/components/ConsoleShell';

export default function ContentPage() {
  const can = useCan();
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [status, setStatus] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [page, setPage] = useState(1);
  const [actionError, setActionError] = useState<string | null>(null);
  const { data: cats } = useApi<Category[]>(can('content:read') ? 'categories' : null);
  const options = useMemo(() => categoryOptions(cats ?? []), [cats]);
  const names = useMemo(() => new Map(options.map((o) => [o.id, o.label])), [options]);

  useEffect(() => {
    const t = setTimeout(() => { setDebounced(search); setPage(1); }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const { data, error, loading, reload } = useApi<{ items: ContentItem[]; total: number; page: number; pageSize: number }>(
    can('content:read') ? 'content' : null,
    { search: debounced, status, categoryId, page, pageSize: 20 }
  );
  if (!can('content:read')) return <Forbidden />;

  async function toggle(item: ContentItem) {
    setActionError(null);
    try {
      await api(`content/${item.id}`, { method: 'PATCH', body: { status: item.status === 'published' ? 'draft' : 'published' } });
      await reload();
    } catch (e) {
      setActionError(errorMessage(e));
    }
  }

  async function remove(item: ContentItem) {
    setActionError(null);
    try {
      await api(`content/${item.id}`, { method: 'DELETE' });
      await reload();
    } catch (e) {
      setActionError(errorMessage(e));
    }
  }

  return (
    <div>
      <PageHead
        title="Content"
        subtitle="Puzzle images served to the app’s library."
        actions={can('content:write') && <Link className="btn btn-primary" href="/content/new">Add image</Link>}
      />
      <div className="filters">
        <input className="input" type="search" placeholder="Search title, tags, category" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search content" />
        <select className="input" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} aria-label="Status">
          <option value="">All statuses</option>
          <option value="published">Published</option>
          <option value="draft">Draft</option>
        </select>
        <select className="input" value={categoryId} onChange={(e) => { setCategoryId(e.target.value); setPage(1); }} aria-label="Category">
          <option value="">All categories</option>
          {options.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
        </select>
      </div>
      <ErrorAlert error={error || actionError} />
      <section className={`card ${loading ? 'loading-dim' : ''}`}>
        {data && data.items.length === 0 ? (
          <div className="empty">No content yet. {can('content:write') && <Link href="/content/new">Add the first image</Link>}</div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th />
                  <th>Title</th>
                  <th>Category</th>
                  <th>Status</th>
                  <th className="num">Picks</th>
                  <th>Updated</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {data?.items.map((c) => (
                  <tr key={c.id}>
                    <td><img className="thumb" src={c.thumbnailUrl} alt="" loading="lazy" referrerPolicy="no-referrer" /></td>
                    <td>
                      <Link href={`/content/${c.id}`}>{c.title}</Link>
                      <div className="small muted">{c.license}</div>
                    </td>
                    <td className="small">{names.get(c.subcategoryId ?? '') ?? names.get(c.categoryId ?? '') ?? '—'}</td>
                    <td><StatusBadge status={c.status} /></td>
                    <td className="num">{c.popularity}</td>
                    <td className="small muted">{relTime(c.updatedAt)}</td>
                    <td>
                      <div className="row" style={{ justifyContent: 'flex-end', flexWrap: 'nowrap' }}>
                        {can('content:publish') && (
                          <button className="btn btn-sm" onClick={() => toggle(c)}>{c.status === 'published' ? 'Unpublish' : 'Publish'}</button>
                        )}
                        {can('content:delete') && (
                          <ConfirmButton label="Delete" confirm={`Delete “${c.title}”? It will disappear from the app.`} onConfirm={() => remove(c)} />
                        )}
                      </div>
                    </td>
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
