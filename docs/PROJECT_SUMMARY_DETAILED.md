# LoJi — Detailed Project Summary (for analysis)

Branch: `claude/loji-platform-build-rqawk2`. Every table, list and count in this file was extracted
from the source code by script (database schema, seed catalogues, route files, settings, tests),
not written from memory. No secrets or passwords are included. Section 1–3 explain the product,
sections 4–14 are the reference detail.

## Contents

1. Product overview
2. Architecture and runtime
3. How the main flows work
4. Accounts, sessions and security
5. Database (49 tables)
6. API endpoints
7. Real-time (WebSocket)
8. Games (40)
9. Tutorials, rankings and coins
10. Learning academy (50 lessons)
11. Did You Know facts, sources and crafts
12. Admin console, roles and settings
13. App structure (screens, navigation, UI kit)
14. Configuration reference
15. Tests and quality
16. Known limitations and next steps

## 1. Product overview

LoJi is a children's platform (ages 3–12) with three user types and one shared backend.

| User | Signs in with | Can do |
|---|---|---|
| Player (child) | Player ID + PIN, optionally a code sent to the guardian's phone | Play 40 games, tutorials, lessons (Study / Music / Sports), Did You Know facts, paper crafts, earn coins, buy cosmetic rewards, appear on pseudonymous leaderboards |
| Guardian (parent) | Phone + password + OTP | Subscribe (mandatory), add children, set time limits and content/subject blocks, set curriculum and learning goals, switch rankings and shop on/off, watch a live mirror of a child's game, see learning and rewards reports |
| Admin | Email + password (separate account table) | Manage games, categories, facts, sources, lessons, crafts, reward items, subscriptions, notifications, settings and feature flags; view analytics and audit logs |

Product rules that shape the code:

- A subscription is mandatory. Subscribers see no ads. A flag (`adSupportedAccess`, off by default) can later let non-subscribers in with ads.
- Ranking results and coin awards are decided on the server, never trusted from the client.
- Children appear on leaderboards only by display name and avatar; a guardian can remove a child from rankings.
- Coins buy cosmetic items only. There are no loot boxes and no real-money purchases by children.
- Lessons use the label "Aligned with the selected curriculum topic" only after a human verifies the mapping. No board endorsement is claimed.
- Every Did You Know fact needs a source. Every lesson has one (50 of 50).

## 2. Architecture and runtime

```
Expo app (React Native 0.86, React 19, Expo SDK 57) — web, Android, iOS
   ├─ REST  /v1/guardian/*  /v1/player/*  /v1/config  /v1/events  /v1/devices
   └─ WebSocket /v1/ws  (child status, live game mirror, session control)
                │
                ▼
Express 5 API (TypeScript, zod validation, Drizzle ORM, helmet, rate limits)
   ├─ /v1/*        public API (guardian, player, subscription, webhooks)
   ├─ /admin/v1/*  admin API (role permissions + audit log)
   └─ background   source-registry maintenance, fact ingestion (switchable)
                │
                ▼
PostgreSQL 16 — 49 tables, migrations 0000–0008

Next.js 16 admin console  ──►  /admin/v1/*
```

| Part | Folder | Command | Default address |
|---|---|---|---|
| API + DB tools | backend/ | npm run dev | http://localhost:4000 |
| Admin console | admin/ | npm run dev | http://localhost:3000 |
| App (web) | repo root | npm run web | http://localhost:8081 |
| App (phone) | repo root | npm start (Expo Go) or EAS dev build | scan QR |

Size (files / lines): app `src/` 178 / ~20,300; API `backend/src/` 89 / ~15,300; admin `admin/src/` 46 / ~4,000; API tests 13 / ~2,700; root tests 2 / ~430.

Key libraries — app: expo ~57, react-native 0.86.3, React Navigation 7, expo-audio, expo-iap (Google Play billing), expo-notifications, expo-secure-store, react-native-google-mobile-ads, lucide-react-native. API: express 5, drizzle-orm, pg, zod 4, helmet, express-rate-limit, ws; tests vitest + supertest. Admin: next 16.

## 3. How the main flows work

**Guardian registration and login.** Register: phone + password → `register/start` sends an OTP → `register/verify` creates the account and a 30-day session. Login: password then OTP (`login` → `login/verify`). Passwords must meet the on-screen rule (6–15 characters with capital, small letter, number and special character). 5 wrong passwords lock the account for 15 minutes. OTP: 10-minute life, 5 attempts, resend cooldown, hourly cap per phone. Sensitive actions (change password, delete account, reset a PIN) need a step-up OTP within 15 minutes.

**Player login.** Child enters Player ID + PIN. 5 wrong PINs lock the child for 15 minutes. If the guardian turned on "player OTP", a code goes to the guardian's phone and the child types it. If "new device approval" is on, an unknown phone is blocked until the guardian approves it.

**Entitlement (subscription gate).** Player endpoints sit behind an entitlement check. Access is `subscriber`, `ad_supported` (only if the flag is on) or `locked` (HTTP 402). Subscriptions come from Google Play (server-verified, real-time notifications) or Razorpay on the web; a sandbox mode simulates billing locally.

**A game session.** App calls `sessions/start` (server checks time budget, schedule, blocks). While playing, the app sends heartbeats; the server credits screen time and returns remaining time. `sessions/end` stores the outcome, progress and achievements, then awards coins (key `session:<id>:complete`), records the ranking result (once per session) and completes the daily challenge if it matches.

**Coins.** Every change is one row in `coin_transactions` plus the same update on `children.coins`, in one transaction. An idempotency key makes retries harmless. A daily cap (global setting, lowered by the guardian) limits earning. Purchases are validated on the server (price, ownership, premium-only, shop on/off).

**Rankings.** Only games with a scoring rule take part (19). The server checks session length and score range, then writes one `ranking_events` row per session. Chess also updates an Elo-style rating against the computer level. Leaderboards filter by week / month / all time and age bracket and exclude children whose guardian switched rankings off.

**Learning lessons.** Lessons are JSON step lists. The app's lesson engine renders each step (44 visual kinds, 12 activity kinds). Progress is saved per step; the first completion pays coins, updates the child's level in that subject and may award a badge. Availability is honest: a subject with no lesson for an age says "coming soon" or "available at other ages".

**Ads.** Server config (`/v1/config`) tells the app whether ads are on, targets (first ad ~15 s, between games ~25 s), caps (minimum gap, per hour, per day) and unit ids. The app's ad manager only shows a child-directed interstitial between games, never during play, and records diagnostics. Subscribers are ad-free.

**Live mirroring.** The player app sends compact game-state frames over WebSocket; a guardian watching that child receives them and `GameMirrorView` redraws the game read-only. The guardian can pause, resume or end the child's session. A per-child switch turns mirroring off.

## 4. Accounts, sessions and security

| Control | Value / behaviour |
|---|---|
| Tokens | Random opaque bearer tokens, stored hashed. Guardian 30 days, player and admin TTLs configurable |
| Guardian login lock | 5 failures → 15 min |
| Player PIN lock | 5 failures → 15 min |
| OTP | 10 min life, 5 attempts, resend cooldown, per-phone hourly send cap |
| Step-up window | 15 minutes |
| Rate limits (per window) | general 300/min · login 10/15 min · playerLogin 10/15 min · register 10/h · otp 20/h · otpVerify 30/15 min · recovery 10/h · billing 10/min · webhook 120/min · heartbeat 120/min · events 60/min |
| HTTP hardening | helmet, CORS allow-list (`CORS_ORIGINS`), zod validation on every body, uniform error shape `{error:{code,message}}` |
| Account deletion | Request + cooling-off period (`DELETION_COOLING_OFF_DAYS`), then removal of the guardian and children |
| Data retention | events and screen-time records are purged after configurable days |
| SSRF protection | Source fetching goes through a safe fetcher that blocks private networks |
| Audit | Admin actions are written to `audit_logs` |

## 5. Database (49 tables)

Format: `column:type`, `!` = not null. Foreign keys listed after each table.

### `account_deletion_requests`

`id:uuid! PK`, `guardian_id:uuid!`, `child_id:uuid`, `scope:text!`, `reason:text`, `created_at:timestamp with time zone!`, `scheduled_for:timestamp with time zone!`, `completed_at:timestamp with time zone`, `cancelled_at:timestamp with time zone`

Foreign keys: guardian_id→guardians; child_id→children

### `achievements`

`key:text! PK`, `name:text!`, `description:text!`, `icon:text!`, `rule:jsonb!`, `brackets:text[]!`, `sort_order:integer!`

### `admin_sessions`

`id:uuid! PK`, `admin_id:uuid!`, `token_hash:text!`, `created_at:timestamp with time zone!`, `last_used_at:timestamp with time zone!`, `expires_at:timestamp with time zone!`

Foreign keys: admin_id→admins

### `admins`

`id:uuid! PK`, `email:text!`, `name:text!`, `password_hash:text!`, `role_key:text!`, `status:text!`, `failed_login_count:integer!`, `locked_until:timestamp with time zone`, `last_login_at:timestamp with time zone`, `created_at:timestamp with time zone!`, `updated_at:timestamp with time zone!`

Foreign keys: role_key→roles

### `age_brackets`

`key:text! PK`, `name:text!`, `min_age:integer!`, `max_age:integer!`, `description:text!`, `sort_order:integer!`

### `app_settings`

`key:text! PK`, `value:jsonb!`, `updated_at:timestamp with time zone!`, `updated_by:uuid`

Foreign keys: updated_by→admins

### `audit_logs`

`id:bigserial! PK`, `admin_id:uuid`, `action:text!`, `entity_type:text!`, `entity_id:text`, `details:jsonb`, `created_at:timestamp with time zone!`

Foreign keys: admin_id→admins

### `billing_events`

`id:uuid! PK`, `subscription_id:uuid`, `guardian_id:uuid`, `provider:text!`, `type:text!`, `dedupe_key:text!`, `payload:jsonb`, `created_at:timestamp with time zone!`

Foreign keys: subscription_id→subscriptions; guardian_id→guardians

### `categories`

`id:text! PK`, `name:text!`, `parent_id:text`, `sort_order:integer!`, `created_at:timestamp with time zone!`, `updated_at:timestamp with time zone!`

Foreign keys: parent_id→categories

### `child_achievements`

`child_id:uuid!`, `achievement_key:text!`, `created_at:timestamp with time zone!`

Foreign keys: child_id→children; achievement_key→achievements

### `child_rewards`

`child_id:uuid!`, `item_key:text!`, `created_at:timestamp with time zone!`

Foreign keys: child_id→children; item_key→reward_items

### `children`

`id:uuid! PK`, `guardian_id:uuid!`, `display_name:text!`, `avatar_id:text!`, `birth_month:text!`, `age_bracket:text!`, `bracket_override:text`, `player_id:text!`, `pin_hash:text!`, `pin_failed_count:integer!`, `pin_locked_until:timestamp with time zone`, `player_otp_required:boolean!`, `status:text!`, `last_active_at:timestamp with time zone`, `coins:integer!`, `equipped_rewards:jsonb!`, `created_at:timestamp with time zone!`, `updated_at:timestamp with time zone!`

Foreign keys: guardian_id→guardians

### `coin_transactions`

`id:bigserial! PK`, `child_id:uuid!`, `amount:integer!`, `balance_after:integer!`, `reason:text!`, `ref_type:text`, `ref_id:text`, `idempotency_key:text!`, `note:text`, `created_at:timestamp with time zone!`

Foreign keys: child_id→children

### `content`

`id:uuid! PK`, `title:text!`, `category_id:text`, `subcategory_id:text`, `tags:text[]!`, `thumbnail_url:text!`, `medium_url:text!`, `full_url:text!`, `source:text!`, `creator:text!`, `license:text!`, `attribution_required:boolean!`, `attribution_text:text`, `status:text!`, `popularity:integer!`, `published_at:timestamp with time zone`, `created_by:uuid`, `updated_by:uuid`, `created_at:timestamp with time zone!`, `updated_at:timestamp with time zone!`

Foreign keys: category_id→categories; subcategory_id→categories; created_by→admins; updated_by→admins

### `content_approvals`

`id:uuid! PK`, `entity_type:text!`, `entity_id:text!`, `status:text!`, `reviewer_id:uuid`, `note:text`, `created_at:timestamp with time zone!`

Foreign keys: reviewer_id→admins

### `craft_progress`

`child_id:uuid!`, `tutorial_id:text!`, `steps_done:integer!`, `checklist_done:jsonb!`, `completed_at:timestamp with time zone`, `updated_at:timestamp with time zone!`

Foreign keys: child_id→children; tutorial_id→craft_tutorials

### `craft_tutorials`

`id:text! PK`, `title:text!`, `kind:text!`, `description:text!`, `brackets:text[]!`, `difficulty:integer!`, `estimated_minutes:integer!`, `materials:jsonb!`, `hazards:text[]!`, `adult_supervision:boolean!`, `physical:boolean!`, `steps:jsonb!`, `final_preview:jsonb`, `checklist:jsonb!`, `status:text!`, `sort_order:integer!`, `translations:jsonb!`, `updated_by:uuid`, `created_at:timestamp with time zone!`, `updated_at:timestamp with time zone!`

Foreign keys: updated_by→admins

### `devices`

`id:uuid! PK`, `install_id:text!`, `guardian_id:uuid`, `child_id:uuid`, `label:text`, `approved_at:timestamp with time zone`, `platform:text!`, `app_version:text`, `push_token:text`, `push_enabled:boolean!`, `created_at:timestamp with time zone!`, `last_seen_at:timestamp with time zone!`

Foreign keys: guardian_id→guardians; child_id→children

### `entitlements`

`guardian_id:uuid! PK`, `active:boolean!`, `subscription_id:uuid`, `status:text!`, `valid_until:timestamp with time zone`, `updated_at:timestamp with time zone!`

Foreign keys: guardian_id→guardians; subscription_id→subscriptions

### `events`

`id:bigserial! PK`, `name:text!`, `install_id:text!`, `guardian_id:uuid`, `platform:text`, `app_version:text`, `screen:text`, `content_id:text`, `properties:jsonb`, `occurred_at:timestamp with time zone!`, `received_at:timestamp with time zone!`

Foreign keys: guardian_id→guardians

### `fact_sources`

`id:uuid! PK`, `title:text!`, `publisher:text!`, `url:text!`, `accessed_on:text`, `notes:text`, `created_at:timestamp with time zone!`, `updated_at:timestamp with time zone!`, `source_key:text`, `canonical_url:text`, `origin:text!`, `connector:text`, `attribution_template:text`, `licence_name:text`, `licence_url:text`, `licence_verified:boolean!`, `commercial_use_allowed:boolean`, `redistribution_allowed:boolean`, `attribution_required:boolean`, `share_alike_required:boolean`, `api_key_required:boolean`, `rate_limit_notes:text`, `content_types_allowed:text[]!`, `verification_status:text!`, `verification_evidence_url:text`, `last_verified_at:timestamp with time zone`, `last_checked_at:timestamp with time zone`, `last_check_error:text`, `consecutive_failures:integer!`, `evidence_hash:text`, `evidence_changed_at:timestamp with time zone`, `ingestion_suspended:boolean!`, `suspension_reason:text`, `admin_edited:boolean!`, `status_locked:boolean!`

### `fact_views`

`child_id:uuid!`, `fact_id:uuid!`, `favourite:boolean!`, `viewed_at:timestamp with time zone!`

Foreign keys: child_id→children; fact_id→facts

### `facts`

`id:uuid! PK`, `slug:text!`, `category:text!`, `headline:text!`, `body:text!`, `why_text:text!`, `follow_up_question:text!`, `brackets:text[]!`, `reading_level:integer!`, `illustration:text!`, `image_content_id:uuid`, `audio_url:text`, `source_id:uuid`, `status:text!`, `verified_by:uuid`, `verified_at:timestamp with time zone`, `published_at:timestamp with time zone`, `translations:jsonb!`, `updated_by:uuid`, `created_at:timestamp with time zone!`, `updated_at:timestamp with time zone!`, `ingestion_kind:text!`, `language:text!`, `minimum_age:integer`, `maximum_age:integer`, `source_url:text`, `supporting_reference:text`, `licence_name:text`, `attribution_text:text`, `claim_check:text`, `reviewed_at:timestamp with time zone`, `content_hash:text`

Foreign keys: image_content_id→content; source_id→fact_sources; verified_by→admins; updated_by→admins

### `favourite_games`

`child_id:uuid!`, `game_id:text!`, `created_at:timestamp with time zone!`

Foreign keys: child_id→children; game_id→games

### `game_categories`

`id:text! PK`, `name:text!`, `icon:text!`, `color:text!`, `sort_order:integer!`

### `game_progress`

`child_id:uuid!`, `game_id:text!`, `plays:integer!`, `completions:integer!`, `best_score:integer`, `best_time_seconds:integer`, `highest_difficulty:text`, `stars:integer!`, `data:jsonb!`, `version:integer!`, `last_played_at:timestamp with time zone`, `tutorial_completed_at:timestamp with time zone`, `updated_at:timestamp with time zone!`

Foreign keys: child_id→children; game_id→games

### `game_sessions`

`id:uuid! PK`, `child_id:uuid!`, `game_id:text!`, `client_session_id:text!`, `device_id:uuid`, `difficulty:text!`, `started_at:timestamp with time zone!`, `last_heartbeat_at:timestamp with time zone!`, `ended_at:timestamp with time zone`, `outcome:text!`, `score:integer`, `duration_seconds:integer!`, `snapshot:jsonb`, `snapshot_seq:integer!`, `snapshot_at:timestamp with time zone`, `paused_by_guardian_at:timestamp with time zone`

Foreign keys: child_id→children; game_id→games; device_id→devices

### `games`

`id:text! PK`, `name:text!`, `tagline:text!`, `description:text!`, `instructions:text!`, `category_id:text`, `brackets:text[]!`, `difficulties:jsonb!`, `skills:text[]!`, `content_rating:text!`, `estimated_minutes:integer!`, `offline_capable:boolean!`, `accessibility:jsonb!`, `asset_license:text!`, `status:text!`, `sort_order:integer!`, `translations:jsonb!`, `updated_by:uuid`, `created_at:timestamp with time zone!`, `updated_at:timestamp with time zone!`

Foreign keys: category_id→game_categories; updated_by→admins

### `guardian_sessions`

`id:uuid! PK`, `guardian_id:uuid!`, `token_hash:text!`, `device_id:uuid`, `created_at:timestamp with time zone!`, `last_used_at:timestamp with time zone!`, `expires_at:timestamp with time zone!`, `step_up_at:timestamp with time zone`, `revoked_at:timestamp with time zone`

Foreign keys: guardian_id→guardians; device_id→devices

### `guardians`

`id:uuid! PK`, `phone:text!`, `phone_verified_at:timestamp with time zone!`, `password_hash:text!`, `name:text!`, `email:text`, `terms_version:text!`, `terms_accepted_at:timestamp with time zone!`, `privacy_accepted_at:timestamp with time zone!`, `status:text!`, `failed_login_count:integer!`, `locked_until:timestamp with time zone`, `last_seen_at:timestamp with time zone`, `created_at:timestamp with time zone!`, `updated_at:timestamp with time zone!`

### `learning_levels`

`child_id:uuid!`, `subject:text!`, `section:text!`, `level:integer!`, `lessons_completed:integer!`, `updated_at:timestamp with time zone!`

Foreign keys: child_id→children

### `lesson_progress`

`child_id:uuid!`, `lesson_id:text!`, `steps_done:integer!`, `steps_total:integer!`, `activities_correct:integer!`, `activities_total:integer!`, `best_quiz_score:integer`, `quiz_total:integer`, `time_seconds:integer!`, `selected_age:integer`, `started_at:timestamp with time zone!`, `completed_at:timestamp with time zone`, `last_step_at:timestamp with time zone!`, `updated_at:timestamp with time zone!`

Foreign keys: child_id→children; lesson_id→lessons

### `lessons`

`id:text! PK`, `section:text!`, `subject:text!`, `topic:text!`, `subtopic:text!`, `title:text!`, `summary:text!`, `recommended_age:integer!`, `min_age:integer!`, `max_age:integer!`, `difficulty:text!`, `level:integer!`, `learning_objective:text!`, `prerequisites:text[]!`, `steps:jsonb!`, `estimated_minutes:integer!`, `curriculum:jsonb!`, `sources:jsonb!`, `safety_notes:text[]!`, `adult_assisted:boolean!`, `status:text!`, `reviewed_by:uuid`, `reviewed_at:timestamp with time zone`, `published_at:timestamp with time zone`, `sort_order:integer!`, `translations:jsonb!`, `origin:text!`, `admin_edited:boolean!`, `updated_by:uuid`, `created_at:timestamp with time zone!`, `updated_at:timestamp with time zone!`

Foreign keys: reviewed_by→admins; updated_by→admins

### `mirror_sessions`

`id:uuid! PK`, `child_id:uuid!`, `guardian_id:uuid!`, `game_session_id:uuid`, `created_at:timestamp with time zone!`, `last_frame_at:timestamp with time zone`, `ended_at:timestamp with time zone`

Foreign keys: child_id→children; guardian_id→guardians; game_session_id→game_sessions

### `notifications`

`id:uuid! PK`, `title:text!`, `body:text!`, `data:jsonb`, `target:jsonb!`, `status:text!`, `recipient_count:integer!`, `success_count:integer!`, `failure_count:integer!`, `error:text`, `created_by:uuid`, `created_at:timestamp with time zone!`, `sent_at:timestamp with time zone`

Foreign keys: created_by→admins

### `otp_challenges`

`id:uuid! PK`, `purpose:text!`, `phone:text!`, `guardian_id:uuid`, `child_id:uuid`, `code_hash:text!`, `attempts:integer!`, `context:jsonb`, `expires_at:timestamp with time zone!`, `used_at:timestamp with time zone`, `created_at:timestamp with time zone!`

Foreign keys: guardian_id→guardians; child_id→children

### `parental_controls`

`child_id:uuid! PK`, `daily_limit_minutes:integer!`, `session_limit_minutes:integer!`, `play_windows:jsonb!`, `bedtime_start:text`, `bedtime_end:text`, `timezone:text!`, `blocked_categories:text[]!`, `blocked_games:text[]!`, `allowed_brackets:text[]!`, `sound_enabled:boolean!`, `narration_enabled:boolean!`, `favourites_enabled:boolean!`, `mirroring_enabled:boolean!`, `new_device_approval:boolean!`, `curriculum_framework:text`, `curriculum_board:text`, `school_grade:text`, `learning_goals:jsonb!`, `blocked_subjects:text[]!`, `rankings_enabled:boolean!`, `reward_shop_enabled:boolean!`, `coin_daily_cap:integer`, `reduced_motion:boolean!`, `updated_at:timestamp with time zone!`

Foreign keys: child_id→children

### `permissions`

`key:text! PK`, `description:text!`

### `player_ratings`

`child_id:uuid!`, `game_id:text!`, `rating:integer!`, `points:integer!`, `played:integer!`, `wins:integer!`, `updated_at:timestamp with time zone!`

Foreign keys: child_id→children; game_id→games

### `player_sessions`

`id:uuid! PK`, `child_id:uuid!`, `token_hash:text!`, `device_id:uuid`, `created_at:timestamp with time zone!`, `last_used_at:timestamp with time zone!`, `expires_at:timestamp with time zone!`, `revoked_at:timestamp with time zone`

Foreign keys: child_id→children; device_id→devices

### `quiz_attempts`

`id:uuid! PK`, `child_id:uuid!`, `fact_id:uuid!`, `question_id:uuid!`, `chosen_index:integer!`, `correct:boolean!`, `created_at:timestamp with time zone!`

Foreign keys: child_id→children; fact_id→facts; question_id→quiz_questions

### `quiz_questions`

`id:uuid! PK`, `fact_id:uuid!`, `question:text!`, `options:jsonb!`, `correct_index:integer!`, `explanation:text!`, `sort_order:integer!`

Foreign keys: fact_id→facts

### `ranking_events`

`id:bigserial! PK`, `child_id:uuid!`, `game_id:text!`, `session_id:uuid!`, `bracket:text!`, `points:integer!`, `won:boolean!`, `score:integer`, `rating_delta:integer!`, `created_at:timestamp with time zone!`

Foreign keys: child_id→children; game_id→games; session_id→game_sessions

### `reward_items`

`key:text! PK`, `name:text!`, `description:text!`, `kind:text!`, `emoji:text!`, `color:text!`, `visual:jsonb!`, `price:integer!`, `premium_only:boolean!`, `status:text!`, `sort_order:integer!`, `created_at:timestamp with time zone!`

### `role_permissions`

`role_key:text!`, `permission_key:text!`

Foreign keys: role_key→roles; permission_key→permissions

### `roles`

`key:text! PK`, `name:text!`, `description:text!`

### `screen_time_records`

`child_id:uuid!`, `day:text!`, `minutes:integer!`, `sessions:integer!`, `updated_at:timestamp with time zone!`

Foreign keys: child_id→children

### `source_verification_events`

`id:bigserial! PK`, `source_id:uuid!`, `at:timestamp with time zone!`, `trigger:text!`, `outcome:text!`, `from_status:text`, `to_status:text`, `detail:text`

Foreign keys: source_id→fact_sources

### `subscriptions`

`id:uuid! PK`, `guardian_id:uuid!`, `provider:text!`, `provider_ref:text!`, `product_id:text!`, `status:text!`, `auto_renewing:boolean!`, `current_period_start:timestamp with time zone`, `current_period_end:timestamp with time zone`, `cancelled_at:timestamp with time zone`, `revoked_at:timestamp with time zone`, `price_amount:integer`, `price_currency:text`, `provider_state:jsonb`, `last_verified_at:timestamp with time zone`, `created_at:timestamp with time zone!`, `updated_at:timestamp with time zone!`

Foreign keys: guardian_id→guardians

Migrations: 0000_init, 0001_password_reset_codes, 0002_phone_accounts, 0003_social, 0004_group_focus, 0005_drop_tame, 0006_loji, 0007_source_registry, 0008_learning_rewards_rankings.

## 6. API endpoints (181 route definitions)

### Guardian accounts (17)

| Method | Path | Access / limits |
|---|---|---|
| POST | `/v1/guardian/register/start` | limit: register,otp |
| POST | `/v1/guardian/register/verify` | limit: otpVerify |
| POST | `/v1/guardian/login` | limit: login |
| POST | `/v1/guardian/login/verify` | limit: otpVerify |
| POST | `/v1/guardian/otp/resend` | limit: otp |
| POST | `/v1/guardian/recovery/start` | limit: recovery |
| POST | `/v1/guardian/recovery/verify` | limit: otpVerify |
| GET | `/v1/guardian/me` |  |
| PATCH | `/v1/guardian/me` |  |
| POST | `/v1/guardian/logout` |  |
| POST | `/v1/guardian/logout-all` | stepup |
| POST | `/v1/guardian/step-up/start` | limit: otp |
| POST | `/v1/guardian/step-up/verify` | limit: otpVerify |
| POST | `/v1/guardian/password` | stepup |
| DELETE | `/v1/guardian/me` | stepup |
| POST | `/v1/guardian/me/deletion/cancel` |  |
| GET | `/v1/guardian/me/export` | stepup |

### Guardian household (children, controls, reports) (22)

| Method | Path | Access / limits |
|---|---|---|
| GET | `/v1/guardian/children` |  |
| POST | `/v1/guardian/children` | entitlement |
| GET | `/v1/guardian/children/:id` |  |
| PATCH | `/v1/guardian/children/:id` | entitlement |
| POST | `/v1/guardian/children/:id/pin` | stepup |
| POST | `/v1/guardian/children/:id/revoke-sessions` |  |
| POST | `/v1/guardian/children/:id/player-session` | entitlement |
| DELETE | `/v1/guardian/children/:id` | stepup |
| POST | `/v1/guardian/children/:id/restore` |  |
| GET | `/v1/guardian/children/:id/export` | stepup |
| GET | `/v1/guardian/children/:id/controls` |  |
| PUT | `/v1/guardian/children/:id/controls` | entitlement |
| GET | `/v1/guardian/dashboard` |  |
| GET | `/v1/guardian/children/:id/learning` |  |
| GET | `/v1/guardian/children/:id/rewards` |  |
| GET | `/v1/guardian/children/:id/activity` |  |
| POST | `/v1/guardian/children/:id/session/pause` |  |
| POST | `/v1/guardian/children/:id/session/resume` |  |
| POST | `/v1/guardian/children/:id/session/end` |  |
| GET | `/v1/guardian/devices` |  |
| POST | `/v1/guardian/devices/:id/approve` |  |
| DELETE | `/v1/guardian/devices/:id` |  |

### Public / shared (13)

| Method | Path | Access / limits |
|---|---|---|
| GET | `/v1/health` |  |
| GET | `/v1/config` |  |
| GET | `/v1/catalogue/brackets` |  |
| GET | `/v1/catalogue/game-categories` |  |
| GET | `/v1/categories` |  |
| GET | `/v1/images` |  |
| GET | `/v1/images/:id` |  |
| GET | `/v1/catalogue/fact-categories` |  |
| GET | `/v1/catalogue/learning` |  |
| GET | `/v1/catalogue/scoring-rules` |  |
| POST | `/v1/devices` |  |
| POST | `/v1/events` | limit: events |
| GET | `/v1/ws/info` | guardian; guardianorplayer |

### Player (39)

| Method | Path | Access / limits |
|---|---|---|
| POST | `/v1/player/login` | limit: playerLogin |
| POST | `/v1/player/login/verify` | limit: otpVerify |
| GET | `/v1/player/me` |  |
| POST | `/v1/player/logout` |  |
| GET | `/v1/player/games` |  |
| GET | `/v1/player/games/:id` |  |
| PUT | `/v1/player/games/:id/favourite` |  |
| DELETE | `/v1/player/games/:id/favourite` |  |
| POST | `/v1/player/sessions/start` |  |
| POST | `/v1/player/sessions/:id/heartbeat` | limit: heartbeat |
| POST | `/v1/player/sessions/:id/end` |  |
| POST | `/v1/player/games/:id/tutorial-complete` |  |
| GET | `/v1/player/daily-challenge` |  |
| GET | `/v1/player/coins` |  |
| POST | `/v1/player/coins/purchase` |  |
| PUT | `/v1/player/rewards/equip` |  |
| GET | `/v1/player/rankings` |  |
| GET | `/v1/player/rankings/:gameId` |  |
| GET | `/v1/player/learning/catalogue` |  |
| GET | `/v1/player/learning/lessons` |  |
| GET | `/v1/player/learning/report` |  |
| GET | `/v1/player/learning/lessons/:id` |  |
| PUT | `/v1/player/learning/lessons/:id/progress` |  |
| GET | `/v1/player/progress` |  |
| PUT | `/v1/player/progress/:gameId` |  |
| GET | `/v1/player/crafts` |  |
| GET | `/v1/player/crafts/:id` |  |
| PUT | `/v1/player/crafts/:id/progress` |  |
| GET | `/v1/player/facts/categories` |  |
| GET | `/v1/player/facts` |  |
| GET | `/v1/player/facts/daily` |  |
| GET | `/v1/player/facts/random` |  |
| GET | `/v1/player/facts/history` |  |
| GET | `/v1/player/facts/:id` |  |
| POST | `/v1/player/facts/:id/view` |  |
| PUT | `/v1/player/facts/:id/favourite` |  |
| POST | `/v1/player/quiz/answer` |  |
| GET | `/v1/player/quiz/history` |  |
| GET | `/v1/player/controls` |  |

### Guardian subscription (8)

| Method | Path | Access / limits |
|---|---|---|
| GET | `/v1/guardian/subscription` |  |
| POST | `/v1/guardian/subscription/google/verify` | limit: billing |
| POST | `/v1/guardian/subscription/razorpay/create` | limit: billing |
| POST | `/v1/guardian/subscription/razorpay/confirm` | limit: billing |
| POST | `/v1/guardian/subscription/razorpay/cancel` | limit: billing |
| POST | `/v1/guardian/subscription/restore` | limit: billing |
| POST | `/v1/guardian/subscription/sandbox/activate` | limit: billing |
| POST | `/v1/guardian/subscription/sandbox/transition` | limit: billing |

### Webhooks (2)

| Method | Path | Access / limits |
|---|---|---|
| POST | `/v1/webhooks/google-play` | limit: webhook |
| POST | `/v1/webhooks/razorpay` | limit: webhook |

### Admin users and roles (5)

| Method | Path | Access / limits |
|---|---|---|
| GET | `/admin/v1/roles` | perm: admins:read |
| GET | `/admin/v1/admins` | perm: admins:read |
| POST | `/admin/v1/admins` | perm: admins:write |
| PATCH | `/admin/v1/admins/:id` | perm: admins:write |
| DELETE | `/admin/v1/admins/:id` | perm: admins:write |

### Admin auth (4)

| Method | Path | Access / limits |
|---|---|---|
| POST | `/admin/v1/auth/login` | limit: login |
| POST | `/admin/v1/auth/logout` |  |
| GET | `/admin/v1/auth/me` |  |
| POST | `/admin/v1/auth/change-password` |  |

### Admin catalogue (games, categories, approvals) (21)

| Method | Path | Access / limits |
|---|---|---|
| GET | `/admin/v1/games` | perm: content:read |
| GET | `/admin/v1/games/:id` | perm: content:read |
| POST | `/admin/v1/games` | perm: content:write |
| PATCH | `/admin/v1/games/:id` | perm: content:write |
| GET | `/admin/v1/game-categories` | perm: content:read |
| POST | `/admin/v1/game-categories` | perm: content:write |
| GET | `/admin/v1/crafts` | perm: content:read |
| GET | `/admin/v1/crafts/:id` | perm: content:read |
| POST | `/admin/v1/crafts` | perm: content:write |
| PATCH | `/admin/v1/crafts/:id` | perm: content:write |
| DELETE | `/admin/v1/crafts/:id` | perm: content:delete |
| GET | `/admin/v1/facts` | perm: content:read |
| GET | `/admin/v1/facts/:id` | perm: content:read |
| POST | `/admin/v1/facts` | perm: content:write |
| PATCH | `/admin/v1/facts/:id` | perm: content:write |
| POST | `/admin/v1/facts/:id/status` | perm: content:read |
| DELETE | `/admin/v1/facts/:id` | perm: content:delete |
| POST | `/admin/v1/facts/:id/questions` | perm: content:write |
| PATCH | `/admin/v1/questions/:id` | perm: content:write |
| DELETE | `/admin/v1/questions/:id` | perm: content:write |
| GET | `/admin/v1/approvals` | perm: content:read |

### Admin content (facts, crafts, images) (9)

| Method | Path | Access / limits |
|---|---|---|
| GET | `/admin/v1/content` | perm: content:read |
| GET | `/admin/v1/content/:id` | perm: content:read |
| POST | `/admin/v1/content` | perm: content:write |
| PATCH | `/admin/v1/content/:id` | perm: content:write |
| DELETE | `/admin/v1/content/:id` | perm: content:delete |
| GET | `/admin/v1/categories` | perm: content:read |
| POST | `/admin/v1/categories` | perm: content:write |
| PATCH | `/admin/v1/categories/:id` | perm: content:write |
| DELETE | `/admin/v1/categories/:id` | perm: content:delete |

### Admin guardians (4)

| Method | Path | Access / limits |
|---|---|---|
| GET | `/admin/v1/guardians` | perm: guardians:read |
| GET | `/admin/v1/guardians/:id` | perm: guardians:read |
| PATCH | `/admin/v1/guardians/:id` | perm: guardians:write |
| DELETE | `/admin/v1/guardians/:id` | perm: guardians:delete |

### Admin analytics and health (4)

| Method | Path | Access / limits |
|---|---|---|
| GET | `/admin/v1/health` | perm: dashboard:read |
| GET | `/admin/v1/dashboard` | perm: dashboard:read |
| GET | `/admin/v1/analytics` | perm: analytics:read |
| GET | `/admin/v1/audit-log` | perm: audit:read |

### Admin lessons, rewards, rankings (12)

| Method | Path | Access / limits |
|---|---|---|
| GET | `/admin/v1/learning/overview` | perm: content:read |
| GET | `/admin/v1/lessons` | perm: content:read |
| GET | `/admin/v1/lessons/:id` | perm: content:read |
| POST | `/admin/v1/lessons` | perm: content:write |
| PATCH | `/admin/v1/lessons/:id` | perm: content:write |
| POST | `/admin/v1/lessons/:id/status` | perm: content:write |
| POST | `/admin/v1/lessons/:id/curriculum/:index/verify` | perm: content:verify |
| DELETE | `/admin/v1/lessons/:id` | perm: content:delete |
| GET | `/admin/v1/reward-items` | perm: content:read |
| POST | `/admin/v1/reward-items` | perm: content:write |
| PATCH | `/admin/v1/reward-items/:key` | perm: content:write |
| GET | `/admin/v1/rankings/overview` | perm: analytics:read |

### Admin notifications (6)

| Method | Path | Access / limits |
|---|---|---|
| GET | `/admin/v1/notifications` | perm: notifications:read |
| POST | `/admin/v1/notifications/preview` | perm: notifications:send |
| GET | `/admin/v1/notifications/:id` | perm: notifications:read |
| POST | `/admin/v1/notifications` | perm: notifications:send |
| POST | `/admin/v1/notifications/:id/send` | perm: notifications:send |
| DELETE | `/admin/v1/notifications/:id` | perm: notifications:send |

### Admin settings (2)

| Method | Path | Access / limits |
|---|---|---|
| GET | `/admin/v1/settings` | perm: settings:read |
| PUT | `/admin/v1/settings/:key` | perm: settings:write |

### Admin source registry (8)

| Method | Path | Access / limits |
|---|---|---|
| GET | `/admin/v1/fact-sources` | perm: content:read |
| GET | `/admin/v1/fact-sources/summary` | perm: content:read |
| GET | `/admin/v1/fact-sources/:id/events` | perm: content:read |
| POST | `/admin/v1/fact-sources` | perm: content:write |
| PATCH | `/admin/v1/fact-sources/:id` | perm: content:write |
| POST | `/admin/v1/fact-sources/:id/verify` | perm: content:verify |
| POST | `/admin/v1/fact-sources/maintenance/run` | perm: content:publish |
| POST | `/admin/v1/fact-sources/:id/ingest` | perm: content:publish |

### Admin subscriptions (5)

| Method | Path | Access / limits |
|---|---|---|
| GET | `/admin/v1/subscriptions/stats` | perm: subscriptions:read |
| GET | `/admin/v1/subscriptions` | perm: subscriptions:read |
| GET | `/admin/v1/subscriptions/:id/events` | perm: subscriptions:read |
| POST | `/admin/v1/subscriptions/:id/revoke` | perm: subscriptions:write |
| POST | `/admin/v1/subscriptions/:id/extend` | perm: subscriptions:write |

Note: player routes under `/v1/player` require a player token and an active entitlement unless listed as public (login, verify). Guardian routes require a guardian token; destructive ones also require step-up.

## 7. Real-time (WebSocket `/v1/ws`)

| Direction | Message | Meaning |
|---|---|---|
| server → guardian | hello | Connected; lists children currently online |
| server → guardian | child_status | A child went online/offline or started/ended a game |
| server → guardian | mirror_frame | Compact game state for the child being watched |
| server → guardian | mirror_ended | Mirroring stopped (child offline, ended) |
| server → guardian | watching | Confirms a mirror session was opened |
| server → player | hello | Connected; watcher count |
| server → player | session_control | Guardian action: pause, resume, end, signed_out |
| server → player | mirror_status | How many guardians are watching |
| server → player | heartbeat_result | Time credited and remaining |
| server → player | controls_changed / profile_changed | Guardian edited settings; app reloads them |
| either | ping / pong | Keep-alive |
| either | error | Code + message (e.g. forbidden, mirroring_disabled) |

## 8. Games (40)

| id | Name | Category | Age brackets | Levels | Skills | Min | Status |
|---|---|---|---|---|---|---|---|
| picture-matching | Picture Matching | Matching & Memory | AB | 3 pairs; 6 pairs; 8 pairs | attention, visual discrimination | 3 | playable |
| memory-cards | Memory Cards | Matching & Memory | ABCD | 4 pairs; 8 pairs; 12 pairs; 18 pairs[CD] | memory, concentration | 4 | playable |
| jigsaw | Jigsaw Puzzle | Puzzles | ABCD | 4 pieces; 9 pieces; 16 pieces; 36 pieces[CD] | spatial reasoning, patience | 5 | playable |
| shape-sorting | Shape Sorting | Matching & Memory | A | 3 shapes; 5 shapes; 7 shapes | shapes, fine motor | 3 | playable |
| colour-matching | Colour Matching | Matching & Memory | A | 3 choices; 4 choices; 6 choices | colours, attention | 3 | playable |
| spot-the-difference | Spot the Difference | Puzzles | BCD | 3 differences; 5 differences; 7 differences | observation, attention | 4 | playable |
| hidden-object | Find the Hidden Object | Puzzles | BC | 4 objects; 6 objects; 9 objects | observation, vocabulary | 4 | playable |
| maze-runner | Maze Runner | Puzzles | ABCD | Small maze; Medium maze; Big maze; Huge maze[CD] | planning, spatial reasoning | 4 | playable |
| sliding-puzzle | Sliding Puzzle | Puzzles | BCD | 3 × 3; 4 × 4; 5 × 5[CD] | logic, planning | 6 | playable |
| sudoku | Sudoku | Numbers & Logic | BCD | 4 × 4[B]; 6 × 6; 9 × 9 easy[CD]; 9 × 9 hard[CD]; 9 × 9 expert[D] | logic, numbers | 10 | playable |
| word-search | Word Search | Words & Letters | BCD | 6 × 6, 4 words; 8 × 8, 6 words; 10 × 10, 8 words | spelling, scanning | 6 | playable |
| anagram-builder | Anagram Builder | Words & Letters | BCD | 3–4 letters; 5–6 letters; 7+ letters | spelling, vocabulary | 5 | playable |
| tangram | Tangram | Puzzles | BCD | Outlined pieces; Silhouette; Tricky shapes | geometry, spatial reasoning | 6 | playable |
| connect-four | Connect Four | Board & Strategy | BCD | Friendly robot; Clever robot; Master robot | strategy, planning | 5 | playable |
| checkers | Checkers | Board & Strategy | BCD | Beginner; Normal; Hard | strategy, foresight | 10 | playable |
| chess | Chess | Board & Strategy | BCD | Learn the moves[BC]; Beginner; Club player[CD]; Advanced[D] | strategy, planning, patience | 15 | playable |
| ludo | Ludo | Board & Strategy | BCD | 2 players; 4 players | counting, turn taking | 12 | playable |
| snakes-and-ladders | Snakes and Ladders | Board & Strategy | BC | Classic | counting, number recognition | 6 | playable |
| bubble-shooter | Bubble Shooter | Arcade | CD | Easy; Normal; Hard | aim, colour matching, planning | 6 | playable |
| match-3 | Match-3 | Arcade | CD | Easy; Normal; Hard | pattern recognition, planning | 6 | playable |
| block-puzzle | Block Puzzle | Arcade | CD | Classic; Big pieces | spatial reasoning, planning | 6 | playable |
| connect-the-dots | Connect the Dots | Creative | AB | 1–10; 1–20; 1–30 | counting, number order | 3 | playable |
| colouring-book | Colouring Book | Creative | ABC | Free colouring | creativity, colours | 6 | playable |
| drawing-canvas | Drawing Canvas | Creative | ABCD | Free drawing | creativity, fine motor | 8 | playable |
| origami-studio | Origami Studio | Creative | ABCD | By model | following instructions, fine motor, geometry | 10 | playable |
| paper-airplane | Paper Airplane Designer | Creative | BCD | By design | physics, fine motor | 8 | playable |
| virtual-garden | Virtual Garden | Simulation | AB | 3 beds; 6 beds | care, patience, cause and effect | 6 | playable |
| physics-lab | Simple Physics Lab | Learning & Quizzes | BCD | Easy; Normal; Hard | physics, experimentation | 6 | playable |
| coding-sequence | Coding Sequence Puzzle | Learning & Quizzes | BCD | Steps only; Turns; Loops[CD] | sequencing, logic, coding | 6 | playable |
| science-quiz | Science Quiz | Learning & Quizzes | BCD | Easy; Normal; Hard | science, reasoning | 5 | playable |
| geography-quiz | Geography Quiz | Learning & Quizzes | BCD | Easy; Normal; Hard | geography, memory | 5 | playable |
| animal-sounds | Animal Sound Quiz | Learning & Quizzes | AB | 2 animals; 4 animals | listening, animals | 3 | playable |
| cricket | Cricket Batting | Sports | BCD | Easy; Normal; Hard | timing, reaction | 3 | playable |
| football-penalty | Football Penalty | Sports | BCD | Easy; Normal; Hard | aim, decision making | 3 | playable |
| bowling | Bowling | Sports | BCD | Easy; Normal; Hard | aim, scoring | 5 | playable |
| virtual-cooking | Virtual Cooking | Simulation | AB | Short recipes; Long recipes | sequencing, following instructions | 5 | playable |
| farm-manager | Farm Manager | Simulation | BCD | Easy; Normal; Hard | planning, arithmetic, resource management | 8 | playable |
| traffic-logic | Traffic Logic Puzzle | Numbers & Logic | CD | Easy; Normal; Hard | logic, planning | 5 | playable |
| chess-tactics | Chess Tactics | Board & Strategy | CD | Mate in 1; Win material; Mate in 2[D] | chess, calculation | 5 | playable |
| detective-mystery | Detective Mystery | Learning & Quizzes | CD | 3 suspects; 4 suspects; 5 suspects | deduction, reading | 8 | playable |

Brackets: A Little Explorers 3–5, B Brain Builders 6–8, C Mind Masters 9–10, D Junior Strategists 11–12 (as defined in `backend/src/lib/age.ts`; a level in square brackets is limited to those brackets).

Game engine: each game is a pure reducer (`GameDefinition`: init, reduce, status, View) in `src/games/defs`, with rules in `src/games/logic`. `GameShell` provides HUD, pause, restart, quit, time budget, guardian pause/end, completion screen, mirror frames and the Help button. Games load lazily through `src/games/registry.ts`.

### Achievements (19)

| key | Name | Description | Rule |
|---|---|---|---|
| first_game | First Steps | Finished your very first game. | `{"type": "completions", "count": 1}` |
| five_games | Game Explorer | Played five different games. | `{"type": "games_played", "count": 5}` |
| ten_wins | Ten Wins | Finished ten games. | `{"type": "completions", "count": 10}` |
| fifty_wins | Champion | Finished fifty games. | `{"type": "completions", "count": 50}` |
| memory_master | Memory Master | Finished Memory Cards on hard. | `{"type": "completions", "gameId": "memory-cards", "difficulty": "hard", "count": 1}` |
| puzzle_pro | Puzzle Pro | Finished five jigsaw puzzles. | `{"type": "completions", "gameId": "jigsaw", "count": 5}` |
| curious_mind | Curious Mind | Read ten Did You Know? facts. | `{"type": "facts_read", "count": 10}` |
| quiz_whiz | Quiz Whiz | Answered ten quiz questions correctly. | `{"type": "quiz_correct", "count": 10}` |
| paper_folder | Paper Folder | Completed your first craft. | `{"type": "crafts_done", "count": 1}` |
| craft_club | Craft Club | Completed five crafts. | `{"type": "crafts_done", "count": 5}` |
| first_lesson | First Lesson | Finished your first lesson in the academy. | `{"type": "lessons_completed", "count": 1}` |
| ten_lessons | Keen Learner | Finished ten lessons. | `{"type": "lessons_completed", "count": 10}` |
| music_maker | Music Maker | Finished your first music lesson. | `{"type": "lessons_completed", "count": 1, "section": "music"}` |
| sports_star | Sports Star | Finished your first sports lesson. | `{"type": "lessons_completed", "count": 1, "section": "sports"}` |
| science_explorer | Science Explorer | Finished three science lessons. | `{"type": "lessons_completed", "count": 3, "section": "study"}` |
| tutorial_pro | Ready Player | Finished the How to Play tutorial for five games. | `{"type": "tutorials_completed", "count": 5}` |
| coin_collector | Coin Collector | Earned 100 coins. | `{"type": "coins_earned", "count": 100}` |
| coin_hoard | Treasure Keeper | Earned 500 coins. | `{"type": "coins_earned", "count": 500}` |
| first_ranked_win | On the Board | Won your first ranked game. | `{"type": "ranked_wins", "count": 1}` |

## 9. Tutorials, rankings and coins

### Tutorials
All 40 games have a data-driven 5-step pictorial tutorial in `src/games/tutorials/definitions.ts`: meet the game → controls → watch a move → try it (a highlighted target the child must tap) → play. Ages 3–5 get simpler wording where offered. Four entry points: "Show me how" on the game page, automatically the first time a game is played, the in-game Help button (pauses the game), and Replay from the pause sheet. Completing a tutorial pays coins once per game. A test verifies that every game has a tutorial.

### Scoring rules (19 competitive games)

| Game | Kind | Win pts | Finish pts | Max score | Min seconds | Rule shown to children |
|---|---|---|---|---|---|---|
| ludo | wins | 30 | 5 |  | 60 | Win = 30 points, finishing a game = 5 points. Four-player games count 1.5×. |
| snakes-and-ladders | wins | 20 | 5 |  | 30 | Win = 20 points, finishing = 5 points. |
| chess | rating | 40 | 10 |  | 60 | A chess rating (Elo-style) against the computer's level, plus 40 points per win. |
| chess-tactics | score | 10 | 5 | 300 | 15 | Validated puzzle score; 10 points per solved set. |
| memory-cards | score | 10 | 5 | 400 | 10 | Validated score (fewer moves = more); 10 points per finished board. |
| jigsaw | score | 10 | 5 | 400 | 15 | Validated score and difficulty; 10 points per finished puzzle. |
| sudoku | score | 15 | 5 | 500 | 60 | Validated score and difficulty; 15 points per solved grid. |
| word-search | score | 10 | 5 | 400 | 20 | Validated score; 10 points per finished grid. |
| anagram-builder | score | 10 | 5 | 400 | 20 | Validated score; 10 points per round. |
| connect-four | wins | 20 | 5 |  | 20 | Win = 20 points, finishing = 5 points. |
| checkers | wins | 25 | 5 |  | 60 | Win = 25 points, finishing = 5 points. |
| science-quiz | score | 10 | 5 | 100 | 30 | Accuracy (score out of 100); 10 points per perfect round. |
| geography-quiz | score | 10 | 5 | 100 | 30 | Accuracy (score out of 100); 10 points per perfect round. |
| maze-runner | score | 10 | 5 | 400 | 10 | Validated score; 10 points per solved maze. |
| match-3 | score | 10 | 5 | 5000 | 30 | Validated score; 10 points per level cleared. |
| block-puzzle | score | 10 | 5 | 5000 | 30 | Validated score. |
| cricket | score | 10 | 5 | 400 | 30 | Runs scored (validated); 10 points per innings won. |
| bowling | score | 10 | 5 | 300 | 30 | Pins (max 300); 10 points per game. |
| football-penalty | score | 10 | 5 | 100 | 15 | Goals scored (validated). |

### Coin rewards (default settings)

| Activity | Coins |
|---|---|
| Tutorial completed (once per game) | 5 |
| Game finished | 5 |
| Game won | 10 |
| Puzzle solved | 5–15 by difficulty |
| Daily challenge | 10 |
| Craft completed | 10 |
| Lesson completed (first time) | 10 |
| Correct quiz answer | 5 |
| Fact discovered | 1 |
| Daily earning cap | 150 |

### Reward shop items (13)

| key | Name | Kind | Price | Subscribers only |
|---|---|---|---|---|
| hat-party | Party Hat | avatar_accessory | 30 |  |
| crown-gold | Golden Crown | avatar_accessory | 80 |  |
| glasses-star | Star Glasses | avatar_accessory | 40 |  |
| theme-ocean | Ocean Theme | theme | 60 |  |
| theme-jungle | Jungle Theme | theme | 60 |  |
| theme-space | Space Theme | theme | 90 | yes |
| board-wood | Wooden Board | board_skin | 50 |  |
| board-candy | Candy Board | board_skin | 50 |  |
| tokens-animals | Animal Tokens | token_design | 45 |  |
| bg-sunset | Sunset Sky | background | 35 |  |
| effect-sparkle | Sparkle Trail | effect | 70 |  |
| badge-explorer | Explorer Badge | badge | 25 |  |
| craft-rocket | Rocket Craft Template | craft_template | 40 |  |

## 10. Learning academy (50 lessons)

Template (every lesson, in order): objective, discover, understand, example, try it, real world, revision, **Did You Know? (sourced)**, challenge. A build-time check and an admin publish check both reject lessons missing a step or a source.

Lesson engine kinds — visuals (44): counters, numberLine, shapes, placeValue, grid, balance, multiplyTrick, scene, ballPath, shadowSun, lever, particles, molecule, cycle, lifeCycle, flowchart, sortCards, wasteBins, moneyJar, plantParts, computerParts, labelled, bar, timeline, sourceCards, compass, mazeMini, mapSchematic, passwordStrength, letters, patternRow, pianoKeys, fingerNumbers, staff, rhythmGrid, tabla, guitarChord, court, figure and basic shapes. Activities (12): mcq, predict, trueFalse, count, number, tapTarget, order, match, rhythm, piano, tabla, guitar.

### Study (32 lessons)

| Id | Subject | Title | Age | Range | Level | Min | Objective | Curriculum mapping (all pending review) | Source publishers |
|---|---|---|---|---|---|---|---|---|---|
| maths-3-counting-1-5 | maths | Counting 1 to 5 | 3 | 3–5 | beginner | 5 | Count up to five objects by touching each one once and say how many there are. | ncert Nursery, ib_pyp Early Years | Khan Academy, NCERT |
| maths-5-shapes-around-us | maths | Shapes Around Us | 5 | 3–7 | beginner | 6 | Name a circle, square, triangle and rectangle and find each shape in real objects. | ncert UKG, ncert Class 1, ib_pyp PYP 1 | BBC, NCERT |
| maths-7-place-value-tens-ones | maths | Tens and Ones | 7 | 6–9 | beginner | 8 | Split a two-digit number into tens and ones and build a number from tens and ones. | ncert Class 2, cbse Class 2, cisce Class 2 | Khan Academy, NCERT |
| maths-9-perimeter-area | maths | Perimeter and Area of a Rectangle | 9 | 8–11 | intermediate | 9 | Find the perimeter and area of a rectangle from its length and breadth, with the right units. | ncert Class 4, cbse Class 5, ib_pyp PYP 4 | Khan Academy, NCERT |
| maths-11-missing-number-algebra | maths | Find the Missing Number | 11 | 10–12 | intermediate | 10 | Solve one-step equations like x + 7 = 15 and 3y = 18 by keeping both sides balanced. | ncert Class 6, cbse Class 6, ib_myp MYP 1 | Khan Academy, NCERT |
| vedic-8-multiply-by-11 | vedic-maths | Multiply by 11 in Your Head | 8 | 7–12 | intermediate | 8 | Multiply a two-digit number by 11 mentally, explain why the trick works and check the answer by ordinary multiplication. | ncert Class 3, cbse Class 4 | Khan Academy, Wikipedia (CC BY-SA) |
| vedic-11-near-100 | vedic-maths | Multiplying Numbers Near 100 | 11 | 10–12 | advanced | 10 | Multiply two numbers just below 100 using their differences from 100, and show with algebra why the method is correct. | ncert Class 7, ib_myp MYP 1 | Khan Academy, Wikipedia (CC BY-SA) |
| physics-4-push-and-pull | physics | Push and Pull | 4 | 3–6 | beginner | 5 | Tell a push from a pull and notice that a bigger push moves things more. | ncert LKG, ncert Class 3, ib_pyp Early Years | BBC, NCERT |
| physics-8-light-and-shadows | physics | Light and Shadows | 8 | 6–10 | beginner | 8 | Explain that a shadow forms when an object blocks light, and predict how the shadow changes when the light moves. | ncert Class 3, ncert Class 6, cbse Class 6, ib_pyp PYP 3 | NASA, NCERT |
| physics-11-levers | physics | Levers: Lift More With Less | 11 | 9–12 | intermediate | 10 | Identify the pivot, effort and load of a lever and explain why a longer effort arm needs less force. | ncert Class 6, cisce Class 6, ib_myp MYP 1 | BBC, NCERT |
| chemistry-6-solids-liquids-gases | chemistry | Solid, Liquid or Gas? | 6 | 5–9 | beginner | 7 | Sort everyday things into solids, liquids and gases and describe how their particles behave. | ncert Class 2, ncert Class 4, ib_pyp PYP 1 | NCERT, U.S. Geological Survey |
| chemistry-9-mixing-separating | chemistry | Mixing and Separating (Kitchen Science) | 9 | 7–11 | intermediate | 10 | Choose a separation method (sieving, filtering, evaporation, using a magnet) for a given mixture and explain why it works. | ncert Class 6, cbse Class 6, cisce Class 5, ib_pyp PYP 4 | NCERT, NOAA National Ocean Service |
| chemistry-12-atoms-molecules | chemistry | Atoms and Molecules | 12 | 10–12 | advanced | 10 | Describe an atom as the smallest unit of an element, read a simple formula like H₂O or CO₂, and tell an element from a compound. | ncert Class 7, cisce Class 7, ib_myp MYP 1 | Encyclopaedia Britannica, NCERT |
| biology-3-living-or-not | biology | Living or Not? | 3 | 3–5 | beginner | 5 | Say whether something is living or non-living by asking: does it grow, eat and move on its own? | ncert Nursery, ncert Class 1, ib_pyp Early Years | Encyclopaedia Britannica, NCERT |
| biology-7-parts-of-a-plant | biology | Parts of a Plant | 7 | 5–9 | beginner | 7 | Name the main parts of a plant and match each part to its function. | ncert Class 2, ncert Class 4, cbse Class 3, ib_pyp PYP 2 | Encyclopaedia Britannica, NCERT |
| biology-10-digestive-system | biology | The Digestive System | 10 | 8–12 | intermediate | 9 | Trace the path of food through the digestive system and state what happens at each organ. | ncert Class 5, ncert Class 7, cbse Class 7, cisce Class 5 | Encyclopaedia Britannica, NCERT |
| environment-5-save-water | environment | Every Drop Counts | 5 | 3–7 | beginner | 5 | Name three ways to save water at home and explain why clean water should not be wasted. | ncert UKG, ncert Class 2, ib_pyp Early Years | NCERT, U.S. Geological Survey |
| environment-8-water-cycle | environment | The Water Cycle | 8 | 6–10 | beginner | 8 | Describe the water cycle using the words evaporation, condensation, precipitation and collection. | ncert Class 3, ncert Class 6, cbse Class 6, ib_pyp PYP 3 | NCERT, U.S. Geological Survey |
| environment-11-waste-segregation | environment | Sort It Out: Waste and Recycling | 11 | 9–12 | intermediate | 9 | Sort household waste into wet, dry and hazardous, and explain composting and recycling. | ncert Class 6, cbse Class 6, cisce Class 6, ib_myp MYP 1 | CPCB, Government of India, Government of India |
| history-6-family-timeline | history | My Family Timeline | 6 | 5–8 | beginner | 7 | Order events from oldest to newest on a timeline and explain that stories told by family are a kind of historical source. | ncert Class 1, ncert Class 3, ib_pyp PYP 1 | NCERT, UNESCO World Heritage Centre |
| history-9-indus-valley | history | The Indus Valley Civilisation | 9 | 8–12 | intermediate | 10 | Describe key features of Indus Valley cities and tell the difference between evidence, interpretation and legend. | ncert Class 6, cbse Class 6, cisce Class 6, ib_pyp PYP 5 | ASI, Ministry of Culture, Encyclopaedia Britannica |
| history-12-primary-secondary-sources | history | Reading the Past: Primary and Secondary Sources | 12 | 10–12 | advanced | 10 | Classify sources as primary or secondary, ask who made a source and why, and judge how far it can be trusted. | ncert Class 6, cbse Class 6, cisce Class 6, ib_myp MYP 1 | Encyclopaedia Britannica, NCERT |
| geography-4-which-way | geography | Which Way? | 4 | 3–6 | beginner | 5 | Follow and give simple directions (left, right, forward) and recognise the compass points N, S, E, W. | ncert LKG, ncert Class 3, ib_pyp Early Years | NASA, NCERT |
| geography-8-continents-oceans | geography | Continents and Oceans | 8 | 6–10 | beginner | 8 | Name the seven continents and five oceans and point to each on a simplified world map. | ncert Class 4, ncert Class 6, cbse Class 5, ib_pyp PYP 3 | NCERT, NOAA National Ocean Service |
| geography-10-rivers-of-india | geography | Rivers of India | 10 | 8–12 | intermediate | 9 | Name six major Indian rivers, say roughly where each rises and flows, and explain why rivers matter for people and farms. | ncert Class 4, ncert Class 9, cbse Class 5, cisce Class 5 | Encyclopaedia Britannica, Survey of India |
| computers-5-parts-of-a-computer | computers | Parts of a Computer | 5 | 4–7 | beginner | 5 | Name the main parts of a computer and sort them into parts we use to put things in and parts that show things out. | cbse Class 1, cisce Class 1, ib_pyp PYP 1 | BBC, Encyclopaedia Britannica |
| computers-8-algorithms | computers | Algorithms: Steps in Order | 8 | 6–10 | beginner | 8 | Write a short algorithm as an ordered list of clear steps and spot a step that is missing or out of order. | cbse Class 3, cisce Class 4, ib_pyp PYP 3 | Code.org, Encyclopaedia Britannica |
| computers-11-safe-online | computers | Safe Online | 11 | 9–12 | intermediate | 9 | Make a strong password, list information that must stay private, and know the steps to take when a message or site feels wrong. | cbse Class 6, cisce Class 6, ncert Class 6, ib_myp MYP 1 | BBC, Ministry of Home Affairs, India |
| english-4-letter-sounds | english | Letter Sounds: a, b, c, s, t | 4 | 3–6 | beginner | 5 | Say the sounds of the letters a, b, c, s and t and match each to a picture whose name starts with that sound. | ncert LKG, ncert Class 1, cbse Class 1, ib_pyp Early Years | BBC, NCERT |
| hindi-5-swar | hindi | स्वर: अ से अः | 5 | 4–7 | beginner | 6 | हिंदी के पहले छह स्वरों (अ, आ, इ, ई, उ, ऊ) को पहचानना, बोलना और उनसे शुरू होने वाले शब्द बताना। | ncert UKG, ncert Class 1, cbse Class 1 | NCERT, Wikipedia (CC BY-SA) |
| gk-9-needs-and-wants | general-knowledge | Needs, Wants and Saving | 9 | 7–12 | beginner | 8 | Sort purchases into needs and wants, make a simple saving plan and explain why saving before spending works. | ncert Class 4, cbse Class 5, ib_pyp PYP 4 | NCERT, Reserve Bank of India |
| thinking-10-spot-the-pattern | thinking | Spot the Pattern | 10 | 7–12 | intermediate | 8 | Find the rule in a number or shape sequence, explain it in words and use it to predict the next terms. | ncert Class 3, ncert Class 5, cbse Class 5, ib_pyp PYP 4 | Encyclopaedia Britannica, Khan Academy |

### Music (9 lessons)

| Id | Subject | Title | Age | Range | Level | Min | Objective | Curriculum mapping (all pending review) | Source publishers |
|---|---|---|---|---|---|---|---|---|---|
| piano-3-high-and-low | piano | High Sounds, Low Sounds | 3 | 3–5 | beginner | 5 | Tell high sounds from low sounds and find them on the keyboard (low on the left, high on the right). | ncert Nursery, ib_pyp Early Years | Encyclopaedia Britannica, Open Music Theory (CC BY-SA) |
| piano-6-finger-numbers-middle-c | piano | Finger Numbers and Middle C | 6 | 5–8 | beginner | 8 | Number the fingers of each hand 1–5, locate middle C and play C–D–E with right-hand fingers 1–2–3 in time with a metronome. | cbse Class 1, ib_pyp PYP 1 | Encyclopaedia Britannica, Open Music Theory (CC BY-SA) |
| piano-9-first-tune-twinkle | piano | Your First Tune: Twinkle, Twinkle | 9 | 7–12 | intermediate | 10 | Play the first phrase of Twinkle, Twinkle (C C G G A A G, F F E E D D C) in time, reading the note names. | cbse Class 4, ib_pyp PYP 4 | Encyclopaedia Britannica, Open Music Theory (CC BY-SA) |
| piano-12-c-major-scale-chord | piano | The C Major Scale and Your First Chord | 12 | 10–12 | advanced | 12 | Play the C major scale (right hand 1-2-3-1-2-3-4-5) evenly with a metronome, explain the whole/half-step pattern, and play a C major chord (C–E–G). | cbse Class 7, ib_myp MYP 1 | Encyclopaedia Britannica, Open Music Theory (CC BY-SA) |
| tabla-4-clap-the-beat | tabla | Clap the Beat | 4 | 3–6 | beginner | 5 | Keep a steady four-beat pulse by clapping and tapping along, loud on beat one. | ncert LKG, ib_pyp Early Years | Encyclopaedia Britannica |
| tabla-8-first-bols | tabla | Your First Bols: Na, Tin, Ge, Dha | 8 | 7–11 | beginner | 9 | Sit correctly at the tabla, name the two drums and play Na, Tin, Ge and Dha on the right drums in a steady beat. | cbse Class 3, ib_pyp PYP 3 | Encyclopaedia Britannica, Wikipedia (CC BY-SA) |
| tabla-11-teentaal | tabla | Teentaal: The 16-Beat Cycle | 11 | 9–12 | intermediate | 12 | Recite and play the theka of Teentaal (16 beats in four groups of four), showing sam (beat 1) and khali (beat 9). | cbse Class 6, ib_myp MYP 1 | Encyclopaedia Britannica, Wikipedia (CC BY-SA) |
| guitar-7-parts-and-holding | guitar | Meet the Guitar | 7 | 6–10 | beginner | 8 | Name the main parts of a guitar, sit and hold it correctly, and strum the open strings with a steady down-stroke. | cbse Class 2, ib_pyp PYP 2 | Encyclopaedia Britannica |
| guitar-10-first-chord-e-minor | guitar | Your First Chord: E Minor | 10 | 8–12 | intermediate | 10 | Finger an E minor chord cleanly (2nd fret on the A and D strings), check each string rings, and strum a down-down-up pattern in time. | cbse Class 5, ib_pyp PYP 5 | Encyclopaedia Britannica, Open Music Theory (CC BY-SA) |

### Sports (9 lessons)

| Id | Subject | Title | Age | Range | Level | Min | Objective | Curriculum mapping (all pending review) | Source publishers |
|---|---|---|---|---|---|---|---|---|---|
| cricket-6-meet-cricket | cricket | Meet Cricket | 6 | 4–8 | beginner | 7 | Name the basic equipment and roles in cricket (batter, bowler, fielder, wicket) and explain how runs are scored and a batter is out. | ncert Class 1, cbse Class 3, ib_pyp PYP 1 | Encyclopaedia Britannica, Marylebone Cricket Club |
| cricket-10-batting-stance-grip | cricket | Batting: Grip and Stance | 10 | 8–12 | intermediate | 9 | Demonstrate the basic batting grip (two hands together, Vs aligned) and a balanced side-on stance with still head and level eyes. | cbse Class 5, ncert Class 6, ib_pyp PYP 5 | Encyclopaedia Britannica, Marylebone Cricket Club |
| football-5-kick-and-stop | football | Kick It, Stop It | 5 | 4–7 | beginner | 6 | Pass a ball along the ground with the inside of the foot and stop a rolling ball by trapping it under the sole. | ncert UKG, cbse Class 1, ib_pyp Early Years | Encyclopaedia Britannica, The IFAB |
| badminton-8-grip-and-serve | badminton | Badminton: Grip and Serve | 8 | 6–11 | beginner | 8 | Hold the racket with a forehand (handshake) grip, take the ready position, and perform a legal underarm serve. | cbse Class 4, ncert Class 6, ib_pyp PYP 3 | BWF, Encyclopaedia Britannica |
| squash-9-court-and-safety | squash | Squash: The Court and Safety First | 9 | 7–12 | beginner | 8 | Name the lines of a squash court, explain why eye protection is mandatory, and describe what a let is and when to call it. | cbse Class 5, ib_pyp PYP 4 | Encyclopaedia Britannica, World Squash |
| basketball-7-dribbling | basketball | Dribbling the Basketball | 7 | 5–10 | beginner | 7 | Dribble a basketball on the spot with fingertips at waist height while looking up, with either hand. | cbse Class 3, ncert Class 4, ib_pyp PYP 2 | Encyclopaedia Britannica, FIBA |
| volleyball-9-forearm-pass | volleyball | Volleyball: The Forearm Pass | 9 | 7–12 | beginner | 8 | Perform a forearm pass (bump) with a flat platform, knees bent and legs driving the ball upward, and land safely after jumps. | cbse Class 5, ncert Class 6, ib_pyp PYP 4 | Encyclopaedia Britannica, FIVB |
| table-tennis-8-grip-stance | table-tennis | Table Tennis: Grip and Ready Stance | 8 | 6–11 | beginner | 7 | Hold the bat with a shakehand grip, take the ready stance, return a gentle ball with a forehand push and explain scoring to 11. | cbse Class 4, ncert Class 5, ib_pyp PYP 3 | Encyclopaedia Britannica, International Table Tennis Federation |
| swimming-5-water-safety | swimming | Water Safety First | 5 | 3–12 | beginner | 6 | State the water safety rules (grown-up within arm's reach, never alone, walk don't run, know the depth) and explain that swimming is learned in the water with a qualified instructor. | ncert UKG, cbse Class 1, ib_pyp Early Years | American Red Cross, Encyclopaedia Britannica, World Health Organization |

Safety notes and adult-assisted flags exist on lessons that need them (chemistry demonstrations, sports, swimming with the mandatory supervised-water statement). Music lessons are on-screen only and say the app cannot assess real-instrument technique.

Lessons with safety notes:

- `vedic-8-multiply-by-11`: These are shortcuts for ordinary arithmetic. The lesson always shows why a shortcut works and asks for a check with the standard method.
- `vedic-11-near-100`: Shortcut methods are always paired with their proof and a standard-method check.
- `chemistry-6-solids-liquids-gases`: Kettles and steam are for grown-ups only. The lesson's experiments use ice and tap water.
- `chemistry-9-mixing-separating`: Never mix household chemicals, use flames or taste anything in an experiment. / Everything here uses water, salt, sand and paper with a grown-up nearby.
- `geography-10-rivers-of-india`: Maps in LoJi are schematic drawings for learning, never precise locations.
- `computers-5-parts-of-a-computer`: No third-party accounts or websites are needed for any computer lesson.
- `computers-8-algorithms`: No third-party accounts or websites are needed for any computer lesson.
- `computers-11-safe-online`: The lesson never asks a child to create an account or visit an external website.
- `piano-3-high-and-low`: LoJi plays and checks the notes you tap on the screen. It cannot hear a real instrument or check your hand position — a music teacher or grown-up does that.
- `piano-6-finger-numbers-middle-c`: LoJi plays and checks the notes you tap on the screen. It cannot hear a real instrument or check your hand position — a music teacher or grown-up does that.
- `piano-9-first-tune-twinkle`: LoJi plays and checks the notes you tap on the screen. It cannot hear a real instrument or check your hand position — a music teacher or grown-up does that.
- `piano-12-c-major-scale-chord`: LoJi plays and checks the notes you tap on the screen. It cannot hear a real instrument or check your hand position — a music teacher or grown-up does that.
- `tabla-4-clap-the-beat`: The tabla is heavy: a grown-up should carry and place it.
- `tabla-8-first-bols`: The tabla is heavy: a grown-up should carry and place it. / LoJi plays and checks the notes you tap on the screen. It cannot hear a real instrument or check your hand position — a music teacher or grown-up does that.
- `tabla-11-teentaal`: LoJi plays and checks the notes you tap on the screen. It cannot hear a real instrument or check your hand position — a music teacher or grown-up does that.
- `guitar-7-parts-and-holding`: Use a guitar that fits (1/2 or 3/4 size). A grown-up tunes it and checks for sharp string ends. / LoJi plays and checks the notes you tap on the screen. It cannot hear a real instrument or check your hand position — a music teacher or grown-up does that.
- `guitar-10-first-chord-e-minor`: LoJi plays and checks the notes you tap on the screen. It cannot hear a real instrument or check your hand position — a music teacher or grown-up does that.
- `cricket-6-meet-cricket`: A hard cricket ball needs a helmet, pads and gloves. Younger children practise with a soft ball. / Warm up first: two minutes of jogging on the spot, arm circles and gentle stretches. Stop if anything hurts and tell a grown-up.
- `cricket-10-batting-stance-grip`: A hard cricket ball needs a helmet, pads and gloves. / Warm up first: two minutes of jogging on the spot, arm circles and gentle stretches. Stop if anything hurts and tell a grown-up.
- `football-5-kick-and-stop`: Warm up first: two minutes of jogging on the spot, arm circles and gentle stretches. Stop if anything hurts and tell a grown-up. / Play away from roads and glass, with a grown-up watching.
- `badminton-8-grip-and-serve`: Warm up first: two minutes of jogging on the spot, arm circles and gentle stretches. Stop if anything hurts and tell a grown-up. / Keep rackets away from faces; give your partner space.
- `squash-9-court-and-safety`: Always wear protective eyewear in a squash court. / Two players share a small space: call "let" and stop if someone is in the way. / Play only with a grown-up or coach present.
- `basketball-7-dribbling`: Warm up first: two minutes of jogging on the spot, arm circles and gentle stretches. Stop if anything hurts and tell a grown-up. / Use a size 5 ball for children and a flat, dry surface.
- `volleyball-9-forearm-pass`: Warm up first: two minutes of jogging on the spot, arm circles and gentle stretches. Stop if anything hurts and tell a grown-up. / Land on both feet with bent knees after jumping.
- `table-tennis-8-grip-stance`: Warm up first: two minutes of jogging on the spot, arm circles and gentle stretches. Stop if anything hurts and tell a grown-up.
- `swimming-5-water-safety`: Important: nobody learns to swim from a screen. This lesson explains ideas only. Real swimming needs a qualified instructor, a grown-up watching at all times and the pool's safety rules. Never go into water without supervision.

Source publishers across lessons: Encyclopaedia Britannica (28), NCERT (23), Khan Academy (7), BBC (6), Wikipedia (CC BY-SA) (5), Open Music Theory (CC BY-SA) (5), U.S. Geological Survey (3), NASA (2), NOAA National Ocean Service (2), Marylebone Cricket Club (2), CPCB, Government of India (1), Government of India (1), UNESCO World Heritage Centre (1), ASI, Ministry of Culture (1), Survey of India (1), Code.org (1), Ministry of Home Affairs, India (1), Reserve Bank of India (1), The IFAB (1), BWF (1), World Squash (1), FIBA (1), FIVB (1), International Table Tennis Federation (1), World Health Organization (1), American Red Cross (1).

## 11. Did You Know facts, sources and crafts

### Facts (46 starter facts, each with a source and quiz questions)

By category: space 3, animals 3, india 3, mysteries 3, senses 2, oceans 2, dinosaurs 2, experiments 2, physics 2, plants 2, inventions 2, geography 2, weather 2, maths 2, technology 2, engineering 2, food 2, adaptations 2, ancient 2, arts 2, general 2.

| Slug | Category | Headline | Brackets | Source key | Quiz Qs |
|---|---|---|---|---|---|
| sun-is-a-star | space | The Sun is a star! | ABCD | nasa-spaceplace | 1 |
| jupiter-biggest-planet | space | Jupiter is so big that all the other planets could fit inside it | BCD | nasa-science | 1 |
| moon-footprints | space | Footprints on the Moon could last for millions of years | BCD | nasa-science | 1 |
| blue-whale-largest | animals | The blue whale is the largest animal that has ever lived | ABCD | britannica | 1 |
| cheetah-fastest-land | animals | Cheetahs are the fastest land animals | ABCD | britannica | 1 |
| elephant-trunk | animals | An elephant's trunk is a nose and a hand at the same time | AB | ngkids | 1 |
| taste-buds-renew | senses | Your tongue keeps growing new taste buds | BCD | britannica | 1 |
| eyes-blink | senses | You blink about 15 to 20 times every minute | ABC | britannica-kids | 1 |
| ocean-mostly-unexplored | oceans | Most of the ocean floor has never been seen by people | BCD | noaa-ocean | 1 |
| ocean-covers-earth | oceans | The ocean covers about 70 percent of the Earth | ABCD | noaa-ocean | 1 |
| birds-are-dinosaurs | dinosaurs | Birds are living dinosaurs | BCD | nhm-dinos | 1 |
| dinosaurs-long-ago | dinosaurs | Dinosaurs lived for over 160 million years | BCD | nhm-dinos | 1 |
| oil-floats-on-water | experiments | Oil floats on water because it is lighter for its size | ABCD | exploratorium | 1 |
| baking-soda-vinegar | experiments | Baking soda and vinegar make a fizzing gas | BCD | exploratorium | 1 |
| rainbow-colours | physics | A rainbow is sunlight split into its colours | ABCD | metoffice | 1 |
| sound-needs-air | physics | Sound cannot travel through empty space | BCD | nasa-spaceplace | 1 |
| plants-make-oxygen | plants | Plants make the oxygen we breathe | ABCD | britannica-kids | 1 |
| banyan-national-tree | plants | The banyan is the national tree of India | ABCD | britannica | 1 |
| zero-from-india | inventions | The number zero as we use it came from India | BCD | britannica | 1 |
| telephone-bell | inventions | The first telephone call was made in 1876 | BCD | britannica | 1 |
| taj-mahal-heritage | india | The Taj Mahal is a UNESCO World Heritage Site | ABCD | unesco-whc | 1 |
| chandrayaan-3-south-pole | india | India landed near the Moon's south pole in 2023 | BCD | isro | 1 |
| ashoka-pillars | india | Emperor Ashoka carved messages on pillars over 2,200 years ago | CD | asi | 1 |
| everest-still-growing | geography | Mount Everest is still growing | BCD | britannica | 1 |
| antarctica-desert | geography | Antarctica is the biggest desert on Earth | BCD | britannica | 1 |
| lightning-hotter-than-sun | weather | A lightning bolt is hotter than the surface of the Sun | BCD | metoffice | 1 |
| monsoon-word | weather | The word "monsoon" comes from the Arabic word for season | BCD | britannica | 1 |
| honeycomb-hexagons | maths | Bees build with hexagons because they waste the least wax | BCD | britannica | 1 |
| pi-circles | maths | Every circle, big or small, has the same special number: pi | CD | britannica | 1 |
| word-robot | technology | The word "robot" comes from a 1920 play | BCD | britannica | 1 |
| computers-binary | technology | Computers count with only two digits: 0 and 1 | CD | bbc-bitesize | 1 |
| arch-strength | engineering | An arch is strong because it pushes its load sideways and down | BCD | britannica | 1 |
| wheel-axle-machine | engineering | The wheel and axle is one of the six simple machines | BCD | britannica-kids | 1 |
| honey-never-spoils | food | Honey can stay good for thousands of years | BCD | si | 1 |
| chocolate-from-seeds | food | Chocolate is made from the seeds of a fruit | ABCD | britannica-kids | 1 |
| octopus-three-hearts | adaptations | An octopus has three hearts and blue blood | BCD | britannica | 1 |
| camel-hump-fat | adaptations | A camel's hump stores fat, not water | ABCD | britannica-kids | 1 |
| indus-valley-cities | ancient | Indus Valley cities had drains and baths 4,500 years ago | CD | britannica | 1 |
| pyramids-giza | ancient | The Great Pyramid was the tallest building in the world for almost 4,000 years | BCD | unesco-whc | 1 |
| mobius-strip | mysteries | A Möbius strip has only one side | CD | britannica | 1 |
| why-sky-blue | mysteries | The sky is blue because air scatters blue light the most | BCD | loc-mysteries | 1 |
| water-cycle-same-water | mysteries | The water you drink today may have been drunk by a dinosaur | BCD | usgs-water | 1 |
| piano-88-keys | arts | A standard piano has 88 keys | BCD | britannica | 1 |
| tagore-two-anthems | arts | One poet wrote the national anthems of India and Bangladesh | CD | britannica | 1 |
| leap-year-366 | general | A leap year has 366 days | BCD | britannica | 1 |
| bengal-tiger-national-animal | general | The Bengal tiger is the national animal of India | BCD | britannica | 1 |

### Editorial source references (18)

| Key | Publisher | Title | URL |
|---|---|---|---|
| nasa-science | NASA | NASA Science: Solar System Exploration | https://science.nasa.gov/solar-system/ |
| nasa-spaceplace | NASA | NASA Space Place | https://spaceplace.nasa.gov/ |
| britannica | Encyclopaedia Britannica, Inc. | Encyclopaedia Britannica | https://www.britannica.com/ |
| britannica-kids | Encyclopaedia Britannica, Inc. | Britannica Kids | https://kids.britannica.com/ |
| noaa-ocean | US National Oceanic and Atmospheric Administration | NOAA Ocean Facts | https://oceanservice.noaa.gov/facts/ |
| nhm-dinos | Natural History Museum, London | Natural History Museum: Dinosaurs | https://www.nhm.ac.uk/discover/dinosaurs.html |
| ngkids | National Geographic Partners | National Geographic Kids | https://kids.nationalgeographic.com/ |
| si | Smithsonian Institution | Smithsonian Institution | https://www.si.edu/ |
| isro | ISRO, Government of India | Indian Space Research Organisation | https://www.isro.gov.in/ |
| asi | Ministry of Culture, Government of India | Archaeological Survey of India | https://asi.nic.in/ |
| unesco-whc | UNESCO | UNESCO World Heritage List | https://whc.unesco.org/en/list/ |
| metoffice | UK Met Office | Met Office: Learn about weather | https://www.metoffice.gov.uk/weather/learn-about/weather |
| loc-mysteries | Library of Congress | Everyday Mysteries | https://www.loc.gov/everyday-mysteries/ |
| exploratorium | Exploratorium | Exploratorium Science Snacks | https://www.exploratorium.edu/snacks |
| nist | US National Institute of Standards and Technology | NIST: SI Units and Measurement | https://www.nist.gov/pml/owm/metric-si/si-units |
| who | World Health Organization | World Health Organization fact sheets | https://www.who.int/news-room/fact-sheets |
| usgs-water | US Geological Survey | USGS Water Science School | https://www.usgs.gov/special-topics/water-science-school |
| bbc-bitesize | BBC | BBC Bitesize | https://www.bbc.co.uk/bitesize |

The separate **source registry** (33 sources, see `docs/SOURCE_REGISTRY.md`) tracks free-licence sources with licence, verification status and a safe maintenance scheduler; the fact-ingestion pipeline can propose new facts from them, and delivery is gated on verification.

### Paper crafts (13)

| Slug | Title | Kind | Difficulty | Steps |
|---|---|---|---|---|
| dog-face | Puppy Face | origami | 1 | 4 |
| paper-cup | Paper Cup | origami | 1 | 4 |
| paper-boat | Paper Boat | origami | 2 | 6 |
| fox-puppet | Fox Finger Puppet | origami | 2 | 5 |
| jumping-frog | Jumping Frog | origami | 4 | 7 |
| paper-crane | Paper Crane | origami | 5 | 8 |
| classic-dart | Paper Airplane: Classic Dart | origami | 2 | 5 |
| paper-fan | Accordion Paper Fan | paper_craft | 1 | 4 |
| paper-chain | Paper Chain Garland | paper_craft | 1 | 4 |
| pop-up-card | Pop-up Greeting Card | paper_craft | 3 | 5 |
| draw-a-cat | Draw a Cat in 6 Steps | drawing | 1 | 6 |
| digital-colouring | Colouring Book (on screen) | digital | 1 | 1 |
| digital-drawing | Free Drawing (on screen) | digital | 1 | 1 |

## 12. Admin console, roles and settings

Pages (27): dashboard, games and game editor, categories, facts (list/new/edit), content (list/new/edit), lessons (list/editor), crafts (list/new/edit), sources, rewards, guardians (list/detail), subscriptions, notifications, config (settings and flags), analytics, health, audit log, admins, account, login.

### Roles and permissions

| Role | Purpose |
|---|---|
| super_admin | Everything, including managing admins |
| admin | Everything except managing admins |
| editor | Create, edit and publish games, crafts, facts (dashboard, content read/write/publish) |
| fact_checker | Read content and verify facts; cannot publish |
| support | Look up guardians and subscriptions; extend or revoke entitlements |

Permissions: dashboard:read, guardians:read/write/delete, content:read/write/verify/publish/delete, subscriptions:read/write, settings:read/write, notifications:read/send, analytics:read, admins:read/write, audit:read.

### Remote settings (`app_settings`)

| Setting | What it controls |
|---|---|
| maintenance | Message that replaces the app while enabled |
| app_version | Minimum/latest version and update message |
| feature_flags | games, artAndCraft, didYouKnow, liveMirroring, pushNotifications, showInDevelopmentGames, studyPlayfully, music, sports, rankings, rewardShop, ads, adSupportedAccess |
| rewards | Coin amounts per activity, daily cap, shop on/off |
| rankings | Board size, bracket filter, improvement view, minimum games to appear |
| ads | enabled, first-ad and between-games targets, minimum gap, per-hour and per-day caps, load timeout, test mode |
| texts | Copy that can change without an app update |
| limits | Defaults for new child profiles |

## 13. App structure (screens, navigation, UI kit)

Navigation: one stack — Welcome → guardian auth (register, login, OTP, recovery) → guardian tabs (Dashboard, Children, Plan, Settings) or player login → player tabs (**Home, Games, Learn, Facts, Me**). Stack screens: ChildDetail, ChildEditor, Controls, ChildLearning, ChildRewards, Mirror, Subscription, ChangePassword, StepUp, GameDetail, GamePlay, CraftLibrary, CraftDetail, FactDetail, LearnSection, Subject, Lesson, Rankings, Leaderboard, Rewards, AdultGate, Legal. An adult gate (a multiplication question) protects the switch from player to guardian.

Player screens: PlayerLogin, PlayerHome, Games, GameDetail, GamePlay, Facts, FactDetail, CraftLibrary, CraftDetail, Learn, LearnSection, Subject, Lesson, Rankings, Leaderboard, Rewards, Progress (Me), AdultGate. Guardian screens: auth screens, Dashboard, Children, ChildDetail, ChildEditor, Controls, ChildLearning, ChildRewards, Mirror, Subscription, Settings, StepUp.

UI kit: two visual identities on one token system (player = playful, guardian = calm), light and dark. Playful components: PlayfulBackdrop, BigButton, RoundButton, CandyCard, Chip, Badge, Stars, ProgressBar, Confetti, Bob, PopIn, EmojiDisc; shared: AppText, Avatar, Button, Card, Icon, Screen, SegmentedControl, SettingRow, States, TabBar, TextField. Fonts: Fredoka and Nunito. Strings: English (~586 keys) and Hindi (~229 keys, English fallback). Reduced-motion support via `useReducedMotion` and a guardian setting.

App state: `GuardianContext`, `PlayerContext` (catalogue/progress cached for offline reads, heartbeat loop), `RemoteConfigContext` (server config), realtime client with reconnect and back-off. Storage: SecureStore for tokens, AsyncStorage for tutorial-seen flags and ad counters.

Platform notes: web builds never import the native AdMob module (platform-split loader); billing (`expo-iap`) and notifications are lazily required so Expo Go and the web still run.

## 14. Configuration reference

### Backend environment variables

`NODE_ENV, PORT, DATABASE_URL, DATABASE_POOL_MAX, TRUST_PROXY, CORS_ORIGINS, ADMIN_SESSION_TTL_HOURS, GUARDIAN_SESSION_TTL_DAYS, PLAYER_SESSION_TTL_DAYS, DELETION_COOLING_OFF_DAYS, EXPO_ACCESS_TOKEN, EXPO_PUSH_URL, RESEND_API_KEY, EMAIL_FROM, MAIL_DEV_LOG, SMS_PROVIDER (msg91 | twilio | console), MSG91_AUTH_KEY, MSG91_TEMPLATE_ID, TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM, DEFAULT_COUNTRY_CODE, OTP_TEST_NUMBERS, OTP_TEST_NUMBERS_ALLOW_PRODUCTION, OTP_RESEND_COOLDOWN_S, SUBSCRIPTION_PRODUCT_ID, SUBSCRIPTION_PRICE_INR, GOOGLE_PLAY_PACKAGE_NAME, GOOGLE_PLAY_SERVICE_ACCOUNT_JSON, GOOGLE_PLAY_RTDN_TOKEN, RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, RAZORPAY_PLAN_ID, RAZORPAY_WEBHOOK_SECRET, BILLING_SANDBOX, EVENTS_RETENTION_DAYS, SCREEN_TIME_RETENTION_DAYS, SOURCE_MAINTENANCE_ENABLED, SOURCE_CHECK_INTERVAL_HOURS, SOURCE_FETCH_TIMEOUT_MS, SOURCE_FETCH_RETRIES, SOURCE_MIN_REQUEST_INTERVAL_MS, SOURCE_MAX_CHECKS_PER_RUN, SOURCE_BOT_CONTACT, SOURCE_DISCOVERY_FEEDS, SOURCE_DISCOVERY_ALLOWED_DOMAINS, SOURCE_DISCOVERY_MAX_PER_RUN, FACT_INGEST_ENABLED, FACT_INGEST_AUTO_PUBLISH, FACT_INGEST_MAX_PER_RUN, ADMOB_INTERSTITIAL_UNIT_ANDROID, ADMOB_INTERSTITIAL_UNIT_IOS`

### App (`.env`)
`EXPO_PUBLIC_API_URL` (required; an empty value shows "No server configured"), `EXPO_PUBLIC_APP_ENV`, `EXPO_PUBLIC_PRIVACY_POLICY_URL`, `EXPO_PUBLIC_TERMS_URL`, `EXPO_PUBLIC_SUPPORT_EMAIL`. Admin (`.env.local`): `API_URL`.

### Local run order
1. `cd backend` → `.env` → `npm install` → `npm run db:migrate` → set `ADMIN_BOOTSTRAP_EMAIL` / `ADMIN_BOOTSTRAP_PASSWORD` → `npm run seed:admin` → `npm run dev`.
2. `cd admin` → `.env.local` → `npm install` → `npm run dev`.
3. Repo root → `.env` with `EXPO_PUBLIC_API_URL` → `npm install` → `npm run web` (add the web origin to `CORS_ORIGINS`).

## 15. Tests and quality

| Suite | Tests | Notes |
|---|---|---|
| backend/tests (vitest + supertest, real PostgreSQL) | 157 | admin 29, sourceRegistry 27, player 18, guardianAuth 13, learning 13, household 12, rewards 11, subscription 11, rankings 6, mirroring 4, cleanup 1 |
| tests/ (node --test) | 34 | game rules incl. Ludo track geometry (28 in games.test.ts) and tutorial coverage |
| App typecheck (tsc) | clean | strict TypeScript |
| Admin typecheck + next build | clean |  |
| Expo web export | succeeds |  |
| Browser smoke (Playwright) | pass | login, Home, Learn, lessons, Rewards, Rankings, Ludo tutorial/pass-and-play/Help/Replay, chess undo, 10 grid boards |

Bugs found by the browser pass and fixed: Ludo track had 51 of 52 cells (board crashed on load); every wrapped grid board was sized without its border so the last cell wrapped.

## 16. Known limitations and next steps

- Curriculum mappings are all `pending_review`; a reviewer must verify them before any "aligned" label shows.
- Only 1 lesson exists for some subjects/ages (English, Hindi, GK, Thinking, most sports); the app shows honest "coming soon" states. More lessons are the biggest content gap.
- Music lessons teach on screen only; real-instrument technique is not assessed.
- Native Android/iOS builds were typechecked and exported for web but not run on a physical device in the build environment. Expo Go cannot run the AdMob module (the app skips ads there).
- AdMob: real app ids (`app.json`) and unit ids (server env) are not set; Google sample ids and test mode are used. The app must be registered as child-directed in AdMob.
- Production needs: migration 0008, real SMS provider, Google Play / Razorpay credentials, CORS origins, `EXPO_PUBLIC_API_URL`.
- Rate-limit counters are in memory (fine for one API instance; use a shared store if scaled out).
- Hindi covers fewer strings than English (fallback to English).
- Full list: `docs/KNOWN_LIMITATIONS.md`.

## Related documents

`docs/ARCHITECTURE.md`, `docs/API.md`, `docs/LEARNING.md`, `docs/RANKINGS_REWARDS.md`, `docs/ADS.md`, `docs/SUBSCRIPTIONS.md`, `docs/SECURITY_PRIVACY.md`, `docs/SOURCE_REGISTRY.md`, `docs/DEPLOYMENT.md`, `docs/GAMES_STATUS.md`, `docs/DESIGN_SYSTEM.md`, `docs/OTP_PROVIDERS.md`, `docs/STORE_SUBMISSION.md`, `docs/KNOWN_LIMITATIONS.md`.
