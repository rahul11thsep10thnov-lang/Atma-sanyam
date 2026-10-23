'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useApi } from '@/lib/api';
import { fmtDate } from '@/lib/format';
import { ErrorAlert, Forbidden, Kpi, PageHead, StatusBadge } from '@/components/ui';
import { useCan } from '@/components/ConsoleShell';

interface Row {
  id: string; section: string; subject: string; topic: string; subtopic: string; title: string; recommendedAge: number; difficulty: string; level: number; status: string; origin: string; adminEdited: boolean;
  stepCount: number; mappings: number; verifiedMappings: number; updatedAt: string; publishedAt: string | null;
}
interface Overview {
  total: number; published: number; byStatus: Record<string, number>; bySection: Record<string, number>; didYouKnowCoverage: number;
  subjects: { key: string; section: string; name: string; total: number; published: number; byAge: Record<string, number>; withDidYouKnow: number; verifiedMappings: number; pendingMappings: number }[];
}

const SECTIONS = ['study', 'music', 'sports'];

export default function LessonsPage() {
  const can = useCan();
  const [section, setSection] = useState('');
  const [subject, setSubject] = useState('');
  const [status, setStatus] = useState('');
  const [age, setAge] = useState('');
  const [search, setSearch] = useState('');
  const { data, error, loading } = useApi<{ total: number; items: Row[] }>(can('content:read') ? 'lessons' : null, { section, subject, status, age, search });
  const { data: overview } = useApi<Overview>(can('content:read') ? 'learning/overview' : null);
  if (!can('content:read')) return <Forbidden />;
  const subjects = overview?.subjects.filter((s) => !section || s.section === section) ?? [];
  return (
    <div>
      <PageHead title="Learning academy" subtitle="Study Playfully, Music and Sports lessons: the nine-step chapter template, curriculum mappings awaiting verification, and publishing." actions={can('content:write') && <Link href="/lessons/new" className="btn btn-primary btn-sm">New lesson</Link>} />
      {overview && (
        <div className="kpis">
          <Kpi label="Published lessons" value={overview.published} sub={`${overview.total} total · ${overview.byStatus.draft} draft · ${overview.byStatus.in_review} in review`} />
          <Kpi label="Study Playfully" value={overview.bySection.study} sub="published" />
          <Kpi label="Music" value={overview.bySection.music} sub="published" />
          <Kpi label="Sports" value={overview.bySection.sports} sub="published" />
          <Kpi label="Did You Know? coverage" value={`${overview.didYouKnowCoverage}%`} sub="published lessons with a sourced fact" />
          <Kpi label="Curriculum mappings" value={overview.subjects.reduce((n, s) => n + s.verifiedMappings, 0)} sub={`verified · ${overview.subjects.reduce((n, s) => n + s.pendingMappings, 0)} awaiting review`} />
        </div>
      )}
      <div className="filters">
        <select className="input" value={section} onChange={(e) => { setSection(e.target.value); setSubject(''); }} aria-label="Section"><option value="">All sections</option>{SECTIONS.map((s) => <option key={s} value={s}>{s}</option>)}</select>
        <select className="input" value={subject} onChange={(e) => setSubject(e.target.value)} aria-label="Subject"><option value="">All subjects</option>{subjects.map((s) => <option key={s.key} value={s.key}>{s.name} ({s.published}/{s.total})</option>)}</select>
        <select className="input" value={age} onChange={(e) => setAge(e.target.value)} aria-label="Age"><option value="">All ages</option>{[3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((a) => <option key={a} value={a}>Age {a}</option>)}</select>
        <select className="input" value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Status"><option value="">All statuses</option><option value="published">Published</option><option value="in_review">In review</option><option value="draft">Draft</option><option value="archived">Archived</option></select>
        <input className="input" placeholder="Search title, id or topic" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search" />
      </div>
      <ErrorAlert error={error} />
      <section className={`card ${loading ? 'loading-dim' : ''}`}>
        <div className="table-wrap"><table>
          <thead><tr><th>Lesson</th><th>Section · subject</th><th className="num">Age</th><th>Level</th><th className="num">Steps</th><th>Curriculum</th><th>Status</th><th>Updated</th></tr></thead>
          <tbody>
            {data?.items.map((l) => (
              <tr key={l.id}>
                <td><Link href={`/lessons/${l.id}`}>{l.title}</Link><div className="small muted">{l.id} · {l.topic}{l.subtopic ? ` · ${l.subtopic}` : ''}{l.adminEdited ? ' · edited' : l.origin === 'seed' ? ' · seed' : ''}</div></td>
                <td>{l.section} · {l.subject}</td>
                <td className="num">{l.recommendedAge}</td>
                <td>{l.difficulty} · L{l.level}</td>
                <td className="num">{l.stepCount}{l.stepCount !== 9 && <span className="badge badge-warn" style={{ marginLeft: 6 }}>template</span>}</td>
                <td className="small">{l.mappings ? `${l.verifiedMappings}/${l.mappings} verified` : '—'}</td>
                <td><StatusBadge status={l.status} /></td>
                <td className="small muted">{fmtDate(l.updatedAt)}</td>
              </tr>
            ))}
            {data && data.items.length === 0 && <tr><td colSpan={8} className="empty">No lessons match.</td></tr>}
          </tbody>
        </table></div>
      </section>
      {overview && (
        <section className="card" style={{ marginTop: 16 }}>
          <div className="card-head"><h2>Coverage by subject and age</h2><span className="small muted">Published lessons per recommended age. Empty cells are honest gaps shown to children as “coming soon” or “other ages”.</span></div>
          <div className="table-wrap"><table>
            <thead><tr><th>Subject</th>{[3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((a) => <th key={a} className="num">{a}</th>)}<th className="num">DYK</th><th className="num">Verified</th></tr></thead>
            <tbody>
              {overview.subjects.map((s) => (
                <tr key={s.key}>
                  <td>{s.name}<div className="small muted">{s.section}</div></td>
                  {[3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((a) => <td key={a} className="num">{s.byAge[String(a)] || <span className="muted">·</span>}</td>)}
                  <td className="num">{s.withDidYouKnow}/{s.published}</td>
                  <td className="num">{s.verifiedMappings}/{s.verifiedMappings + s.pendingMappings}</td>
                </tr>
              ))}
            </tbody>
          </table></div>
        </section>
      )}
    </div>
  );
}
