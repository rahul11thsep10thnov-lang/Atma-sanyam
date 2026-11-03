# DADU – Performance report

Date: 2026-11-03, head `93b5615`. Everything below that is marked **measured** came from the
container used for this pass (no device). Everything marked **unknown** needs the device protocol
in section 5 before release.

## 1. Measured

| Metric | Value | How |
|---|---|---|
| Web main JS bundle | 3.6 MB (minified, not gzipped) | `expo export --platform web` |
| Android Hermes/JS bundle | 5.0 MB | `expo export --platform android` |
| Bundled assets (Android export) | 84 MB | `du` of the export's `assets/`; almost entirely the legacy Tame picture library, balcony, garden and museum packs; DADU added only the generated icons (under 1 MB) |
| Web export total | 88 MB | same assets |
| DADU content and art | inside the JS bundle: 52 lessons, 12 stories, 51 assignments, 167 objects, every sprite and character rig as code | no image files |
| Mobile unit tests | 43 tests in under 2 s | `npm run test:dadu` |

## 2. Budget versus state (`01-product-architecture.md` section 9, reference device 2 GB RAM, Snapdragon 4xx, Android 10, 720 × 1600)

| Metric | Budget | State |
|---|---|---|
| Cold start to Miniverse interactive | < 3.0 s p75, < 4.5 s p95 | **Unknown.** Risk factors: 5.0 MB Hermes bundle (acceptable), four extra font faces loaded before the first frame, AsyncStorage reads for profiles, world and usage on boot. |
| Scene frame rate | 60 fps target, never below 45 with four characters animating | **Unknown.** Scenes are SVG with roughly 100 paths; animation is a 10 fps JS clock that re-renders the scene tree. Smooth on desktop Chromium; on a budget device the per-tick React reconciliation of ~100 SVG nodes is the main risk. |
| Memory in a scene | < 300 MB RSS | **Unknown.** No bitmaps are held; SVG node count is the only driver. |
| JS bundle (Hermes) | < 6 MB | **5.0 MB, within budget** but with little headroom; stripping legacy Tame code would recover an estimated 1–1.5 MB. |
| `core` pack | ≤ 60 MB | **Not applicable yet:** all content ships in the bundle; packs are manifests only. The install is dominated by the 84 MB of legacy assets, which exceeds the spirit of the budget. |
| Audio line start latency | < 150 ms | **Unknown.** Narration is device text-to-speech (expo-speech); first utterance on Android typically takes 200–600 ms to start. Recorded audio packs do not exist yet. |
| Scene image layers | ≤ 4 raster layers | Met by construction (no raster layers). |
| Rive artboards | ≤ 5 | Not applicable (no Rive). |
| Touch to feedback | < 100 ms | **Unknown on device;** on web the tap handler sets state synchronously and the glow responds on the next frame. |

## 3. What the numbers mean for a 2 GB Android 10 phone

- A 5 MB Hermes bundle loads in well under a second on this class of device; the bytecode is
  precompiled so parse time is not the issue. Font loading and the three AsyncStorage reads are
  the likely cold-start costs; keep them under 300 ms combined.
- The 84 MB of legacy assets inflate the APK/AAB to roughly 100 MB. On a budget phone with
  limited storage this hurts installs and updates far more than any runtime cost. They belong to
  Tame, not DADU, and are the first thing to remove.
- SVG scenes re-rendered ten times a second through React are the single biggest unknown.
  Expect the map (about 20 props plus three characters) to be fine; the villa exterior and the
  public garden (30 or more props) are the scenes to profile first.
- Text-to-speech runs in a separate process; it does not affect frame rate but its start latency
  will be noticeable before recorded audio exists.

## 4. Optimisation plan (ordered by payoff)

1. **Strip the legacy Tame assets and screens** from the DADU build (keep them behind a build
   flag or remove entirely once the legacy switch is retired): install size from ~100 MB to under
   20 MB, bundle down by an estimated 1–1.5 MB.
2. **Lazy-load worlds and side-view backgrounds**: import location layouts, side backgrounds and
   activity components per world with `React.lazy`/dynamic `require` so the first render carries
   only the map and the villa.
3. **Memoise sprite trees**: wrap each prop sprite in `React.memo` keyed on `(sprite, flags,
   stage, season, time, t-bucket)`, and pass the animation clock only to sprites that animate
   (fountain, bell, pond, characters); static props then render once per scene.
4. **Adaptive animation rate**: measure the frame time of the first ten ticks; drop the clock to
   5 fps or to still frames when a tick exceeds 24 ms, and always when the OS reduce-motion
   setting is on (already honoured).
5. **Character rigs on the native thread**: move the idle, blink and walk loops from the shared JS
   clock to `Animated` values with `useNativeDriver` where react-native-svg supports it, or to
   Rive once a native build exists.
6. **Boot path**: load the four Baloo/Nunito faces in parallel with the AsyncStorage reads and
   render the language screen with system fonts if loading exceeds 500 ms.
7. **Keep Hermes bytecode** (already on) and enable `inlineRequires` in Metro (already the Expo
   default) so unused worlds are not evaluated at start.
8. **Pack-based content** (later phase): move lessons, stories and future audio into downloadable
   packs per `01-product-architecture.md` so the bundle stops growing with content.

## 5. Device test protocol

Devices (owned or rented from a device farm):

| Tier | Example devices | Purpose |
|---|---|---|
| Reference budget | Redmi 9A or Realme C11 (2 GB, Android 10) | pass/fail against the budget |
| Mid-range | Redmi Note 10 or Samsung A23 (4–6 GB, Android 12–13) | typical user |
| Tablet | Lenovo Tab M10 (Android 11) | layout at tablet width |
| iOS | iPhone SE 2nd gen, iPad 9th gen | iOS parity |

Measurements (each three cold runs, report p75):

| Measurement | Method | Pass threshold |
|---|---|---|
| Cold start to map interactive | `adb shell am start -W` plus a timestamp log when the map's first frame commits | < 3.0 s budget device, < 2.0 s mid-range |
| Frame rate in map, villa exterior, living room, public garden, a lesson with the side scene | Android `dumpsys gfxinfo` or the Expo dev menu perf monitor, 30 s each with the 10 fps clock running | ≥ 45 fps budget device, ≥ 58 fps mid-range |
| Memory RSS after 10 minutes of play (three locations, one lesson, one story) | `adb shell dumpsys meminfo` | < 300 MB |
| Battery drain over 30 minutes of a lesson plus garden activity | `adb shell dumpsys batterystats` or settings battery screen | < 6 % on the reference device |
| TTS first-utterance latency (English and Hindi voices installed) | timestamp from `speak()` call to `onStart` | < 600 ms budget device; recorded audio later < 150 ms |
| Touch to glow/bubble feedback | screen recording at 60 fps, count frames | < 100 ms (6 frames) |
| Storage after onboarding and after 10 lessons | app info screen | install < 25 MB after the legacy strip; data growth < 2 MB per child |
| Offline run | airplane mode: onboarding, lesson, story, parent dashboard | no errors, progress persists across a force-stop |

Record results in this file under a "Measured on device" section; a release is blocked until the
reference-device rows pass.
