import type { ValidationIssue } from '../database/schema.js';
import { LANGUAGE_MAP, scriptShare } from '../lib/languages.js';
import { approxEqual, ComputationError, evaluateExpression, numericValue } from './computation.js';
import { DIFFICULTIES, OPTION_LABELS, type QuestionCandidate } from './questionSchema.js';
import { normalizeText } from './similarity.js';

// Rule-based quality gate. Every question — AI-generated, imported or typed
// in by an admin — passes through here before it can be approved.
//   severity "error"   → the question is rejected (or the save is refused)
//   severity "warning" → the question needs a human look (NEEDS_REVIEW)

export interface ValidationContext {
  explanationRequired: boolean;
  /** exam/subject/chapter(/topic) ids resolved to real, active rows */
  metadataOk: boolean;
  /** true when the job/import supplied approved source material or a reference */
  sourceProvided: boolean;
  duplicate?: { id: string; score: number } | null;
}

export interface ValidationResult {
  issues: ValidationIssue[];
  decision: 'passed' | 'needs_review' | 'rejected';
}

const err = (code: string, message: string): ValidationIssue => ({ code, severity: 'error', message });
const warn = (code: string, message: string): ValidationIssue => ({ code, severity: 'warning', message });

const LABEL_PREFIX = /^\s*(?:\(?[A-Da-d]\)|[A-Da-d][.):]|\([A-Da-d]\)|option\s+[A-Da-d][.):-]?)\s+/i;
const MALFORMED = /```|<\/?[a-z][^>]*>|\{\s*"|\\n|\[\s*\.\.\.\s*\]|\.\.\.\s*$|lorem ipsum|\bundefined\b|\bNaN\b|\{\{|\}\}|\bTODO\b/i;
const URL_RE = /\bhttps?:\/\/|\bwww\.[a-z]/i;
const CITATION_RE = /\b(according to|as per|source\s*:|reference\s*:|cited in|report(?:ed)? by)\b/i;
const ANSWER_IN_STEM = /\b(answer\s*[:\-]|correct answer|\(correct\)|sahi uttar|सही उत्तर|उत्तर\s*[:\-])/i;
const LETTER_CLAIM =
  /(?:\b(?:answer|ans|option|correct option|sahi (?:uttar|vikalp)|uttar|vikalp)\b|सही उत्तर|उत्तर|विकल्प)\s*(?:is|hai|है|:|-|=)?\s*\(?([A-D])\)?(?![a-z])/gi;
const HINGLISH_MARKERS = /\b(hai|hain|ka|ki|ke|kya|kitna|kitni|mein|se|ko|kaun|kaunsa|hota|hoga)\b/gi;
const WEASEL_OPTIONS = /^(all of the above|none of the above|both|sabhi|inme se koi nahi|उपरोक्त सभी|इनमें से कोई नहीं)/i;

/** Fixes harmless formatting so it is not reported as a problem:
 * whitespace, "A) " prefixes inside options, "b"/"(B)"/"Option B" answers,
 * "moderate" difficulty, and non-A–D option ids when there are four options. */
export function sanitizeCandidate<T extends QuestionCandidate>(q: T): T {
  const clean = (s: string) => s.replace(/\s+/g, ' ').trim();
  const options = q.options.map((o, i) => ({
    id: clean(o.id).toUpperCase().replace(/[^A-Z]/g, '') || OPTION_LABELS[i] || String(i),
    text: clean(o.text).replace(LABEL_PREFIX, ''),
  }));
  if (options.length === 4 && !options.every((o, i) => o.id === OPTION_LABELS[i])) {
    // Keep the answer pointing at the same option while relabelling.
    const oldCorrect = clean(q.correct_option).toUpperCase().replace(/^OPTION\s*/, '').replace(/[()]/g, '');
    const idx = options.findIndex((o) => o.id === oldCorrect);
    options.forEach((o, i) => (o.id = OPTION_LABELS[i]!));
    if (idx >= 0) q = { ...q, correct_option: OPTION_LABELS[idx]! };
  }
  const correct = clean(q.correct_option)
    .toUpperCase()
    .replace(/^OPTION\s*/, '')
    .replace(/[().]/g, '')
    .trim();
  let difficulty = clean(q.difficulty).toLowerCase();
  if (difficulty === 'moderate') difficulty = 'medium';
  return {
    ...q,
    question_text: clean(q.question_text),
    explanation: clean(q.explanation ?? ''),
    computation: q.computation ? clean(q.computation) : null,
    options,
    correct_option: correct,
    difficulty,
  };
}

export function validateQuestion(q: QuestionCandidate, ctx: ValidationContext): ValidationResult {
  const issues: ValidationIssue[] = [];
  const text = q.question_text ?? '';
  const optionTexts = q.options.map((o) => o.text ?? '');
  const labels = q.options.map((o) => o.id);

  // 1–2. Question exists and is not empty / trivially short.
  if (!text.trim()) issues.push(err('QUESTION_EMPTY', 'Question text is empty.'));
  else if (text.trim().length < 8) issues.push(err('QUESTION_TOO_SHORT', 'Question text is too short to be meaningful.'));
  else if (text.length > 1500) issues.push(warn('QUESTION_TOO_LONG', 'Question text is unusually long.'));

  // 3. Exactly four options for an MCQ, labelled A–D.
  if (q.options.length !== 4) {
    issues.push(err('OPTION_COUNT', `An MCQ needs exactly 4 options (found ${q.options.length}).`));
  } else if (labels.join('') !== 'ABCD') {
    issues.push(err('OPTION_LABELS', 'Options must be labelled A, B, C, D.'));
  }

  // 4. No empty options.
  optionTexts.forEach((t, i) => {
    if (!t.trim()) issues.push(err('OPTION_EMPTY', `Option ${labels[i] ?? i + 1} is empty.`));
    else if (t.length > 300) issues.push(warn('OPTION_TOO_LONG', `Option ${labels[i]} is unusually long.`));
  });

  // 5–6. Exactly one correct option, and it exists.
  if (!/^[A-D]$/.test(q.correct_option)) {
    issues.push(
      err('CORRECT_OPTION_INVALID', q.correct_option.includes(',') ? 'An MCQ must have exactly one correct option.' : `Correct option "${q.correct_option}" is not one of A–D.`)
    );
  } else if (!labels.includes(q.correct_option)) {
    issues.push(err('CORRECT_OPTION_MISSING', `Correct option ${q.correct_option} does not exist.`));
  }

  // 7. Explanation present when required.
  if (ctx.explanationRequired && !q.explanation?.trim()) {
    issues.push(err('EXPLANATION_MISSING', 'An explanation is required.'));
  } else if (ctx.explanationRequired && q.explanation.trim().length < 15) {
    issues.push(warn('EXPLANATION_TOO_SHORT', 'The explanation is very short.'));
  }

  // 8. Difficulty is one of the allowed values.
  if (!(DIFFICULTIES as readonly string[]).includes(q.difficulty)) {
    issues.push(err('DIFFICULTY_INVALID', `Difficulty "${q.difficulty}" must be easy, medium or hard.`));
  }

  // 9. Written in the requested language/script.
  const lang = LANGUAGE_MAP.get(q.language);
  if (!lang) {
    issues.push(err('LANGUAGE_UNKNOWN', `Language "${q.language}" is not supported.`));
  } else {
    const body = [text, ...optionTexts, q.explanation].join(' ');
    // Numbers and names are script-neutral; judge on the question + explanation.
    const share = scriptShare([text, q.explanation].join(' '), lang.script);
    if (share < 0.5) issues.push(err('LANGUAGE_MISMATCH', `Text is not written in ${lang.name} (${lang.script} script).`));
    else if (share < 0.8) issues.push(warn('LANGUAGE_MIXED', `Text mixes scripts; expected mostly ${lang.script}.`));
    const markers = body.match(HINGLISH_MARKERS)?.length ?? 0;
    if (lang.code === 'hi-Latn' && markers === 0 && text.length > 40) {
      issues.push(warn('LANGUAGE_MISMATCH_HINGLISH', 'This reads like English, not Hinglish.'));
    }
    if (lang.code === 'en' && markers >= 3) {
      issues.push(warn('LANGUAGE_MISMATCH_ENGLISH', 'This reads like Hinglish, not English.'));
    }
  }

  // 10. Metadata resolves to real exam/subject/chapter/topic rows.
  if (!ctx.metadataOk) issues.push(err('METADATA_MISSING', 'Exam, subject or chapter is missing or archived.'));

  // 11. Obvious duplicate of an existing question (never auto-deleted).
  if (ctx.duplicate) {
    issues.push(
      warn('POSSIBLE_DUPLICATE', `Possible duplicate of question ${ctx.duplicate.id} (similarity ${ctx.duplicate.score.toFixed(2)}).`)
    );
  }

  // 12. Options must be distinct (text and, for numbers, value).
  // Hindi function words (ने, को, से, का …) are what a grammar question tests,
  // so Devanagari options are compared as written, not with those words dropped.
  const strictText = (t: string) => t.normalize('NFC').toLowerCase().replace(/[^\p{L}\p{N}\p{M}]+/gu, '');
  const normOptions = optionTexts.map((t) => (/[ऀ-ॿ]/.test(t) ? strictText(t) : normalizeText(t) || strictText(t)));
  if (new Set(normOptions).size !== normOptions.length) {
    issues.push(err('DUPLICATE_OPTIONS', 'Two or more options have the same text.'));
  } else {
    // Compare values only when options differ by number alone ("₹450" vs
    // "₹540"); "3 lakh km/sec" vs "3 lakh km/hour" are different answers.
    const residue = optionTexts.map((t) => t.replace(/-?\d+(?:[.,/]\d+)*/g, '#').trim().toLowerCase());
    const values = optionTexts.map(numericValue);
    const numeric = values.filter((v): v is number => v !== null);
    if (numeric.length === 4 && new Set(residue).size === 1 && new Set(numeric.map((v) => v.toFixed(6))).size < 4) {
      issues.push(err('DUPLICATE_OPTIONS', 'Two or more options have the same numeric value.'));
    }
  }
  optionTexts.forEach((t, i) => {
    if (WEASEL_OPTIONS.test(t.trim())) issues.push(warn('WEAK_OPTION', `Option ${labels[i]} ("${t}") is a weak distractor.`));
  });

  const correctIdx = labels.indexOf(q.correct_option);
  const correctText = correctIdx >= 0 ? optionTexts[correctIdx]! : '';

  // 13. Correct answer agrees with the explanation (and the computation).
  if (q.explanation) {
    for (const m of q.explanation.matchAll(LETTER_CLAIM)) {
      const claimed = m[1]!;
      // Lowercase "a" is the English article ("the answer is a prime number").
      if (claimed !== claimed.toUpperCase()) continue;
      if (claimed !== q.correct_option) {
        issues.push(err('ANSWER_EXPLANATION_MISMATCH', `The explanation says the answer is ${claimed}, but the key says ${q.correct_option}.`));
        break;
      }
    }
  }
  const correctValue = correctText ? numericValue(correctText) : null;
  if (q.computation) {
    try {
      const computed = evaluateExpression(q.computation);
      if (correctValue !== null && !approxEqual(computed, correctValue)) {
        const other = optionTexts.findIndex((t, i) => i !== correctIdx && numericValue(t) !== null && approxEqual(computed, numericValue(t)!));
        issues.push(
          err(
            'COMPUTATION_MISMATCH',
            other >= 0
              ? `The calculation gives ${round(computed)}, which is option ${labels[other]}, not the keyed answer ${q.correct_option}.`
              : `The calculation gives ${round(computed)}, but the keyed answer is ${correctText}.`
          )
        );
      }
    } catch (e) {
      issues.push(warn('COMPUTATION_INVALID', `Could not verify the calculation: ${e instanceof ComputationError ? e.message : 'invalid expression'}.`));
    }
  }
  if (correctValue !== null && q.explanation) {
    // The last number an explanation arrives at should be the answer, not a distractor.
    const nums = q.explanation.replace(/(\d),(?=\d)/g, '$1').match(/-?\d+(?:\.\d+)?/g);
    const last = nums ? Number(nums[nums.length - 1]) : null;
    if (last !== null && !approxEqual(last, correctValue)) {
      const other = optionTexts.findIndex((t, i) => i !== correctIdx && numericValue(t) !== null && approxEqual(last, numericValue(t)!));
      if (other >= 0) {
        issues.push(
          err('ANSWER_EXPLANATION_MISMATCH', `The explanation ends at ${round(last)} (option ${labels[other]}), but the key says ${q.correct_option}.`)
        );
      }
    }
  }

  // 14. Malformed formatting (markdown/HTML/JSON residue, placeholders).
  for (const [field, value] of [
    ['question', text],
    ['explanation', q.explanation],
    ...optionTexts.map((t, i) => [`option ${labels[i]}`, t] as const),
  ] as const) {
    if (value && MALFORMED.test(value)) {
      issues.push(warn('MALFORMED_FORMATTING', `Formatting residue or placeholder text in the ${field}.`));
      break;
    }
  }

  // 15. No invented citations: links or "according to …" need supplied sources.
  const allText = [text, q.explanation, ...optionTexts].join(' ');
  if (!ctx.sourceProvided) {
    if (URL_RE.test(allText)) issues.push(err('HALLUCINATED_CITATION', 'Contains a link although no source material was supplied.'));
    else if (CITATION_RE.test(allText)) issues.push(warn('UNSUPPORTED_CITATION', 'Cites a source although none was supplied; verify it.'));
  }

  // 16. No answer leakage in the question text.
  if (ANSWER_IN_STEM.test(text)) {
    issues.push(err('ANSWER_LEAKAGE', 'The question text reveals the answer.'));
  } else if (correctText && correctValue === null) {
    const needle = normalizeText(correctText);
    const hay = normalizeText(text);
    const othersLeak = optionTexts.some((t, i) => i !== correctIdx && normalizeText(t).length >= 4 && hay.includes(normalizeText(t)));
    if (needle.length >= 4 && hay.includes(needle) && !othersLeak) {
      issues.push(warn('ANSWER_LEAKAGE', 'The correct option appears word-for-word in the question.'));
    }
  }

  // Obvious-answer bias: the key is much longer than every distractor.
  if (correctText && q.options.length === 4) {
    const others = optionTexts.filter((_, i) => i !== correctIdx);
    const avg = others.reduce((s, t) => s + t.length, 0) / others.length;
    if (correctText.length > 25 && correctText.length > 1.8 * avg) {
      issues.push(warn('OBVIOUS_ANSWER', 'The correct option is much longer than the others, which gives it away.'));
    }
  }

  const decision = issues.some((i) => i.severity === 'error')
    ? 'rejected'
    : issues.some((i) => i.severity === 'warning')
      ? 'needs_review'
      : 'passed';
  return { issues, decision };
}

function round(n: number) {
  return Math.round(n * 1000) / 1000;
}

/** Shuffles options so correct answers are spread across A–D within a batch
 * (answer-pattern bias). Questions whose explanation refers to option letters
 * are left untouched so the explanation stays true. */
export function balanceAnswerPositions<T extends QuestionCandidate>(batch: T[], random: () => number = Math.random): T[] {
  const letterRef = /\b(option|vikalp)\s*\(?[A-D]\)?|\([A-D]\)|विकल्प/i;
  const targets: number[] = [];
  const eligible = batch.filter((q) => q.options.length === 4 && /^[A-D]$/.test(q.correct_option) && !letterRef.test(q.explanation));
  for (let i = 0; i < eligible.length; i++) targets.push(i % 4);
  for (let i = targets.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [targets[i], targets[j]] = [targets[j]!, targets[i]!];
  }
  let k = 0;
  return batch.map((q) => {
    if (!eligible.includes(q)) return q;
    const target = targets[k++]!;
    const correctIdx = OPTION_LABELS.indexOf(q.correct_option as (typeof OPTION_LABELS)[number]);
    const texts = q.options.map((o) => o.text);
    const correct = texts[correctIdx]!;
    const rest = texts.filter((_, i) => i !== correctIdx);
    for (let i = rest.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [rest[i], rest[j]] = [rest[j]!, rest[i]!];
    }
    rest.splice(target, 0, correct);
    return { ...q, options: rest.map((text, i) => ({ id: OPTION_LABELS[i]!, text })), correct_option: OPTION_LABELS[target]! };
  });
}
