# LoJi

Games, art & craft and "Did You Know?" discoveries for children aged 3–12, with a Guardian
Console where grown-ups set the rules, follow progress and watch a game live. One monthly
subscription per family unlocks everything.

This repository contains the whole product:

| Part | Folder | Stack | Runs on |
|---|---|---|---|
| **App** (Android, iOS **and the website**) | `/` (repo root) | Expo SDK 57, React Native 0.86, React 19, TypeScript | Phones via EAS Build; the web via `expo export --platform web` (static files) |
| **API** | [`/backend`](backend) | Node 22, Express 5, Drizzle ORM, PostgreSQL 16, WebSocket | Any container host (Render, Railway, Fly…) |
| **Admin console** | [`/admin`](admin) | Next.js 16, React 19 | Vercel (or any Node host) |

```
 ┌────────────────────────────┐   HTTPS /v1/*  (guardian or player bearer token)   ┌───────────────────────┐
 │ LoJi app                   │ ─────────────────────────────────────────────────▶ │                       │
 │ Guardian Console           │   WSS /v1/ws   (child status · live game mirror)   │   LoJi API            │     ┌──────────────┐
 │ Player Console             │ ◀────────────────────────────────────────────────▶ │   Express + Drizzle   │ ──▶ │ PostgreSQL   │
 │ Android · iOS · Web        │                                                     │   OTP · entitlements  │     └──────────────┘
 └────────────────────────────┘                                                     │   parental controls   │ ──▶ Google Play Developer API
 ┌────────────────────────────┐   browser → same-origin proxy (httpOnly cookie)    │   catalogue · facts   │ ──▶ Razorpay (website)
 │ Admin console (Next.js)    │ ──────────────────────────────── /admin/v1/* ────▶ │   RBAC · audit log    │ ──▶ MSG91 / Twilio (OTP SMS)
 └────────────────────────────┘                                                     └───────────────────────┘ ──▶ Expo Push
```

## What is in the box

- **Two consoles in one app.** Guardians register with name + mobile + OTP + password, add
  child profiles (nickname, birth month only, auto age bracket, avatar, Player ID, PIN) and
  manage a **mandatory monthly subscription**. Children sign in with Player ID + PIN (and,
  if the guardian wants, a code sent to the guardian's phone).
- **Four age brackets** — A Little Explorers 3–5 · B Brain Builders 6–8 · C Mind Masters 9–10 ·
  D Junior Strategists 11–12 — drive which games, crafts and facts a child sees, the reading
  level and the UI density.
- **40 playable games** on one pure-reducer engine (restart, pause, save, unit tests and live
  mirroring come for free). See [docs/GAMES_STATUS.md](docs/GAMES_STATUS.md).
- **Art & Craft studio**: origami and paper crafts with animated fold diagrams, materials,
  hazard warnings that force adult supervision, checklists; drawing and colouring on screen.
- **Did You Know?**: 21 categories, every fact tied to a publisher source, an automatic
  free-licence source registry (33 sources, verified from licence evidence, see
  [docs/SOURCE_REGISTRY.md](docs/SOURCE_REGISTRY.md)), a
  draft → verified → published workflow in the admin console, quizzes, daily discovery,
  favourites, history and narration.
- **Parental controls enforced by the server**: daily and per-session limits, play windows,
  bedtime, blocked categories/games, allowed brackets, sound/narration, new-device approval,
  pause/end from the dashboard, session history and weekly screen time.
- **Live mirror**: an authenticated WebSocket relays the game board (only the board, never the
  device) to the guardian, with a privacy indicator on the child's screen and nothing stored
  once the session ends.
- **Subscriptions** verified server-side with Google Play Billing (plus real-time developer
  notifications) on Android and Razorpay on the website; a full state machine
  (never subscribed → pending → active ⇄ grace/billing retry → expired, cancelled-but-entitled,
  revoked) and enforcement on both the server (HTTP 402) and the client.
- **Admin console** with roles (super admin, admin, editor, fact checker, support), catalogue
  editors, subscription support actions, feature flags, system health and an audit log.

## Quick start (local development)

Prerequisites: Node 22+, PostgreSQL 16, and either the Expo Go app or a browser.

```bash
# 1. API
cd backend
cp .env.example .env            # set DATABASE_URL; keep SMS_PROVIDER=console and BILLING_SANDBOX=true locally
npm install
npm run db:migrate              # also seeds brackets, categories, 40 games, crafts and facts
ADMIN_BOOTSTRAP_EMAIL=you@example.com ADMIN_BOOTSTRAP_PASSWORD='Choose-A-Long-Pass1' npm run seed:admin
npm run dev                     # http://localhost:4000  (OTP codes print to this terminal)

# 2. Admin console (new terminal)
cd admin
cp .env.example .env.local      # API_URL=http://localhost:4000
npm install && npm run dev      # http://localhost:3000

# 3. App (new terminal, repo root)
cp .env.example .env            # EXPO_PUBLIC_API_URL=http://<your-LAN-IP>:4000 (http://localhost:4000 for web)
npm install
npm run web                     # website at http://localhost:8081  (add it to the API's CORS_ORIGINS)
npm start                       # or scan the QR code with Expo Go
```

Register as a guardian (the code is printed by the API), press **Activate test subscription**
on the Plan tab (sandbox billing), add a child, then open the Player Console.

## Tests

```bash
cd backend && npm test          # 99 API tests against a real PostgreSQL (TEST_DATABASE_URL)
npm test                        # 30 game-rule tests (node --test, no React)
npx tsc --noEmit                # app · cd backend && npm run typecheck · cd admin && npm run typecheck
node e2e/smoke.mjs              # browser smoke test of the web build (see e2e/README.md)
```

## Documentation

- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — modules, database schema, security model, offline behaviour
- [docs/API.md](docs/API.md) — every endpoint and the WebSocket protocol
- [docs/SOURCE_REGISTRY.md](docs/SOURCE_REGISTRY.md) — the automatic free-licence source registry and fact pipeline
- [docs/GAMES_STATUS.md](docs/GAMES_STATUS.md) — the 40 games, brackets and what each one does
- [docs/SUBSCRIPTIONS.md](docs/SUBSCRIPTIONS.md) — Google Play Billing and Razorpay setup, state machine, testing
- [docs/OTP_PROVIDERS.md](docs/OTP_PROVIDERS.md) — MSG91 / Twilio setup and test numbers for store review
- [docs/SECURITY_PRIVACY.md](docs/SECURITY_PRIVACY.md) — child-privacy and security checklist (DPDP, Google Play Families)
- [docs/DESIGN_SYSTEM.md](docs/DESIGN_SYSTEM.md) — the playful player theme and the calm guardian theme
- [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) — hosting the API, the website and the console
- [docs/STORE_SUBMISSION.md](docs/STORE_SUBMISSION.md) — Google Play (Families) and App Store steps
- [docs/CREDENTIALS.md](docs/CREDENTIALS.md) — every account and secret you need to provide
- [docs/KNOWN_LIMITATIONS.md](docs/KNOWN_LIMITATIONS.md) — what is not verified or not built yet

## Repository layout

```
App.tsx, src/              Expo app (both consoles, game engine, crafts, realtime client)
  src/games/               engine.ts · registry.ts · defs/ (40 games) · logic/ (pure rules) · shared/
  src/crafts/              FoldDiagram (SVG) · built-in origami models
  src/screens/guardian     Guardian Console   src/screens/player  Player Console
  src/context              Guardian/Player sessions, realtime, remote config
  src/theme, src/ui        design tokens and component kit (player + guardian identities)
tests/                     game-rule tests (node:test)
e2e/                       Playwright smoke scripts for the web build
backend/src                API: routes/public (guardian, household, subscription, player, webhooks)
                           routes/admin · services (entitlement, billing, controls, catalogue, progress)
                           realtime/hub.ts · catalogue (games, crafts, facts seeds) · database (schema, migrations)
admin/src                  Next.js console
docs/                      documentation
```
