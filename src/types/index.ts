// Core domain types for PoliceExams.
// These mirror the Supabase/Postgres schema in supabase/schema.sql so that
// static seed data, generated data, and live DB rows all satisfy the same shape.

export type StateCode =
  | "up"
  | "mp"
  | "rajasthan"
  | "bihar"
  | "jharkhand"
  | "uttarakhand"
  | "haryana"
  | "punjab"
  | "chhattisgarh";

export type ExamType = "constable" | "si";

export type Difficulty = "easy" | "moderate";

export type QuestionStatus =
  | "draft"
  | "under_review"
  | "approved"
  | "published"
  | "rejected";

export type ReportReason =
  | "wrong_answer"
  | "wrong_question"
  | "poor_explanation"
  | "out_of_syllabus"
  | "too_difficult"
  | "other";

export interface StateInfo {
  code: StateCode;
  name: string; // English name
  hinglishName: string; // Display / Hinglish name
  capital: string;
  formationYear: number;
  officialLanguages: string[];
  totalDistricts: number;
  highCourt: string;
  policeBoardName: string;
  policeBoardShort: string;
}

export interface Subject {
  id: string;
  name: string;
  hinglishName: string;
}

export interface Topic {
  id: string;
  subjectId: string;
  name: string;
}

export interface QuestionOption {
  key: "A" | "B" | "C" | "D";
  text: string;
}

export interface Question {
  id: string;
  state: StateCode;
  exam: ExamType;
  subject: string; // Subject id
  topic: string; // Topic name/id
  difficulty: Difficulty;
  question: string;
  options: [string, string, string, string];
  correctAnswer: number; // 0-3 index
  explanation: string;
  source: string;
  year?: number;
  language: "hinglish";
  tags: string[];
  status: QuestionStatus;
  isSample: boolean; // demo/sample content vs verified official PYQ
}

export interface QuestionReport {
  id: string;
  questionId: string;
  reason: ReportReason;
  note?: string;
  createdAt: string;
  status: "open" | "reviewed" | "dismissed";
}

/** Fields that may be officially unverifiable at any time; always render the
 * fallback copy instead of guessing. */
export interface OfficialFact<T> {
  value: T | null;
  sourceNote: string; // e.g. "Official notification ka wait karein"
  sourceUrl?: string;
  sourceDate?: string;
}

export interface ExamPatternSection {
  subject: string;
  questions: number;
  marks: number;
}

export interface ExamPattern {
  mode: string;
  totalQuestions: OfficialFact<number>;
  totalMarks: OfficialFact<number>;
  durationMinutes: OfficialFact<number>;
  negativeMarking: OfficialFact<string>;
  sections: ExamPatternSection[];
}

export interface PhysicalStandard {
  category: string; // e.g. "Male (General)"
  height?: string;
  chest?: string;
  weight?: string;
}

export interface PhysicalEfficiencyEvent {
  event: string;
  standard: string;
}

export interface ExamConfig {
  state: StateCode;
  exam: ExamType;
  slug: string; // e.g. up-police-constable
  title: string;
  overview: string;
  eligibility: string;
  ageLimit: OfficialFact<string>;
  educationalQualification: OfficialFact<string>;
  vacancy: OfficialFact<number>;
  applicationStart: OfficialFact<string>;
  applicationEnd: OfficialFact<string>;
  examDate: OfficialFact<string>;
  pattern: ExamPattern;
  syllabus: { subject: string; topics: string[] }[];
  physicalStandards: PhysicalStandard[];
  physicalEfficiency: PhysicalEfficiencyEvent[];
  medicalRequirements: string;
  selectionProcess: string[];
  cutoffNote: string;
  admitCardNote: string;
  resultNote: string;
  officialNotificationUrl?: string;
  lastVerified: string;
}

export interface StudyNote {
  id: string;
  slug: string;
  title: string;
  subject: string;
  state?: StateCode;
  quickConcept: string;
  importantFacts: string[];
  revision: string[];
  practiceQuestionIds: string[];
}

export interface CurrentAffairItem {
  id: string;
  date: string;
  category:
    | "daily"
    | "weekly"
    | "monthly"
    | "state"
    | "police";
  state?: StateCode;
  title: string;
  summary: string;
  source: string;
}

export type UpdateType =
  | "notification"
  | "application"
  | "correction"
  | "admit_card"
  | "exam_date"
  | "answer_key"
  | "result"
  | "cutoff"
  | "physical_test"
  | "document_verification";

export interface ExamUpdate {
  id: string;
  state: StateCode;
  exam: ExamType;
  type: UpdateType;
  title: string;
  date: string;
  status: string;
  source: string;
  isSample: boolean;
}

export interface PyqPaper {
  id: string;
  state: StateCode;
  exam: ExamType;
  year: number;
  shift?: string;
  title: string;
  isSample: boolean;
  questionIds: string[];
}

export interface MockTestDef {
  id: string;
  state: StateCode;
  exam: ExamType;
  title: string;
  type: "full" | "subject" | "topic" | "state_gk" | "police_gk" | "current_affairs";
  subject?: string;
  questionCount: number;
  durationMinutes: number;
  marksPerQuestion: number;
  negativeMarks: number;
  questionIds: string[];
}

export interface TestAnswer {
  questionId: string;
  selected: number | null; // 0-3 or null if skipped
  markedForReview: boolean;
  timeTakenSeconds: number;
}

export interface TestAttemptResult {
  id: string;
  userId: string | null;
  mockId: string;
  answers: TestAnswer[];
  score: number;
  correct: number;
  incorrect: number;
  skipped: number;
  accuracy: number;
  timeTakenSeconds: number;
  submittedAt: string;
}
