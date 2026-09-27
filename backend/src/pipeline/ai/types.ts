import type { DifficultyDistribution } from '../../database/schema.js';
import type { GeneratedQuestion, ReviewItem } from '../questionSchema.js';

export interface SourceContext {
  name: string;
  reference: string | null;
  content: string | null;
  validFrom: string | null;
  validTo: string | null;
}

export interface GenerateParams {
  exam: string;
  subject: string;
  chapter: string;
  topic: string | null;
  languageCode: string;
  languagePromptName: string;
  questionType: 'mcq';
  count: number;
  difficultyMix: DifficultyDistribution;
  explanationRequired: boolean;
  additionalInstructions: string | null;
  source: SourceContext | null;
  /** Recent question stems in this chapter, so the model avoids repeating them. */
  avoid: string[];
}

export interface ReviewQuestion {
  index: number;
  question_text: string;
  options: { id: string; text: string }[];
  correct_option: string;
  explanation: string;
  difficulty: string;
}

export interface ReviewParams {
  exam: string;
  subject: string;
  chapter: string;
  topic: string | null;
  languagePromptName: string;
  source: SourceContext | null;
  questions: ReviewQuestion[];
}

export interface AiUsage {
  model: string;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
}

export interface CallOptions {
  timeoutMs: number;
}

export interface AiProvider {
  readonly name: 'anthropic' | 'mock';
  readonly generationModel: string;
  readonly reviewModel: string;
  generate(params: GenerateParams, opts: CallOptions): Promise<{ questions: GeneratedQuestion[]; usage: AiUsage }>;
  review(params: ReviewParams, opts: CallOptions): Promise<{ reviews: ReviewItem[]; usage: AiUsage }>;
}

/** The model output could not be turned into schema-valid JSON, even after a
 * correction round-trip. The batch is retried (up to max retries), then FAILED. */
export class InvalidAiOutputError extends Error {
  constructor(message: string, public readonly usage: AiUsage) {
    super(message);
  }
}

/** Not worth retrying (refusal, bad credentials, bad request). */
export class PermanentAiError extends Error {}
