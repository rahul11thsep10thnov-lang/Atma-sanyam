import { PyqPaper, StateCode, ExamType } from "@/types";
import { STATES } from "@/data/states";
import { getQuestionsForProfile } from "@/data/questions";

// IMPORTANT: We do not have licensed access to real official past-year
// question papers for these boards. To respect copyright and the
// "never fabricate official data" rule, these are clearly labelled as
// SAMPLE practice papers built from our own admin-authored question bank —
// not actual leaked/copied official PYQs. Replace via the admin panel once
// verified official papers are digitised in-house.
function buildPyqForProfile(state: StateCode, exam: ExamType): PyqPaper[] {
  const all = getQuestionsForProfile(state, exam);
  const half = Math.ceil(all.length / 2);
  return [
    {
      id: `${state}-${exam}-practice-set-1`,
      state,
      exam,
      year: 2024,
      title: `${exam === "constable" ? "Constable" : "SI"} Practice Paper Set 1 (Sample)`,
      isSample: true,
      questionIds: all.slice(0, half).map((q) => q.id),
    },
    {
      id: `${state}-${exam}-practice-set-2`,
      state,
      exam,
      year: 2023,
      title: `${exam === "constable" ? "Constable" : "SI"} Practice Paper Set 2 (Sample)`,
      isSample: true,
      questionIds: all.slice(half).map((q) => q.id),
    },
  ];
}

export const PYQ_PAPERS: PyqPaper[] = STATES.flatMap((s) => [
  ...buildPyqForProfile(s.code, "constable"),
  ...buildPyqForProfile(s.code, "si"),
]);

export const PYQ_MAP: Record<string, PyqPaper> = PYQ_PAPERS.reduce(
  (acc, p) => {
    acc[p.id] = p;
    return acc;
  },
  {} as Record<string, PyqPaper>
);

export function getPyqPapersForProfile(state: StateCode, exam: ExamType): PyqPaper[] {
  return PYQ_PAPERS.filter((p) => p.state === state && p.exam === exam);
}
