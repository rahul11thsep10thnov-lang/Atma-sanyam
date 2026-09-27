// Shapes returned by the PoliceExams admin API (backend/src/routes/admin).

export type QuestionStatus = 'draft' | 'generated' | 'validating' | 'needs_review' | 'approved' | 'rejected' | 'published' | 'archived';
export type Difficulty = 'easy' | 'medium' | 'hard';
export interface Issue {
  code: string;
  severity: 'error' | 'warning';
  message: string;
}

export interface TopicNode { id: string; name: string; slug: string; status: string }
export interface ChapterNode { id: string; name: string; slug: string; status: string; questionCounts: { total: number; published: number }; topics: TopicNode[] }
export interface SubjectNode { id: string; name: string; slug: string; status: string; chapters: ChapterNode[] }
export interface ExamNode {
  id: string;
  name: string;
  slug: string;
  status: string;
  stateCode: string | null;
  examType: string | null;
  defaultLanguage: string;
  description: string | null;
  subjects: SubjectNode[];
}

export interface Language { code: string; name: string; enabled: boolean }

export interface QuestionRow {
  id: string;
  questionText: string;
  status: QuestionStatus;
  difficulty: Difficulty;
  language: string;
  source: string;
  correctOption: string;
  duplicateOfId: string | null;
  duplicateScore: number | null;
  validationIssues: Issue[];
  createdAt: string;
  examName: string;
  subjectName: string;
  chapterName: string;
  topicName: string | null;
}

export interface Review {
  id: string;
  reviewerType: 'validator' | 'ai' | 'human';
  model: string | null;
  decision: 'approved' | 'needs_review' | 'rejected';
  valid: boolean | null;
  correctAnswerVerified: boolean | null;
  explanationVerified: boolean | null;
  difficultyAppropriate: boolean | null;
  duplicateProbability: number | null;
  issues: (Issue | string)[];
  notes: string | null;
  createdAt: string;
}

export interface QuestionDetail extends Omit<QuestionRow, 'examName' | 'subjectName' | 'chapterName' | 'topicName'> {
  examId: string;
  subjectId: string;
  chapterId: string;
  topicId: string | null;
  examName: string;
  subjectName: string;
  chapterName: string;
  topicName: string | null;
  explanation: string | null;
  computation: string | null;
  sourceName: string | null;
  sourceReference: string | null;
  sourceMaterialId: string | null;
  validAsOf: string | null;
  generationJobId: string | null;
  options: { label: string; text: string }[];
  reviews: Review[];
  duplicateOf: { id: string; questionText: string; status: QuestionStatus; options: string[] } | null;
  usedInMockTests: number;
  stats: { attempts: number; correct: number; accuracy: number | null };
  reviewedAt: string | null;
  publishedAt: string | null;
  updatedAt: string;
}

export interface Paged<T> { items: T[]; page: number; pageSize: number; total: number }

export interface Batch {
  id: string;
  batchIndex: number;
  requestedCount: number;
  difficultyMix: { easy: number; medium: number; hard: number };
  status: string;
  retryCount: number;
  maxRetries: number;
  generatedCount: number;
  approvedCount: number;
  needsReviewCount: number;
  rejectedCount: number;
  costUsd: string;
  errorMessage: string | null;
  failedAt: string | null;
  nextAttemptAt: string;
}

export interface Job {
  id: string;
  status: 'queued' | 'generating' | 'validating' | 'completed' | 'failed' | 'cancelled';
  examName: string;
  subjectName: string;
  chapterName: string;
  topicName: string | null;
  language: string;
  requestedCount: number;
  batchSize: number;
  difficultyDistribution: { easy: number; medium: number; hard: number };
  provider: string;
  generationModel: string;
  reviewModel: string;
  estimatedCostUsd: string;
  actualCostUsd: string;
  maxCostUsd: string | null;
  inputTokens: number;
  outputTokens: number;
  generatedCount: number;
  approvedCount: number;
  needsReviewCount: number;
  rejectedCount: number;
  discardedCount: number;
  errorMessage: string | null;
  additionalInstructions: string | null;
  sourceReference: string | null;
  createdAt: string;
  completedAt: string | null;
  failedAt: string | null;
  progress: { generated: number; requested: number; percent: number; batches: Record<string, number> & { total: number; done: number } };
  currentStatusCounts?: Partial<Record<QuestionStatus, number>>;
  batches?: Batch[];
}

export interface MockTestRow {
  id: string;
  title: string;
  status: 'draft' | 'published' | 'archived';
  examName: string;
  language: string;
  durationMinutes: number;
  totalQuestions: number;
  marksPerQuestion: number;
  negativeMarks: number;
  publishedAt: string | null;
  createdAt: string;
  sections: { subjectId: string | null; subjectName: string; count: number }[];
}
