// Learning academy types shared by the lesson engine and the screens. The
// shapes mirror backend/src/services/learningService.ts and the lessons
// table's JSON (LessonStep / CurriculumMapping in backend schema.ts).
import type { AgeBracket, CurriculumFramework } from '../types';

export type Section = 'study' | 'music' | 'sports';
export type StepKind = 'objective' | 'discover' | 'understand' | 'example' | 'tryIt' | 'realWorld' | 'revision' | 'didYouKnow' | 'challenge';

export interface Visual {
  kind: string;
  props?: Record<string, unknown>;
}

export interface Question {
  question: string;
  options: string[];
  correctIndex: number;
  explanation?: string;
}

export interface LessonStep {
  kind: StepKind;
  title?: string;
  text?: string;
  textByBracket?: Partial<Record<AgeBracket, string>>;
  visual?: Visual;
  example?: { steps: string[]; visual?: Visual };
  activity?: Record<string, unknown> & { kind: string };
  points?: string[];
  fact?: { headline: string; body: string; source: { title: string; publisher: string; url: string } };
  questions?: Question[];
  safety?: string;
}

export interface CurriculumMapping {
  framework: CurriculumFramework;
  board?: string;
  grade: string;
  syllabusTopic: string;
  learningOutcome?: string;
  sourceRef: string;
  verificationStatus: 'pending_review' | 'verified' | 'rejected';
  lastReviewedAt?: string;
  label?: string;
}

export interface LessonProgress {
  stepsDone: number;
  stepsTotal: number;
  activitiesCorrect: number;
  activitiesTotal: number;
  bestQuizScore: number | null;
  quizTotal: number | null;
  timeSeconds: number;
  completedAt: string | null;
  lastStepAt?: string;
}

export interface CurriculumLabel {
  status: 'verified' | 'pending' | 'none';
  text: string;
  mapping?: CurriculumMapping;
}

export interface LessonSummary {
  id: string;
  section: Section;
  subject: string;
  topic: string;
  subtopic: string;
  title: string;
  summary: string;
  recommendedAge: number;
  recommendedBracket: AgeBracket;
  minAge: number;
  maxAge: number;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  difficultyLabel: string;
  level: number;
  learningObjective: string;
  prerequisites: string[];
  estimatedMinutes: number;
  stepCount: number;
  hasDidYouKnow: boolean;
  adultAssisted: boolean;
  safetyNotes: string[];
  forMyAge: boolean;
  ageLabel: string;
  curriculum: CurriculumLabel | null;
  progress: LessonProgress | null;
}

export interface Lesson extends LessonSummary {
  steps: LessonStep[];
  curriculumMappings: CurriculumMapping[];
  sources: { title: string; publisher: string; url: string; accessedOn?: string }[];
  translations: Record<string, Record<string, unknown>>;
  status: string;
  publishedAt: string | null;
}

export interface SubjectInfo {
  key: string;
  section: Section;
  kind: 'academic' | 'instrument' | 'sport';
  name: string;
  emoji: string;
  color: string;
  description: string;
  ages: [number, number];
  topics: string[];
  safety: string[];
  adultAssistedBelowAge: number | null;
  blocked: boolean;
  lessonCount: number;
  lessonsForMyAge: number;
  agesAvailable: number[];
  availability: 'available' | 'other_ages' | 'coming_soon';
  completed: number;
  started: number;
  level: { age: number; bracket: AgeBracket; lessonsCompleted: number } | null;
}

export interface SectionInfo {
  key: Section;
  name: string;
  emoji: string;
  color: string;
  tagline: string;
  enabled: boolean;
  subjects: SubjectInfo[];
}

export interface LearningCatalogue {
  myAge: number;
  myBracket: AgeBracket;
  ages: number[];
  curriculum: { framework: CurriculumFramework | null; board: string | null; grade: string | null };
  goals: { subject: string; lessonsPerWeek: number }[];
  sections: SectionInfo[];
}

export interface LearningReport {
  myAge: number;
  curriculum: { framework: CurriculumFramework | null; board: string | null; grade: string | null };
  totals: { lessonsCompleted: number; lessonsInProgress: number; timeSeconds: number; quizCorrect: number; quizTotal: number; activitiesCorrect: number; activitiesTotal: number; streakDays: number; activeDays: number; thisWeek: { lessonsCompleted: number; timeSeconds: number } };
  sections: { key: Section; name: string; emoji: string; color: string; lessonsCompleted: number; timeSeconds: number; subjects: { key: string; name: string; emoji: string; color: string; kind: string; completed: number; inProgress: number; timeSeconds: number; quizCorrect: number; quizTotal: number; level: { age: number; bracket: AgeBracket; lessonsCompleted: number } | null; lastAt: string | null; blocked: boolean }[] }[];
  goals: { subject: string; name: string; emoji: string; lessonsPerWeek: number; doneThisWeek: number; met: boolean }[];
  nextLessons: LessonSummary[];
  recent: { lessonId: string; title: string; subject: string; section: Section; recommendedAge: number; selectedAge: number | null; stepsDone: number; stepsTotal: number; bestQuizScore: number | null; quizTotal: number | null; timeSeconds: number; completedAt: string | null; lastStepAt: string }[];
}

export interface ProgressSaveResult {
  progress: LessonProgress;
  completed: boolean;
  firstCompletion: boolean;
  coins: { awarded: number; balance: number; duplicate: boolean; capped: boolean } | null;
  levelUp: { subject: string; from: number | null; to: number } | null;
  newAchievements: string[];
}

export const BRACKET_FOR_AGE = (age: number): AgeBracket => (age <= 5 ? 'A' : age <= 8 ? 'B' : age <= 10 ? 'C' : 'D');
export const AGES = [3, 4, 5, 6, 7, 8, 9, 10, 11, 12] as const;

/** The nine chapter steps in order, with the emoji each card wears. */
export const STEP_META: Record<StepKind, { emoji: string; key: string }> = {
  objective: { emoji: '🎯', key: 'learn.step.objective' },
  discover: { emoji: '🔍', key: 'learn.step.discover' },
  understand: { emoji: '🧠', key: 'learn.step.understand' },
  example: { emoji: '✏️', key: 'learn.step.example' },
  tryIt: { emoji: '🙌', key: 'learn.step.tryIt' },
  realWorld: { emoji: '🌍', key: 'learn.step.realWorld' },
  revision: { emoji: '📝', key: 'learn.step.revision' },
  didYouKnow: { emoji: '💡', key: 'learn.step.didYouKnow' },
  challenge: { emoji: '🏁', key: 'learn.step.challenge' },
};
