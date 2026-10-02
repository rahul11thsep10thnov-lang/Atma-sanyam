# Operator guide — running the question pipeline after launch

This is the playbook for producing question banks, question papers and mock
tests on your own, from the admin console, without touching code. Everything
below runs on the API's pipeline (generate → validate → AI review → human
review → publish → mock test). Nothing reaches candidates until an admin
publishes it.

Console: `admin/` (http://localhost:3001 in development, or your deployed
console URL). Sign in with your super-admin account.

---

## 0. One-time setup (10 minutes)

1. **Turn on the real AI provider.** In `backend/.env` (or your host's
   secret settings) set:
   ```
   MOCK_AI=false
   AI_API_KEY=<your Anthropic API key>
   AI_MONTHLY_BUDGET_USD=200        # optional hard cap on spend per month
   ```
   Restart the API. The console's Settings page then shows
   *API key: configured on the server* instead of the yellow MOCK_AI banner.
   With `MOCK_AI=true` the pipeline still works end-to-end, but produces
   placeholder questions for testing — never use those for candidates.

2. **Check Settings → Pipeline & cost controls.** Sensible defaults:
   batch size 20, max retries 2, review batch size 10, auto-approve ON,
   minimum reviewer confidence 0.8. Turn auto-approve OFF if you want every
   single question to pass through a human before it can be approved.

3. **Check Settings → Website.** Quotation under the site name, Mock Test
   Pass price (₹49) and list price (₹299), validity (365 days), free quotas
   (2 full + 2 subject-wise), popup text and on/off.

4. **Add reviewers (optional).** Settings → Console accounts → create
   *Reviewer* accounts for teachers who will check questions. Reviewers can
   approve/reject/edit but cannot publish or spend AI budget.

---

## 1. Building a question bank

There are four ways questions enter the bank. All of them go through the
same 16 automated checks and land in **NEEDS_REVIEW** or **APPROVED** —
never directly in PUBLISHED.

### 1a. Generate with AI (the main route)

Console → **Generate Questions**:

| Field | What to enter |
|---|---|
| Exam / Subject / Chapter / Topic | Where the questions belong, e.g. UP Police Constable › Mathematics › Percentage |
| Language | Hinglish (default), Hindi or English |
| Number of questions | 20–500 per job is comfortable; max per job is set in Settings |
| Difficulty mix | Percentages for easy / medium / hard. **30 / 50 / 20** gives the "40%" level calibrated from the 2024 paper. Use 50/40/10 for an easier set, 20/50/30 for a tougher one |
| Explanation required | Keep ON |
| Approved source material | Optional: pick an approved syllabus / notes entry so facts come only from it (important for current affairs and state GK) |
| Source / reference note | Free text that is stored on every question, e.g. "UPPRPB 2024 syllabus" |
| Additional instructions | Style guidance, e.g. "Use rupee amounts; avoid compound percentage" |
| Stop if this job costs more than | A cap in USD; default is 2× the estimate |

Click **Estimate** to see the cost, then **Start generation**. The job page
shows a live bar (`375 / 500 generated`), counts of approved / needs review
/ rejected, and per-batch status. If a batch fails, the rest continue; use
**Retry failed batches** later. Jobs can be cancelled at any time.

A good rhythm: one job per chapter, 100–300 questions each, so the duplicate
checker has a tight scope and reviewers can work subject by subject.

### 1b. Run a whole plan at once

For large builds (e.g. the 5,000-question UP Constable plan) a plan file
lists one job per chapter. From the server:

```bash
cd backend
npm run plan:queue -- --dry-run     # prints job count, totals, estimated cost
npm run plan:queue                  # queues every job; the API's worker runs them
```

Copy `backend/seed/plans/up-police-constable-5000.json` to make a plan for
another exam (change `exam`, the subject/chapter slugs and counts; slugs are
visible under Exams, Subjects & Chapters). Progress shows under Generate
Questions like any other job.

### 1c. Import from a spreadsheet

Console → **Import** → paste or upload CSV / JSON with columns
`exam, subject, chapter, topic, question, option_a, option_b, option_c,
option_d, correct_option, explanation, difficulty, language, source_name,
source_reference, valid_as_of`. **Preview** runs every check without saving
and lists problems row by row; **Import** stores the valid rows in
NEEDS_REVIEW. Up to 2,000 rows per file. Use this for questions your
teachers write in Excel.

### 1d. Previous-year papers

Transcribe the paper into the JSON format of
`backend/seed/pyq/up-police-constable-2024-08-25-shift1.json` (one object per
question with subject, chapter, difficulty, options, answer, explanation) and
run `npm run seed:pyq -- --file <path>`. The paper is stored as reference
source material and its questions arrive as *Source: PYQ* in NEEDS_REVIEW,
so they can be reviewed, approved and used in PYQ practice sets — but they
are never fed to the generator as text to copy.

### 1e. Type a question by hand

Console → **Question Bank** → **New question**. Same validator; errors are
shown before saving.

---

## 2. Reviewing

Console → **Review Questions** (the sidebar badge shows how many are
waiting). Each card shows the options with the key marked, the explanation,
difficulty, the automated checks, the AI reviewer's verdict (and its own
answer if it disagrees), any **POSSIBLE DUPLICATE** side by side, and the
source.

Keyboard: **A** approve · **P** approve & publish · **R** reject (with reason)
· **E** edit (re-runs every check) · **X** archive · **J / K** next / previous.

Faster, for clean batches: **Question Bank** → filter by job, subject,
difficulty, status or source → select all → **Approve** / **Reject** /
**Publish** / **Unpublish** / **Archive** in bulk.

What to look at first:
- questions with warnings (duplicates, mixed language, long correct option);
- AI-reviewed items where `reviewer_answer` differs from the key;
- Hindi and GK facts (the validator can check arithmetic, not facts);
- anything marked *difficulty not appropriate* — change the label in Edit.

Every action is recorded in the audit log with who did it and when.

---

## 3. Publishing questions

Only APPROVED questions without validation errors can be published, and
only by an admin with the publish permission. Publish from Review (**P**) or
in bulk from Question Bank. Published questions are the only ones a mock
test can draw from. **Unpublish** returns a question to APPROVED (it leaves
new tests, existing tests that contain it refuse to publish until fixed);
**Archive** removes it from the bank but keeps its history.

Target before building tests for an exam: at least ~1,000 published
questions spread across all subjects, so a 150-question series does not
repeat quickly. The Exams page shows published counts per chapter.

---

## 4. Making mock tests and question papers

Console → **Mock Tests** → **New mock test / blueprint**:

| Field | Notes |
|---|---|
| Exam, language | Only published questions of that exam + language are used |
| Title | e.g. "UP Constable Full Mock 7" |
| Duration, marks per correct, negative marks | UP Constable: 120 min, +2, −0.5 |
| Test kind | *Automatic* marks a one-subject test as subject-wise and anything else as a full paper. The two kinds have separate free quotas for users |
| Difficulty mix | 30/50/20 for exam level |
| Questions per subject | e.g. GK 20, Current Affairs 6, Polity 4, History 4, Science 2, Geography 2, Hindi 37, Maths 38, Reasoning 37 = 150 |

- **Generate test** builds one test now. The selector takes least-used
  questions first, never repeats a question or a duplicate within a test, and
  tells you exactly which subject is short if the bank cannot fill it.
- **Save as blueprint** stores the recipe. `npm run seed:pyq` already saved
  **UP Police Constable — official pattern (150 Q / 120 min)**.
- Blueprints tab → **Generate tests** → enter how many (1–100) and whether to
  publish immediately → "Blueprint name — Mock Test 1…N" are created in one
  go with minimal overlap.

Open a test to see its questions with answers, edit the title, duration or
kind, and **Publish**. It appears on the website's Mock Tests page within a
minute, is served without answers, and every attempt is scored on the
server. **Unpublish** or **Archive** removes it from the site.

Subject-wise tests: same form with questions in one subject only (e.g.
Hindi 25, 20 min). Printed question papers: open the test in the console;
the question list with key and explanations is the paper and its answer
key (print the page, or export from the Question Bank filtered by test).

---

## 5. Keeping quality up (monthly)

- **Analytics** → *Most difficult questions* and *Unusually high error rate*:
  accuracy far below similar questions usually means a wrong key or an
  ambiguous stem. Open → Edit or Unpublish.
- **Dashboard** → pipeline cost this month vs estimate, cost per approved
  question, jobs failed.
- **Audit log** → who approved / published what.
- **Users** → who holds the Mock Test Pass; support can grant the pass
  (`POST /api/admin/users/:id/subscription`, days + note).

---

## 6. Adding a new exam or state

Console → **Exams, Subjects & Chapters** → *New exam* (name, slug, state
code, exam type, default language) → add subjects and chapters (and topics
if you want finer jobs). Then generate per chapter (section 1a or a plan
file, 1b), review, publish, and create a blueprint matching that exam's
pattern. Nothing else is needed; the website lists tests by state and exam
type automatically.

---

## 7. If something goes wrong

| Symptom | What to do |
|---|---|
| Job FAILED with batches in error | Open the job → read the batch error → **Retry failed batches**. Auth / refusal errors mean the key or prompt needs attention; timeouts just retry |
| "This job would exceed the monthly AI budget" | Raise `Monthly AI budget` in Settings, or wait for next month |
| Mock test cannot be generated: "needs 38, 20 usable" | Publish more questions in that subject, or lower that section's count |
| Many duplicates flagged | Expected when a chapter is dense; approve one of each pair, reject the other |
| Admin password lost | `cd backend && npm run seed:admin` (stop the API first) — see README "Password recovery" |
| Website shows old quote/price | Settings are cached for 60 seconds; wait a minute |

Costs are always visible before a job starts, capped per job and per month,
and nothing is ever published without an admin's click.
