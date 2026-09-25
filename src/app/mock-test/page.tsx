import type { Metadata } from "next";
import { STATES, STATE_SHORT } from "@/data/states";
import { MOCK_TESTS } from "@/data/mockTests";
import { SUBJECT_MAP } from "@/data/subjects";
import { Breadcrumb, DarkHero, ExamToggle, TestGroupCard, TestGroup, StateChip } from "@/components/app/TestList";
import { SectionTitle } from "@/components/app/primitives";
import { Rocket, Timer, Languages, BarChart3, Target } from "lucide-react";
import type { ExamType } from "@/types";

export const metadata: Metadata = {
  title: "State Police Mock Tests — Constable & SI",
  description: "Full mock tests aur subject tests — real timer, question palette aur detailed result analysis ke saath. Sabhi 9 states ke Police Constable aur SI ke liye.",
  alternates: { canonical: "/mock-test" },
};

export default async function MockTestPage({
  searchParams,
}: {
  searchParams: Promise<{ state?: string; exam?: string }>;
}) {
  const sp = await searchParams;
  const exam: ExamType = sp.exam === "si" ? "si" : "constable";
  const stateFilter = STATES.find((s) => s.code === sp.state)?.code;
  const examLabel = exam === "constable" ? "Constable" : "SI";

  const mocks = MOCK_TESTS.filter((m) => m.exam === exam && (!stateFilter || m.state === stateFilter));

  const groups: TestGroup[] = STATES.filter((s) => !stateFilter || s.code === stateFilter)
    .map((s) => ({
      key: s.code,
      badge: STATE_SHORT[s.code],
      title: `${s.hinglishName} Police ${examLabel} — Mock Tests`,
      rows: mocks
        .filter((m) => m.state === s.code)
        .map((m) => ({
          id: m.id,
          href: `/mock-test/${m.id}`,
          title: m.type === "full" ? "Full Mock Test" : SUBJECT_MAP[m.subject ?? ""]?.hinglishName ?? m.title,
          chip: m.type === "full" ? "FULL" : "SUBJECT",
          sub: m.type === "full" ? "Sabhi subjects · real exam jaisa" : "Ek subject ka test",
          questions: m.questionCount,
          minutes: m.durationMinutes,
          marks: m.questionCount * m.marksPerQuestion,
        })),
    }))
    .filter((g) => g.rows.length > 0);

  const qs = (params: Record<string, string | undefined>) => {
    const u = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => v && u.set(k, v));
    const s = u.toString();
    return s ? `/mock-test?${s}` : "/mock-test";
  };

  return (
    <div>
      <div className="bg-[#eef1f6]">
        <h1 className="container-page max-w-3xl py-5 font-display text-[1.45rem] font-semibold leading-snug text-brand-dark">
          Free State Police Mock Tests — Online in Hinglish
        </h1>
      </div>
      <Breadcrumb items={[{ label: "Home", href: "/" }, { label: "Mock Tests", href: "/mock-test" }, { label: examLabel }]} />

      <div className="container-page max-w-3xl space-y-5 py-5">
        <DarkHero
          icon={<Rocket size={30} className="text-white" />}
          title={`Police ${examLabel} Mock Tests`}
          meta={`Full mocks + subject tests · ${STATES.length} states`}
          chips={[
            { icon: <Rocket size={15} className="text-orange-300" />, label: `${mocks.length} Tests` },
            { icon: <Timer size={15} className="text-sky-300" />, label: "Real Timer" },
            { icon: <Languages size={15} className="text-emerald-300" />, label: "Hinglish" },
          ]}
        />

        <p className="text-[1.05rem] leading-relaxed text-slate-600">
          Real exam jaisa experience — <strong className="text-brand-dark">timer, question palette, mark for review</strong>{" "}
          aur submit ke baad score, accuracy, subject-wise analysis aur har question ka solution.
        </p>

        <ExamToggle
          options={[
            { href: qs({ exam: "constable", state: stateFilter }), label: "Constable", active: exam === "constable", icon: <Target size={19} /> },
            { href: qs({ exam: "si", state: stateFilter }), label: "Sub-Inspector", active: exam === "si", icon: <BarChart3 size={19} /> },
          ]}
        />

        <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
          <StateChip href={qs({ exam })} label="Sabhi States" active={!stateFilter} />
          {STATES.map((s) => (
            <StateChip key={s.code} href={qs({ exam, state: s.code })} label={s.hinglishName} active={stateFilter === s.code} />
          ))}
        </div>

        <SectionTitle title={`Police ${examLabel} — Mock Tests`} count={`${mocks.length} Tests`} />

        <div className="space-y-4">
          {groups.map((g, i) => (
            <TestGroupCard key={g.key} group={g} defaultOpen={i === 0 || !!stateFilter} />
          ))}
        </div>
      </div>
    </div>
  );
}

