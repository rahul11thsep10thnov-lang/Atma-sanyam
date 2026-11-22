# UNREAL COMBAT — VISUAL SPECIFICATION PACKAGE
## Delivery 04 · Main Menu, Navigation & Remaining Front-End / Presentation Systems
**Engine:** Unreal Engine 5.7 · **Platform:** Android first · **Orientation:** Landscape  
**Reference canvas:** 1920 × 1080 · **Design system:** IRON FRONT v1.1  
**Source reviewed:** `UnrealCombat (2).zip`, including VisualImplementationRegister, Architecture, BackendArchitecture, Roadmap, definitions, profile subsystem, game framework, match types, input configuration and current presentation code.

---

# 0. Authority, source boundaries and implementation rules

This delivery continues Delivery 02 and Delivery 03. It is written for direct implementation by Claude in the Unreal Combat project.

## 0.1 Governing rules

1. The visual layer reads profile/gameplay data and listens to events; it never owns gameplay or economy rules.
2. Do not add a visual control unless its action is supported by an existing API or is explicitly listed below as a developer functional request.
3. Do not display invented values. Missing data means hide the field or show a neutral unavailable state.
4. Every visible string must use Unreal string table `ST_HUD` / `UCStrings`, with the keys specified below. Add a separate string table only if the existing localisation pipeline requires it.
5. Preserve the established palette and typography:
   - Player identity amber `#FFB000`
   - Action orange `#F07824`
   - Warning yellow `#FFD43B`
   - Critical magenta `#E0448A`
   - Destroyed red `#B4232F`
   - Enemy red `#E84A3B`
   - Team blue `#2676D8`
   - Healthy green `#35C878`
   - Shield cyan `#22B8D6`
   - Graphite surfaces `#0B0F13`, `#121920`, `#1C2730`; steel `#394752`, `#8B9AA5`; text `#F4F7F9`, `#B1BBC2`.
6. Rajdhani is for display/numeric emphasis; Inter is for labels/body. Both are OFL 1.1. The source register says font assets are not yet delivered; use the existing font fallback until official files are added.
7. All layouts are authored on a 1920×1080 reference canvas inside Safe Zone and DPI scaling. Preserve touch accessibility on 20:9 phones and 4:3 tablets.
8. Build widgets in code/UMG following the current code-built presentation architecture. Avoid requiring binary Widget Blueprints unless there is a concrete engine requirement.
9. Event-driven updates. Do not rebuild full screens every frame.
10. Record unavailable data, missing actions, engine incompatibilities and deviations in the register. Do not silently improvise.

## 0.2 Confirmed source facts

The uploaded source currently supports:
- Profile: loaded state, player ID, display name, set display name, level, XP, XP to next level, Credits and Premium balances, ownership, equipped loadout item per slot, mission completion, purchase, equip, match-result application, catalog access, and `OnProfileChanged`.
- Catalog item fields: `ItemId`, `Kind` (Vehicle, Weapon, Upgrade, Consumable), `Currency` (Credits/Premium), `Price`, `RequiredLevel`, and a soft reference to a definition.
- Vehicle definitions: ID, display name, icon, pawn class, component/armour durability, shield, abilities, primary/secondary weapon, AI personality and optional boss phases.
- Weapon definitions: ID, display name, icon, magazine size, reserve ammo, reload, heat, ballistic and damage tuning.
- Mission definitions: ID, mode (Mission/BossHunt), objectives, enemy spawns, time limit, shared player lives and required level.
- Match modes: FreeForAll, TeamDeathmatch, Mission, BossHunt.
- Match phases: Warmup, InProgress, Finished.
- Objective types: DestroyTargets, DefeatBoss, Survive, ReachCheckpoints.
- Match result fields: MatchId, MissionId, Kills, Assists, Deaths, BossesDefeated, DamageDealt, bWon, bMissionCompleted.
- Game state: mode, phase, match duration, seconds remaining, score limit, team scores, objectives, lives remaining, winning team/player, mission success and boss vehicle lookup.
- Player state: team, kills, deaths, match score and boss flag.
- Current profile backend is a local guest account. No online service, lobby, matchmaking or reconnect exists. Online/shared economy must not ship until server-side reward and purchase validation exists.
- Roadmap says loadout is not yet used in matches; game mode still assigns `DefaultVehicle`. Purchasable upgrades/consumables have no in-match effect yet.

## 0.3 Explicit non-existent features — do not present as live

No account sign-in provider choice, cloud account, friends, party/lobby, matchmaking, online presence, server browser, ranked mode, battle pass, daily rewards, missions calendar, achievements, leaderboards service, player chat, vehicle upgrade effects, premium currency purchase flow, cloud save, reconnect, or settings screen is implemented in the source reviewed.

A future-facing button for any of these must not be shown as an active feature. This package does not create those systems.

---

# 1. Main Menu & Navigation — `PH-MENU-001` v1.0

**Register action:** replace the generic “Main menu and navigation” placeholder row with `PH-MENU-001`.  
**Destination:** UMG main-menu widget hosted by the project’s front-end flow; profile data from `UUCProfileSubsystem`.  
**Purpose:** provide the premium front door to the game and a clear path into the four supported match modes and existing profile/catalog screens.

## 1.1 Visual concept

A premium military-industrial command hangar, not a flat mobile dashboard:
- Full-bleed cinematic hangar or industrial motor-pool background.
- One featured owned vehicle displayed in a three-quarter hero composition, using its actual vehicle definition/mesh if available.
- Deep graphite overlay and controlled amber lighting.
- Fine technical grid, restrained hazard markings and metal panel seams.
- Large UNREAL COMBAT identity at upper-left; player profile/level and currencies at upper-right.
- Main navigation is a left-side vertical command rail.
- Main action area is a broad lower-left / centre panel with mode cards.
- A compact vehicle identity card occupies lower-right, without pretending the vehicle is equipped for match play if the loadout limitation remains.

The visual tone should feel like a console/PC vehicular combat title adapted intelligently to landscape mobile: rich background, strong hierarchy, spacious cards, legible controls.

## 1.2 Main menu layout (1920×1080)

| Region | X | Y | W | H | Content |
|---|---:|---:|---:|---:|---|
| Brand block | 56 | 36 | 500 | 110 | UNREAL COMBAT wordmark, IRON FRONT micro-label |
| Profile strip | 1320 | 32 | 544 | 104 | Display name, level, XP progress |
| Currency strip | 1480 | 148 | 384 | 64 | Credits and Premium balances, text only |
| Navigation rail | 56 | 220 | 280 | 720 | Play, Garage, Store, Missions, Settings placeholder excluded |
| Hero vehicle stage | 390 | 180 | 950 | 650 | Vehicle visual, hangar lighting, grounded vehicle label |
| Play panel | 390 | 690 | 950 | 300 | Four supported mode cards / primary launch selection |
| Vehicle quick card | 1390 | 690 | 472 | 250 | Current profile-equipped vehicle ID/name if resolvable; otherwise “Vehicle selection” CTA |
| Build/version footer | 56 | 1012 | 500 | 32 | Version/build string only if supplied by project |

Panels must reflow on narrow 20:9 aspect ratios. On 4:3 tablets, reduce hero-stage width and stack mode cards into a 2×2 grid. Keep navigation targets at least 72×72 logical reference px, with larger hit boxes where possible.

## 1.3 Profile strip

Show:
- `GetDisplayName()`
- `GetLevel()`
- XP progress using `GetXp()` and `GetXpForNextLevel()`
- Credits and Premium via `GetBalance(EUCCurrency::Credits/Premium)`

Only show XP progress if next-level XP is positive and the profile is loaded. Use a thin steel track and amber fill. Do not label a player “online” or show an avatar unless an actual avatar/presence source is added.

Profile loading states:
- Loading: neutral silhouette, skeleton bars, no zero balances.
- Loaded: values displayed.
- Error/unavailable: retry/error presentation only if the profile subsystem exposes an error/retry action; otherwise show a non-interactive “PROFILE UNAVAILABLE” status and log the issue.
- No profile data: do not fabricate a guest name or balance.

## 1.4 Supported play-mode cards

Four mode cards are grounded in `EUCMatchMode`:
1. **FREE FOR ALL** — `FreeForAll`
2. **TEAM DEATHMATCH** — `TeamDeathmatch`
3. **MISSION** — `Mission`
4. **BOSS HUNT** — `BossHunt`

Each card includes:
- Strong distinct vehicle-combat artwork.
- Mode title and one concise explanatory line (localised).
- A single “SELECT” action.
- Selected state with amber edge and a small action marker.
- No player count, estimated queue time, map rotation, online badge or matchmaking status.

Mode selection must route to a supported match launch/configuration path. The source currently defines modes in `AUCGameMode`; it does not document a front-end match-start API or a map/mode selection subsystem. Therefore:

**Developer functional request MENU-FR-01:** expose a front-end match launch interface that accepts one of the four supported modes and loads the correct configured map/GameMode. The UI must call this interface; it must not directly change rules or construct match outcomes. Until this exists, cards may be visually selectable for design review but the Play action must be disabled with an explanatory unavailable state. Do not fake a successful launch.

Mission and Boss Hunt can use mission definitions only when a real `UUCMissionDefinition` catalogue/list is exposed. See `PH-MISSION-001`.

## 1.5 Navigation rail

The rail contains only these destinations in this delivery:
- **PLAY** — supported mode selection home.
- **GARAGE** — opens `PH-GARAGE-001`.
- **STORE** — opens `PH-STORE-001`.
- **MISSIONS** — opens `PH-MISSION-001`.

Use icon + label; active destination gets amber left rail and bright text. Do not add “Profile”, “Friends”, “Events”, “Ranked”, “Battle Pass” or “Settings” as active destinations; those features are not supported by source. Profile information is displayed in the header.

## 1.6 Main menu states

- First launch/profile loading.
- Profile loaded.
- Mode selected.
- Navigation transition.
- Missing content (vehicle mesh, background, catalog).
- Unsupported action / launch unavailable.
- Return from garage/store/missions.
- Reduced-motion accessibility state (future settings request; use standard reduced motion if platform setting is available).

## 1.7 Navigation flow

```text
Boot
 └─ Load local guest profile
     └─ Main Menu
         ├─ Play
         │   ├─ Free For All ──> Match launch interface [developer request]
         │   ├─ Team Deathmatch ──> Match launch interface [developer request]
         │   ├─ Mission ──> Mission Select ──> Match launch interface
         │   └─ Boss Hunt ──> Mission Select (Boss Hunt filter) ──> Match launch interface
         ├─ Garage ──> Garage / Showroom / Loadout
         ├─ Store ──> Store / Economy
         └─ Missions ──> Mission Select
Match
 └─ Results & Rewards (Delivery 03)
     └─ Return to Main Menu [navigation action must be implemented]
```

All navigation is state-based and deterministic. Back returns to the previous front-end screen; it must not accidentally exit the application from a nested screen. Android system back should close a modal first, then return one navigation level, then show an exit confirmation at the root (exit confirmation is a developer request unless an existing application exit flow is present).

## 1.8 Main menu string keys

Add to `ST_HUD` / `UCStrings`:
- `MENU.Brand.Title` — UNREAL COMBAT
- `MENU.Brand.Subtitle` — IRON FRONT
- `MENU.Nav.Play` — PLAY
- `MENU.Nav.Garage` — GARAGE
- `MENU.Nav.Store` — STORE
- `MENU.Nav.Missions` — MISSIONS
- `MENU.Profile.Level` — LEVEL
- `MENU.Profile.XP` — XP
- `MENU.Currency.Credits` — CREDITS
- `MENU.Currency.Premium` — PREMIUM
- `MENU.Mode.FreeForAll` — FREE FOR ALL
- `MENU.Mode.TeamDeathmatch` — TEAM DEATHMATCH
- `MENU.Mode.Mission` — MISSION
- `MENU.Mode.BossHunt` — BOSS HUNT
- `MENU.Action.Select` — SELECT
- `MENU.Action.Play` — PLAY
- `MENU.State.Loading` — LOADING PROFILE
- `MENU.State.Unavailable` — CURRENTLY UNAVAILABLE
- `MENU.State.ContentMissing` — CONTENT UNAVAILABLE
- `MENU.Vehicle.Select` — SELECT VEHICLE
- `MENU.Exit.Title` — EXIT GAME?
- `MENU.Exit.Confirm` — EXIT
- `MENU.Exit.Cancel` — CANCEL

## 1.9 Asset manifest

Folder `Visual/PH-MENU-001/v1.0/`:
- `Menu_Hangar_Background_16x9` — 3840×2160, compressed texture, optional lower-res 2560×1440.
- `Menu_Hangar_Background_20x9` — 3840×1728 or safe-cropped master.
- `Menu_Hangar_Background_4x3` — 2880×2160.
- `Menu_Panel_Command_9Slice.svg` — 512×256 viewBox.
- `Menu_Nav_Play.svg`, `Menu_Nav_Garage.svg`, `Menu_Nav_Store.svg`, `Menu_Nav_Missions.svg` — 128×128 SVG masters.
- `Menu_Mode_FreeForAll.svg`, `Menu_Mode_TeamDeathmatch.svg`, `Menu_Mode_Mission.svg`, `Menu_Mode_BossHunt.svg` — 512×512 SVG/icon masters.
- `Menu_Logo_Master.svg` — vector master.
- Rajdhani/Inter font files and OFL notices once acquired.

Use actual vehicle art from the selected vehicle asset. Do not bake a specific vehicle into the background image.

## 1.10 Acceptance checklist

- [ ] Profile values are sourced from `UUCProfileSubsystem`.
- [ ] No fabricated balances or progression.
- [ ] Only four implemented match modes are shown.
- [ ] No online/matchmaking claims.
- [ ] Garage/store/missions destinations resolve to their approved screens.
- [ ] Play launch calls an explicit supported launch interface.
- [ ] Unsupported actions are disabled, not simulated.
- [ ] Safe Zone/DPI scaling and 20:9/4:3 layouts validated.
- [ ] All strings use string-table keys.
- [ ] No per-frame full-screen rebuild.

---

# 2. Garage / Showroom / Loadout — `PH-GARAGE-001` v1.0

**Register action:** replace generic Garage/showroom/loadout row with `PH-GARAGE-001`.  
**Source:** `UUCProfileSubsystem`, `UUCCatalog`, `UUCVehicleDefinition`, `UUCWeaponDefinition`, `EUCLoadoutSlot`, `EUCItemKind`.

## 2.1 Purpose and visual direction

A high-end industrial vehicle inspection bay. This is the main place to inspect owned vehicle definitions, inspect weapons and equip owned items. Use cinematic vehicle lighting, floor markings, technical inspection overlays and a restrained amber selection frame.

Do not imply that purchased upgrades/consumables affect matches; the roadmap explicitly says they currently have no in-match effect. Do not imply that the selected profile loadout is used by matches; the roadmap says matches still use `AUCGameMode::DefaultVehicle`.

## 2.2 Screen layout

- Left 320 px: category tabs and owned-item list.
- Centre 1000 px: large vehicle/weapon preview.
- Right 480 px: selected item details and equip action.
- Top strip 120 px: profile currencies and current selection.
- Bottom strip 100 px: loadout slot summary.

### Categories
- Vehicles (`EUCItemKind::Vehicle`)
- Weapons (`EUCItemKind::Weapon`)
- Upgrades (`EUCItemKind::Upgrade`)
- Consumables (`EUCItemKind::Consumable`)

Show only catalog entries and owned inventory items. For definitions without a mesh/preview, use the icon and a technical silhouette placeholder clearly marked as a placeholder; never display a misleading 3D vehicle.

## 2.3 Item card fields

Grounded fields:
- Item ID (internal identity; do not show raw ID unless no display name exists).
- Item kind.
- Price/currency and required level from catalog entry.
- Owned state from `OwnsItem`.
- Definition display name/icon from referenced asset if available.
- Equipped state from `GetEquippedItem` for the matching loadout slot.

Do not invent rarity, star rating, speed rating, armour rating, power score, upgrade level, set bonus or vehicle stats not represented by definition fields and approved display rules.

## 2.4 Equip behaviour

Supported slots: Vehicle, PrimaryWeapon, SecondaryWeapon.

- Equip action is shown only for owned items of the correct kind.
- Call `EquipItem(Slot, ItemId)`.
- Display success only when return is `EUCTransactionResult::Ok` or `Duplicate` and the post-action profile confirms the equipped ID.
- Map transaction failures to localised feedback: InvalidId, UnknownItem, AlreadyOwned, NotOwned, LevelTooLow, WrongItemKind.
- Subscribe to `OnProfileChanged`; refresh only affected cards/slot summaries.

**Critical caveat:** profile equip is currently saved but not used by in-match vehicle selection. Add a visible informational note in the garage until the roadmap gap is fixed: “LOADOUT SAVED — MATCHES CURRENTLY USE THE MODE DEFAULT VEHICLE.” Do not remove this note until game mode resolves each player's owned loadout server-side.

## 2.5 Purchase behaviour

Purchase action may be initiated from the garage only if the item is catalogued and not owned. Call `PurchaseItem(ItemId)` and display actual transaction result. This is the local guest/offline economy only. Do not claim server validation or online purchase security. No real-money purchase UI is included.

## 2.6 String keys

`GARAGE.Title`, `GARAGE.Category.Vehicles`, `.Weapons`, `.Upgrades`, `.Consumables`, `GARAGE.State.Owned`, `GARAGE.State.Equipped`, `GARAGE.Action.Equip`, `GARAGE.Action.Purchase`, `GARAGE.Action.InsufficientFunds`, `GARAGE.Action.LevelLocked`, `GARAGE.State.NoPreview`, `GARAGE.Warning.LoadoutNotUsedInMatch`, `GARAGE.Slot.Vehicle`, `GARAGE.Slot.PrimaryWeapon`, `GARAGE.Slot.SecondaryWeapon`.

## 2.7 Acceptance

- [ ] Items come from `GetCatalog()`.
- [ ] Owned state comes from `OwnsItem`.
- [ ] Equip uses supported slots and `EquipItem`.
- [ ] Purchase uses `PurchaseItem`; no custom client-side price arithmetic.
- [ ] Correct transaction result feedback.
- [ ] Clear loadout-not-used-in-match notice remains until fixed.
- [ ] No invented item stats or rarity.
- [ ] No real-money store / billing UI.

---

# 3. Store / Economy — `PH-STORE-001` v1.0

**Register action:** replace generic Store/economy row with `PH-STORE-001`.

## 3.1 Purpose

A catalogue browser for the existing two-currency profile economy. This is not a real-money shop. Current backend is local guest storage; there is no online store service or Play Billing integration.

## 3.2 Layout

- Header: STORE title, Credits balance, Premium balance.
- Left filter rail: All, Vehicles, Weapons, Upgrades, Consumables.
- Centre: 3-column item grid, cards 280×340 px at reference scale.
- Right details drawer: selected item icon/art, name, kind, price, currency, required level, owned/locked state, purchase action.
- Modal: purchase confirmation and transaction result.

## 3.3 Card states

- Available: required level met, not owned.
- Level locked: current level below `RequiredLevel`; show required level.
- Owned: no purchase CTA; offer “VIEW IN GARAGE” only if navigation action exists.
- Insufficient funds: purchase action disabled after comparing actual balance and catalog price; transaction API remains authoritative.
- Transaction pending: only if the profile API becomes asynchronous; current function signature is synchronous.
- Purchase success/failure: show actual `EUCTransactionResult`, then refresh on `OnProfileChanged`.

No discount, sale, limited-time, countdown, bundle, daily deal, ad reward, free gift or premium currency top-up cards.

## 3.4 Purchase safety

Call `PurchaseItem(ItemId)` and treat its return as authoritative for the current local profile. Never directly decrement balances in UI. Because the current profile is local, this screen is not safe for shared online economy. The backend architecture expressly blocks online/shared economy shipping until server-side purchase validation exists.

## 3.5 String keys

`STORE.Title`, `STORE.Filter.All`, `STORE.Filter.Vehicles`, `STORE.Filter.Weapons`, `STORE.Filter.Upgrades`, `STORE.Filter.Consumables`, `STORE.Price`, `STORE.RequiredLevel`, `STORE.State.Owned`, `STORE.State.Locked`, `STORE.State.InsufficientFunds`, `STORE.Action.Purchase`, `STORE.Action.ConfirmPurchase`, `STORE.Action.Cancel`, `STORE.Result.Success`, `STORE.Result.Failed`, `STORE.Warning.LocalEconomyOnly`, `STORE.Currency.Credits`, `STORE.Currency.Premium`.

## 3.6 Acceptance

- [ ] All entries originate from `UUCCatalog`.
- [ ] Prices/currency/required level use catalog values.
- [ ] Balance comes from profile subsystem.
- [ ] Purchase uses `PurchaseItem`.
- [ ] No premium top-up or real-money purchase.
- [ ] No online-safe wording.
- [ ] All transaction outcomes handled.

---

# 4. Mission Select — `PH-MISSION-001` v1.0

**Register action:** replace generic Mission select row with `PH-MISSION-001`.  
**Source:** `UUCMissionDefinition`, `UUCProfileSubsystem::HasCompletedMission`, player level, mission fields.

## 4.1 Screen concept

A tactical campaign operations board with a map-like mission theatre. Use large mission cards, industrial topographic map textures and restrained objective glyphs. This is a selection screen, not a live world map; do not invent geographic coordinates or route intelligence.

## 4.2 Mission card content

Grounded:
- Mission ID (internal; hidden from player when display name exists).
- Mode: Mission or BossHunt.
- Objective list: display text, type, required count, optional flag.
- Enemy vehicle definitions and counts.
- Time limit (`<=0` = untimed).
- Shared player lives (`<0` = unlimited).
- Required player level.
- Completion state via `HasCompletedMission(MissionId)`.

The source does not currently expose a mission title, description, chapter, difficulty, rewards preview, mission thumbnail, recommended vehicle or unlock chain. Add optional presentation fields to mission data assets if desired, but do not invent them in the UI.

## 4.3 Filters

- ALL
- MISSIONS
- BOSS HUNT

No difficulty filter unless difficulty becomes a source field. No “new” badge unless a persistent seen/unseen state is added.

## 4.4 Mission detail panel

- Mission mode.
- Objectives with optional tags.
- Enemy lineup (vehicle definition icon/name and spawn count).
- Time limit / untimed label.
- Shared lives / unlimited label.
- Required level and player’s current level.
- Completion indicator.
- Launch button only if level requirement is met and a supported mission launch path exists.

**Developer request MISSION-FR-01:** expose a stable mission catalogue/list to UI. Current source defines mission assets but no public list API.
**Developer request MISSION-FR-02:** expose a front-end mission launch API that passes the selected `UUCMissionDefinition` to the game mode/map-loading flow. Do not instantiate `AUCGameMode` from UI.

## 4.5 String keys

`MISSION.Title`, `MISSION.Filter.All`, `MISSION.Filter.Missions`, `MISSION.Filter.BossHunt`, `MISSION.Objective.DestroyTargets`, `MISSION.Objective.DefeatBoss`, `MISSION.Objective.Survive`, `MISSION.Objective.ReachCheckpoints`, `MISSION.Objective.Optional`, `MISSION.Time.Untimed`, `MISSION.Lives.Unlimited`, `MISSION.RequiredLevel`, `MISSION.State.Completed`, `MISSION.State.Locked`, `MISSION.Action.Launch`, `MISSION.State.Unavailable`.

## 4.6 Acceptance

- [ ] No invented mission metadata.
- [ ] Level lock uses `RequiredLevel`.
- [ ] Completion uses `HasCompletedMission`.
- [ ] Mission details use asset data.
- [ ] Mission catalogue and launch API gaps recorded.
- [ ] Boss Hunt is filtered by actual mode.
- [ ] No fabricated rewards preview.

---

# 5. Scoreboard — `PH-SCOREBOARD-001` v1.0

**Register action:** replace generic Scoreboard row with `PH-SCOREBOARD-001`.

## 5.1 Purpose and display rules

A tactical combat ledger, readable at a glance. The scoreboard is read-only and derives all values from replicated `AUCGameState` and `AUCPlayerState`.

Supported columns:
- Rank (derived from sorting by supplied match score; tie handling stable by player-array order unless a stable player ID/name sort is exposed).
- Player name only if the engine player state provides a non-empty player name.
- Team ID/team colour.
- Kills.
- Deaths.
- Match score.
- Boss marker for `IsBoss()`.

The current source does not expose assists per player in `AUCPlayerState`; although `FUCMatchResult` has an assists field for the local player's result, do not add an assists column to the live scoreboard without a replicated source field.

## 5.2 Mode layouts

- Free For All: one ranked list, no team columns.
- Team Deathmatch: two team groups using team IDs and team scores.
- Mission/Boss Hunt: player/team performance list as available; no fake enemy-team score panel. Boss is not listed as a player unless the game state player array actually includes a boss player state; if shown, mark it as BOSS.

## 5.3 Interaction

Open/close via an explicit input/UI action only if a scoreboard input binding exists. The register currently has no scoreboard interaction contract; add a developer request for a scoreboard toggle action. Do not bind an arbitrary key or touch gesture without approval.

## 5.4 String keys

`SCORE.Title`, `SCORE.Column.Rank`, `SCORE.Column.Player`, `SCORE.Column.Team`, `SCORE.Column.Kills`, `SCORE.Column.Deaths`, `SCORE.Column.Score`, `SCORE.Team.Blue`, `SCORE.Team.Red`, `SCORE.Label.Boss`, `SCORE.State.Empty`.

## 5.5 Acceptance

- [ ] Values come from replicated game/player state.
- [ ] Mode-specific columns/groups.
- [ ] No unsupported assists/damage/accuracy columns.
- [ ] No online leaderboard claims.
- [ ] Sorting stable and deterministic.
- [ ] Scoreboard toggle input explicitly provided.

---

# 6. Transitions & Cinematics — `PH-CINE-001` v1.0

**Register action:** replace generic Transitions/cinematics row with `PH-CINE-001`.

## 6.1 Purpose

Deliver a cohesive premium flow between front-end screens, match loading, match start and match results without creating fake cutscene events or affecting match timing.

## 6.2 Approved visual moments

1. Front-end screen transition: dark steel panel wipe with a thin amber scan line.
2. Match launch/loading: full-screen environment/vehicle artwork with loading indicator only if actual asynchronous map load progress is available. Otherwise use a short transition animation and wait on the engine load; do not fabricate a percentage.
3. Match start: 700–1000 ms camera/overlay reveal only if the game phase changes to `InProgress`; no countdown unless an actual countdown field/event exists.
4. Match end: transition when phase is `Finished` or `OnMatchResult` fires.
5. Results reveal: use Delivery 03 results screen. Avoid repeating a second long cinematic after the match.

## 6.3 Motion system

- Standard screen navigation: 180 ms ease-out.
- Modal enter/exit: 160 ms.
- Panel wipe: 240–320 ms.
- Results reveal: 350–500 ms staged sequence.
- Respect reduced motion if platform preference is available.
- Never block input/gameplay state while decorative animation completes.
- Avoid camera cuts that alter gameplay camera or vehicle control.

## 6.4 Data dependencies

- `AUCGameState::Phase`
- `OnMatchStateChanged`
- `AUCPlayerController::OnMatchResult`
- Engine map loading events (engine-level; implementation must use actual load state).

No new gameplay events are assumed.

## 6.5 String keys

`CINE.Loading.Title`, `CINE.Loading.Wait`, `CINE.Match.Start`, `CINE.Match.Finished`, `CINE.Transition.Returning`.

## 6.6 Acceptance

- [ ] Triggered by real phase/load/result events.
- [ ] No fake loading percentage.
- [ ] No fabricated countdown.
- [ ] No gameplay camera/input interference.
- [ ] Reduced-motion safe.
- [ ] Android performance validated.

---

# 7. Vehicle Exteriors — `PH-VEH-001` v1.0

**Register action:** assign v1.0 to existing `PH-VEH-001` row.  
**Destination:** Blueprint subclasses of `AUCVehiclePawn`, referenced by `UUCVehicleDefinition::PawnClass`.

## 7.1 Art direction

Premium photorealistic physical vehicles with believable engineering, readable combat modifications and distinct silhouettes. Vehicles must remain recognisable by their base class/category while looking purpose-built for vehicular combat. No cartoon proportions for this game’s core vehicle roster.

Design language:
- Functional armour plating, welds, hinges, bolts, vents, glass, rubber, lights, tow points and exposed mechanical systems.
- Combat additions should appear physically mounted and structurally plausible.
- Amber is reserved for player/selection identity accents, not all vehicle paint.
- Team colours are applied as small configurable markings, not a full repaint that destroys material identity.
- Damage presentation is driven by existing component health/destruction/fire state.

## 7.2 Technical contract

Every vehicle asset must:
- Be a Blueprint subclass of `AUCVehiclePawn`.
- Use Chaos Vehicle-compatible skeletal mesh and wheel bone names.
- Include the wheel bones and physics asset required by the current pawn implementation.
- Include muzzle sockets required by the weapon mounts.
- Include clear bone/zone mapping for chassis, engine, fuel tank, four wheels and two weapon mounts if hit-zone tracing uses those names.
- Use vehicle definition `DisplayName`, `Icon`, `PawnClass`, weapons, abilities and durability values.
- Avoid hardcoding gameplay values into the mesh/Blueprint.

The source register specifically lists wheel bones and muzzle sockets as outstanding dependencies. Resolve exact socket/bone names against `UCVehiclePawn.cpp` and hit-location implementation before rigging.

## 7.3 Asset deliverables per vehicle

- High-detail game-ready skeletal mesh.
- LOD0/LOD1/LOD2 with measured triangle budgets.
- Physics asset.
- Material instances with parameterised paint, metal, rubber, glass, emissive and dirt.
- Wheel meshes and collision.
- Muzzle sockets.
- Damage-state material/mesh variants only where supported by actual component state.
- Icon render: transparent background, consistent three-quarter camera, 512×512.
- Garage render: 2048×2048 or 2560×1440 crop.
- Silhouette thumbnail: 256×256.

## 7.4 Presentation states

- Clean.
- Damaged components.
- Burning (`IsOnFire`).
- Destroyed (`OnVehicleDestroyed`).
- Selected/owned/locked are UI states, not mesh states.

Do not show detachable panels or deformation unless a corresponding visual state is implemented. Do not infer damage from health percentage by swapping arbitrary meshes.

## 7.5 Acceptance

- [ ] Correct pawn subclass and Chaos setup.
- [ ] Wheel bones, physics asset and muzzle sockets verified.
- [ ] Hit-zone mapping verified against source code.
- [ ] Vehicle definition drives display name/icon and combat configuration.
- [ ] LODs and mobile material budgets measured.
- [ ] Damage/fire states use actual gameplay state.
- [ ] Vehicle preview matches the in-game vehicle identity.

---

# 8. Environments — `PH-ENV-001` v1.0

**Register action:** assign v1.0 to existing `PH-ENV-001` row.  
**Destination:** `Content/Maps`; source dependencies include player starts, `AUCCheckpoint`, `AUCRepairZone`.

## 8.1 Environment direction

Photorealistic, high-readability combat arenas built for high-speed vehicle navigation and mobile performance. Strong silhouettes, broad route readability, clear horizon and combat landmarks. Avoid visual noise that hides enemy vehicles, projectiles, checkpoints or repair zones.

The project currently has a greybox test map planned; there are no approved final environment names or 14-map roster in the source archive. Do not treat previously discussed concept counts as source-backed implementation. This delivery establishes an environment art standard; each named map requires a separate level brief.

## 8.2 Level composition requirements

Each map package must document:
- Primary route loop and alternate routes.
- Spawn locations and safe spawn clearance.
- Checkpoint placement and sequence.
- Repair/rearm zone placement.
- Collision boundaries and fall/reset handling if supported.
- Long/medium/close combat sightlines.
- AI traversal constraints (current AI has no navmesh path following; avoid mazes/tight streets).
- Streaming/visibility and mobile draw-distance plan.
- Lighting and time-of-day.
- Gameplay landmark callouts only if the game exposes them to UI.

## 8.3 Visual readability

- Roads and drivable surfaces visibly distinguishable from walls/obstacles.
- Checkpoints use a consistent visual language and cannot be mistaken for weapon effects.
- Repair zones use green/cyan operational identity, never enemy red.
- Hazards and boundaries use restrained yellow/black markings.
- Destructible scenery is not shown as destructible until the gameplay system exists; roadmap says terrain destruction is not implemented.
- Surface grip differences are not visually communicated as gameplay effects until surface-dependent grip exists.

## 8.4 Performance

Use Nanite/Lumen only after verifying support and cost on the target Android device; do not assume desktop settings. Use mobile-appropriate baked/static lighting where needed, material instance reuse, HLODs/LODs, occlusion and texture streaming. Record measured frame time, GPU/CPU cost, memory and draw calls per map.

## 8.5 Acceptance

- [ ] Player starts/checkpoints/repair zones validated.
- [ ] No unimplemented destructible or grip mechanics implied.
- [ ] AI routes tested against current probe-based navigation limitations.
- [ ] Mobile performance measured on baseline and compatibility devices.
- [ ] Spawn and route readability tested at actual gameplay camera height/speed.
- [ ] Environment landmark names localised if exposed to UI.

---

# 9. VFX — `PH-VFX-001` v1.0

**Register action:** assign v1.0 to existing `PH-VFX-001` row.  
**Events:** `OnFired`, `OnDetonated`, `OnComponentDestroyed`, `OnVehicleDestroyed`, `IsOnFire`.

## 9.1 Art direction

Physically grounded combat effects with restrained cinematic exaggeration. Effects must communicate cause, direction, impact and severity without obscuring driving or target visibility.

## 9.2 Event-to-effect mapping

| Source event/state | Presentation |
|---|---|
| `UUCWeaponComponent::OnFired` | Muzzle flash at supplied muzzle; tracer/projectile presentation consistent with weapon definition |
| `AUCProjectile::OnDetonated` | Impact flash, dust/debris and explosion radius presentation; do not apply damage from VFX |
| `OnComponentDestroyed` | Localised component failure effect only when component identity is known |
| `OnVehicleDestroyed` | Vehicle destruction sequence; no extra gameplay damage |
| `IsOnFire` | Persistent fire/smoke loop while true; stop when false |

VFX must not modify hit detection, damage, collision, ammo, fire duration or match state.

## 9.3 Effect families

- Kinetic: short muzzle flash, tracer, spark/metal impact.
- Explosive: projectile trail, blast, dust/debris, shockwave ring.
- Energy: emissive bolt/beam treatment and controlled cyan/white impact.
- Fire: orange flame, dark smoke, heat distortion used sparingly.
- Collision: sparks, dust and brief chassis impact feedback.
- Destruction: staged flash, smoke and debris with strict screen-space limits.

Use weapon `DamageType`, projectile detonation event and muzzle/end-point/hit data when supplied. If the event does not expose a required parameter, do not invent it.

## 9.4 Mobile budget and scalability

- Scalable quality tiers: Low, Medium, High, selected by project scalability settings.
- Pool repeated emitters.
- Limit translucent overdraw and full-screen distortion.
- Use short-lived particles for common fire; persistent fire only while state is active.
- Do not spawn expensive debris on every pellet.
- Record GPU particle cost and overdraw in crowded combat tests.

## 9.5 Acceptance

- [ ] Effects bind to documented events.
- [ ] VFX never owns gameplay outcomes.
- [ ] Fire loop tracks `IsOnFire`.
- [ ] Effects are culled/pool-managed.
- [ ] Low/medium device tiers remain readable and performant.
- [ ] No effect hides touch controls or critical HUD data.

---

# 10. Audio — `PH-AUDIO-001` v1.0 (design specification only; ownership decision required)

**Register action:** replace generic Audio row with `PH-AUDIO-001` only after the project owner confirms audio ownership and implementation responsibility. The register explicitly says ownership is not stated. This delivery provides a direction, not an assumption that audio implementation is approved.

## 10.1 Audio identity

Heavy, mechanical, grounded vehicular combat:
- Distinct engine layers by vehicle class.
- Weapon signatures differentiated by damage type and cadence.
- Clear tyre, suspension and collision feedback.
- Industrial hangar/menu ambience.
- Restrained UI confirmation/error cues.
- Combat mix prioritises threat readability over cinematic loudness.

## 10.2 Event mapping

Use existing gameplay events/states where appropriate:
- `OnFired`: weapon fire audio at muzzle.
- `OnDetonated`: impact/explosion audio.
- `OnComponentDestroyed`: localised mechanical failure cue.
- `OnVehicleDestroyed`: destruction audio.
- `IsOnFire`: looping fire audio while burning.
- Match phase changes: start/end stingers only on real state changes.

Vehicle engine RPM/load audio requires reliable engine telemetry; do not invent it from speed alone. Gear-shift sounds require gear state. Do not design those as active until exposed.

## 10.3 Audio controls

No settings screen exists in the current source. Master/music/SFX sliders are a future functional request. Do not place inert sliders into the menu. When implemented, use linear UI sliders with perceptual/logarithmic mapping in the audio subsystem, persist settings and expose an accessible reset action.

## 10.4 Acceptance

- [ ] Audio owner/implementation responsibility confirmed.
- [ ] Events bind to existing gameplay signals.
- [ ] No audio code modifies gameplay.
- [ ] Engine telemetry not fabricated.
- [ ] Mobile mix and memory budget profiled.
- [ ] Audio settings are not shown until settings API exists.

---

# 11. Cross-screen design and responsive rules

## 11.1 Shared components

Create reusable UMG components:
- `WBP_CommandPanel` — graphite 9-slice panel.
- `WBP_SectionHeader` — Rajdhani title + steel divider.
- `WBP_ActionButton` — primary amber/orange, secondary steel, destructive red only for confirmed destructive actions.
- `WBP_ItemCard` — icon/art, name, owned/locked/equipped states.
- `WBP_CurrencyPill` — icon, balance.
- `WBP_ProfileStrip` — name, level, XP.
- `WBP_ConfirmModal` — title/body/confirm/cancel.
- `WBP_EmptyState` — concise explanation and supported action.
- `WBP_Toast` — success/warning/error, never blocks input.

All visible strings are FText/string-table-backed. All cards must support focus and controller/keyboard navigation if those input modes are later enabled.

## 11.2 Buttons

- Primary: `#F07824` action surface with dark text or white text based on contrast test.
- Selected: amber edge `#FFB000`.
- Secondary: graphite/steel.
- Warning: yellow only for warning states.
- Destructive: destroyed red, used only for actual destructive/exit confirmation.
- Disabled: steel low contrast but still readable.
- Press animation: 80–120 ms scale/brightness feedback; input dispatch is immediate.

## 11.3 Modal rules

- One modal at a time.
- Modal opens above current screen with dim backdrop.
- Android back closes modal before navigating.
- Confirmation dialogs are required for irreversible operations only.
- Do not add confirmation to harmless tab changes.
- Do not claim an operation succeeded until the API result confirms it.

## 11.4 Accessibility

- Minimum 48 dp physical touch target; target larger for primary actions.
- Icon + text for non-obvious actions.
- Never use colour alone for status.
- Maintain contrast against hangar/background art.
- Provide reduced-motion behaviour when system preference is available.
- Avoid text below 12 px reference except decorative metadata.

---

# 12. Developer functional requests / blockers

These are explicit implementation dependencies, not assumed existing features.

| ID | Request | Why needed | Priority |
|---|---|---|---|
| MENU-FR-01 | Front-end match launch interface for four supported modes | Main Menu cannot safely launch a configured match through current documented API | Critical |
| MENU-FR-02 | Central navigation/screen flow and root exit handling | Consistent transitions and Android back behaviour | High |
| GARAGE-FR-01 | Per-player equipped loadout resolved by server/game mode with ownership validation | Roadmap says matches still use `DefaultVehicle` | Critical before claiming loadout affects matches |
| MISSION-FR-01 | Mission catalogue/list exposed to UI | Mission assets exist, but no catalogue/list API is documented | High |
| MISSION-FR-02 | Mission launch interface | UI must pass selected mission into game mode/map flow | Critical |
| SCORE-FR-01 | Scoreboard visibility input action | No scoreboard toggle contract exists | Medium |
| SCORE-FR-02 | Replicated assists field if assists column desired | Live player state does not expose assists | Optional |
| SETTINGS-FR-01 | Settings subsystem/API (audio, control layout, accessibility) | No settings screen/API exists | Later |
| PROFILE-FR-01 | Account identity/provider decision | Current implementation is local guest only | Later |
| ONLINE-FR-01 | Backend, matchmaking, lobby, reconnect and server-authoritative economy | None currently implemented; required before online shared economy | Critical before online launch |
| AUDIO-FR-01 | Confirm audio ownership and implementation responsibility | Register marks ownership unresolved | Required before audio implementation |

---

# 13. Updated implementation register actions

Update `Docs/VisualImplementationRegister.md` only after each specification is accepted and implementation starts. Proposed rows:

| Component ID | Version | Destination | Data / event dependencies |
|---|---:|---|---|
| `PH-MENU-001` | v1.0 | Main menu UMG / front-end navigation | `UUCProfileSubsystem`; match launch interface request |
| `PH-GARAGE-001` | v1.0 | Garage/showroom/loadout UMG | Profile, catalog, vehicle/weapon definitions |
| `PH-STORE-001` | v1.0 | Store UMG | Profile purchase/balance, catalog |
| `PH-MISSION-001` | v1.0 | Mission select UMG | Mission definitions, profile level/completion |
| `PH-SCOREBOARD-001` | v1.0 | Scoreboard UMG | `AUCGameState::PlayerArray`, `AUCPlayerState` |
| `PH-CINE-001` | v1.0 | Transition widgets / level flow | Match phase, result event, actual map-load state |
| `PH-VEH-001` | v1.0 | Vehicle Blueprint subclasses | `AUCVehiclePawn`, `UUCVehicleDefinition` |
| `PH-ENV-001` | v1.0 | `Content/Maps` | Player starts, checkpoints, repair zones |
| `PH-VFX-001` | v1.0 | Event listeners / Niagara or approved VFX system | Fire, hit, detonation, destruction events |
| `PH-AUDIO-001` | v1.0 pending ownership | Audio system | Existing fire/detonation/destruction/match events |

Do not mark any component “Implemented” or “Passed” because this document exists. Those statuses require actual engine/device verification.

---

# 14. Validation plan

## 14.1 First engine build

Roadmap says the Unreal module is uncompiled. Before visual implementation:
1. Build with Unreal Engine 5.7.
2. Fix compile errors in gameplay/presentation code.
3. Run existing CoreTests and Unreal automation tests.
4. Verify UMG code-built widgets instantiate.
5. Confirm string-table registration and font fallback.
6. Record exact engine/build configuration.

## 14.2 Front-end functional tests

- Profile loading does not flash zero balances.
- Main menu values match profile subsystem.
- Every visible navigation destination opens the correct screen.
- Back navigation returns to previous screen.
- Mode selection does not claim match launch until launch interface exists.
- Catalog filters match actual item kinds.
- Purchase and equip use transaction return values.
- Garage warning remains while matches use `DefaultVehicle`.
- Mission lock uses required level.
- Mission completion uses profile completion data.
- Scoreboard displays only replicated fields.
- Match results transition on actual result event.

## 14.3 Device tests

- 20:9 Android phone.
- 4:3 tablet.
- Safe-area/notch handling.
- 4 GB RAM compatibility device.
- 6 GB RAM baseline device.
- 60 FPS target baseline; 30 FPS fallback only if required by overall game budget.
- UI texture memory target from Delivery 02: 8 MB compressed GPU memory, aim 4 MB.
- No full-screen blur/render-target dependency.
- No full widget rebuild every frame.

---

# 15. Final handoff instruction to Claude

Implement the specifications in this package in dependency order. First compile the current project and validate the already-integrated Delivery 02 HUD/touch code. Then implement the front-end navigation shell and Main Menu, followed by Garage, Store and Mission Select. Implement scoreboard and transitions after their data/input contracts are verified. Vehicle, environment and VFX work must be built against the actual source mesh/event requirements. Audio remains blocked pending ownership confirmation.

Do not stop after drawing screens: wire every supported interaction to the real API, handle every returned state, add string-table keys, update the register, run tests and record measured performance. Where this document identifies a developer functional request, implement the API before enabling the associated control. Do not replace a missing API with a fake button, hardcoded data or a client-side gameplay rule.

**Delivery boundary:** This package completes the remaining front-end and presentation design specifications that were still generic/awaiting-spec in the uploaded register. It does not claim that the underlying game is compiled, feature-complete, online-ready, visually asset-complete or device-tested.
