# DADU – Dadaji's Miniverse

**Learn, Play, Explore and Grow!** An immersive, multilingual Indian child-development universe for
ages 0–12, taught by Dadaji with Chintu, Buddy, Chikki, Gauri, Nandu and Mitthu the revision parrot.
Premium chibi-anime art, a modern Indian villa, a hybrid isometric/side-view world, and the eight
learning sections organised into twelve interconnected worlds.

| Part | Folder | What is there |
|---|---|---|
| Mobile app (Expo 58) | `src/dadu/` | core registries and world simulation, engines (lesson, activities, mastery, rewards, assignments, screen time, stories, sync), bilingual content (52 lessons, 12 stories, 51 assignments, 167 objects), SVG character rigs and scenes, screens, audio, API client |
| API | `backend/src/dadu`, `backend/src/routes/{public,admin}/dadu.ts` | child profiles, consent, world state, progress sync, mastery, assignments, screen rules, content, packs, flags; eight-step editorial workflow; migration `drizzle/0006_dadu.sql` |
| Admin console | `admin/src/app/(console)/dadu/` | content editor with workflow and versions, translations, assets, packs, flags, parent support |
| Design and status docs | `docs/dadu/` | canon (`00-canon.md`, `00-visual-canon-v3.md`), 23 design documents, `IMPLEMENTATION_AUDIT.md`, `FEATURE_COMPLETION_MATRIX.md`, `TEST_REPORT.md`, `PERFORMANCE_REPORT.md`, `RELEASE_READINESS.md`, `INCOMPLETE_FEATURE_REPORT.md` and the other registries |
| Prototype | `prototype/dadu/index.html` | the original v2 visual prototype (superseded by the app) |

The app boots into DADU (`DADU_ENABLED` in `src/config/features.ts`); the earlier Tame focus timer
is preserved behind the parental gate and an off-by-default switch in Settings.

### Run DADU

```bash
npm install
npm start                      # Expo Go (works fully offline, no server needed)
npx tsc --noEmit               # typecheck
npm run test:dadu              # 43 unit tests (engines, simulation, content validation, render maths)
npx expo export --platform web --output-dir /tmp/dadu-web && node tools/dadu/e2e-web.js /tmp/dadu-web A2   # end-to-end drive (Playwright)
cd backend && npm run db:migrate && npm run seed:dadu && npm test   # API with 157 tests against PostgreSQL
```

Honest status: the product is a working, tested app in English and Hindi with device text-to-speech
narration; recorded voices, music, the other twelve languages, store builds and the legal texts are
still open. See `docs/dadu/RELEASE_READINESS.md` and `docs/dadu/INCOMPLETE_FEATURE_REPORT.md`.

---

## Legacy foundation: Tame

A calm focus timer where a jigsaw puzzle assembles itself while you stay on task.
Leave the app mid-session and the puzzle stays unfinished.

This repository contains the whole product:

| Part | Folder | Stack | Runs on |
|---|---|---|---|
| **Mobile app** (Android + iOS) | `/` (repo root) | Expo SDK 58, React Native 0.88, TypeScript | Phones (EAS Build → Play Store / App Store) |
| **API** | [`/backend`](backend) | Node 22, Express 5, Drizzle ORM, PostgreSQL | Any container host (Render, Railway, Fly…) |
| **Admin console** | [`/admin`](admin) | Next.js 16, React 19, TypeScript | Vercel (or any Node host) |

```
 ┌──────────────────────┐        HTTPS (Bearer token)         ┌───────────────────────┐
 │  Tame mobile app    │ ──────────────  /v1/*  ───────────▶ │                       │
 │  iOS · Android       │                                      │   Tame API           │     ┌──────────────┐
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
- The picture is covered by about 10,000 jigsaw pieces. Each second some of them open, spread evenly over the whole picture (about 10,000 ÷ the session's seconds a second: roughly 5 a second in 30 minutes), and flip away as time passes
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
- The picture library ships with 206 pictures inside the app (`assets/library/`), so there is
  always something to reveal, online or not: under **Nature** (Mountains, Himalayas, Lakes, Rivers,
  Waterfalls, Valleys, Coast, Forests, Flowers, Vintage prints), **Wildlife** (Birds, Butterflies,
  Animals) and **Inspirational** (100 quote cards). They lead each collection, ahead of what the
  online library returns, with titles in English and Hindi.
  `assets/library/README.md` says where each picture came from; `tools/library/build_library.py`
  and `tools/library/build_quotes.py` rebuild them from the original zips.
- Accounts are optional and phone-first: a one-time SMS code signs you in (and creates the account
  the first time), then a password (6–15 characters: capital, small, number, special), a unique
  username with a live availability check, and an avatar. The small **Sign in** chip sits at the
  top right of Home. The API needs an SMS provider (`docs/DEPLOYMENT.md`); without one the app
  hides phone sign-in. Social features (friends, group focus) are planned on top: `docs/SOCIAL.md`.
- Settings → Legal holds the policies: `src/legal/documents.ts`. An offline build (no
  `EXPO_PUBLIC_API_URL`, which is version 1) shows Terms, Privacy and Subscription & refund written
  for an app that keeps everything on the phone; an online build adds Account deletion and Community
  guidelines. `tools/legal/build_legal_html.mjs` (`LEGAL_MODE=offline|online`) turns the same text
  into the public web page Google Play needs. Store texts: `docs/STORE_LISTING.md`.
- Membership and rewarded ads are placeholders and stay hidden (`src/config/features.ts`).
- Anyone you meet in the app (friends, requests, search results, a group lobby) can be reported:
  a reason, an optional note and an optional block. Moderators see reports in the admin console
  under *Reports*. The session dial can also be typed into: tap its
  number and enter minutes in multiples of 5.
- Leaving the app starts a grace period (default 5 s, configurable from the admin console);
  stay away longer and the session fails.
- The balcony, the Paradise Garden, the museum and preferences stay on the device.
