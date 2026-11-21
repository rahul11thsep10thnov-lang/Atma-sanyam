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
| UC-DS-001 Design system (IRON FRONT) | v1.0 (Delivery 01) | Rajdhani + Inter (OFL 1.1) with licence files; colour tokens; icon style | Shared UMG style assets / widget library (to create) | none | Motion and state rules apply to all widgets | In progress - revisions requested | Not tested | Colour clashes sent back: critical red vs enemy red; amber used for both warning and player focus. Fonts not yet delivered. |
| PH-HUD-001 In-match HUD | v1.0 received (Delivery 01); v1.1 requested | Delivery 01 asset manifest (SVG icons, panel 9-slice, damage and armour diagrams) - not yet delivered | UMG widget hosted by the HUD class, replacing `AUCDebugHUD` | `AUCGameState`, `AUCPlayerState`, `UUCVehicleHealthComponent`, `UUCWeaponComponent`, `UUCAbilityComponent`, `UUCProfileSubsystem` | Read-only, no interactive elements | Placeholder (spec under revision) | Not tested | v1.1 requested: avoid thumb zones once PH-TOUCH-001 exists; compact vehicle panel; fire indicator only while burning; designer-set warning thresholds. Bindings it asked for were added (reload progress, names/icons, cooldown lengths, objective text, boss lookup). Assets pending. Engine module still uncompiled. |
| PH-TOUCH-001 Touch driving and combat controls | none | Engine default touch interface | `Config/DefaultInput.ini`; input actions on `AUCVehiclePawn` | Enhanced Input actions: throttle, steer, handbrake, fire primary/secondary, reload, abilities | Engine default virtual sticks | Awaiting spec | Not tested | Need control layout, sizes, hit areas and fire/ability button behaviour. |
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
| 2026-11-21 | Delivery 01 received (design system v1.0, PH-HUD-001 v1.0), stored in `Docs/VisualPackage/`. Review feedback returned; HUD v1.1 and PH-TOUCH-001 v1.0 requested. Presentation bindings added for its questions 3-7. |
