import { describe, expect, it } from 'vitest';
import { parseStructured } from '../src/pipeline/ai/anthropicProvider.js';
import { estimateJobCost } from '../src/pipeline/ai/pricing.js';
import { buildGenerationPrompt } from '../src/pipeline/ai/prompts.js';
import { decide } from '../src/pipeline/batchProcessor.js';
import { evaluateExpression, numericValue } from '../src/pipeline/computation.js';
import { generationResponseSchema, type QuestionCandidate, type ReviewItem } from '../src/pipeline/questionSchema.js';
import { fingerprint, normalizeText, similarity } from '../src/pipeline/similarity.js';
import { balanceAnswerPositions, sanitizeCandidate, validateQuestion } from '../src/pipeline/validator.js';
import { planBatches, splitByPercent } from '../src/services/generationService.js';
import { parseCsv } from '../src/services/importService.js';

const base: QuestionCandidate = {
  question_text: 'What is 20% of 500?',
  options: [
    { id: 'A', text: '50' },
    { id: 'B', text: '100' },
    { id: 'C', text: '150' },
    { id: 'D', text: '200' },
  ],
  correct_option: 'B',
  explanation: '20% of 500 = 500 × 20/100 = 100.',
  difficulty: 'easy',
  computation: '500*20/100',
  language: 'en',
  question_type: 'mcq',
  examId: 'e',
  subjectId: 's',
  chapterId: 'c',
  topicId: null,
};
const ctx = { explanationRequired: true, metadataOk: true, sourceProvided: false };
const codes = (q: Partial<QuestionCandidate>, c: Partial<typeof ctx> & { duplicate?: { id: string; score: number } } = {}) =>
  validateQuestion(sanitizeCandidate({ ...base, ...q }), { ...ctx, ...c }).issues.map((i) => i.code);

describe('question schema / structured output parsing', () => {
  const good = JSON.stringify({ questions: [{ question_text: 'Q', options: [{ id: 'A', text: 'x' }], correct_option: 'A', explanation: 'e', difficulty: 'easy', computation: null }] });

  it('accepts strict JSON', () => {
    expect(parseStructured(good, generationResponseSchema).ok).toBe(true);
  });
  it('recovers JSON wrapped in prose or code fences', () => {
    expect(parseStructured('Here you go:\n```json\n' + good + '\n```', generationResponseSchema).ok).toBe(true);
    expect(parseStructured('Sure! ' + good + ' Hope that helps.', generationResponseSchema).ok).toBe(true);
  });
  it('rejects arbitrary prose and schema violations with a reason', () => {
    const prose = parseStructured('Here are some questions about percentages...', generationResponseSchema);
    expect(prose.ok).toBe(false);
    const wrong = parseStructured(JSON.stringify({ questions: [{ question_text: 5 }] }), generationResponseSchema);
    expect(wrong.ok).toBe(false);
    if (!wrong.ok) expect(wrong.error).toMatch(/question_text/);
  });
});

describe('validator (16 rules)', () => {
  it('passes a clean question', () => {
    expect(codes({})).toEqual([]);
  });
  it('1–2 question exists and is not empty', () => {
    expect(codes({ question_text: '' })).toContain('QUESTION_EMPTY');
    expect(codes({ question_text: 'Q?' })).toContain('QUESTION_TOO_SHORT');
  });
  it('3 exactly four options', () => {
    expect(codes({ options: base.options.slice(0, 3) })).toContain('OPTION_COUNT');
  });
  it('4 options are not empty', () => {
    expect(codes({ options: [...base.options.slice(0, 3), { id: 'D', text: ' ' }] })).toContain('OPTION_EMPTY');
  });
  it('5–6 exactly one correct option that exists', () => {
    expect(codes({ correct_option: 'A,B' })).toContain('CORRECT_OPTION_INVALID');
    expect(codes({ correct_option: 'E' })).toContain('CORRECT_OPTION_INVALID');
  });
  it('7 explanation required', () => {
    expect(codes({ explanation: '' })).toContain('EXPLANATION_MISSING');
    expect(codes({ explanation: '' }, { explanationRequired: false })).not.toContain('EXPLANATION_MISSING');
  });
  it('8 difficulty valid (moderate is normalised to medium)', () => {
    expect(codes({ difficulty: 'extreme' })).toContain('DIFFICULTY_INVALID');
    expect(codes({ difficulty: 'moderate' })).not.toContain('DIFFICULTY_INVALID');
  });
  it('9 language matches the requested script', () => {
    expect(codes({ language: 'hi' })).toContain('LANGUAGE_MISMATCH');
    const hindi = { question_text: '500 का 20% कितना होगा?', explanation: '500 × 20/100 = 100 होगा।', language: 'hi' };
    expect(codes(hindi)).toEqual([]);
  });
  it('10 metadata must resolve', () => {
    expect(codes({}, { metadataOk: false })).toContain('METADATA_MISSING');
  });
  it('11 possible duplicate needs review, never auto-rejected', () => {
    const r = validateQuestion(sanitizeCandidate(base), { ...ctx, duplicate: { id: 'x', score: 0.95 } });
    expect(r.issues.map((i) => i.code)).toContain('POSSIBLE_DUPLICATE');
    expect(r.decision).toBe('needs_review');
  });
  it('12 duplicate option text or value', () => {
    expect(codes({ options: [base.options[0]!, base.options[1]!, base.options[1]!, base.options[3]!].map((o, i) => ({ ...o, id: 'ABCD'[i]! })) })).toContain('DUPLICATE_OPTIONS');
    expect(codes({ options: ['₹100', '₹100.00', '₹150', '₹200'].map((t, i) => ({ id: 'ABCD'[i]!, text: t })) })).toContain('DUPLICATE_OPTIONS');
    // Same number, different unit: not a duplicate.
    expect(codes({ options: ['3 lakh km/sec', '3 lakh km/hour', '30 hazar km/sec', '3 crore km/sec'].map((t, i) => ({ id: 'ABCD'[i]!, text: t })), computation: null })).not.toContain('DUPLICATE_OPTIONS');
  });
  it('13 answer must agree with explanation and computation', () => {
    expect(codes({ correct_option: 'C' })).toEqual(expect.arrayContaining(['COMPUTATION_MISMATCH', 'ANSWER_EXPLANATION_MISMATCH']));
    expect(codes({ explanation: 'The answer is option C: 20% of 500 is 100.', computation: null })).toContain('ANSWER_EXPLANATION_MISMATCH');
    // "a" is an article, not option A.
    expect(codes({ explanation: 'The answer is a round number: 500 × 20/100 = 100.' })).toEqual([]);
  });
  it('14 malformed formatting', () => {
    expect(codes({ question_text: 'What is 20% of 500? ```' })).toContain('MALFORMED_FORMATTING');
    expect(codes({ explanation: 'undefined' })).toContain('MALFORMED_FORMATTING');
  });
  it('15 no invented citations without source material', () => {
    expect(codes({ explanation: 'See https://example.com/answers. 500 × 20/100 = 100.' })).toContain('HALLUCINATED_CITATION');
    expect(codes({ explanation: 'According to NCERT, 500 × 20/100 = 100.' })).toContain('UNSUPPORTED_CITATION');
    expect(codes({ explanation: 'According to NCERT, 500 × 20/100 = 100.' }, { sourceProvided: true })).not.toContain('UNSUPPORTED_CITATION');
  });
  it('16 no answer leakage in the question', () => {
    expect(codes({ question_text: 'What is 20% of 500? (Answer: 100)' })).toContain('ANSWER_LEAKAGE');
    const leak = {
      question_text: 'Lucknow is the capital of which state — Lucknow?',
      options: ['Lucknow', 'Kanpur', 'Agra', 'Varanasi'].map((t, i) => ({ id: 'ABCD'[i]!, text: t })),
      correct_option: 'A',
      explanation: 'Lucknow is the capital city of Uttar Pradesh state.',
      computation: null,
    };
    expect(codes(leak)).toContain('ANSWER_LEAKAGE');
  });
  it('sanitizes harmless formatting instead of reporting it', () => {
    const q = sanitizeCandidate({ ...base, options: base.options.map((o) => ({ ...o, text: `${o.id}) ${o.text}` })), correct_option: '(b)' });
    expect(q.options.map((o) => o.text)).toEqual(['50', '100', '150', '200']);
    expect(q.correct_option).toBe('B');
  });
  it('balances answer positions without breaking keys', () => {
    const batch = Array.from({ length: 20 }, () => ({ ...base }));
    const out = balanceAnswerPositions(batch, () => 0.42);
    const letters = new Set(out.map((q) => q.correct_option));
    expect(letters.size).toBe(4);
    for (const q of out) expect(q.options.find((o) => o.id === q.correct_option)?.text).toBe('100');
  });
});

describe('computation checker', () => {
  it('evaluates arithmetic safely', () => {
    expect(evaluateExpression('500*20/100')).toBe(100);
    expect(evaluateExpression('(100+25)*2^2')).toBe(500);
    expect(evaluateExpression('20% * 500')).toBe(100);
    expect(() => evaluateExpression('process.exit(1)')).toThrow();
    expect(() => evaluateExpression('1/0')).toThrow();
  });
  it('reads option values', () => {
    expect(numericValue('₹1,250')).toBe(1250);
    expect(numericValue('3/4')).toBe(0.75);
    expect(numericValue('१२०')).toBe(120);
    expect(numericValue('2 hours 30 minutes')).toBeNull();
  });
});

describe('duplicate detection', () => {
  const sim = (a: string, b: string) => similarity({ normalizedText: normalizeText(a) }, { normalizedText: normalizeText(b) });
  it('flags reworded duplicates', () => {
    expect(sim('What is 20% of 500?', 'Find 20 percent of 500.')).toBe(1);
    expect(sim('500 ka 20% kitna hoga?', '500 का 20% ज्ञात कीजिए।')).toBe(1);
    expect(sim('A shopkeeper sells an item for Rs. 450 at 10% profit. Find the cost price.', 'An item is sold for ₹450 at a profit of 10%. What is its cost price?')).toBeGreaterThanOrEqual(0.82);
  });
  it('does not flag different questions', () => {
    expect(sim('What is 20% of 500?', 'What is 30% of 500?')).toBeLessThan(0.82);
    expect(sim('UP ki rajdhani kaunsi hai?', 'UP ka High Court kahan hai?')).toBeLessThan(0.82);
  });
  it('fingerprints ignore word order', () => {
    expect(fingerprint(normalizeText('20% of 500'))).toBe(fingerprint(normalizeText('500 ka 20%')));
  });
});

describe('difficulty distribution & batching', () => {
  it('splits percentages exactly', () => {
    expect(splitByPercent(500, { easy: 30, medium: 50, hard: 20 })).toEqual({ easy: 150, medium: 250, hard: 100 });
    const odd = splitByPercent(7, { easy: 33, medium: 33, hard: 34 });
    expect(odd.easy + odd.medium + odd.hard).toBe(7);
  });
  it('plans 500 questions as 25 batches of 20 with the right totals', () => {
    const plan = planBatches(500, 20, { easy: 30, medium: 50, hard: 20 });
    expect(plan).toHaveLength(25);
    expect(plan.every((b) => b.easy + b.medium + b.hard === 20)).toBe(true);
    const sum = plan.reduce((s, b) => ({ easy: s.easy + b.easy, medium: s.medium + b.medium, hard: s.hard + b.hard }), { easy: 0, medium: 0, hard: 0 });
    expect(sum).toEqual({ easy: 150, medium: 250, hard: 100 });
    expect(plan[0]).toEqual({ easy: 6, medium: 10, hard: 4 });
  });
  it('handles a final partial batch', () => {
    const plan = planBatches(45, 20, { easy: 100, medium: 0, hard: 0 });
    expect(plan.map((b) => b.easy)).toEqual([20, 20, 5]);
  });
});

describe('AI review decision', () => {
  const review: ReviewItem = {
    index: 0,
    valid: true,
    correct_answer_verified: true,
    reviewer_answer: 'B',
    explanation_verified: true,
    difficulty_appropriate: true,
    ambiguous: false,
    duplicate_probability: 0.02,
    confidence: 0.95,
    issues: [],
    review_notes: '',
  };
  const s = { autoApprove: true, minReviewConfidence: 0.8 };
  it('approves only clean, confident verdicts', () => {
    expect(decide(review, false, 'B', s, true)).toBe('approved');
    expect(decide(review, true, 'B', s, true)).toBe('needs_review'); // validator warning (e.g. duplicate)
    expect(decide({ ...review, confidence: 0.6 }, false, 'B', s, true)).toBe('needs_review');
    expect(decide({ ...review, ambiguous: true }, false, 'B', s, true)).toBe('needs_review');
    expect(decide(review, false, 'B', { ...s, autoApprove: false }, true)).toBe('needs_review');
    expect(decide(undefined, false, 'B', s, true)).toBe('needs_review');
  });
  it('rejects when a confident reviewer finds a different answer', () => {
    expect(decide({ ...review, correct_answer_verified: false, reviewer_answer: 'C' }, false, 'B', s, true)).toBe('rejected');
  });
});

describe('prompt design & cost', () => {
  it('builds prompts from structured parameters', () => {
    const p = buildGenerationPrompt({
      exam: 'UP Police Constable',
      subject: 'Numerical Ability',
      chapter: 'Percentage',
      topic: null,
      languageCode: 'hi',
      languagePromptName: 'Hindi (Devanagari script)',
      questionType: 'mcq',
      count: 20,
      difficultyMix: { easy: 6, medium: 10, hard: 4 },
      explanationRequired: true,
      additionalInstructions: null,
      source: null,
      avoid: ['What is 20% of 500?'],
    });
    for (const s of ['Exam: UP Police Constable', 'Chapter: Percentage', 'Hindi (Devanagari script)', 'Number of questions: 20', '6 easy, 10 medium and 4 hard', 'What is 20% of 500?']) {
      expect(p).toContain(s);
    }
  });
  it('estimates cost from the model price', () => {
    expect(estimateJobCost({ questions: 500, batchSize: 20, generationModel: 'claude-opus-5', reviewModel: 'claude-opus-5', mock: false })).toBeGreaterThan(0);
    expect(estimateJobCost({ questions: 500, batchSize: 20, generationModel: 'mock', reviewModel: 'mock', mock: true })).toBe(0);
  });
});

describe('CSV parser', () => {
  it('handles quotes, commas and newlines', () => {
    const rows = parseCsv('﻿a,b,c\r\n"x, y","say ""hi""","line1\nline2"\n\n1,2,3\n');
    expect(rows).toEqual([
      ['a', 'b', 'c'],
      ['x, y', 'say "hi"', 'line1\nline2'],
      ['1', '2', '3'],
    ]);
  });
});
