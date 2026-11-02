# DADU – Database schema

PostgreSQL, Drizzle ORM, SQL migrations in `backend/drizzle/`, as today. Follows `00-canon.md`
for ids, bands and languages; the API that reads these tables is in `18-api.md`; the workflow
rules are in `20-admin-cms.md`. Conventions carried over from `backend/src/database/schema.ts`:
`uuid` primary keys with `defaultRandom()`, `created_at` / `updated_at` with time zone, `text`
columns with `check` constraints for enums, `jsonb` for typed documents validated by zod before
writing, explicit indexes on every foreign key used in a list.

All DADU tables are prefixed `dadu_`. Existing Tame tables (`users`, `user_sessions`,
`otp_codes`, `password_reset_codes`, `admins`, `admin_sessions`, `roles`, `permissions`,
`role_permissions`, `devices`, `notifications`, `events`, `audit_logs`, `app_settings`) are
reused unchanged unless noted. Tame's social and focus tables are not used by DADU.

---

## 1. ER overview

```
users (parent) ─1──* dadu_child_profiles ─1──1 dadu_consents
   │                      │
   │                      ├──* dadu_lesson_progress ──▶ dadu_content_items (lesson)
   │                      ├──* dadu_attempts ────────▶ dadu_assessment_items
   │                      ├──* dadu_mastery ─────────▶ dadu_concepts
   │                      ├──* dadu_object_completions ──▶ dadu_objects
   │                      ├──* dadu_assignment_completions ──▶ dadu_content_items (assignment)
   │                      ├──1 dadu_wallets ──* dadu_wallet_entries
   │                      ├──* dadu_badges_earned ──▶ dadu_badges
   │                      ├──* dadu_inventory ──▶ dadu_catalog_items
   │                      ├──1 dadu_world_state (garden, decorations)
   │                      ├──1 dadu_screen_time_rules ──* dadu_usage_sessions
   │                      └──* dadu_sync_cursors
   └──* dadu_parent_notifications

dadu_languages ──* dadu_translations (any entity, any field)
dadu_characters ──* dadu_voice_profiles (per language)
dadu_locations ──* dadu_objects ──* dadu_object_activities ──▶ dadu_content_items
dadu_sections ──* dadu_subjects ──* dadu_topics ──* dadu_concepts
dadu_content_items ──* dadu_content_versions ──* dadu_workflow_transitions
dadu_content_versions ──* dadu_lesson_steps (lesson) | dadu_story_pages (story)
dadu_media_assets (licence provenance) ◀── referenced by steps, pages, objects, characters
dadu_assessment_items ──▶ dadu_concepts; grouped into dadu_assessments
dadu_packs ──* dadu_pack_files ──▶ dadu_media_assets
```

## 2. Accounts, consent, profiles

### `users` (existing, extended)

Add: `role text default 'parent'` (`parent` only for now; keeps room for `teacher`),
`parental_pin_hash text` (scrypt, nullable until set), `pin_failed_count integer default 0`,
`pin_locked_until timestamptz`.

### `dadu_consents`

| Column | Type | Notes |
|---|---|---|
| id | uuid pk | |
| user_id | uuid → users (cascade) | the parent |
| child_profile_id | uuid → dadu_child_profiles (cascade), nullable | null = account-level consent |
| consent_version | text | version of the consent text shown (`2026-11-v1`) |
| scope | text | `account`, `child_data`, `assignment_photos`, `analytics` (check) |
| method | text | `otp_phone`, `password_reauth` |
| granted_at | timestamptz | |
| withdrawn_at | timestamptz, nullable | withdrawal triggers deletion job |
| ip_hash, user_agent | text | hashed IP for the audit trail only |

Index on `(user_id, scope)`. A trigger-free rule in the service layer: no row may be written to any
child table unless a `child_data` consent with `withdrawn_at is null` exists.

### `dadu_child_profiles`

| Column | Type | Notes |
|---|---|---|
| id | uuid pk | |
| user_id | uuid → users (cascade) | |
| nickname | text | 1–30 chars, the only name stored |
| age_band | text | `A0`..`A5` (check) |
| birth_month | text, nullable | `YYYY-MM`, optional, used only to suggest band changes |
| difficulty | text | `gentle`, `steady`, `stretch` |
| language | text → dadu_languages.code | primary |
| helper_language | text → dadu_languages.code, nullable | bilingual mode |
| language_mode | text | `single`, `bilingual`, `compare`, `en_with_hi`, `hi_with_en` |
| avatar | jsonb | accessory choices for Gopu's companion sticker |
| accessibility | jsonb | `{captions, tts, fontScale, highContrast, reduceMotion, dyslexiaFont, audioInstructions, simpleNav}` |
| speeds | jsonb | `{narration, progression, animation}` each `very_slow..very_fast` |
| content_restrictions | jsonb | `{temple: bool, excursions: bool, sectionsHidden: string[]}` |
| status | text | `active`, `archived` |
| created_at, updated_at | timestamptz | |

Index `(user_id, status)`. Limit five active profiles per account (service rule).

## 3. Languages and translations

### `dadu_languages`

`code text pk` (`en`, `hi`, `bn`, `as`, `or`, `mr`, `gu`, `pa`, `ta`, `te`, `kn`, `ml`, `ur`,
`sa`), `name_native text`, `name_english text`, `script text`, `direction text` (`ltr`/`rtl`),
`heading_font text`, `body_font text`, `enabled boolean`, `sort_order integer`.

### `dadu_translations`

One row per translatable field per language, so any entity can be localised without widening
every table.

| Column | Type | Notes |
|---|---|---|
| id | uuid pk | |
| entity_type | text | `content_version`, `lesson_step_line`, `story_page`, `object`, `location`, `badge`, `catalog_item`, `ui_string`, `assessment_item`, `assignment` |
| entity_id | uuid | |
| field | text | `title`, `body`, `line`, `hint`, `option_1` … |
| language | text → dadu_languages | |
| text | text | |
| audio_asset_id | uuid → dadu_media_assets, nullable | the recorded line in this language |
| status | text | `machine_draft`, `translated`, `proofread` |
| proofread_by | uuid → admins, nullable | |
| updated_at | timestamptz | |

Unique `(entity_type, entity_id, field, language)`. Index `(language, status)`.

## 4. Characters and voices

### `dadu_characters`

`key text pk` (`dadaji`, `gopu`, `kim`, `molly`, `gauri`, `dhanu`, `mitthu`), `display_name
jsonb` (per language; the cow's name *Gauri* is proposed and pending approval, so the key and
the display names are changed together by a single migration if a different name is approved),
`rive_asset_id uuid → dadu_media_assets`, `states text[]` (the fourteen canonical states),
`palette jsonb`, `sfx jsonb` (state → asset id), `sort_order integer`.

### `dadu_voice_profiles`

| Column | Type | Notes |
|---|---|---|
| id | uuid pk | |
| character_key | text → dadu_characters | |
| language | text → dadu_languages | |
| provider | text | `studio_actor`, `tts_vendor` |
| voice_ref | text | vendor voice id or actor code |
| description | text | "warm, elderly, slightly husky" |
| rate_default | numeric(3,2) | 1.00 |
| pitch_default | numeric(3,2) | |
| sample_asset_id | uuid → dadu_media_assets | |
| status | text | `draft`, `approved` |

Unique `(character_key, language)`.

## 5. Miniverse: locations and objects

### `dadu_locations`

| Column | Type | Notes |
|---|---|---|
| id | text pk | `house.living_room`, `town.library` (canon §5) |
| parent_id | text → dadu_locations, nullable | `house`, `town` |
| kind | text | `area`, `room`, `outdoor`, `portal` |
| scene | jsonb | layers `[{assetId, depth, parallax}]`, camera bounds, walkable path, spawn points per character |
| min_age_band | text | `A0` default |
| unlock_rule | jsonb, nullable | `{badge: 'curious_explorer'}` or `{stars: 50}` |
| reserved | boolean | future zones (`shelter.*`) render as fenced plots |
| sort_order | integer | |
| status | text | `draft`, `published` |

### `dadu_objects`

| Column | Type | Notes |
|---|---|---|
| id | text pk | `house.living_room.telescope` |
| location_id | text → dadu_locations (cascade) | |
| name_key | text | translation key |
| position | jsonb | `{x, y, w, h, layer}` in scene units |
| idle_asset_id, tap_asset_id | uuid → dadu_media_assets | Rive or Lottie |
| hook_line_key | text | Dadaji's one-line invitation (translated) |
| section_key | text → dadu_sections | the section this object belongs to |
| min_age_band | text | |
| status | text | `draft`, `published` |

Index `(location_id, status)`.

### `dadu_object_activities` – the location-to-learning mapping

| Column | Type | Notes |
|---|---|---|
| id | uuid pk | |
| object_id | text → dadu_objects (cascade) | |
| age_bands | text[] | which bands see this activity |
| difficulty | text | `gentle`, `steady`, `stretch`, `any` |
| content_item_id | uuid → dadu_content_items | lesson, story, assignment, assessment or mini-game |
| sort_order | integer | order of discovery |
| repeatable | boolean | |

Index `(object_id, sort_order)`. One object usually maps to three to eight activities across
bands; `10-interactive-object-map.md` holds the seed data.

## 6. Curriculum tree

### `dadu_sections`

`key text pk` (the eight keys plus `stories`, `tests`), `colour text`, `icon_asset_id uuid`,
`sort_order integer`.

### `dadu_subjects`

`id text pk` (`academic.math`), `section_key → dadu_sections`, `name_key text`, `sort_order`.

### `dadu_topics`

`id text pk` (`academic.math.counting`), `subject_id → dadu_subjects`, `name_key`,
`curricula text[]` (`ncert`, `cbse`, `icse`, `ib`, `cambridge`), `sort_order`.

### `dadu_concepts`

The unit of mastery. `id text pk` (`academic.math.counting.one_to_ten`), `topic_id →
dadu_topics`, `name_key`, `age_bands text[]`, `prerequisites text[]` (concept ids),
`sort_order`. Index on `topic_id`.

## 7. Content items and versions

### `dadu_content_items`

| Column | Type | Notes |
|---|---|---|
| id | uuid pk | |
| public_id | text unique | `academic.math.counting.03`, `story.panchatantra.monkey_and_crocodile`, `rwa.gardening.plant_a_seed` |
| type | text | `lesson`, `story`, `assignment`, `assessment`, `mini_game`, `excursion` |
| section_key | text → dadu_sections | |
| topic_id | text → dadu_topics, nullable | |
| published_version_id | uuid → dadu_content_versions, nullable | the live version |
| created_by | uuid → admins | |
| created_at, updated_at | timestamptz | |

Index `(type, section_key)`.

### `dadu_content_versions`

| Column | Type | Notes |
|---|---|---|
| id | uuid pk | |
| item_id | uuid → dadu_content_items (cascade) | |
| version | integer | 1, 2, 3 … unique with item_id |
| title_key | text | |
| learning_objective | text | mandatory |
| age_bands | text[] | mandatory |
| difficulty | text | |
| prerequisites | text[] | concept ids |
| concepts | text[] | concept ids taught or practised |
| duration_minutes | integer | |
| document | jsonb | the typed body (lesson config, story metadata, assignment spec, assessment spec) validated by zod per `type` |
| source_provenance | jsonb | `[{kind: 'original'|'public_domain'|'licensed'|'adapted', reference, licence, permission_asset_id}]` |
| verification_status | text | `unverified`, `verified`, `disputed` |
| workflow_state | text | eight states, §11 |
| change_note | text | |
| created_by | uuid → admins | |
| created_at | timestamptz | |
| published_at | timestamptz, nullable | |

Unique `(item_id, version)`. Index `(workflow_state)`.

### `dadu_lesson_steps`

| Column | Type | Notes |
|---|---|---|
| id | uuid pk | |
| version_id | uuid → dadu_content_versions (cascade) | |
| sort_order | integer | |
| step_type | text | `intro`, `question`, `explain`, `example`, `experiment`, `activity`, `feedback`, `assess`, `echo` |
| age_variant | text, nullable | a band key when a step exists only for some bands |
| lines | jsonb | `[{character, lineKey, emotion, audioRateHint}]` – text and audio resolve through `dadu_translations` |
| media | jsonb | `[{assetId, role}]` |
| activity | jsonb, nullable | `{component: 'drag_sort', config: {...}}` |
| assessment_id | uuid → dadu_assessments, nullable | for `assess` steps |

Unique `(version_id, sort_order)`.

### `dadu_story_pages`

`id uuid pk`, `version_id → dadu_content_versions (cascade)`, `page_no integer`,
`illustration_asset_id uuid`, `text_key text`, `lines jsonb` (narration and character
participation), `vocabulary jsonb` (`[{wordKey, meaningKey}]`), `question_ids uuid[]`
(comprehension items). Story-level fields (collection, moral, modes, bedtime variant, age
adaptations) live in the version `document`.

## 8. Media assets

### `dadu_media_assets`

| Column | Type | Notes |
|---|---|---|
| id | uuid pk | |
| kind | text | `image`, `audio`, `rive`, `lottie`, `video`, `font`, `document` |
| sha256 | text unique | content address |
| storage_key | text | object storage path |
| cdn_url | text | |
| bytes | integer | |
| width, height, duration_ms | integer, nullable | |
| language | text → dadu_languages, nullable | audio lines |
| character_key | text, nullable | |
| source | text | `in_house`, `commissioned`, `public_domain`, `licensed`, `ai_assisted` |
| creator | text | |
| licence | text | `original`, `CC0`, `CC-BY-4.0`, `SIL-OFL`, `commercial-<ref>` |
| attribution_required | boolean | |
| attribution_text | text, nullable | |
| permission_document_id | uuid → dadu_media_assets, nullable | the signed licence or permission letter |
| review_status | text | `pending`, `approved`, `rejected` |
| created_by | uuid → admins | |
| created_at | timestamptz | |

Index `(kind, review_status)`, `(language, character_key)`. The same mandatory rights metadata
Tame's `content` table already enforces; nothing publishes with `review_status != 'approved'`.

## 9. Assessment

### `dadu_assessments`

`id uuid pk`, `public_id text unique`, `kind text` (`daily`, `chapter`, `subject`, `weekly`,
`monthly`, `revision`, `comprehensive`, `challenge`, `olympiad`, `inline`), `section_key`,
`topic_id nullable`, `age_bands text[]`, `item_policy jsonb` (`{count, adaptive: true,
startDifficulty, concepts: [...]}`), `workflow_state`, `published_at`.

### `dadu_assessment_items`

| Column | Type | Notes |
|---|---|---|
| id | uuid pk | |
| public_id | text unique | `q.academic.math.counting.03.07` |
| concept_id | text → dadu_concepts | |
| item_type | text | `mcq`, `true_false`, `match`, `fill_blank`, `image_pick`, `audio_pick`, `drag_drop`, `sequence`, `memory`, `practical`, `oral`, `drawing` |
| age_bands | text[] | |
| difficulty | integer | 1–5, used by adaptive selection |
| body | jsonb | stem key, options (keys and asset ids), answer key, tolerance, rubric for `practical`/`oral`/`drawing` |
| feedback | jsonb | `{correctLineKey, incorrectLineKey, explainLineKey}` spoken by Dadaji |
| stats | jsonb | rolling `{attempts, correct, avgMs}` updated by a nightly job |
| workflow_state | text | |
| version | integer | |

Index `(concept_id, difficulty)`.

### `dadu_assessment_item_links`

`assessment_id → dadu_assessments`, `item_id → dadu_assessment_items`, `sort_order`,
pk `(assessment_id, item_id)`.

### `dadu_attempts`

| Column | Type | Notes |
|---|---|---|
| id | uuid pk | client-generated, idempotent sync |
| child_profile_id | uuid → dadu_child_profiles (cascade) | |
| item_id | uuid → dadu_assessment_items | |
| assessment_id | uuid, nullable | |
| content_version_id | uuid, nullable | lesson context |
| answer | jsonb | option ids, order, drawing asset id (private), oral transcript never stored |
| correct | boolean, nullable | null for rubric items until a parent/teacher marks |
| score | numeric(4,3) | 0–1 |
| time_ms | integer | |
| hints_used | integer | |
| attempt_no | integer | second try after feedback |
| occurred_at | timestamptz | device time |
| synced_at | timestamptz | server time |

Index `(child_profile_id, occurred_at desc)`, `(item_id)`.

### `dadu_mastery`

`child_profile_id`, `concept_id`, `level numeric(4,3)` (0–1, Bayesian-style estimate updated
per attempt), `status text` (`new`, `learning`, `practising`, `mastered`, `revise`),
`last_practised_at`, `next_review_at` (spaced revision; feeds Mitthu's Echo), `attempts integer`,
pk `(child_profile_id, concept_id)`. Index `(child_profile_id, next_review_at)`.

## 10. Progress, assignments, gamification, world

### `dadu_lesson_progress`

`id uuid pk`, `child_profile_id`, `content_version_id`, `status` (`started`, `completed`),
`last_step integer`, `started_at`, `completed_at`, `speed_overrides jsonb`. Unique
`(child_profile_id, content_version_id)`.

### `dadu_object_completions`

`child_profile_id`, `object_id → dadu_objects`, `activity_id → dadu_object_activities`,
`completed_at`, pk `(child_profile_id, activity_id)`.

### `dadu_assignment_completions`

| Column | Type | Notes |
|---|---|---|
| id | uuid pk | |
| child_profile_id | uuid | |
| content_version_id | uuid | the assignment |
| status | text | `assigned`, `in_progress`, `completed` |
| confirmed_by_parent | boolean | completion needs the gate |
| note | text, nullable | parent's note, 500 chars |
| photo_asset_key | text, nullable | private bucket key, encrypted, requires `assignment_photos` consent |
| completed_at | timestamptz | |

Index `(child_profile_id, status)`.

### `dadu_wallets` and `dadu_wallet_entries`

`dadu_wallets`: `child_profile_id pk`, `stars integer`, `coins integer`, `updated_at`.
`dadu_wallet_entries`: `id uuid pk` (client id), `child_profile_id`, `kind` (`star`, `coin`),
`delta integer`, `reason text` (`lesson_completed`, `assignment_completed`, `purchase` …),
`ref_id text`, `occurred_at`. Balances are recomputed from entries on sync; entries are
append-only. No random rewards, no loot boxes (service rule, `14` canon §8).

### `dadu_badges` and `dadu_badges_earned`

`dadu_badges`: `key text pk`, `name_key`, `description_key`, `icon_asset_id`, `rule jsonb`
(`{event: 'assignments_completed', count: 5, section: 'nature'}`), `category` (`curiosity`,
`consistency`, `creativity`, `effort`, `mastery`).
`dadu_badges_earned`: `child_profile_id`, `badge_key`, `earned_at`, pk on both.

### `dadu_certificates`

`id uuid pk`, `child_profile_id`, `template_key`, `title_key`, `issued_at`, `payload jsonb`
(subject, level), `pdf_asset_key nullable`.

### `dadu_catalog_items` and `dadu_inventory`

`dadu_catalog_items`: `key text pk`, `kind` (`garden_decoration`, `house_decoration`, `book`,
`instrument`, `art_supply`, `accessory`, `area_unlock`), `name_key`, `asset_id`, `cost_coins
integer`, `unlock_rule jsonb nullable`, `placeable_in text[]` (location ids), `status`.
`dadu_inventory`: `child_profile_id`, `item_key`, `acquired_at`, `placement jsonb nullable`
(`{locationId, x, y}`), pk `(child_profile_id, item_key)`.

### `dadu_world_state`

`child_profile_id pk`, `garden jsonb` (plots: `[{plotId, speciesId, plantedAt, stage,
lastWateredAt}]` – growth is persistent and tied to completed activities), `decorations jsonb`,
`unlocked_locations text[]`, `last_location_id text`, `version integer` (optimistic sync),
`updated_at`.

## 11. Screen time, usage, notifications, sync

### `dadu_screen_time_rules`

`child_profile_id pk`, `daily_limit_minutes integer` (15, 30, 45, 60 or custom), `warn_before
_minutes integer`, `break_every_minutes integer nullable`, `bedtime_start time nullable`,
`bedtime_end time nullable`, `weekday_overrides jsonb`, `updated_at`.

### `dadu_usage_sessions`

`id uuid pk` (client id), `child_profile_id`, `started_at`, `ended_at`, `seconds integer`,
`end_reason` (`closed`, `limit`, `break`, `bedtime`, `crash`), `locations text[]`,
`sections text[]`. Index `(child_profile_id, started_at desc)`. Weekly reports aggregate this.

### `dadu_parent_notifications`

`id uuid pk`, `user_id`, `kind` (`weekly_report`, `limit_reached`, `assignment_ready`,
`consent_renewal`, `announcement`), `title`, `body`, `payload jsonb`, `read_at`, `created_at`.
Push delivery reuses `devices` and `notifications`.

### `dadu_sync_cursors`

`child_profile_id`, `device_install_id text`, `table_name text`, `last_pulled_at timestamptz`,
`last_pushed_at timestamptz`, pk on the first three.

## 12. Workflow and audit

### Workflow states (`dadu_content_versions.workflow_state`, also assessments and items)

`draft` → `educational_review` → `factual_verification` → `language_proofreading` →
`copyright_verification` → `audio_review` → `approved` → `published`. Any review step may send
the version back to `draft` with a note. `published` versions are immutable; a change creates a
new version. Each step maps to a permission in `rbac.ts`: `dadu:content:write`,
`dadu:review:educational`, `dadu:review:factual`, `dadu:review:language`,
`dadu:review:copyright`, `dadu:review:audio`, `dadu:content:approve`, `dadu:content:publish`.

### `dadu_workflow_transitions`

`id uuid pk`, `entity_type` (`content_version`, `assessment`, `assessment_item`,
`media_asset`), `entity_id`, `from_state`, `to_state`, `admin_id → admins`, `note text`,
`checklist jsonb` (the step's ticked checks), `created_at`. Index `(entity_type, entity_id)`.

### `audit_logs` (existing)

Every admin write under `/admin/v1/dadu/*` writes a row, as the existing `lib/audit.ts` does.

## 13. Packs (offline)

### `dadu_packs`

`id uuid pk`, `key text` (`core`, `section.academic`, `audio.academic.hi`, `stories.hi`),
`language text nullable`, `version integer`, `manifest jsonb` (`{files: [{path, sha256,
bytes}], contentVersions: [...]}`), `bytes integer`, `storage_key`, `cdn_url`, `min_app_version
text`, `status` (`building`, `ready`, `superseded`), `built_at`. Unique `(key, version)`.

### `dadu_pack_files`

`pack_id`, `asset_id → dadu_media_assets`, `path text`, pk `(pack_id, path)`.

## 14. Migrations plan, Phases 1–3

| Migration | Phase | Contents |
|---|---|---|
| `0006_dadu_foundation.sql` | 1 | `users` parent columns; `dadu_languages` (seeded with 14 rows); `dadu_consents`; `dadu_child_profiles`; `dadu_characters` (seven rows); `dadu_media_assets`; `dadu_translations`; RBAC sync with the new permission keys |
| `0007_dadu_miniverse.sql` | 2 | `dadu_locations`, `dadu_objects`, `dadu_object_activities`, `dadu_sections`, `dadu_subjects`, `dadu_topics`, `dadu_concepts`; `dadu_content_items`, `dadu_content_versions`, `dadu_workflow_transitions`; `dadu_world_state`, `dadu_object_completions`; seed of the location tree and the eight sections |
| `0008_dadu_audio.sql` | 3 | `dadu_voice_profiles`; `audio_asset_id` already on translations; `dadu_packs`, `dadu_pack_files`; `dadu_sync_cursors` |
| `0009_dadu_learning.sql` | 4 | `dadu_lesson_steps`, `dadu_lesson_progress`, `dadu_assessments`, `dadu_assessment_items`, `dadu_assessment_item_links`, `dadu_attempts`, `dadu_mastery` |
| later | 6–9 | `dadu_story_pages`, assignment completions, wallets, badges, certificates, catalog, inventory, screen-time rules, usage sessions, parent notifications |

Each migration is generated by `npm run db:generate` from `schema.ts` and applied by
`npm run db:migrate`; seeds live in `backend/src/dadu/seeds/`.

## 15. Retention and deletion

| Data | Retention |
|---|---|
| Child profile and everything under it | Until the parent deletes the profile or the account; hard delete within 30 days, photos deleted immediately from storage |
| Consent records | Kept for the statutory period after withdrawal, with the child data removed |
| `dadu_attempts`, `dadu_usage_sessions` | Rolled into weekly aggregates after 13 months; raw rows deleted |
| `events` (analytics) | 395 days, as today (`npm run cleanup`) |
| `audit_logs`, `dadu_workflow_transitions` | Indefinite |
