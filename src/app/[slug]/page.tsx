import { notFound } from "next/navigation";
import Link from "next/link";
import { EXAM_CONFIGS, getExamConfig } from "@/data/examConfigs";
import { getState } from "@/data/states";
import { getQuestionsForProfile, getSubjectsForProfile } from "@/data/questions";
import { getMocksForProfile } from "@/data/mockTests";
import { getPyqPapersForProfile } from "@/data/pyq";
import { getUpdatesForProfile } from "@/data/examUpdates";
import { STUDY_NOTE_MAP } from "@/data/studyNotes";
import { SUBJECT_MAP } from "@/data/subjects";
import OfficialFactRow from "@/components/OfficialFactRow";
import DisclaimerBanner from "@/components/ui/DisclaimerBanner";
import Badge from "@/components/ui/Badge";
import Tabs, { TabDef } from "@/components/ui/Tabs";
import { formatDate } from "@/lib/utils";
import type { Metadata } from "next";
import {
  Users,
  Calendar,
  ListChecks,
  Timer,
  Hash,
  MinusCircle,
} from "lucide-react";

export function generateStaticParams() {
  return EXAM_CONFIGS.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const cfg = getExamConfig(slug);
  if (!cfg) return {};
  const state = getState(cfg.state)!;
  const title = `${cfg.title} — Syllabus, Pattern, PYQ, Mock Test`;
  const description = `${cfg.title} ki complete preparation: eligibility, syllabus, exam pattern, PYQ, mock tests aur ${state.hinglishName} State GK — sab kuch Hinglish mein.`;
  return {
    title,
    description,
    alternates: { canonical: `/${slug}` },
    openGraph: { title, description },
  };
}

export default async function ExamProfilePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const cfg = getExamConfig(slug);
  if (!cfg) notFound();

  const state = getState(cfg.state)!;
  const examLabel = cfg.exam === "constable" ? "Constable" : "SI";
  const questions = getQuestionsForProfile(cfg.state, cfg.exam);
  const subjects = getSubjectsForProfile(cfg.state, cfg.exam);
  const mocks = getMocksForProfile(cfg.state, cfg.exam);
  const pyqPapers = getPyqPapersForProfile(cfg.state, cfg.exam);
  const updates = getUpdatesForProfile(cfg.state, cfg.exam);
  const stateGkNote = STUDY_NOTE_MAP[`${cfg.state}-gk-quick-notes`];

  const tabs: TabDef[] = [
    {
      key: "overview",
      label: "Overview",
      content: (
        <div className="space-y-4">
          <p className="text-sm leading-relaxed text-gray-700">{cfg.overview}</p>
          <div className="card p-4">
            <h3 className="text-sm font-bold text-gray-900 mb-2">Eligibility</h3>
            <p className="text-sm text-gray-700">{cfg.eligibility}</p>
          </div>
          <div className="card p-4 divide-y divide-gray-100">
            <OfficialFactRow label="Age Limit" fact={cfg.ageLimit} />
            <OfficialFactRow
              label="Educational Qualification"
              fact={cfg.educationalQualification}
            />
            <OfficialFactRow label="Vacancy" fact={cfg.vacancy} />
            <OfficialFactRow label="Application Start" fact={cfg.applicationStart} />
            <OfficialFactRow label="Application End" fact={cfg.applicationEnd} />
            <OfficialFactRow label="Exam Date" fact={cfg.examDate} />
          </div>
          <div className="card p-4">
            <h3 className="text-sm font-bold text-gray-900 mb-2">Selection Process</h3>
            <ol className="space-y-1.5">
              {cfg.selectionProcess.map((step, i) => (
                <li key={step} className="flex items-center gap-2 text-sm text-gray-700">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-50 text-[11px] font-bold text-brand-navy">
                    {i + 1}
                  </span>
                  {step}
                </li>
              ))}
            </ol>
          </div>
          <div className="card p-4">
            <h3 className="text-sm font-bold text-gray-900 mb-2">Medical Requirements</h3>
            <p className="text-sm text-gray-700">{cfg.medicalRequirements}</p>
          </div>
          <DisclaimerBanner>
            Cut-off: {cfg.cutoffNote} Result: {cfg.resultNote}
          </DisclaimerBanner>
        </div>
      ),
    },
    {
      key: "syllabus",
      label: "Syllabus",
      content: (
        <div className="space-y-4">
          {cfg.syllabus.map((s) => (
            <div key={s.subject} className="card p-4">
              <h3 className="text-sm font-bold text-gray-900">{s.subject}</h3>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {s.topics.map((t) => (
                  <Badge key={t} tone="navy">
                    {t}
                  </Badge>
                ))}
              </div>
            </div>
          ))}
        </div>
      ),
    },
    {
      key: "pattern",
      label: "Pattern",
      content: (
        <div className="space-y-4">
          <DisclaimerBanner>
            Exam pattern indicative hai, pichhle recruitment cycles par
            based. Naya notification aane par yahan update hoga — hamesha
            official notification se final confirm karein.
          </DisclaimerBanner>
          <div className="card p-4 divide-y divide-gray-100">
            <div className="flex items-center justify-between py-2.5">
              <span className="text-sm text-gray-600">Mode</span>
              <span className="text-sm font-semibold text-gray-900">{cfg.pattern.mode}</span>
            </div>
            <OfficialFactRow label="Total Questions" fact={cfg.pattern.totalQuestions} />
            <OfficialFactRow label="Total Marks" fact={cfg.pattern.totalMarks} />
            <OfficialFactRow
              label="Duration"
              fact={cfg.pattern.durationMinutes}
              format={(v) => `${v} minute`}
            />
            <OfficialFactRow label="Negative Marking" fact={cfg.pattern.negativeMarking} />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <QuickStat icon={<Hash size={16} />} label="Subjects" value={String(subjects.length)} />
            <QuickStat icon={<ListChecks size={16} />} label="Sample Questions" value={String(questions.length)} />
            <QuickStat icon={<Timer size={16} />} label="Mock Tests" value={String(mocks.length)} />
            <QuickStat icon={<MinusCircle size={16} />} label="PYQ Sets" value={String(pyqPapers.length)} />
          </div>
        </div>
      ),
    },
    {
      key: "pyq",
      label: "PYQ",
      content: (
        <div className="space-y-3">
          <DisclaimerBanner>
            Yeh sample/practice papers hain (asli official PYQ copyrighted
            hone ki wajah se copy nahi kiye gaye). Official past papers ke
            liye {state.policeBoardShort} ki website dekhein.
          </DisclaimerBanner>
          {pyqPapers.map((p) => (
            <Link
              key={p.id}
              href={`/pyq/${p.id}`}
              className="card p-4 flex items-center justify-between hover:shadow-md transition-shadow"
            >
              <div>
                <p className="text-sm font-bold text-gray-900">{p.title}</p>
                <p className="text-xs text-gray-500 mt-0.5">{p.questionIds.length} Questions · Year {p.year}</p>
              </div>
              <Badge tone="gold">Sample</Badge>
            </Link>
          ))}
        </div>
      ),
    },
    {
      key: "mock",
      label: "Mock Tests",
      content: (
        <div className="space-y-3">
          {mocks.map((m) => (
            <Link
              key={m.id}
              href={`/mock-test/${m.id}`}
              className="card p-4 flex items-center justify-between hover:shadow-md transition-shadow"
            >
              <div>
                <p className="text-sm font-bold text-gray-900">{m.title}</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {m.questionCount} Q · {m.durationMinutes} min · {m.marksPerQuestion} marks/Q
                </p>
              </div>
              <span className="text-xs font-semibold text-brand-navy">Start →</span>
            </Link>
          ))}
        </div>
      ),
    },
    {
      key: "practice",
      label: "Practice",
      content: (
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            {questions.length} sample questions available across {subjects.length} subjects
            for {cfg.title}.
          </p>
          <div className="flex flex-wrap gap-2">
            {subjects.map((s) => (
              <Badge key={s} tone="navy">
                {SUBJECT_MAP[s]?.hinglishName ?? s}
              </Badge>
            ))}
          </div>
          <Link
            href={`/practice?state=${cfg.state}&exam=${cfg.exam}`}
            className="btn-primary inline-flex px-5 py-3 text-sm"
          >
            Quick Practice Start Karein
          </Link>
        </div>
      ),
    },
    {
      key: "physical",
      label: "Physical",
      content: (
        <div className="space-y-4">
          <DisclaimerBanner>
            Physical standards indicative hain — official notification se
            verify karein.
          </DisclaimerBanner>
          <div className="card p-4 overflow-x-auto">
            <h3 className="text-sm font-bold text-gray-900 mb-2">Physical Standards (PST)</h3>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 text-xs">
                  <th className="py-1.5 pr-3">Category</th>
                  <th className="py-1.5 pr-3">Height</th>
                  <th className="py-1.5 pr-3">Chest</th>
                </tr>
              </thead>
              <tbody>
                {cfg.physicalStandards.map((p) => (
                  <tr key={p.category} className="border-t border-gray-100">
                    <td className="py-1.5 pr-3 font-medium text-gray-800">{p.category}</td>
                    <td className="py-1.5 pr-3 text-gray-600">{p.height ?? "—"}</td>
                    <td className="py-1.5 pr-3 text-gray-600">{p.chest ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="card p-4">
            <h3 className="text-sm font-bold text-gray-900 mb-2">
              Physical Efficiency Test (PET)
            </h3>
            <ul className="space-y-1.5 text-sm text-gray-700">
              {cfg.physicalEfficiency.map((e) => (
                <li key={e.event} className="flex justify-between">
                  <span>{e.event}</span>
                  <span className="font-medium">{e.standard}</span>
                </li>
              ))}
            </ul>
          </div>
          <Link
            href={`/physical-test/${cfg.state}`}
            className="text-sm font-semibold text-brand-navy hover:underline"
          >
            {state.hinglishName} ke sabhi Physical Test details dekhein →
          </Link>
        </div>
      ),
    },
    {
      key: "updates",
      label: "Updates",
      content: (
        <div className="space-y-3">
          {updates.map((u) => (
            <div key={u.id} className="card p-4">
              <p className="text-sm font-bold text-gray-900">{u.title}</p>
              <p className="text-xs text-amber-700 mt-1">{u.status}</p>
              <p className="text-[11px] text-gray-400 mt-1">{formatDate(u.date)}</p>
            </div>
          ))}
        </div>
      ),
    },
    {
      key: "notes",
      label: "Notes",
      content: (
        <div className="space-y-3">
          {stateGkNote && (
            <Link
              href={`/study-notes/${stateGkNote.slug}`}
              className="card p-4 block hover:shadow-md transition-shadow"
            >
              <p className="text-sm font-bold text-gray-900">{stateGkNote.title}</p>
              <p className="text-xs text-gray-500 mt-1">{stateGkNote.quickConcept}</p>
            </Link>
          )}
          <Link href="/study-notes" className="text-sm font-semibold text-brand-navy hover:underline">
            Sabhi Study Notes dekhein →
          </Link>
        </div>
      ),
    },
  ];

  return (
    <div className="container-page py-8">
      <div className="mb-6">
        <div className="flex flex-wrap items-center gap-2 mb-2">
          <Badge tone={cfg.exam === "constable" ? "navy" : "gold"}>
            {examLabel}
          </Badge>
          <Badge tone="gray">{state.hinglishName}</Badge>
        </div>
        <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900">{cfg.title}</h1>
        <p className="mt-1 text-sm text-gray-600">
          {cfg.title} ki complete preparation — ek hi jagah.
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        <QuickStat icon={<Users size={16} />} label="Eligibility" value={examLabel === "SI" ? "Graduate" : "10+2"} />
        <QuickStat icon={<Calendar size={16} />} label="Age" value={String(cfg.ageLimit.value ?? "—")} small />
        <QuickStat icon={<ListChecks size={16} />} label="Questions" value={String(cfg.pattern.totalQuestions.value ?? "—")} />
        <QuickStat icon={<Timer size={16} />} label="Duration" value={cfg.pattern.durationMinutes.value ? `${cfg.pattern.durationMinutes.value} min` : "—"} />
      </div>

      <Tabs tabs={tabs} />
    </div>
  );
}

function QuickStat({
  icon,
  label,
  value,
  small,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  small?: boolean;
}) {
  return (
    <div className="card p-3">
      <div className="flex items-center gap-1.5 text-brand-navy">
        {icon}
        <span className="text-[11px] font-semibold uppercase text-gray-500">{label}</span>
      </div>
      <p className={`mt-1 font-bold text-gray-900 ${small ? "text-xs" : "text-sm"}`}>{value}</p>
    </div>
  );
}
