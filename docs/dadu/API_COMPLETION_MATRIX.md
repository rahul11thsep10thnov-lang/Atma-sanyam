# DADU – API completion matrix

Status of every endpoint in `18-api.md` against the implementation in `backend/src/routes/public/dadu.ts`
and `backend/src/routes/admin/dadu.ts`. Tests live in `backend/tests/dadu.test.ts` (public, 29 tests) and
`backend/tests/daduAdmin.test.ts` (admin, 23 tests); the whole backend suite is 157 tests, all passing on
PostgreSQL 16.

Statuses: **IMPLEMENTED** (route exists and is covered by the named test), **EQUIVALENT** (the spec's
intent is served by a differently shaped route, named in the note), **NOT IMPLEMENTED** (with the reason).

## Public API (`/v1/dadu/*`)

| Spec endpoint | Status | Implementation | Test |
|---|---|---|---|
| `GET /bootstrap` | EQUIVALENT | `GET /v1/dadu/manifest` (languages with coverage, consent version, feature flags, published packs, catalogue counts, server time) | manifest › serves the manifest |
| `POST /consent` | IMPLEMENTED | `POST /v1/dadu/consents` `{ kind: processing\|photos\|analytics, version, childId? }` → 201 | consent › records consent |
| `DELETE /consent/:id` | EQUIVALENT | `POST /v1/dadu/consents/:id/withdraw` (sets `withdrawnAt`; data deletion is the explicit `DELETE /me/data`) | consent › withdraws a consent once |
| `POST /gate/setup`, `/gate/verify`, `/gate/reset` | NOT IMPLEMENTED | The parental gate is client-side (PIN hash in `src/dadu/state/persistence.ts`); every parent route already needs the parent's user token, which is only obtained through the existing OTP/password sign-in. A server gate token adds nothing until purchases exist. | – |
| `GET /children` | IMPLEMENTED | `GET /v1/dadu/children` | profiles › lists, reads and patches |
| `POST /children` | IMPLEMENTED | `POST /v1/dadu/children` (needs an active `processing` consent; max 5) | profiles › creates a child; caps at five |
| `PATCH /children/:id` | IMPLEMENTED | `PATCH /v1/dadu/children/:id` | profiles › lists, reads and patches |
| `DELETE /children/:id` | IMPLEMENTED | soft delete → `202 { deletionScheduledFor }`; purge after 30 days by `npm run cleanup` | profiles › soft-deletes a child |
| `GET /children/:id/export` | NOT IMPLEMENTED | `GET /children/:id/summary` plus `GET /children/:id/world` and `/progress` return everything stored; a single export file is a Phase 9 parent-dashboard item. | – |
| `GET /content`, `GET /content/:id` | IMPLEMENTED | published versions only, filters `kind`, `section`, `language`, `since`, paginated | manifest › lists only published content; returns a lesson body |
| `GET /packs`, `GET /packs/:key/manifest` | IMPLEMENTED | `GET /v1/dadu/packs`, `GET /v1/dadu/packs/:id` (manifest inline) | packs › builds a core pack |
| `GET /packs/:key/:version/:path` | NOT IMPLEMENTED | No object storage/CDN is attached to this environment; manifests carry item ids, versions and sha256 so the app fetches bodies from `/content/:id`. | – |
| `POST /children/:id/sync/push` | EQUIVALENT | `PUT /children/:id/world` (optimistic version, merge on conflict) + `POST /children/:id/progress` (idempotent batch) | world › 409 with merged copy; progress › idempotent |
| `GET /children/:id/sync/pull` | EQUIVALENT | `GET /children/:id/world` + `GET /children/:id/progress?since=` + `GET /children/:id/screen-rules` | world › creates version 1; progress › pages the event log |
| `POST /children/:id/lessons/:id/start|complete` | EQUIVALENT | progress events of kind `lesson` (`payload.minutes`, `stars`, `coins`); completion is recorded in the world state's `lessonsCompleted` | progress › counts minutes |
| `POST /children/:id/attempts` | EQUIVALENT | progress events of kind `assessment` with `payload.concept` and `result` update `dadu_mastery` with the 16-assessment formula | progress › applies the exponential formula |
| `GET /children/:id/next`, `/echo` | NOT IMPLEMENTED | Adaptive suggestion and the Echo set are computed on the device from `mastery.nextReviewAt` (`src/dadu/engines`); the server returns the mastery rows in the summary. | – |
| `GET /children/:id/mastery` | EQUIVALENT | part of `GET /children/:id/summary` (`mastery.buckets`, `needsPractice`) and of every progress response | summary › builds the parent summary |
| `GET /children/:id/assignments` | IMPLEMENTED | completions list | assignments › accepts a photo after consent |
| `POST /children/:id/assignments/:id/start` | NOT IMPLEMENTED | start state lives in the world state (`assignments[id].status`) | – |
| `POST /children/:id/assignments/:id/complete` | IMPLEMENTED | note optional; `photoAssetId` needs a child-scoped `photos` consent (`403 photo_consent_required`) | assignments › refuses a photo without consent |
| `POST/GET/DELETE …/photo` | NOT IMPLEMENTED | No private bucket in this environment; the API records only a `photoAssetId`. Upload, signed URL and deletion are blocked on object storage credentials. | – |
| `GET /children/:id/wallet`, `/achievements`, `POST catalog/:key/acquire`, `PATCH inventory/:key` | EQUIVALENT | rewards, inventory and decorations are fields of the world state (client-authoritative, merged with client-wins rules) | world › 409 merged copy keeps the client's rewards |
| `GET /children/:id/certificates/:id.pdf` | NOT IMPLEMENTED | PDF rendering is a Phase 8 item. | – |
| `GET/PUT /children/:id/screen-time` | IMPLEMENTED | `GET/PUT /children/:id/screen-rules`, `GET /children/:id/screen-time?days=` | screen rules › stores and validates |
| `GET /children/:id/reports/weekly`, `/subjects` | EQUIVALENT | `GET /children/:id/summary` (lessons by section, mastery buckets, 7-day screen time) | summary › builds the parent summary |
| `GET/POST /parent/notifications`, `GET /parent/downloads` | NOT IMPLEMENTED | Existing `user_notifications` and `devices` tables cover the need once the mobile side sends installed pack versions; deferred. | – |
| `DELETE /me` (extended) | IMPLEMENTED | `DELETE /v1/dadu/me/data` deletes every child (cascade) and consent and returns counts; the existing `DELETE /v1/me` still deletes the account and cascades through `user_id` | deletion › deletes every child |
| `POST /v1/analytics/events` (closed name list) | NOT IMPLEMENTED | The existing analytics route accepts any `[a-z_]` name; a DADU allow-list is a one-line zod change scheduled with the analytics module. | – |

## Admin API (`/admin/v1/dadu/*`)

| Spec endpoint | Status | Implementation | Test |
|---|---|---|---|
| sections/subjects/topics/concepts CRUD | NOT IMPLEMENTED | The curriculum tree is derived from `meta.section/subject/topic` on content items; a separate tree is not needed until the catalogue is large. | – |
| locations / objects / characters | EQUIVALENT | content items of kind `location`, `object`, `character` go through the same create/edit/workflow/publish routes with kind-specific validation | workflow › accepts the other kinds |
| `GET /content` (filters) | IMPLEMENTED | `kind`, `section`, `status`, `search`, pagination | workflow › lists with filters |
| `POST /content` | IMPLEMENTED | body validated per kind; legacy character keys canonicalised; version 1 draft; audited | workflow › creates a draft |
| `POST /content/:id/versions`, `PATCH …/versions/:v`, `PUT …/steps`, `PUT …/pages` | EQUIVALENT | `PUT /content/:id` edits a draft in place or opens a new draft version from published/approved content | workflow › editing published content opens a new draft |
| `POST …/transition` | IMPLEMENTED | `POST /content/:id/transition { to, note }` enforcing order and per-step permission; `409 workflow_invalid`, `403` | workflow › refuses steps out of order; editor cannot approve |
| `GET …/diff/:other` | NOT IMPLEMENTED | versions are returned in full by `GET /content/:id`; the console can diff client-side. | – |
| `POST …/publish`, `POST /unpublish` | IMPLEMENTED | plus `POST /content/:id/rollback { version }` | workflow › publishes; rolls back; unpublishes |
| translations, machine-draft | NOT IMPLEMENTED | localised fields are embedded in bodies (`{ en, hi, … }`); a translation workbench is a Phase 7 console feature. | – |
| `POST /media` (multipart) | EQUIVALENT | `POST /assets` registers metadata + URL (the console uploads to storage); sha256 duplicate → `409 duplicate_asset`; `PATCH`, `DELETE` (refused when a published body references it) | assets › registers; detects duplicates; refuses delete in use |
| assessments, assessment-items, import | NOT IMPLEMENTED | quiz items are steps inside lesson/story bodies; standalone assessment sets are a Phase 8 item. | – |
| `POST /packs/build`, `GET /packs` | IMPLEMENTED | synchronous build (no job queue); `POST /packs/:id/publish` | packs › builds a core pack |
| badges, catalog, certificates templates | NOT IMPLEMENTED | reward catalogue is a static table in the mobile app for now. | – |
| `GET/PUT /config` | EQUIVALENT | `GET /flags`, `PUT /flags/:key` (JSON values, audited, served in the manifest) | flags › stores feature flags |
| `GET /profiles/:childId` | EQUIVALENT | `GET /parents/:userId/children` (first name, band, language, counts; no notes, no photos) | parent support › shows minimal child data |
| `GET /insights` | NOT IMPLEMENTED | the existing `/admin/v1/analytics` works unchanged; DADU-specific insights wait for the event allow-list. | – |

## Permissions and roles

Added to `backend/src/database/rbac.ts`: `dadu:content:read|write|approve|publish`, `dadu:review:educational|factual|language|cultural|rights|safety`, `dadu:assets:write`, `dadu:packs:publish`, `dadu:flags:write`, `dadu:parents:read`. New role `reviewer`; `editor` gains DADU read/write; `admin` and `super_admin` hold everything. Verified by `roles › gives the reviewer role the six review permissions`.

## JSON shapes the mobile app must use

- `PUT /v1/dadu/children/:id/world` body `{ version: number, state: WorldState }`. `200 { version, state }` when the version matched (server version becomes `version + 1`). `409 { error: { code: 'version_conflict' }, world: { version, state } }` when stale: the server has already stored the merged copy (client wins for `rewards` (max stars/coins, union badges), `mastery` per concept, unions of `lessonsCompleted`, `storiesRead`, `unlockedLocations`, `decorations`, `assignments` keys; server wins for everything else). The app must adopt `world` from the 409 and continue from that version. Legacy character keys in `positions`/`animals` are accepted and returned canonical.
- `POST /v1/dadu/children/:id/progress` body `{ events: [{ clientId, kind, contentId, occurredAt, payload }] }` (max 200). `payload` is strict: `concept`, `result` (0..1), `difficulty`, `minutes`, `durationSec`, `level`, `stars`, `coins`. `202 { accepted: [clientId], duplicates: [clientId], mastery: [{ concept, score, attempts, correct, state, lastSeenAt, nextReviewAt }] }`.
- Error codes added: `consent_required` (403), `child_limit` (409), `version_conflict` (409), `photo_consent_required` (403), `workflow_invalid` (409), `workflow_locked` (409), `duplicate_asset` (409), `asset_in_use` (409).
