# 20 – Admin panel and content management system

Follows `00-canon.md`. Related: `17-database-schema.md` (tables and workflow columns), `18-api.md`
(`/admin/v1/dadu/*`), `14-voice-audio.md` (audio review), `13-story-library.md` (rights),
`15-real-world-assignments.md` (safety checklist), `16-assessment.md` (item linting), `21-roadmap.md`.

## 1. Starting point

The repository already has an admin console (`admin/`, Next.js 16 App Router) with sign-in through
an httpOnly cookie, a same-origin proxy to the API, a sidebar shell (`admin/src/components/ConsoleShell.tsx`),
UI primitives, a content form, charts, and pages for users, content, categories, configuration,
reports, notifications, analytics, admins and the audit log. RBAC is defined once in
`backend/src/database/rbac.ts` and enforced per request.

DADU keeps all of that and adds a **DADU** group to the sidebar. Existing pages stay for the
account, admins, audit, configuration and analytics; the Tame picture library pages are retired in
Phase 10.

## 2. Entities managed

| Entity | Console route | Backing tables (`17-database-schema.md`) | Workflow? |
|---|---|---|---|
| Characters and voice profiles | `/dadu/characters` | `characters`, `voice_profiles` | Versioned, no 8-step flow (art and voice reviewed in a lighter 3-step flow: draft, review, approve) |
| Age groups | `/dadu/age-bands` | `age_bands` (A0–A5, read-mostly) | No |
| Languages | `/dadu/languages` | `languages`, `translations` | Per-string proofreading state |
| Sections, subjects, topics | `/dadu/curriculum` | `sections`, `subjects`, `topics`, `concepts` | Light flow |
| Lessons and lesson steps | `/dadu/lessons` | `lessons`, `lesson_versions`, `lesson_steps` | 8-step |
| Stories | `/dadu/stories` | `stories`, `story_versions` | 8-step |
| Copyright permissions | `/dadu/rights` | `rights_records` | Own states: requested, granted, denied, expired |
| Illustrations, videos, animations | `/dadu/media` | `media_assets` | Rights check plus review |
| Quizzes and question banks | `/dadu/items` | `assessment_items`, `item_banks` | 8-step (audio review only when audio present) |
| Difficulty rules | `/dadu/difficulty` | `difficulty_rules` | Light flow |
| Background music | `/dadu/music` | `music_tracks` | Rights plus audio review |
| Real-world assignments | `/dadu/assignments` | `rwa_assignments`, versions | 8-step plus safety checklist |
| Rewards | `/dadu/rewards` | `badges`, `reward_items`, `decorations` | Light flow |
| Locations and interactive objects | `/dadu/world` | `locations`, `objects` | 8-step (an object is a learning item) |
| Notifications | existing `/notifications` | `notifications` | Existing |
| Content versions and packs | `/dadu/versions`, `/dadu/packs` | `content_versions`, `content_packs` | Publishing only |

## 3. The eight-step approval workflow

A state machine applied to every learning item (lesson, story, assessment item, assignment,
interactive object). Column `workflow_state` on the version row; every transition writes an
`audit_logs` row and a `workflow_events` row with the reviewer, the checklist and a note.

```
                ┌──────────────────────────── changes requested ───────────────────────┐
                ▼                                                                       │
 ┌───────┐   ┌──────────────────┐   ┌──────────────────┐   ┌─────────────────────┐      │
 │ draft │──▶│ educational_review│──▶│ factual_verification│──▶│ language_proofreading│──┐  │
 └───────┘   └──────────────────┘   └──────────────────┘   └─────────────────────┘  │  │
                                                                                     ▼  │
                                   ┌───────────┐   ┌──────────┐   ┌──────────────┐   ┌──────────────────────┐
                                   │ published │◀──│ approved │◀──│ audio_review │◀──│ copyright_verification│
                                   └───────────┘   └──────────┘   └──────────────┘   └──────────────────────┘
                                         │
                                         ▼
                                   ┌───────────┐
                                   │ retired   │
                                   └───────────┘
```

| # | State | Who may advance it | Checklist to tick before advancing |
|---|---|---|---|
| 1 | `draft` | editor, admin | Mandatory metadata complete (section 4); at least one language complete; no forbidden words |
| 2 | `educational_review` | educational_reviewer | Learning objective matches content; age-band fit; teaching formula followed; safety checklist (assignments); assessment linkage |
| 3 | `factual_verification` | fact_checker | Every factual claim has a source in provenance; history/mythology/belief labelling (`08-temple-courtyard.md`); numbers and dates checked |
| 4 | `language_proofreading` | proofreader (per language; all launch languages for the item must be ticked) | Spelling, grammar, register for the band, Unicode and font rendering checked on device preview |
| 5 | `copyright_verification` | rights_officer | Every media asset, text and music track has a rights record in `granted` or `public_domain`; attribution text present where required |
| 6 | `audio_review` | audio_reviewer | Every dialogue line has audio per language; voice matches the character profile; loudness within spec (`14-voice-audio.md`); captions match audio |
| 7 | `approved` | publisher, admin | Final preview in Little and Explorer mode; version note written |
| 8 | `published` | publisher, admin | Pack build succeeded; scheduled or immediate |

Rules:

- Any reviewer may send an item back to `draft` with "changes requested" and a note; the item
  keeps its checklist ticks for steps that did not change (text edits clear steps 3–6, audio-only
  edits clear step 6).
- A person may not advance an item they authored (`created_by`) through steps 2, 3 or 7.
- Skipping is impossible; the API rejects transitions that are not adjacent.
- `published` items are immutable; editing creates a new version in `draft`, and publishing the
  new version retires the old one. Devices receive the new version on the next pack delta.
- Emergency `unpublish` (admin) moves a published version to `retired` immediately and pushes a
  pack delta that hides it; the reason is mandatory and audited.

## 4. Mandatory metadata on every learning item

| Field | Type | Validation |
|---|---|---|
| `learningObjective` | text per language | 10–200 characters, starts with a verb in English ("Name…", "Explain…") |
| `ageBands` | set of A0–A5 | at least one; assessment types must be allowed for each band (`16-assessment.md`) |
| `section` | enum (8) | from `sections` |
| `subject`, `topic` | foreign keys | must exist and be active |
| `difficulty` | gentle, steady, stretch | |
| `prerequisites` | list of item IDs | must exist; no cycles (checked on save) |
| `sourceProvenance` | structured: author, sources[] {title, publisher, year, url?, pages?}, `aiDrafted` bool, `aiModel`?, `aiPrompt`? | at least one source for factual content; `aiDrafted` items require a human source for every factual claim |
| `verificationStatus` | derived from the workflow state and checklist ticks | read-only |
| `versionHistory` | list of versions with state, author, dates, diff summary | read-only |

The save endpoint refuses an item whose mandatory metadata is incomplete, and the form shows the
missing fields inline.

## 5. Roles and permissions

Extends `backend/src/database/rbac.ts`. New permission keys use the `dadu:` prefix; existing roles
keep their meaning.

| Permission | super_admin | admin | editor | educational_reviewer | fact_checker | proofreader | rights_officer | audio_reviewer | publisher |
|---|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| dashboard:read | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| dadu:content:read | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| dadu:content:write (draft) | ✓ | ✓ | ✓ | — | — | — | — | — | — |
| dadu:review:educational | ✓ | ✓ | — | ✓ | — | — | — | — | — |
| dadu:review:factual | ✓ | ✓ | — | — | ✓ | — | — | — | — |
| dadu:review:language:<code> | ✓ | ✓ | — | — | — | ✓ (per assigned languages) | — | — | — |
| dadu:review:rights | ✓ | ✓ | — | — | — | — | ✓ | — | — |
| dadu:review:audio | ✓ | ✓ | — | — | — | — | — | ✓ | — |
| dadu:approve | ✓ | ✓ | — | — | — | — | — | — | ✓ |
| dadu:publish | ✓ | ✓ | — | — | — | — | — | — | ✓ |
| dadu:unpublish | ✓ | ✓ | — | — | — | — | — | — | — |
| dadu:rights:write | ✓ | ✓ | — | — | — | — | ✓ | — | — |
| dadu:media:write | ✓ | ✓ | ✓ | — | — | — | — | — | — |
| dadu:world:write | ✓ | ✓ | ✓ | — | — | — | — | — | — |
| dadu:packs:build | ✓ | ✓ | — | — | — | — | — | — | ✓ |
| dadu:characters:write | ✓ | ✓ | — | — | — | — | — | — | — |
| dadu:ai:draft | ✓ | ✓ | ✓ | — | — | — | — | — | — |
| users:*, settings:*, notifications:*, analytics:read, audit:read, admins:* | existing matrix | | | | | | | | |

Proofreaders are assigned languages on their admin record (`admins.languages text[]`), and the
permission check compares the item's language with that list. The existing safeguards remain
(no self-role change, last super admin protected).

## 6. Console screens

### 6.1 DADU dashboard (`/dadu`)

```
┌───────────────────────────────────────────────────────────────────────┐
│ DADU · Content dashboard                                               │
├────────────────┬────────────────┬────────────────┬────────────────────┤
│ In my queue 14 │ Published 1,208│ Blocked rights 9│ Pack build: ok 2h  │
├────────────────┴────────────────┴────────────────┴────────────────────┤
│ Pipeline by state                                                      │
│ draft 61 ▸ edu 22 ▸ fact 15 ▸ lang 40 ▸ rights 9 ▸ audio 18 ▸ appr 7   │
├───────────────────────────────────────────────────────────────────────┤
│ Coverage by section × age band (published lessons)                     │
│            A0  A1  A2  A3  A4  A5                                      │
│ academic   12  40  85  120 140 130                                     │
│ stem        0   4  12   30  48  52   …                                 │
├───────────────────────────────────────────────────────────────────────┤
│ Language coverage: en 100% · hi 96% · bn 71% · ta 64% · … · sa 22%     │
└───────────────────────────────────────────────────────────────────────┘
```

### 6.2 Item list (`/dadu/lessons`, same pattern for stories, items, assignments, objects)

Filters: state, section, subject, age band, language coverage, assigned reviewer, "mine",
AI-drafted, blocked by rights. Columns: ID, title, section, bands, state (chip), languages done,
updated, assignee. Bulk actions: assign reviewer, request changes, export CSV.

### 6.3 Lesson editor (`/dadu/lessons/[id]`)

```
┌──────────────────────────────┬──────────────────────────────────────────┐
│ academic.math.counting.03 v4 │ State: language_proofreading  [Advance ▸]│
│ Metadata                     │ Checklist for this step                  │
│  Objective  [……………………………]    │ [✓] en  [✓] hi  [ ] bn  [ ] ta           │
│  Bands  A1 A2 ▣ A3 ▣         │ Note to author  […………………]                │
│  Section  Academic ▾         │ [Request changes] [Advance to rights]    │
│  Subject/Topic  Maths/Count ▾├──────────────────────────────────────────┤
│  Difficulty  steady ▾        │ Preview   [Little ▾] [hi ▾] [▶ Play]     │
│  Prerequisites  [+]          │  (device-sized preview of the lesson)    │
│  Provenance  [sources…]      │                                          │
├──────────────────────────────┤                                          │
│ Steps (drag to reorder)      │                                          │
│  1 intro      dadaji  ▶ 0:12 │                                          │
│  2 question   gopu    ▶ 0:05 │                                          │
│  3 explain    dadaji  ▶ 0:40 │                                          │
│  4 activity   drag_drop      │                                          │
│  5 feedback   dadaji         │                                          │
│  6 assess     q.…03.01–05    │                                          │
│  7 echo       mitthu  3 clauses                                         │
├──────────────────────────────┴──────────────────────────────────────────┤
│ Translations: en ✓ hi ✓ bn ◐ ta ○ …   Audio: en ✓ hi ✓ bn ○ …   History │
└─────────────────────────────────────────────────────────────────────────┘
```

Every step row opens its text per language, its speaker, emotion, audio file, caption and
timing (`14-voice-audio.md` script format). A "forbidden words" lint runs on save
(`16-assessment.md` section 4), as does the toxic-plant and forbidden-activity lint for
assignments.

### 6.4 Translation management (`/dadu/languages/[code]`)

- A table of every string (UI strings, lesson text, story text, item text, captions) with source
  language, target, state (missing, machine draft, proofread), proofreader, date.
- Side-by-side editor with the source, glossary hints (Dadaji's fixed terms such as "beta",
  character names never translated, number formats per language), and an on-device font preview
  for the script.
- Machine drafts are allowed as a starting point, marked `machine_draft`, and can never reach
  `proofread` without a human proofreader with that language permission.
- Import and export as XLIFF 2.0 and CSV for agencies; re-import keeps the state machine
  (imported strings arrive as `machine_draft` or `translated_unreviewed`, never `proofread`).

### 6.5 Rights (`/dadu/rights`)

Each record: work, rights holder, type (public domain, licensed, commissioned, own), territory,
term, permitted uses (adaptation, translation, narration, distribution), attribution text,
contract file, expiry, linked items. Items linked to a record that is `expired` or `denied` are
blocked from publishing and flagged on the dashboard. `13-story-library.md` lists the first set.

### 6.6 Media (`/dadu/media`)

Upload to object storage through the API with type checks, size limits, image optimisation
(WebP, three sizes), audio transcoding (Opus, `14-voice-audio.md`), and a mandatory rights record
before an asset can be used. Rive and Lottie files are validated and previewed. Every asset
carries alt text per language.

### 6.7 Packs (`/dadu/packs`)

Builds content packs per language, section and age band from published versions; shows size,
delta since the last build, items included; "Build" then "Publish" with a scheduled time; rollback
to the previous pack. The build is a server job (`18-api.md`), and failures show the failing item.

## 7. Bulk import

| Format | Used for | Notes |
|---|---|---|
| CSV (UTF-8, one row per item) | Assessment items, assignments catalogue, object map | Columns match the JSON schema's top-level fields; nested fields as JSON strings; dry run reports errors per row |
| JSON lines | Lessons, stories with steps | One item per line, full schema; validated with the same zod schemas as the API |
| XLIFF 2.0 | Translations | Section 6.4 |
| ZIP of audio | Audio per item and language, named by the convention in `14-voice-audio.md` | Matched by filename; unmatched files reported |

All imports land in `draft` and go through the full workflow.

## 8. AI-assisted drafting policy

- AI may draft text (lesson steps, distractors, translations, story adaptations) only through the
  console's "Draft with AI" action, which stores the model, the prompt and the output hash in the
  item's provenance (`aiDrafted: true`).
- AI-drafted content is never shown to a child until it has passed every workflow step like any
  other item; `factual_verification` requires a human-cited source per claim.
- AI never generates: facts about religion or history without a cited source, safety
  instructions, medical or nutrition claims, or anything for A0–A1 without a human rewrite.
- Usage is minimised: drafting is batched per topic, cached by prompt hash, rate-limited per
  admin per day, and turned off entirely by a feature flag. Costs appear on the dashboard.
- No child data is ever sent to any AI service. The app itself calls no AI service at runtime at
  launch; if a later phase adds in-app AI (for example open questions to Dadaji), it is scoped to
  safe, age-appropriate educational content behind a separate design review.

## 9. Audit and safety

- Every create, edit, transition, publish, unpublish, rights change, role change and import is
  written to `audit_logs` (existing table) with the admin, action, entity, before/after summary.
- Console sessions follow the existing rules (httpOnly cookie, 12-hour absolute expiry, lockout
  after five failures).
- Reviewer queues show items oldest first; an item waiting more than 14 days in any state is
  flagged on the dashboard.
- Two-person rule: publishing an item that touches `08-temple-courtyard.md` content or any
  assignment with tier `assist` or `together` needs a second approver.

## 10. Phase plan

| Phase | Delivered in the console |
|---|---|
| 1 | Characters, languages, world (locations, objects) skeleton; RBAC roles added |
| 2 | Object editor with the interaction contract |
| 3 | Audio upload, voice profiles, audio review step |
| 4 | Lesson editor, item editor, full 8-step workflow, packs |
| 6 | Stories, rights records |
| 7 | Assignments with the safety checklist |
| 8 | Rewards, difficulty rules, item analytics |
| 10 | Translation management at scale, bulk import, AI drafting with policy, dashboard coverage views, retirement of the Tame pages |
