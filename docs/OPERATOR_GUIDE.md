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

### 1e. Figure (non-verbal) questions

About a third of the reasoning paper is figure-based. These are made by the
**figure engine** on the API, not by AI: it draws each figure as an SVG from
an exact model and computes the answer from that model, so there is no cost
and no key to set. Twelve types (the console shows the same descriptions):

| Type | Easy | Medium | Hard |
|---|---|---|---|
| Figure series — rotation | a pointer (arrow, pin, flag, kite) turning by a fixed step | plus a dot moving round the corners | growing angle, a dot and a side triangle |
| Figure series — shaded sectors | a shaded block moving round a circle | a growing block, or a black pair and a grey sector moving opposite ways | a black and a grey sector, each with its own step |
| Mirror image / water image | 3-part figure | 4 parts | 5 parts including a letter |
| Odd one out | three turned copies of one figure and one mirrored copy; 2 parts | 3 parts | 4 parts |
| Figure analogy (A : B :: C : ?) | a turn | a turn or a mirror | turn or mirror plus black–white swap |
| Embedded figure | 3-stroke shape, light noise | 4 strokes | 5 strokes, near-miss distractors |
| Paper folding and punching | one fold | two folds or a diagonal fold | two folds, round and square holes |
| Counting triangles | ≤ 10 | 11–24 | 25+ |
| Counting squares | ≤ 10 | 11–22 | 23+ |
| Counting rectangles | ≤ 18 | 19–60 | 61+ |
| Venn diagram (P, Q, R) | one region | two-group conditions | "exactly two", "A or B but not C" |

**Try first (nothing saved).** Console → **Figure Questions** → *Preview a
type*: pick a type, difficulty and language and press **Show 4 more**. Each
sample shows the figure, the options with the key ringed, and the worked
explanation.

**Generate.** Same page → *Generate*: exam, subject (Reasoning is picked
automatically), language, how many (up to 500 per click), difficulty mix and
the types to include. The questions are spread evenly over the chosen types.
Each type is filed under its chapter (`figure-based`, `mirror-image`,
`counting-figures`, `venn-diagram`); if the exam is missing one of these
chapters the form says which, and you can add it under *Exams, Subjects &
Chapters* or choose a chapter override. The report shows created /
duplicates skipped / failed per type, then **Review them** opens the batch.

Every figure question goes to **NEEDS_REVIEW** with *Source: Figure*. Nothing
is published automatically: look at the drawing and the key in Review as you
would any question, then approve and publish. Repeats are blocked by a
fingerprint of the figure itself, so the same puzzle is never stored twice.

**Whole plan.** `backend/seed/plans/up-police-constable-nonverbal.json` makes
1,200 questions (600 Hinglish + 600 Hindi, 30/50/20) weighted like the 2024
paper. It runs in seconds and needs no AI key:

```bash
cd backend
npm run plan:queue -- --file seed/plans/up-police-constable-nonverbal.json --dry-run
npm run plan:queue -- --file seed/plans/up-police-constable-nonverbal.json
```

Figure questions can be used in mock tests, swapped and printed like any
other question; the website, the results page and the printed paper all show
the figures.

### 1f. Type a question by hand

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

Open a test to see its questions with the answer key, subject and
difficulty counts, then **Publish**. It appears on the website's Mock Tests
page within a minute, is served without answers, and every attempt is scored
on the server. **Unpublish** or **Archive** removes it from the site.

### Editing a test

On the test page, **Edit details** changes the title, description, duration,
kind (full / subject-wise) and, until the first attempt exists, the marking.
Once anyone has started the test the marking fields lock (attempts are scored
with the marking they ran under); to change it, archive the test and generate
a new one. Candidates already taking the test keep the time they started with.
Archived tests cannot be edited.

### Swapping one question

Every row has a **Swap** button (needs the mock-test write permission). The
dialog shows the question being replaced and the questions that may take its
place — published, same exam, same language, **same subject** (so the section
keeps its size), not already in the test and not a duplicate of one that is.
Same-difficulty questions come first, then the least used. Click **Use this**
on one, or **Auto-pick a replacement** (same difficulty, least used). The new
question takes the old one's number.

Good to know:
- A swap is refused while a candidate is taking that test (the dialog says how
  many and until when). Try again after they finish, or unpublish the test
  first and swap once the last attempt has ended.
- Finished attempts keep the question they saw, in the same position — their
  results and your analytics are unchanged. Anyone who starts the test later
  gets the new question.
- Swapped a wrong key out of a live test? Also fix or unpublish the question
  itself (Question Bank) so it is not picked again.

### Question paper and answer key as PDF files

There are two ways; both give the same layout.

**Saved PDFs (recommended).** On the test page, in the **Saved PDFs** card,
choose *Question paper*, *Answer key* or *Paper + key*, tick whether the key
shows chapter and difficulty, and press **Make PDF**. The API draws the PDF
itself (A4, page numbers, the test's language, figures included) and stores
it, so **Download** gives the identical file every time and anyone with
console access can fetch it later. Each file is listed with its pages, size,
who made it and when. When the test or any of its questions changes (edit,
swap, a corrected question) the file is marked **Outdated** — make a new one
before printing again. The newest 10 files of each kind are kept; older ones
are removed automatically, and **Delete** removes one by hand. Reviewers can
download; making and deleting files needs mock-test edit rights.

**Print view.** **Print view** opens the paper in the browser; choose what to
print:

| Option | Contains | Give to |
|---|---|---|
| Question paper only | Title, time, marks, marking scheme, candidate name/roll/date lines, instructions, sections and numbered questions with options | Candidates |
| Answer key only | Marked **Staff copy**: answers at a glance, then each question with its answer, explanation and (optionally) chapter and difficulty | Staff |
| Paper + answer key | Paper first, key starting on a new page | Staff |

Then **Print / Save as PDF**; in the browser's print window choose *Save as
PDF*, paper size **A4**, and switch off *Headers and footers*. Hindi papers
use an embedded Devanagari font, so they look the same on every computer.
Instructions are printed in the test's language (Hindi, Hinglish or English).
This PDF is made by the browser and not stored, so it always reflects the
test as it is right now.

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
| Figure form says a chapter is missing | Add the named chapter (slug shown) under the exam's Reasoning subject, or choose a chapter override |
| Website shows old quote/price | Settings are cached for 60 seconds; wait a minute |

Costs are always visible before a job starts, capped per job and per month,
and nothing is ever published without an admin's click.
