# FOCUS API reference

Base URL: your API host, e.g. `https://api.your-domain.com`. All bodies are JSON.

**Errors** always look like:

```json
{ "error": { "code": "bad_request", "message": "Invalid request", "details": [{ "path": "email", "message": "Invalid email" }] } }
```

Codes: `bad_request` 400, `unauthorized` 401, `forbidden` 403, `not_found` 404, `conflict` 409,
`payload_too_large` 413, `rate_limited` 429, `unavailable` 503, `internal` 500.

**Auth:** `Authorization: Bearer <token>`. App tokens come from `/v1/auth/*`, admin tokens from
`/admin/v1/auth/login` (the admin console handles this for you).

---

## App API (`/v1`)

### Health & config

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/v1/health` | — | `{ ok, time }` — also checks the database. |
| GET | `/v1/config` | — | Complete remote config: `maintenance {enabled,message}`, `appVersion {minimumVersion, latestVersion, updateMessage, iosStoreUrl, androidStoreUrl}`, `features {contentLibrary, quoteTiles, customPhotos, accounts, pushNotifications, passwordReset}`, `texts {…}`, `session {gracePeriodSeconds}`, `serverTime`. Never cached. |

### Content library

| Method | Path | Description |
|---|---|---|
| GET | `/v1/categories` | Flat list `[{ id, name, parentId }]` (app builds the tree). Cached 5 min. |
| GET | `/v1/images` | Published images. Query: `search`, `categoryId` (includes all sub-categories), `tags=a,b` (must have all), `sort=newest\|popular\|title`, `limit` (1–50, default 20), `cursor`. Returns `{ items: ContentImage[], nextCursor: string\|null }`. |
| GET | `/v1/images/:id` | One published image. |

`ContentImage`: `imageId, title, category, subcategory, tags, thumbnailUrl, mediumImageUrl, fullImageUrl, source, creator, license, attributionRequired, attributionText, createdAt, popularity`.

### Accounts

| Method | Path | Auth | Body → Response |
|---|---|---|---|
| POST | `/v1/auth/register` | — | `{ email, password (8–128), displayName? }` → `201 { token, expiresAt, user }`. 409 if email exists. Rate limited. |
| POST | `/v1/auth/login` | — | `{ email, password }` → `{ token, expiresAt, user }`. Generic 401 for wrong credentials. Rate limited. |
| POST | `/v1/auth/logout` | user | → 204 (revokes this session). |
| POST | `/v1/auth/password-reset/request` | — | `{ email }` → `202` always (same answer for unknown emails). Emails a 6-digit code valid 15 min. 503 if email isn't configured. |
| POST | `/v1/auth/password-reset/confirm` | — | `{ email, code, newPassword }` → `{ token, expiresAt, user }`; revokes all other sessions. 5 wrong codes lock the code. |
| GET | `/v1/me` | user | → `{ id, email, displayName, createdAt }` |
| PATCH | `/v1/me` | user | `{ displayName }` → user |
| POST | `/v1/me/password` | user | `{ currentPassword, newPassword }` → 204 (signs out other devices) |
| DELETE | `/v1/me` | user | `{ password }` → 204. Deletes the account; analytics are kept but unlinked. |

Sessions last 30 days and extend while in use.

### Devices & analytics

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/v1/devices` | optional | `{ installId, platform: ios\|android\|web, appVersion?, pushToken?: ExponentPushToken[…]\|null, pushEnabled? }` → 204. Upserts by `installId`; links to the signed-in user if a token is sent. |
| POST | `/v1/events` | optional | `{ installId, platform, appVersion?, events: [{ name, occurredAt?, screen?, contentId?, properties? }] }` (1–50 events; `name` like `session_complete`; ≤20 scalar properties) → `202 { accepted }`. Rate limited 60/min/IP. |

Events the app sends: `app_open`, `screen_view`, `content_view`, `session_start`,
`session_complete`, `session_fail`, `sign_in`, `sign_up`, `password_reset`, `error`.

---

## Admin API (`/admin/v1`)

Every route except `/auth/login` requires an admin token **and** the listed permission.
Responses are `Cache-Control: no-store`. Changes are written to the audit log.

### Auth

| Method | Path | Permission | Description |
|---|---|---|---|
| POST | `/auth/login` | — | `{ email, password }` → `{ token, expiresAt }` (12 h). 5 failures lock the account 15 min. |
| POST | `/auth/logout` | any | Revokes the session. |
| GET | `/auth/me` | any | `{ id, email, name, role {key,name}, permissions[] }` |
| POST | `/auth/change-password` | any | `{ currentPassword, newPassword }` → 204; other sessions revoked. |

### Dashboard, analytics, audit

| Method | Path | Permission | Description |
|---|---|---|---|
| GET | `/dashboard` | dashboard:read | Counts (users, installs, content, sessions, notifications) + recent activity/users. Sections you can't access come back `null`. |
| GET | `/analytics?days=7..180` | analytics:read | `active {dau,wau,mau}`, daily `dau[]` & `registrations[]`, `retention {d1,d7,d30,cohortSizes}`, `topScreens`, `topContent`, `sessions {completed, failed, completionRate, avgCompletedMinutes}`, `platforms`, `errors {count, recent[]}`. |
| GET | `/audit-log?page&pageSize` | audit:read | Paginated audit entries. |

### Users

| Method | Path | Permission | Description |
|---|---|---|---|
| GET | `/users?search&status&page&pageSize` | users:read | Paginated list. |
| GET | `/users/:id` | users:read | Profile, devices, active session count, last 50 events. |
| PATCH | `/users/:id` | users:write | `{ status: active\|deactivated }` — deactivation signs them out everywhere. |
| DELETE | `/users/:id` | users:delete | Permanent delete. |

### Content & categories

| Method | Path | Permission | Description |
|---|---|---|---|
| GET | `/content?search&status&categoryId&page&pageSize` | content:read | Paginated list (drafts included). |
| GET | `/content/:id` | content:read | |
| POST | `/content` | content:write (+content:publish to create as published) | `{ title, categoryId?, subcategoryId?, tags[], thumbnailUrl, mediumUrl, fullUrl, source, creator, license, attributionRequired, attributionText?, status? }` |
| PATCH | `/content/:id` | content:write (+content:publish to change `status`) | Any subset of the fields above. |
| DELETE | `/content/:id` | content:delete | |
| GET | `/categories` | content:read | With `contentCount`. |
| POST | `/categories` | content:write | `{ name, parentId?, id?, sortOrder? }` — id defaults to a slug. |
| PATCH | `/categories/:id` | content:write | `{ name?, parentId?, sortOrder? }` (cycle-safe). |
| DELETE | `/categories/:id` | content:delete | 409 if it has sub-categories. |

### App configuration

| Method | Path | Permission | Description |
|---|---|---|---|
| GET | `/settings` | settings:read | `[{ key, label, description, value, defaults, updatedAt }]` |
| PUT | `/settings/:key` | settings:write | `{ value }` validated against the key's schema (`maintenance`, `app_version`, `feature_flags`, `texts`, `session`). |

### Notifications

| Method | Path | Permission | Description |
|---|---|---|---|
| GET | `/notifications?page&pageSize` | notifications:read | History with delivery counts. |
| GET | `/notifications/:id` | notifications:read | |
| POST | `/notifications/preview` | notifications:send | `{ target }` → `{ recipients }` |
| POST | `/notifications` | notifications:send | `{ title (≤65), body (≤240), target, sendNow=true }` → 202 `sending` (or 201 `draft`). Target: `{type:'all'}`, `{type:'signed_in'}`, `{type:'platform', platform:'ios'\|'android'}`, `{type:'users', userIds:[…]}`. |
| POST | `/notifications/:id/send` | notifications:send | Send a draft. |
| DELETE | `/notifications/:id` | notifications:send | Delete a draft. |

### Admins & roles

| Method | Path | Permission | Description |
|---|---|---|---|
| GET | `/roles` | admins:read | Roles with their permissions. |
| GET | `/admins` | admins:read | |
| POST | `/admins` | admins:write | `{ email, name, roleKey, password }` |
| PATCH | `/admins/:id` | admins:write | `{ name?, roleKey?, status?, password?, unlock? }` — role/status/password changes sign that admin out. |
| DELETE | `/admins/:id` | admins:write | Not yourself, not the last Super Admin. |
