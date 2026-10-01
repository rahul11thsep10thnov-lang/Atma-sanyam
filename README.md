# budgettourism — Discover India, Better.

budgettourism is an India-focused tourism encyclopedia and trip planner built around one rule:

> **The database is the source of truth. AI is only the presentation and planning layer.**

Every page, itinerary, budget and route is assembled from stored, traceable records. Nothing is invented, and anything that has not been checked against an official source says so on the page.

## Architecture

```
RAW SOURCES ─▶ STRUCTURED FACTS ─▶ VERIFICATION ─▶ MASTER DATABASE ─▶ DESTINATION GRAPH
                                                                          │
   WEBPAGE ◀─ VALIDATION ◀─ AI CONTENT (structured JSON in, prose out) ◀──┘
      │
      └─▶ SEARCH / CIRCUIT ENGINE / ITINERARY ENGINE / BUDGET ENGINE
```

| Layer | Where | What it does |
|---|---|---|
| Master database | `lib/master/types.ts`, `prisma/schema.prisma` | All spec tables (states, destinations, attractions, history, traditions, transport, connections, circuits, itineraries, costs, food, shopping, festivals, weather, practical info, emergency, experiences, suitability, sources, facts, conflicts, relationships, translations, media, generated content, SEO). Prisma models mirror the TypeScript row types 1:1. |
| Permanent IDs | `lib/master/ids.ts` | `IN-UP` → `IN-UP-VNS` → `IN-UP-VNS-KVT`. Minted once, never reused; slugs can change, IDs cannot. |
| Seed data | `lib/master/seed/*` | Deterministic in-memory build of the database. **All seed facts are `UNVERIFIED`** and point at an official source to check them against. |
| Verification | `lib/master/engine/verification.ts` | Confidence levels; only `VERIFIED` / `PROVISIONALLY_VERIFIED` / `MULTIPLE_SOURCES` may be stated as fact. Stale-fact detection per fact type (hours/fees expire fast, history never). **Conflicts are recorded, never auto-resolved.** |
| Destination graph | `lib/master/engine/graph.ts` | Undirected connection graph (distance, road/rail/air time). Road time is *derived* from distance and flagged as estimated. |
| Circuit engine | `lib/master/engine/circuits.ts` | Routes are chosen by distance, travel time, transport, direction, trip length, theme, season and traveller type — **not** by "same state". Prayagraj + Varanasi is a 3-day route; Prayagraj + Agra is not. |
| Itinerary + budget | `lib/master/engine/{itinerary,budget}.ts` | Day plans from stored attractions, opening hours and visit durations; budget as a labelled *estimate range*. |
| AI content | `lib/master/generation/*` | Structured JSON in → sections out (spec §38 order). `TemplateWriter` is deterministic; `LlmWriter` (Anthropic) is optional. Strict writing rules are enforced by `validator.ts`: any ₹ amount, clock time, year or train number must exist in the input; traditions must be framed as traditions; missing data is reported, not filled. |
| Pipelines | `lib/master/pipeline/*` | `onboard.ts`: auto page creation (validate → slug → record → nearby → attractions → circuits → content → SEO → page → links → index request). `import.ts`: source import (extract → normalise → match entity → conflict check). |

## URL structure

```
/{locale}                                   homepage
/{locale}/india/{state}                     state guide
/{locale}/india/{state}/{destination}       destination guide
   …/where-to-stay  /food  /shopping  /weather  /history
/{locale}/india/{state}/{destination}/{attraction}
/{locale}/trips                             ready-made routes + route finder
/{locale}/trips/{circuit}
/{locale}/itinerary/{destination}/{n}-days
/{locale}/explore   /search   /admin
```

Old URLs (`/hotels`, `/restaurants`, `/attractions/{slug}`, `/itinerary`) redirect permanently (see `next.config.mjs`).

## Languages

English, Hindi, Bengali, Marathi, Tamil, Telugu, Kannada, Malayalam (`en hi bn mr ta te kn ml`).

**Interface** (menus, headings, badges, search, route finder, attraction labels, transport modes) is translated in `locales/<code>/*.json` for all eight languages. `npm run verify:engine` fails if any label or `{placeholder}` is missing in any language; at runtime a missing key would still fall back to English (`lib/i18n/dictionaries.ts`).

**Guide text** (descriptions, history, food, transport, attraction pages, FAQs) comes from the database in English and is translated sentence by sentence into a *translation memory* in `data/translations/<code>.json`:

| Language | Guide text |
|---|---|
| Hindi (`hi`), Bengali (`bn`), Marathi (`mr`), Tamil (`ta`), Telugu (`te`), Kannada (`kn`), Malayalam (`ml`) | Fully translated — 1,240 sentences each, all machine-drafted |

How it works (`lib/master/translation/*`):
- Each entry is keyed by the exact English sentence with the destination's name replaced by `{name}`, so one translation of a templated sentence serves every destination. If the English changes, the old translation is simply no longer used — a stale translation can never sit next to new facts. Missing sentences fall back to English.
- `faithful.ts` rejects any translation that changes a number, price, time or `{name}`/`₹` — checked on every import and by `npm run verify:engine`.
- Proper names (places, dishes, stations) stay as written; destination and state names have transliterations in the same file.
- Pages show *"machine-translated, not yet reviewed by a native speaker"* (or *"partly translated"* while coverage is below 98%).
- **All current guide text in the seven Indian languages is machine-drafted and must be reviewed by native speakers before launch** (Admin → Translations lists status and coverage).

Commands:
```bash
npm run translate -- report                       # coverage + stale entries per language
npm run translate -- export --lang hi --limit 60  # untranslated sentences, as JSON
npm run translate -- import --lang hi batch.json  # merge { "English": "translation" } (validated)
ANTHROPIC_API_KEY=… npm run translate -- auto --lang hi,bn,mr,ta,te,kn,ml   # translate whatever is missing with Claude (validated)
```
When you add or change data, run `report`, then `auto` (or export/import) to translate the new sentences. Adding a language: add `data/translations/<code>.json` (copy `hi.json`'s shape), register it in `lib/master/translation/memory.ts` and `scripts/translate.ts`.

Interface strings: edit `scripts/i18n_data.py` and run `python3 scripts/build_locales.py`.

## Running

```bash
npm install
cp .env.example .env.local     # optional — everything has a safe fallback
npm run dev                    # http://localhost:3000  → /en
npm run lint
npm run typecheck
npm run build && npm start
npm run verify:engine          # 140+ assertions on the engines, pipelines, translations and interface labels
npm run verify:seed-types      # type-checks prisma/seed.ts and scripts against the Prisma client
```

`npm run verify:engine` checks, among others: Prayagraj+Varanasi vs Prayagraj+Agra; ₹50 vs ₹60 conflict detection; stale-fact detection; the fact-check rejecting invented prices, times, years and train numbers; well-formed itineraries for every major destination; Prisma enums matching `lib/master/enums.ts`; onboarding dry-run isolation.

## Environment variables

See `.env.example`. Nothing is required to browse the site.

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_SITE_URL` | Canonical URLs, sitemap, OpenGraph |
| `DATABASE_URL` | PostgreSQL for Prisma (`npm run prisma:migrate && npm run prisma:seed`) |
| `NEXTAUTH_URL`, `NEXTAUTH_SECRET`, `GOOGLE_CLIENT_ID/SECRET` | Sign-in |
| `ADMIN_EMAILS` | Comma-separated emails allowed into `/admin` in production (otherwise closed) |
| `ADMIN_API_TOKEN` | `x-admin-token` for `/api/admin/*` (required in production unless an admin session is used) |
| `AI_PROVIDER=anthropic`, `ANTHROPIC_API_KEY`, `AI_MODEL` | Optional LLM writer for page prose (`lib/master/generation/llmWriter.ts`) |
| `REQUIRE_EDITOR_APPROVAL=true` | Serve only editor-approved (`PUBLISHED`) content |
| `WEATHER_API_KEY`, `MAP_PROVIDER`, `GOOGLE_MAPS_API_KEY`, `MAPPLS_API_KEY` | Live weather, map provider |
| `HOTEL_BOOKING_API_KEY`, `FLIGHT_AFFILIATE_API_KEY`, `ADVERTISING_*` | Monetisation adapters (`lib/providers/*`) |
| `IMAGE_CDN_BASE_URL`, `S3_*` | Licensed image storage |

## Admin

`/{locale}/admin` — dashboard plus the 23 sections of the spec: states/UTs, districts, destinations, attractions, historical facts, stories/traditions, transport, hotels & areas, food, shopping, festivals, activities, circuits, itineraries, sources, AI content, translations, media, pending verification, conflicts, broken links, analytics, and *Add destination*.

- In development the admin is open; in production only `ADMIN_EMAILS` may enter.
- Every section is a **read-only view** over the master database. `POST /api/admin/pipeline/onboard`, `POST /api/admin/import` and `GET /api/admin/quality` are dry runs (they work on a copy and report what would happen).
- `npm run import:facts -- claims.json` prints the same import report from the command line.

## Honest limits (read before launching)

- **The seed data is unverified editorial data**, labelled *Draft · unverified* on every page. Before launch, work through Admin → Pending verification against each fact's official source. Nothing is presented as verified until a human verifies it.
- **The repository layer is in-memory.** Pages read the seeded database through `lib/master/repo.ts`; the Prisma schema and `prisma/seed.ts` are ready to load the same data into PostgreSQL, but pages are not yet switched to Prisma queries, and the admin/import/onboarding endpoints do not persist. Reviews, trips and wishlist endpoints validate input and say plainly that nothing was stored.
- **Individual hotels and restaurants are intentionally not stored** (the spec defers them until a licensed data source exists). Pages show accommodation *areas* and local *dishes*.
- **Images are generated placeholders**; nothing is scraped. Replace them with licensed media through the `media` table (each record carries rights, licence and credit).
- Road travel times are estimated from distance (45 km/h, 30 in hills) and flagged as estimates; train/flight times are shown only where a record exists.
- Not built yet: national-park/wildlife, festival and travel-guide page types; live reachability checking of links (the admin link audit is static); real analytics.
- Live weather uses a clearly labelled demo forecast unless `WEATHER_API_KEY` is set.

## Going to production

1. Provision PostgreSQL, set `DATABASE_URL`, run `npm run prisma:migrate` and `npm run prisma:seed`.
2. Set `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `ADMIN_EMAILS` (and `ADMIN_API_TOKEN` for automation).
3. Replace `lib/master/repo.ts` reads with Prisma queries (same function names; the models mirror `types.ts`).
4. Verify facts, replace placeholder media, review the machine-drafted translations.
5. `npm run build && npm start`, and point `NEXT_PUBLIC_SITE_URL` at the real domain.

## Adding an API provider

Weather, maps, hotels, flights and advertising sit behind adapters in `lib/providers/*`; implement the interface and select it in the provider's `get…Provider()`.
