# Question Versioning Specification

## Goal

A result must always show the question exactly as the student saw it, and be scored against the key that was in force then, even if the question is edited or corrected later. History is never rewritten.

## Model

- `questions.version` (integer, starts at 1): the current version, always in the `questions` row.
- `question_revisions`: one row per replaced version, unique on `(question_id, version)`. It holds `snapshot` (JSON: text, options with SVGs, key, explanation, difficulty, language, taxonomy ids, computation, source fields, valid-as-of, figure), `change_kind` (`edit` | `restore` | `bulk_edit`), `change_summary`, `changed_by` (admin) and `created_at` (when it was replaced).
- `test_answers.question_version` and `correct_option_snapshot`: written when an attempt starts.

Revision rows are only inserted, never updated or deleted, except when the question itself is hard-deleted. Hard deletion is allowed only for questions never used in a test or answered.

## Rules

1. **Edit** (`PUT /admin/questions/:id`). Inside one transaction:
   - lock the question row (`FOR UPDATE`);
   - insert the current content as revision `version`;
   - write the new content with `version + 1`.

   Concurrent edits are serialised, so no version is lost.
2. **Bulk edit** (`POST /admin/questions/bulk-edit`): the same, per question, with `change_kind = bulk_edit` and the reason given.
3. **Restore** (`POST /admin/questions/:id/revisions/:version/restore`): the chosen snapshot goes through the normal edit path. It is validated again, and the replaced version is stored with `change_kind = restore`. The result is a new version; nothing is deleted. Figures stay attached (figure questions keep their identity).
4. **Status changes** (approve, publish, archive…) do not create versions; they are in the review history and audit log.

## Use in results

- Scoring uses `correct_option_snapshot` (falls back to the current key only for attempts from before migration 0006).
- `GET /attempts/:id`: for each question whose served version differs from the current one, the text, options, key and explanation come from that version's revision.

## Admin

The question page has a **Versions** panel: current version, earlier versions (expand to see wording, options and key), who changed it and why, and **Restore this version**.

## Verified by

`backend/tests/question-versioning.test.ts`:

- edit during a running attempt → the result shows the served wording and scores against the served key;
- restore creates v3 with the v1 content;
- bulk edit creates revisions and lists skips;
- an unknown version gives 404.
