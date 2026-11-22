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
| PH-VEH-001 Vehicle exteriors | v1.0 direction (Delivery 04) | Placeholder skeletal mesh + physics asset per vehicle (to be made in editor) | Blueprint subclasses of `AUCVehiclePawn`, referenced by `UUCVehicleDefinition::PawnClass` | `UUCVehicleDefinition` | n/a | Awaiting spec | Not tested | Need meshes rigged for Chaos Vehicles (wheel bones), muzzle sockets, bone names for hit zones. |
| PH-VFX-001 Weapon fire, impacts, explosions, vehicle damage and fire | v1.0 direction (Delivery 04) | none | Listeners on `OnFired`, `OnDetonated`, `OnComponentDestroyed`, `OnVehicleDestroyed`, `IsOnFire` | Events listed | n/a | Awaiting spec | Not tested | No effects exist; events fire with nothing attached. |
| PH-ENV-001 Environments | v1.0 direction (Delivery 04) | Greybox test map (to be made in editor) | `Content/Maps` | Player starts, `AUCCheckpoint`, `AUCRepairZone` | n/a | Awaiting spec | Not tested | Need art direction and level layouts. |
| PH-MENU-001 Main menu and navigation | v1.0 (Delivery 04) | Hangar backgrounds, nav/mode icons, logo, fonts - **not delivered** (solid graphite, text labels) | `AUCMenuGameMode` / `AUCMenuPlayerController` host `UUCFrontEndWidget` (shell, stack, modal, toast, wipe) and `UUCMenuScreen` | `UUCProfileSubsystem`; `UUCFrontEndSubsystem` (MENU-FR-01 implemented) | Four-destination rail, four mode cards, Play (launches FFA/TDM, opens Mission Select for missions), Android back, exit confirmation | Implemented with placeholder art; uncompiled | Not tested | See Delivery 04 issues. Needs a main-menu map and mode maps configured in Project Settings. |
| PH-GARAGE-001 Garage / loadout | v1.0 (Delivery 04) | Vehicle/weapon icons from definitions (none delivered) | `UUCGarageScreen` | `UUCProfileSubsystem` (`EquipItem`, `PurchaseItem`, `OwnsItem`, `GetEquippedItem`), `UUCCatalog`, vehicle/weapon definitions | Category tabs, list, detail, equip (vehicle / primary / secondary), purchase, loadout strip, standing notice | Implemented with placeholder art; uncompiled | Not tested | GARAGE-FR-01 NOT implemented: matches still use the mode default vehicle, so the notice stays. |
| PH-STORE-001 Store | v1.0 (Delivery 04) | Item icons from definitions (none delivered) | `UUCStoreScreen` | `UUCProfileSubsystem` (`PurchaseItem`, balances), `UUCCatalog` | Filter, grid, details, confirm modal, result modal | Implemented with placeholder art; uncompiled | Not tested | Local profile economy only (labelled on screen). |
| PH-MISSION-001 Mission select | v1.0 (Delivery 04) | None delivered | `UUCMissionScreen`; `UUCFrontEndSubsystem` (MISSION-FR-01/02 implemented) | `UUCMissionDefinition` list in Project Settings, `HasCompletedMission`, level | Filter, list, details, launch (level-gated) | Implemented with placeholder art; uncompiled | Not tested | Missions need a map; optional `DisplayName` and `Map` fields added to the mission asset. |
| PH-RESULTS-001 Results and rewards | v1.0 (Delivery 03) | Background, verdict emblems, icons, fonts - **not delivered** | `UUCResultsWidget` hosted by `AUCHUD` on `OnMatchResult` | `FUCMatchResult` (now with outcome, mode, score, team), `FUCMatchRewardSummary` (profile-recorded grant), `LastLevelsGained`, profile level/XP | Continue returns to the main menu | Implemented with placeholder art; uncompiled | Not tested | See Delivery 03 issues. |
| PH-SCOREBOARD-001 Scoreboard | v1.0 (Delivery 04) | None delivered | `UUCScoreboardWidget` hosted by `AUCHUD` | `AUCGameState::PlayerArray`, `AUCPlayerState` | Toggled by the pawn `ScoreboardAction` (SCORE-FR-01 implemented for keyboard / gamepad) | Implemented with placeholder art; uncompiled | Not tested | No touch control exists to toggle it (no approved design). |
| PH-CINE-001 Transitions and cinematics | v1.0 (Delivery 04) | None | Wipe, modal and toast in `UUCFrontEndWidget`; loading cover; match-start reveal in `UUCHUDWidget` | Match phase, actual map load | 280 ms wipe, 800 ms reveal on Warmup -> InProgress, loading cover with no percentage | Partly implemented; uncompiled | Not tested | Reduced-motion not implemented (no platform setting wired). Match-end transition is the results screen. |
| PH-AUDIO-001 Audio | v1.0 direction (Delivery 04), blocked pending ownership | none | - | - | Same events as PH-VFX-001 | - | Awaiting spec | Not tested | Ownership of audio direction not stated in the brief - to confirm. |

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

## Outstanding issues - Delivery 03 (results) and Delivery 04 (front end)

**Added to the game so the specifications could be honoured (developer functional requests):**
- Match launch (MENU-FR-01), mission catalogue (MISSION-FR-01), mission launch (MISSION-FR-02): `UUCFrontEndSubsystem`, configured under Project Settings > Unreal Combat > Front End (main menu map, one map per mode, mission list). Missions and the mode are passed to the match map as `?Mode=` / `?Mission=` options and read by `AUCGameMode`.
- Scoreboard toggle (SCORE-FR-01): `ScoreboardAction` on `AUCVehiclePawn`.
- Return to main menu: `AUCPlayerController::ReturnToMainMenu`.
- Result data: `FUCMatchResult` gained `Outcome` (won / lost / draw), `Mode`, `Score`, `TeamId`; the profile records what it granted in `FUCMatchRewardSummary`.

**Not implemented (needs design, assets or backend):** GARAGE-FR-01 (matches using the equipped loadout needs server-side ownership validation, i.e. the backend), SCORE-FR-02 (assists are not replicated), SETTINGS-FR-01, PROFILE-FR-01, ONLINE-FR-01, AUDIO-FR-01 (audio ownership still unconfirmed). Vehicle exteriors, environments, VFX and audio are art or editor work: no code was written for them, and VFX has no assets to attach to events yet.

**Spec mismatches found (design decision requested):**
1. Delivery 03: progression panel (64, 704, width 1792) overlaps the footer region (900, 704). Implemented as progression 800 wide (left) and the Continue button in the footer (right).
2. Delivery 03 lists score, kills, deaths, team only, although `FUCMatchResult` also carries assists, bosses defeated and damage dealt. Only the four listed rows are shown; say if the others should appear.
3. Delivery 03 asks for no buttons; one Continue button was added because a real action now exists (`ReturnToMainMenu`). Needs approval.
4. Delivery 04 main menu: hero stage (390, 180, 650 tall) overlaps the play panel (390, 690) by 140 px. Implemented with the hero behind the panel.
5. Delivery 04: consumables can be bought repeatedly (stackable), so they keep a purchase button even when owned. The store spec says owned items have no purchase action.
6. Delivery 04 gives English text only for the menu keys. Texts for all other new keys (including mode descriptions, `TX.*`, garage/store/mission/scoreboard/results labels, Back, Continue) were written by the developer and are listed in `ST_HUD.csv`; please approve or replace.
7. Mission screen layouts and Garage/Store column widths are not given in pixels beyond the garage's 320 / 1000 / 480; implemented with stretch layouts.
8. "No settings destination" and "no profile avatar" were followed. Version text is shown from the project's version string.
9. Controller / keyboard focus navigation is not implemented (touch and mouse only). Reduced-motion is not implemented.
10. Mission launch passes a mission id to a map; every mission map's World Settings must use `AUCGameMode` (or a subclass), and the main menu map must use `AUCMenuGameMode`.

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
| 2026-11-22 | Delivery 03 (PH-RESULTS-001 v1.0) and Delivery 04 (menu, garage, store, mission select, scoreboard, transitions; direction for vehicles, environments, VFX, audio) received and stored. Screens implemented with placeholder art; result data and front-end launch APIs added. Issues recorded above. |
| 2026-11-21 | Delivery 02 received (design system v1.1, PH-TOUCH-001 v1.0, PH-HUD-001 v1.1), stored in `Docs/VisualPackage/`. Implemented with placeholder art. 12 spec mismatches recorded under "Outstanding issues - Delivery 02". Debug HUD removed. |
| 2026-11-21 | Delivery 01 received (design system v1.0, PH-HUD-001 v1.0), stored in `Docs/VisualPackage/`. Review feedback returned; HUD v1.1 and PH-TOUCH-001 v1.0 requested. Presentation bindings added for its questions 3-7. |
