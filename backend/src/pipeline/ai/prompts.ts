import type { GenerateParams, ReviewParams, SourceContext } from './types.js';

// Prompts are assembled from structured job parameters — never a vague
// "generate some questions". The system prompts are fixed text (identical on
// every call); everything job-specific goes in the user message.

export const GENERATOR_SYSTEM = `You write original multiple-choice questions for Indian government recruitment exams (state police constable and sub-inspector level). Your questions go into a question bank after automated checks and human review, and candidates rely on them being correct.

Write every question so that:
- It has exactly four options with ids "A", "B", "C", "D" and exactly one correct option. "correct_option" is that option's id.
- It is unambiguous, answerable in about 60–90 seconds, and matches the requested exam level, chapter and topic. No trick wording, double negatives or "gotcha" questions.
- All four options are plausible, of the same kind and format, and of similar length. Do not use "All of the above", "None of the above" or "Both A and B". Do not prefix option text with its letter.
- The question text does not give away the answer, and the correct option is not the only one that repeats words from the question.
- The explanation (when requested) shows the reasoning or working step by step and ends at the correct answer's value or statement. It never refers to options by letter ("option B") — refer to the answer itself.
- "difficulty" is one of "easy", "medium", "hard": easy = one step or direct recall; medium = two steps or applied understanding; hard = multi-step reasoning, still fair for this exam level.

Numerical questions:
- Calculate carefully and double-check every number. Options must be numerically distinct.
- Set "computation" to a plain arithmetic expression using only digits, + - * / ^ ( ) and % that evaluates exactly to the correct option's number (for example "500*20/100"). Set it to null for non-numerical questions. The expression is re-evaluated by a program, so it must match the keyed answer.

Facts:
- Only use facts that are stable and well established at this exam level. When source material is supplied, take facts only from it; if it does not support a question, write a different question.
- Never invent citations, URLs, report names, statistics or dates, and do not mention sources inside the question, options or explanation.
- Write original questions. Do not reproduce questions from copyrighted books, coaching material or previous exam papers.

Language: write the question, options and explanation entirely in the requested language. Numbers, units and proper nouns may use their standard form.

Vary the question forms within a batch, and do not repeat or lightly reword any question listed under "Existing questions".

Return only the JSON object described by the response schema.`;

export const REVIEWER_SYSTEM = `You are an independent subject-matter reviewer for an exam question bank (Indian state police constable / sub-inspector level). You did not write these questions. Check each one as a careful examiner would, before any candidate sees it.

For each question:
1. Solve it yourself from the question and options alone, then put the id ("A"–"D") of the option you believe is correct in "reviewer_answer".
2. "correct_answer_verified": true only if your answer matches the keyed "correct_option" and you are confident it is right.
3. "explanation_verified": true only if the explanation is correct, supports the keyed answer and contains no false statements.
4. "difficulty_appropriate": true if the labelled difficulty fits (easy = one step/recall, medium = two steps/applied, hard = multi-step but fair).
5. "ambiguous": true if more than one option could reasonably be defended, or the wording is unclear.
6. "valid": true only if the question is correct, unambiguous, in scope for the stated chapter/topic, free of factual errors and fit to publish.
7. "duplicate_probability" (0–1): how likely this question repeats another question in the same list.
8. "confidence" (0–1): your confidence in this review.
9. "issues": short, specific problems (empty list if none). "review_notes": one or two sentences for the human reviewer.

When source material is supplied, judge factual claims against it. If a fact cannot be verified, say so in "issues" rather than guessing, and lower your confidence.

Return only the JSON object described by the response schema, with one review per question and the same "index" values you were given.`;

const MAX_SOURCE_CHARS = 30_000;

function sourceBlock(source: SourceContext | null): string {
  if (!source) return 'Source material: none supplied — use only stable, well-established facts.';
  const period =
    source.validFrom || source.validTo ? `\nPeriod covered: ${source.validFrom ?? '…'} to ${source.validTo ?? '…'}` : '';
  const content = source.content ? source.content.slice(0, MAX_SOURCE_CHARS) : '(reference only, no text supplied)';
  return `Source material (take facts only from this):
<source name="${escapeAttr(source.name)}"${source.reference ? ` reference="${escapeAttr(source.reference)}"` : ''}>${period}
${content}
</source>`;
}

function escapeAttr(s: string) {
  return s.replace(/"/g, "'");
}

export function buildGenerationPrompt(p: GenerateParams): string {
  const mix = p.difficultyMix;
  const lines = [
    `Exam: ${p.exam}`,
    `Subject: ${p.subject}`,
    `Chapter: ${p.chapter}`,
    `Topic: ${p.topic ?? '(whole chapter)'}`,
    `Language: ${p.languagePromptName}`,
    `Question type: MCQ (single correct answer, 4 options)`,
    `Number of questions: ${p.count}`,
    `Difficulty mix: exactly ${mix.easy} easy, ${mix.medium} medium and ${mix.hard} hard — set each question's "difficulty" accordingly.`,
    `Explanation: ${p.explanationRequired ? 'required for every question (2–5 sentences, showing the working).' : 'optional; keep it to one sentence if given.'}`,
  ];
  if (p.additionalInstructions?.trim()) lines.push(`Additional instructions from the exam editor: ${p.additionalInstructions.trim()}`);
  lines.push('', sourceBlock(p.source));
  if (p.avoid.length) {
    lines.push('', 'Existing questions in this chapter (do not repeat or reword):', ...p.avoid.map((q) => `- ${q}`));
  }
  lines.push('', `Write the ${p.count} questions now.`);
  return lines.join('\n');
}

export function buildReviewPrompt(p: ReviewParams): string {
  const header = [
    `Exam: ${p.exam}`,
    `Subject: ${p.subject}`,
    `Chapter: ${p.chapter}`,
    `Topic: ${p.topic ?? '(whole chapter)'}`,
    `Language: ${p.languagePromptName}`,
    '',
    sourceBlock(p.source),
    '',
    `Questions to review (${p.questions.length}):`,
  ];
  const body = p.questions.map((q) =>
    JSON.stringify({
      index: q.index,
      question_text: q.question_text,
      options: q.options,
      correct_option: q.correct_option,
      explanation: q.explanation,
      difficulty: q.difficulty,
    })
  );
  return [...header, ...body].join('\n');
}
