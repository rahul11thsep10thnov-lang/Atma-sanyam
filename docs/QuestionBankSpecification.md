# Question Bank Specification

Code: `backend/src/services/questionService.ts`, `qualityService.ts`, `importService.ts`, `taxonomyService.ts`; admin pages under `admin/src/app/(console)/questions`, `quality`, `import`, `review`.

## Taxonomy

Exam → Subject → Chapter → Topic (optional). A question always has exam, subject and chapter; the chapter must belong to the subject and the topic to the chapter (checked on create, edit and bulk edit). Extra bank columns: external id, topic label, subtopic, concept, cognitive level, year and others used by imports and filters.

## Data model (main fields)

| Field | Notes |
|---|---|
| `question_text`, options (`question_options`: label, text, optional SVG), `correct_option`, `explanation` | Options A–D (up to 8) |
| `difficulty` | easy / medium / hard |
| `language` | Enabled languages only (Hinglish, Hindi, English…) |
| `status` | draft, generated, validating, needs_review, approved, rejected, published, archived |
| `source`, `source_name`, `source_reference`, `source_material_id`, `valid_as_of` | Provenance and the date facts were checked |
| `fingerprint`, `duplicate_of_id`, `duplicate_score` | Duplicate detection |
| `validation_issues` | Output of the validator (errors block approval) |
| `version` | Content version; see [QuestionVersioningSpecification.md](QuestionVersioningSpecification.md) |

## Status workflow

```
draft / generated / needs_review ──approve──▶ approved ──publish──▶ published
        │                               ▲         ◀──unpublish──
        └──reject──▶ rejected ──approve─┘
any (except archived) ──archive──▶ archived ──restore──▶ needs_review
```

Publishing always needs an explicit approval first; AI output is never published directly. Questions with validation errors cannot be approved.

## Quality gates on every save

The validator (answer and explanation agree, duplicate options, missing explanation, metadata scope, computed answers for numeric items), duplicate check against the same exam, subject and language, and source presence. A human edit keeps approved or published status (audited). An edit of a rejected question sends it back to review.

## Bulk management

| Operation | Endpoint | Notes |
|---|---|---|
| Approve / reject / publish / unpublish / archive / restore | `POST /admin/questions/bulk` | Per-question result with reason |
| Approve and publish everything that passed | `POST /admin/questions/approve-publish-all` | Scoped by exam or job |
| Edit chapter, topic, difficulty, source name / reference, valid-as-of | `POST /admin/questions/bulk-edit` | Each question gets a revision. Skips are listed per question (`chapter_not_in_subject`, `topic_not_in_chapter`, `archived`). Moving chapter drops a topic of the old chapter |

## Import / export

- **Import**: CSV / JSON through the console (`POST /admin/imports`, dry-run first) or `npm run seed:bank` for large files (2,000-row chunks). Rows land in review. Re-importing skips rows whose external id exists.
- **Export**: question papers as PDF from the mock-test pages.
- **Not available**: bulk CSV export of the bank is not implemented (see the register).

## Source verification

Source material can be uploaded and approved (`/admin/source-materials`); questions can point to it. The quality dashboard counts questions with no source and with facts older than two years (`valid_as_of`).

## Performance intelligence (Quality page)

`GET /admin/questions/quality?examId&subjectId&chapterId&minSample&flag&limit`

- **Content health**: total, published, awaiting review, missing explanation, missing source, possible duplicates, stale facts, difficulty mix.
- **Per question** (answers from finished attempts only): served, answered, correct, accuracy, skip rate, average time, choices per option.
- **Flags**, raised only when answers ≥ `minSample` (default 30, minimum 5):

| Flag | Rule |
|---|---|
| `key_suspect` | A wrong option was chosen more often than the keyed one |
| `too_hard` | Accuracy ≤ 15% |
| `too_easy` | Accuracy ≥ 95% |
| `dead_distractor` | An option was chosen by < 2% of those who answered |
| `high_skip` | ≥ 50% of those served skipped it |

The admin question page also shows the question's own accuracy (with a minimum-attempts note) and its use in tests.
