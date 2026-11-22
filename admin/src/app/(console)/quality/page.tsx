'use client';

import Link from 'next/link';
import { useState } from 'react';
import { EMPTY_SCOPE, ScopePicker, type Scope } from '@/components/ScopePicker';
import { DifficultyBadge, ErrorAlert, Kpi, Loading, PageHead, StatusBadge } from '@/components/ui';
import { useApi } from '@/lib/api';
import { useTaxonomy } from '@/lib/useTaxonomy';

type Flag = 'too_easy' | 'too_hard' | 'key_suspect' | 'dead_distractor' | 'high_skip';

interface Item {
  questionId: string;
  questionText: string;
  status: string;
  difficulty: string;
  subjectName: string;
  chapterName: string;
  correctOption: string;
  served: number;
  answered: number;
  accuracy: number | null;
  skipRate: number | null;
  avgSeconds: number | null;
  optionCounts: Record<string, number>;
  flags: Flag[];
}

interface Quality {
  minSample: number;
  content: {
    total: number;
    published: number;
    awaitingReview: number;
    missingExplanation: number;
    missingSource: number;
    possibleDuplicates: number;
    staleFacts: number;
    difficulty: { easy: number; medium: number; hard: number };
  };
  performance: { questionsWithAnswers: number; questionsWithEnoughData: number; flagCounts: Record<Flag, number> };
  flagDescriptions: Record<Flag, string>;
  items: Item[];
}

const FLAG_LABEL: Record<Flag, string> = {
  key_suspect: 'Check answer key',
  too_hard: 'Too hard',
  too_easy: 'Too easy',
  dead_distractor: 'Weak option',
  high_skip: 'Often skipped',
};

export default function QualityPage() {
  const { tree } = useTaxonomy();
  const [scope, setScope] = useState<Scope>(EMPTY_SCOPE);
  const [minSample, setMinSample] = useState(30);
  const [flag, setFlag] = useState<Flag | ''>('');
  const { data, error } = useApi<Quality>('questions/quality', {
    examId: scope.examId,
    subjectId: scope.subjectId,
    chapterId: scope.chapterId,
    minSample,
    flag,
  });

  return (
    <>
      <PageHead title="Question Quality" subtitle="Bank health and how questions perform in real tests" />
      <div className="card row" style={{ flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
        <ScopePicker tree={tree} value={scope} onChange={setScope} required="none" />
        <label className="field">
          <span>Minimum answers for a flag</span>
          <select value={minSample} onChange={(e) => setMinSample(Number(e.target.value))}>
            {[10, 30, 50, 100, 300].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
      </div>
      <ErrorAlert error={error} />
      {!data ? (
        !error && <Loading />
      ) : (
        <>
          <h3 style={{ marginBottom: 8 }}>Content</h3>
          <div className="kpis">
            <Kpi label="Questions" value={data.content.total} sub={`${data.content.published} published`} />
            <Kpi label="Awaiting review" value={data.content.awaitingReview} />
            <Kpi label="No explanation" value={data.content.missingExplanation} />
            <Kpi label="No source" value={data.content.missingSource} sub="Not verifiable against a paper or book" />
            <Kpi label="Possible duplicates" value={data.content.possibleDuplicates} />
            <Kpi label="Facts older than 2 years" value={data.content.staleFacts} sub="By “valid as of” date" />
            <Kpi
              label="Easy / Medium / Hard"
              value={`${data.content.difficulty.easy} / ${data.content.difficulty.medium} / ${data.content.difficulty.hard}`}
            />
          </div>

          <h3 style={{ marginBottom: 8 }}>Performance</h3>
          <p className="small muted" style={{ marginBottom: 8 }}>
            {data.performance.questionsWithAnswers} questions have answers from finished tests; {data.performance.questionsWithEnoughData} have at least{' '}
            {data.minSample}, the minimum before a question is flagged.
          </p>
          <div className="row" style={{ flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
            <button className={`btn btn-sm ${flag === '' ? 'btn-primary' : ''}`} onClick={() => setFlag('')}>
              All flagged
            </button>
            {(Object.keys(FLAG_LABEL) as Flag[]).map((k) => (
              <button key={k} className={`btn btn-sm ${flag === k ? 'btn-primary' : ''}`} title={data.flagDescriptions[k]} onClick={() => setFlag(k)}>
                {FLAG_LABEL[k]} ({data.performance.flagCounts[k] ?? 0})
              </button>
            ))}
          </div>
          {flag && <p className="small muted" style={{ marginBottom: 8 }}>{data.flagDescriptions[flag]}</p>}
          <div className="card">
            {data.items.length === 0 ? (
              <p className="muted">Nothing flagged{data.performance.questionsWithEnoughData === 0 ? ' yet — not enough answers so far' : ''}.</p>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Question</th>
                      <th>Flags</th>
                      <th>Answered</th>
                      <th>Correct</th>
                      <th>Skipped</th>
                      <th>Avg time</th>
                      <th>Choices</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.items.map((i) => (
                      <tr key={i.questionId}>
                        <td style={{ maxWidth: 380 }}>
                          <Link href={`/questions/${i.questionId}`}>{i.questionText.length > 120 ? `${i.questionText.slice(0, 120)}…` : i.questionText}</Link>
                          <div className="small muted">
                            {i.subjectName} › {i.chapterName} <StatusBadge status={i.status} /> <DifficultyBadge difficulty={i.difficulty} />
                          </div>
                        </td>
                        <td className="small">{i.flags.map((f) => FLAG_LABEL[f]).join(', ')}</td>
                        <td>{i.answered}</td>
                        <td>{i.accuracy == null ? '—' : `${i.accuracy}%`}</td>
                        <td>{i.skipRate == null ? '—' : `${i.skipRate}%`}</td>
                        <td>{i.avgSeconds == null ? '—' : `${i.avgSeconds}s`}</td>
                        <td className="small" style={{ whiteSpace: 'nowrap' }}>
                          {Object.entries(i.optionCounts).map(([l, n]) => (
                            <span key={l} style={{ marginRight: 6, fontWeight: l === i.correctOption ? 700 : 400 }}>
                              {l}:{n}
                            </span>
                          ))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </>
  );
}
