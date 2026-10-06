'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState, type ReactNode } from 'react';
import { useCan } from '@/components/ConsoleShell';
import { ScopePicker } from '@/components/ScopePicker';
import { DifficultyBadge, ErrorAlert, OkAlert, PageHead, Pager, StatusBadge } from '@/components/ui';
import { api, errorMessage, useApi } from '@/lib/api';
import { relTime } from '@/lib/format';
import type { Paged, QuestionFacets, QuestionRow } from '@/lib/types';
import { languageName, useLanguages, useTaxonomy } from '@/lib/useTaxonomy';

const STATUSES = ['draft', 'needs_review', 'approved', 'published', 'rejected', 'validating', 'archived'];
const FILTER_KEYS = [
  'examId', 'subjectId', 'chapterId', 'topicId', 'difficulty', 'language', 'status', 'source', 'duplicates', 'q', 'jobId', 'page',
  'externalId', 'topicLabel', 'subtopic', 'concept', 'cognitiveLevel', 'year', 'difficultyLabel', 'qaGrade', 'verificationMethod',
  'answerVerified', 'aiVerified', 'variationAllowed', 'sourceName', 'unused', 'sort', 'dir',
] as const;
type FilterKey = (typeof FILTER_KEYS)[number];

const yesNo = (v: boolean | null) => (v === null ? <span className="muted">—</span> : v ? 'Yes' : 'No');
const date = (v: string | null) => (v ? v.slice(0, 10) : <span className="muted">—</span>);
const text = (v: string | number | null) => (v === null || v === '' ? <span className="muted">—</span> : v);

interface Column {
  key: string;
  label: string;
  /** Sort key understood by the API; omitted for columns that cannot be sorted. */
  sort?: string;
  /** Shown until the viewer changes the column choice. */
  initial?: boolean;
  render: (q: QuestionRow) => ReactNode;
  className?: string;
}

const COLUMNS: Column[] = [
  { key: 'externalId', label: 'ID', sort: 'externalId', render: (q) => text(q.externalId), className: 'small' },
  { key: 'status', label: 'Status', sort: 'status', initial: true, render: (q) => <StatusBadge status={q.status} /> },
  { key: 'difficulty', label: 'Difficulty', sort: 'difficulty', initial: true, render: (q) => <DifficultyBadge difficulty={q.difficulty} /> },
  { key: 'difficultyLabel', label: 'Difficulty (file)', sort: 'difficultyLabel', render: (q) => text(q.difficultyLabel), className: 'small' },
  { key: 'language', label: 'Language', sort: 'language', initial: true, render: (q) => languageName(q.language), className: 'small' },
  { key: 'exam', label: 'Exam', sort: 'exam', render: (q) => q.examName, className: 'small' },
  { key: 'subject', label: 'Subject', sort: 'subject', render: (q) => q.subjectName, className: 'small' },
  {
    key: 'chapter',
    label: 'Chapter',
    sort: 'chapter',
    initial: true,
    render: (q) => `${q.chapterName}${q.topicName ? ` › ${q.topicName}` : ''}`,
    className: 'small',
  },
  { key: 'topicLabel', label: 'Topic', sort: 'topicLabel', render: (q) => text(q.topicLabel), className: 'small' },
  { key: 'subtopic', label: 'Subtopic', sort: 'subtopic', render: (q) => text(q.subtopic), className: 'small' },
  { key: 'concept', label: 'Concept', sort: 'concept', render: (q) => text(q.concept), className: 'small cell-clip' },
  { key: 'cognitiveLevel', label: 'Cognitive level', sort: 'cognitiveLevel', render: (q) => text(q.cognitiveLevel), className: 'small' },
  { key: 'correctOption', label: 'Answer', sort: 'correctOption', render: (q) => q.correctOption, className: 'small' },
  { key: 'year', label: 'Year', sort: 'year', render: (q) => text(q.year), className: 'small' },
  { key: 'qaGrade', label: 'QA grade', sort: 'qaGrade', render: (q) => text(q.qaGrade), className: 'small' },
  { key: 'answerVerified', label: 'Answer verified', sort: 'answerVerified', render: (q) => yesNo(q.answerVerified), className: 'small' },
  { key: 'aiVerified', label: 'AI verified', sort: 'aiVerified', render: (q) => yesNo(q.aiVerified), className: 'small' },
  { key: 'verificationMethod', label: 'Verified by', sort: 'verificationMethod', render: (q) => text(q.verificationMethod), className: 'small cell-clip' },
  { key: 'variationAllowed', label: 'Variation allowed', sort: 'variationAllowed', render: (q) => yesNo(q.variationAllowed), className: 'small' },
  { key: 'variationRule', label: 'Variation rule', sort: 'variationRule', render: (q) => text(q.variationRule), className: 'small cell-clip' },
  { key: 'qaFlags', label: 'QA notes', sort: 'qaFlags', render: (q) => text(q.qaFlags), className: 'small cell-clip' },
  { key: 'sourceName', label: 'Source name', sort: 'sourceName', render: (q) => text(q.sourceName), className: 'small cell-clip' },
  { key: 'source', label: 'Source', sort: 'source', render: (q) => q.source, className: 'small' },
  { key: 'validAsOf', label: 'Valid as of', sort: 'validAsOf', render: (q) => date(q.validAsOf), className: 'small' },
  { key: 'usage', label: 'Used in tests', sort: 'usage', render: (q) => q.usageCount, className: 'small' },
  {
    key: 'checks',
    label: 'Checks',
    sort: 'checks',
    initial: true,
    className: 'small',
    render: (q) => {
      const errors = q.validationIssues.filter((i) => i.severity === 'error').length;
      const warnings = q.validationIssues.length - errors;
      return (
        <>
          {q.duplicateOfId && <span className="badge badge-warn">POSSIBLE DUPLICATE</span>}{' '}
          {errors > 0 && <span className="badge badge-danger">{errors} error{errors > 1 ? 's' : ''}</span>}{' '}
          {warnings > 0 && !q.duplicateOfId && <span className="badge badge-warn">{warnings} warning{warnings > 1 ? 's' : ''}</span>}
          {q.validationIssues.length === 0 && <span className="muted">✓ passed</span>}
        </>
      );
    },
  },
  { key: 'reviewedAt', label: 'Reviewed', sort: 'reviewedAt', render: (q) => (q.reviewedAt ? relTime(q.reviewedAt) : <span className="muted">—</span>), className: 'small muted' },
  { key: 'publishedAt', label: 'Published', sort: 'publishedAt', render: (q) => (q.publishedAt ? relTime(q.publishedAt) : <span className="muted">—</span>), className: 'small muted' },
  { key: 'created', label: 'Added', sort: 'created', initial: true, render: (q) => relTime(q.createdAt), className: 'small muted' },
  { key: 'updated', label: 'Updated', sort: 'updated', render: (q) => relTime(q.updatedAt), className: 'small muted' },
];

const COLUMN_STORAGE_KEY = 'questionBank.columns.v1';

/** The viewer's column choice, kept in this browser only (a convenience, never required). */
function useColumnChoice() {
  const [shown, setShown] = useState<string[]>(() => COLUMNS.filter((c) => c.initial).map((c) => c.key));
  useEffect(() => {
    try {
      const saved = JSON.parse(window.localStorage.getItem(COLUMN_STORAGE_KEY) ?? 'null');
      if (Array.isArray(saved)) {
        const known = saved.filter((k): k is string => typeof k === 'string' && COLUMNS.some((c) => c.key === k));
        // eslint-disable-next-line react-hooks/set-state-in-effect
        if (known.length) setShown(known);
      }
    } catch {
      /* storage unavailable: keep the defaults */
    }
  }, []);
  function update(next: string[]) {
    setShown(next);
    try {
      window.localStorage.setItem(COLUMN_STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  }
  return [shown, update] as const;
}

const TRI = [
  { value: '', label: 'Any' },
  { value: 'true', label: 'Yes' },
  { value: 'false', label: 'No' },
];

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
  const f = Object.fromEntries(FILTER_KEYS.map((k) => [k, params.get(k) ?? ''])) as Record<FilterKey, string>;
  const page = Number(f.page) || 1;
  const [search, setSearch] = useState(f.q);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [shown, setShown] = useColumnChoice();
  const [fields, setFields] = useState({ externalId: f.externalId, subtopic: f.subtopic, concept: f.concept });

  const query = { ...f, page, pageSize: 50 };
  const { data, error, loading, reload } = useApi<Paged<QuestionRow>>('questions', query);
  const facets = useApi<QuestionFacets>('questions/facets', { examId: f.examId, subjectId: f.subjectId }).data;
  const columns = COLUMNS.filter((c) => shown.includes(c.key));
  const bankFilterKeys = FILTER_KEYS.filter((k) => !['examId', 'subjectId', 'chapterId', 'topicId', 'page', 'sort', 'dir', 'jobId', 'q'].includes(k));
  const activeFilters = bankFilterKeys.filter((k) => f[k]).length + (f.examId || f.subjectId || f.chapterId || f.topicId || f.q ? 1 : 0);

  function sortBy(key: string) {
    // First click sorts ascending, the second descending, the third returns to newest first.
    if (f.sort !== key) setFilters({ sort: key, dir: 'asc' });
    else if (f.dir === 'asc') setFilters({ sort: key, dir: 'desc' });
    else setFilters({ sort: '', dir: '' });
  }

  function setFilters(patch: Partial<Record<FilterKey, string>>) {
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
          {activeFilters > 0 && (
            <button
              type="button"
              className="btn btn-sm"
              onClick={() => {
                setSearch('');
                setFields({ externalId: '', subtopic: '', concept: '' });
                setFilters(Object.fromEntries(FILTER_KEYS.filter((k) => k !== 'sort' && k !== 'dir').map((k) => [k, ''])) as Partial<Record<FilterKey, string>>);
              }}
            >
              Clear filters ({activeFilters}) ✕
            </button>
          )}
          {f.jobId && (
            <button type="button" className="btn btn-sm" onClick={() => setFilters({ jobId: '' })}>
              Job filter ✕
            </button>
          )}
        </form>

        <details className="more-filters" open={bankFilterKeys.some((k) => f[k])}>
          <summary>More filters (bank columns)</summary>
          <form
            className="filters"
            onSubmit={(e) => {
              e.preventDefault();
              setFilters({ externalId: fields.externalId.trim(), subtopic: fields.subtopic.trim(), concept: fields.concept.trim() });
            }}
          >
            <input className="input" placeholder="ID starts with… (e.g. Q03)" aria-label="ID starts with" value={fields.externalId} onChange={(e) => setFields({ ...fields, externalId: e.target.value })} />
            <input className="input" placeholder="Subtopic contains…" aria-label="Subtopic contains" value={fields.subtopic} onChange={(e) => setFields({ ...fields, subtopic: e.target.value })} />
            <input className="input" placeholder="Concept contains…" aria-label="Concept contains" value={fields.concept} onChange={(e) => setFields({ ...fields, concept: e.target.value })} />
            <button className="btn btn-sm" type="submit">
              Apply text filters
            </button>
            <FacetSelect label="Topic" value={f.topicLabel} items={facets?.topicLabel} onChange={(v) => setFilters({ topicLabel: v })} />
            <FacetSelect label="Cognitive level" value={f.cognitiveLevel} items={facets?.cognitiveLevel} onChange={(v) => setFilters({ cognitiveLevel: v })} />
            <FacetSelect label="Year" value={f.year} items={facets?.year} onChange={(v) => setFilters({ year: v })} />
            <FacetSelect label="Difficulty (file)" value={f.difficultyLabel} items={facets?.difficultyLabel} onChange={(v) => setFilters({ difficultyLabel: v })} />
            <FacetSelect label="QA grade" value={f.qaGrade} items={facets?.qaGrade} onChange={(v) => setFilters({ qaGrade: v })} />
            <FacetSelect label="Verified by" value={f.verificationMethod} items={facets?.verificationMethod} onChange={(v) => setFilters({ verificationMethod: v })} />
            <FacetSelect label="Source name" value={f.sourceName} items={facets?.sourceName} onChange={(v) => setFilters({ sourceName: v })} />
            <TriSelect label="Answer verified" value={f.answerVerified} onChange={(v) => setFilters({ answerVerified: v })} />
            <TriSelect label="AI verified" value={f.aiVerified} onChange={(v) => setFilters({ aiVerified: v })} />
            <TriSelect label="Variation allowed" value={f.variationAllowed} onChange={(v) => setFilters({ variationAllowed: v })} />
            <select className="input" aria-label="Used in a mock test" value={f.unused} onChange={(e) => setFilters({ unused: e.target.value })}>
              <option value="">Used in a mock test: any</option>
              <option value="true">Not used in any mock test</option>
              <option value="false">Used in a mock test</option>
            </select>
          </form>
        </details>

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

        <div className="row" style={{ justifyContent: 'space-between', marginBottom: 8 }}>
          <span className="small muted">
            {f.sort ? `Sorted by ${COLUMNS.find((c) => c.sort === f.sort)?.label ?? f.sort} (${f.dir === 'desc' ? 'high to low' : 'low to high'}). Click a heading to change.` : 'Newest first. Click a column heading to sort.'}
          </span>
          <details className="col-chooser">
            <summary>Columns ({shown.length})</summary>
            <div className="col-menu">
              <div className="row" style={{ marginBottom: 8 }}>
                <button type="button" className="btn btn-sm" onClick={() => setShown(COLUMNS.map((c) => c.key))}>
                  All
                </button>
                <button type="button" className="btn btn-sm" onClick={() => setShown(COLUMNS.filter((c) => c.initial).map((c) => c.key))}>
                  Default
                </button>
              </div>
              {COLUMNS.map((c) => (
                <label key={c.key} className="check">
                  <input
                    type="checkbox"
                    checked={shown.includes(c.key)}
                    onChange={(e) => setShown(e.target.checked ? COLUMNS.filter((x) => x.key === c.key || shown.includes(x.key)).map((x) => x.key) : shown.filter((k) => k !== c.key))}
                  />
                  {c.label}
                </label>
              ))}
            </div>
          </details>
        </div>

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
                <th aria-sort={f.sort === 'question' ? (f.dir === 'desc' ? 'descending' : 'ascending') : undefined}>
                  <button type="button" className="sort" onClick={() => sortBy('question')}>
                    Question <span className="arrow">{f.sort === 'question' ? (f.dir === 'desc' ? '▼' : '▲') : '↕'}</span>
                  </button>
                </th>
                {columns.map((c) => (
                  <th key={c.key} aria-sort={c.sort && f.sort === c.sort ? (f.dir === 'desc' ? 'descending' : 'ascending') : undefined}>
                    {c.sort ? (
                      <button type="button" className="sort" onClick={() => sortBy(c.sort!)}>
                        {c.label} <span className="arrow">{f.sort === c.sort ? (f.dir === 'desc' ? '▼' : '▲') : '↕'}</span>
                      </button>
                    ) : (
                      c.label
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((q) => (
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
                  <td style={{ maxWidth: 440, minWidth: 260 }}>
                    <Link href={`/questions/${q.id}`} className="clip-2" style={{ color: 'var(--text)' }}>
                      {q.questionText}
                    </Link>
                    <div className="small muted">
                      {q.examName} · {q.subjectName} · {q.source}
                    </div>
                  </td>
                  {columns.map((c) => (
                    <td key={c.key} className={c.className}>
                      {c.render(q)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          {data && items.length === 0 && <div className="empty">No questions match these filters.</div>}
        </div>
        {data && <Pager page={page} pageSize={data.pageSize} total={data.total} onPage={(p) => setFilters({ page: String(p) })} />}
      </div>
    </>
  );
}

function FacetSelect({ label, value, items, onChange }: { label: string; value: string; items?: { value: string | number; count: number }[]; onChange: (v: string) => void }) {
  // Keep a filter that came from the address bar selectable even before the options load.
  const list = items ?? [];
  const hasValue = !value || list.some((i) => String(i.value) === value);
  return (
    <select className="input" aria-label={label} value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">{label}: any</option>
      {!hasValue && <option value={value}>{`${label}: ${value}`}</option>}
      {list.map((i) => (
        <option key={String(i.value)} value={String(i.value)}>
          {label}: {i.value} ({i.count.toLocaleString()})
        </option>
      ))}
    </select>
  );
}

function TriSelect({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <select className="input" aria-label={label} value={value} onChange={(e) => onChange(e.target.value)}>
      {TRI.map((o) => (
        <option key={o.value} value={o.value}>
          {o.value ? `${label}: ${o.label}` : `${label}: any`}
        </option>
      ))}
    </select>
  );
}
