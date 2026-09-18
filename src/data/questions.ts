import { Question, StateCode, ExamType, Difficulty } from "@/types";
import generated from "@/data/generated/questions.json";

export const QUESTIONS: Question[] = generated as Question[];

export const QUESTION_MAP: Record<string, Question> = QUESTIONS.reduce(
  (acc, q) => {
    acc[q.id] = q;
    return acc;
  },
  {} as Record<string, Question>
);

export function getQuestion(id: string): Question | undefined {
  return QUESTION_MAP[id];
}

export interface QuestionFilter {
  state?: StateCode;
  exam?: ExamType;
  subject?: string;
  topic?: string;
  difficulty?: Difficulty | "mixed";
}

export function filterQuestions(filter: QuestionFilter): Question[] {
  return QUESTIONS.filter((q) => {
    if (filter.state && q.state !== filter.state) return false;
    if (filter.exam && q.exam !== filter.exam) return false;
    if (filter.subject && q.subject !== filter.subject) return false;
    if (filter.topic && q.topic !== filter.topic) return false;
    if (filter.difficulty && filter.difficulty !== "mixed" && q.difficulty !== filter.difficulty) return false;
    return true;
  });
}

export function getQuestionsForProfile(state: StateCode, exam: ExamType): Question[] {
  return filterQuestions({ state, exam });
}

export function getStateGkQuestions(state: StateCode): Question[] {
  return QUESTIONS.filter((q) => q.state === state && q.subject === "state-gk");
}

export function getSubjectsForProfile(state: StateCode, exam: ExamType): string[] {
  const set = new Set(getQuestionsForProfile(state, exam).map((q) => q.subject));
  return Array.from(set);
}

export function getTopicsForSubject(state: StateCode, exam: ExamType, subject: string): string[] {
  const set = new Set(
    getQuestionsForProfile(state, exam)
      .filter((q) => q.subject === subject)
      .map((q) => q.topic)
  );
  return Array.from(set);
}

// Fisher-Yates shuffle, used client-side for practice/mock question order.
export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function pick<T>(arr: T[], count: number): T[] {
  return shuffle(arr).slice(0, count);
}
