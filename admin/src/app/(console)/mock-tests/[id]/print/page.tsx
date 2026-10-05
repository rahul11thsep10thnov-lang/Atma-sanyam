'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Hind } from 'next/font/google';
import { useState } from 'react';
import { ErrorAlert, Loading } from '@/components/ui';
import { useApi } from '@/lib/api';
import { languageName } from '@/lib/useTaxonomy';

// Devanagari-capable face so Hindi papers print the same on every computer.
const hind = Hind({ subsets: ['latin', 'devanagari'], weight: ['400', '500', '600', '700'] });

interface PrintTest {
  id: string;
  title: string;
  description: string | null;
  examName: string;
  language: string;
  kind: 'full' | 'subject';
  status: string;
  durationMinutes: number;
  totalQuestions: number;
  marksPerQuestion: number;
  negativeMarks: number;
  questions: {
    id: string;
    position: number;
    subjectName: string;
    chapterName: string;
    questionText: string;
    difficulty: string;
    correctOption: string;
    explanation: string | null;
    options: { label: string; text: string }[];
  }[];
}

type View = 'both' | 'paper' | 'key';

const TEXT = {
  en: {
    paper: 'Question Paper',
    key: 'Answer Key & Solutions',
    time: 'Time allowed',
    minutes: 'minutes',
    maxMarks: 'Maximum marks',
    questions: 'Questions',
    marking: 'Marking',
    correct: (m: number) => `+${m} for each correct answer`,
    wrong: (n: number) => (n ? `−${n} for each wrong answer` : 'no negative marking'),
    name: 'Name',
    roll: 'Roll no.',
    date: 'Date',
    instructionsTitle: 'Instructions',
    instructions: (q: number, m: number) => [
      `This paper has ${q} questions. Each question has four options; exactly one is correct.`,
      `Choose the best answer and mark it clearly on the answer sheet.`,
      `Unattempted questions carry no marks.`,
      `Use of calculators, phones or books is not allowed.`,
      `The paper carries a total of ${m} marks.`,
    ],
    section: 'Section',
    answer: 'Answer',
    ans: 'Ans',
    solutions: 'Solutions',
  },
  'hi-Latn': {
    paper: 'Question Paper',
    key: 'Answer Key aur Solutions',
    time: 'Samay',
    minutes: 'minute',
    maxMarks: 'Poorna ank',
    questions: 'Prashn',
    marking: 'Marking',
    correct: (m: number) => `Har sahi uttar par +${m}`,
    wrong: (n: number) => (n ? `Har galat uttar par −${n}` : 'Negative marking nahi'),
    name: 'Naam',
    roll: 'Roll no.',
    date: 'Tarikh',
    instructionsTitle: 'Nirdesh',
    instructions: (q: number, m: number) => [
      `Is paper mein ${q} prashn hain. Har prashn ke chaar vikalp hain; sirf ek sahi hai.`,
      `Sabse uchit uttar chunkar answer sheet par saaf nishaan lagayein.`,
      `Chhode gaye prashnon ke ank nahi milte.`,
      `Calculator, phone ya kitab ka upyog mana hai.`,
      `Paper ke kul ank ${m} hain.`,
    ],
    section: 'Section',
    answer: 'Uttar',
    ans: 'Uttar',
    solutions: 'Solutions',
  },
  hi: {
    paper: 'प्रश्न-पत्र',
    key: 'उत्तर-कुंजी एवं हल',
    time: 'समय',
    minutes: 'मिनट',
    maxMarks: 'पूर्णांक',
    questions: 'प्रश्न',
    marking: 'अंकन',
    correct: (m: number) => `प्रत्येक सही उत्तर के +${m} अंक`,
    wrong: (n: number) => (n ? `प्रत्येक गलत उत्तर के −${n} अंक` : 'ऋणात्मक अंकन नहीं'),
    name: 'नाम',
    roll: 'अनुक्रमांक',
    date: 'दिनांक',
    instructionsTitle: 'निर्देश',
    instructions: (q: number, m: number) => [
      `इस प्रश्न-पत्र में ${q} प्रश्न हैं। प्रत्येक प्रश्न के चार विकल्प हैं, जिनमें से केवल एक सही है।`,
      `सबसे उपयुक्त उत्तर चुनकर उत्तर-पत्रक पर स्पष्ट चिह्न लगाइए।`,
      `अनुत्तरित प्रश्नों के कोई अंक नहीं मिलेंगे।`,
      `कैलकुलेटर, मोबाइल या पुस्तक का प्रयोग वर्जित है।`,
      `प्रश्न-पत्र कुल ${m} अंक का है।`,
    ],
    section: 'खंड',
    answer: 'उत्तर',
    ans: 'उत्तर',
    solutions: 'हल',
  },
} as const;

function fmt(n: number) {
  return Number.isInteger(n) ? String(n) : String(+n.toFixed(2));
}

export default function PrintPage() {
  const { id } = useParams<{ id: string }>();
  const { data: t, error } = useApi<PrintTest>(`mock-tests/${id}`);
  const [view, setView] = useState<View>('both');
  const [detail, setDetail] = useState(true);

  if (!t) return error ? <ErrorAlert error={error} /> : <Loading />;

  const tx = TEXT[(t.language in TEXT ? t.language : 'en') as keyof typeof TEXT];
  const maxMarks = t.totalQuestions * t.marksPerQuestion;

  // Sections are runs of the same subject in question order.
  const sections: { name: string; items: PrintTest['questions'] }[] = [];
  for (const q of t.questions) {
    const last = sections[sections.length - 1];
    if (last && last.name === q.subjectName) last.items.push(q);
    else sections.push({ name: q.subjectName, items: [q] });
  }
  const showPaper = view === 'both' || view === 'paper';
  const showKey = view === 'both' || view === 'key';

  return (
    <div className={hind.className}>
      <div className="no-print card" style={{ marginBottom: 16 }}>
        <div className="card-head">
          <h2>Print / save as PDF</h2>
          <Link className="btn btn-sm" href={`/mock-tests/${id}`}>
            ← Back to test
          </Link>
        </div>
        <div className="row" style={{ marginBottom: 10 }}>
          <div className="segmented" role="tablist" aria-label="What to print">
            {(
              [
                ['both', 'Paper + answer key'],
                ['paper', 'Question paper only'],
                ['key', 'Answer key only'],
              ] as [View, string][]
            ).map(([v, label]) => (
              <button key={v} role="tab" aria-selected={view === v} onClick={() => setView(v)}>
                {label}
              </button>
            ))}
          </div>
          <label className="check" style={{ margin: 0 }}>
            <input type="checkbox" checked={detail} onChange={(e) => setDetail(e.target.checked)} />
            Show chapter and difficulty on the key
          </label>
          <button className="btn btn-primary" onClick={() => window.print()}>
            Print / Save as PDF
          </button>
        </div>
        <p className="small muted" style={{ margin: 0 }}>
          In the print window choose <strong>Save as PDF</strong> (or your printer), paper size <strong>A4</strong>, and switch off{' '}
          <strong>Headers and footers</strong>. For a candidate copy, print “Question paper only” — it contains no answers. The answer key
          is for staff only; keep it separate.
        </p>
      </div>

      <article className="paper" lang={t.language === 'hi' ? 'hi' : 'en'}>
        {showPaper && (
          <section>
            <header className="paper-head">
              <div className="paper-brand">
                Police<span>Exams</span>
              </div>
              <h1>{t.title}</h1>
              <div className="paper-sub">
                {t.examName} · {languageName(t.language)} · {tx.paper}
              </div>
              {t.description && <div className="paper-desc">{t.description}</div>}
            </header>

            <table className="paper-meta">
              <tbody>
                <tr>
                  <th>{tx.time}</th>
                  <td>
                    {t.durationMinutes} {tx.minutes}
                  </td>
                  <th>{tx.maxMarks}</th>
                  <td>{fmt(maxMarks)}</td>
                </tr>
                <tr>
                  <th>{tx.questions}</th>
                  <td>{t.totalQuestions}</td>
                  <th>{tx.marking}</th>
                  <td>
                    {tx.correct(t.marksPerQuestion)}; {tx.wrong(t.negativeMarks)}
                  </td>
                </tr>
              </tbody>
            </table>

            <div className="paper-candidate">
              <span>{tx.name}:</span>
              <span>{tx.roll}:</span>
              <span>{tx.date}:</span>
            </div>

            <div className="paper-instructions">
              <strong>{tx.instructionsTitle}</strong>
              <ol>
                {tx.instructions(t.totalQuestions, maxMarks).map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ol>
              {sections.length > 1 && (
                <div className="paper-sections">
                  {sections.map((s, i) => (
                    <span key={s.name + i}>
                      {tx.section} {String.fromCharCode(65 + i)}: {s.name} ({s.items.length})
                    </span>
                  ))}
                </div>
              )}
            </div>

            {sections.map((s, si) => (
              <div key={s.name + si} className="paper-section">
                {sections.length > 1 && (
                  <h2>
                    {tx.section} {String.fromCharCode(65 + si)} — {s.name}
                  </h2>
                )}
                {s.items.map((q) => {
                  const short = q.options.every((o) => o.text.length <= 26);
                  return (
                    <div key={q.id} className="paper-q">
                      <div className="paper-qtext">
                        <span className="paper-qno">{q.position}.</span>
                        <span>{q.questionText}</span>
                      </div>
                      <ol className={`paper-opts${short ? ' short' : ''}`} type="A">
                        {q.options.map((o) => (
                          <li key={o.label}>
                            <span className="paper-olabel">({o.label})</span> {o.text}
                          </li>
                        ))}
                      </ol>
                    </div>
                  );
                })}
              </div>
            ))}
            <div className="paper-end">— End of paper —</div>
          </section>
        )}

        {showKey && (
          <section className={showPaper ? 'paper-break' : undefined}>
            <header className="paper-head">
              <div className="paper-brand">
                Police<span>Exams</span>
              </div>
              <h1>{t.title}</h1>
              <div className="paper-sub">
                {tx.key} · {t.examName}
              </div>
              <div className="paper-staff">Staff copy — do not give to candidates</div>
            </header>

            <div className="paper-grid" aria-label="Answers at a glance">
              {t.questions.map((q) => (
                <span key={q.id}>
                  <b>{q.position}</b> {q.correctOption}
                </span>
              ))}
            </div>

            <h2 className="paper-h2">{tx.solutions}</h2>
            {t.questions.map((q) => {
              const right = q.options.find((o) => o.label === q.correctOption);
              return (
                <div key={q.id} className="paper-sol">
                  <div className="paper-qtext">
                    <span className="paper-qno">{q.position}.</span>
                    <span>{q.questionText}</span>
                  </div>
                  <div className="paper-ans">
                    <b>
                      {tx.ans}: ({q.correctOption})
                    </b>{' '}
                    {right?.text}
                  </div>
                  {q.explanation && <div className="paper-expl">{q.explanation}</div>}
                  {detail && (
                    <div className="paper-tags">
                      {q.subjectName} · {q.chapterName} · {q.difficulty}
                    </div>
                  )}
                </div>
              );
            })}
          </section>
        )}
      </article>
    </div>
  );
}
