# LoJi — Project Summary (for analysis)

Generated from the code in branch `claude/loji-platform-build-rqawk2`. Counts come from the
source files, not from memory. Secrets are deliberately left out.

## 1. What it is

LoJi is a games, learning and guardian-controls platform for children aged 3 to 12.

- **Players (children)** sign in with a Player ID and PIN (optionally a code sent to the
  guardian's phone). They play 40 games, do pictorial tutorials, take lessons in Study /
  Music / Sports, read sourced "Did You Know?" facts, make paper crafts, earn coins and
  appear on pseudonymous leaderboards.
- **Guardians (parents)** register with phone + password + OTP, subscribe (mandatory),
  add children and control screen time, content, rankings, the reward shop, learning
  preferences and subjects. They can watch a live mirror of a child's game.
- **Admins** use a web console to manage games, facts, lessons, crafts, sources, rewards,
  subscriptions, settings and audit logs, with role-based permissions.

## 2. Architecture

```
Expo app (React Native 0.86, React 19, Expo SDK 57)   web + Android + iOS
   │  REST /v1/guardian, /v1/player, /v1/config, /v1/events      WebSocket /v1/ws
   ▼
Express 5 API (TypeScript, Drizzle ORM, zod, helmet, rate limits)
   │
   ▼
PostgreSQL 16  (49 tables, 9 migrations 0000–0008)

Next.js 16 admin console ──▶ /admin/v1/* on the same API (RBAC + audit log)
```

| Part | Folder | Run | Address |
|---|---|---|---|
| API + DB tools | `backend/` | `npm run dev` | http://localhost:4000 |
| Admin console | `admin/` | `npm run dev` | http://localhost:3000 |
| App (web / phone) | repo root | `npm run web` / `npm start` | http://localhost:8081 |

## 3. Size

| Area | Files | Lines |
|---|---|---|
| App `src/` | 178 | ~20,300 |
| API `backend/src/` | 89 | ~15,300 |
| Admin `admin/src/` | 46 | ~4,000 |
| API tests `backend/tests/` | 13 | ~2,700 |
| Root tests `tests/` | 2 | ~430 |
| Docs `docs/` | 15 | ~1,600 |

API route definitions: about 181. Admin pages: 27.

## 4. Main features

### Games (40)
Matching and memory, puzzles, words, numbers and logic, board and strategy (Chess, Ludo,
Snakes and Ladders, Checkers, Connect Four, Chess Tactics), arcade, sports, creative,
simulation and quizzes. Rules are pure reducers in `src/games/logic` and are unit-tested.
Every game has a 5-step pictorial tutorial (`src/games/tutorials`).

### Learning academy (50 seeded lessons)
Three sections with an age framework A–D for each year from 3 to 12. A child sees "My age"
by default and can explore other ages and levels. Each lesson follows a 9-step template and
has a sourced "Did You Know?" (50 of 50).

| Section / subject | Lessons | Ages |
|---|---|---|
| Maths | 5 | 3, 5, 7, 9, 11 |
| Vedic Maths | 2 | 8, 11 |
| Physics | 3 | 4, 8, 11 |
| Chemistry (safe only) | 3 | 6, 9, 12 |
| Biology | 3 | 3, 7, 10 |
| Environment | 3 | 5, 8, 11 |
| History | 3 | 6, 9, 12 |
| Geography | 3 | 4, 8, 10 |
| Computers | 3 | 5, 8, 11 |
| English / Hindi / General Knowledge / Thinking | 1 each | 4 / 5 / 9 / 10 |
| Music: Piano / Tabla / Guitar | 4 / 3 / 2 | 3–12 |
| Sports: Cricket 2; Football, Badminton, Squash, Basketball, Volleyball, Table Tennis, Swimming 1 each | 9 | 5–10 |

Curriculum mappings (NCERT, CBSE, CISCE, IB PYP, IB MYP) are all `pending_review`. The label
"Aligned with the selected curriculum topic" appears only after an admin verifies a mapping.

### Rewards, rankings and ads
- **Coins**: append-only ledger with idempotency keys and a daily cap; non-monetary shop; no
  loot boxes.
- **Rankings**: written by the server only, validated per game (minimum time, score bounds),
  Elo-style rating for chess, pseudonymous names, guardian can switch off.
- **Ads**: child-directed AdMob interstitials with frequency caps, never during gameplay;
  subscribers are ad-free. Off or test units until real ids are configured.

### Guardian controls
Daily time limits, schedules, content and subject blocking, curriculum framework and grade,
learning goals, rankings and shop switches, coin cap, reduced motion, live game mirror,
per-child learning and rewards reports.

## 5. Where things live

```
src/
  api/ context/ services/ realtime/      app plumbing (API client, sessions, WebSocket)
  navigation/                            stack + player tabs (Home, Games, Learn, Facts, Me)
  screens/player/ screens/guardian/      console screens; screens/player/learn/ = academy
  games/ engine.ts registry.ts defs/ logic/ shared/ tutorials/   40 games
  learning/ types, visuals/, activities/, LessonPlayer          lesson engine
  ads/ billing/ crafts/ i18n/ ui/ theme/ legal/
backend/src/
  routes/public/ (guardian, player, household, subscription, webhooks)
  routes/admin/  (admins, auth, catalogue, content, guardians, insights, learning,
                  notifications, settings, sources, subscriptions)
  services/      (coins, rankings, learning, entitlement, progress, sessions, settings,
                  billing, source registry, fact ingestion, daily challenge ...)
  catalogue/     games, crafts, facts, lessons/ (the 50 lessons as data)
  database/      schema.ts, migrations in backend/drizzle/, seedCatalogue.ts, seedAdmin.ts
admin/src/app/(console)/   27 pages
docs/                      ARCHITECTURE, API, LEARNING, RANKINGS_REWARDS, ADS, SUBSCRIPTIONS,
                           SECURITY_PRIVACY, DEPLOYMENT, GAMES_STATUS, KNOWN_LIMITATIONS ...
```

## 6. Database tables (49)

account_deletion_requests, achievements, admin_sessions, admins, age_brackets, app_settings,
audit_logs, billing_events, categories, child_achievements, child_rewards, children,
coin_transactions, content, content_approvals, craft_progress, craft_tutorials, devices,
entitlements, events, fact_sources, fact_views, facts, favourite_games, game_categories,
game_progress, game_sessions, games, guardian_sessions, guardians, learning_levels,
lesson_progress, lessons, mirror_sessions, notifications, otp_challenges, parental_controls,
permissions, player_ratings, player_sessions, quiz_attempts, quiz_questions, ranking_events,
reward_items, role_permissions, roles, screen_time_records, source_verification_events,
subscriptions.

## 7. Key dependencies

- **App**: expo ~57, react-native 0.86.3, react 19.2, React Navigation 7, expo-audio,
  expo-iap (Google Play billing), expo-notifications, expo-secure-store,
  react-native-google-mobile-ads, lucide-react-native.
- **API**: express 5, drizzle-orm, pg, zod 4, helmet, express-rate-limit, ws; tests with
  vitest + supertest.
- **Admin**: next 16, react 19.

## 8. Security and privacy design

- Guardian sign-in needs password and OTP; sensitive actions need a fresh step-up OTP.
- Session tokens are random and stored hashed. Player PIN has lockout; new-device approval.
- Rate limits on login, OTP, billing and heartbeat; OTP sends capped per phone per hour.
- Ranking and coin results are decided on the server, never taken from the client.
- Role-based admin permissions with an audit log. Parental controls enforced server-side.
- Ads are child-directed and capped; no third-party accounts in lessons.

## 9. Tests and status

| Check | Result |
|---|---|
| API tests (vitest, real PostgreSQL) | 157 pass |
| Root game/tutorial/content tests | 34 pass |
| App, admin and API typecheck | clean |
| Expo web export, admin `next build` | succeed |
| Browser smoke (Playwright) | main flows pass, no page errors |

## 10. Known gaps and things to configure

- Curriculum mappings are unverified (`pending_review`) until a reviewer signs them off.
- Music lessons are on-screen only; the app cannot assess real-instrument technique.
- Native builds were typechecked and exported for web, not run on a physical device here.
- Real AdMob app ids (in `app.json`) and unit ids (server env) are not set; sample ids are used.
- Production needs migration 0008 applied, real SMS and billing provider credentials, and
  `CORS_ORIGINS` set to the real web origin.
- The app needs `EXPO_PUBLIC_API_URL` in `.env`, otherwise it shows "No server configured".

See `docs/KNOWN_LIMITATIONS.md` for the full list.
