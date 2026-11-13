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
| PH-HUD-001 In-match HUD | none | none (engine debug font) | `AUCDebugHUD` (set as `HUDClass` in `AUCGameMode`) | `AUCGameState`, `AUCPlayerState`, `UUCVehicleHealthComponent`, `UUCWeaponComponent`, `UUCAbilityComponent`, `UUCProfileSubsystem` | None - read-only text | Placeholder | Not tested | Awaiting HUD specification. Not compiled yet. |
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
