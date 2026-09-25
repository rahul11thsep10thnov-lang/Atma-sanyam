import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getMockTest, MOCK_TESTS } from "@/data/mockTests";
import { getQuestion } from "@/data/questions";
import { getState } from "@/data/states";
import { SUBJECT_MAP } from "@/data/subjects";
import { getSubjectAccent } from "@/lib/accentColors";
import DisplayName from "@/components/app/DisplayName";
import { PaletteLegend } from "@/components/exam/QuestionPalette";
import { ClipboardList, Timer, Navigation, Award, Grid3x3, BookMarked, ArrowLeft } from "lucide-react";

export function generateStaticParams() {
  return MOCK_TESTS.map((m) => ({ id: m.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const mock = getMockTest(id);
  if (!mock) return {};
  return {
    title: mock.title,
    description: `${mock.title} — ${mock.questionCount} questions, ${mock.durationMinutes} minute. Timer, question palette aur detailed result analysis ke saath.`,
    alternates: { canonical: `/mock-test/${id}` },
  };
}

export default async function MockTestInstructionsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const mock = getMockTest(id);
  if (!mock) notFound();
  const state = getState(mock.state)!;
  const examLabel = mock.exam === "constable" ? "Constable" : "SI";

  const subjects = Array.from(
    new Set(mock.questionIds.map((qid) => getQuestion(qid)?.subject).filter((s): s is string => Boolean(s)))
  );
  const counts = new Map<string, number>();
  mock.questionIds.forEach((qid) => {
    const s = getQuestion(qid)?.subject;
    if (s) counts.set(s, (counts.get(s) ?? 0) + 1);
  });

  return (
    <div className="exam-shell min-h-dvh">
      {/* Test header */}
      <header className="sticky top-0 z-30 border-b border-[var(--card-border)] bg-white">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3">
          <Link
            href="/mock-test"
            aria-label="Back to tests"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-brand-dark hover:bg-gray-100"
          >
            <ArrowLeft size={22} />
          </Link>
          <div className="min-w-0">
            <p className="truncate font-display text-[1.1rem] font-bold text-brand-dark">{mock.title}</p>
            <p className="truncate font-display text-[14px] text-slate-500">
              {state.hinglishName} Police · {examLabel} · <DisplayName />
            </p>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-3 pt-4 pb-44 sm:px-4">
        <div className="overflow-hidden rounded-3xl border border-[var(--card-border)] bg-white">
          {/* Orange banner */}
          <div className="flex items-center gap-4 bg-gradient-to-r from-[#ff6a00] to-[#ff8b3d] px-5 py-6 text-white">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/20">
              <ClipboardList size={30} />
            </span>
            <div>
              <h1 className="font-display text-[1.6rem] font-bold leading-tight">General Instructions</h1>
              <p className="mt-0.5 text-[16px] text-white/90">Test shuru karne se pehle dhyan se padhein</p>
            </div>
          </div>

          <div className="px-5 py-6 sm:px-7">
            <Section icon={<Timer size={19} />} title="Time & Submission">
              <ol className="list-decimal space-y-3 pl-5 text-[17px] leading-relaxed text-slate-700 marker:font-medium">
                <li>
                  Is test me <strong className="text-brand-dark">{mock.questionCount} questions</strong> hain aur poore
                  test ke liye ek hi <strong className="text-brand-dark">{mock.durationMinutes}-minute</strong> timer
                  hai, jo upar dikhta rahega.
                </li>
                <li>
                  Timer zero hote hi test <strong className="text-brand-dark">automatically submit</strong> ho jaayega.
                </li>
                <li>
                  Aap pehle bhi <strong className="text-brand-dark">Submit Test</strong> button se submit kar sakte hain.
                  Submit ke baad answers <strong className="text-brand-dark">change nahi</strong> ho sakte.
                </li>
                <li>Submit karne se pehle aap kisi bhi question ya subject par kabhi bhi wapas ja sakte hain.</li>
              </ol>
            </Section>

            <Section icon={<Navigation size={19} />} title="Navigation">
              <ol className="list-decimal space-y-3 pl-5 text-[17px] leading-relaxed text-slate-700">
                <li>
                  <strong className="text-brand-dark">Next</strong> / <strong className="text-brand-dark">Prev</strong> se
                  questions ke beech move karein. Answer apne aap save hota hai.
                </li>
                <li>
                  <strong className="text-brand-dark">Mark</strong> se question ko review ke liye flag karein, aur{" "}
                  <strong className="text-brand-dark">Clear</strong> se apna selected answer hata dein.
                </li>
                <li>
                  Upar ke subject tabs se seedhe kisi bhi subject par jaayein.
                </li>
              </ol>
            </Section>

            <Section icon={<Grid3x3 size={19} />} title="Question Palette">
              <p className="mb-3 text-[17px] leading-relaxed text-slate-700">
                Palette button se sabhi questions ka status dekhein aur kisi bhi question par jump karein:
              </p>
              <PaletteLegend />
            </Section>

            <Section icon={<Award size={19} />} title="Marking Scheme">
              <div className="grid grid-cols-3 gap-2.5 text-center">
                <div className="rounded-2xl border border-[#bfe9d2] bg-brand-green-light p-3">
                  <p className="font-display text-2xl font-bold text-[#0b8a4e]">+{mock.marksPerQuestion}</p>
                  <p className="font-display text-sm text-slate-600">Correct</p>
                </div>
                <div className="rounded-2xl border border-[#f7c9c4] bg-brand-red-light p-3">
                  <p className="font-display text-2xl font-bold text-brand-red">{mock.negativeMarks ? `−${mock.negativeMarks}` : "0"}</p>
                  <p className="font-display text-sm text-slate-600">Wrong</p>
                </div>
                <div className="rounded-2xl border border-[var(--card-border)] bg-slate-50 p-3">
                  <p className="font-display text-2xl font-bold text-slate-500">0</p>
                  <p className="font-display text-sm text-slate-600">Unattempted</p>
                </div>
              </div>
            </Section>

            <Section icon={<BookMarked size={19} />} title="Subjects in this Test" last>
              <div className="flex flex-wrap gap-2">
                {subjects.map((s) => {
                  const a = getSubjectAccent(s);
                  return (
                    <span
                      key={s}
                      className="rounded-xl border-[1.5px] px-3 py-1.5 font-display text-[15px] font-semibold"
                      style={{ background: a.tileBg, borderColor: a.tileBorder, color: a.tileText }}
                    >
                      {SUBJECT_MAP[s]?.hinglishName ?? s} · {counts.get(s)}
                    </span>
                  );
                })}
              </div>
            </Section>
          </div>
        </div>
      </div>

      {/* Sticky action bar */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-[var(--card-border)] bg-white/95 backdrop-blur pb-safe">
        <div className="mx-auto grid max-w-3xl gap-2.5 px-4 py-3 sm:grid-cols-2">
          <Link href="/mock-test" className="btn-secondary py-3.5 text-center text-[17px]">
            ← Go to Tests
          </Link>
          <Link href={`/mock-test/${mock.id}/attempt`} className="btn-cta py-3.5 text-center text-[17px]">
            I am ready to begin ►
          </Link>
        </div>
      </div>
    </div>
  );
}

function Section({
  icon,
  title,
  children,
  last,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
  last?: boolean;
}) {
  return (
    <section className={last ? "" : "mb-7"}>
      <h2 className="flex items-center gap-2 border-b border-[#f3e3d3] pb-2.5 font-display text-[1.15rem] font-bold text-brand-orange">
        {icon}
        {title}
      </h2>
      <div className="pt-4">{children}</div>
    </section>
  );
}
