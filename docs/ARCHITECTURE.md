# LoJi — Architecture

## Overview

One Expo app (`/`) serves both consoles on Android, iOS and the web; one Express API
(`/backend`) owns every rule that must not be trusted to a device (accounts, OTPs,
subscriptions, parental controls, catalogue visibility, progress); a Next.js console
(`/admin`) manages content and support through the same API. PostgreSQL is the only state
store; realtime delivery is a WebSocket hub inside the API process.

```
app (Expo)                           API (Express 5 + Drizzle)                   PostgreSQL
 ├ GuardianContext  ── /v1/guardian ──▶ routes/public/guardian.ts (auth, OTP, deletion)
 ├ PlayerContext    ── /v1/player   ──▶ routes/public/player.ts   (catalogue, sessions, facts, crafts)
 ├ RealtimeClient   ── /v1/ws       ──▶ realtime/hub.ts            (status, mirror, controls)
 ├ billing/*        ── /v1/guardian/subscription ─▶ services/billing/* ─▶ Google Play / Razorpay
 └ games/engine     (pure reducers; state mirrored as JSON)
admin (Next.js)     ── /admin/v1    ──▶ routes/admin/*             (RBAC, audit log)
```

## The app (`src/`)

| Folder | What lives there |
|---|---|
| `theme/`, `ui/` | Two visual identities on one token system (`ThemeMode` = player or guardian, light/dark). The *Playful* layer (`ui/Playful.tsx`) is only used by the Player Console. See DESIGN_SYSTEM.md. |
| `context/` | `GuardianContext` (guardian session, `me`, entitlement cached only until `validUntil`), `PlayerContext` (player session, cached catalogue/progress/facts/crafts for offline reads, heartbeat loop), `GuardianRealtime` (socket for the dashboard), `ConsoleContext` (last used console), `RemoteConfigContext` (`/v1/config`: maintenance, flags, texts, server capabilities). |
| `services/apiClient.ts` | One fetch wrapper with two token slots (`as: 'guardian' | 'player'`), SecureStore-backed, 402 → `subscription_required`, network errors flagged for offline handling. |
| `realtime/client.ts` | Reconnecting WebSocket client with exponential backoff and a message bus. |
| `navigation/` | A single stack: Welcome → guardian auth → guardian tabs (Dashboard, Children, Plan, Settings) and player auth → player tabs (Home, Games, Art & Craft, Did You Know?, My Progress). The adult gate (a multiplication question) protects the switch from player to guardian. |
| `games/` | `engine.ts` (contract + seeded RNG), `registry.ts` (visual identity + lazy loaders), `defs/` (40 games), `logic/` (pure rules, unit-tested), `shared/` (GameShell = HUD/pause/restart/quit/time budget/guardian pause/completion/mirror frames; `GameMirrorView` renders any game read-only from a frame; audio and drag helpers). |
| `crafts/` | `FoldDiagram.tsx` draws one step from JSON (paper outline, fold lines, arrows, animated "after" shape); `models.ts` has the built-in origami/airplane models. |
| `billing/` | `playBilling.ts` wraps `expo-iap` (lazily required so Expo Go and the web still run); `razorpayWeb.ts` loads Razorpay Checkout on the web. |
| `legal/documents.ts` | Terms, Privacy, Deletion, Subscription & refund, Child safety as data, rendered in-app and usable on the web. |
| `i18n/` | English and Hindi UI strings. |

### Sessions and identity

- **Guardian**: opaque random bearer token (hashed at rest in `guardian_sessions`, 30-day TTL),
  obtained after password **and** OTP. Sensitive actions (change password, delete account,
  reset a PIN, revoke sessions) need a step-up OTP within the last 15 minutes.
- **Player**: separate token (`player_sessions`, 14-day TTL) obtained with Player ID + PIN.
  If the guardian enabled it, a code is sent to the guardian's phone and must be typed on the
  child's device. Player tokens cannot call guardian routes and vice versa.
- **Admin**: separate table and token; the console keeps it in an httpOnly cookie.

### Offline behaviour

The Player Console remembers `me`, the games list, crafts, facts and progress in AsyncStorage
so it opens and browses offline. Games are bundled, but a play session is created on the
server (that is where limits are enforced), so play needs connectivity; heartbeats fall back
from the socket to REST and the session is ended server-side if heartbeats stop. The cached
entitlement carries `validUntil`; past it the console asks the guardian to reconnect.

## The API (`backend/src/`)

| Folder | What lives there |
|---|---|
| `config/env.ts` | Zod-validated environment with production guards (console SMS, sandbox billing and test numbers are refused in production unless explicitly allowed). |
| `middleware/auth.ts` | `requireGuardian`, `requirePlayer`, `requireStepUp`, `requireEntitlement` (402 with `subscription_required`), `requireAdmin`, `requirePermission`. |
| `middleware/rateLimits.ts` | Per-route limits keyed by IP + identifier (login, OTP, recovery), by principal (billing, heartbeat) and general. |
| `routes/public/` | `guardian.ts` (register, login, OTP resend, recovery, profile, password, step-up, deletion with cooling-off, export), `household.ts` (children, PIN, player sessions, controls, dashboard, activity, pause/resume/end, devices), `subscription.ts` (Google verify, Razorpay create/confirm/cancel, restore, sandbox), `player.ts` (login, catalogue, favourites, sessions start/heartbeat/end, progress, crafts, facts, quiz), `webhooks.ts` (Google RTDN, Razorpay), `index.ts` (health, config, public catalogue, devices, events). |
| `routes/admin/` | guardians, subscriptions, catalogue (games, categories, crafts, sources, facts, questions, approvals), settings, notifications, insights (dashboard, analytics, audit, health), admins. |
| `services/` | `entitlementService` (state machine), `subscriptionService` (apply a verified subscription from any provider), `billing/` (googlePlay, razorpay, sandbox), `controlsService` (`decidePlay`: bedtime, play windows, daily/session limits in the child's timezone; heartbeat crediting), `catalogueService` (visibility by brackets and blocks), `progressService` (progress, achievements), `sessionService`, `settingsService`, `analyticsService`, `notificationService`. |
| `realtime/hub.ts` | Authenticated WebSocket (`/v1/ws?token=`), guardian and player roles, watch/unwatch authorization, mirror frame relay, throttled snapshots, early-message buffering, heartbeats over the socket. |
| `catalogue/` | Seeds: `games.ts` (40 games + categories + achievements), `crafts.ts` (+ generated `origamiDiagrams.ts`), `facts.ts` (+ sources), `factCategories.ts`. |
| `database/` | `schema.ts`, `drizzle/` migrations, `seedCatalogue.ts` (idempotent, runs on start), `cleanup.ts`, `rbac.ts`/`syncRbac.ts`, `seedAdmin.ts`. |

### Subscription state machine

`subscriptions` stores what the provider last said; `entitlements` is derived from it by
`recomputeEntitlement` and read by `requireEntitlement`. Statuses: `pending → active ⇄ grace /
billing_retry → expired`, `active → cancelled` (entitled until period end), `active → revoked`
(refund/chargeback: ends now), `active → paused`. Grace without a provider-supplied expiry gets
`DEFAULT_GRACE_DAYS` (3). Nothing the app sends changes an entitlement; only verified provider
data, webhooks, or an admin support action does. Details and setup in SUBSCRIPTIONS.md.

### Parental controls enforcement

`POST /v1/player/sessions/start` asks `decidePlay`: profile paused? bedtime? outside a play
window? daily minutes used up? Then it creates the session with `allowedSeconds` =
min(session limit, remaining daily minutes). Heartbeats (every 30 s) credit whole minutes to
`screen_time_records` and return `mustEnd` when the budget is spent; the shell ends the game.
A guardian's pause/resume/end is pushed over the socket and also honoured on the next
heartbeat. Blocked categories/games and allowed brackets filter the catalogue server-side, and
`GET /v1/player/games/:id` refuses blocked games.

### Live mirror

Player sockets send `{type:'mirror', sessionId, seq, state}` (the game state, throttled by the
shell). The hub checks the session belongs to the child and is running, forwards the frame to
guardians watching that child (only the child's own guardian may `watch`, and only when
`mirroringEnabled`), tells the child how many watchers there are (`mirror_status`, the
privacy indicator), and keeps the latest frame on the session row at most every 5 s so a
guardian who arrives mid-game catches up. The snapshot is cleared when the session ends;
`mirror_sessions` keeps only who watched whom and when (audit), never frames.

## Database schema (PostgreSQL)

Identity: `guardians`, `guardian_sessions`, `otp_challenges` (hashed code bound to challenge,
purpose, attempts), `children` (nickname, birth month, bracket, avatar, player id, PIN hash,
status, pause), `player_sessions`, `devices` (guardian or child, approval), `admins`,
`admin_sessions`, `roles`, `permissions`, `role_permissions`.

Money: `subscriptions`, `billing_events` (idempotent by `dedupe_key`), `entitlements`.

Catalogue: `age_brackets`, `game_categories`, `games`, `achievements`, `craft_tutorials`,
`fact_sources`, `facts`, `quiz_questions`, `content_approvals`, `app_settings`, `categories` +
`content` (image library), `notifications`.

Activity: `game_sessions` (outcome, duration, score, snapshot while running), `game_progress`
(+ `tutorial_completed_at`), `child_achievements`, `favourite_games`, `craft_progress`,
`fact_views`, `quiz_attempts`, `screen_time_records` (per child per day), `mirror_sessions`,
`parental_controls` (+ curriculum, goals, blocked subjects, rankings/shop switches, coin cap,
reduced motion), `account_deletion_requests`, `events` (coarse analytics), `audit_logs`.

Learning academy: `lessons` (nine-step JSON content, curriculum mappings with verification
status, sources, status workflow), `lesson_progress`, `learning_levels` (per child per subject).

Economy and rankings: `coin_transactions` (append-only ledger, unique idempotency key;
`children.coins` is the cached balance), `reward_items`, `child_rewards`
(+ `children.equipped_rewards`), `ranking_events` (one per session, unique), `player_ratings`.

Data minimisation: no child name beyond a nickname, no exact birth date, no photo, no free-text
chat, no location. Phone numbers are masked in every admin view.

## Security model (summary — the checklist is in SECURITY_PRIVACY.md)

- Tokens are random, hashed at rest, scoped by principal, revocable (logout, logout-all,
  deactivation, PIN reset revokes player sessions).
- Passwords and PINs use scrypt; lockouts after repeated failures; OTPs expire in 10 minutes,
  5 attempts, per-number caps and cooldowns; the API never logs codes.
- Every write is validated with Zod; errors share one shape; rate limits on every sensitive route.
- Entitlement is enforced in middleware on all content routes and re-checked by the client.
- Webhooks verify their secrets (Google RTDN URL token, Razorpay signature); purchases are
  verified with the provider before anything is granted.
- Admin actions are permission-checked per request and written to `audit_logs`.
- CORS allows only configured origins (the website); the console never exposes its token to
  the browser.
