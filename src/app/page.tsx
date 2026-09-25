import Link from "next/link";
import { STATES } from "@/data/states";
import { QUESTIONS } from "@/data/questions";
import { EXAM_CONFIGS } from "@/data/examConfigs";
import { getAccent } from "@/lib/accentColors";
import { CtaBar, SubjectTile } from "@/components/app/primitives";
import StateExamHub from "@/components/home/StateExamHub";
import ExamUpdatesCard from "@/components/home/ExamUpdatesCard";
import {
  Target,
  Library,
  ClipboardList,
  Shield,
  ArrowRight,
  Rocket,
  NotebookText,
  Dumbbell,
  Trophy,
  Lightbulb,
} from "lucide-react";

export default function Home() {
  const stats = [
    { value: `${QUESTIONS.length}+`, label: "Practice Questions" },
    { value: `${EXAM_CONFIGS.length}`, label: "Exam Profiles" },
    { value: `${STATES.length}`, label: "States Covered" },
  ];

  return (
    <div className="bg-gradient-to-b from-white via-[#f7f8fb] to-[var(--background)]">
      <div className="container-page max-w-3xl space-y-5 pb-4">
        {/* Hero */}
        <section className="pt-7 pb-2">
          <p className="eyebrow flex items-center gap-2 text-brand-orange">
            <span className="h-[3px] w-6 rounded-full bg-brand-orange" />
            State Police Exam Prep
          </p>
          <h1 className="mt-3 font-display text-[2.6rem] font-extrabold leading-[1.05] tracking-tight text-brand-dark sm:text-6xl">
            Police Mock Tests
            <br />
            <span className="text-brand-orange">&amp; PYQ Practice</span>
          </h1>
          <p className="mt-4 text-[1.15rem] leading-relaxed text-slate-600">
            UP, MP, Rajasthan, Bihar, Jharkhand, Uttarakhand, Haryana, Punjab
            aur Chhattisgarh Police Constable &amp; SI ke liye practice papers,
            full-length mock tests with real timer, aur detailed solutions —
            sab Hinglish mein.
          </p>
          <div className="mt-7 grid grid-cols-3 gap-3">
            {stats.map((s) => (
              <div key={s.label}>
                <p className="font-display text-[2.1rem] font-extrabold leading-none text-brand-orange sm:text-5xl">{s.value}</p>
                <p className="mt-2 font-display text-sm text-slate-500">{s.label}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Quiz of the day */}
        <section className="flex items-center gap-3 rounded-2xl border-[1.5px] border-[#fbcaa0] bg-[#fdf1e7] p-4">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-[#e5452f] shadow-sm">
            <Target size={26} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="eyebrow text-brand-orange">Quiz of the Day</p>
            <p className="mt-0.5 text-[15px] text-slate-600">Aaj: 10 Questions · 5 Min</p>
          </div>
          <Link href="/daily-quiz" className="btn-cta shrink-0 px-4 py-2.5 text-[15px]">
            Play Now →
          </Link>
        </section>

        {/* Subject-wise practice */}
        <section className="card card-accent p-4 sm:p-5" style={{ ["--accent" as string]: "#6d63f0" }}>
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand-purple-light text-brand-purple">
              <Library size={24} />
            </span>
            <div className="min-w-0">
              <p className="eyebrow text-[#5b5bd6]">Subject-wise Practice</p>
              <h2 className="mt-1 font-display text-[1.35rem] font-semibold leading-tight text-brand-dark">
                Police Exam Subject-wise Tests
              </h2>
              <p className="mt-1 text-[15px] text-slate-500">
                Ek subject ek baar · Easy &amp; Moderate · Free · Hinglish
              </p>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2.5">
            <SubjectTile href="/practice?state=up&exam=constable&subject=state-gk" subject="state-gk" title="State GK" subtitle="Apne state ka GK" />
            <SubjectTile href="/practice?state=up&exam=constable&subject=reasoning" subject="reasoning" title="Reasoning" subtitle="Series + coding" />
            <SubjectTile href="/practice?state=up&exam=constable&subject=maths" subject="maths" title="Maths" subtitle="Percentage + average" />
            <SubjectTile href="/practice?state=up&exam=constable&subject=polity" subject="polity" title="Polity" subtitle="Constitution basics" />
          </div>
          <CtaBar className="mt-4" href="/practice" label="Start Subject Practice" variant="purple" />
        </section>

        {/* State PYQ + Mock hub */}
        <StateExamHub />

        {/* Updates */}
        <ExamUpdatesCard />

        {/* Exams covered */}
        <section className="pt-3">
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-[#a16207] border border-[var(--card-border)]">
              <ClipboardList size={24} />
            </span>
            <div>
              <h2 className="font-display text-[1.45rem] font-bold text-brand-dark">Police Exams Covered</h2>
              <p className="mt-0.5 text-[15px] text-slate-500">
                Practice papers, mock tests aur State GK — har state ke Constable &amp; SI ke liye
              </p>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            {STATES.map((s, i) => {
              const a = getAccent(i);
              return (
                <Link
                  key={s.code}
                  href={`/exams/${s.code}`}
                  className="rounded-2xl border-[1.5px] bg-white p-4 transition-shadow hover:shadow-md"
                  style={{ borderColor: a.tileBorder }}
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: a.tileBg, color: a.border }}>
                    <Shield size={22} />
                  </span>
                  <p className="mt-3 font-display text-lg font-bold" style={{ color: a.tileText }}>
                    {s.hinglishName} Police
                  </p>
                  <p className="text-[15px] text-slate-500">Constable · SI</p>
                  <p className="mt-2 font-display text-sm font-medium" style={{ color: a.border }}>
                    {s.totalDistricts} jile · State GK
                  </p>
                </Link>
              );
            })}
          </div>
        </section>

        {/* More tools */}
        <section className="card p-4 sm:p-5">
          <p className="font-display text-base font-semibold text-brand-dark">Aur Tools</p>
          <div className="mt-3 grid grid-cols-2 gap-2.5">
            <ToolTile href="/study-notes" icon={NotebookText} title="Study Notes" sub="5-min revision" accent={2} />
            <ToolTile href="/physical-test" icon={Dumbbell} title="Physical Test" sub="PET / PST" accent={0} />
            <ToolTile href="/tricks" icon={Lightbulb} title="Smart Tricks" sub="Maths + memory" accent={5} />
            <ToolTile href="/leaderboard" icon={Trophy} title="Leaderboard" sub="Weekly rank" accent={1} />
          </div>
          <CtaBar className="mt-4" href="/mock-test" label="Sabhi Mock Tests Dekhein" icon={Rocket} variant="dark" pill="Open" />
        </section>

        {/* About block */}
        <section className="card p-5">
          <span className="inline-block rounded-full border border-brand-orange/40 px-4 py-1.5 eyebrow text-brand-orange">
            Exam Preparation
          </span>
          <h2 className="mt-3 font-display text-xl font-bold text-brand-dark">
            Police exam ki taiyari, simple tareeke se
          </h2>
          <p className="mt-2 text-[16px] leading-relaxed text-slate-600">
            Har state ka exam pattern alag hota hai. Isliye yahan har state ke
            Constable aur SI ke liye alag syllabus, practice papers, mock tests
            aur physical test details hain. Regular mock practice se speed,
            accuracy aur confidence badhta hai — aur detailed result se pata
            chalta hai ki kaunse topics dobara revise karne hain.
          </p>
          <Link href="/exams" className="mt-4 inline-flex items-center gap-1.5 font-display font-semibold text-brand-orange">
            Apna exam choose karein <ArrowRight size={16} />
          </Link>
        </section>
      </div>
    </div>
  );
}

function ToolTile({
  href,
  icon: Icon,
  title,
  sub,
  accent,
}: {
  href: string;
  icon: typeof Trophy;
  title: string;
  sub: string;
  accent: number;
}) {
  const a = getAccent(accent);
  return (
    <Link
      href={href}
      className="tile"
      style={{ ["--tile-bg" as string]: a.tileBg, ["--tile-border" as string]: a.tileBorder, ["--tile-text" as string]: a.tileText }}
    >
      <span className="tile-icon">
        <Icon size={17} />
      </span>
      <span className="min-w-0">
        <span className="block truncate font-display text-[15px] font-semibold text-brand-dark">{title}</span>
        <span className="block truncate text-[13px] text-slate-500">{sub}</span>
      </span>
    </Link>
  );
}
