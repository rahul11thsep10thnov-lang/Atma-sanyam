# FocusEnvironmentEngine — the living balcony

The 100 plant portraits are standardised: same light, same hour. The balcony
they live in is not. `src/balconyWorld/engine/FocusEnvironmentEngine.ts` makes
sunlight part of the meaning of the app:

```
FOCUS → GROWTH → SUNLIGHT → LIFE
```

The engine is pure TypeScript (no React, no three.js, no timers). Callers feed
it the clock; it emits one `LightingFrame` per tick. Renderers only read
frames, so every plant, every balcony and every future environment inherits
the same behaviour instead of each screen building its own effects.

```
                  device clock ─┐        focus session ─┐
                                ▼                       ▼
 preset ──► FocusEnvironmentEngine.tick(nowSeconds, localHour) ──► LightingFrame
 weather ──►   time-of-day blend · sun arc · weather · passing clouds ·
 reduced       focus overlay · reward timeline · easing
 motion
                     │                       │                  │
                     ▼                       ▼                  ▼
               LightingRig (three.js)   AudioEngine.applyMix   UI (hint, stats)
               sun · moon · ambient     birds/wind/city/
               sky · fog · pool · beam  insects/rain/…
               dust · rain · lamps
               wet deck · camera push-in
```

## States

| Axis | States | Source |
|---|---|---|
| Time of day | `DAWN` 5–7 · `MORNING` 7–11 · `AFTERNOON` 11–16 · `GOLDEN_HOUR` 16–18:30 · `SUNSET` 18:30–19:30 · `NIGHT` | device clock, or a preset's fixed hour |
| Weather | `CLEAR` `CLOUDY` `LIGHT_RAIN` `HEAVY_RAIN` `MIST` `WINDY` | `setWeather`, or the preset |
| Focus | `IDLE` → `FOCUS_START` (3 s) → `DEEP_FOCUS` → `FOCUS_COMPLETE` (5.2 s) → `PLANT_GROWTH` (2.2 s) → `IDLE`, or `FOCUS_INTERRUPTED` (3 s) | `dispatch(event, now)` |
| Preset | `AUTO` `MORNING` `GOLDEN_HOUR` `NIGHT` `RAIN` `FOREST` `MONSOON` `WINTER` | the balcony's environment button, persisted in `WorldSaveState.environmentPreset` |

### Time of day
Each state has a keyframe (`TIME_OF_DAY_KEYFRAMES`): sun azimuth/elevation,
intensity and colour, shadow length, ambient, sky gradient, fog, the pool and
beam, dust, wind, lamps, stars, the audio mix. Adjacent states cross-fade over
24 minutes of clock either side of a boundary, and the sun's angle also moves
*within* a state, so shadows turn through the day — the sun physically moves,
the sky doesn't just change colour. Dawn is pale and misty with long shadows;
morning has the clearest sunbeam; afternoon is high and bright with short
shadows; golden hour is the most cinematic (low amber sun, biggest pool,
longest shadows); sunset slides gold → orange → pink → violet; night removes
the sun and brings moonlight, the balcony lamps, fireflies and stars.

### Weather and clouds
`WEATHER_MODIFIERS` scale the day keyframe: cloud cover softens shadows and
desaturates the sun, rain adds droplets, a wet (less rough) deck, darker
ambience and rain audio, mist raises fog density, wind raises foliage motion.
`cloudSignal(t)` — a sum of slow incommensurate waves — makes the sun dim
100 % → ~50 % → 100 % over a few minutes as a cloud passes. Nothing ever
flashes.

### Focus arc
- **FOCUS_START → DEEP_FOCUS** (brief §8): over 3 s the balcony goes quiet —
  birds and dust thin out, foliage motion halves, the background dims to 82 %,
  the pool and beam warm up around the plant. Nothing competes with the plant.
- **FOCUS_COMPLETE — the sunlight reward** (§9, §22): a 5-second timeline, no
  confetti. The scene dims slightly → a ray appears → the beam travels to the
  plant → the plant glows in an enlarged pool with dust visible in the beam →
  a growth pulse moves the foliage → the balcony returns. The camera makes an
  almost imperceptible push-in (≤ 3 %). If the session grew the plant,
  `PLANT_GROWTH` follows with a second soft pulse.
- **FOCUS_INTERRUPTED** (§11): sunlight fades to 70 % and foliage slows for
  3 s, then everything returns. Nothing goes dark; the hint reads
  "It's okay. Try again next time."

### Easing
Preset, weather and focus switches ease toward their target with a 2.5 s time
constant; the reward and interruption are authored timelines and drive
directly. With reduced motion on (`AccessibilityInfo`), the cloud signal and
sun drift freeze, particles and the push-in are removed, foliage motion drops
to a third and transitions take 0.4 s — the balcony stays beautiful, it just
stops moving.

## The frame

```ts
interface LightingFrame {
  timeOfDay; weather; focus; preset; hour;
  sun: { azimuth, elevation, intensity, color, shadowLength, shadowSoftness };
  moon; ambient; sky: { top, horizon, sunGlow, stars }; fog;
  pool: { intensity, radius, elongation, color };     // the glow at the plant's base
  beam: { intensity, haze, travel };                  // the shaft from above; travel = reward sweep
  particles: { dust, fireflies, rain, mist };
  plantMotion: { wind, speed };                       // calm 1–2 %, normal 2–5 %, windy 5–10 %
  backgroundBrightness; lamps; wetness;
  audio: { birds, wind, water, city, insects, rain, thunder, music };
  camera: { pushIn }; sequence: { progress, growthPulse }; birdActivity;
}
```

## How it is wired today

- `BalconyEngine` ticks the engine at the profile's ambient fps (20–30 Hz),
  passes the frame to `LightingRig.apply`, to `ObjectSystem.updateAmbient`
  (wind-scaled sway) and to `onLightingFrame`, which the screen uses to feed
  `AudioEngine.applyMix` (eased per layer). The rig centres the pool and beam
  on the first plant object (`refocusLighting`).
- `LightingRig` owns the sun, a moon light, hemisphere + ambient, the sky
  shader (now with a star field uniform), fog, an additive radial **pool**
  disc, an additive **beam** quad aligned to the sun direction and faced to
  the camera, dust and rain point clouds (MEDIUM: 50/160, HIGH: 140/320,
  LOW: none), the props' `prop-light` lamps and the deck's wet roughness.
- `focusEnvironmentBridge` holds the single shared engine. The timer screen
  dispatches `FOCUS_START` on mount and records the outcome on completion or
  failure (memory + AsyncStorage). When the balcony tab is next on screen it
  consumes that outcome and plays the reward or the fade — the user's focus
  brought the sunlight to their world.
- The balcony's new environment button cycles the presets; the dev stats chip
  shows the current state and a **Sunlight** button previews the reward.
- Audio layers `wind`, `city`, `insects`, `rain` are declared on the starter
  environment and mixed by the engine; they become audible as soon as their
  clips (`wind_light_a`, `city_distant_a`, `insects_night_a`, `rain_soft_a`)
  are added to `AudioEngine`'s `CLIPS`.

## Plant-specific light interaction

`GROWTH_FORM_LIGHT_RESPONSE` in `src/plants/plantLibrary.ts` gives each growth
form a sway multiplier, glossiness, translucency and shadow pattern (a snake
plant: stiff, narrow shadows; a fern: fine fragmented shadows, high
translucency; a monstera: glossy, dappled light through its holes). The
lighting stays identical; the plant's physical response differs — the 3D
plant stage will read these when plant GLBs replace the procedural stand-ins.

## Not yet

Real weather from a forecast API (`setWeather` is the hook), fountain
reflections synced to light, true fireflies in 3D (the night keyframe exposes
`particles.fireflies`; the rig draws dust and rain only), cloud shadows on the
floor, and the SVG balcony in `src/balcony/` — which keeps its own simpler
`environmentConfig` and is no longer in the tab bar.
