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
- [docs/SPACES.md](docs/SPACES.md) — the balcony, the garden, the museum, jigsaws, coins
- [docs/PARADISE_GARDEN.md](docs/PARADISE_GARDEN.md) — the Paradise Garden: views, segments, growth sizes, placement, rendering

## Tests

```bash
cd backend && npm test          # 63 integration tests against a real PostgreSQL database
cd admin && npm run build       # type-checked production build
npx tsc --noEmit                # mobile app (repo root)
node --experimental-strip-types tools/checks/growth_sizes.mjs     # minutes → the seven growth sizes
node --experimental-strip-types tools/checks/paradise_layout.mjs  # garden capacity and placement
```

CI (`.github/workflows/ci.yml`) runs all of the above plus Android/iOS bundle exports on every push.

## Core mechanic (mobile)

- Pick a length on the circular dial (5–180 min, 5-min steps) and an image: bundled art,
  a quote tile, your own photo, or the online library managed from the admin console.
- The picture is covered by tiles that flip away in a spread-out order as time passes
  (`src/hooks/useFocusTimer.ts`, `src/components/PuzzleGrid.tsx`). A completed session of
  fifteen minutes or more keeps the picture as a framed jigsaw in one of seven sizes, to hang in
  the museum or on the balcony wall (`docs/SPACES.md`).
- Or pick a plant: the session shows only soil and a seed that grows second by second as the
  minutes pass, to one of seven sizes (15, 30, 60, 90, 120, 150, 180 minutes), and it keeps
  its place in the garden, or on the balcony (room for 26 plants), until the person removes it
  (`docs/PARADISE_GARDEN.md`).
- Bilingual: English (UN English) and Hindi, asked in a popup every time the app opens and
  changeable in Settings
  (`src/i18n/`); the plant catalog has its own Hindi names and descriptions.
- The picture library's Nature collection always includes two Himalayan landscapes bundled with
  the app (`assets/library/`, CC BY 4.0, credits in `assets/library/CREDITS.csv`); Monuments come
  from the library's Heritage collection when it is connected.
- Leaving the app starts a grace period (default 5 s, configurable from the admin console);
  stay away longer and the session fails.
- The balcony, the Paradise Garden, the museum and preferences stay on the device.
