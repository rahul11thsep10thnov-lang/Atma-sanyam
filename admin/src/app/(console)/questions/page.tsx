'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { useCan } from '@/components/ConsoleShell';
import { ScopePicker } from '@/components/ScopePicker';
import { DifficultyBadge, ErrorAlert, OkAlert, PageHead, Pager, StatusBadge } from '@/components/ui';
import { api, errorMessage, useApi } from '@/lib/api';
import { relTime } from '@/lib/format';
import type { Paged, QuestionRow } from '@/lib/types';
import { languageName, useLanguages, useTaxonomy } from '@/lib/useTaxonomy';

const STATUSES = ['draft', 'needs_review', 'approved', 'published', 'rejected', 'validating', 'archived'];
const FILTER_KEYS = ['examId', 'subjectId', 'chapterId', 'topicId', 'difficulty', 'language', 'status', 'source', 'duplicates', 'q', 'jobId', 'page'] as const;

export default function QuestionsPage() {
  return (
    <Suspense>
      <QuestionBank />
    </Suspense>
  );
}

function QuestionBank() {
  const can = useCan();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const { tree } = useTaxonomy();
  const languages = useLanguages();
  const f = Object.fromEntries(FILTER_KEYS.map((k) => [k, params.get(k) ?? ''])) as Record<(typeof FILTER_KEYS)[number], string>;
  const page = Number(f.page) || 1;
  const [search, setSearch] = useState(f.q);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const query = { ...f, page, pageSize: 50 };
  const { data, error, loading, reload } = useApi<Paged<QuestionRow>>('questions', query);

  function setFilters(patch: Partial<Record<(typeof FILTER_KEYS)[number], string>>) {
    const next = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    if (!('page' in patch)) next.delete('page');
    setSelected(new Set());
    router.replace(`${pathname}?${next.toString()}`);
  }

  async function bulk(action: string) {
    if (!selected.size) return;
    const notes = action === 'reject' ? window.prompt('Reason for rejecting (optional):') ?? undefined : undefined;
    if (action === 'archive' && !window.confirm(`Archive ${selected.size} question(s)?`)) return;
    setErr(null);
    try {
      const r = await api<{ succeeded: number; failed: number; results: { ok: boolean; error?: string }[] }>('questions/bulk', {
        method: 'POST',
        body: { ids: [...selected], action, notes },
      });
      const firstError = r.results.find((x) => !x.ok)?.error;
      setMsg(`${action}: ${r.succeeded} done${r.failed ? `, ${r.failed} skipped (${firstError})` : ''}.`);
      setSelected(new Set());
      await reload();
    } catch (e) {
      setErr(errorMessage(e));
    }
  }

  const items = data?.items ?? [];
  const allSelected = items.length > 0 && items.every((q) => selected.has(q.id));

  return (
    <>
      <PageHead
        title="Question Bank"
        subtitle={data ? `${data.total.toLocaleString()} questions match` : 'Search and manage every question.'}
        actions={
          can('questions:write') && (
            <Link className="btn btn-primary" href="/questions/new">
              Add question
            </Link>
          )
        }
      />
      <div className="card">
        <form
          className="filters"
          onSubmit={(e) => {
            e.preventDefault();
            setFilters({ q: search.trim() });
          }}
        >
          <input className="input" type="search" placeholder="Search question text…" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search" />
          <ScopePicker
            tree={tree}
            labels={false}
            required="none"
            value={{ examId: f.examId, subjectId: f.subjectId, chapterId: f.chapterId, topicId: f.topicId }}
            onChange={(s) => setFilters(s)}
          />
          <select className="input" aria-label="Difficulty" value={f.difficulty} onChange={(e) => setFilters({ difficulty: e.target.value })}>
            <option value="">Any difficulty</option>
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
          <select className="input" aria-label="Language" value={f.language} onChange={(e) => setFilters({ language: e.target.value })}>
            <option value="">Any language</option>
            {languages.map((l) => (
              <option key={l.code} value={l.code}>
                {l.name}
              </option>
            ))}
          </select>
          <select className="input" aria-label="Status" value={f.status} onChange={(e) => setFilters({ status: e.target.value })}>
            <option value="">Any status</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s.toUpperCase()}
              </option>
            ))}
          </select>
          <select className="input" aria-label="Source" value={f.source} onChange={(e) => setFilters({ source: e.target.value })}>
            <option value="">Any source</option>
            <option value="ai">AI generated</option>
            <option value="import">Imported</option>
            <option value="manual">Manual</option>
            <option value="pyq">PYQ</option>
            <option value="figure">Figure (non-verbal)</option>
          </select>
          <label className="check" style={{ margin: 0 }}>
            <input type="checkbox" checked={f.duplicates === 'true'} onChange={(e) => setFilters({ duplicates: e.target.checked ? 'true' : '' })} />
            Possible duplicates
          </label>
          {f.jobId && (
            <button type="button" className="btn btn-sm" onClick={() => setFilters({ jobId: '' })}>
              Job filter ✕
            </button>
          )}
        </form>

        <OkAlert message={msg} />
        <ErrorAlert error={err ?? error} />

        {selected.size > 0 && (
          <div className="alert alert-warn row" style={{ justifyContent: 'space-between' }}>
            <strong>{selected.size} selected</strong>
            <div className="row">
              {can('questions:review') && (
                <>
                  <button className="btn btn-sm btn-good" onClick={() => bulk('approve')}>
                    Approve
                  </button>
                  <button className="btn btn-sm btn-danger" onClick={() => bulk('reject')}>
                    Reject
                  </button>
                </>
              )}
              {can('questions:publish') && (
                <>
                  <button className="btn btn-sm btn-primary" onClick={() => bulk('publish')}>
                    Publish
                  </button>
                  <button className="btn btn-sm" onClick={() => bulk('unpublish')}>
                    Unpublish
                  </button>
                </>
              )}
              {can('questions:write') && (
                <button className="btn btn-sm" onClick={() => bulk('archive')}>
                  Archive
                </button>
              )}
            </div>
          </div>
        )}

        <div className={`table-wrap ${loading ? 'loading-dim' : ''}`}>
          <table>
            <thead>
              <tr>
                <th style={{ width: 32 }}>
                  <input
                    type="checkbox"
                    aria-label="Select all on this page"
                    checked={allSelected}
                    onChange={(e) => setSelected(e.target.checked ? new Set(items.map((q) => q.id)) : new Set())}
                  />
                </th>
                <th>Question</th>
                <th>Status</th>
                <th>Difficulty</th>
                <th>Language</th>
                <th>Chapter</th>
                <th>Checks</th>
                <th>Added</th>
              </tr>
            </thead>
            <tbody>
              {items.map((q) => {
                const errors = q.validationIssues.filter((i) => i.severity === 'error').length;
                const warnings = q.validationIssues.length - errors;
                return (
                  <tr key={q.id}>
                    <td>
                      <input
                        type="checkbox"
                        aria-label="Select question"
                        checked={selected.has(q.id)}
                        onChange={(e) => {
                          const next = new Set(selected);
                          if (e.target.checked) next.add(q.id);
                          else next.delete(q.id);
                          setSelected(next);
                        }}
                      />
                    </td>
                    <td style={{ maxWidth: 440 }}>
                      <Link href={`/questions/${q.id}`} className="clip-2" style={{ color: 'var(--text)' }}>
                        {q.questionText}
                      </Link>
                      <div className="small muted">
                        {q.examName} · {q.subjectName} · {q.source}
                      </div>
                    </td>
                    <td>
                      <StatusBadge status={q.status} />
                    </td>
                    <td>
                      <DifficultyBadge difficulty={q.difficulty} />
                    </td>
                    <td className="small">{languageName(q.language)}</td>
                    <td className="small">
                      {q.chapterName}
                      {q.topicName ? ` › ${q.topicName}` : ''}
                    </td>
                    <td className="small">
                      {q.duplicateOfId && <span className="badge badge-warn">POSSIBLE DUPLICATE</span>}{' '}
                      {errors > 0 && <span className="badge badge-danger">{errors} error{errors > 1 ? 's' : ''}</span>}{' '}
                      {warnings > 0 && !q.duplicateOfId && <span className="badge badge-warn">{warnings} warning{warnings > 1 ? 's' : ''}</span>}
                      {q.validationIssues.length === 0 && <span className="muted">✓ passed</span>}
                    </td>
                    <td className="small muted">{relTime(q.createdAt)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {data && items.length === 0 && <div className="empty">No questions match these filters.</div>}
        </div>
        {data && <Pager page={page} pageSize={data.pageSize} total={data.total} onPage={(p) => setFilters({ page: String(p) })} />}
      </div>
    </>
  );
}
