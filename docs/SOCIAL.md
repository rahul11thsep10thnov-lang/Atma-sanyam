# Friends, social and group focus

This document is the running record of the social features: what exists in the repository,
what was decided, and what is still to come. It is updated with each pull request.

## 1. Architecture assessment (before any social work)

What the repository had:

- **Mobile app** (Expo SDK 57 / React Native 0.86 / TypeScript). Everything a person builds
  (balcony, Paradise Garden, museum, history, preferences) lives on the device in AsyncStorage.
  Optional accounts (`src/context/AuthContext.tsx`) with email + password, a bearer token in
  SecureStore, device/push registration (`src/services/device.ts`), analytics and remote config
  (`src/context/RemoteConfigContext.tsx`). No real-time layer, no sockets, no social screens.
- **Backend** (`backend/`: Express 5 + Drizzle ORM + PostgreSQL). Email/password accounts,
  opaque bearer sessions hashed at rest with sliding expiry, scrypt password hashes, express-rate-limit,
  Expo push through a `devices` table, Resend email for reset codes, an admin console with RBAC
  (`admin/`, Next.js), migrations in `backend/drizzle/`, vitest + supertest integration tests
  against a real Postgres in CI. No phone authentication, no WebSocket, no social tables.

Decision: **extend this backend** rather than add a second one. It already has sessions, rate
limiting, push delivery, migrations, tests and an admin console; the social features need the
same Postgres (friendships, sessions, notifications) and the same push pipeline. Real-time sync
will be a WebSocket server (`ws`) on the same HTTP server, authenticated with the existing bearer
token, with Postgres as the source of truth and push notifications for offline people.

## 2. Plan (phases → pull requests)

| Phase | Scope | Status |
|---|---|---|
| 1 | Phone OTP sign-in, password rule, unique username with live check, avatar field, profile privacy fields; Sign-in chip on Home | **this PR** |
| 2 | People search, friend requests (statuses, blocks), Friends tab, notification centre + bell, presence over WebSocket, pokes | next |
| 3 | Group focus: invitations with host proposal, lobby and synced start, late join, participant monitor, early-exit consequences, predefined-message chat | after 2 |
| 4 | Multi-device acceptance tests, hardening, deployment notes | with 2 and 3 |

## 3. Phase 1 — what was built

### Data model (migration `backend/drizzle/0002_phone_accounts.sql`)

`users` gains `phone` (E.164, unique), `phone_verified_at`, `username` (as typed),
`username_normalized` (lower-case, unique), `avatar_id`, `allow_pokes` (default true),
`discoverable_by_phone` (default true); `email` and `password_hash` become nullable (a check keeps
at least one identifier). `user_sessions` gains `otp_verified_at`. New table `otp_codes`
(`phone`, `code_hash`, `attempts`, `expires_at`, `used_at`). Existing email accounts are untouched
and keep signing in.

### Endpoints

See `docs/API.md` → *Accounts*: `/v1/auth/otp/request`, `/v1/auth/otp/verify`, `/v1/auth/login`
(phone or email), `/v1/usernames/availability`, `PATCH /v1/me`, `POST /v1/me/password`.

### Rules enforced on the server

- Password: 6–15 characters, a capital, a small letter, a number, a special character, no spaces
  (`backend/src/lib/passwordPolicy.ts`; mirrored in `src/auth/passwordPolicy.ts` for the form).
- Username: `^[A-Za-z](?!.*[._]{2})[A-Za-z0-9._]{1,18}[A-Za-z0-9]$`, reserved words refused,
  uniqueness by the lower-cased form through a unique index; a race between two people saving
  the same name ends with one `200` and one `409` (tested).
- One-time codes: 6 digits, SHA-256 hashed at rest, 10-minute life, 5 wrong attempts lock it,
  5 sends per number per hour, 45 s between sends, per-IP + number rate limit. Only the newest
  code for a number is valid. Codes and numbers are never logged.
- Mobile numbers: shown in full only to their owner (`/v1/me`); any other representation is
  masked (`+91 •••••••• 10`) and the future public profile carries none.
- Forgot password on a phone account = sign in with a code, then set a new password: a session
  opened by a code may set a password without the old one for 15 minutes only.
- Deactivated accounts cannot sign in by code or password.

### SMS providers

`backend/src/lib/sms.ts`: MSG91 (India, DLT OTP template) and Twilio over their HTTP APIs, a
console sender for development, and `OTP_TEST_NUMBERS` for app-store review. Selected by
environment variables only (`backend/.env.example`); nothing is hard-coded. **Live SMS delivery
has not been verified**: it needs a provider account. The flow was verified end to end with the
console sender (code read from the API log).

### App

- `src/components/home/SignInChip.tsx`: small peach chip, condensed face, top right of Home;
  "Sign in" → the sign-in screen; signed in → avatar + `@username` (or "Finish set-up").
- `src/screens/AuthScreen.tsx`: number → code → (first time) password with a live rule checklist
  → username with a debounced availability check (green tick / red reasons, server re-check on
  save) → avatar (skipped while the gallery is empty). "Sign in with a password instead",
  "Forgot password?", resend countdown. The same screen edits the profile (username, name,
  avatar, *Allow pokes*, *Findable by mobile number*) and changes the password from Settings.
- `src/profile/avatars.ts` + `src/ui/Avatar.tsx`: the avatar gallery registry (empty until the
  supplied collection in `assets/avatars/` is approved) and the avatar with an initial fallback.
- Settings → Account: avatar, username, number, *Edit profile*, *Change password*, delete.

### Tests

`backend/tests/phoneAuth.test.ts` (17 tests): normalisation and masking, code sent and never
returned, wrong/locked codes, send cap and cooldown, provider failure, test numbers, the password
rule (7 rejected shapes), username availability reasons, case-insensitive uniqueness, the race,
phone + password sign-in with generic errors, password change rules, forgot-password window,
account deletion, and the no-provider case. Whole backend suite: 80 tests against Postgres.

### Limitations (phase 1)

- No real device received an SMS from this repository; configure a provider and test on two
  phones before launch.
- The avatar gallery is empty pending approval of the supplied collection.
- Rate limits are in-memory (one API instance); use a shared store when scaling out.
