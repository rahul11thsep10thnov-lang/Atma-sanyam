# TripToe — Discover India, Better.

TripToe is an India-focused tourism encyclopedia and travel-advisory platform: destination guides, hotels, restaurants, markets, local food, weather, emergency information, transportation, an itinerary generator and a trip-cost calculator, in six languages.

This repository currently ships a **complete, working frontend on realistic demo data**, plus a **database schema, API routes, auth scaffold, admin panel and provider adapters** that are ready to connect to real services — per the project's build order (frontend → schema → APIs → admin → auth → search → i18n → SEO → external integrations).

## Stack

- **Frontend**: Next.js 14 (App Router), React 18, TypeScript
- **Styling**: Tailwind CSS
- **Backend**: Next.js Route Handlers (`app/api/*`)
- **Database**: PostgreSQL via Prisma (`prisma/schema.prisma`)
- **Auth**: NextAuth.js (JWT sessions; Google OAuth wired, more providers easy to add)
- **i18n**: custom architecture under `/locales` (English, Hindi, Marathi, Kannada, Tamil, Telugu)
- **Maps / Weather / Hotels / Flights / Advertising**: swappable adapters under `lib/providers/*`

## What's real vs. demo data

- All destination content (25 seed cities, led by a fully-developed **Varanasi**) lives in `lib/data/destinations` and is clearly flagged `isSampleData: true`. Hotel/restaurant prices, ratings and availability are **never fabricated** — cards show `dataVerified: false` and booking buttons are disabled with an explanatory tooltip until a real booking/rates API is connected.
- Images are procedurally generated placeholders (`lib/data/placeholder.ts`) — TripToe does not scrape search-engine images. Swap them for licensed/official tourism photography via the `images`/`ImageAsset` fields (each carries `source` + `copyright`).
- Weather falls back to a deterministic demo forecast unless `WEATHER_API_KEY` is set.
- Emergency numbers are the standard Indian national numbers (112/100/101/102-108/1091/139/1800-11-1363); the UI always shows **"Verify before relying on this information in an emergency."**

## Project structure

```
/app                      Next.js App Router routes
  /[locale]                Localized site (en, hi, mr, kn, ta, te)
    /page.tsx               Homepage
    /explore, /search, /trips, /profile
    /india/[state]/[slug]    Destination page + hotels/restaurants/shopping/food/weather/itinerary/attractions subpages
    /admin                  Admin dashboard
  /api                      REST endpoints (destinations, attractions, hotels, restaurants, markets, foods,
                             weather, search, itinerary, reviews, trips, wishlist, admin, auth)
  sitemap.ts, robots.ts
/components
  /destination, /home, /search, /watermark, /seo, /admin, /auth, /layout, /ui
/lib
  /i18n                     Locale config, dictionary loader, path helpers
  /data                     Demo destination data + placeholder image generator
  /providers                weather, maps, hotels, flights, advertising adapters
  /search                   Lightweight typo-tolerant search
  /itinerary                Rule-based itinerary generator (the LLM integration seam)
  /auth                     NextAuth config
  /database                 Prisma client singleton
  types.ts                  Shared domain types (mirrors the Prisma schema)
/prisma
  schema.prisma, seed.ts
/locales/{en,hi,mr,kn,ta,te}/*.json
```

## Installation

```bash
npm install
cp .env.example .env.local   # fill in what you have; everything has a safe fallback
npm run dev
```

The site works out of the box with **zero environment variables set** — it runs on demo data with OpenStreetMap embeds and a deterministic demo weather forecast.

## Environment variables

See [`.env.example`](./.env.example) for the full list with comments. Nothing is required to run the demo site; each optional variable activates one real integration:

| Variable | Enables |
|---|---|
| `DATABASE_URL` | Persistence for reviews, trips, wishlists, and the admin panel |
| `NEXTAUTH_URL`, `NEXTAUTH_SECRET`, `GOOGLE_CLIENT_ID/SECRET` | Sign-in |
| `WEATHER_API_KEY` | Live weather (OpenWeather) instead of demo forecasts |
| `MAP_PROVIDER`, `GOOGLE_MAPS_API_KEY`, `MAPPLS_API_KEY` | Switch the map embed provider |
| `HOTEL_BOOKING_API_KEY`, `FLIGHT_AFFILIATE_API_KEY`, `ADVERTISING_*` | Monetization adapters (`lib/providers/*`) |
| `IMAGE_CDN_BASE_URL`, `S3_*` | Licensed image storage |

## Database setup

1. Provision a PostgreSQL database and set `DATABASE_URL`.
2. Generate the Prisma client and run the initial migration:

   ```bash
   npm run prisma:migrate      # creates tables from prisma/schema.prisma
   npm run prisma:seed         # loads the same demo data that powers the frontend
   ```

3. Inspect data with `npm run prisma:studio`.

The schema (`prisma/schema.prisma`) models `State`, `District`, `Destination`, `Attraction`, `Hotel`, `Restaurant`, `Market`, `Food`, `Festival`, `EmergencyContact`, `Transportation`, `User`/`Account`/`Session` (NextAuth), `Review`, `Photo`, `Itinerary`, `WishlistItem`, `Translation`, and `AnalyticsEvent`.

> Frontend pages currently read from `lib/data/destinations` (in-memory demo data), not the database. To switch a page over: replace the `getDestinationBySlug`/`destinations` import with a `prisma.destination.findUnique(...)` call returning the same shape (see `lib/types.ts`).

## Running locally

```bash
npm run dev        # http://localhost:3000 (redirects to /en)
npm run lint
npm run typecheck
npm run build && npm run start
```

## Production deployment

1. Set all required env vars (`DATABASE_URL`, `NEXTAUTH_URL`, `NEXTAUTH_SECRET` at minimum) on your host (Vercel, Fly, Render, etc.).
2. Run `npm run prisma:migrate deploy` (or your platform's migration step) against the production database.
3. `npm run build && npm run start`, or let your platform build automatically.
4. Point `NEXT_PUBLIC_SITE_URL` at your production domain — it drives canonical URLs, the sitemap and OpenGraph tags.

## Adding a destination

- **Quickest (demo data)**: add an entry to `lib/data/destinations/seedCities.ts` using the `SeedInput` shape and `buildDestination()` factory (see `varanasi.ts` for a fully hand-written example with richer content), then export it from `lib/data/destinations/index.ts`.
- **Database-backed**: once `DATABASE_URL` is set, use `/admin/destinations/new` (validates and posts to `/api/admin/destinations`) or insert directly via Prisma / `prisma/seed.ts`.
- New destinations automatically get: a routed page at `/[locale]/india/[state]/[slug]`, all subpages, sitemap entries, SEO metadata, and homepage-rail eligibility (add its slug to `homepageSections` in `lib/data/destinations/index.ts` if it should appear on the homepage).

## Adding translations

- **UI strings**: add the key to `locales/en/{common,home,destination}.json` first, then mirror it in `hi`, `mr`, `kn`, `ta`, `te`. `lib/i18n/dictionaries.ts` statically imports all of them — no build step required.
- **Destination content** (per-language history/culture/etc.): model with the `Translation` table (`destinationId`, `locale`, `field`) once a database is connected; the frontend currently renders the single-language demo copy in `lib/data/destinations`.
- Adding a new language: append it to `locales` in `lib/i18n/config.ts`, add the three JSON files under `/locales/<code>/`, and TypeScript will flag any missing dictionary usage.

## Adding an API provider

Every external integration is behind an adapter interface so swapping providers never touches component code:

- `lib/providers/weather` — implement the `WeatherProvider` interface (see `openWeatherProvider.ts`) and select it in `getWeatherProvider()`.
- `lib/providers/maps` — implement `MapProvider.getEmbed()` and select it via `MAP_PROVIDER`.
- `lib/providers/hotels`, `lib/providers/flights`, `lib/providers/advertising` — stub interfaces ready for a real partner integration (monetization architecture, section 40 of the brief).

## Admin setup

Visit `/[locale]/admin` (e.g. `/en/admin`) for the dashboard: content counts, destinations/attractions/hotels/restaurants/markets tables, review moderation, translations status, users and SEO metadata health checks. Write actions currently validate input and honestly report whether anything was persisted (they need `DATABASE_URL` plus role-gated auth — `User.role` already exists in the schema — before going live). There is intentionally no separate admin login yet; gate `/admin` behind `getServerSession` + a role check before deploying it publicly.

## Notes on data integrity

- No hotel/restaurant prices, ratings, review counts or live availability are invented — see `dataVerified` on `Hotel`/`Restaurant`.
- No emergency number, opening hour or ticket price is AI-generated; the itinerary generator (`lib/itinerary/generate.ts`) only ever selects from the destination's own catalogued attractions/foods and is explicit that itinerary timing/distance estimates are approximate.
- Every image carries a `source` and `copyright` field; the bundled placeholders say so explicitly instead of pretending to be real photography.
