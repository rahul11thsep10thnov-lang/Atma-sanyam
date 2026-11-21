# UNREAL COMBAT — VISUAL DESIGN SPECIFICATION
## Delivery 01 · Visual identity and PH-HUD-001
**Engine target:** Unreal Engine 5.7 · **Platform priority:** Android phones, landscape · **Specification version:** v1.0 · **Date:** 21 November 2026

---

## Source review confirmation

I inspected the uploaded `UnrealCombat.zip` and read these exact files:

1. `UnrealCombat/Docs/VisualImplementationRegister.md`
2. `UnrealCombat/Docs/Architecture.md`, including **“What presentation binds to”**
3. `UnrealCombat/Docs/Roadmap.md`

The register confirms `PH-HUD-001` is currently a read-only placeholder, with `AUCDebugHUD` set as the `HUDClass` in `AUCGameMode`; it has no approved visual assets and is not compiled. Its listed data dependencies are `AUCGameState`, `AUCPlayerState`, `UUCVehicleHealthComponent`, `UUCWeaponComponent`, `UUCAbilityComponent`, and `UUCProfileSubsystem`.

The architecture confirms that presentation may read component health, directional armour, shield, fire and destroyed state; weapon ammo/reserve/heat/reload/overheated/mount-online state; ability cooldowns/charges/active state; speed; match mode/phase/clock/team scores/objectives/lives/winner; player kills/deaths/score/team; match result; and profile progression/economy/loadout/catalog data. The HUD below uses only the in-match data in that list. It does not invent gameplay rules or alter gameplay values.

The roadmap says the gameplay module is **not yet compiled**, an Android device build and performance measurement are still pending, and visual integration is scheduled after the first engine build, greybox play-loop validation and Android device build. All performance figures below are therefore design targets to validate, not measured results.

---

# 1. Visual identity and design system

## 1.1 Product identity

**Visual identity name:** IRON FRONT — Combat Systems Interface  
**Player-facing game name:** UNREAL COMBAT  
**Tone:** Industrial military engineering meets premium competitive vehicular combat. The interface should feel like a rugged vehicle combat system: precise, tactile, high-contrast and cinematic, never like a generic mobile fantasy game.

**Visual principles**
- **Combat clarity first:** critical information must be understood at a glance while the player is driving.
- **Machine-authentic:** use instrument-panel geometry, machined edges, bolted plates, vents, warning stencils and restrained technical markings.
- **Cinematic restraint:** the world and vehicles remain the visual heroes. HUD panels use dark translucent surfaces and controlled highlights.
- **Functional colour:** every colour communicates a consistent state; colour is never the only state indicator.
- **Touch-first hierarchy:** large hit targets belong to `PH-TOUCH-001`; the HUD itself is read-only and must not imitate buttons.
- **Cross-mode consistency:** the same HUD language is used for free-for-all, team deathmatch, mission and boss hunt. Mode-specific information appears only when the corresponding data exists.

## 1.2 Colour palette

| Token | HEX | Role |
|---|---|---|
| `UC-Graphite-950` | `#0B0F13` | Deep panel background |
| `UC-Graphite-900` | `#121920` | Main HUD panel |
| `UC-Graphite-800` | `#1C2730` | Raised panel / card |
| `UC-Steel-700` | `#394752` | Borders, inactive tracks |
| `UC-Steel-400` | `#8B9AA5` | Secondary labels, inactive icons |
| `UC-White` | `#F4F7F9` | Primary text and key values |
| `UC-Muted` | `#B1BBC2` | Supporting text |
| `UC-Amber-500` | `#FF9D24` | Primary emphasis, player/vehicle focus, selected state |
| `UC-Amber-300` | `#FFC15A` | Highlight edge and focus glow |
| `UC-Red-600` | `#D83A3A` | Critical damage, hostile warning |
| `UC-Red-400` | `#FF5A4F` | Critical alert glow |
| `UC-Green-500` | `#35C878` | Healthy / ready / operational |
| `UC-Cyan-500` | `#22B8D6` | Shield, energy, secondary system |
| `UC-Blue-600` | `#2676D8` | Team blue |
| `UC-Enemy-Red` | `#D94343` | Team red / enemy |
| `UC-Black-Overlay` | `#05080BCC` | Approx. 80% black overlay over gameplay |

**State mapping**
- Healthy / ready / online: green.
- Shield / energy / active shield recharge: cyan.
- Player focus / selected / primary callout: amber.
- Warning / degraded: amber, accompanied by a warning icon and text.
- Critical / destroyed / fire: red, accompanied by an icon and explicit label.
- Disabled / unavailable: steel grey with reduced opacity and no glow.
- Team identity: blue and red only in team-context elements. Do not use team colours for generic health.

Contrast target: primary text should meet WCAG AA contrast against its panel. Use a dark backing plate or stronger text contrast when the world behind the HUD is bright. Never rely on hue alone; pair state colour with icon, label, shape or bar pattern.

## 1.3 Typography and commercial licences

Use open-font licences that permit commercial embedding and redistribution in a game, subject to retaining the licence/notice files in the project’s third-party notices.

| Use | Typeface | Licence | Treatment |
|---|---|---|---|
| Display / match title / major numbers | **Rajdhani** | SIL Open Font License 1.1 | SemiBold/Bold; compact, engineered, highly legible |
| General UI / labels / descriptions | **Inter** | SIL Open Font License 1.1 | Medium/SemiBold; neutral and readable |
| Optional condensed numeric fallback | Rajdhani | SIL Open Font License 1.1 | Tabular-looking numerals where supported |

**Font assets:** obtain the official font files and licence text from their upstream Google Fonts repositories. Package the exact OFL `OFL.txt` with each family. Do not use proprietary system fonts or assume a font is free merely because it is downloadable.

**HUD type scale at 1920×1080 reference**
- Match clock: 42 px Rajdhani Bold.
- Speed numeral: 64 px Rajdhani Bold; unit 22 px Inter SemiBold.
- Team score: 30 px Rajdhani Bold.
- Weapon ammo: 28 px Rajdhani Bold.
- Component / armour values: 17 px Inter SemiBold.
- Panel heading: 18 px Rajdhani Bold, uppercase.
- Supporting labels: 14–16 px Inter Medium.
- Micro labels: 12 px Inter Medium; avoid below 12 px on phones.

Scale these dimensions proportionally with the UI scale. Do not shrink below comfortable phone legibility to preserve a desktop-like density.

## 1.4 Spacing, sizing and panel geometry

- Base spacing unit: **8 px** at the 1920×1080 reference.
- Common spacing: 8 / 16 / 24 / 32 / 40 px.
- HUD outer safe margin: 32 px minimum, increased to 48 px where the device safe area requires it.
- Panel corner treatment: clipped or chamfered corners, 2 px steel outline, 4 px amber accent only on the player-focus edge.
- Panel fill: `#121920` at 88–94% opacity; avoid fully opaque large rectangles.
- Internal panel padding: 16–20 px.
- Bar height: 8–10 px for secondary bars; 12 px for prominent status.
- Icon sizes: 24 px standard; 32 px for major status; 40–48 px for large ability/weapon pictograms.
- Keep a minimum 8 px visual gap between separate data groups.

## 1.5 Iconography

Use a consistent custom industrial line-icon family:
- 2 px nominal stroke at 24 px grid, square/technical geometry, slightly chamfered corners.
- Solid silhouette variant for critical states and small-size readability.
- No emoji, mixed icon packs, thin hairlines or decorative pictograms.
- Icons must have a text label or another clear state cue when ambiguity is possible.
- Vehicle damage diagram is a top-down technical silhouette with nine distinct component zones; directional armour is a six-face diagram, not a generic shield icon.
- Weapon and ability icons are unique silhouettes, not colour-only variants.

**Asset delivery:** SVG masters for scalable icons and diagrams; export PNG atlases for runtime only if the integration pipeline requires raster textures. Keep source SVGs in the visual source package.

## 1.6 Motion principles

- Motion communicates state change, not decoration.
- Standard panel / value transition: 160–220 ms, ease-out.
- Press response belongs to the touch-control specification, not this read-only HUD.
- Warning pulse: 700–900 ms, low-amplitude brightness change; never flash the whole screen.
- Critical alert: one 180 ms emphasis transition, then a restrained 1.0 s pulse while critical state persists.
- Health/armour bar interpolation: 180 ms ease-out; do not animate every frame if the value is changing continuously.
- New match phase: 250 ms panel emphasis and 300 ms settle.
- Match-end transition is specified later under the transitions component.
- Avoid camera shake, excessive bloom, looping decorative movement and high-frequency flashing in the HUD.

## 1.7 UI scaling and safe-area policy

The authored reference canvas is 1920×1080 landscape. Use a scale-to-fit layout with **edge-anchored HUD groups** and a central gameplay-safe region. Do not stretch individual panels non-uniformly.

- **20:9 phone (e.g. 2400×1080):** retain the 1920×1080 logical height scale; use the additional horizontal width to increase the gap around the central gameplay view. Do not enlarge all HUD panels merely because the screen is wider.
- **4:3 tablet (e.g. 1440×1080):** scale the HUD groups uniformly from the reference. Keep left and right panels inside the 4:3 safe rectangle; if the layout collides, use the compact layout variant defined below rather than overlaying the centre driving view.
- **Notches / cut-outs / rounded corners:** all anchors must be offset by the platform-provided safe insets. Never place critical text or indicators under a cut-out.
- **Landscape rotation:** the game is designed for landscape. If orientation changes, reflow only after the viewport and safe insets have stabilised.
- **Readable area:** protect the central 55% of screen width and central 55% of screen height as the preferred view through which the player reads the road and threats.

---

# 2. PH-HUD-001 — In-match HUD

**Component ID:** `PH-HUD-001`  
**Specification:** `v1.0`  
**Register destination:** `AUCDebugHUD` (currently configured as `HUDClass` in `AUCGameMode`)  
**Register data dependencies:** `AUCGameState`, `AUCPlayerState`, `UUCVehicleHealthComponent`, `UUCWeaponComponent`, `UUCAbilityComponent`, `UUCProfileSubsystem`  
**Interaction model:** read-only. No HUD panel or indicator is a button. Driving, firing, reload and ability inputs belong to `PH-TOUCH-001`.

## 2.1 Design intent and information priority

The HUD must let a player answer, in this order:
1. Is my vehicle operational, and what is damaged?
2. What is the current match state, time and objective?
3. What weapons are available, and what are their ammo/heat/reload states?
4. Which abilities are available, active or cooling down?
5. How fast am I moving, and how is my team/player performing?

The gameplay view remains dominant. Panels must not cover the vehicle’s forward path or the likely centre of combat.

## 2.2 Reference layout — 1920×1080

All dimensions below are reference pixels before platform safe-area offsets.

| Region | X | Y | W | H | Anchor | Content |
|---|---:|---:|---:|---:|---|---|
| Vehicle status | 32 | 32 | 390 | 330 | Top-left | Nine component-health rows, six armour faces, shield and fire state |
| Match status | 700 | 24 | 520 | 116 | Top-centre | Mode, phase and match clock |
| Score / objective | 1450 | 32 | 438 | 210 | Top-right | Team scores when applicable; objectives and lives when supplied |
| Speed instrument | 32 | 780 | 250 | 250 | Bottom-left | Speed in km/h |
| Primary weapon | 600 | 850 | 330 | 190 | Bottom-centre-left | Primary weapon ammo/reserve, heat, reload/overheat and mount status |
| Secondary weapon | 950 | 850 | 330 | 190 | Bottom-centre-right | Secondary weapon ammo/reserve, heat, reload/overheat and mount status |
| Ability strip | 1320 | 850 | 568 | 190 | Bottom-right | Available abilities and their cooldown/charge/active state |
| Player compact stats | 32 | 690 | 250 | 70 | Bottom-left, above speed | Player kills, deaths and score; may be collapsed if not populated |

**Important:** The table is a design allocation, not a requirement to render empty containers. If a data field is absent for a mode, hide that sub-element and reclaim its space. Never show fake values, placeholder dashes that look like data, or a disabled-looking control for a feature that does not exist.

### Compact 4:3 adaptation

At 1440×1080:
- Vehicle status: 28, 28, 340, 310.
- Match status: centred, 500×104.
- Score/objective: 1090, 28, 322, 190.
- Speed: 28, 820, 210, 210.
- Weapon cards: 470, 870, 250, 160 and 730, 870, 250, 160.
- Ability strip: 1000, 870, 412, 160; use compact ability tiles.
- If the vehicle status and score/objective groups collide after safe-inset application, reduce panel width and abbreviate labels; do not move information over the central driving view.
- Component rows may use icon + short label + bar only; omit numeric values if the available width is insufficient.

### 20:9 adaptation

At 2400×1080:
- Keep the same vertical positions and logical panel sizes.
- Edge-anchor left groups to the left safe inset and right groups to the right safe inset.
- Centre match status on the viewport.
- Use the extra horizontal space to separate weapon cards and ability strip from the central vehicle view; do not stretch cards to fill the width.

## 2.3 Element-by-element specification

### A. Vehicle status panel

**Layout:** 390×330 px. Top-left. Header height 34 px. Top-down vehicle diagram on the left (112×150 px); component list on the right (220 px wide), with a lower strip for armour/shield/fire state.

**Data shown (architecture terminology):**
- `Component health` for: chassis, engine, fuel tank, four wheels and two weapon mounts.
- `Armour` / directional ablative armour for six armour faces.
- `Shield`.
- `Fire`.
- `Destroyed` state, including `OnComponentDestroyed` and `OnVehicleDestroyed` events.

**Presentation**
- Nine component rows, each with a stable icon, short component name and health bar.
- The vehicle diagram highlights the corresponding zone when that component is damaged/destroyed.
- Six-face armour indicator: Front, Rear, Left, Right, Top, Bottom. Use a hexagonal/vehicle-oriented diagram; label all six faces in expanded view.
- Shield appears as a cyan horizontal bar with a shield icon.
- Fire state appears as a red flame icon and explicit `FIRE` label; if not on fire, show a muted `NO FIRE`/inactive state only if the getter supplies a definitive false state.
- Destroyed component: red fill/outline, broken-component glyph and `DESTROYED` label. Do not remove the row; the player must be able to identify the failed part.

**States**
- Normal: healthy green bar, steel outline.
- Damaged: bar transitions from green to amber as health falls; preserve the numeric source value only if exposed by the getter.
- Critical: red bar, red warning marker and `CRITICAL` text.
- Destroyed: empty/broken bar, red destroyed glyph and label.
- Armour depleted: zero/empty face bar with red edge; do not imply the whole vehicle is destroyed.
- Shield depleted: empty cyan track and a brief 180 ms depletion emphasis.
- Fire active: persistent red flame indicator; no continuous screen flash.
- Data unavailable: hide that specific value group or show a neutral “—” label; never fabricate a percentage.

**Animation:** health/armour bar change 180 ms ease-out; destroyed state 220 ms transition; fire-on transition 180 ms then 900 ms restrained pulse while active.

### B. Match status panel

**Layout:** 520×116 px, top-centre. Mode label above or integrated into a clipped metal header; match clock is the largest element; phase is a smaller secondary line.

**Data shown:** `Mode`, `phase`, `clock` from `AUCGameState`.

**Mode labels:** Free-for-all, Team Deathmatch, Mission, Boss Hunt. Display the exact mode supplied by the game state; do not infer it from team scores or objectives.

**States**
- Normal: white clock, amber mode accent.
- Final/low-time emphasis: amber emphasis only if the game state exposes the relevant phase/state; do not invent a threshold.
- Match phase change: brief amber edge sweep.
- Paused or waiting: only show if the actual match phase/state provides it.
- Missing clock/mode: hide the unavailable field; do not display a made-up countdown.

**Animation:** phase change 250 ms ease-out; clock updates without per-second scaling or flashing.

### C. Score and objective panel

**Layout:** 438×210 px, top-right. Team score strip at top; objective cards below. Collapse unused sections.

**Data shown:**
- `team scores` from `AUCGameState`.
- `objectives` from `AUCGameState`.
- `lives` from `AUCGameState`.
- `winner` only for an end-of-match state; full results presentation belongs to the results component.

**Mode behaviour**
- Team Deathmatch: show both team scores and team identity colours.
- Free-for-all: do not show a team-vs-team score panel; use player compact stats instead.
- Mission: show supplied objective text/state and lives when present.
- Boss Hunt: show supplied objective text/state. Do not add a boss health bar unless boss health is explicitly exposed through the architecture’s presentation bindings; it is not listed in the current “What presentation binds to” table.
- If objectives are an array or structured collection, render only the supplied objective labels and states. No fabricated objective count or completion percentage.

**States:** normal, objective updated, objective completed/failed if that state is supplied, low-lives warning if a lives value exists, unavailable/empty (collapse the panel). Objective update animation 200 ms; completed state 220 ms green edge emphasis; failed state 220 ms red edge emphasis.

### D. Speed instrument

**Layout:** 250×250 px, bottom-left. Circular instrument with large numeric value, `km/h` unit and restrained amber speed arc.

**Data shown:** `Speed` from `AUCVehiclePawn::GetSpeedKmh`.

**States:** normal; stationary/near-zero; high-speed visual range; unavailable. Do not add boost multipliers, gear, RPM, drift score or traction telemetry because those are not listed as presentation data.

**Animation:** numeric interpolation 120 ms; arc follows the displayed speed. No pulsing or flashing at high speed.

### E. Weapon cards — primary and secondary

**Layout:** each 330×190 px. Two equal cards near bottom-centre. Each card includes weapon identity/icon, ammo/reserve, heat bar, mount status and reload/overheat state.

**Data shown:** `Ammo`, `reserve`, `heat`, `reloading`, `overheated`, `mount online` from `UUCWeaponComponent::GetWeaponState` / `OnStateChanged`.

**Important data boundary:** the architecture names these fields but does not define a public weapon display name, weapon icon asset, magazine capacity label or exact numeric units in this document. Use a weapon icon/name supplied by the selected weapon definition only if the runtime presentation binding exposes it; otherwise use the generic `PRIMARY WEAPON` / `SECONDARY WEAPON` label. Do not invent weapon names.

**States**
- Ready: ammo and reserve readable; mount-online green.
- Low ammo: amber emphasis only if an actual ammo value/capacity allows a meaningful comparison; otherwise show the value without a threshold warning.
- Empty magazine: display zero ammo; retain reserve if supplied.
- Reloading: show `RELOADING` and a progress treatment only if reload progress is exposed. The architecture confirms a reloading state, not a reload-progress value; absent progress, use a static state label.
- Overheated: red/amber heat warning and `OVERHEATED` label.
- Mount offline: muted card, explicit `MOUNT OFFLINE`; weapon art remains visible but desaturated.
- Missing weapon state: hide the card or show a neutral unavailable state; never display fake ammo.

**Animation:** ammo changes 100 ms numeric crossfade; reload state 150 ms; overheat transition 180 ms; mount-online/offline 180 ms.

### F. Ability strip

**Layout:** up to four compact tiles within 568×190 px. One tile per ability actually present in `GetAbilityStates`. Do not reserve a tile for an ability not equipped/available.

**Known ability types from the project brief / architecture:** repair kit, boost, shield recharge, extinguisher.

**Data shown:** `Ability cooldowns`, `charges`, `active` from `UUCAbilityComponent::GetAbilityStates` / `OnAbilitiesChanged`.

**Tile contents:** ability icon, ability label, charges if exposed, cooldown state if exposed, active state if exposed. No decorative button treatment, no tap affordance and no touch action; the actual ability input belongs to `PH-TOUCH-001`.

**States**
- Ready: green status marker and `READY`.
- Cooldown: radial/linear cooldown representation only if cooldown value is exposed; otherwise show `COOLDOWN` without a fabricated timer.
- No charges: muted icon and `NO CHARGES` if charges are exposed as zero.
- Active: cyan/amber active outline and `ACTIVE`.
- Unavailable/not equipped: omit the tile.
- State unknown: neutral tile without a readiness claim.

**Animation:** state transition 160 ms; cooldown ring updates smoothly but not more than 10 visual updates per second; active outline is steady, not a rapid pulse.

### G. Player compact stats

**Layout:** compact row above the speed instrument; collapse if space is constrained.

**Data shown:** player `kills`, `deaths`, `score`, `team` from `AUCPlayerState`.

**States:** normal; team-colour accent where a team is assigned; omit team marker in free-for-all if no team exists. Do not invent assists, rank, damage dealt or leaderboard position.

**Animation:** score change 150 ms count-up/crossfade; no celebratory animation during active driving.

## 2.4 Global HUD states

| State | Behaviour |
|---|---|
| Normal | All available data groups visible; no unnecessary animation |
| Warning | Only the affected panel/element receives amber emphasis |
| Critical | Affected element uses red, explicit label and restrained pulse |
| Destroyed | Persistent component/vehicle destroyed indication; never represented by colour alone |
| Empty | Hide the empty group or show a concise empty state only where it helps explain absence |
| Disabled / offline | Muted state plus explicit label; not a fake button |
| Data unavailable | Hide or neutralise the exact field; never substitute a guessed value |
| Match ended | HUD yields visual priority to the dedicated results screen; no results layout is embedded in the HUD |

## 2.5 Input and interaction boundary

`PH-HUD-001` is **read-only**. The following are not clickable:
- Weapon cards.
- Ability tiles.
- Speed instrument.
- Vehicle damage diagram.
- Match clock, score or objective panels.

All player inputs are handled by `PH-TOUCH-001` and the existing Enhanced Input actions. Do not implement a second input path through HUD widgets.

## 2.6 Asset manifest

All source assets should be delivered in a versioned folder, e.g. `Visual/PH-HUD-001/v1.0/`.

| File name | Format | Source / export size | Purpose |
|---|---|---:|---|
| `HUD_Panel_Base_9Slice.svg` / `.png` | SVG + PNG | 512×256 source / 512×256 export | Reusable panel frame |
| `HUD_Panel_Accent_Amber.svg` | SVG | Vector | Amber edge accent |
| `HUD_Icon_Component_Chassis.svg` | SVG | 64×64 viewBox | Chassis status |
| `HUD_Icon_Component_Engine.svg` | SVG | 64×64 viewBox | Engine status |
| `HUD_Icon_Component_FuelTank.svg` | SVG | 64×64 viewBox | Fuel tank status |
| `HUD_Icon_Component_Wheel.svg` | SVG | 64×64 viewBox | Four wheel rows |
| `HUD_Icon_Component_WeaponMount.svg` | SVG | 64×64 viewBox | Two weapon mount rows |
| `HUD_Vehicle_DamageDiagram.svg` | SVG | 512×512 viewBox | Nine-zone top-down vehicle diagram |
| `HUD_Armour_SixFaceDiagram.svg` | SVG | 512×512 viewBox | Six directional armour faces |
| `HUD_Icon_Shield.svg` | SVG | 64×64 viewBox | Shield state |
| `HUD_Icon_Fire.svg` | SVG | 64×64 viewBox | Fire state |
| `HUD_Icon_Ammo.svg` | SVG | 64×64 viewBox | Ammo |
| `HUD_Icon_Heat.svg` | SVG | 64×64 viewBox | Weapon heat |
| `HUD_Icon_Reload.svg` | SVG | 64×64 viewBox | Reload state |
| `HUD_Icon_MountOnline.svg` | SVG | 64×64 viewBox | Mount online |
| `HUD_Icon_MountOffline.svg` | SVG | 64×64 viewBox | Mount offline |
| `HUD_Icon_Ability_Repair.svg` | SVG | 96×96 viewBox | Repair kit |
| `HUD_Icon_Ability_Boost.svg` | SVG | 96×96 viewBox | Boost |
| `HUD_Icon_Ability_ShieldRecharge.svg` | SVG | 96×96 viewBox | Shield recharge |
| `HUD_Icon_Ability_Extinguisher.svg` | SVG | 96×96 viewBox | Extinguisher |
| `HUD_Icon_Objective.svg` | SVG | 64×64 viewBox | Objective marker |
| `HUD_Icon_Lives.svg` | SVG | 64×64 viewBox | Lives |
| `HUD_Icon_Kills.svg` | SVG | 64×64 viewBox | Kills |
| `HUD_Icon_Deaths.svg` | SVG | 64×64 viewBox | Deaths |
| `HUD_Icon_Score.svg` | SVG | 64×64 viewBox | Score |
| `HUD_Icon_TeamBlue.svg` / `HUD_Icon_TeamRed.svg` | SVG | 64×64 viewBox | Team identity |
| `HUD_Font_Rajdhani_*` | TTF/OTF | Official font files | Display and numeric text |
| `HUD_Font_Inter_*` | TTF/OTF | Official font files | UI text |
| `OFL_Rajdhani.txt` / `OFL_Inter.txt` | TXT | Upstream licence files | Commercial distribution notices |

**Runtime texture guidance:** rasterise scalable UI art at the actual target density and use atlases/material reuse where supported. Avoid shipping redundant 2K/4K versions of small HUD glyphs. Keep vector masters as source-of-truth. Do not rasterise live text into textures.

## 2.7 Performance and accessibility constraints

**Initial design targets (not yet device-measured):**
- Target device class: mid-range Android phone, landscape, 6 GB RAM class as the baseline validation device; include a lower-mid-range 4 GB RAM device in compatibility testing.
- Frame-rate target: 60 FPS target on the baseline device; 30 FPS minimum fallback on lower-end devices if the game’s overall rendering budget requires it. HUD must not be the reason for a missed frame.
- HUD update policy: event-driven updates for health, weapons and abilities; clock updates at the display cadence needed for legibility; speed display capped at 10–15 updates per second.
- Avoid per-frame widget tree rebuilds. Update only the affected value/element.
- No full-screen HUD blur, expensive dynamic material stacks or real-time render targets.
- UI texture budget target: **8 MB compressed GPU memory** for the HUD’s own raster assets, excluding fonts and shared game textures. Aim for 4 MB where possible. Font memory is tracked separately.
- Keep HUD draw calls and overdraw low; use shared materials and atlases.
- Accessibility: no state communicated by colour alone; minimum 12 px reference label size; maintain strong contrast and avoid rapid flashing.

These targets must be measured on-device after the first Android build. If the game’s world rendering already consumes the frame budget, reduce HUD animation and texture use before reducing critical information legibility.

## 2.8 Acceptance checklist

- [ ] Reads only the architecture-listed sources and data.
- [ ] Works in all four modes: free-for-all, team deathmatch, mission, boss hunt.
- [ ] Correctly hides mode-inapplicable or unavailable fields.
- [ ] Displays all nine damageable components and all six armour faces.
- [ ] Shows shield, fire and destroyed states without relying on colour alone.
- [ ] Shows primary and secondary weapon ammo/reserve/heat/reloading/overheated/mount-online state.
- [ ] Shows only equipped/available abilities and their exposed cooldown/charges/active state.
- [ ] Shows speed, mode, phase, clock, team scores, objectives, lives and player stats only when supplied.
- [ ] Does not contain interactive-looking controls.
- [ ] Respects safe insets and the 20:9 / 4:3 layouts.
- [ ] No HUD update causes per-frame full-screen widget reconstruction.
- [ ] Compiles in UE 5.7 and passes editor/device testing.
- [ ] Performance is measured on the named Android test devices; measured results are recorded in the register.

## 2.9 Functional requests / developer questions

These are **not designed as if they already exist**. They require developer confirmation or implementation only if approved:

1. **HUD rendering host:** the register currently points to `AUCDebugHUD`. Confirm whether the polished HUD should be implemented with UMG widgets hosted by the HUD/controller, or drawn through the existing HUD class. Preserve the presentation/gameplay separation either way.
2. **Component health display contract:** confirm whether getters expose current and maximum health for each component, and whether armour exposes current and maximum value for each of the six faces. If only raw values are available, document units before showing numeric values.
3. **Weapon identity:** confirm whether presentation can read the selected weapon definition/name/icon for each mount. The architecture table confirms weapon state but does not explicitly list a display-name/icon binding.
4. **Reload progress:** current architecture confirms `reloading` state but does not list reload progress. Add a read-only progress value only if a reliable getter/event is available; otherwise the HUD will show a static `RELOADING` state.
5. **Ability cooldown representation:** confirm whether `GetAbilityStates` exposes cooldown remaining and maximum cooldown, charges and active duration. The design will not invent a countdown when only a boolean/state exists.
6. **Objective schema:** document the exact objective fields exposed to presentation (label, status, optional progress). The current table confirms objectives but not their detailed schema.
7. **Boss health:** not listed in the presentation binding table. Do not add a boss health bar until a presentation-safe getter/event is explicitly approved.
8. **Low-ammo / critical thresholds:** no threshold values are specified in the presentation table. If designers want warning thresholds, expose them from data or approve a presentation-only threshold policy separately.
9. **Safe-area source:** confirm the Android safe-area/viewport inset mechanism used by the UE 5.7 project and validate notched devices.
10. **Localisation:** roadmap identifies HUD strings as not localised. Confirm the localisation pipeline and provide string-table keys before final integration.

---

## Delivery boundary

This is **Delivery 01 only**: visual identity/design system and `PH-HUD-001 v1.0`. The remaining register components are intentionally not specified in this document. Their next priority is `PH-TOUCH-001`, then results/rewards, main menu/navigation, garage/loadout, store, mission select, scoreboard and transitions, as requested.
