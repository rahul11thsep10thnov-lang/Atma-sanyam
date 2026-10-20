# Release build report — 2026-10-20
- applicationId/namespace `com.rangepatte.app`; versionCode **1**, versionName **1.0.0**; minSdk 24; compileSdk/targetSdk **36**; AGP 8.10.1; Gradle 8.11.1; Kotlin 2.0.21; Play Billing 8.0.0.
- Signing: configured to read `keystore.properties` or `TAASH_*` environment variables; **no key exists here**; without it the bundle is unsigned.
- R8 + resource shrinking: enabled (unverified). `allowBackup=false`.
- Release guard: `bundleRelease`/`assembleRelease` fail without `app/google-services.json`.
- Build command: `./gradlew :app:testDebugUnitTest :app:lintRelease :app:bundleRelease` → `app/build/outputs/bundle/release/app-release.aab`.
- **Artifact: none built; no checksum.** After you build: `sha256sum app-release.aab` (Windows: `certutil -hashfile app-release.aab SHA256`).
- Blockers: Firebase file, AdMob ids, privacy-policy/deletion URLs, signing key, Play Console subscription, first successful Android build and device test.
