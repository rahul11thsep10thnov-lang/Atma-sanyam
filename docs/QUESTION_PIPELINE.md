# Question pipeline

How a question travels from "Generate 500 Percentage questions in Hindi" to a
candidate's result — and what stops a bad question on the way.

```
 Admin form ──▶ Job ──▶ Batches (20 each) ──▶ Worker
                                                │
     ┌──────────────────────────────────────────┘
     ▼
 1 Generate (AI, structured JSON) ─▶ 2 Parse & schema-check ─▶ 3 Sanitize & balance answers
     ▼
 4 Duplicate check ─▶ 5 Rule validator (16 checks + arithmetic)
     │                      ├─ error   ─▶ REJECTED   (stored with its reasons)
     │                      └─ ok / warning
     ▼
 6 Independent AI review ─▶ 7 Decision ─▶ APPROVED | NEEDS_REVIEW | REJECTED
     ▼
 8 Human review (console) ─▶ APPROVED ─▶ 9 Publish (admin only) ─▶ PUBLISHED
     ▼
 10 Mock-test generator (published only) ─▶ 11 Website ─▶ 12 Server scoring ─▶ Analytics
```

Code: `backend/src/pipeline/` (schema, validator, similarity, computation,
AI providers, batch processor, worker) and `backend/src/services/`
(generation, questions, mock tests, attempts).

## 1. Jobs and batches

`POST /api/admin/generation-jobs` with exam, subject, chapter, optional topic,
language, count, question type, difficulty percentages, explanation required,
source material / reference and extra instructions.

- The request is validated: the exam → subject → chapter → topic chain must
  exist and be active, percentages must add to 100, the language must be
  enabled, and the count must not exceed **Max questions per job**.
- Cost is estimated from the models' prices. The job is refused if it would
  exceed the **monthly budget**; it gets a **cost cap** (default 2× the
  estimate) that stops remaining batches if reached.
- The count is split into batches of **Batch size** (default 20). The
  difficulty counts are exact (500 at 30/50/20 → 150/250/100) and spread
  evenly, so each batch of 20 asks for 6 easy, 10 medium, 4 hard.

Job status: `QUEUED → GENERATING → VALIDATING → COMPLETED | FAILED`
(or `CANCELLED`). A job is FAILED if any batch finally failed; questions
from its successful batches remain available, and **Retry failed batches**
re-queues only the failed ones.

## 2. Generation (step 1–2)

The worker builds the prompt from structured parameters — never a vague
"write some questions":

```
Exam: UP Police Constable
Subject: Mathematics
Chapter: Percentage
Topic: (whole chapter)
Language: Hindi (Devanagari script)
Question type: MCQ (single correct answer, 4 options)
Number of questions: 20
Difficulty mix: exactly 6 easy, 10 medium and 4 hard …
Explanation: required …
Source material: … (only approved material, facts taken only from it)
Existing questions in this chapter (do not repeat or reword): …
```

The fixed system prompt carries the quality rules: exactly one correct option;
plausible, similar-length options; no "all/none of the above"; no answer
leakage or trick wording; explanations that reach the answer without citing
option letters; careful arithmetic with a `computation` expression for
numerical questions; facts only from supplied sources; no invented citations,
URLs or statistics; no copying from copyrighted question banks or previous
papers.

The AI is asked for **structured JSON** (`output_config.format` with the
schema). The reply is parsed strictly, then leniently (code fences, text
around the object). If it still doesn't match the schema, **one correction
request** is sent with the parse error. If that fails, the batch is retried
later; after **Max retries** it is marked FAILED with `error_message`,
`failed_at` and `retry_count`. Nothing malformed is ever stored. Transient
API errors retry with exponential backoff (30 s, 60 s, …); refusals and
authentication errors fail immediately (no pointless retries). Every
attempt's token usage is added to the batch and job cost.

## 3. Sanitize and balance (step 3)

Harmless formatting is fixed rather than reported: whitespace, "A) " prefixes
inside options, answers like "(b)" or "Option B", "moderate" → medium, and
non-A–D option ids. Options are then shuffled within the batch so the correct
answers are spread across A–D (questions whose explanation names an option
letter are left alone).

## 4. Duplicate detection (step 4)

Each question is compared with existing questions for the same exam, subject
and language (not rejected or archived), and with earlier questions in the
same batch.

1. **Normalize:** lower-case, digits unified (Devanagari → ASCII), "%",
   "percent", "प्रतिशत", "percentage" → one token, "₹/Rs/rupees/रुपये" → one
   token, filler words dropped ("what is", "find", "kya hai", "ज्ञात
   कीजिए"). "What is 20% of 500?" and "Find 20 percent of 500." both become
   `20 percent 500`.
2. **Exact:** same token set (any order) → similarity 1.0; a fingerprint
   column is indexed for this.
3. **Near:** token Jaccard + character-trigram similarity; lowered when the
   numbers differ ("20% of 500" vs "30% of 500" are different questions),
   raised when numbers match or three of four options are the same.
   ≥ 0.82 → **POSSIBLE DUPLICATE**.

Duplicates are never deleted: the question gets `duplicate_of_id`, a
`POSSIBLE_DUPLICATE` warning and goes to NEEDS_REVIEW, where the console shows
both side by side.

Not covered yet: the same question in two languages. To add it, store an
embedding per question (e.g. a multilingual embedding model) and compare by
cosine similarity in step 3.

## 5. Rule validator (step 5)

`backend/src/pipeline/validator.ts` — errors reject, warnings send to review.

| # | Check | Severity |
|---|---|---|
| 1–2 | Question text exists and is meaningful | error |
| 3 | Exactly 4 options, labelled A–D | error |
| 4 | No empty option | error |
| 5–6 | Exactly one correct option, and it exists | error |
| 7 | Explanation present (when required) | error |
| 8 | Difficulty is easy / medium / hard | error |
| 9 | Written in the requested language's script (and Hinglish vs English) | error / warning |
| 10 | Exam / subject / chapter / topic exist and belong together | error |
| 11 | Possible duplicate | warning |
| 12 | Options not duplicated (text, or value when they differ only by number) | error |
| 13 | Answer agrees with the explanation and with the programmatic calculation | error |
| 14 | No markdown / HTML / JSON residue or placeholders | warning |
| 15 | No links or "according to …" without supplied sources | error / warning |
| 16 | No answer leakage in the question | error / warning |
| + | Weak distractors ("All of the above"), correct option much longer than the rest | warning |

**Numerical verification:** the `computation` expression (e.g. `500*20/100`)
is evaluated by a safe parser (no `eval`) and must equal the keyed option's
value. It catches a wrong key even when the explanation looks right. The last
number an explanation arrives at must not be a distractor's value.

The same validator runs for AI output, CSV/JSON imports and questions typed
into the console. Manual saves with errors are refused with the list of
problems.

## 6. Independent AI review (step 6)

Questions that pass the rules go to a **separate** AI call (default model
configurable: `AI_REVIEW_MODEL`) with a reviewer prompt: solve each question
from the options, then report per question:

```json
{
  "valid": true,
  "correct_answer_verified": true,
  "reviewer_answer": "B",
  "explanation_verified": true,
  "difficulty_appropriate": true,
  "ambiguous": false,
  "duplicate_probability": 0.02,
  "confidence": 0.93,
  "issues": [],
  "review_notes": ""
}
```

Reviews are batched (**Review batch size**, default 10) to control cost. If
the review call fails, the questions are **kept** and sent to NEEDS_REVIEW
with `AI_REVIEW_UNAVAILABLE` — a review outage never loses work.

## 7. Decision (step 7)

| Outcome | When |
|---|---|
| **REJECTED** | a confident reviewer (≥ **min confidence**, default 0.8) found a different answer, or declared it invalid with concrete issues |
| **APPROVED** | valid, answer and explanation verified, reviewer's answer = key, not ambiguous, difficulty fits, duplicate probability < 0.5, confident — and the rule validator had no warnings — and **auto-approve** is on |
| **NEEDS_REVIEW** | everything else, including every POSSIBLE DUPLICATE |

APPROVED is not published. Turn **auto-approve** off under Settings to send
every question to a human.

## 8. Human review (step 8)

Console → **Review Questions** shows each waiting question with the key, the
explanation, metadata, the 16 checks, the AI verdict (with the reviewer's
own answer if it differs), the duplicate comparison and the source. Actions:
Edit (re-runs every check), Approve, Approve & publish, Reject (with a
reason), Archive — keyboard A / P / R / E / X, J/K to move. Every action is a
`question_reviews` row and an audit-log entry.

## 9. Publishing (step 9)

Only an admin with `questions:publish` can publish, and only APPROVED
questions without validation errors. Unpublish returns a question to
APPROVED; archive removes it from the bank but keeps its history. Questions
that are in a mock test or have answers can't be hard-deleted.

## 10. Mock-test generator

Inputs: exam, language, number of questions, duration, marking, difficulty
mix, and questions per subject (optionally per chapter). Or a **blueprint**
that stores all of that, e.g. UP Police Constable: 150 questions — General
Knowledge 38, General Hindi 37, Numerical Ability 38, Mental Ability 37 —
30/50/20.

Selection rules:
- only **PUBLISHED** questions of that exam and language;
- per section, difficulty counts from the mix; if a difficulty runs short,
  the nearest one fills in and the report says so;
- no question twice in one test, and never two questions from the same
  duplicate cluster;
- **least-used first** across the exam's existing tests, with random
  tie-breaks — so "Mock Test 1 … 100" from a blueprint repeat as little as
  the bank allows;
- if the bank can't fill the test, nothing is created and the error says
  exactly which subject is short and by how much.

The exact question ids and order are stored in `mock_test_questions`.
Publishing a test checks all its questions are still published.

## 11–12. Website and scoring

Published tests appear on the website's Mock Tests page. The API serves
questions without answers, records the served questions at start, and scores
the submission itself (see ARCHITECTURE.md → Request flows).

## Analytics

Per question: **accuracy = correct answers ÷ answered attempts**. The console
lists the most difficult questions and those with **unusually high error
rates** — accuracy below 25%, or 35+ points below other questions of the same
difficulty — which often means a wrong key, an ambiguous stem or a confusing
option. Also: users, active users, tests and questions attempted, average
score and completion time, most attempted exams and subjects, and pipeline
cost (estimated vs actual, tokens, cost per approved question).

## Source material

Console → **Source Material**: syllabus, reference text, previous-year papers
(kept as reference, not copied), website references, PDF text. Each has a
reference, licence note and — for current affairs — the period it covers.
Material must be **approved** before a job may use it; editing it removes the
approval. Generated questions keep the source name, reference and (for
dated material) a "correct as of" date. Uploading PDF files directly is not
built yet: paste the text.

## Previous-year papers

`npm run seed:pyq` loads a transcribed paper
(`backend/seed/pyq/*.json`): the paper becomes Source Material (kind *pyq*,
unapproved, reference only), each text question is imported through the
validator as `source = pyq` into NEEDS_REVIEW, and a blueprint for the
official pattern is saved. Figure-based questions are listed and skipped.
`npm run plan:queue` queues a chapter-by-chapter generation plan
(`backend/seed/plans/*.json`) through the same path as the console form.
See docs/UP_CONSTABLE_2024_PAPER_ANALYSIS.md.

## Imports

Console → **Import**: CSV or JSON (columns: exam, subject, chapter, topic,
question, option_a–d, correct_option, explanation, difficulty, language,
source_name, source_reference, valid_as_of). **Preview** runs every check
without saving; **Import** stores valid rows in NEEDS_REVIEW and lists the
skipped rows with reasons. Up to 2,000 rows / 5 MB per file.

## Cost control summary

| Control | Where |
|---|---|
| Estimate before starting | Generate form |
| Per-job cost cap | Generate form (default 2× estimate) |
| Monthly budget | Settings / `AI_MONTHLY_BUDGET_USD` |
| Batch size, max retries, timeouts, max questions per job, review batch size | Settings |
| Model choice and effort | `AI_GENERATION_MODEL`, `AI_REVIEW_MODEL`, `AI_EFFORT` |
| Actual cost and tokens | job page, dashboard, analytics |
| Free testing | `MOCK_AI=true` |
