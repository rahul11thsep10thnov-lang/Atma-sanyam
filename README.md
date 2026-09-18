# WHOLESOUL

**Fast. Fresh. Frugal.**
घर बैठे ताजा फल, फूल, माला और सब्जी खरीदें

A native Android quick-commerce app for fruits, vegetables, flowers, garlands, puja items,
grocery and daily essentials — sourced directly to cut out middlemen and keep prices honest.

Inspired by the *convenience* of modern quick-commerce apps (fast search, category discovery,
one-tap add-to-cart, simple checkout, offers, reorder) but with its own brand, visual identity
and market focus: fresh produce, flowers/garlands and puja essentials, sold at frugal prices.

## Important: no location/GPS anywhere

WHOLESOUL never requests location permissions, never links a maps SDK, and never reads device
GPS. Delivery area is decided entirely manually: **Country → State → City → Area → PIN code**,
checked against a configurable list of serviceable PIN codes
(`data/mock/MockLocationData.kt`). Order tracking is a simple status list (Placed → Confirmed →
Packed → Out for delivery → Delivered) — never a live map.

## Tech stack

- Kotlin, Jetpack Compose, Material 3
- MVVM + Clean Architecture (`presentation` → `domain` → `data`)
- Kotlin Coroutines + Flow, `StateFlow`-driven UI state, sealed `UiState` for
  loading/empty/error/success
- Navigation Compose, single-Activity
- Hilt for dependency injection
- Room for local persistence (cart, addresses, wishlist, orders)
- Retrofit/OkHttp included and wired for a future backend, but unused while
  `BuildConfig.DEVELOPMENT_MODE == true`
- Coil for image loading/caching
- DataStore Preferences for session + onboarding + recent-search state
- kotlinx.serialization for local JSON persistence (order line items, addresses)

## Development Mode

The whole app runs end-to-end with **zero backend** via `core/util/DevModeConfig.kt` and the
`DEVELOPMENT_MODE` build config flag (on by default in both `debug` and `release`, since there
is no real backend yet):

- **Auth**: mocked OTP flow — any 10-digit mobile number, OTP is always `1234`. "Continue as
  Guest" also works.
- **Catalog**: 360+ generated products across 12 categories (`data/mock/MockProductData.kt`),
  meeting every minimum count in the spec (50 fruits, 50 vegetables, 30 flowers, 20 garlands,
  30 puja items, 50 grocery, 30 household, 30 personal care, plus dairy/snacks/beverages/other).
- **Images**: resolved through the `ImageProvider` interface
  (`core/image/PlaceholderImageProvider.kt`) — swap one class to point at a CDN, Firebase
  Storage or local assets later; no screen ever builds an image URL itself.
- **Payments**: `MockPaymentRepository` always succeeds after a short simulated delay.
- **Serviceability**: a fixed, easily-extended list of serviceable PIN codes.
- **Notifications**: a seeded local list; architecture allows swapping in FCM later
  (`domain/repository/NotificationRepository.kt`).

Every repository is defined as an interface in `domain/repository/` and bound to its
Development Mode implementation in `di/RepositoryModule.kt`. Connecting a real backend means
writing a new implementation class and changing one `@Binds` line per repository — no
ViewModel or screen changes.

## Project structure

```
app/src/main/java/com/wholesoul/app/
├── core/
│   ├── designsystem/       Colors, typography, shapes, theme, reusable Compose components
│   ├── analytics/          Provider-agnostic analytics event + logger interface
│   ├── image/              ImageProvider abstraction + CompositionLocal
│   └── util/               UiState, DevModeConfig, formatting helpers
├── domain/
│   ├── model/              Plain domain models (User, Address, Product, Order, ...)
│   └── repository/         Repository interfaces (the contract every screen depends on)
├── data/
│   ├── local/              Room database, entities, DAOs
│   ├── mock/                In-memory catalog/category/offer/notification/location data
│   └── repository/         Development Mode repository implementations
├── di/                     Hilt modules
├── navigation/             Routes, NavHost, bottom navigation
└── presentation/           One package per screen: splash, onboarding, auth, home,
                             categories, productlisting, productdetails, search, cart,
                             address, checkout, orderconfirmation, orders, orderdetails,
                             wishlist, profile, offers, notifications, help, legal
```

## Brand

- Primary color: `#FFD8B1` (warm apricot) — deliberately distinct from other quick-commerce
  apps' yellow branding.
- Secondary: a fresh leaf green (`#3A7D44`) for sourcing/freshness cues, and a deep soil brown
  (`#4A3728`) for earthy market texture.
- Logo: an original sun-disc mark holding a leaf and a fruit dot
  (`res/drawable/ic_wholesoul_logo.xml`) — not derived from any third-party logo.

## Building

Standard Android Gradle project, no extra setup required:

```
./gradlew assembleDebug
./gradlew test              # unit tests (ViewModels, repositories, domain logic)
./gradlew connectedAndroidTest  # Compose UI tests (needs a device/emulator)
```

Minimum SDK 24, target/compile SDK 34.

## Testing

- `app/src/test`: pure-JVM unit tests — domain logic (coupon math, order status transitions),
  the Development Mode product/serviceability repositories, and ViewModel tests (login, search,
  add/remove/update cart quantity, address creation + PIN serviceability, checkout/order
  creation, order cancellation, wishlist) built against lightweight fakes of each repository
  interface (`app/src/test/.../fakes`).
- `app/src/androidTest`: a Compose UI test for the shared ADD/quantity-stepper component.

## What's stubbed for later

- Firebase Analytics/Cloud Messaging dependencies are present but inert; `AnalyticsLogger` and
  `NotificationRepository` are the seams to wire them in.
- Retrofit/OkHttp are present but unused; any `*Repository` interface is the seam for a real
  API-backed implementation.
- Razorpay (or another gateway) plugs into `PaymentRepository`.
