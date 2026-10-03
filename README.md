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
| `GOOGLE_PLACES_API_KEY` | Attraction ratings through the official Places API (otherwise "Rating unavailable") |
| `UNSPLASH_ACCESS_KEY`, `PEXELS_API_KEY`, `PIXABAY_API_KEY` | Extra licensed image sources for the content pipeline (Wikimedia Commons needs no key) |

## Admin

`/{locale}/admin` — dashboard plus the 23 sections of the spec: states/UTs, districts, destinations, attractions, historical facts, stories/traditions, transport, hotels & areas, food, shopping, festivals, activities, circuits, itineraries, sources, AI content, translations, media, pending verification, conflicts, broken links, analytics, and *Add destination*.

- In development the admin is open; in production only `ADMIN_EMAILS` may enter.
- Every section is a **read-only view** over the master database. `POST /api/admin/pipeline/onboard`, `POST /api/admin/import` and `GET /api/admin/quality` are dry runs (they work on a copy and report what would happen).
- `npm run import:facts -- claims.json` prints the same import report from the command line.

## Content CMS and destination pipeline

Every page under `/{locale}/destinations/{slug}` is **one template rendering one record**. Records are JSON documents in `data/cms/destinations/` (bootstrapped from the 27 seed destinations on first run); the admin console edits them and the public page shows the change on its next request — no deploy, no code change, no JSON editing by hand. Settings live in `data/cms/settings.json`, PDF imports in `data/cms/imports/`, and the pipeline cursor in `data/cms/pipeline.json`. The same documents map 1:1 onto the Prisma models when a database is attached.

**Public**

- Homepage: full-width background from the owner's reference photograph at ~16 % opacity, headline *The Earth laughs in flowers.*, centred search with destination + attraction autocomplete, **Who's coming along?** (Couple / Family / Friends / Solo — remembered for the session in the `bt_companion` cookie and used for the *Recommended for …* rail), then Explore India, Popular, By state, Attractions, Historical, Nature & wildlife, Spiritual, Family, Couple-friendly, Solo, Budget and Recently added.
- Destination page: hero (name, state, image, intro, travel facts), sticky tabs **About the place · Historical references · Attractions · Budget hotels · Budget restaurants**, numbered attractions with rating *or* "Rating unavailable", approved images *or* "No approved image available", sources per section, FAQ, `TouristDestination` / `TouristAttraction` / `BreadcrumbList` / `FAQPage` JSON-LD, unique title/description/canonical/OG, sitemap entries for published records only. Unverified history prints *Verified historical information is currently unavailable.* Drafts are invisible to visitors; admins can open them with `?preview=1`.

**Admin → Content** (`/{locale}/admin/cms`)

- Dashboard counts (total / published / draft / pending approval / incomplete / missing images / attractions awaiting image approval / hotels / restaurants / recently updated).
- Destinations table: search, filter, sort, per-row edit / preview / publish / unpublish / duplicate / archive / delete, checkbox bulk edit (publish, unpublish, archive, delete, change state, add/remove category, companion types, SEO title/description templates with `{name}` and `{state}`).
- Editor tabs: Basics, Content (markdown-lite), Attractions (add / edit / delete / reorder / pin manual order / rating with source / images / map URL / sources), Images (hero, gallery, licensed upload), Hotels and Restaurants (every field of the blueprint, add / edit / delete / duplicate / publish per record — nothing is pre-filled), FAQ, SEO, Sources (provenance + pipeline log).
- Image approval: all attractions of one destination on one screen, 1–4 images each, hero choice, one **Approve all selected images** button; the cap of 4 is enforced on the server too.
- Settings: site name, tagline, logo, favicon, default hero, default SEO, social links, contact, footer, copyright, Google Places key, image-source toggles and keys, candidates per attraction, analytics id.

**Pipeline** (`Import PDF` → `Pipeline`)

1. Upload a PDF (or paste a list). The text layer is read with `pdf-parse`; numbering, bullets, headers and page numbers are stripped, "Name, State" lines are split, duplicates (in the file and against existing records) are flagged. You review the list, then confirm.
2. One DRAFT record per confirmed name is created and queued. The pipeline processes **one destination at a time**: `QUEUED → RESEARCHING → ATTRACTIONS → IMAGES → AWAITING_APPROVAL → (you approve images) → FINALIZING → READY_TO_PUBLISH → (you publish) → COMPLETED → next`. Each stage is saved to the record before the next starts, so closing the browser or a crash resumes at the same destination; a failure stops the queue at that destination and *Retry* resumes at the failed stage.
3. Sources: the project's seed database, Incredible India (primary) and Wikipedia (supplementary) for concise original summaries; Google Places API (key required) for attractions, ratings, review counts and Maps links — never scraped; Wikipedia geosearch for nearby places; Wikimedia Commons (free licences only) plus Unsplash / Pexels / Pixabay (keys) for ~10 image candidates per attraction, each stored with URL, thumbnail, source, photographer, licence, attribution requirement, source page, download status and approval status. Approved images are downloaded to `public/media/{slug}/`. Every source call is recorded; an unreachable source is stored as `SOURCE_UNAVAILABLE`, never guessed around.
4. Nothing is published automatically. `npm run verify:engine` covers the store bootstrap, PDF cleaning/de-duplication, the 4-image cap, input sanitising, slug uniqueness and attraction ranking.

Admin APIs (all behind `authorizeAdmin`): `/api/admin/cms/destinations` (+ `/{id}`, `/{id}/action`, `/{id}/images`, `/bulk`), `/api/admin/cms/upload`, `/api/admin/cms/settings`, `/api/admin/cms/import`, `/api/admin/cms/pipeline`.

## Honest limits (read before launching)

- **CMS records are files.** `data/cms/` is a single-process, file-backed store — fine for one editor and one server; move to PostgreSQL (the Prisma schema already mirrors the records) before running several instances.
- **Images.** The seed destinations carry generated placeholders labelled as such; real photographs enter only through the pipeline's licensed sources or the admin upload form with a recorded licence. Hotel and restaurant records start empty by design.

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
