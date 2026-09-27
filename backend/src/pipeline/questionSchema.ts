import { z } from 'zod';

export const OPTION_LABELS = ['A', 'B', 'C', 'D'] as const;
export const DIFFICULTIES = ['easy', 'medium', 'hard'] as const;
export type DifficultyLevel = (typeof DIFFICULTIES)[number];

/** What the generator (AI or mock) must return for one MCQ. Kept free of
 * length/count constraints on purpose: structural problems are reported by
 * the validator with precise issue codes instead of a generic parse error. */
export const generatedQuestionSchema = z.object({
  question_text: z.string(),
  options: z.array(z.object({ id: z.string(), text: z.string() })),
  correct_option: z.string(),
  explanation: z.string(),
  difficulty: z.string(),
  // For numerical questions: an arithmetic expression (numbers, + - * / ^ ( ) %)
  // that evaluates to the correct answer. null for non-numerical questions.
  computation: z.string().nullable(),
});

export const generationResponseSchema = z.object({
  questions: z.array(generatedQuestionSchema),
});

export type GeneratedQuestion = z.infer<typeof generatedQuestionSchema>;
export type GenerationResponse = z.infer<typeof generationResponseSchema>;

export const reviewItemSchema = z.object({
  index: z.number(),
  valid: z.boolean(),
  correct_answer_verified: z.boolean(),
  // The option the reviewer itself believes is correct.
  reviewer_answer: z.string(),
  explanation_verified: z.boolean(),
  difficulty_appropriate: z.boolean(),
  ambiguous: z.boolean(),
  duplicate_probability: z.number(),
  confidence: z.number(),
  issues: z.array(z.string()),
  review_notes: z.string(),
});

export const reviewResponseSchema = z.object({ reviews: z.array(reviewItemSchema) });
export type ReviewItem = z.infer<typeof reviewItemSchema>;

/** A question with the job's authoritative metadata attached — the shape the
 * validator, duplicate checker and database layer work with. */
export interface QuestionCandidate {
  question_text: string;
  options: { id: string; text: string }[];
  correct_option: string;
  explanation: string;
  difficulty: string;
  computation: string | null;
  language: string;
  question_type: 'mcq';
  examId: string;
  subjectId: string;
  chapterId: string;
  topicId: string | null;
}
