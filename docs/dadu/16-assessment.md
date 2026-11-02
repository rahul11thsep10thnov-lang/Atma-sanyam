# 16 – Assessment architecture

> **Implementation notes (2026-11-02).** The mastery model in section 5 is implemented in
> `src/dadu/engines/mastery.ts` (`updateMastery`, `masteryState`, `dueForRevision`, `pickNextDifficulty`,
> `summarise`); assessment sets and the twelve question-type validators are in
> `src/dadu/engines/assessment.ts` (`buildAssessment`, `buildOlympiad`, `isCorrect`, `resultWeight`,
> `recordAnswer`). Items are currently drawn from lesson quiz steps (`src/dadu/content/lessons/`);
> dedicated per-concept question banks are not yet authored. Unit tests:
> `src/dadu/__tests__/engines.mastery.test.ts`. One deviation: the "needs revision" state is derived
> from attempts, score and the due date (no separate "was mastered" flag is stored on `MasteryRecord`).

Follows `00-canon.md`. Related: `11-eight-sections.md` (lesson IDs, concepts), `12-age-adaptive-interface.md`
(adaptation engine inputs), `15-real-world-assignments.md` (practical activities), `02-character-bible.md`
(Dadaji's and Mitthu's lines), `19-parent-dashboard.md` (reports), `17-database-schema.md` (tables
`assessment_items`, `assessment_attempts`, `mastery`).

## 1. Principles

- Dadaji is the quiz master. Every assessment is framed as "let us see what we found out today",
  never as a test of the child.
- Immediate, warm feedback. A wrong answer gets a short explanation and another go.
- No single score judges a child. The system stores mastery per concept and shows trends, never a
  rank, a percentile or a "grade".
- Age-appropriate formats. Little mode (A0–A2) never shows text-only questions.
- Adaptive but explainable. Parents can read why Dadaji chose an easier or harder question.
- Assessment feeds revision. Weak concepts flow to Mitthu's Echo and to the next daily practice.

## 2. Assessment types

| Type | Key | Length | When | Bands | Source of items |
|---|---|---|---|---|---|
| Daily practice | `daily` | 5–8 items, under 5 min | Dadaji's plan, once a day | A1–A5 | Mix of due revisions and the current topic |
| Chapter test | `chapter` | 6–12 items | End of a topic cluster | A2–A5 | Items tagged to the chapter's concepts |
| Subject test | `subject` | 12–20 items | End of a subject unit | A3–A5 | Across the subject's chapters |
| Weekly test | `weekly` | 10 items | Once a week, optional in Little mode | A2–A5 | The week's lessons |
| Monthly assessment | `monthly` | 15–25 items | Monthly, parent can disable | A3–A5 | All subjects studied that month |
| Revision test | `revision` | 8–12 items | Generated when concepts fall below the revision threshold | A2–A5 | Due concepts only |
| Comprehensive test | `comprehensive` | 25–40 items, in two sittings | End of a term or on parent request | A4–A5 | Whole curriculum to date |
| Challenge test | `challenge` | 5–10 harder items | Child opt-in, from the Tests tab | A3–A5 | `stretch` difficulty items |
| Olympiad-style practice | `olympiad` | 10–20 reasoning items, timed gently | Opt-in | A4–A5 | Reasoning and problem-solving banks, age-appropriate |

A0 has no assessments. A1 only has `daily` in the form of play: matching, tapping the right
picture, sound recognition, and the result is recorded as exposure, not accuracy.

## 3. Question types

Twelve item types. Each item is a JSON document in `assessment_items` with the common envelope
plus a `type`-specific `body`. Common envelope:

```json
{
  "id": "q.academic.math.counting.03.07",
  "lessonId": "academic.math.counting.03",
  "conceptIds": ["academic.math.counting.one_to_ten"],
  "type": "image_recognition",
  "ageBands": ["A1", "A2"],
  "difficulty": "steady",
  "modes": ["little", "explorer"],
  "prompt": { "text": { "en": "How many mangoes?" }, "audio": "q/.../prompt.{lang}.opus", "speaker": "dadaji" },
  "body": { },
  "feedback": {
    "correct": { "text": { "en": "Five mangoes, exactly right. Gauri wants them all!" }, "audio": "…" },
    "incorrect": { "text": { "en": "Let us count together: one, two, three, four, five." }, "audio": "…" },
    "explanation": { "text": { "en": "Touch each mango once as you count." } }
  },
  "timeHintSeconds": 30,
  "provenance": { "author": "admin:…", "source": "NCERT Maths Class 1, ch. 2", "aiDrafted": false },
  "verification": { "educational": "ok", "factual": "ok", "language": { "en": "ok" } },
  "version": 2
}
```

| # | Type | Key | Bands | Body schema (summary) | Scored how |
|---|---|---|---|---|---|
| 1 | Multiple choice | `mcq` | A2–A5 | `options[]` {id, text, image?, audio?}, `answer` id, `shuffle` bool. Little mode: 3 options with pictures. | 1 if `answer` matches |
| 2 | True/false | `true_false` | A3–A5 | `statement`, `answer` bool, `whyAudio` | 1/0 |
| 3 | Matching | `match` | A1–A5 | `left[]`, `right[]` (images or text), `pairs[]` of ids | Fraction of correct pairs; full credit only at 100% for A3+ |
| 4 | Fill in the blanks | `fill_blank` | A3–A5 | `text` with `{{1}}` slots, `slots[]` {accepted[], caseInsensitive, wordBank?} | Fraction of slots; typo tolerance 1 edit for A3 |
| 5 | Image recognition | `image_recognition` | A1–A5 | `images[]` {id, asset, alt}, `answer` id, `promptSpoken` required | 1/0 |
| 6 | Audio recognition | `audio_recognition` | A1–A5 | `clips[]` {id, asset}, `answer` id, or a single clip with picture options | 1/0 |
| 7 | Drag-and-drop | `drag_drop` | A1–A5 | `items[]`, `targets[]`, `placements[]` of (item, target); `oneToOne` bool | Fraction placed correctly |
| 8 | Sequencing | `sequence` | A2–A5 | `cards[]`, `order[]` | 1 if exact; partial credit for adjacent pairs (A2–A3) |
| 9 | Memory game | `memory` | A1–A4 | `pairs[]` {a, b} (image–image, word–image, sound–image), `gridSize` | Exposure for A1; for A2+ scored on pairs found within `moveBudget` |
| 10 | Practical activity | `practical` | A2–A5 | `assignmentId` (`15-real-world-assignments.md`) or an in-app simulation step list; parent or Dadaji confirms | Confirmed = 1; never scored for quality |
| 11 | Oral question | `oral` | A2–A5 | `question`, `expectedKeywords[]`, `recordAllowed` false by default; child answers aloud to the parent or Dadaji, parent taps "answered" | Parent tick; optional keyword self-check for A4+ typing |
| 12 | Drawing task | `drawing` | A1–A5 | `instruction`, `canvas` {size, tools}, `rubricHints[]` for the parent | Completion = 1; saved to the child's gallery |

Rules by band:

| Band | Allowed types |
|---|---|
| A0 | none |
| A1 | image_recognition, audio_recognition, match, drag_drop, memory, drawing |
| A2 | A1 types plus mcq (pictures), sequence, practical, oral |
| A3 | all except none; fill_blank with a word bank |
| A4–A5 | all; fill_blank free text; mcq with four or five options; timed Olympiad items |

Oral answers are never recorded by default. If a parent enables voice recording for a child
(DPDP consent, `19-parent-dashboard.md`), recordings stay on the device and are deleted after
the parent reviews them.

## 4. Dadaji as quiz master

### Session script pattern

```
OPEN      Dadaji: "Beta, let us see what we discovered today."  (A1: "Let us play a finding game!")
ITEM n    Dadaji reads the prompt (audio always, text by band).
          Gopu occasionally thinks aloud a wrong idea; Molly or Kim may add a hint on the second try.
ANSWER    Immediate feedback (see lines below). On incorrect: explanation, then one retry (A1–A3)
          or move on with the explanation (A4–A5, retry only in daily practice).
BREAK     Every 6 items in Little mode, every 10 in Explorer mode: a 10-second character moment.
CLOSE     Dadaji summarises what went well and one thing to look at again, then Mitthu's Echo if due.
```

### Feedback lines (never shaming)

| Situation | Dadaji says (English; Hindi equivalents in `02-character-bible.md`) |
|---|---|
| Correct, first try | "Shabash! That is exactly it." / "You saw it straight away." |
| Correct, second try | "There it is. Trying again is how we learn." |
| Incorrect, first | "Hmm, not this one. Look once more at …" (explanation) "Shall we try again?" |
| Incorrect, second | "This one is tricky. The answer is … because … We will meet it again soon." |
| Many incorrect in a row (3) | "Beta, let us take a breath. Kim wants to show you something." (switch to an easier concept or a break) |
| Timed out (Olympiad only) | "Time flew. No matter, let us look at it together." |
| Session end | "Today you learned … . Tomorrow we will look again at … ." |

Forbidden words anywhere in feedback: wrong, fail, bad, stupid, slow, lazy, "everyone else",
scores compared to other children. The CMS lints for these.

## 5. Adaptive difficulty and the mastery model

### 5.1 Per-concept mastery score

Every item is tagged with one or more concept IDs (`<section>.<subject>.<concept>`). For each
child and concept the system stores `m` in [0, 1], a confidence count `n`, and a due date.

Update after each answered item with result `r` in [0, 1] and item difficulty weight `w`
(`gentle` 0.8, `steady` 1.0, `stretch` 1.25):

```
alpha  = 0.35 if n < 3 else 0.2          (early answers move the score more)
target = r * w, clipped to [0, 1]
m'     = m + alpha * (target - m)
n'     = n + 1
```

A second-try correct answer counts `r = 0.6`; a parent-confirmed practical or oral item counts
`r = 0.8` (confirmed, not graded).

### 5.2 Mastery states

| State | Condition | Shown to parent as |
|---|---|---|
| New | n = 0 | Not started |
| Exploring | n < 3 | Just started |
| Growing | m < 0.6 | Needs practice |
| Nearly there | 0.6 ≤ m < 0.8 | Getting there |
| Mastered | m ≥ 0.8 and n ≥ 4 | Mastered |
| Needs revision | was Mastered and (m < 0.7 or overdue) | Time to revise |

### 5.3 Spaced revision

Each concept has a revision interval in days, `i`, starting at 1.

```
after a correct review:   i' = min(60, round(i * 2.2))      next due = today + i'
after an incorrect review: i' = 1                             next due = tomorrow
if nothing due:            daily practice fills with the current topic
```

Daily practice takes the two most overdue concepts first, then new material. Mastered concepts
with `i = 60` still return every two months so the "Mastered" state is earned, not frozen.

### 5.4 Choosing the next item's difficulty

Inputs: concept mastery `m`, the parent difficulty setting (`gentle`, `steady`, `stretch`), the
age band, the last three results.

```
base      = gentle if m < 0.5, steady if m < 0.8, else stretch
parent    = shifts base one step down (gentle) or up (stretch); steady leaves it
streak    = three correct in a row at this level: shift up one step; two incorrect: shift down one
bands     = A1–A2 never serve stretch; A5 never serves gentle twice in a row for a Mastered concept
```

The rule is written in full in the child's "Why this question?" sheet in the parent dashboard,
for example: "Counting to ten is Nearly there (0.72). Your setting is Steady. Last three answers
were right, so Dadaji chose a slightly harder one."

### 5.5 What adaptivity never does

- Never locks a child out of a lesson for low mastery.
- Never shows the child the number `m` or any score.
- Never compares with other children.
- Never speeds up a session; the pace controls in `12-age-adaptive-interface.md` are the child's and the parent's.

## 6. Tracking

Stored per attempt (`assessment_attempts`) and aggregated nightly on the device and on the server
when online (`18-api.md`, progress sync).

| Metric | Definition | Where shown |
|---|---|---|
| Accuracy | Correct on first try ÷ items answered, per session and rolling 30 days | Parent dashboard; never the child |
| Concepts mastered | Count of concepts in the Mastered state | Parent dashboard; child sees them as "things I know" stars |
| Concepts requiring revision | Count in Needs revision or Growing with n ≥ 3 | Parent dashboard; feeds Mitthu's Echo |
| Learning progress | Lessons completed ÷ lessons in the child's current plan, per section | Both (child: Dadaji's map of lit-up rooms) |
| Subject-wise performance | Mean mastery per subject, with the number of concepts behind it | Parent dashboard |
| Improvement over time | Mean mastery per subject, weekly, 12-week trend | Parent dashboard |
| Time on assessments | Minutes per day | Screen-time report |

Each aggregate carries the sample size, and the dashboard greys out any number built on fewer
than five items ("too early to say").

## 7. Reporting to parents

- Weekly report (push plus in-app): three lines per subject in plain language, "Mastered this
  week", "Practising", "Dadaji suggests", then one real-world adventure to try.
- A per-concept drill-down with the "Why this question?" explanation and the last ten answers.
- Export (CSV and PDF) from the parent dashboard, DPDP data-portability.
- No report ever shows a percentile, a rank or a comparison with other children.

## 8. Mitthu's Echo and revision

Mitthu's Echo (`02-character-bible.md`) is the spoken revision step. The assessment engine feeds it:

1. After each session, the concepts answered incorrectly twice, and any concept that moved to
   Needs revision, are placed in the child's `echoQueue` with the lesson's key clauses
   (each lesson stores 3–6 `keyClauses` per language in `11-eight-sections.md`).
2. Trigger rules: every third lesson, at the end of a topic, on a parent-requested revision, or
   when the `echoQueue` holds three or more concepts.
3. Format: Mitthu repeats a clause with a musical lilt; Gopu repeats; the child is invited to
   repeat (no recording). Two or three clauses, 30–60 seconds. Then one `audio_recognition` or
   `image_recognition` item from the same concept, scored with `r = 0.8` on success (it is a
   recall check, not a test).
4. A clause leaves the queue after two successful echoes on different days.

## 9. Anti-patterns (what reviewers reject)

- Items that test reading ability when the concept is maths (for A1–A3, prompts are always spoken).
- Trick questions, double negatives, "all of the above".
- Distractors that are culturally obscure or that mock a plausible mistake.
- Time pressure outside opt-in Olympiad practice.
- Any single-number summary of a child ("78% ready").
- Leaderboards, class rankings, sharing results between profiles.
- Items that reveal the answer in the picture, or pictures that need colour vision alone (use shape plus colour).

## 10. Phase plan

| Phase (`21-roadmap.md`) | Delivered |
|---|---|
| 4 | Item envelope, types 1–8, daily and chapter tests for Academic Learning, mastery model, local storage |
| 5 | Types 9–12, subject and weekly tests across all sections |
| 7 | Practical items linked to assignments |
| 8 | Monthly, revision, comprehensive, challenge, Olympiad; Mitthu's Echo queue; server aggregation and parent reports |
| 10 | CMS linting, item analytics (items that most children miss get flagged to the educational reviewer) |
