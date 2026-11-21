# UNREAL COMBAT — REVISED VISUAL SPECIFICATION
## Delivery 02 · PH-TOUCH-001 v1.0 + PH-HUD-001 v1.1
**Engine:** Unreal Engine 5.7 · **Platform:** Android first · **Orientation:** Landscape  
**Reference canvas:** 1920 × 1080 · **Date:** 21 November 2026

---

# 0. Source review and revision basis

I reopened the uploaded `UnrealCombat.zip` and re-read:

- `UnrealCombat/Docs/VisualImplementationRegister.md`
- `UnrealCombat/Docs/Architecture.md`, section **“What presentation binds to”**
- `UnrealCombat/Docs/Roadmap.md`

I also applied the developer's ten answers and six design problems supplied in the current conversation. The source documents still establish the original register destinations and data boundaries; the developer's answers below are treated as approved additions/changes to the presentation contract, not as claims that those additions are already implemented.

## 0.1 Register version changes

| Component ID | Version in this delivery | Unreal destination | Register action |
|---|---:|---|---|
| `PH-TOUCH-001` Touch driving and combat controls | **v1.0** | `Config/DefaultInput.ini`; Enhanced Input actions on `AUCVehiclePawn` | Replace engine default virtual sticks with specified touch layout |
| `PH-HUD-001` In-match HUD | **v1.1** | UMG widgets replacing the placeholder text HUD; hosted by the HUD/player UI flow | Replace v1.0 design; adjust layout around thumb zones |

**Implementation rule:** use UMG for the HUD. The existing placeholder text HUD is removed/replaced when this approved UMG implementation is integrated. Touch controls invoke the existing Enhanced Input actions; they do not implement gameplay rules.

## 0.2 Confirmed presentation data contract

### Existing source contract
The architecture table exposes:
- Component health, armour, shield, fire and destroyed state.
- Ammo, reserve, heat, reloading, overheated and mount-online state.
- Ability cooldowns, charges and active state.
- Vehicle speed.
- Match mode, phase, clock, team scores, objectives, lives and winner.
- Per-player kills, deaths, score and team.
- End-of-match result and levels gained.
- Profile progression and economy data.

### Developer-confirmed additions / clarifications for this delivery
These are approved as developer commitments:
- Component health and each armour face are exposed as **normalised percentages from 0.0 to 1.0**.
- Each weapon definition will gain a **display name** and **icon**.
- Weapon state will gain a **reload end time**, enabling a presentation progress bar when combined with the reload start/current time available to the UI.
- Each ability reports **active state, effect end time, ready-again time and charges remaining**. Developer will add **total cooldown length**.
- Each objective has **ID, type, required count, current progress and optional flag**. Developer will add **display text**. Objective completion is derived as `progress >= required count`. There is no per-objective failed state in this contract.
- Boss health is approved for display. Developer will add a lookup to obtain the boss vehicle; the boss is an ordinary vehicle and its health is already replicated to every player.
- All UI text uses Unreal **string tables**. This document supplies localisation keys.
- Unreal **Safe Zone** widget and DPI scaling handle safe insets and scale.

### Display-only design thresholds
These are presentation policy, not gameplay rules:
- **Low ammo:** warning when remaining magazine ammo is at or below 25% of magazine capacity.
- **Critical ammo:** critical when remaining magazine ammo is at or below 10% of magazine capacity; zero is empty.
- **Low match time:** warning when 25% or less of the original match duration remains, if original duration is exposed. Otherwise do not infer a percentage from elapsed time.
- **Critical match time:** critical when 10% or less remains, if original duration is exposed.
- **Component health / armour:** warning at 50% or less; critical at 25% or less; destroyed at 0%. These thresholds only change presentation colour/labels, never gameplay.
- **Shield:** warning at 25% or less; critical at 10% or less; depleted at 0%.
- **Weapon heat:** use the weapon's `overheated` state as authoritative. Do not invent a heat threshold if it differs from that state.
- **Lives:** no numeric warning threshold in this delivery; display the supplied value without guessing what is “low”.

Threshold comparisons are performed against normalised 0–1 values. Boundary behaviour: `<=` threshold. The UI must not round a value upward into a healthier state. If numeric percentages are displayed, round to the nearest whole percent while retaining the underlying threshold state.

---

# 1. Revised visual design system — v1.1

## 1.1 Identity

**Identity:** IRON FRONT — Combat Systems Interface  
**Player-facing name:** UNREAL COMBAT  
**Tone:** rugged industrial engineering, premium competitive vehicular combat, cinematic battlefield realism.

Keep the core visual identity from v1.0, with the following important semantic colour corrections.

## 1.2 Revised semantic colour palette

The previous red and amber assignments were ambiguous. This revision separates team identity, damage severity and player-vehicle identity.

| Token | HEX | Meaning |
|---|---|---|
| `UC-Graphite-950` | `#0B0F13` | Deep panel background |
| `UC-Graphite-900` | `#121920` | Main HUD panel |
| `UC-Graphite-800` | `#1C2730` | Raised panel |
| `UC-Steel-700` | `#394752` | Borders / inactive tracks |
| `UC-Steel-400` | `#8B9AA5` | Secondary labels |
| `UC-White` | `#F4F7F9` | Primary text |
| `UC-Muted` | `#B1BBC2` | Supporting text |
| `UC-Player-Amber` | `#FFB000` | Own vehicle identity, player marker, own-team neutral emphasis |
| `UC-Action-Orange` | `#F07824` | Touch action / selected action highlight |
| `UC-Warning-Yellow` | `#FFD43B` | Warning state only |
| `UC-Critical-Magenta` | `#E0448A` | Critical damage / critical system warning |
| `UC-Destroyed-Red` | `#B4232F` | Destroyed component / vehicle destroyed |
| `UC-Enemy-Red` | `#E84A3B` | Enemy team identity |
| `UC-Healthy-Green` | `#35C878` | Healthy / ready / operational |
| `UC-Shield-Cyan` | `#22B8D6` | Shield and energy |
| `UC-Team-Blue` | `#2676D8` | Blue team identity |

**Colour semantics are exclusive:**
- Player vehicle identity = amber-gold.
- Warning = bright yellow.
- Critical damage = magenta.
- Destroyed = deep red.
- Enemy team = brighter orange-red.
- Team blue = blue.
- Healthy = green.
- Shield = cyan.

Never use the player-identity amber as a warning colour. Never use enemy red as the critical damage colour. Add icons, labels and bar patterns so meaning remains clear for colour-blind players and in bright scenes.

## 1.3 Typography, spacing and iconography

Retain the v1.0 typography and spacing system:
- Rajdhani (SIL Open Font License 1.1) for display and numeric emphasis.
- Inter (SIL Open Font License 1.1) for UI labels and body text.
- 8 px reference spacing grid.
- Technical industrial line icons with bold silhouette variants.
- Minimum 12 px reference text for secondary labels; critical labels should be 14 px or larger.
- Use official upstream font files and retain OFL licence notices.

## 1.4 Motion

- Standard transitions: 160–220 ms ease-out.
- Health and armour bar interpolation: 180 ms ease-out.
- Warning emphasis: 700–900 ms restrained pulse.
- Critical emphasis: one 180 ms entry plus a restrained 1 s pulse while critical persists.
- Touch feedback: 80–120 ms visual response; never delay the input event to finish an animation.
- Avoid repeated high-frequency flashes and full-screen HUD effects.

---

# 2. PH-TOUCH-001 — Touch driving and combat controls

**Component ID:** `PH-TOUCH-001`  
**Specification:** **v1.0**  
**Destination:** `Config/DefaultInput.ini`; existing Enhanced Input actions on `AUCVehiclePawn`  
**Purpose:** replace engine default virtual sticks with a deliberate landscape mobile control scheme.  
**Input actions:** throttle, steer, handbrake, fire primary, fire secondary, reload, abilities.

## 2.1 Design goals

1. Keep the left thumb dedicated to steering and throttle.
2. Keep the right thumb dedicated to primary/secondary fire, reload and abilities.
3. Do not put non-interactive HUD panels inside thumb operating areas.
4. Use large touch targets with visible pressed states.
5. Support left-handed and right-handed layouts through a mirrored layout option.
6. Controls must map to the existing Enhanced Input actions; no gameplay logic is added to the UI.
7. The touch interface must remain usable on 20:9 phones and 4:3 tablets.

## 2.2 Touch zones

Reference canvas: 1920 × 1080. Safe-area insets are applied before positioning.

### Primary thumb zones

| Zone | Reference rectangle | Purpose |
|---|---|---|
| Left thumb zone | X 0–560, Y 500–1080 | Steering and throttle |
| Right thumb zone | X 1320–1920, Y 470–1080 | Fire, reload, ability activation |
| Central gameplay-safe zone | X 560–1320, Y 180–900 | Keep mostly free of controls and HUD |
| Upper HUD band | Y 24–390 | Non-interactive HUD panels only |

The exact visible control positions below are measured from the 1920×1080 reference and then offset inward by the Safe Zone widget.

## 2.3 Layout

### A. Left virtual driving pad

**Component sub-ID:** `PH-TOUCH-001-LPAD`  
**Position:** bottom-left. Base centre at (270, 825), outer diameter 300 px, inner thumb knob diameter 112 px.  
**Active region:** X 80–460, Y 635–1015.  
**Actions:** horizontal axis → `steer`; vertical axis → `throttle`.

**Behaviour**
- Thumb displacement maps to normalised input from -1 to +1.
- Horizontal centre = neutral steering.
- Vertical up = forward throttle; vertical down = reverse throttle.
- On thumb release, the control returns smoothly to neutral over 90 ms.
- The touch pad must not retain a stale input after focus loss, pause, widget removal or touch cancellation.
- If the current Enhanced Input mapping treats throttle as a one-direction trigger rather than an axis, map the positive/negative vertical halves to the existing forward/reverse semantics already supported by the action; do not add a new driving rule.

**States**
- Idle: 18% opacity base ring, 12% opacity inner pad.
- Pressed: 45% opacity base, amber-gold rim and visible thumb knob.
- Active steering/throttle: direction tick/arc indicates input magnitude.
- Disabled: hidden when the vehicle cannot accept input (e.g. input disabled by existing game state); do not invent a new state rule.
- Cancelled/focus lost: immediately neutralise both axes.

**Motion:** knob follows finger with no smoothing lag beyond input sampling; release-to-centre 90 ms ease-out.

### B. Handbrake button

**Component sub-ID:** `PH-TOUCH-001-HANDBRAKE`  
**Position:** X 440, Y 870; 116×116 px circular target, with 96 px visible face.  
**Action:** `handbrake`.

**Behaviour**
- Press and hold maps to handbrake active.
- Release/cancel maps to inactive.
- No toggle mode in v1.0.
- Label `HANDBRAKE`; icon uses a brake/vehicle skid pictogram.

**States:** idle, pressed, disabled, cancelled. Press response 90 ms; release response 100 ms.

### C. Primary fire button

**Component sub-ID:** `PH-TOUCH-001-FIRE-PRIMARY`  
**Position:** X 1600, Y 790; 184×184 px target.  
**Action:** `fire primary`.

**Behaviour**
- Hold to fire while the input is valid.
- Release sends the release state.
- Must respect the weapon's own mount-online, ammo, reload and overheat rules; the UI does not simulate firing or ammo.
- Use the existing Enhanced Input action and current fire intent path.

**States:** idle, pressed, unavailable if the associated mount is offline, disabled when input is blocked, cancelled. The unavailable state is visual only and does not invent a gameplay lockout.

### D. Secondary fire button

**Component sub-ID:** `PH-TOUCH-001-FIRE-SECONDARY`  
**Position:** X 1390, Y 900; 144×144 px target.  
**Action:** `fire secondary`.

**Behaviour:** same hold/release semantics as primary fire. Distinct silhouette and label `SECONDARY`.

### E. Reload button

**Component sub-ID:** `PH-TOUCH-001-RELOAD`  
**Position:** X 1430, Y 650; 112×112 px target.  
**Action:** `reload`.

**Behaviour**
- Tap triggers the existing reload input action once.
- Disabled/greyed visual state while reloading or when reload cannot be requested, based only on weapon state exposed to the UI.
- The button is not held continuously.

### F. Ability buttons

**Component sub-ID:** `PH-TOUCH-001-ABILITY-*`  
**Position:** four 104×104 px targets, arranged as a vertical/diagonal cluster above and left of the primary fire button, avoiding overlap with the primary fire target.

| Ability | Centre (x,y) | Target size |
|---|---:|---:|
| Repair Kit | (1510, 500) | 104×104 |
| Boost | (1630, 600) | 104×104 |
| Shield Recharge | (1760, 480) | 104×104 |
| Extinguisher | (1800, 640) | 104×104 |

The cluster uses only abilities actually present in the player's ability state/equipment. If fewer than four exist, distribute available abilities with even spacing around the same cluster. Do not show empty or fake ability slots.

**Actions:** map each ability tile to the existing ability activation action/identifier. Do not implement ability effects in the widget.

**Tile content:** ability icon, compact label, charges remaining if exposed, cooldown radial if exposed, active state if exposed.

**States**
- Ready: green small ready marker.
- Pressed: amber-orange rim and 0.96 scale feedback.
- Active: cyan active ring.
- Cooldown: radial progress based on total cooldown length and ready-again time.
- No charges: muted icon and `0` count; still allow the existing input action to decide validity if required by the action architecture.
- Unavailable/not equipped: hidden.
- Disabled by game input state: muted and non-interactive.

**Touch behaviour:** tap once to activate. No hold-to-repeat. Input dispatch is immediate; visual response 90 ms.

### G. Optional control-layout settings

The register does not currently list a settings screen component. These are functional requests, not assumed existing UI:
- Left-handed mode (mirror left/right control clusters).
- Control opacity slider.
- Control scale slider.
- Reset layout to default.
- Optional fixed/anchored joystick mode versus floating joystick mode.

Do not add decorative settings controls until an approved settings screen exists.

## 2.4 Touch target and spacing requirements

- Primary fire target: 184 px diameter at 1920×1080.
- Secondary fire: 144 px.
- Ability and reload targets: at least 104–112 px.
- Minimum gap between target hit rectangles: 16 px; avoid overlap even if visible artwork is smaller than its hit region.
- Critical controls must remain inside the safe rectangle.
- Touch targets must not be placed over the central forward view unless necessary.
- Pressed-state contrast must be visible against both dark and bright environments.
- Controls must support multi-touch: steering can remain held while firing and activating an ability.
- A touch on one control must not cancel another active finger's input.

## 2.5 Layout adaptation

### 20:9 phones
- Anchor left pad and handbrake to the bottom-left safe area.
- Anchor fire/reload/ability cluster to the bottom-right safe area.
- Keep controls at their reference logical size; do not scale up simply because width increases.
- Keep the central 60% of the viewport clear.

### 4:3 tablets
- Scale touch controls uniformly to 0.88–0.95 of reference size depending on the actual DPI scale.
- Preserve hit targets at or above the platform's comfortable physical touch size.
- Move handbrake inward if the tablet's left edge safe inset or aspect ratio causes collision.
- Compress the right ability cluster into two columns above the fire controls; never place abilities over the fire hit target.

### Safe areas
- Use Unreal Safe Zone widget and project DPI scaling as confirmed by the developer.
- Apply safe insets to the full touch-control canvas.
- Do not hardcode notch dimensions.
- On viewport resize, recompute anchors and clamp each hit target inside the safe rectangle.

## 2.6 Accessibility and feedback

- Text labels accompany non-obvious icons.
- Do not use colour alone to indicate ability readiness.
- Support adjustable opacity and size only after the relevant settings UI is approved.
- Avoid vibration/haptics in v1.0 unless an existing platform service is available and explicitly approved.
- Do not animate a control in a way that delays or changes input timing.

## 2.7 Touch asset manifest

Folder: `Visual/PH-TOUCH-001/v1.0/`

| File | Format | Source size | Use |
|---|---|---:|---|
| `Touch_Joystick_Base.svg` | SVG | 512×512 viewBox | Virtual pad base |
| `Touch_Joystick_Knob.svg` | SVG | 256×256 viewBox | Thumb knob |
| `Touch_Icon_Steer.svg` | SVG | 128×128 viewBox | Steering hint |
| `Touch_Icon_Throttle.svg` | SVG | 128×128 viewBox | Throttle hint |
| `Touch_Icon_Handbrake.svg` | SVG | 128×128 viewBox | Handbrake |
| `Touch_Icon_FirePrimary.svg` | SVG | 128×128 viewBox | Primary fire |
| `Touch_Icon_FireSecondary.svg` | SVG | 128×128 viewBox | Secondary fire |
| `Touch_Icon_Reload.svg` | SVG | 128×128 viewBox | Reload |
| `Touch_Icon_Repair.svg` | SVG | 128×128 viewBox | Repair Kit |
| `Touch_Icon_Boost.svg` | SVG | 128×128 viewBox | Boost |
| `Touch_Icon_ShieldRecharge.svg` | SVG | 128×128 viewBox | Shield Recharge |
| `Touch_Icon_Extinguisher.svg` | SVG | 128×128 viewBox | Extinguisher |
| `Touch_Button_Ring.svg` | SVG | 256×256 viewBox | Button ring |
| `Touch_Button_Pressed.svg` | SVG | 256×256 viewBox | Pressed overlay |

Use SVG masters; rasterise to 256×256 or 512×512 only as required by the runtime UI pipeline. Avoid large independent textures for each button.

## 2.8 Touch acceptance checklist

- [ ] All seven existing Enhanced Input action groups are mapped.
- [ ] Left thumb can steer and throttle simultaneously.
- [ ] Right thumb can fire while steering continues.
- [ ] Primary and secondary fire are distinct.
- [ ] Reload is tap-triggered, not hold-triggered.
- [ ] Each available ability activates through its existing action.
- [ ] Multi-touch works with at least two simultaneous fingers.
- [ ] Touch cancellation/focus loss neutralises held inputs.
- [ ] No touch hit targets overlap.
- [ ] Safe Zone and DPI scaling are respected.
- [ ] 20:9 and 4:3 layouts are validated.
- [ ] No control overlays the core forward driving view unnecessarily.
- [ ] No new gameplay rules are implemented in the widget.

---

# 3. PH-HUD-001 — In-match HUD revision

**Component ID:** `PH-HUD-001`  
**Specification:** **v1.1**  
**Destination:** UMG widgets replacing the current placeholder text HUD.  
**Interaction:** read-only. All touch input is handled by `PH-TOUCH-001`.

## 3.1 Key changes from v1.0

1. All HUD elements have been moved out of the left and right thumb operating zones.
2. Speed is moved from bottom-left to a compact upper-left status strip.
3. Weapon cards are moved to the upper-right HUD band, above the right thumb zone.
4. Ability status is moved to the upper-right HUD band; the actual ability buttons remain in the right touch zone.
5. The nine-part vehicle panel is compact by default and expands only for damaged/critical information.
6. Fire indicator is hidden unless the vehicle is burning.
7. Critical damage, enemy team, warning and own-vehicle identity now use distinct colours.
8. Low-ammo and low-time thresholds are explicitly defined as display-only policy.
9. Weapon display names/icons, reload progress, ability cooldown progress, objective display text and boss health are included using the developer-approved data additions.
10. All strings have localisation keys.

## 3.2 Revised 1920×1080 layout

| Region | X | Y | W | H | Anchor | Purpose |
|---|---:|---:|---:|---:|---|---|
| Compact vehicle status | 32 | 28 | 360 | 176 | Top-left | Vehicle identity, damaged parts summary, shield, optional fire |
| Speed strip | 32 | 220 | 220 | 88 | Top-left | Speed value and km/h |
| Match status | 700 | 24 | 520 | 112 | Top-centre | Mode, phase, clock |
| Score/objective/boss | 1450 | 28 | 438 | 300 | Top-right | Team score, objective and boss health when applicable |
| Primary weapon card | 1370 | 340 | 240 | 112 | Right-upper | Primary weapon status |
| Secondary weapon card | 1620 | 340 | 240 | 112 | Right-upper | Secondary weapon status |
| Player compact stats | 32 | 390 | 260 | 56 | Left-upper | Kills, deaths, score |
| Touch controls | See PH-TOUCH-001 | Bottom zones | — | — | Bottom-left/right | Interactive touch controls; never duplicated by HUD |

**Protected touch areas:** X 0–560, Y 500–1080 and X 1320–1920, Y 470–1080. HUD elements must not be placed in these areas. The HUD may use the upper parts of the left/right columns only as specified above.

**Central gameplay-safe region:** preserve X 560–1320, Y 180–900 as clear as possible.

## 3.3 Compact vehicle status — damaged-parts-first behaviour

**Default compact panel:** 360×176 px.

### Normal state
- Show a small top-down vehicle silhouette and the text `VEHICLE SYSTEMS`.
- Show only a compact healthy summary, e.g. `SYSTEMS NOMINAL`, plus shield bar.
- Do not list all nine healthy components.
- Do not show the six armour faces individually while all are healthy.
- Do not show any `NO FIRE` label or inactive flame indicator.
- The panel must not consume screen space for information that is not actionable.

### Damaged state
When any component or armour face crosses the 50% warning threshold:
- Expand the panel to 360×260 px.
- List only damaged component/armour entries.
- Each row shows short name, percentage and bar.
- Use warning yellow at 50% or below; critical magenta at 25% or below.
- The healthy components remain represented by the small vehicle silhouette, not by nine redundant rows.

### Critical / destroyed state
When any component reaches 25% or below, or a component is destroyed:
- Expand to 360×330 px.
- Show the critical/destroyed component first.
- Show all currently damaged components, sorted critical → warning → healthy omitted.
- Highlight the corresponding location on the vehicle diagram.
- Do not cover the left joystick zone; the expanded panel remains above Y=500.

### Armour faces
- In the normal state, show no six-row armour list.
- When any armour face is at or below 50%, show only affected faces.
- At 25% or below, show critical face state.
- Use the same warning/critical palette as component health.
- Armour values are normalised percentages from 0.0 to 1.0; display as whole percentages.

### Shield
- Always show a compact shield bar in the vehicle panel because shield is a distinct active defensive resource.
- Warning at 25% or below; critical at 10% or below; depleted at 0%.
- Use cyan for the shield resource; warning/critical state uses the semantic warning/critical icon and label without recolouring the resource identity entirely.

### Fire
- Show flame icon and `FIRE` label **only while burning**.
- Hide the entire fire row when not burning.
- When burning, show red-orange fire-state icon and text; do not use enemy-team red for this state.

**Expansion/collapse animation:** 180 ms ease-out. Reserve space above the touch zone; do not animate into the joystick area.

## 3.4 Match status

**Layout:** 520×112 px top-centre.

**Data:** mode, phase and clock from `AUCGameState`.

**Low-time display-only thresholds:**
- Warning at 25% or less of match duration remaining.
- Critical at 10% or less remaining.
- These thresholds only change the clock's warning/critical visual treatment.
- If original match duration is not exposed, do not calculate these percentages; show the clock normally.

**States:** normal, warning, critical, phase changed, paused/waiting only where actual state is exposed, unavailable.

**Localisation keys:** `HUD.Mode.FreeForAll`, `HUD.Mode.TeamDeathmatch`, `HUD.Mode.Mission`, `HUD.Mode.BossHunt`, `HUD.Match.Phase`, `HUD.Match.TimeWarning`, `HUD.Match.TimeCritical`.

## 3.5 Score, objectives and boss health

**Layout:** top-right stack, max 438×300 px. Hide unused subpanels.

### Team score
- Show only in modes with team scores.
- Team blue uses `UC-Team-Blue`; enemy team uses `UC-Enemy-Red`.
- Do not use enemy red for critical damage.
- Free-for-all does not show a fake two-team panel.

### Objectives
For each objective, use:
- ID (for stable UI identity; do not necessarily show the raw ID).
- Type.
- Required count.
- Current progress.
- Optional flag.
- New display text.

**Completion:** `current progress >= required count`. Show `COMPLETE` when true. There is no per-objective failed state in the approved contract; do not design or display one.

Optional objective: show a small `OPTIONAL` tag. Progress bar uses current/required count only when required count is greater than zero.

**Objective states:** active, complete, optional-active, optional-complete, empty/unavailable. No failed state.

### Boss health
Boss health bar is approved. Retrieve the boss vehicle through the developer-added boss lookup and bind to that vehicle's existing health component. Use its health percentage. Do not invent a separate boss health system or gameplay rule.

- Show only in Boss Hunt when a boss lookup succeeds.
- Label with boss display name only if exposed; otherwise use `BOSS`.
- Bar uses a dedicated boss-health treatment: deep red-orange fill with a neutral steel track. Do not use critical magenta or enemy-team red.
- At zero health, show the supplied destroyed state / match result state; do not invent boss defeat text unless supplied by match state/localised string.

**Localisation keys:** `HUD.Objective.Title`, `HUD.Objective.Optional`, `HUD.Objective.Complete`, `HUD.Boss.Title`, `HUD.Score.TeamBlue`, `HUD.Score.TeamRed`.

## 3.6 Weapon cards

**Layout:** two compact 240×112 px cards at upper-right, below the objective area, at Y=340–452. Keep their lower edge above the right thumb zone (which begins at Y=470). If the objective panel occupies the full area, cards must be reflowed within the upper band; never move them into the thumb zone.

**Data:** primary/secondary weapon definition display name and icon (developer addition), ammo, reserve, heat, reloading, overheated, mount online, reload end time.

### Ammo thresholds
- Low ammo: `ammo / magazine capacity <= 25%`.
- Critical ammo: `<= 10%`.
- Empty: zero.
- The comparison requires magazine capacity from the weapon definition. If capacity is unavailable, show ammo/reserve values without threshold colour.
- These are display-only; they do not change firing rules.

### Reload progress
Use reload end time and the current time to render progress only if a reliable reload start time or duration is also available. If the data contract supplies only reload end time, the developer must expose a reload start time or duration as well; do not infer progress from an arbitrary animation duration.

### States
- Ready: normal card.
- Low ammo: warning yellow.
- Critical ammo: critical magenta.
- Empty: zero ammo with `EMPTY`.
- Reloading: progress bar and `RELOADING`.
- Overheated: heat warning and `OVERHEATED`.
- Mount offline: muted state and `MOUNT OFFLINE`.
- Unavailable: hide card or neutral unavailable treatment; no fabricated ammo.

**Localisation keys:** `HUD.Weapon.Primary`, `HUD.Weapon.Secondary`, `HUD.Weapon.Ammo`, `HUD.Weapon.Reserve`, `HUD.Weapon.Heat`, `HUD.Weapon.Reloading`, `HUD.Weapon.Overheated`, `HUD.Weapon.MountOffline`, `HUD.Weapon.LowAmmo`, `HUD.Weapon.CriticalAmmo`, `HUD.Weapon.Empty`.

## 3.7 Ability status indicators

Ability **status** stays in the upper HUD band; ability **activation controls** remain in the lower-right touch zone.

**Data:** active state, effect end time, ready-again time, charges remaining, total cooldown length (developer addition).

**Display**
- Show only abilities available to the player.
- Show charges remaining.
- If active, show an active-state ring until effect end time.
- If cooling down, show radial progress based on total cooldown length and ready-again time.
- When ready, show a green readiness marker.
- Do not display a countdown when the required timing data is absent.

**Localisation keys:** `HUD.Ability.Repair`, `HUD.Ability.Boost`, `HUD.Ability.ShieldRecharge`, `HUD.Ability.Extinguisher`, `HUD.Ability.Ready`, `HUD.Ability.Active`, `HUD.Ability.Cooldown`, `HUD.Ability.NoCharges`.

## 3.8 Speed strip

**Layout:** 220×88 px at X=32, Y=220. No longer bottom-left.

**Data:** `AUCVehiclePawn::GetSpeedKmh`.

Show large Rajdhani numeric speed and small `km/h` unit. Use player-vehicle amber only as an identity accent; do not use amber to indicate a warning. No gear/RPM/drift/boost telemetry.

## 3.9 Player stats

**Layout:** 260×56 px at X=32, Y=330.

**Data:** kills, deaths, score and team from `AUCPlayerState`. Keep compact; collapse if the mode does not supply a field. Team colour only applies to team identity.

## 3.10 HUD states and thresholds summary

| Data | Normal | Warning | Critical | Terminal |
|---|---|---|---|---|
| Component health | >50% | <=50% | <=25% | 0% destroyed |
| Armour face | >50% | <=50% | <=25% | 0% depleted |
| Shield | >25% | <=25% | <=10% | 0% depleted |
| Ammo ratio | >25% | <=25% | <=10% | 0 empty |
| Match time remaining | >25% | <=25% | <=10% | 0 / match ended |
| Weapon heat | normal | no invented threshold | use `overheated` state | state supplied by weapon |
| Fire | hidden when false | — | visible while burning | hidden when false |

All thresholds are display-only. They must not modify gameplay state, rules, damage, cooldowns, scoring or match outcomes.

## 3.11 Localisation string key register

All visible strings must be backed by Unreal string tables. Suggested table: `ST_HUD`.

| Key | English source text |
|---|---|
| `HUD.Vehicle.Systems` | VEHICLE SYSTEMS |
| `HUD.Vehicle.Nominal` | SYSTEMS NOMINAL |
| `HUD.Vehicle.DamagedParts` | DAMAGED SYSTEMS |
| `HUD.Vehicle.Critical` | CRITICAL |
| `HUD.Vehicle.Destroyed` | DESTROYED |
| `HUD.Vehicle.Shield` | SHIELD |
| `HUD.Vehicle.Fire` | FIRE |
| `HUD.Vehicle.Chassis` | CHASSIS |
| `HUD.Vehicle.Engine` | ENGINE |
| `HUD.Vehicle.FuelTank` | FUEL TANK |
| `HUD.Vehicle.WheelFrontLeft` | FRONT LEFT WHEEL |
| `HUD.Vehicle.WheelFrontRight` | FRONT RIGHT WHEEL |
| `HUD.Vehicle.WheelRearLeft` | REAR LEFT WHEEL |
| `HUD.Vehicle.WheelRearRight` | REAR RIGHT WHEEL |
| `HUD.Vehicle.WeaponMountLeft` | LEFT WEAPON MOUNT |
| `HUD.Vehicle.WeaponMountRight` | RIGHT WEAPON MOUNT |
| `HUD.Armour.Front` | FRONT |
| `HUD.Armour.Rear` | REAR |
| `HUD.Armour.Left` | LEFT |
| `HUD.Armour.Right` | RIGHT |
| `HUD.Armour.Top` | TOP |
| `HUD.Armour.Bottom` | BOTTOM |
| `HUD.Match.Phase` | PHASE |
| `HUD.Match.TimeWarning` | TIME LOW |
| `HUD.Match.TimeCritical` | CRITICAL TIME |
| `HUD.Objective.Title` | OBJECTIVE |
| `HUD.Objective.Optional` | OPTIONAL |
| `HUD.Objective.Complete` | COMPLETE |
| `HUD.Boss.Title` | BOSS |
| `HUD.Weapon.Primary` | PRIMARY |
| `HUD.Weapon.Secondary` | SECONDARY |
| `HUD.Weapon.Ammo` | AMMO |
| `HUD.Weapon.Reserve` | RESERVE |
| `HUD.Weapon.Heat` | HEAT |
| `HUD.Weapon.Reloading` | RELOADING |
| `HUD.Weapon.Overheated` | OVERHEATED |
| `HUD.Weapon.MountOffline` | MOUNT OFFLINE |
| `HUD.Weapon.LowAmmo` | LOW AMMO |
| `HUD.Weapon.CriticalAmmo` | CRITICAL AMMO |
| `HUD.Weapon.Empty` | EMPTY |
| `HUD.Ability.Repair` | REPAIR |
| `HUD.Ability.Boost` | BOOST |
| `HUD.Ability.ShieldRecharge` | SHIELD |
| `HUD.Ability.Extinguisher` | EXTINGUISHER |
| `HUD.Ability.Ready` | READY |
| `HUD.Ability.Active` | ACTIVE |
| `HUD.Ability.Cooldown` | COOLDOWN |
| `HUD.Ability.NoCharges` | NO CHARGES |
| `HUD.Speed.Unit` | km/h |

String-table keys are stable identifiers; translated text is supplied separately. Avoid embedding English strings directly in widget blueprints or C++.

## 3.12 Revised HUD asset manifest

Folder: `Visual/PH-HUD-001/v1.1/`

| File | Format | Source size | Purpose |
|---|---|---:|---|
| `HUD_Panel_Base_9Slice.svg` | SVG | 512×256 | Reusable dark panel |
| `HUD_Panel_Accent_PlayerAmber.svg` | SVG | Vector | Own-vehicle accent |
| `HUD_State_WarningYellow.svg` | SVG | 64×64 | Warning state |
| `HUD_State_CriticalMagenta.svg` | SVG | 64×64 | Critical state |
| `HUD_State_DestroyedRed.svg` | SVG | 64×64 | Destroyed state |
| `HUD_State_EnemyRed.svg` | SVG | 64×64 | Enemy identity |
| `HUD_Vehicle_DamageDiagram.svg` | SVG | 512×512 | Nine-zone technical silhouette |
| `HUD_Armour_SixFaceDiagram.svg` | SVG | 512×512 | Six-face armour display |
| `HUD_Icon_Shield.svg` | SVG | 64×64 | Shield |
| `HUD_Icon_Fire.svg` | SVG | 64×64 | Burning state only |
| `HUD_Icon_Ammo.svg` | SVG | 64×64 | Ammo |
| `HUD_Icon_Heat.svg` | SVG | 64×64 | Heat |
| `HUD_Icon_Reload.svg` | SVG | 64×64 | Reload |
| `HUD_Icon_MountOnline.svg` | SVG | 64×64 | Mount online |
| `HUD_Icon_MountOffline.svg` | SVG | 64×64 | Mount offline |
| `HUD_Icon_Objective.svg` | SVG | 64×64 | Objective |
| `HUD_Icon_Boss.svg` | SVG | 96×96 | Boss health panel |
| `HUD_Icon_TeamBlue.svg` | SVG | 64×64 | Blue team |
| `HUD_Icon_TeamRed.svg` | SVG | 64×64 | Enemy/red team |
| `HUD_Font_Rajdhani_*` | TTF/OTF | Official files | Display font |
| `HUD_Font_Inter_*` | TTF/OTF | Official files | UI font |
| `ST_HUD.csv` or Unreal string-table asset | CSV / UE asset | Key list above | Localised text |

Weapon icons must be loaded from each weapon definition's new icon field, not duplicated as hardcoded HUD assets. Ability icons may use the PH-TOUCH-001 icon masters as shared assets.

## 3.13 HUD acceptance checklist

- [ ] Implemented as UMG, replacing placeholder text HUD.
- [ ] No HUD panels overlap either thumb zone.
- [ ] Speed is moved to upper-left.
- [ ] Weapon cards and ability status are in the upper HUD band.
- [ ] Vehicle status is compact by default.
- [ ] Only damaged parts/armour faces are listed.
- [ ] Panel expands at warning/critical state without entering touch zones.
- [ ] Fire indicator is completely hidden when not burning.
- [ ] Player amber, warning yellow, critical magenta, destroyed red and enemy red are visually distinct.
- [ ] All percentages use the normalised 0–1 source values.
- [ ] Weapon display name/icon uses weapon definition fields.
- [ ] Reload progress uses authoritative reload timing data.
- [ ] Ability cooldown progress uses total cooldown length and ready-again time.
- [ ] Objective display text/progress/optional state is used; no failed state is fabricated.
- [ ] Boss health is shown only in Boss Hunt when boss lookup succeeds.
- [ ] Thresholds are display-only.
- [ ] All visible text is localised through string tables.
- [ ] Safe Zone and DPI scaling are used.
- [ ] 20:9 and 4:3 layouts pass device/editor validation.
- [ ] UMG updates are event-driven and do not rebuild the full HUD every frame.

---

# 4. Performance targets

These remain initial design targets pending the first Android device build:

| Area | Target |
|---|---|
| Baseline device | Mid-range Android, 6 GB RAM class |
| Compatibility device | Lower-mid-range Android, 4 GB RAM class |
| Frame rate | 60 FPS target baseline; 30 FPS fallback on lower tier if required by overall game budget |
| HUD UI texture memory | 8 MB compressed GPU memory target; aim for 4 MB |
| Touch UI texture memory | Share atlases/materials with HUD; avoid duplicate icons |
| UI update cadence | Event-driven for health, weapon, objective and ability changes |
| Speed display | 10–15 updates/second maximum |
| Cooldown ring | Up to 10 visual updates/second |
| Full widget rebuild | Never per frame |
| Full-screen blur / render targets | Avoid |

Record measured FPS, UI memory and draw-call cost after the first Android build. These are targets, not claims of current performance.

---

# 5. Developer implementation requests and remaining confirmations

## 5.1 Approved developer commitments to track

- [ ] Add weapon definition `DisplayName`.
- [ ] Add weapon definition `Icon`.
- [ ] Add weapon magazine capacity if not already exposed to presentation, required for percentage ammo thresholds.
- [ ] Expose reload start time or reload duration in addition to reload end time, so progress can be computed accurately.
- [ ] Add total ability cooldown length.
- [ ] Add objective display text.
- [ ] Add a presentation-safe boss vehicle lookup.
- [ ] Route all strings through Unreal string tables.
- [ ] Implement HUD in UMG and replace placeholder text HUD.
- [ ] Use Safe Zone widget and DPI scaling.

## 5.2 Remaining confirmations

1. Confirm exact input semantics for vertical joystick: does the existing `throttle` action accept a signed axis for forward/reverse, or is reverse represented separately?
2. Confirm whether ability activation actions accept a stable ability identifier so the same widget supports all equipped ability combinations.
3. Confirm reload start time/duration availability and clock source are synchronised with the weapon state.
4. Confirm whether original match duration is exposed. If not, low-time percentage warnings remain disabled; no guessed threshold.
5. Confirm boss lookup returns a stable replicated actor reference and the correct boss vehicle health component.
6. Confirm the weapon definition's magazine capacity is presentation-accessible for low-ammo percentage thresholds.
7. Confirm whether `AUCPlayerState` and game-state fields are replicated/updated through events suitable for UMG binding.

---

# 6. Delivery boundary

This package contains only:
- Revised visual design system v1.1.
- `PH-TOUCH-001 v1.0`.
- Revised `PH-HUD-001 v1.1`.

It does not yet specify results/rewards, main menu/navigation, garage/loadout, store, mission select, scoreboard, transitions, vehicle exteriors, environments or VFX. Those remain in the agreed priority order.

**Implementation authority:** Claude must implement this specification faithfully. If an exposed data field, input action or engine constraint differs from this document, record the mismatch as an outstanding issue and request a design decision. Do not silently invent a visual workaround or change gameplay.
