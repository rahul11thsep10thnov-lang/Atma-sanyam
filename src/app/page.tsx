import Link from "next/link";
import { STATES } from "@/data/states";
import StateCard from "@/components/StateCard";
import Badge from "@/components/ui/Badge";
import { getRecentUpdates } from "@/data/examUpdates";
import { STUDY_NOTES } from "@/data/studyNotes";
import { PYQ_PAPERS } from "@/data/pyq";
import { MOCK_TESTS } from "@/data/mockTests";
import { formatDate } from "@/lib/utils";
import {
  PenSquare,
  Sparkles,
  Timer,
  FileText,
  MapPinned,
  Bell,
  Dumbbell,
  NotebookText,
  Trophy,
  ArrowRight,
} from "lucide-react";

export default function Home() {
  const updates = getRecentUpdates(6);
  const popularMocks = MOCK_TESTS.filter((m) => m.type === "full").slice(0, 6);
  const samplePyq = PYQ_PAPERS.slice(0, 6);
  const stateGkNotes = STUDY_NOTES.filter((n) => n.subject === "state-gk").slice(0, 6);

  return (
    <div>
      {/* Hero */}
      <section className="bg-gradient-to-b from-blue-50 to-white border-b border-[var(--card-border)]">
        <div className="container-page py-12 md:py-16 text-center">
          <p className="inline-block rounded-full bg-white border border-[var(--card-border)] px-3 py-1 text-xs font-semibold text-brand-navy mb-4">
            9 States · Constable + SI · 100% Hinglish
          </p>
          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-gray-900">
            POLICE<span className="text-brand-gold">EXAMS</span>
          </h1>
          <p className="mt-3 text-base md:text-lg font-semibold text-brand-navy">
            Police Constable &amp; SI ki taiyari — ek hi jagah
          </p>
          <p className="mt-3 max-w-2xl mx-auto text-sm md:text-base text-gray-600">
            UP, MP, Rajasthan, Bihar, Jharkhand, Uttarakhand, Haryana, Punjab
            aur Chhattisgarh Police exams ke liye simple practice, mocks,
            PYQs aur state-wise preparation.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Link href="/practice" className="btn-primary px-5 py-3 text-sm">
              Start Practice
            </Link>
            <Link href="/exams" className="btn-secondary px-5 py-3 text-sm bg-white">
              Choose Your State
            </Link>
            <Link href="/mock-test" className="btn-gold px-5 py-3 text-sm">
              Take Mock Test
            </Link>
          </div>
        </div>
      </section>

      {/* State selection */}
      <section className="container-page py-10">
        <SectionHeading title="Apna State Choose Karein" subtitle="9 states, Constable aur SI dono ke liye" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {STATES.map((s) => (
            <StateCard key={s.code} state={s} />
          ))}
        </div>
      </section>

      {/* Constable / SI selection */}
      <section className="container-page py-10">
        <SectionHeading title="Exam Category Choose Karein" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link href="/exams/constable" className="card p-6 hover:shadow-md transition-shadow">
            <Badge tone="navy">Police Constable</Badge>
            <h3 className="mt-3 text-lg font-bold text-gray-900">Constable Exams — 9 States</h3>
            <p className="mt-1 text-sm text-gray-600">
              10+2 level exams. Syllabus, pattern, PYQ, mock aur physical
              test — sab kuch ek jagah.
            </p>
            <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-brand-navy">
              Dekhein <ArrowRight size={14} />
            </span>
          </Link>
          <Link href="/exams/si" className="card p-6 hover:shadow-md transition-shadow">
            <Badge tone="gold">Police SI</Badge>
            <h3 className="mt-3 text-lg font-bold text-gray-900">Sub-Inspector Exams — 9 States</h3>
            <p className="mt-1 text-sm text-gray-600">
              Graduate level exams. Alag syllabus, pattern aur selection
              process — state-wise detail ke saath.
            </p>
            <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-brand-navy">
              Dekhein <ArrowRight size={14} />
            </span>
          </Link>
        </div>
      </section>

      {/* Quick Practice + Daily Quiz */}
      <section className="container-page py-10">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FeatureCard
            icon={<PenSquare size={20} />}
            title="Quick Practice"
            desc="State, exam, subject aur topic choose karein — 10/20/25/50 questions ka custom practice set banayein."
            href="/practice"
            cta="Practice Start Karein"
          />
          <FeatureCard
            icon={<Sparkles size={20} />}
            title="Aaj ka Police Quiz"
            desc="Roz ke 10 simple questions — Police GK, India GK, State GK, Reasoning, Maths aur Science se."
            href="/daily-quiz"
            cta="Aaj ka Quiz Khelein"
          />
        </div>
      </section>

      {/* Popular Mock Tests */}
      <section className="container-page py-10">
        <SectionHeading title="Popular Mock Tests" cta={{ label: "Sabhi Mock Tests", href: "/mock-test" }} />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {popularMocks.map((m) => (
            <Link
              key={m.id}
              href={`/mock-test/${m.id}`}
              className="card p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center gap-2 text-brand-navy">
                <Timer size={16} />
                <span className="text-xs font-semibold uppercase">{m.state} · {m.exam}</span>
              </div>
              <h3 className="mt-2 text-sm font-bold text-gray-900">{m.title}</h3>
              <p className="mt-1 text-xs text-gray-500">
                {m.questionCount} Questions · {m.durationMinutes} min
              </p>
            </Link>
          ))}
        </div>
      </section>

      {/* PYQ */}
      <section className="container-page py-10">
        <SectionHeading title="Previous Year Questions (PYQ)" cta={{ label: "Sabhi PYQ", href: "/pyq" }} />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {samplePyq.map((p) => (
            <Link key={p.id} href={`/pyq/${p.id}`} className="card p-4 hover:shadow-md transition-shadow">
              <div className="flex items-center gap-2 text-brand-navy">
                <FileText size={16} />
                <span className="text-xs font-semibold uppercase">{p.state} · {p.exam}</span>
              </div>
              <h3 className="mt-2 text-sm font-bold text-gray-900">{p.title}</h3>
              <p className="mt-1 text-xs text-gray-500">{p.questionIds.length} Questions · Year {p.year}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* State GK */}
      <section className="container-page py-10">
        <SectionHeading title="State GK" subtitle="Sabse bada section — har state ki history, geography, culture" cta={{ label: "Sabhi State GK", href: "/state-gk" }} />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {stateGkNotes.map((n) => (
            <Link key={n.id} href={`/study-notes/${n.slug}`} className="card p-4 hover:shadow-md transition-shadow">
              <div className="flex items-center gap-2 text-brand-navy">
                <MapPinned size={16} />
              </div>
              <h3 className="mt-2 text-sm font-bold text-gray-900">{n.title}</h3>
              <p className="mt-1 text-xs text-gray-500 line-clamp-2">{n.quickConcept}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* Latest Updates */}
      <section className="container-page py-10">
        <SectionHeading title="Latest Police Exam Updates" cta={{ label: "Sabhi Updates", href: "/exam-updates" }} />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {updates.map((u) => (
            <div key={u.id} className="card p-4">
              <div className="flex items-center gap-2 text-brand-navy">
                <Bell size={16} />
                <span className="text-xs font-semibold uppercase">{u.state} · {u.exam}</span>
              </div>
              <h3 className="mt-2 text-sm font-bold text-gray-900">{u.title}</h3>
              <p className="mt-1 text-xs text-amber-700">{u.status}</p>
              <p className="mt-1 text-[11px] text-gray-400">{formatDate(u.date)}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Physical Test + Study Notes + Leaderboard */}
      <section className="container-page py-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FeatureCard
            icon={<Dumbbell size={20} />}
            title="Physical Test"
            desc="Har state ki PET/PST details, height, chest aur running standards."
            href="/physical-test"
            cta="Details Dekhein"
          />
          <FeatureCard
            icon={<NotebookText size={20} />}
            title="Study Notes"
            desc="Short, exam-focused notes — Polity, State GK aur zyada."
            href="/study-notes"
            cta="Notes Padhein"
          />
          <FeatureCard
            icon={<Trophy size={20} />}
            title="Leaderboard"
            desc="Weekly aur monthly rank dekhein, apne state ke aspirants se compete karein."
            href="/leaderboard"
            cta="Leaderboard Dekhein"
          />
        </div>
      </section>
    </div>
  );
}

function SectionHeading({
  title,
  subtitle,
  cta,
}: {
  title: string;
  subtitle?: string;
  cta?: { label: string; href: string };
}) {
  return (
    <div className="flex items-end justify-between mb-5 gap-3">
      <div>
        <h2 className="text-xl md:text-2xl font-bold text-gray-900">{title}</h2>
        {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
      </div>
      {cta && (
        <Link href={cta.href} className="shrink-0 text-sm font-semibold text-brand-navy hover:underline">
          {cta.label} →
        </Link>
      )}
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  desc,
  href,
  cta,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
  href: string;
  cta: string;
}) {
  return (
    <Link href={href} className="card p-5 hover:shadow-md transition-shadow block">
      <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-brand-navy">
        {icon}
      </span>
      <h3 className="mt-3 text-base font-bold text-gray-900">{title}</h3>
      <p className="mt-1 text-sm text-gray-600">{desc}</p>
      <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-brand-navy">
        {cta} <ArrowRight size={14} />
      </span>
    </Link>
  );
}
