import { MockTestDef, StateCode, ExamType } from "@/types";
import { STATES } from "@/data/states";
import { getQuestionsForProfile, getSubjectsForProfile } from "@/data/questions";
import { SUBJECT_MAP } from "@/data/subjects";

function buildMocksForProfile(state: StateCode, exam: ExamType): MockTestDef[] {
  const all = getQuestionsForProfile(state, exam);
  const subjects = getSubjectsForProfile(state, exam);
  const mocks: MockTestDef[] = [];

  mocks.push({
    id: `${state}-${exam}-full-mock-1`,
    state,
    exam,
    title: `${exam === "constable" ? "Constable" : "SI"} Full Mock Test 1`,
    type: "full",
    questionCount: all.length,
    durationMinutes: exam === "constable" ? 20 : 25,
    marksPerQuestion: 2,
    negativeMarks: 0,
    questionIds: all.map((q) => q.id),
  });

  for (const subject of subjects) {
    const qs = all.filter((q) => q.subject === subject);
    if (qs.length < 3) continue;
    mocks.push({
      id: `${state}-${exam}-subject-${subject}`,
      state,
      exam,
      title: `${SUBJECT_MAP[subject]?.hinglishName ?? subject} Subject Test`,
      type: subject === "state-gk" ? "state_gk" : subject === "current-affairs" ? "current_affairs" : "subject",
      subject,
      questionCount: qs.length,
      durationMinutes: Math.max(10, qs.length),
      marksPerQuestion: 2,
      negativeMarks: 0,
      questionIds: qs.map((q) => q.id),
    });
  }

  return mocks;
}

export const MOCK_TESTS: MockTestDef[] = STATES.flatMap((s) => [
  ...buildMocksForProfile(s.code, "constable"),
  ...buildMocksForProfile(s.code, "si"),
]);

export const MOCK_TEST_MAP: Record<string, MockTestDef> = MOCK_TESTS.reduce(
  (acc, m) => {
    acc[m.id] = m;
    return acc;
  },
  {} as Record<string, MockTestDef>
);

export function getMockTest(id: string): MockTestDef | undefined {
  return MOCK_TEST_MAP[id];
}

export function getMocksForProfile(state: StateCode, exam: ExamType): MockTestDef[] {
  return MOCK_TESTS.filter((m) => m.state === state && m.exam === exam);
}
