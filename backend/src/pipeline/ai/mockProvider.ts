import { readFileSync } from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { SEED_DIR } from '../../database/seedTaxonomy.js';
import { approxEqual, evaluateExpression, numericValue } from '../computation.js';
import type { DifficultyLevel, GeneratedQuestion, ReviewItem } from '../questionSchema.js';
import { distractors, fmt, templateFor, type Lang, type Rng } from './mockTemplates.js';
import { InvalidAiOutputError, type AiProvider, type AiUsage, type CallOptions, type GenerateParams, type ReviewParams } from './types.js';

// MOCK_AI=true: a stand-in for the AI provider that runs locally for free.
// Numerical chapters get template questions with answers computed in code;
// Hinglish non-numerical chapters reuse the website's sample question bank;
// anything else falls back to number-series questions. A small share of
// questions get a deliberate flaw so the validator and review queue have
// something to catch. Special instruction tags let you test failure paths
// from the console: "[mock:invalid-json]" makes every batch fail parsing.

interface SampleQuestion {
  subject: string;
  chapter: string;
  question: string;
  options: string[];
  correct_option: string;
  explanation: string;
  difficulty: string;
  language: string;
}

let sampleBank: SampleQuestion[] | null = null;
function samples(): SampleQuestion[] {
  if (!sampleBank) {
    try {
      sampleBank = JSON.parse(readFileSync(path.join(SEED_DIR, 'sample-questions.json'), 'utf8')) as SampleQuestion[];
    } catch {
      sampleBank = [];
    }
  }
  return sampleBank;
}

/** Deterministic PRNG (mulberry32) so a batch is reproducible from its seed. */
export function seededRandom(seed: string): Rng {
  let a = parseInt(createHash('sha256').update(seed).digest('hex').slice(0, 8), 16);
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const approxTokens = (s: string) => Math.ceil(s.length / 4);

export interface MockOptions {
  faultRate: number;
  latencyMs: number;
  /** Changes every call so repeated batches differ; tests pass a fixed value. */
  seed?: () => string;
}

export class MockProvider implements AiProvider {
  readonly name = 'mock' as const;
  readonly generationModel = 'mock';
  readonly reviewModel = 'mock';
  private calls = 0;

  constructor(private readonly opts: MockOptions) {}

  private usage(input: string, output: string): AiUsage {
    return { model: 'mock', inputTokens: approxTokens(input), outputTokens: approxTokens(output), costUsd: 0 };
  }

  async generate(p: GenerateParams, _opts: CallOptions) {
    await sleep(this.opts.latencyMs);
    const seed = this.opts.seed?.() ?? `${Date.now()}-${this.calls++}-${Math.random()}`;
    const rng = seededRandom(`${seed}|${p.chapter}|${p.count}`);

    if (p.additionalInstructions?.includes('[mock:invalid-json]')) {
      throw new InvalidAiOutputError('AI output failed schema validation after a correction attempt: invalid JSON: Unexpected token', this.usage('x', 'x'));
    }

    const lang: Lang = p.languageCode === 'en' ? 'en' : p.languageCode === 'hi' ? 'hi' : 'hi-Latn';
    const difficulties: DifficultyLevel[] = [
      ...Array<DifficultyLevel>(p.difficultyMix.easy).fill('easy'),
      ...Array<DifficultyLevel>(p.difficultyMix.medium).fill('medium'),
      ...Array<DifficultyLevel>(p.difficultyMix.hard).fill('hard'),
    ];
    const { template, exact } = templateFor(p.chapter);
    const chapterKey = p.chapter.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const bank =
      !exact && lang === 'hi-Latn'
        ? samples().filter((s) => s.chapter === chapterKey || s.subject === p.subject.toLowerCase())
        : [];

    const questions: GeneratedQuestion[] = difficulties.map((difficulty, i) => {
      let q: GeneratedQuestion;
      if (bank.length) {
        const s = bank[Math.floor(rng() * bank.length)]!;
        q = {
          question_text: s.question,
          options: s.options.map((text, j) => ({ id: 'ABCD'[j]!, text })),
          correct_option: s.correct_option,
          explanation: s.explanation,
          difficulty,
          computation: null,
        };
      } else {
        const t = template(rng, difficulty, lang);
        const wrong = distractors(rng, t.answer, t.integer);
        const correctIdx = Math.floor(rng() * 4);
        const values = [...wrong];
        values.splice(correctIdx, 0, t.answer);
        q = {
          question_text: t.question,
          options: values.map((v, j) => ({ id: 'ABCD'[j]!, text: t.format(v) })),
          correct_option: 'ABCD'[correctIdx]!,
          explanation: t.explanation,
          difficulty,
          computation: t.computation,
        };
      }
      if (rng() < this.opts.faultRate) q = injectFault(q, i);
      return q;
    });

    const input = JSON.stringify(p);
    return { questions, usage: this.usage(input, JSON.stringify(questions)) };
  }

  async review(p: ReviewParams, _opts: CallOptions) {
    await sleep(Math.round(this.opts.latencyMs / 2));
    const reviews: ReviewItem[] = p.questions.map((q) => {
      const issues: string[] = [];
      let reviewerAnswer = q.correct_option;
      // Re-solve numerical questions from the options: the answer should be
      // the value the explanation arrives at.
      const nums = q.explanation.replace(/(\d),(?=\d)/g, '$1').match(/-?\d+(?:\.\d+)?/g);
      const finalValue = nums ? Number(nums[nums.length - 1]) : null;
      if (finalValue !== null) {
        const match = q.options.find((o) => {
          const v = numericValue(o.text);
          return v !== null && approxEqual(v, finalValue);
        });
        if (match) reviewerAnswer = match.id;
      }
      const agrees = reviewerAnswer === q.correct_option;
      if (!agrees) issues.push(`Working gives ${fmt(finalValue ?? 0)}, which is option ${reviewerAnswer}, not ${q.correct_option}.`);
      if (!q.explanation.trim()) issues.push('No explanation to verify.');
      // A small, stable share of questions come back "uncertain" so the
      // NEEDS_REVIEW path is exercised.
      const uncertain = parseInt(createHash('sha1').update(q.question_text).digest('hex').slice(0, 2), 16) < 18;
      return {
        index: q.index,
        valid: agrees && !!q.explanation.trim(),
        correct_answer_verified: agrees,
        reviewer_answer: reviewerAnswer,
        explanation_verified: agrees && !!q.explanation.trim(),
        difficulty_appropriate: true,
        ambiguous: false,
        duplicate_probability: 0.02,
        confidence: uncertain ? 0.6 : 0.95,
        issues: uncertain && agrees ? ['Mock reviewer: low confidence, please check manually.'] : issues,
        review_notes: agrees ? 'Mock review: answer and working re-checked.' : 'Mock review: keyed answer does not match the working.',
      };
    });
    return { reviews, usage: this.usage(JSON.stringify(p), JSON.stringify(reviews)) };
  }
}

function injectFault(q: GeneratedQuestion, i: number): GeneratedQuestion {
  switch (i % 3) {
    case 0: {
      // Wrong key: points at a distractor.
      const idx = 'ABCD'.indexOf(q.correct_option);
      return { ...q, correct_option: 'ABCD'[(idx + 1) % 4]! };
    }
    case 1: {
      // Duplicate option text.
      const options = q.options.map((o) => ({ ...o }));
      options[3]!.text = options[2]!.text;
      return { ...q, options };
    }
    default:
      return { ...q, explanation: '' };
  }
}

// Exposed for tests.
export const __test = { injectFault, evaluateExpression };
