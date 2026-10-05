'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useCan } from '@/components/ConsoleShell';
import { ConfirmButton, DifficultyBadge, ErrorAlert, FigureImg, Kpi, Loading, OkAlert, PageHead, StatusBadge } from '@/components/ui';
import { api, errorMessage, useApi } from '@/lib/api';
import { fmtDate } from '@/lib/format';
import { languageName } from '@/lib/useTaxonomy';

interface TestDetail {
  id: string;
  title: string;
  description: string | null;
  examName: string;
  language: string;
  kind: 'full' | 'subject';
  status: 'draft' | 'published' | 'archived';
  durationMinutes: number;
  totalQuestions: number;
  marksPerQuestion: number;
  negativeMarks: number;
  publishedAt: string | null;
  attempts: { total: number; submitted: number; inProgress: number };
  questions: {
    id: string;
    position: number;
    subjectName: string;
    chapterName: string;
    questionText: string;
    difficulty: string;
    status: string;
    correctOption: string;
    options: { label: string; text: string }[];
  }[];
}

type PdfVariant = 'paper' | 'key' | 'both';

interface PdfList {
  keepPerVariant: number;
  items: {
    id: string;
    variant: PdfVariant;
    showDetails: boolean;
    fileName: string;
    sizeBytes: number;
    pages: number;
    createdAt: string;
    createdByName: string | null;
    outdated: boolean;
  }[];
}

const PDF_KINDS: [PdfVariant, string][] = [
  ['paper', 'Question paper'],
  ['key', 'Answer key'],
  ['both', 'Paper + key'],
];

function fmtSize(bytes: number) {
  return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/** PDFs made by the API and stored, so staff download the same file each time. */
function SavedPdfs({
  testId,
  list,
  error,
  canWrite,
  reload,
}: {
  testId: string;
  list: PdfList | null;
  error: string | null;
  canWrite: boolean;
  reload: () => Promise<void>;
}) {
  const [variant, setVariant] = useState<PdfVariant>('paper');
  const [details, setDetails] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function make() {
    setBusy(true);
    setErr(null);
    try {
      await api(`mock-tests/${testId}/pdfs`, { method: 'POST', body: { variant, showDetails: details } });
      await reload();
    } catch (e) {
      setErr(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card">
      <div className="card-head">
        <h2>Saved PDFs</h2>
        {list && <span className="small muted">Newest {list.keepPerVariant} of each kind are kept</span>}
      </div>
      <p className="small muted" style={{ marginTop: 0 }}>
        Made on the server in the test’s language, with figures — no print dialog needed. Each file is stored, so every download is the same
        file. A file is marked <strong>Outdated</strong> once the test or one of its questions changes; make a new one then. Give candidates the
        question paper only; the answer key is a staff copy.
      </p>
      {canWrite && (
        <div className="row" style={{ marginBottom: 12 }}>
          <div className="segmented" role="group" aria-label="What the PDF contains">
            {PDF_KINDS.map(([v, label]) => (
              <button key={v} type="button" aria-pressed={variant === v} onClick={() => setVariant(v)}>
                {label}
              </button>
            ))}
          </div>
          <label className="check" style={{ margin: 0, opacity: variant === 'paper' ? 0.5 : 1 }}>
            <input type="checkbox" checked={details} disabled={variant === 'paper'} onChange={(e) => setDetails(e.target.checked)} />
            Chapter and difficulty on the key
          </label>
          <button className="btn btn-primary" onClick={make} disabled={busy}>
            {busy ? 'Making PDF…' : 'Make PDF'}
          </button>
        </div>
      )}
      <ErrorAlert error={err ?? error} />
      {!list ? (
        !error && <Loading what="Loading PDFs…" />
      ) : list.items.length === 0 ? (
        <p className="muted small" style={{ margin: 0 }}>
          No PDFs yet.{canWrite ? ' Choose what it should contain and press Make PDF.' : ''}
        </p>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>File</th>
                <th>Contains</th>
                <th className="num">Pages</th>
                <th className="num">Size</th>
                <th>Made</th>
                <th>State</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {list.items.map((p) => (
                <tr key={p.id}>
                  <td className="small" style={{ wordBreak: 'break-all' }}>
                    {p.fileName}
                  </td>
                  <td className="small">
                    {PDF_KINDS.find(([v]) => v === p.variant)?.[1]}
                    {p.variant !== 'paper' && !p.showDetails && <div className="muted">without chapter tags</div>}
                  </td>
                  <td className="num">{p.pages}</td>
                  <td className="num" style={{ whiteSpace: 'nowrap' }}>
                    {fmtSize(p.sizeBytes)}
                  </td>
                  <td className="small">
                    {fmtDate(p.createdAt)}
                    {p.createdByName && <div className="muted">{p.createdByName}</div>}
                  </td>
                  <td>{p.outdated ? <span className="badge badge-warn">Outdated</span> : <span className="badge badge-good">Current</span>}</td>
                  <td>
                    <div className="row" style={{ flexWrap: 'nowrap' }}>
                      <a className="btn btn-sm" href={`/api/backend/mock-tests/${testId}/pdfs/${p.id}/download`} download={p.fileName}>
                        Download
                      </a>
                      {canWrite && (
                        <ConfirmButton
                          label="Delete"
                          confirm={`Delete ${p.fileName}? Copies already downloaded are not affected.`}
                          onConfirm={async () => {
                            setErr(null);
                            try {
                              await api(`mock-tests/${testId}/pdfs/${p.id}`, { method: 'DELETE' });
                              await reload();
                            } catch (e) {
                              setErr(errorMessage(e));
                            }
                          }}
                        />
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function MockTestPage() {
  const { id } = useParams<{ id: string }>();
  const can = useCan();
  const { data: t, error, reload: reloadTest } = useApi<TestDetail>(`mock-tests/${id}`);
  const pdfs = useApi<PdfList>(`mock-tests/${id}/pdfs`);
  // PDFs show as outdated once the test changes, so refresh both together.
  const reload = async () => {
    await Promise.all([reloadTest(), pdfs.reload()]);
  };
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [swapping, setSwapping] = useState<TestDetail['questions'][number] | null>(null);

  async function act(a: 'publish' | 'unpublish') {
    setErr(null);
    try {
      await api(`mock-tests/${id}/${a}`, { method: 'POST' });
      setMsg(a === 'publish' ? 'Published — it is now listed on the website.' : 'Unpublished — hidden from the website.');
      await reload();
    } catch (e) {
      setErr(errorMessage(e));
    }
  }

  if (!t) return error ? <ErrorAlert error={error} /> : <Loading />;
  const bySubject = t.questions.reduce<Record<string, number>>((m, q) => ({ ...m, [q.subjectName]: (m[q.subjectName] ?? 0) + 1 }), {});
  const byDifficulty = t.questions.reduce<Record<string, number>>((m, q) => ({ ...m, [q.difficulty]: (m[q.difficulty] ?? 0) + 1 }), {});
  const notLive = t.questions.filter((q) => q.status !== 'published').length;

  return (
    <>
      <PageHead
        title={t.title}
        subtitle={`${t.examName} · ${languageName(t.language)} · created for the website’s Mock Tests section`}
        actions={
          <>
            <Link className="btn" href="/mock-tests">
              ← Mock Tests
            </Link>
            <Link className="btn" href={`/mock-tests/${id}/print`} target="_blank">
              Print view
            </Link>
            {can('mocktests:write') && t.status !== 'archived' && (
              <button className="btn" onClick={() => setEditing((e) => !e)} aria-expanded={editing}>
                Edit details
              </button>
            )}
            {can('mocktests:publish') && t.status === 'draft' && (
              <button className="btn btn-primary" onClick={() => act('publish')}>
                Publish
              </button>
            )}
            {can('mocktests:publish') && t.status === 'published' && (
              <button className="btn" onClick={() => act('unpublish')}>
                Unpublish
              </button>
            )}
            {can('mocktests:write') && t.status !== 'archived' && (
              <ConfirmButton
                label="Archive"
                confirm="Archive this test? It disappears from the website; past results stay."
                onConfirm={async () => {
                  await api(`mock-tests/${id}`, { method: 'DELETE' });
                  await reload();
                }}
              />
            )}
          </>
        }
      />
      <OkAlert message={msg} />
      <ErrorAlert error={err} />
      {editing && (
        <EditDetails
          t={t}
          onClose={() => setEditing(false)}
          onSaved={async () => {
            setEditing(false);
            setMsg('Details saved.');
            await reload();
          }}
        />
      )}
      {notLive > 0 && (
        <div className="alert alert-warn">
          {notLive} question(s) here are no longer published and are hidden from candidates. Use <strong>Swap</strong> on each one to replace it, or generate a fresh test.
        </div>
      )}
      <div className="kpis">
        <Kpi label="Status" value={t.status.toUpperCase()} sub={t.publishedAt ? `since ${fmtDate(t.publishedAt)}` : undefined} />
        <Kpi label="Questions" value={t.totalQuestions} sub={Object.entries(bySubject).map(([s, n]) => `${s} ${n}`).join(' · ')} />
        <Kpi label="Duration" value={`${t.durationMinutes} min`} />
        <Kpi label="Marking" value={`+${t.marksPerQuestion} / −${t.negativeMarks}`} sub={`max ${t.totalQuestions * t.marksPerQuestion}`} />
        <Kpi label="Difficulty" value={`${byDifficulty.easy ?? 0} / ${byDifficulty.medium ?? 0} / ${byDifficulty.hard ?? 0}`} sub="easy / medium / hard" />
      </div>
      <div className="card">
        <h2 style={{ marginBottom: 10 }}>Questions and answer key</h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th className="num">#</th>
                <th>Question</th>
                <th>Key</th>
                <th>Subject</th>
                <th>Difficulty</th>
                <th>Status</th>
                {can('mocktests:write') && t.status !== 'archived' && <th />}
              </tr>
            </thead>
            <tbody>
              {t.questions.map((q) => (
                <tr key={q.id}>
                  <td className="num">{q.position}</td>
                  <td style={{ maxWidth: 520 }}>
                    <Link href={`/questions/${q.id}`} className="clip-2" style={{ color: 'var(--text)' }}>
                      {q.questionText}
                    </Link>
                  </td>
                  <td className="small">
                    <strong>{q.correctOption}</strong> {q.options.find((o) => o.label === q.correctOption)?.text}
                  </td>
                  <td className="small">
                    {q.subjectName}
                    <div className="muted">{q.chapterName}</div>
                  </td>
                  <td>
                    <DifficultyBadge difficulty={q.difficulty} />
                  </td>
                  <td>
                    <StatusBadge status={q.status} />
                  </td>
                  {can('mocktests:write') && t.status !== 'archived' && (
                    <td>
                      <button className="btn btn-sm" onClick={() => setSwapping(q)} aria-label={`Swap question ${q.position}`}>
                        Swap
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <SavedPdfs testId={id} list={pdfs.data} error={pdfs.error} canWrite={can('mocktests:write')} reload={pdfs.reload} />
      {swapping && (
        <SwapDialog
          testId={id}
          question={swapping}
          onClose={() => setSwapping(null)}
          onSwapped={async (m) => {
            setSwapping(null);
            setMsg(m);
            await reload();
          }}
        />
      )}
    </>
  );
}

function EditDetails({ t, onClose, onSaved }: { t: TestDetail; onClose: () => void; onSaved: () => Promise<void> }) {
  const [form, setForm] = useState({
    title: t.title,
    description: t.description ?? '',
    durationMinutes: t.durationMinutes,
    kind: t.kind,
    marksPerQuestion: t.marksPerQuestion,
    negativeMarks: t.negativeMarks,
  });
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const locked = t.attempts.total > 0;

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      await api(`mock-tests/${t.id}`, {
        method: 'PUT',
        body: {
          title: form.title,
          description: form.description.trim() || null,
          durationMinutes: form.durationMinutes,
          kind: form.kind,
          ...(locked ? {} : { marksPerQuestion: form.marksPerQuestion, negativeMarks: form.negativeMarks }),
        },
      });
      await onSaved();
    } catch (e2) {
      setErr(errorMessage(e2));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="card" style={{ marginBottom: 16 }} onSubmit={save}>
      <div className="card-head">
        <h2>Edit details</h2>
        <button type="button" className="btn btn-sm btn-ghost" onClick={onClose}>
          Close
        </button>
      </div>
      <ErrorAlert error={err} />
      <div className="form-grid">
        <label className="field">
          <span>Title</span>
          <input className="input" required maxLength={200} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        </label>
        <label className="field">
          <span>Test kind</span>
          <select className="input" value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value as 'full' | 'subject' })}>
            <option value="full">Full paper</option>
            <option value="subject">Subject-wise</option>
          </select>
          <small>Decides which free quota it counts against on the website.</small>
        </label>
        <label className="field">
          <span>Duration (minutes)</span>
          <input
            className="input"
            type="number"
            min={1}
            max={600}
            value={form.durationMinutes}
            onChange={(e) => setForm({ ...form, durationMinutes: Number(e.target.value) })}
          />
          <small>Candidates already taking the test keep the time they started with.</small>
        </label>
        <label className="field">
          <span>Description (optional)</span>
          <input className="input" maxLength={2000} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </label>
        <label className="field">
          <span>Marks per correct answer</span>
          <input
            className="input"
            type="number"
            min={0}
            step="0.25"
            disabled={locked}
            value={form.marksPerQuestion}
            onChange={(e) => setForm({ ...form, marksPerQuestion: Number(e.target.value) })}
          />
        </label>
        <label className="field">
          <span>Negative marks per wrong answer</span>
          <input
            className="input"
            type="number"
            min={0}
            step="0.25"
            disabled={locked}
            value={form.negativeMarks}
            onChange={(e) => setForm({ ...form, negativeMarks: Number(e.target.value) })}
          />
          {locked && (
            <small>
              Marking is locked: {t.attempts.total} attempt(s) already exist. To change it, archive this test and generate a new one.
            </small>
          )}
        </label>
      </div>
      <button className="btn btn-primary" disabled={busy || !form.title.trim()}>
        {busy ? 'Saving…' : 'Save details'}
      </button>
    </form>
  );
}

interface Candidate {
  id: string;
  questionText: string;
  figureSvg: string | null;
  difficulty: string;
  chapterName: string;
  timesUsed: number;
  sameDifficulty: boolean;
  correctOption: string;
  options: { label: string; text: string; svg?: string | null }[];
}

function SwapDialog({
  testId,
  question,
  onClose,
  onSwapped,
}: {
  testId: string;
  question: TestDetail['questions'][number];
  onClose: () => void;
  onSwapped: (message: string) => Promise<void>;
}) {
  const [search, setSearch] = useState('');
  const [applied, setApplied] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const { data, error } = useApi<{ total: number; items: Candidate[] }>(`mock-tests/${testId}/questions/${question.id}/candidates`, {
    search: applied,
    limit: 20,
  });

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  async function swap(replacementId?: string) {
    setErr(null);
    setBusy(replacementId ?? 'auto');
    try {
      await api(`mock-tests/${testId}/questions/${question.id}/swap`, { method: 'POST', body: replacementId ? { replacementId } : {} });
      await onSwapped(`Question ${question.position} replaced.`);
    } catch (e) {
      setErr(errorMessage(e));
      setBusy(null);
    }
  }

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label={`Swap question ${question.position}`}>
      <div className="modal">
        <div className="card-head">
          <h2>Swap question {question.position}</h2>
          <button className="btn btn-sm btn-ghost" onClick={onClose}>
            Close
          </button>
        </div>
        <div className="card" style={{ background: 'var(--surface-2)', marginBottom: 12 }}>
          <div className="small muted">
            Replacing · {question.subjectName} · {question.chapterName} · <DifficultyBadge difficulty={question.difficulty} />
          </div>
          <div style={{ marginTop: 4 }}>{question.questionText}</div>
          <div className="small" style={{ marginTop: 4 }}>
            Key: <strong>{question.correctOption}</strong> {question.options.find((o) => o.label === question.correctOption)?.text}
          </div>
        </div>
        <p className="small muted" style={{ marginTop: 0 }}>
          The new question keeps the same number and subject. Only published, unused-in-this-test questions of the same language are listed;
          same-difficulty ones first, then least used.
        </p>
        <ErrorAlert error={err ?? error} />
        <div className="row" style={{ marginBottom: 12 }}>
          <button className="btn btn-primary" disabled={busy !== null} onClick={() => swap()}>
            {busy === 'auto' ? 'Swapping…' : 'Auto-pick a replacement'}
          </button>
          <form
            className="row"
            style={{ flex: 1 }}
            onSubmit={(e) => {
              e.preventDefault();
              setApplied(search.trim());
            }}
          >
            <input className="input" style={{ flex: 1, minWidth: 160 }} placeholder="Search the question text…" value={search} onChange={(e) => setSearch(e.target.value)} />
            <button className="btn">Search</button>
          </form>
        </div>
        {!data ? (
          <Loading />
        ) : data.items.length === 0 ? (
          <div className="empty">No other published question fits. Publish more questions in this subject, or clear the search.</div>
        ) : (
          <>
            <div className="small muted" style={{ marginBottom: 6 }}>
              Showing {data.items.length} of {data.total}
            </div>
            <div className="table-wrap" style={{ maxHeight: '48vh', overflow: 'auto' }}>
              <table>
                <tbody>
                  {data.items.map((c) => (
                    <tr key={c.id}>
                      <td style={{ maxWidth: 520 }}>
                        <div>{c.questionText}</div>
                        {c.figureSvg && (
                          <div style={{ margin: '6px 0' }}>
                            <FigureImg svg={c.figureSvg} alt="Figure" maxWidth={360} />
                          </div>
                        )}
                        {c.options.some((o) => o.svg) ? (
                          <div className="row" style={{ marginTop: 4 }}>
                            {c.options.map((o) => (
                              <div key={o.label} style={{ textAlign: 'center', outline: o.label === c.correctOption ? '2px solid var(--good)' : undefined }}>
                                <FigureImg svg={o.svg!} alt={`Option ${o.label}`} maxWidth={64} />
                                <div className="small">{o.label}</div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <ol type="A" className="small muted" style={{ margin: '4px 0 0', paddingLeft: 20 }}>
                            {c.options.map((o) => (
                              <li key={o.label} style={o.label === c.correctOption ? { fontWeight: 700, color: 'var(--good)' } : undefined}>
                                {o.text}
                              </li>
                            ))}
                          </ol>
                        )}
                      </td>
                      <td className="small">
                        <DifficultyBadge difficulty={c.difficulty} />
                        {c.sameDifficulty && <div className="muted">same level</div>}
                        <div className="muted">{c.chapterName}</div>
                        <div className="muted">used in {c.timesUsed} test(s)</div>
                      </td>
                      <td>
                        <button className="btn btn-sm btn-primary" disabled={busy !== null} onClick={() => swap(c.id)}>
                          {busy === c.id ? 'Swapping…' : 'Use this'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
