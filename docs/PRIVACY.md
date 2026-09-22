# Privacy, Data Retention & User Control

This document describes the concrete technical controls implemented. It is
not a legal compliance statement — no claim of "GDPR compliant" or
"100% private" is made here; consult qualified legal counsel for that
determination.

## Data categories

| Category | Examples | Where stored |
|---|---|---|
| Content | uploaded files, extracted text, analysis, examples, teaching plans, scenes | Postgres (`Lesson` + related tables) + `storage/uploads` |
| Audio | narration, voice previews | `storage/audio` + `AudioAsset` rows |
| Video | previews, final MP4s, thumbnails, subtitles | `storage/video`, `storage/thumbnails` + `VideoAsset` rows |
| Configuration | voice ID, voice settings, project settings | Postgres (`VoiceProfile`, `ProjectSetting`) |
| Operational | job status, processing metadata, error logs | Postgres (`RenderJob`, `QualityReport`) + structured logs |
| Sensitive credentials | API keys, DB/Redis/storage credentials | `.env` only — never in the database, never returned by any API |

## Retention defaults

Configurable in **Settings -> Privacy & Data**, enforced server-side by
`RetentionPolicy` (`backend/app/models/privacy.py`) and
`RetentionService` (`backend/app/services/retention/retention_service.py`),
never only in the frontend:

| Asset | Default |
|---|---|
| Source files | 30 days |
| Extracted text | 30 days |
| Generated lesson data | 90 days |
| Generated audio | 30 days |
| Preview videos | 7 days |
| Final videos | 90 days |
| Thumbnails | 90 days |
| Temporary render files | 24 hours |
| Job logs | 30 days |
| Failed job artifacts | 7 days |

Allowed values per setting: 7 days, 30 days, 90 days, 1 year, or "Never
automatically delete" (not the default for any category — the UI shows a
warning before selecting it, and a warning before shortening any existing
period, per build spec section 24).

## Deletion process

Two-stage, never a bare timestamp check:

```
ELIGIBLE (past retention window, not protected, not part of an active job)
        -> VERIFY (re-check protection flag + active-job state at delete time)
        -> DELETE (storage object removed, DB row removed/anonymized,
                    derived assets + cache entries removed,
                    DeletionEvent recorded)
```

`RetentionService.run_daily_sweep()` is invoked by a scheduled Celery beat
task once per day and never deletes an asset attached to a lesson/job that
is currently `PROCESSING`, nor one with `protected = true`.

## Deleting a lesson

`POST /privacy/delete-lesson/{lesson_id}` cascades through every dependent
asset (source file, extracted text, analysis, examples, teaching plan,
scenes, per-scene audio, previews, final video, subtitles, thumbnail, render
jobs, quality reports) via `PrivacyService.delete_lesson_cascade()`. The API
first returns a manifest of what will be deleted so the frontend can show
the confirmation dialog from build spec section 4 before the caller
re-POSTs with `{"confirm": true}`.

## Deleting individual assets

`POST /privacy/delete-asset/{asset_id}` deletes one `AudioAsset` /
`VideoAsset` / source file independently, when that's all the user wants
removed.

## Delete all project data

`POST /privacy/delete-all` requires the exact confirmation phrase
`DELETE MY PROJECT DATA` in the request body and runs as an async
`DeletionJob` (status `QUEUED -> PROCESSING -> COMPLETED/FAILED`) so the
frontend can show progress (`147 / 203 assets removed`).

## Data export

`POST /privacy/export` creates an async export job producing a ZIP with
`lessons/`, `scripts/`, `examples/`, `scene-data/`, `settings/`,
`metadata/` — metadata and generated text content only. It never includes
`.env` values, database credentials, or Redis/storage credentials. Large
media (audio/video) is included as real files when the export stays under a
practical size threshold, otherwise the export includes a manifest with
`GET /assets/{id}/download` references instead of inlining every file.

## Protected assets

Any `AudioAsset`/`VideoAsset` row can be flagged `protected = true`
(surfaced in the UI as "Protected from automatic deletion"). Protected
assets are skipped by the retention sweep until the user clears the flag.

## Soft delete vs hard delete

Database rows use `deleted_at` for lightweight recoverability of metadata,
but any privacy-motivated deletion (explicit user delete, or retention
sweep) **always** removes the underlying storage object in the same
transaction-adjacent step — a `deleted_at` timestamp is never used as a
substitute for actually removing the file.

## Storage abstraction

All file operations go through `StorageService`
(`backend/app/services/storage/base.py`). Business logic never touches a
raw filesystem/S3 path directly, which is what makes the deletion guarantees
above enforceable in one place.

## Temporary files

Render/extraction temp files live under `storage/tmp/{job_id}/` and are
deleted immediately on successful job completion; on failure they are kept
only until `RETENTION_TEMP_FILES_HOURS` (default 24h) for debugging, then
swept.

## Cache privacy

`AudioAsset` caching (build spec section 18) keys on
`sha256(voice_id + model_id + settings + narration_text)`, not on raw
sensitive content directly logged anywhere. Deleting a lesson deletes its
cached `AudioAsset` rows and files; nothing about a deleted lesson remains
reachable through the cache.

## External AI/voice providers

Settings -> Privacy & Data lists the configured LLM provider and voice
provider (ElevenLabs) with a short explanation of what is sent (lesson
source text / narration text) and why. The app does not claim to control or
guarantee deletion on the provider's own systems — only that this
application's own copies are removed. See `docs/ELEVENLABS.md` for the
voice-specific detail, including how "Disconnect Voice Integration" clears
the stored `ELEVENLABS_VOICE_ID` configuration without exposing the API key.

## Logging

Structured logs (`backend/app/core/logging.py`) only ever include
`job_id, lesson_id, scene_id, stage, status, duration, error_code` — never
full document text, full narration, audio/video bytes, or credentials. A
log-scrubbing test (`tests/test_privacy_ownership.py`) asserts no configured
secret substring ever appears in emitted log records.

## Access control

Every lesson/batch/asset endpoint filters by `owner_id = current_user.id` at
the query level (never "fetch by id, then check" after the fact in a way
that could be bypassed) — see `backend/app/api/deps.py` and
`backend/app/services/privacy/privacy_service.py`.

## Deletion audit log

`DeletionEvent` records only `owner_id, asset_type, asset_id,
deletion_reason, deleted_at` — never the deleted content itself.

## Privacy dashboard

`/settings/privacy` shows retention settings, storage usage by category,
connected providers, and the Export/Delete actions described above.
