# Atma Sanyam — Android App

Native Kotlin + Jetpack Compose client for the Atma Sanyam multilingual
family-news video platform (spec §36/§41). MVVM/Clean Architecture: `ui/`
(Compose screens + ViewModels) → `data/repository/` → `data/remote`
(Retrofit) / `data/local` (Room + DataStore). All AI/News/TTS/video
processing happens on the backend — this app is a thin, offline-tolerant
REST client (spec §27/§37); no third-party API keys are ever bundled here.

## Screens

- **Onboarding** — first-launch language picker across the 9 supported
  languages (spec §7), backed by native resource localization
  (`values-hi`, `values-bn`, `values-as`, `values-ta`, `values-te`,
  `values-kn`, `values-mr`, `values-ml`, plus default `values` for English).
- **Home** — "FAMILY NEWS" feed with category filter chips, cursor-paginated
  video cards, Room-cached for offline/poor-network browsing (spec §18/§30).
- **Video player** — vertical ExoPlayer/Media3 player with captions,
  mute, like/save/share/report, and a link to story details/source
  attribution (spec §19).
- **Story details** — full extracted facts, source list, and the
  "AI-generated summary" disclaimer (spec §39).
- **Search** — people/city/district/state/category text search (spec §23).
- **Location filter** — India → State → District, entirely manual, no GPS
  permission ever requested (spec §20/§21).
- **Settings** — change language, toggle category interests, notification
  opt-in (spec §7/§22/§31).

## Build

This was developed and reviewed in an environment without the Android SDK
or network access to Google's Maven repository, so `./gradlew assembleDebug`
has **not** been executed here. To build:

```bash
cd android
./gradlew assembleDebug
```

Point `BuildConfig.API_BASE_URL` (see `app/build.gradle.kts`) at your
backend; the debug build defaults to `http://10.0.2.2:4000/api/v1/` (the
Android emulator's alias for the host machine's `localhost:4000`, i.e. the
local backend from `../backend`).

`app/google-services.json` in this repo is a **placeholder** — replace it
with your real Firebase project config before enabling push notifications.
