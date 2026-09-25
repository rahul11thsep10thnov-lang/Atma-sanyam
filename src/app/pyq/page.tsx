import type { Metadata } from "next";
import { STATES, STATE_SHORT } from "@/data/states";
import { PYQ_PAPERS } from "@/data/pyq";
import { SubjectTile } from "@/components/app/primitives";
import { Breadcrumb, DarkHero, ExamToggle, TestGroupCard, TestGroup, StateChip } from "@/components/app/TestList";
import { SectionTitle } from "@/components/app/primitives";
import { ClipboardList, Library, Languages, CheckCircle2, Target, BarChart3, Info } from "lucide-react";
import type { ExamType } from "@/types";

export const metadata: Metadata = {
  title: "Police PYQ — Practice Papers Online (Constable & SI)",
  description: "State-wise Police Constable aur SI practice papers online — answers, explanation aur score ke saath. UP, MP, Rajasthan, Bihar aur 5 aur states.",
  alternates: { canonical: "/pyq" },
};

export default async function PyqPage({
  searchParams,
}: {
  searchParams: Promise<{ state?: string; exam?: string }>;
}) {
  const sp = await searchParams;
  const exam: ExamType = sp.exam === "si" ? "si" : "constable";
  const stateFilter = STATES.find((s) => s.code === sp.state)?.code;
  const examLabel = exam === "constable" ? "Constable" : "SI";

  const papers = PYQ_PAPERS.filter((p) => p.exam === exam && (!stateFilter || p.state === stateFilter));
  const totalQs = papers.reduce((n, p) => n + p.questionIds.length, 0);

  const groups: TestGroup[] = STATES.filter((s) => !stateFilter || s.code === stateFilter)
    .map((s) => ({
      key: s.code,
      badge: STATE_SHORT[s.code],
      title: `${s.hinglishName} Police ${examLabel}`,
      rows: papers
        .filter((p) => p.state === s.code)
        .map((p, i) => ({
          id: p.id,
          href: `/pyq/${p.id}`,
          title: `Practice Set-${i + 1}`,
          chip: `S${i + 1}`,
          sub: "Sample practice paper",
          questions: p.questionIds.length,
          marks: p.questionIds.length * 2,
        })),
    }))
    .filter((g) => g.rows.length > 0);

  const qs = (params: Record<string, string | undefined>) => {
    const u = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => v && u.set(k, v));
    const s = u.toString();
    return s ? `/pyq?${s}` : "/pyq";
  };

  return (
    <div>
      <div className="bg-[#eef1f6]">
        <h1 className="container-page max-w-3xl py-5 font-display text-[1.45rem] font-semibold leading-snug text-brand-dark">
          Free Police PYQ Practice Papers — Online in Hinglish
        </h1>
      </div>
      <Breadcrumb items={[{ label: "Home", href: "/" }, { label: "PYQ Bank", href: "/pyq" }, { label: `${examLabel} Papers` }]} />

      <div className="container-page max-w-3xl space-y-5 py-5">
        <DarkHero
          icon={<ClipboardList size={30} className="text-white" />}
          title={`Police ${examLabel} Practice Papers`}
          meta={`Constable & SI · ${STATES.length} states · ${papers.length} sets`}
          chips={[
            { icon: <Library size={15} className="text-orange-300" />, label: `${papers.length} Sets · ${totalQs} Qs` },
            { icon: <Languages size={15} className="text-sky-300" />, label: "Hinglish" },
            { icon: <CheckCircle2 size={15} className="text-emerald-300" />, label: "Answers + Explanation" },
          ]}
        />

        <p className="text-[1.05rem] leading-relaxed text-slate-600">
          Apne state ke <strong className="text-brand-dark">Police {examLabel}</strong> practice papers online attempt
          karein — har question ka answer key aur short explanation ke saath.
        </p>

        <div className="flex items-start gap-2 rounded-xl border border-[#f5dd9a] bg-[#fffaeb] p-3 text-[14px] text-[#8a5a00]">
          <Info size={16} className="mt-0.5 shrink-0" />
          <p>
            Yeh hamari team ke banaye sample practice papers hain — official PYQ copyright ki wajah se copy nahi kiye
            gaye. Official papers ke liye apne state board ki website dekhein.
          </p>
        </div>

        <div>
          <p className="font-display text-[1.05rem] font-semibold text-brand-dark">Ek subject ek baar practice karein</p>
          <div className="mt-3 grid grid-cols-2 gap-2.5">
            <SubjectTile href={`/practice?exam=${exam}&subject=state-gk`} subject="state-gk" title="State GK" subtitle="State-wise questions" badge="NEW" />
            <SubjectTile href={`/practice?exam=${exam}&subject=reasoning`} subject="reasoning" title="Reasoning" subtitle="Practice questions" />
            <SubjectTile href={`/practice?exam=${exam}&subject=maths`} subject="maths" title="Maths" subtitle="Practice questions" />
            <SubjectTile href={`/practice?exam=${exam}&subject=polity`} subject="polity" title="Polity" subtitle="Practice questions" />
          </div>
        </div>

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

        <SectionTitle title={`Police ${examLabel} — Practice Papers`} count={`${papers.length} Papers`} />

        <div className="space-y-4">
          {groups.map((g, i) => (
            <TestGroupCard key={g.key} group={g} defaultOpen={i === 0 || !!stateFilter} />
          ))}
        </div>
      </div>
    </div>
  );
}

