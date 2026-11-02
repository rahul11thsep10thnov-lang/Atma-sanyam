# DADU – API architecture

The DADU API is an extension of the existing Express 5 service in `backend/`. Conventions,
auth, errors and rate limiting are the ones in `docs/API.md`; this document covers what is added.
Tables are defined in `17-database-schema.md`; the client-side use of each group is described in
`01-product-architecture.md`.

---

## 1. Conventions

| Rule | Detail |
|---|---|
| Base paths | App: `/v1/dadu/*`. Console: `/admin/v1/dadu/*`. Routers: `backend/src/dadu/routes/public/*.ts`, `backend/src/dadu/routes/admin/*.ts`, mounted from `app.ts`. |
| Auth | `Authorization: Bearer <token>`. App tokens are parent user sessions from the existing `/v1/auth/*`. Admin tokens from `/admin/v1/auth/login`. User tokens are rejected on admin routes and vice versa (existing `auth.ts`). |
| Child scope | Every child-scoped route takes `:childId`; the middleware `requireChild` checks the profile belongs to the token's parent and that a live `child_data` consent exists, else `403 consent_required`. |
| Parental gate | Routes marked **gate** need the header `X-Parent-Gate: <gate token>` obtained from `POST /v1/dadu/gate/verify` (valid 10 minutes). |
| Validation | Every body, query and param through `parse(zodSchema, input)`; unknown keys stripped. |
| Errors | Existing envelope `{ error: { code, message, details? } }`. New codes: `consent_required` 403, `gate_required` 403, `pack_outdated` 409, `sync_conflict` 409, `workflow_invalid` 409. |
| Pagination | Cursor based: `limit` (1–100) and `cursor`; responses carry `nextCursor: string | null`. |
| Idempotency | Client-generated UUID ids on attempts, wallet entries, usage sessions, completions. Re-sending the same id is a no-op `200`. |
| Caching | Public content endpoints send `Cache-Control: public, max-age=300` and an `ETag`; manifests `max-age=60`; everything child-scoped is `no-store`. |
| Versioning | Path version `v1` stays; breaking content shapes bump `contentSchemaVersion` in manifests and `min_app_version` on packs. |
| Audit | Every admin write calls `audit(...)` with action, entity and diff, as today. |
| Rate limits | Existing per-IP limiter plus: gate verify 10/5 min per account; sync push 60/hour per device; photo upload 20/day per child; admin workflow transitions 300/hour. |

Fixed enums used in bodies: `ageBand` `A0..A5`, `difficulty` `gentle|steady|stretch`,
`language` the 14 codes, `section` the eight keys plus `stories`, `tests`.

## 2. Auth and parental gate

Parents sign in through the existing phone-first flow (`/v1/auth/otp/request`, `/v1/auth/otp/verify`,
`/v1/auth/login`, `/v1/me`). DADU adds:

| Method | Path | Auth | Body → Response |
|---|---|---|---|
| GET | `/v1/dadu/bootstrap` | – | `{ languages: [...], consentVersion, features, minAppVersion, packs: { core: [{language, version, bytes, url}] } }`. First call after install; no account needed. |
| POST | `/v1/dadu/consent` | parent | `{ scope: 'account'|'child_data'|'assignment_photos'|'analytics', childId?, consentVersion, accept: true }` → `201 { consentId, grantedAt }`. OTP must have been verified on this session (`otpVerifiedAt`) for `account` and `child_data`. |
| DELETE | `/v1/dadu/consent/:id` | parent, **gate** | → `202 { deletionScheduledFor }`. Withdrawal schedules deletion of the scoped data. |
| POST | `/v1/dadu/gate/setup` | parent | `{ pin }` (4–6 digits) → `204`. Stores a scrypt hash. |
| POST | `/v1/dadu/gate/verify` | parent | `{ pin }` or `{ password }` → `{ gateToken, expiresAt }`. Five failures lock five minutes (`429`). |
| POST | `/v1/dadu/gate/reset` | parent | `{ password }` → `204`. Clears the PIN. |

The on-device arithmetic gate for pre-readers is purely client side; only the PIN or password
yields a server gate token.

## 3. Profiles

| Method | Path | Auth | Body → Response |
|---|---|---|---|
| GET | `/v1/dadu/children` | parent | `{ items: [ChildProfile] }` |
| POST | `/v1/dadu/children` | parent, **gate** | `{ nickname, ageBand, birthMonth?, language, helperLanguage?, languageMode, difficulty, accessibility, speeds }` → `201 ChildProfile`. Max five active. |
| PATCH | `/v1/dadu/children/:childId` | parent, **gate** | partial of the above, plus `contentRestrictions` → `ChildProfile` |
| DELETE | `/v1/dadu/children/:childId` | parent, **gate** | → `202 { deletionScheduledFor }` |
| GET | `/v1/dadu/children/:childId/export` | parent, **gate** | → JSON export of progress, mastery, badges, settings. |

```json
ChildProfile = {
  "id": "uuid", "nickname": "Anu", "ageBand": "A2", "difficulty": "steady",
  "language": "hi", "helperLanguage": "en", "languageMode": "bilingual",
  "accessibility": { "captions": true, "tts": false, "fontScale": 1.0, "highContrast": false,
                     "reduceMotion": false, "dyslexiaFont": false, "audioInstructions": true, "simpleNav": true },
  "speeds": { "narration": "normal", "progression": "slow", "animation": "normal" },
  "contentRestrictions": { "temple": true, "excursions": true, "sectionsHidden": [] },
  "createdAt": "2026-11-02T08:00:00Z"
}
```

## 4. Content read (app)

All public, cached, language-aware (`?lang=hi&helper=en` returns both strings when the helper
is given). Used for browsing online and for on-demand items not yet in a pack; engines still
read from the local database after the `offline` module stores the response.

| Method | Path | Response |
|---|---|---|
| GET | `/v1/dadu/world` | `{ locations: [Location], objects: [Object], reservedZones: [...] }` – the whole Miniverse graph, small. |
| GET | `/v1/dadu/world/locations/:id` | `Location` with `scene`, `objects` and their activities for `?ageBand=&difficulty=`. |
| GET | `/v1/dadu/sections` | `{ items: [{ key, colour, subjects: [{ id, topics: [{ id, concepts: [...] }] }] }] }` |
| GET | `/v1/dadu/content` | Query `type`, `section`, `topic`, `ageBand`, `difficulty`, `search`, `limit`, `cursor` → `{ items: [ContentSummary], nextCursor }` |
| GET | `/v1/dadu/content/:publicId` | Published version: metadata plus `steps` (lesson), `pages` (story), `spec` (assignment), `assessment` (ids only, items fetched separately) |
| GET | `/v1/dadu/assessments/:publicId/items` | `?childId=` optional; returns items chosen by the adaptive policy for that child, else a default set. |
| GET | `/v1/dadu/characters` | Seven characters, states, voice profile per language, Rive asset URLs. |
| GET | `/v1/dadu/catalog` | Purchasable and unlockable items. |
| GET | `/v1/dadu/badges` | Badge definitions. |

```json
ContentSummary = {
  "publicId": "academic.math.counting.03", "type": "lesson", "section": "academic",
  "topic": "academic.math.counting", "title": "Counting the mangoes", "titleHelper": "आम गिनना",
  "ageBands": ["A1","A2"], "difficulty": "steady", "durationMinutes": 6,
  "objective": "Count objects one to ten", "concepts": ["academic.math.counting.one_to_ten"],
  "version": 4, "publishedAt": "2026-11-01T10:00:00Z", "packs": ["section.academic"]
}
```

## 5. Packs and offline sync

| Method | Path | Auth | Body → Response |
|---|---|---|---|
| GET | `/v1/dadu/packs` | – | `?language=hi&appVersion=` → `{ items: [{ key, language, version, bytes, url, sha256, minAppVersion, contentSchemaVersion }] }` |
| GET | `/v1/dadu/packs/:key/manifest` | – | `?from=<version>` → full manifest, or a delta `{ added: [...], removed: [...], base: 3, version: 5 }` |
| GET | `/v1/dadu/packs/:key/:version/:path` | – | 302 to the CDN object (signed if the pack is not public yet). |
| POST | `/v1/dadu/children/:childId/sync/push` | parent | `{ installId, lessonProgress: [...], attempts: [...], objectCompletions: [...], walletEntries: [...], usageSessions: [...], worldState: { version, garden, decorations } }` → `{ accepted: { attempts: 12, ... }, rejected: [{ id, reason }], worldState: { version } }`. Max 500 rows per table per call. |
| GET | `/v1/dadu/children/:childId/sync/pull` | parent | `?since=<iso>` → `{ mastery: [...], wallet, badges: [...], inventory: [...], worldState, screenTimeRules, serverTime }` |

World state conflict rule: the client sends the version it last pulled; if the server has a newer
version, the server merges (union of planted plots, latest stage per plot, union of decorations)
and returns the merged state with `409 sync_conflict` only when a plot was removed on one side
and planted on the other, which the client resolves by keeping the plant.

## 6. Learning activity (child scoped)

| Method | Path | Body → Response |
|---|---|---|
| POST | `/v1/dadu/children/:childId/lessons/:publicId/start` | → `200 { progressId, resumeStep }` |
| POST | `/v1/dadu/children/:childId/lessons/:publicId/complete` | `{ steps: 9, durationSec, speedOverrides }` → `{ stars, coins, badgesEarned: [...], nextSuggested: [ContentSummary] }` |
| POST | `/v1/dadu/children/:childId/attempts` | `{ items: [Attempt] }` → `{ accepted, mastery: [{ conceptId, level, status }] }` |
| GET | `/v1/dadu/children/:childId/next` | `?section=` → `{ items: [ContentSummary] }` – adaptive suggestions: due revisions first (`next_review_at`), then next concept by prerequisites. |
| GET | `/v1/dadu/children/:childId/echo` | → `{ lines: [{ character: 'mitthu', textKey, audio }, { character: 'gopu', ... }] }` – Mitthu's Echo set built from concepts due for revision. |
| GET | `/v1/dadu/children/:childId/mastery` | `?section=` → `{ items: [{ conceptId, level, status, lastPractisedAt }] }` |

```json
Attempt = {
  "id": "uuid-from-client", "itemId": "uuid", "assessmentId": "uuid|null",
  "contentVersionId": "uuid|null", "answer": { "optionIds": ["b"] },
  "correct": true, "score": 1, "timeMs": 4200, "hintsUsed": 0, "attemptNo": 1,
  "occurredAt": "2026-11-02T08:12:30Z"
}
```

Rubric items (`practical`, `oral`, `drawing`) are accepted with `correct: null`; a parent marks
them through `PATCH /v1/dadu/children/:childId/attempts/:id` (**gate**) with `{ score, note }`.

## 7. Real-world assignments

| Method | Path | Auth | Body → Response |
|---|---|---|---|
| GET | `/v1/dadu/children/:childId/assignments` | parent | `?status=&section=` → `{ items: [{ assignment: ContentSummary, status, completedAt }] }` |
| POST | `/v1/dadu/children/:childId/assignments/:publicId/start` | parent | → `200 { completionId }` |
| POST | `/v1/dadu/children/:childId/assignments/:publicId/complete` | parent, **gate** | `{ note? }` → `{ stars, badgesEarned }` |
| POST | `/v1/dadu/children/:childId/assignments/:publicId/photo` | parent, **gate** | `multipart/form-data` image ≤ 5 MB; requires `assignment_photos` consent → `201 { photoKey }`. Stored encrypted in a private bucket; never served without a signed URL. |
| GET | `/v1/dadu/children/:childId/assignments/:publicId/photo` | parent, **gate** | → `{ url, expiresAt }` (signed, 5 min) |
| DELETE | `/v1/dadu/children/:childId/assignments/:publicId/photo` | parent, **gate** | → `204` |

## 8. Gamification and world

| Method | Path | Auth | Body → Response |
|---|---|---|---|
| GET | `/v1/dadu/children/:childId/wallet` | parent | `{ stars, coins, recent: [WalletEntry] }` |
| POST | `/v1/dadu/children/:childId/catalog/:itemKey/acquire` | parent | → `{ inventory: [...], wallet }`; `409 insufficient_coins` or `unlock_rule_unmet`. No real money is ever involved on this route. |
| PATCH | `/v1/dadu/children/:childId/inventory/:itemKey` | parent | `{ placement: { locationId, x, y } | null }` → `204` |
| GET | `/v1/dadu/children/:childId/achievements` | parent | `{ badges: [...], certificates: [...], stars, coins, streakFree: true }` |
| GET | `/v1/dadu/children/:childId/certificates/:id.pdf` | parent, **gate** | PDF |

## 9. Screen time and parent dashboard

| Method | Path | Auth | Body → Response |
|---|---|---|---|
| GET | `/v1/dadu/children/:childId/screen-time` | parent | `{ rules, today: { seconds, sessions }, week: [{ date, seconds }] }` |
| PUT | `/v1/dadu/children/:childId/screen-time` | parent, **gate** | `{ dailyLimitMinutes, warnBeforeMinutes, breakEveryMinutes?, bedtimeStart?, bedtimeEnd?, weekdayOverrides? }` → rules |
| GET | `/v1/dadu/children/:childId/reports/weekly` | parent | `?week=2026-W44` → `{ minutes, lessons, attempts, accuracy, sections: [{ key, minutes, accuracy }], mastered: [...], revise: [...], assignments, badges }` |
| GET | `/v1/dadu/children/:childId/reports/subjects` | parent | per subject accuracy and progress over the last 12 weeks |
| GET | `/v1/dadu/parent/notifications` | parent | `{ items, nextCursor }` |
| POST | `/v1/dadu/parent/notifications/read` | parent | `{ ids }` → `204` |
| GET | `/v1/dadu/parent/downloads` | parent | pack list with installed versions reported by the device (`?installId=`) |
| DELETE | `/v1/dadu/me` | parent, **gate** | existing route extended: cascades every child profile, photos and consents. |

## 10. Analytics

`POST /v1/analytics/events` (existing) is reused; DADU events use a closed name list validated by
zod (`dadu_lesson_started`, `dadu_lesson_completed`, `dadu_item_answered`, `dadu_object_tapped`,
`dadu_pack_installed`, `dadu_assignment_completed`, `dadu_limit_reached`, …) and carry only
`contentId`, `ageBand`, `language`, `sectionKey`, `durationMs`. A request with any other property
is rejected with `400`.

## 11. Admin console API (`/admin/v1/dadu/*`)

All routes need an admin session; each checks a permission. New permissions in `rbac.ts`:
`dadu:content:read|write|approve|publish|delete`, `dadu:review:educational|factual|language|
copyright|audio`, `dadu:media:write`, `dadu:packs:build`, `dadu:profiles:read` (support view,
nickname and progress only), `dadu:config:write`. New role `reviewer` holds the five review
permissions and `dadu:content:read`.

### Curriculum and world

| Method | Path | Permission |
|---|---|---|
| GET/POST/PATCH/DELETE | `/admin/v1/dadu/sections`, `/subjects`, `/topics`, `/concepts` | `dadu:content:read` / `write` / `delete` |
| GET/POST/PATCH/DELETE | `/admin/v1/dadu/locations`, `/locations/:id/objects`, `/objects/:id/activities` | same |
| GET/POST/PATCH | `/admin/v1/dadu/characters`, `/characters/:key/voices` | `dadu:content:write` |

### Content items, versions, workflow

| Method | Path | Body → Response | Permission |
|---|---|---|---|
| GET | `/admin/v1/dadu/content` | `?type=&section=&state=&assignee=&search=&limit=&cursor=` → list with current version and state | `dadu:content:read` |
| POST | `/admin/v1/dadu/content` | `{ publicId, type, section, topic?, document, title, objective, ageBands, difficulty, prerequisites, concepts, provenance }` → `201` item + version 1 in `draft` | `dadu:content:write` |
| POST | `/admin/v1/dadu/content/:id/versions` | new draft version copied from the latest | `dadu:content:write` |
| PATCH | `/admin/v1/dadu/content/:id/versions/:v` | editable only in `draft` | `dadu:content:write` |
| PUT | `/admin/v1/dadu/content/:id/versions/:v/steps` | full ordered step list (lessons) | `dadu:content:write` |
| PUT | `/admin/v1/dadu/content/:id/versions/:v/pages` | story pages | `dadu:content:write` |
| POST | `/admin/v1/dadu/content/:id/versions/:v/transition` | `{ to, note?, checklist? }` → `{ workflowState }`; `409 workflow_invalid` when the move is not allowed from the current state or the checklist is incomplete | per target state (§12 of `17-database-schema.md`) |
| GET | `/admin/v1/dadu/content/:id/versions/:v/diff/:other` | field-level diff | `dadu:content:read` |
| POST | `/admin/v1/dadu/content/:id/versions/:v/publish` | sets `published_version_id`, enqueues pack rebuilds | `dadu:content:publish` |
| POST | `/admin/v1/dadu/content/:id/unpublish` | | `dadu:content:publish` |

### Translations, media, assessments

| Method | Path | Permission |
|---|---|---|
| GET/PUT | `/admin/v1/dadu/translations?entityType=&entityId=&language=` (bulk upsert of `[{field, language, text, status}]`) | `dadu:content:write`, proofread flag needs `dadu:review:language` |
| POST | `/admin/v1/dadu/translations/machine-draft` `{ entityType, entityId, from, to: [...] }` → drafts with `status: machine_draft` | `dadu:content:write` |
| POST | `/admin/v1/dadu/media` (multipart, with mandatory `source`, `creator`, `licence`, `attributionRequired`) | `dadu:media:write` |
| PATCH | `/admin/v1/dadu/media/:id` review status, attach permission document | `dadu:review:copyright` |
| GET/POST/PATCH | `/admin/v1/dadu/assessments`, `/assessment-items` (same version and workflow routes as content) | `dadu:content:*` |
| POST | `/admin/v1/dadu/assessment-items/import` CSV/JSON bulk import to `draft` | `dadu:content:write` |

### Packs, rewards, config, support

| Method | Path | Permission |
|---|---|---|
| POST | `/admin/v1/dadu/packs/build` `{ key, language? }` → `202 { jobId }`; GET `/packs`, `/packs/jobs/:id` | `dadu:packs:build` |
| GET/POST/PATCH | `/admin/v1/dadu/badges`, `/catalog`, `/certificates/templates` | `dadu:content:write` |
| GET/PUT | `/admin/v1/dadu/config` (`features`, `consentVersion`, `minAppVersion`, `defaultSpeeds`, `templeEnabledByDefault`) | `dadu:config:write` |
| GET | `/admin/v1/dadu/profiles/:childId` (nickname, band, language, progress summary – no photos, no notes) | `dadu:profiles:read` |
| GET | `/admin/v1/dadu/insights` (lessons completed, accuracy by item, drop-off per step, pack installs) | `analytics:read` |

## 12. WebSocket

The existing `realtime/hub.ts` is used for one thing in DADU: pushing `screen_time.updated` and
`profile.updated` to the child's device when a parent changes rules from another device, so the
limit applies without a restart. No child-to-child or child-to-anyone messaging exists.

## 13. Testing

Integration tests in `backend/tests/dadu/*.test.ts` on the existing vitest + supertest + real
PostgreSQL harness: consent gating, gate tokens, profile limits, workflow transitions and
permissions, pack manifests and deltas, idempotent sync, world-state merge, analytics event
allow-list, deletion cascade.
