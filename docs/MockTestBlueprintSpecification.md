# Mock Test Blueprint Specification

Code: `backend/src/services/mockTestService.ts` (`selectQuestions`, `generateMockTest`, `saveBlueprint`, `generateFromBlueprint`); admin: Mock Tests pages.

## Blueprint

| Field | Meaning |
|---|---|
| exam, language | Only published questions of this exam and language are eligible |
| total questions, duration, marks per question, negative marks | Test rules |
| difficulty distribution | easy / medium / hard percentages, must add up to 100 |
| sections | `[{ subjectId, count, chapters?: { chapterId: n } }]`. Counts must add up to the total; chapter counts cannot exceed the section count |

Blueprints are stored (`mock_blueprints`) and can generate many tests at once (`generateFromBlueprint`, optionally publishing them).

## Selection engine

For each section:

1. Chapter quotas first, then the rest of the section from any chapter of the subject.
2. Each part is split by the difficulty percentages (largest-remainder rounding).
3. Within a difficulty, **least-used questions first** (usage across this exam's non-archived tests), random tie-break.
4. No repeats within a test, and **no two questions from one duplicate cluster** (same id, duplicate-of link or fingerprint).
5. If a difficulty runs short, neighbouring difficulties fill in. **This is reported as a warning in the selection report**, never silently.
6. The section is shuffled so it does not run easy → hard.

## No silent shortfall

If any section cannot be filled to its count, generation fails with **422** "Not enough published questions for this test", with a per-section report (requested, available, selected, by difficulty). A test with fewer questions than its blueprint is never created.

Publishing a test re-checks that every question is still published (422 if not). Swapping a question in a test picks a replacement from the same subject and language, and is refused while a student is taking the test (409).

## Public exposure

Students see a test's details and section counts. The questions are served only after they start the test (which enforces the free quota and plan), and never the key. See [SecurityAudit.md](SecurityAudit.md).

## Not included

Topic-level quotas (below chapter) and per-section time limits are not part of blueprints.
