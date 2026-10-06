'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useCan } from '@/components/ConsoleShell';
import { ErrorAlert, Forbidden, OkAlert, PageHead } from '@/components/ui';
import { api, errorMessage } from '@/lib/api';
import type { Issue } from '@/lib/types';

interface Report {
  dryRun: boolean;
  total: number;
  imported: number;
  needsReview: number;
  skipped: number;
  failed: number;
  rows: { row: number; ok: boolean; questionId?: string; issues: Issue[] }[];
}

const TEMPLATE = [
  'exam,subject,chapter,topic,question,option_a,option_b,option_c,option_d,correct_option,explanation,difficulty,language,source_name,source_reference',
  'up-police-constable,maths,Percentage,,What is 20% of 500?,50,100,150,200,B,"20% of 500 = 500 × 20/100 = 100.",easy,English,,',
].join('\n');

export default function ImportPage() {
  const can = useCan();
  const [fileName, setFileName] = useState('');
  const [content, setContent] = useState('');
  const [format, setFormat] = useState<'csv' | 'json'>('csv');
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!can('questions:write')) return <Forbidden />;

  async function onFile(file: File | undefined) {
    if (!file) return;
    if (file.size > 5_000_000) return setError('File is larger than 5 MB. Split it into smaller files.');
    setFileName(file.name);
    setFormat(file.name.toLowerCase().endsWith('.json') ? 'json' : 'csv');
    setContent(await file.text());
    setReport(null);
    setError(null);
  }

  async function run(dryRun: boolean) {
    setBusy(true);
    setError(null);
    try {
      setReport(await api<Report>('imports', { method: 'POST', body: { format, content, dryRun } }));
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHead title="Import questions" subtitle="CSV or JSON. Every row goes through the same validation as AI output and lands in NEEDS_REVIEW." />
      <div className="card">
        <ErrorAlert error={error} />
        <div className="row" style={{ marginBottom: 12 }}>
          <label className="btn">
            Choose file…
            <input type="file" accept=".csv,.json,text/csv,application/json" hidden onChange={(e) => onFile(e.target.files?.[0])} />
          </label>
          <span className="small">{fileName || 'No file chosen'}</span>
          <span className="spacer" />
          <a className="small" href={`data:text/csv;charset=utf-8,${encodeURIComponent(TEMPLATE)}`} download="question-import-template.csv">
            Download CSV template
          </a>
        </div>
        <p className="small muted" style={{ marginTop: 0 }}>
          Columns: exam, subject, chapter, topic (optional), question, option_a…option_d, correct_option (A–D), explanation, difficulty (easy/medium/hard),
          language (English / Hindi / Hinglish or en / hi / hi-Latn), source_name, source_reference, valid_as_of (optional). Exam, subject and chapter
          can be the slug or the exact name. JSON may be an array of objects with the same keys, or with <code>options: [&quot;…&quot;, …]</code>.
        </p>
        <p className="small muted" style={{ marginTop: 0 }}>
          Optional bank columns, kept so you can filter and sort on them in the Question Bank: external_id (a file imported twice adds nothing the second time),
          topic_label, subtopic, concept, cognitive_level, year, variation_allowed, variation_rule, difficulty_label, answer_verified, ai_verified,
          verification_method, qa_grade, qa_flags, qa_fixes. Other columns are ignored. Language also accepts en-hi (English and Hindi together). Up to 2,000 rows per file.
        </p>
        <div className="row">
          <button className="btn" disabled={!content || busy} onClick={() => run(true)}>
            Preview (dry run)
          </button>
          <button className="btn btn-primary" disabled={!content || busy || !report?.dryRun || report.imported === 0} onClick={() => run(false)}>
            Import {report?.dryRun ? report.imported : ''} valid rows
          </button>
          {busy && <span className="small muted">Checking…</span>}
        </div>
      </div>

      {report && (
        <div className="card">
          <OkAlert
            message={
              report.dryRun
                ? `Preview: ${report.imported} of ${report.total} rows are valid, ${report.failed} would be rejected${report.skipped ? `, ${report.skipped} are already in the bank` : ''}. Nothing was saved yet.`
                : `Imported ${report.imported} questions into NEEDS_REVIEW; ${report.failed} rows rejected${report.skipped ? `, ${report.skipped} were already in the bank` : ''}.`
            }
          />
          {!report.dryRun && report.imported > 0 && (
            <p>
              <Link className="btn btn-primary" href="/review">
                Review imported questions
              </Link>
            </p>
          )}
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th className="num">Row</th>
                  <th>Result</th>
                  <th>Problems</th>
                </tr>
              </thead>
              <tbody>
                {report.rows
                  .filter((r) => !r.ok || r.issues.length)
                  .map((r) => (
                    <tr key={r.row}>
                      <td className="num">{r.row}</td>
                      <td>
                        {r.ok ? (
                          r.questionId ? (
                            <Link href={`/questions/${r.questionId}`}>imported (warnings)</Link>
                          ) : (
                            <span className="badge badge-warn">valid, with warnings</span>
                          )
                        ) : r.issues[0]?.code === 'ALREADY_IMPORTED' ? (
                          <span className="badge badge-warn">already in bank</span>
                        ) : (
                          <span className="badge badge-danger">rejected</span>
                        )}
                      </td>
                      <td className="small">{r.issues.map((i) => i.message).join(' · ')}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
            {report.rows.every((r) => r.ok && !r.issues.length) && <div className="empty">Every row passed all checks.</div>}
          </div>
        </div>
      )}
    </>
  );
}
