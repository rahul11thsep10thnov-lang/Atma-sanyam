'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useCan } from '@/components/ConsoleShell';
import { DifficultyBadge, ErrorAlert, FigureImg, OkAlert, PageHead } from '@/components/ui';
import { api, errorMessage, useApi } from '@/lib/api';
import { useTaxonomy } from '@/lib/useTaxonomy';

interface GeneratorInfo {
  id: string;
  chapter: string;
  title: { hi: string; hl: string; en: string };
  description: string;
}

interface PreviewItem {
  generator: string;
  difficulty: string;
  seed: number;
  stem: string;
  figureSvg: string | null;
  options: { label: string; text: string; svg: string | null }[];
  correctOption: string;
  explanation: string;
}

interface Report {
  requested: number;
  created: number;
  duplicatesSkipped: number;
  failed: number;
  byType: Record<string, { easy: number; medium: number; hard: number }>;
  errors: string[];
}

const LANGS = [
  { code: 'hi-Latn', name: 'Hinglish' },
  { code: 'hi', name: 'Hindi' },
  { code: 'en', name: 'English' },
];

export default function FiguresPage() {
  const { data, error } = useApi<{ items: GeneratorInfo[]; maxPerRequest: number }>('figure-generators');
  const can = useCan();
  const gens = data?.items ?? [];
  return (
    <>
      <PageHead
        title="Figure Questions (non-verbal)"
        subtitle="Figure series, mirror and water images, embedded figures, paper folding, counting figures, odd one out, analogies and Venn diagrams. Drawn by the figure engine with the answer computed and re-checked by program — no AI, no cost. New questions wait in Review."
      />
      <ErrorAlert error={error} />
      {gens.length > 0 && <Preview gens={gens} />}
      {gens.length > 0 && can('questions:write') && <Generate gens={gens} max={data?.maxPerRequest ?? 500} />}
    </>
  );
}

function Preview({ gens }: { gens: GeneratorInfo[] }) {
  const [generator, setGenerator] = useState(gens[0]!.id);
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [language, setLanguage] = useState('hi');
  const [items, setItems] = useState<PreviewItem[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    setErr(null);
    setBusy(true);
    try {
      const r = await api<{ items: PreviewItem[] }>('figure-questions/preview', { method: 'POST', body: { generator, difficulty, language, count: 4 } });
      setItems(r.items);
    } catch (e) {
      setErr(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  const info = gens.find((g) => g.id === generator)!;
  return (
    <div className="card">
      <div className="card-head">
        <h2>Preview a type</h2>
        <span className="small muted">Nothing is saved.</span>
      </div>
      <div className="row" style={{ marginBottom: 10 }}>
        <select className="input" style={{ width: 'auto' }} aria-label="Figure type" value={generator} onChange={(e) => setGenerator(e.target.value)}>
          {gens.map((g) => (
            <option key={g.id} value={g.id}>
              {g.title.en}
            </option>
          ))}
        </select>
        <select className="input" style={{ width: 'auto' }} aria-label="Difficulty" value={difficulty} onChange={(e) => setDifficulty(e.target.value as typeof difficulty)}>
          <option value="easy">Easy</option>
          <option value="medium">Medium</option>
          <option value="hard">Hard</option>
        </select>
        <select className="input" style={{ width: 'auto' }} aria-label="Language" value={language} onChange={(e) => setLanguage(e.target.value)}>
          {LANGS.map((l) => (
            <option key={l.code} value={l.code}>
              {l.name}
            </option>
          ))}
        </select>
        <button className="btn btn-primary" onClick={load} disabled={busy}>
          {busy ? 'Drawing…' : items ? 'Show 4 more' : 'Show 4 samples'}
        </button>
      </div>
      <p className="small muted" style={{ marginTop: 0 }}>
        {info.description} Chapter: <code>{info.chapter}</code>.
      </p>
      <ErrorAlert error={err} />
      {items?.map((q, i) => (
        <div key={`${q.seed}-${i}`} className="card" style={{ background: 'var(--surface-2)' }}>
          <div className="small muted" style={{ marginBottom: 4 }}>
            <DifficultyBadge difficulty={q.difficulty} /> seed {q.seed}
          </div>
          <div style={{ fontWeight: 600 }}>{q.stem}</div>
          {q.figureSvg && (
            <div style={{ margin: '8px 0', overflowX: 'auto' }}>
              <FigureImg svg={q.figureSvg} alt="Question figure" maxWidth={680} />
            </div>
          )}
          <div className="row" style={{ alignItems: 'flex-end' }}>
            {q.options.map((o) => (
              <div
                key={o.label}
                style={{
                  textAlign: 'center',
                  padding: 4,
                  borderRadius: 8,
                  outline: o.label === q.correctOption ? '3px solid var(--good)' : '1px solid var(--border)',
                  background: '#fff',
                  minWidth: 56,
                }}
              >
                {o.svg ? <FigureImg svg={o.svg} alt={`Option ${o.label}`} maxWidth={110} /> : <div style={{ fontSize: 20, fontWeight: 700, padding: '8px 12px', color: '#111' }}>{o.text}</div>}
                <div className="small" style={{ fontWeight: 700, color: '#111' }}>
                  {o.label}
                </div>
              </div>
            ))}
          </div>
          <p className="small" style={{ margin: '8px 0 0' }}>
            <strong>Answer {q.correctOption}.</strong> {q.explanation}
          </p>
        </div>
      ))}
    </div>
  );
}

function Generate({ gens, max }: { gens: GeneratorInfo[]; max: number }) {
  const { tree } = useTaxonomy();
  const [examId, setExamId] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [chapterId, setChapterId] = useState('');
  const [language, setLanguage] = useState('hi-Latn');
  const [picked, setPicked] = useState<string[]>(gens.map((g) => g.id));
  const [count, setCount] = useState(60);
  const [pct, setPct] = useState({ easy: 30, medium: 50, hard: 20 });
  const [report, setReport] = useState<Report | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const exam = tree.find((e) => e.id === examId);
  const subject = exam?.subjects.find((s) => s.id === subjectId);
  const chapterSlugs = new Set(subject?.chapters.map((c) => c.slug) ?? []);
  const missing =
    !subject || chapterId ? [] : [...new Set(gens.filter((g) => picked.includes(g.id) && !chapterSlugs.has(g.chapter)).map((g) => g.chapter))];
  const pctTotal = pct.easy + pct.medium + pct.hard;

  function chooseExam(id: string) {
    setExamId(id);
    setChapterId('');
    const ex = tree.find((e) => e.id === id);
    const reasoning = ex?.subjects.find((s) => /reason|mental/i.test(s.slug + s.name));
    setSubjectId(reasoning?.id ?? '');
  }

  async function run() {
    setErr(null);
    setReport(null);
    setBusy(true);
    try {
      const r = await api<Report>('figure-questions', {
        method: 'POST',
        body: { examId, subjectId, chapterId: chapterId || null, generators: picked, language, count, difficulty: pct },
      });
      setReport(r);
    } catch (e) {
      setErr(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card">
      <h2 style={{ marginBottom: 10 }}>Generate into the question bank</h2>
      <ErrorAlert error={err} />
      {report && (
        <OkAlert
          message={`Created ${report.created} of ${report.requested} questions${report.duplicatesSkipped ? ` (${report.duplicatesSkipped} repeats skipped)` : ''}${
            report.failed ? `; ${report.failed} could not be made` : ''
          }. They are waiting in Review.`}
        />
      )}
      <div className="form-grid">
        <label className="field">
          <span>Exam</span>
          <select className="input" value={examId} onChange={(e) => chooseExam(e.target.value)}>
            <option value="">Choose exam…</option>
            {tree.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Subject</span>
          <select className="input" value={subjectId} disabled={!exam} onChange={(e) => (setSubjectId(e.target.value), setChapterId(''))}>
            <option value="">Choose subject…</option>
            {exam?.subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <small>Usually Reasoning / Mental Ability.</small>
        </label>
        <label className="field">
          <span>Chapter</span>
          <select className="input" value={chapterId} disabled={!subject} onChange={(e) => setChapterId(e.target.value)}>
            <option value="">Each type in its own chapter (recommended)</option>
            {subject?.chapters.map((c) => (
              <option key={c.id} value={c.id}>
                Put all in: {c.name}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Language</span>
          <select className="input" value={language} onChange={(e) => setLanguage(e.target.value)}>
            {LANGS.map((l) => (
              <option key={l.code} value={l.code}>
                {l.name}
              </option>
            ))}
          </select>
          <small>Tests use one language, so generate in the language of your tests (free to repeat for others).</small>
        </label>
        <label className="field">
          <span>Number of questions</span>
          <input className="input" type="number" min={1} max={max} value={count} onChange={(e) => setCount(Number(e.target.value))} />
          <small>Up to {max} per run; spread evenly over the chosen types.</small>
        </label>
        <fieldset className="field" style={{ border: 0, padding: 0, margin: 0 }}>
          <legend style={{ fontWeight: 600, marginBottom: 5 }}>
            Difficulty mix <span className="muted">({pctTotal}%)</span>
          </legend>
          <div className="pct-row">
            {(['easy', 'medium', 'hard'] as const).map((d) => (
              <label key={d} className="small" style={{ textTransform: 'capitalize' }}>
                {d} %
                <input className="input" type="number" min={0} max={100} value={pct[d]} onChange={(e) => setPct({ ...pct, [d]: Number(e.target.value) })} />
              </label>
            ))}
          </div>
          <small className="muted">30 / 50 / 20 matches the UP Constable calibration.</small>
        </fieldset>
      </div>

      <fieldset style={{ border: 0, padding: 0, margin: '6px 0 14px' }}>
        <legend style={{ fontWeight: 600, marginBottom: 6 }}>
          Figure types{' '}
          <button type="button" className="btn btn-sm btn-ghost" onClick={() => setPicked(gens.map((g) => g.id))}>
            All
          </button>{' '}
          <button type="button" className="btn btn-sm btn-ghost" onClick={() => setPicked([])}>
            None
          </button>
        </legend>
        <div className="grid grid-2" style={{ gap: 6 }}>
          {gens.map((g) => (
            <label key={g.id} className="check" style={{ alignItems: 'flex-start', margin: 0, fontWeight: 400 }}>
              <input
                type="checkbox"
                checked={picked.includes(g.id)}
                onChange={(e) => setPicked(e.target.checked ? [...picked, g.id] : picked.filter((x) => x !== g.id))}
              />
              <span>
                <strong>{g.title.en}</strong> <span className="muted">· {g.title.hi}</span>
                <span className="small muted" style={{ display: 'block' }}>
                  chapter <code>{g.chapter}</code>
                </span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      {missing.length > 0 && (
        <div className="alert alert-warn">
          {subject?.name} has no chapter {missing.map((m) => `"${m}"`).join(', ')}. Add it under{' '}
          <Link href="/exams">Exams, Subjects &amp; Chapters</Link>, or choose one chapter for all questions above.
        </div>
      )}

      <div className="row">
        <button
          className="btn btn-primary"
          disabled={busy || !examId || !subjectId || !picked.length || count < 1 || count > max || pctTotal !== 100 || missing.length > 0}
          onClick={run}
        >
          {busy ? 'Drawing and checking…' : `Generate ${count} questions`}
        </button>
        {report && report.created > 0 && (
          <Link className="btn" href="/review">
            Review them →
          </Link>
        )}
      </div>

      {report && (
        <div className="table-wrap" style={{ marginTop: 12 }}>
          <table>
            <thead>
              <tr>
                <th>Type</th>
                <th className="num">Easy</th>
                <th className="num">Medium</th>
                <th className="num">Hard</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(report.byType).map(([g, c]) => (
                <tr key={g}>
                  <td>{gens.find((x) => x.id === g)?.title.en ?? g}</td>
                  <td className="num">{c.easy}</td>
                  <td className="num">{c.medium}</td>
                  <td className="num">{c.hard}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {report.errors.length > 0 && <div className="small muted">{report.errors.join(' · ')}</div>}
        </div>
      )}
    </div>
  );
}
