# Tame API reference

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

Accounts are phone-first: a one-time code by SMS signs you in and creates the account the first
time; then a password, a username and an avatar are set. Accounts created earlier with an email
keep working with email + password.

| Method | Path | Auth | Body → Response |
|---|---|---|---|
| POST | `/v1/auth/otp/request` | — | `{ phone }` → `202 { ok, phone (masked), expiresInSeconds, resendAfterSeconds }`. Sends a 6-digit code (10 min). 429 after 5 codes an hour or within 45 s of the last; 503 when no SMS provider is configured; 502 when the provider fails. Rate limited per IP + number. |
| POST | `/v1/auth/otp/verify` | — | `{ phone, code }` → `201` (account created) or `200` `{ token, expiresAt, user, onboarding }`. 5 wrong codes lock the code. The session may set a password without the old one for 15 minutes. |
| POST | `/v1/auth/login` | — | `{ phone \| email, password }` → `{ token, expiresAt, user, onboarding }`. Generic 401 for wrong credentials. Rate limited. |
| POST | `/v1/auth/register` | — | `{ email, password, displayName? }` → `201 { token, expiresAt, user, onboarding }`. Email accounts (kept for compatibility). |
| POST | `/v1/auth/logout` | user | → 204 (revokes this session). |
| POST | `/v1/auth/password-reset/request` | — | `{ email }` → `202` always. Emails a 6-digit code valid 15 min. 503 if email isn't configured. Phone accounts reset by signing in with a code and calling `/v1/me/password`. |
| POST | `/v1/auth/password-reset/confirm` | — | `{ email, code, newPassword }` → `{ token, expiresAt, user, onboarding }`; revokes all other sessions. |
| GET | `/v1/me` | user | → `user` + `onboarding` |
| GET | `/v1/usernames/availability?username=` | user | → `{ username, available, reason: 'invalid' \| 'reserved' \| 'taken' \| null }`. Advisory; the unique index decides on save. 60/min. |
| PATCH | `/v1/me` | user | `{ displayName?, username?, avatarId?, allowPokes?, discoverableByPhone? }` → user + onboarding. 409 if the username was just taken. |
| POST | `/v1/me/password` | user | `{ currentPassword?, newPassword }` → 204 (signs out other devices). `currentPassword` may be left out when the account has no password yet or the session was opened by a code within 15 minutes. |
| DELETE | `/v1/me` | user | `{ password? }` → 204. Deletes the account; analytics are kept but unlinked. |

`user` (the owner's own view): `id, phone, phoneMasked, email, username, displayName, avatarId,
allowPokes, discoverableByPhone, hasPassword, createdAt`. Other people only ever get
`id, username, displayName, avatarId` — never a number or email. `onboarding`:
`{ needsPassword, needsUsername }`.

**Password rule:** 6–15 characters with at least one capital letter, one small letter, one number
and one special character, no spaces. **Username rule:** 3–20 characters, letters, numbers, dots
and underscores, starting with a letter, no two dots/underscores in a row; case is kept for
display, uniqueness is case-insensitive; some names (admin, support, tame, …) are reserved.

Sessions last 30 days and extend while in use.

### Friends, pokes, notifications, focus sessions

All need a signed-in person. Other people are only ever `{ id, username, displayName, avatarId }`
(never a number or email). Live updates come over the WebSocket below.

| Method | Path | Body → Response |
|---|---|---|
| GET | `/v1/people/search?q=` | part of a username (2+ chars) or a full mobile number (exact; only people who allow it) → `{ items: [profile + relation ('none'|'friends'|'requested'|'incoming'|'blocked'), requestId] }`. Never oneself or anyone blocked either way. 40/min. |
| GET | `/v1/friends` | → `{ friends: [profile + presence { online, focusing, inGroup, lastSeenAt } + weekMinutes + leadsMe], incoming, sent, myWeekMinutes, focusingCount }` |
| POST | `/v1/friends/requests` | `{ userId }` → `201 { requestId, status: 'pending' }`; `200 … 'accepted'` when they had already asked you. 400 self, 403 blocked, 409 duplicate / already friends. 30/hour. |
| POST | `/v1/friends/requests/:id/accept` · `/decline` | addressee only. Declining is quiet. |
| DELETE | `/v1/friends/requests/:id` | cancel a request you sent |
| DELETE | `/v1/friends/:userId` | unfriend |
| POST / DELETE | `/v1/people/:userId/block` | block (ends the friendship and any request) / unblock; `GET /v1/people/blocked` |
| POST | `/v1/pokes` | `{ userId, key }` → `201 { pokeId, delivered: 'live'|'notification', repeated }`. Friends only, 403 when they turned pokes off, 429 within 2 min of the last poke to them; the same `key` again is a no-op (`200`, `repeated: true`). |
| GET | `/v1/notifications?limit&before` | → `{ items, nextCursor, unread }` |
| POST | `/v1/notifications/read` | `{ ids } \| { all: true }` → `{ unread }` |
| POST | `/v1/focus/sessions` | `{ clientSessionId, plannedMinutes }` → `201 { sessionId, startedAt }` (the same client id again returns the same session). Ends any other running session. |
| POST | `/v1/focus/sessions/:id/heartbeat` | every minute while running; without one for 2 min the person no longer shows as focusing |
| POST | `/v1/focus/sessions/:id/finish` | `{ outcome }` → `{ outcome, verifiedMinutes, rejected }`. A completion reported before the planned length has passed on the server's clock is recorded as failed and credits nothing. |
| POST | `/v1/focus/sessions/:id/abandon` | the app left without finishing |
| GET | `/v1/focus/stats` | → `{ weekMinutes, totalMinutes, completedSessions }` (verified minutes only) |

**WebSocket** `GET /v1/ws?token=<bearer token>` (same token as the API; 4401 closes a bad one).
Server → app events, as JSON: `hello`, `presence { userId, state }` (a friend connected,
disconnected, started or finished focusing), `notification { notification, unread }`,
`poke { from, pokeId }`, `friends_changed`, `group { event, sessionId, data }`. The app sends
`ping`; the server answers `pong`. Presence is per API instance (in memory).

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
