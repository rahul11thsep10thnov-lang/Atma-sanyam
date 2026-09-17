# Atma Sanyam — On-Demand Goods Delivery

Native Android app (Kotlin, Jetpack Compose, Material 3, MVVM/Clean Architecture) for
on-demand delivery of goods/articles from a shop to a customer's destination —
**not** a passenger ride-hailing app.

Core flow: `SHOP / SOURCE → DELIVERY VEHICLE → CUSTOMER / DESTINATION`, following a
**guest → quote → login → book** UX: pickup, destination, goods, quantity, weight,
dimensions and an estimated price are all available with no authentication; login is
only requested when the user taps **BOOK DELIVERY**.

## Status: Phase 1–2 of 15

This is the initial scaffold — Gradle multi-module project, navigation skeleton, and a
fully working Home/Map screen with mock data. See [Phase plan](#phase-plan) below for
what's implemented vs. still to come. Nothing here talks to a real backend yet; there is
no backend in this repository (see [Backend](#backend-not-yet-implemented)).

## Module structure

```
app/                        Application, MainActivity, NavHost wiring every feature together
core/
  model/                    Pure Kotlin (no Android deps) — domain models, PricingEngine,
                             VehicleMatchingEngine. Runs & tests with plain `gradle test`.
  navigation/                Pure Kotlin — Destination route constants shared by all features
  designsystem/               Android/Compose — Material 3 theme, reusable components
feature/
  home/                       Map-first landing screen: pickup/destination, mock route preview
  goods/                      Placeholder — goods category/quantity/weight/dimensions (Phase 5-9)
  vehicle/                    Placeholder — vehicle matching + pricing UI (Phase 7-8)
  auth/                       Placeholder — mobile number + alphanumeric code (Phase 10)
  booking/                    Placeholder — booking summary/confirmation (Phase 11+)
```

Dependency direction: `app` → every `feature:*` → `core:designsystem` / `core:navigation`
→ `core:model`. Feature modules never depend on each other directly — the app module wires
one feature's "next step" callback into the next feature's screen, so features stay
independently buildable and testable.

`core:model` is deliberately plain Kotlin/JVM: the pricing formula and vehicle-eligibility
logic are pure functions with no Android dependency, so they're usable from the Android
app today and from a Kotlin backend later without change, and are fully unit-tested
(`core/model/src/test/...`).

## What exists today

- Multi-module Gradle project (Kotlin DSL, version catalog) that opens in Android Studio
- Material 3 theme + reusable Compose components (buttons, location search field, section
  header, a shared "coming soon" placeholder screen)
- `PricingEngine` and `VehicleMatchingEngine` with a 4-tier sample vehicle catalog
  (Bike / Three-Wheeler / Mini Goods Vehicle / Large Goods Vehicle), fully unit tested
- Home screen: pickup/destination text search fields (with a "use current location"
  affordance), a map placeholder card, and a mock distance/ETA preview once both are set
- End-to-end navigation skeleton: Home → Goods Details → Vehicle Selection → Booking
  Summary → Auth (mobile → verify code) → Booking Confirmation → back to Home, with every
  intermediate screen a real (if placeholder) destination in the graph
- Secrets kept out of source: `secrets.properties` (gitignored) feeds `MAPS_API_KEY` /
  `API_BASE_URL` into `BuildConfig` and a manifest placeholder; only
  `secrets.properties.example` is committed

## What's missing (by design, for later phases)

- Google Maps SDK / Places Autocomplete / Routes API — Home currently shows a placeholder
  card and a deterministic mock distance/ETA instead of a real map (Phase 3-5)
- Goods category/quantity/weight/dimensions UI (Phase 5-6)
- Wiring the vehicle-selection screen to `VehicleMatchingEngine`/`PricingEngine` (Phase 7-8)
- Firebase Authentication or another OTP/alphanumeric-code auth backend (Phase 10)
- Any backend at all — REST API, database, admin panel (Phase 12); see below
- Firebase Cloud Messaging, live tracking, driver app (Phase 14-20)

## Phase plan

| Phase | Scope | Status |
|---|---|---|
| 1 | Android project scaffold | ✅ Done |
| 2 | Navigation graph + base UI | ✅ Done |
| 3 | Google Maps SDK integration | ⬜ Next |
| 4 | Pickup/destination (Places Autocomplete, geocoding) | ⬜ |
| 5 | Goods details UI | ⬜ |
| 6 | Weight/dimensions UI | ⬜ |
| 7 | Vehicle matching (engine done, UI pending) | 🟡 Engine done |
| 8 | Pricing (engine done, UI pending) | 🟡 Engine done |
| 9 | Guest quote flow end-to-end | ⬜ |
| 10 | Authentication (mobile + code) | ⬜ |
| 11 | Booking confirmation | ⬜ |
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
`Location.kt`, `Goods.kt`, `Vehicle.kt`, `Pricing.kt`, `Booking.kt` — with the shape a
future Retrofit/Room/backend layer would map onto:

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

## Required API keys / configuration (not yet needed to build Phase 1-2, but coming)

- **Google Maps SDK for Android / Places API / Directions or Routes API** key — needed
  starting Phase 3. Create one in Google Cloud Console, restrict it to those three APIs.
- **Firebase project** (Authentication + Cloud Messaging) — needed starting Phase 10/14.
  `google-services.json` is gitignored and must never be committed.

Copy `secrets.properties.example` to `secrets.properties` (gitignored) and fill in:

```properties
MAPS_API_KEY=your_real_key_here
API_BASE_URL=https://your-backend.example.com/
```

## Building and running

**This repository's own CI/dev sandbox has no access to `dl.google.com`**, so the Android
SDK platform and Google's Maven repo can't be fetched there — only `core:model` and
`core:navigation` (plain Kotlin, tested against Maven Central) can be built and unit-tested
in that environment. **A normal machine with internet access does not have this
restriction** — build there or in Android Studio as usual:

1. Install **Android Studio** (Ladybug/2024.2 or newer recommended) with SDK Platform 34
   and Build-Tools installed via the SDK Manager.
2. `git clone` this repo, checkout `claude/goods-delivery-app-bpgwtc`, and open the root
   folder in Android Studio — it will recognize the Gradle project automatically.
3. Copy `secrets.properties.example` to `secrets.properties` at the repo root. For Phase
   1-2 the placeholder value is enough (Maps isn't wired up yet); no real key required.
4. Let Gradle sync (first sync downloads AGP/Compose/etc. from Google's and Maven
   Central's repos — this needs the internet access this sandbox doesn't have).
5. Run the `app` configuration on an emulator (API 26+) or a physical device.
6. To run the pure-Kotlin domain tests from a terminal: `./gradlew :core:model:test`.

### What you should see

- App opens directly to the Home screen (no login prompt).
- "Atma Sanyam" header, tagline "Deliver anything from shop to home".
- Type anything into both the pickup and destination fields — a map placeholder card
  appears showing a mock distance/ETA, and "Enter goods details" becomes enabled.
- Tapping through "Enter goods details" → "Continue to vehicle selection" → "Continue to
  booking summary" → "Book delivery" → "Simulate code sent" → "Simulate verified" walks
  the full guest → quote → auth → booking navigation skeleton end to end, landing on a
  booking-confirmation placeholder with a button back to Home.
- Tapping the pickup field's location icon fills in a mock "Current location" value
  (real GPS/FusedLocationProviderClient integration is Phase 3-4).
