# Visual implementation register

Tracks every visual / UI component from the approved design package through to a tested
implementation. One row per design component.

**Rules**
* Only components from an approved specification are implemented. Nothing here is designed in-house.
* Rows prefixed `PH-` are functional placeholders awaiting a specification. They carry no design
  intent and are removed when the approved component is integrated.
* When a specification changes, bump the version on its row and update the implementation;
  gameplay code should not need to change (see "What presentation binds to" in `Architecture.md`).
* Missing assets, technical incompatibilities and performance constraints are recorded in
  *Outstanding issues*, never silently worked around.

**Status values** - Implementation: `Awaiting spec` / `Placeholder` / `In progress` / `Implemented`.
Testing: `Not tested` / `Editor` / `Device` / `Passed`.

## Register

| Component ID | Spec version | Asset dependencies | Unreal destination | Gameplay data dependencies | Interaction behaviour | Implementation | Testing | Outstanding issues |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| UC-DS-001 Design system (IRON FRONT) | v1.1 (Delivery 02) | Rajdhani + Inter (OFL 1.1) font files and OFL texts - **not delivered**; colour tokens - received | `UCUITheme.h` (colour tokens, severity rules); `UCStrings` + `ST_HUD` string table | none | Motion: height ease 180 ms and critical pulse implemented; bar interpolation, phase-change sweep not yet | Colours + strings implemented; fonts pending | Not tested | Fonts missing, so engine default font is used. Icon family not delivered. |
| PH-HUD-001 In-match HUD | v1.1 (Delivery 02) | Delivery 02 manifest (SVG icons, 9-slice, diagrams, fonts) - **not delivered**; placeholders drawn from colour fills | `AUCHUD` hosts `UUCHUDWidget` (code-built UMG in a Safe Zone); replaces `AUCDebugHUD` (deleted) | `AUCGameState`, `AUCPlayerState`, `UUCVehicleHealthComponent`, `UUCWeaponComponent`, `UUCAbilityComponent`, `UUCProfileSubsystem` (via vehicle definition names), boss lookup | Read-only; every widget is hit-test invisible | Implemented against v1.1 with placeholder art; uncompiled | Not tested | See "Outstanding issues - Delivery 02" below. |
| PH-TOUCH-001 Touch driving and combat controls | v1.0 (Delivery 02) | Delivery 02 touch manifest (SVG masters) - **not delivered**; controls drawn as coloured circles with text labels | `AUCHUD` hosts `UUCTouchControlsWidget`: `UUCTouchStick`, `UUCTouchButton`; `Config/DefaultInput.ini` (`DefaultTouchInterface=None`) | `AUCVehiclePawn::SetPlayerThrottle/Steering/Handbrake/Fire`, `PlayerReload`, `PlayerActivateAbility`; weapon and ability state for visual availability | Left pad (steer + signed throttle), handbrake hold, primary/secondary fire hold, reload tap, ability tap; multi-touch, release on cancel | Implemented against v1.0 with placeholder art; uncompiled | Not tested | See "Outstanding issues - Delivery 02" below. |
| PH-VEH-001 Vehicle exteriors | none | Placeholder skeletal mesh + physics asset per vehicle (to be made in editor) | Blueprint subclasses of `AUCVehiclePawn`, referenced by `UUCVehicleDefinition::PawnClass` | `UUCVehicleDefinition` | n/a | Awaiting spec | Not tested | Need meshes rigged for Chaos Vehicles (wheel bones), muzzle sockets, bone names for hit zones. |
| PH-VFX-001 Weapon fire, impacts, explosions, vehicle damage and fire | none | none | Listeners on `OnFired`, `OnDetonated`, `OnComponentDestroyed`, `OnVehicleDestroyed`, `IsOnFire` | Events listed | n/a | Awaiting spec | Not tested | No effects exist; events fire with nothing attached. |
| PH-ENV-001 Environments | none | Greybox test map (to be made in editor) | `Content/Maps` | Player starts, `AUCCheckpoint`, `AUCRepairZone` | n/a | Awaiting spec | Not tested | Need art direction and level layouts. |
| - Main menu and navigation | none | - | - | `UUCProfileSubsystem` | - | Awaiting spec | Not tested | Not started by design. |
| - Garage / showroom, loadout | none | - | - | `UUCProfileSubsystem` (ownership, `EquipItem`), `UUCCatalog`, `UUCVehicleDefinition` | - | Awaiting spec | Not tested | Not started by design. |
| - Store / economy screens | none | - | - | `UUCProfileSubsystem` (`PurchaseItem`, balances), `UUCCatalog` | - | Awaiting spec | Not tested | Not started by design. |
| - Mission select | none | - | - | `UUCMissionDefinition`, `HasCompletedMission`, level | - | Awaiting spec | Not tested | Not started by design. |
| - Results / rewards screen | none | - | - | `AUCPlayerController::OnMatchResult`, `LastLevelsGained` | - | Awaiting spec | Not tested | Not started by design. |
| - Scoreboard | none | - | - | `AUCGameState::PlayerArray`, `AUCPlayerState` | - | Awaiting spec | Not tested | Not started by design. |
| - Transitions and cinematics | none | - | - | Match phase changes | - | Awaiting spec | Not tested | Not started by design. |
| - Audio | none | - | - | Same events as PH-VFX-001 | - | Awaiting spec | Not tested | Ownership of audio direction not stated in the brief - to confirm. |

## Outstanding issues - Delivery 02

**Spec mismatches found while implementing (design decision requested):**
1. Left pad active region (X 80-460) overlaps the handbrake target (X 440-556). Implemented with the pad trimmed to X 80-440; base ring and centre (270, 825) unchanged.
2. Ability status has no rectangle in HUD 3.2. Implemented as a strip under the match status (top-centre, Y 144-178).
3. Player stats Y is 390 in the 3.2 table and 330 in 3.9. Implemented at 330 (flowing under the speed strip).
4. The expanded vehicle panel (330 px tall) plus speed strip and stats would reach Y 518, into the protected left touch zone (Y 500+). Implemented as a flowing column; the panel is capped at 312 px so the column ends at Y 500, and it shows fewer rows if needed.
5. Ability button at (1510, 500) reaches Y 448, 22 px above the right thumb zone (Y 470), and overlaps the weapon cards (Y 340-452) by 4 px. HUD cards ignore touches, so no input conflict; visual overlap only.
6. Touch positions given as "X, Y" are read as top-left of the hit rectangle (abilities give centres explicitly).
7. Ability-to-position mapping: spec lists positions by ability type; implemented by slot order (the vehicle definition's ability order), with fewer than four spread along the same path.
8. String table 3.11 omits texts for keys the spec itself uses (`HUD.Mode.*`, `HUD.Score.TeamBlue/Red`) and has no keys for phase names, lives, kills/deaths/score or touch labels. 17 keys were added by the developer (marked in `ST_HUD.csv`/`UCStringData.inl`): please approve or replace.
9. Armour faces appear in the damaged list by face name only (`FRONT`, `REAR`...), which can be mistaken for components. Needs a label or icon in the design.
10. Weapon mounts: keys say LEFT/RIGHT WEAPON MOUNT; implemented primary = left, secondary = right.
11. Shield bar is shown only for vehicles that have a shield (an always-empty bar would mislead).
12. Match "phase" shows the phase name from added keys; the spec's `HUD.Match.Phase` is only the word PHASE.

**Not implemented yet (needs assets or later work):** all SVG/icon artwork and fonts (placeholders used); radial cooldown rings (linear bars used); bar interpolation and phase-change sweep animation; boss-phase display; settings screen options (left-handed mode, opacity, scale); localisation of translated text (source English only); haptics.

**Deliberate deviations:** touch controls call the same `AUCVehiclePawn::SetPlayer*` entry points that the Enhanced Input action handlers call, instead of injecting Enhanced Input actions. One input path, same behaviour; revisit if the design needs input remapping to see touch.

**Unverified in an engine:** everything above is uncompiled and unrun. Multi-touch capture, Safe Zone behaviour, DPI scaling curve and the programmatic string table registration are the first things to test on a device.

## What the visual package needs to contain

For each component: an ID and version, layouts with dimensions and anchoring for the target
aspect ratios, colours and typography, states (normal, pressed, disabled, empty, error),
interaction and animation timing, the asset files with formats and resolutions, and which game
data each element shows. Target device class and frame-rate budget are needed to judge
performance constraints.

## Change log

| Date | Change |
| --- | --- |
| 2026-11-13 | Register created. Placeholders recorded. No specifications received yet. |
| 2026-11-21 | Delivery 02 received (design system v1.1, PH-TOUCH-001 v1.0, PH-HUD-001 v1.1), stored in `Docs/VisualPackage/`. Implemented with placeholder art. 12 spec mismatches recorded under "Outstanding issues - Delivery 02". Debug HUD removed. |
| 2026-11-21 | Delivery 01 received (design system v1.0, PH-HUD-001 v1.0), stored in `Docs/VisualPackage/`. Review feedback returned; HUD v1.1 and PH-TOUCH-001 v1.0 requested. Presentation bindings added for its questions 3-7. |
