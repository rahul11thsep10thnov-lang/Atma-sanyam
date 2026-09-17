# Atma Sanyam — On-Demand Goods Delivery

Native Android app (Kotlin, Jetpack Compose, Material 3, MVVM/Clean Architecture) for
on-demand delivery of goods/articles from a shop to a customer's destination —
**not** a passenger ride-hailing app.

Core flow: `SHOP / SOURCE → DELIVERY VEHICLE → CUSTOMER / DESTINATION`, following a
**guest → quote → login → book** UX: pickup, destination, goods, quantity, weight,
dimensions and an estimated price are all available with no authentication; login is
only requested when the user taps **BOOK DELIVERY**.

## Try it right now — no Android Studio needed

Every push to this branch is automatically built into an installable `.apk` by
**GitHub Actions** (see `.github/workflows/android-build.yml`), since this project
doesn't assume you have Android Studio or a dev machine set up:

1. Open this repo on GitHub → **Actions** tab → **Android Build** workflow → the latest
   (green ✅) run on `claude/goods-delivery-app-bpgwtc`.
2. Scroll to **Artifacts** at the bottom and download `atma-sanyam-debug-apk`. It's a zip
   containing `app-debug.apk`.
3. Copy that `.apk` to an Android phone (email it to yourself, Google Drive, USB — any
   way you'd move a file), tap it, and allow "install from unknown sources" if asked. It
   installs and opens like any app — this is a debug build, so it's unsigned/self-signed,
   which is normal and only matters if you were publishing to the Play Store.

No build tools, no SDK, nothing to install on your own machine. This is the way to
actually see and use the app at this stage.

## Status: Phases 1–2 scaffolded, Phases 5–10 UI wired with mock data

Gradle multi-module project, full navigation flow, and every screen in the guest →
quote → auth → booking journey has real UI (not just placeholders) — goods details,
vehicle matching + pricing, booking summary with an itemized price breakdown, and
mobile number + code entry. What's still mocked: the map (Phase 3), Places/geocoding
(Phase 4), and everything backend (Phase 12+) — see [Phase plan](#phase-plan).

## Module structure

```
app/                        Application, MainActivity, NavHost wiring every feature together
core/
  model/                    Pure Kotlin (no Android deps) — domain models, PricingEngine,
                             VehicleMatchingEngine, BookingFlowState. `gradle test`-able.
  navigation/                Pure Kotlin — Destination route constants shared by all features
  designsystem/               Android/Compose — Material 3 theme, reusable components
  data/                       Android — BookingFlowViewModel (the shared in-progress order)
feature/
  home/                       Map-first landing screen: pickup/destination, mock route preview
  goods/                      Category chips, description, quantity, weight, dimensions
  vehicle/                    Vehicle cards computed via VehicleMatchingEngine/PricingEngine
  auth/                       Mobile number entry + alphanumeric code verification (simulated)
  booking/                    Itemized booking summary + confirmation with a generated booking ID
```

Dependency direction: `app` → every `feature:*` → `core:designsystem` / `core:data` /
`core:navigation` → `core:model`. Feature modules never depend on each other directly —
`app` is the only module that wires one feature's "next step" callback into the next
feature's screen, so features stay independently buildable and testable.

`core:model` is deliberately plain Kotlin/JVM: the pricing formula, vehicle-eligibility
logic, and the shared `BookingFlowState` shape are pure data/functions with no Android
dependency, so they're usable from the Android app today and from a Kotlin backend later
without change. `PricingEngine`/`VehicleMatchingEngine` are fully unit-tested
(`core/model/src/test/...`, 8 tests, run with `./gradlew :core:model:test`).

## How the guest's order survives the login step

`core:data`'s `BookingFlowViewModel` is created once, in `AtmaSanyamNavHost` (scoped to
the Activity, not to any one screen), and every screen from Home through Booking
Confirmation reads/writes the same instance. That's the mechanism behind the
requirement that a guest's pickup, destination, goods, and selected vehicle are never
lost when they're asked to authenticate — there's no re-entry, because there's only one
piece of state for the whole flow, not one per screen.

## What exists today

- Multi-module Gradle project (Kotlin DSL, version catalog) that opens in Android Studio
- **A GitHub Actions workflow that builds and uploads a real, installable debug APK on
  every push** — see above
- Material 3 theme + reusable Compose components
- `PricingEngine` and `VehicleMatchingEngine` with a 4-tier sample vehicle catalog
  (Bike / Three-Wheeler / Mini Goods Vehicle / Large Goods Vehicle), fully unit tested
- Home screen: pickup/destination text search, a map placeholder card, mock distance/ETA
- Goods Details: multi-select category chips, optional description, quantity stepper,
  weight quick-picks + manual entry, feet/inches dimensions, with the specified
  validation messages ("Please select what you're delivering.", etc.)
- Vehicle Selection: real cards computed from the goods details + mock route, each
  showing capacity, ETA, and price, or an ineligibility reason; an empty state for
  "Your items exceed our currently available vehicle capacities."
- Booking Summary: full itemized recap (pickup, destination, goods, quantity, weight,
  dimensions, vehicle) plus a transparent price breakdown (base fare, distance charge,
  loading fee, surcharges, platform fee, tax, total)
- Auth: mobile number entry (10-digit validation, no email field anywhere) and
  alphanumeric code entry (6-character validation) — client-side only for now, since
  there's no backend yet to actually send/verify a code
- Booking Confirmation: a generated `WS-2026-NNNNNN` booking ID and a "SEARCHING" status
  placeholder for where driver assignment (Phase 14) will attach
- Secrets kept out of source: `secrets.properties` (gitignored) feeds `MAPS_API_KEY` /
  `API_BASE_URL` into `BuildConfig`; only `secrets.properties.example` is committed

## What's missing (by design, for later phases)

- Google Maps SDK / Places Autocomplete / Routes API — Home currently shows a placeholder
  card and a deterministic mock distance/ETA instead of a real map (Phase 3-4)
- Any backend at all — REST API, database, admin panel (Phase 12); see below. Until then,
  auth "verifies" anything of the right shape, and pricing/vehicle-eligibility are
  computed on-device only (never trust-worthy for a real booking on its own)
- Firebase Cloud Messaging, live tracking, driver app, payments (Phase 14-24)

## Phase plan

| Phase | Scope | Status |
|---|---|---|
| 1 | Android project scaffold | ✅ Done |
| 2 | Navigation graph + base UI | ✅ Done |
| 3 | Google Maps SDK integration | ⬜ Next |
| 4 | Pickup/destination (Places Autocomplete, geocoding) | ⬜ |
| 5 | Goods details UI | ✅ Done (mock route only) |
| 6 | Weight/dimensions UI | ✅ Done |
| 7 | Vehicle matching UI | ✅ Done |
| 8 | Pricing UI | ✅ Done |
| 9 | Guest quote flow end-to-end | ✅ Done (client-side only) |
| 10 | Authentication UI (mobile + code) | ✅ Done (simulated, no backend) |
| 11 | Booking confirmation | ✅ Done (client-side booking ID) |
| 12 | Connect backend | ⬜ |
| 13 | Real (server-computed) pricing | ⬜ |
| 14 | Driver assignment | ⬜ |
| 15 | Live tracking | ⬜ |

## Proposed database schema

Entities (see the requirements this repo was built against for the full list): `User`,
`GuestSession`, `SavedAddress`, `GoodsCategory`, `GoodsItem`, `VehicleCategory`,
`VehicleCapacity`, `PricingRule`, `Quote`, `Booking`, `Driver`, `DriverVehicle`,
`DriverLocation`, `Payment`, `ProofOfDelivery`, `Notification`.

Everything already exists as a Kotlin data class in `core/model` — see
`Location.kt`, `Goods.kt`, `Vehicle.kt`, `Pricing.kt`, `Booking.kt`,
`BookingFlowState.kt` — with the shape a future Retrofit/Room/backend layer would map
onto:

```
User (1) ── (N) SavedAddress
User (1) ── (N) Booking ── (1) Quote ── (N) VehicleQuote ── (1) VehicleCategory ── (1) VehicleCapacity
                Booking ── (1) PricingRule snapshot (via the selected VehicleQuote)
                Booking ── (0..1) Driver ── (1) DriverVehicle
                Driver  ── (N) DriverLocation (time series)
                Booking ── (0..1) Payment
                Booking ── (0..1) ProofOfDelivery
                Booking ── (N) AppNotification
GuestSession (1) ── (0..1) Quote   -- before authentication
VehicleCategory (1) ── (1) PricingRule, (1) VehicleCapacity   -- admin-configurable
```

Key design points already reflected in the code:
- `VehicleCategory`/`VehicleCapacity`/`PricingRule` are plain configuration data, never
  hard-coded constants in the matching/pricing logic — swapping the sample catalog in
  `SampleVehicleCatalog` for a `GET /vehicles` response requires no engine changes.
- `Quote` (guest-side, unauthenticated) and `Booking` (post-auth) are separate types —
  a `Booking` wraps the `Quote` the user already had rather than re-collecting it, which
  is how the guest's in-progress order survives the login step.
- Coordinates (`GeoPoint`) and human-readable addresses (`DeliveryLocation.addressLine`)
  are stored separately, never derived from each other by string parsing.

## Proposed REST API

```
POST   /quote                     Guest-facing: pickup/destination/goods -> vehicle options + prices
GET    /vehicles                  Admin-configured vehicle catalog (id, capacity, pricing rule)
POST   /auth/request-code         { phoneNumber } -> sends alphanumeric code, rate-limited
POST   /auth/verify-code          { phoneNumber, code } -> auth token, rate-limited attempts
POST   /booking                   { quoteId, vehicleId } -> re-validates price & eligibility server-side
GET    /booking/{id}
POST   /booking/{id}/cancel
GET    /bookings                  Paginated history for the authenticated user
GET    /driver/{id}
GET    /booking/{id}/tracking     Polling or WebSocket/FCM-pushed DriverLocation
POST   /payment
```

The Android client is never trusted for final price, vehicle eligibility, booking status,
or payment status — `POST /booking` must recompute and validate all of these server-side,
using the same formula `PricingEngine`/`VehicleMatchingEngine` implement client-side for
the instant guest quote.

## Backend (not yet implemented)

No backend/server code exists in this repository yet (Phase 12). `core/model`'s
`PricingEngine` and `VehicleMatchingEngine` are written as backend-portable pure Kotlin so
the same logic can run server-side (e.g., a Kotlin/Ktor or Spring Boot service) without a
rewrite — that was a deliberate choice, not an oversight.

## Required API keys / configuration (not yet needed to build/run today, but coming)

- **Google Maps SDK for Android / Places API / Directions or Routes API** key — needed
  starting Phase 3. Create one in Google Cloud Console, restrict it to those three APIs.
- **Firebase project** (Authentication + Cloud Messaging) — needed starting Phase 12/14.
  `google-services.json` is gitignored and must never be committed.

Copy `secrets.properties.example` to `secrets.properties` (gitignored) and fill in:

```properties
MAPS_API_KEY=your_real_key_here
API_BASE_URL=https://your-backend.example.com/
```

## Building and running

### Right now: no local setup at all

Use the CI-built APK described at the top of this document. This is the recommended path
for as long as no one working on this project has Android Studio installed — every
change to this branch produces a fresh, downloadable, installable build automatically.

### When the app grows large enough to need Android Studio

At some point — once you're iterating quickly, debugging on a device with breakpoints,
testing Maps/Places integration (Phase 3+), or building a driver app alongside this one —
a real local setup starts paying for itself. When you get there:

1. Install **Android Studio** (Ladybug/2024.2 or newer) — it bundles the JDK and lets you
   install the Android SDK through its own SDK Manager UI, no command line needed.
2. `git clone` this repo, checkout `claude/goods-delivery-app-bpgwtc`, and open the root
   folder in Android Studio — it recognizes the Gradle project automatically.
3. Copy `secrets.properties.example` to `secrets.properties` at the repo root and fill in
   a real `MAPS_API_KEY` once Phase 3 lands (a placeholder is fine before that).
4. Let Gradle sync, then run the `app` configuration on an emulator or a plugged-in phone
   with USB debugging on — Android Studio handles both with a device dropdown + Run button.
5. Studio also gives you: a visual layout preview for Compose screens, a debugger with
   breakpoints, a memory/CPU profiler, and Logcat for live device logs — none of which
   the CI-built APK or this sandbox can offer.

This repo's own dev sandbox (where automated changes are made) has no access to
`dl.google.com`, so it can't fetch the Android SDK or Google's Maven repo either — that's
exactly why the GitHub Actions workflow exists: CI runs on GitHub's own infrastructure,
which has no such restriction.

### Running just the unit tests

`core:model`'s `PricingEngine`/`VehicleMatchingEngine` tests are plain JVM tests with no
Android dependency: `./gradlew :core:model:test` (needs a JDK, no Android SDK).

### What you should see in the app

- Opens directly to the Home screen (no login prompt).
- "Atma Sanyam" header, tagline "Deliver anything from shop to home".
- Type anything into pickup and destination — a mock route preview and "Enter goods
  details" button appear.
- Pick at least one goods category, set a weight, and enter dimensions — validation
  messages appear if any are missing, matching the required error text.
- Vehicle Selection shows real cards with capacity/price/ETA — try a huge weight or
  dimension to see the "exceeds available vehicle capacities" state.
- Booking Summary shows a full itemized price breakdown.
- Tapping "Book delivery" only now asks for a mobile number, then a 6-character code —
  matching the required guest → quote → login → book order.
- Booking Confirmation shows a generated `WS-2026-NNNNNN` ID, then "Back to home" resets
  the flow for a new order.
