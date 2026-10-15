# LoJi API reference

Base URL: your API host, e.g. `https://api.your-domain.com`. All bodies are JSON. Versioned
under `/v1` (app) and `/admin/v1` (console).

**Errors** always look like:

```json
{ "error": { "code": "bad_request", "message": "Invalid request", "details": [{ "path": "phone", "message": "Invalid phone" }] } }
```

Codes: `bad_request` 400, `unauthorized` 401, `subscription_required` 402, `forbidden` 403,
`not_found` 404, `conflict` 409, `payload_too_large` 413, `rate_limited` 429, `unavailable` 503,
`internal` 500.

**Auth:** `Authorization: Bearer <token>`. Three kinds of token, never interchangeable:
guardian (`/v1/guardian/login/verify`), player (`/v1/player/login[/verify]`), admin
(`/admin/v1/auth/login`, handled by the console). Routes marked **E** also need an active
family entitlement (otherwise 402 `subscription_required`); routes marked **S** need a step-up
OTP (`/v1/guardian/step-up/*`) within the last 15 minutes.

Rate limits (per IP unless noted): general 300/min; login 10/15 min per IP+identifier;
register 10/h; OTP send 20/h per IP+identifier; OTP verify 30/15 min; recovery 10/h; billing
10/min per principal; heartbeat 120/min per principal; webhooks 120/min; events 60/min.

---

## Public (`/v1`)

| Method | Path | Description |
|---|---|---|
| GET | `/v1/health` | `{ ok, time }`; checks the database. |
| GET | `/v1/config` | Remote config: `maintenance`, `appVersion`, `features` (admin flags + server capabilities `phoneSignIn`, `googlePlayBilling`, `razorpayBilling`, `sandboxBilling`), `texts`, `limits`, `subscription { productId, priceInr }`, `termsVersion`, `serverTime`. |
| GET | `/v1/catalogue/brackets` · `/game-categories` · `/fact-categories` | Public reference lists. |
| GET | `/v1/categories`, `/v1/images`, `/v1/images/:id` | Published image library (admin-curated illustrations). |
| POST | `/v1/devices` | Register/refresh an install `{ installId, platform, appVersion?, pushToken? }`. With a guardian or player token the device is linked to that account. |
| POST | `/v1/events` | Coarse analytics events (no identifiers beyond the install id). |
| GET | `/v1/ws/info` | WebSocket URL and protocol version. |

## Guardian accounts (`/v1/guardian`)

| Method | Path | Auth | Body → Result |
|---|---|---|---|
| POST | `/register/start` | — | `{ name, phone, password, consent: true, termsVersion }` → `{ challengeId }` (OTP sent). Password policy: 10+ chars with letters and digits. |
| POST | `/register/verify` | — | `{ challengeId, code }` → `{ token, guardian }`. |
| POST | `/login` | — | `{ phone, password }` → `{ challengeId }` (password checked first, then OTP sent). Lockout after repeated failures. |
| POST | `/login/verify` | — | `{ challengeId, code, installId? }` → `{ token, guardian, entitlement }`. |
| POST | `/otp/resend` | — | `{ challengeId }` → `{ challengeId }` (respects cooldown and per-number caps). |
| POST | `/recovery/start` · `/recovery/verify` | — | Forgotten password: `{ phone }` → `{ challengeId }`; `{ challengeId, code, newPassword }` → `{ token }`. All other sessions are revoked. |
| GET | `/me` | guardian | `{ guardian, entitlement, children: [...summary], pendingDeletion }`. |
| PATCH | `/me` | guardian | `{ name?, email?, language?, notificationsEnabled? }`. |
| POST | `/password` | guardian **S** | `{ currentPassword, newPassword }`; revokes other sessions. |
| POST | `/step-up/start` · `/step-up/verify` | guardian | OTP to the guardian's phone → 15-minute step-up window. |
| POST | `/logout` · `/logout-all` | guardian | Revoke this / every guardian session (`logout-all` also revokes player sessions). |
| DELETE | `/me` | guardian **S** | Request account deletion: the account is frozen and deleted after `DELETION_COOLING_OFF_DAYS` by the cleanup job. |
| POST | `/me/deletion/cancel` | guardian | Cancel a pending deletion. |
| GET | `/me/export` | guardian **S** | JSON export of the household's data (data-portability). |

## Household (`/v1/guardian`)

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/dashboard` | guardian | Children count, online/active players, current game and duration per child, today's and this week's minutes, progress summary, recent activity, subscription status. |
| GET/POST | `/children` | guardian | List / create `{ displayName, birthMonth: 'YYYY-MM', avatarId, pin, playerOtpRequired?, bracketOverride? }` → child with `playerId` (`LOJI-XXXXXX`). Max per guardian from settings. |
| GET/PATCH/DELETE | `/children/:id` | guardian | Detail (profile, live state, today's usage, progress, controls) / edit / soft-delete (restorable with `POST /children/:id/restore`). |
| POST | `/children/:id/pin` | guardian **S** | Reset the PIN; revokes the child's sessions. |
| POST | `/children/:id/revoke-sessions` | guardian | Sign the child out everywhere. |
| POST | `/children/:id/player-session` | guardian **E** | Open the Player Console on this device without a PIN (returns a player token). |
| GET/PUT | `/children/:id/controls` | guardian | Parental controls: `dailyLimitMinutes`, `sessionLimitMinutes`, `playWindows[{days,start,end}]`, `bedtimeStart/End`, `timezone`, `blockedCategories`, `blockedGames`, `allowedBrackets`, `soundEnabled`, `narrationEnabled`, `favouritesEnabled`, `mirroringEnabled`, `newDeviceApproval`. Changes are pushed to the child's socket. |
| GET | `/children/:id/activity` | guardian | Session history and daily screen-time for the last weeks. |
| POST | `/children/:id/session/pause` · `/resume` · `/end` | guardian | Live controls for the current game (delivered over the socket; honoured on the next heartbeat too). |
| GET | `/children/:id/export` | guardian **S** | Export one child's data. |
| GET | `/devices` · POST `/devices/:id/approve` · DELETE `/devices/:id` | guardian | Devices used by the household; approval when `newDeviceApproval` is on. |

## Subscription (`/v1/guardian/subscription`)

| Method | Path | Description |
|---|---|---|
| GET | `/` | `{ entitlement, current, history, monthly { productId, priceInr }, providers { googlePlay, razorpay, sandbox }, manage { googlePlayUrl, supportEmail } }`. |
| POST | `/google/verify` | `{ purchaseToken, productId }` → verified with the Play Developer API (`purchases.subscriptionsv2`), acknowledged, stored, entitlement recomputed. Rejects tokens bought by another account. |
| POST | `/razorpay/create` | → `{ subscriptionId, keyId }` for Razorpay Checkout on the website. |
| POST | `/razorpay/confirm` | `{ razorpay_payment_id, razorpay_subscription_id, razorpay_signature }` → signature verified (HMAC) and the subscription fetched from Razorpay. |
| POST | `/razorpay/cancel` | Cancel at period end. |
| POST | `/restore` | Re-verify every known purchase for this household. |
| POST | `/sandbox/activate` · `/sandbox/transition` | Development/test only (`BILLING_SANDBOX=true`, refused in production): activate, or move to `grace`, `expired`, `cancelled`, `revoked`… to exercise the state machine. |

Webhooks (`/v1/webhooks`): `POST /google-play?token=<GOOGLE_PLAY_RTDN_TOKEN>` (Pub/Sub push
body with `message.data` base64 RTDN; re-verifies the purchase), `POST /razorpay` (signature
header checked with `RAZORPAY_WEBHOOK_SECRET`). Both are idempotent by event id.

## Player (`/v1/player`)

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/login` | — | `{ playerId, pin, installId? }` → `{ token, me }`, or `202 { otpRequired: true, challengeId }` when the guardian requires a code (sent to the **guardian's** phone), or `403 device_approval_required`. |
| POST | `/login/verify` | — | `{ challengeId, code }` → `{ token, me }`. |
| GET | `/me` | player | Nickname, avatar, bracket, guardian's settings that affect the child (sound, narration, favourites), entitlement with `validUntil`, paused state. |
| POST | `/logout` | player | |
| GET | `/games` | player **E** | Games visible to this child (published, bracket allowed, not blocked), with progress, favourites and `recommended`. `GET /games/:id` for one. |
| PUT/DELETE | `/games/:id/favourite` | player | |
| POST | `/sessions/start` | player **E** | `{ gameId, clientSessionId, difficulty }` → `201 { sessionId, allowedSeconds, ... }` or `403` with a child-friendly reason (`bedtime`, `outside_play_window`, `daily_limit`, `paused`, `blocked`). |
| POST | `/sessions/:id/heartbeat` | player | → `{ running, mustEnd, reason?, remainingSeconds, paused }`. Every 30 s (socket first, REST fallback). |
| POST | `/sessions/:id/end` | player | `{ outcome, score?, stars?, progress? }` → achievements earned. Clears the mirror snapshot. |
| GET | `/progress` · PUT `/progress/:gameId` | player | Per-game progress, achievements, crafts finished, facts read, quiz stats. |
| GET | `/crafts` · `/crafts/:id` · PUT `/crafts/:id/progress` | player **E** | Tutorials for the child's brackets; full steps on detail; `{ stepsDone, checklistDone, completed }`. |
| GET | `/facts` · `/facts/daily` · `/facts/random` · `/facts/history` · `/facts/categories` · `/facts/:id` | player **E** | Published facts for the brackets, with source and quiz questions (without the answer). Daily = same fact for everyone in a bracket that day; random prefers unseen. |
| POST | `/facts/:id/view` · PUT `/facts/:id/favourite` | player | History and favourites (favourites can be disabled by the guardian). |
| POST | `/quiz/answer` · GET `/quiz/history` | player | `{ questionId, chosenIndex }` → `{ correct, correctIndex, explanation }`. |
| GET | `/controls` | player | The subset of controls the console needs (sound, narration, favourites, mirroring). |

## WebSocket (`/v1/ws?token=<guardian or player token>`)

Server → client (guardian): `hello {role, onlineChildren}`, `child_status {childId, online, session?}`,
`watching {childId}`, `mirror_frame {childId, sessionId, gameId, seq, state, at}`,
`mirror_ended {childId, reason}`, `error {code}` (`forbidden`, `mirroring_disabled`, `offline`).
Server → client (player): `hello {role}`, `mirror_status {watchers}`, `session_control
{action: pause|resume|end|signed_out}`, `controls_changed`, `profile_changed`,
`heartbeat_result {sessionId, result}`, `pong`.
Client → server: guardian `watch {childId}` / `unwatch {childId}`; player `mirror {sessionId,
seq, state}` and `heartbeat {sessionId}`; either `ping`. Unauthenticated sockets are closed
with code 4401.

## Admin (`/admin/v1`, admin token, permission per route)

| Area | Routes |
|---|---|
| Auth | `POST /auth/login`, `GET /auth/me`, `POST /auth/logout`, password change. |
| Guardians (`guardians:*`) | `GET /guardians` (search, status, paging; children as counts), `GET /guardians/:id` (children as brackets only, devices, subscriptions, deletion requests), `PATCH /guardians/:id {status}`, `DELETE /guardians/:id`. |
| Subscriptions (`subscriptions:*`) | `GET /subscriptions/stats`, `GET /subscriptions`, `GET /subscriptions/:id/events`, `POST /subscriptions/:id/revoke`, `POST /subscriptions/:id/extend {days, reason}`. |
| Catalogue (`content:*`) | `GET/POST /games`, `GET/PATCH /games/:id`, `GET/POST /game-categories`; `GET/POST /crafts`, `GET/PATCH/DELETE /crafts/:id`; `GET/POST /fact-sources`, `PATCH /fact-sources/:id`; `GET/POST /facts`, `GET/PATCH/DELETE /facts/:id`, `POST /facts/:id/status {status: draft|verified|published|archived}` (verify needs `content:verify` and a source; publish needs `content:publish`, a verification and ≥1 question), `POST /facts/:id/questions`, `PATCH/DELETE /questions/:id`, `GET /approvals`. |
| Settings (`settings:*`) | `GET /settings`, `PUT /settings/:key` (maintenance, app_version, feature_flags, texts, limits). |
| Notifications, analytics, audit, admins | `/notifications`, `/dashboard`, `/analytics`, `/audit-log`, `/health`, `/admins`, `/roles`. |

Every admin mutation is recorded in `audit_logs` with the admin id, action, entity and a summary.
