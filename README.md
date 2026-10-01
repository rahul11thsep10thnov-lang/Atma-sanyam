# FOCUS

A calm focus timer where a jigsaw puzzle assembles itself while you stay on task.
Leave the app mid-session and the puzzle stays unfinished.

This repository contains the whole product:

| Part | Folder | Stack | Runs on |
|---|---|---|---|
| **Mobile app** (Android + iOS) | `/` (repo root) | Expo SDK 57, React Native 0.86, TypeScript | Phones (EAS Build → Play Store / App Store) |
| **API** | [`/backend`](backend) | Node 22, Express 5, Drizzle ORM, PostgreSQL | Any container host (Render, Railway, Fly…) |
| **Admin console** | [`/admin`](admin) | Next.js 16, React 19, TypeScript | Vercel (or any Node host) |

```
 ┌──────────────────────┐        HTTPS (Bearer token)         ┌───────────────────────┐
 │  FOCUS mobile app    │ ──────────────  /v1/*  ───────────▶ │                       │
 │  iOS · Android       │                                      │   FOCUS API           │     ┌──────────────┐
 └──────────────────────┘                                      │   Express + Drizzle   │ ──▶ │ PostgreSQL   │
                                                               │   auth · RBAC · rate  │     └──────────────┘
 ┌──────────────────────┐   browser → same-origin proxy        │   limits · audit log  │
 │  Admin console       │   (httpOnly cookie) → /admin/v1/* ─▶ │                       │ ──▶ Expo Push → APNs/FCM
 │  Next.js on Vercel   │                                      │                       │ ──▶ Resend (reset emails)
 └──────────────────────┘                                      └───────────────────────┘
```

The mobile app still works **fully offline with no server** (bundled art, quotes, own
photos, demo library) — exactly as before — so Expo Go testing keeps working.

## Quick start (local development)

Prerequisites: Node 22+, PostgreSQL 16 (or a free Neon database), the Expo Go app on your phone.

```bash
# 1. API
cd backend
cp .env.example .env            # set DATABASE_URL
npm install
npm run db:migrate
ADMIN_BOOTSTRAP_EMAIL=you@example.com ADMIN_BOOTSTRAP_PASSWORD='Choose-A-Long-Pass1' npm run seed:admin
npm run seed:content            # category tree (add --with-samples for placeholder drafts)
npm run dev                     # http://localhost:4000

# 2. Admin console (new terminal)
cd admin
cp .env.example .env.local      # API_URL=http://localhost:4000
npm install
npm run dev                     # http://localhost:3000 → sign in with the admin above

# 3. Mobile app (new terminal, repo root)
cp .env.example .env            # EXPO_PUBLIC_API_URL=http://<your-computer-LAN-IP>:4000
npm install
npm start                       # scan the QR code with Expo Go
```

Leave `EXPO_PUBLIC_API_URL` empty to run the app without any server.

## Documentation

- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — structure, database schema, security model
- [docs/API.md](docs/API.md) — every endpoint
- [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) — putting the API, database and admin console online
- [docs/STORE_SUBMISSION.md](docs/STORE_SUBMISSION.md) — building and submitting to Google Play and the App Store
- [docs/CREDENTIALS.md](docs/CREDENTIALS.md) — every account/key you need, where to get it, where it goes
- [docs/PLANT_LIBRARY.md](docs/PLANT_LIBRARY.md) — the 100-plant image library: template, manifest, generation pipeline, QC
- [docs/FOCUS_ENVIRONMENT_ENGINE.md](docs/FOCUS_ENVIRONMENT_ENGINE.md) — the living balcony: time of day, weather, the sunlight reward

## Tests

```bash
cd backend && npm test          # 63 integration tests against a real PostgreSQL database
cd admin && npm run build       # type-checked production build
npx tsc --noEmit                # mobile app (repo root)
npm run plants:check            # the 100-plant library: files, names, sizes, manifest
```

## Plant library

`assets/plants/FOCUS_PLANT_LIBRARY/` holds 100 separate plant images (one plant
per file, same camera, same soil cutaway, same sunlight) plus
`plant_manifest.json`. The files committed are procedural placeholders on the
final template; `npm run plants:generate -- --provider openai` replaces them
with photorealistic renders job by job, with a vision QC pass, and
`npm run plants:zip` packs `FOCUS_100_INDIAN_PLANTS_LIBRARY.zip`. See
[docs/PLANT_LIBRARY.md](docs/PLANT_LIBRARY.md).

CI (`.github/workflows/ci.yml`) runs all of the above plus Android/iOS bundle exports on every push.

## Core mechanic (mobile)

- Pick a length on the circular dial (5–180 min, 5-min steps) and an image: bundled art,
  a quote tile, your own photo, or the online library managed from the admin console.
- The picture is covered by tiles that flip away in a spread-out order as time passes
  (`src/hooks/useFocusTimer.ts`, `src/components/PuzzleGrid.tsx`).
- Leaving the app starts a grace period (default 5 s, configurable from the admin console);
  stay away longer and the session fails.
- History ("Garden") and preferences stay on the device.
