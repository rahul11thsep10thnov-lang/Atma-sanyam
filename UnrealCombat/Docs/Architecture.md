# Architecture

## Layers

```
 Visual package (external)      UI widgets, meshes, VFX, audio, animation
        |  reads data, listens to events - never owns rules
 Unreal gameplay module         UnrealCombat: actors, components, replication, input, persistence
        |  calls
 Rules core                     UnrealCombatCore: pure C++ rules, deterministic, engine-free
```

Each layer only depends on the one below it.

* **Rules core** decides outcomes: how much damage gets through armour, when a weapon may fire,
  who won, what a purchase costs. It has no Unreal types, so it is unit-tested without the engine
  and can be compiled into a backend service to validate what clients report.
* **Unreal module** owns everything engine-specific: Chaos vehicle physics, traces, spawning,
  networking, save slots. Its classes hold a core object and add replication plus delegates.
* **Presentation** binds to the delegates and getters listed below. Replacing a widget, mesh or
  effect never requires a gameplay change.

## Data-driven tuning

No gameplay number is hard-coded in the Unreal module. Designers author `UPrimaryDataAsset`s:

| Asset | Controls |
| --- | --- |
| `UUCVehicleDefinition` | Component health, directional armour, resistances, shield, abilities, weapons, collision damage, AI personality, boss phases, pawn Blueprint |
| `UUCWeaponDefinition` | Damage, type, rate of fire, ammo, heat, spread, range, hitscan or projectile, penetration |
| `UUCMissionDefinition` | Mode, objectives, enemy roster, time limit, lives |
| `UUCCatalog` | Purchasable items, prices, level gates |
| `UUCGameSettings` (Project Settings) | Level curve, starting credits, starter items, catalog |

## Systems

### Vehicle (`AUCVehiclePawn`)
Extends `AWheeledVehiclePawn` (Chaos Vehicles). Enhanced Input for players; AI uses the same
`SetDriveInput` / `SetFiring` entry points. Damage changes handling: the pawn scales the
Blueprint-authored engine torque and per-wheel friction by the damage model's modifiers
(engine damage cuts power, lost wheels cut grip and steering, a dead engine immobilises).

### Damage (`UUCVehicleHealthComponent` / `uc::FVehicleDamageModel`)
Order: shield -> directional ablative armour -> targeted component (with bleed to chassis).
Nine components (chassis, engine, fuel tank, four wheels, two weapon mounts), six armour faces,
five damage types. A ruptured fuel tank starts a fire. Server-authoritative; clients receive a
snapshot and derive the same events. Hit location is resolved from a bone map, falling back to a
position heuristic.

### Weapons (`UUCWeaponComponent` / `uc::FWeapon`, `AUCProjectile`)
Clients send trigger state only; the server simulates fire rate, magazines, reloads and heat,
then traces (hitscan) or spawns a projectile (optional area damage). Every shot raises `OnFired`
on all machines for presentation.

### Defences (`UUCAbilityComponent` / `uc::FShield`, `uc::FAbility`)
Regenerating shield plus cooldown/charge-based abilities: repair kit, boost, shield recharge,
extinguisher.

### Match flow (`AUCGameMode` / `uc::FMatch`)
One game mode runs all four modes - free-for-all, team deathmatch, mission, boss hunt. It spawns
vehicles and bots from definitions, feeds kills/damage/checkpoints into the rules, and mirrors
the result into `AUCGameState` and `AUCPlayerState`. Bots have player states, so scoring is
uniform. At the end each client receives an `FUCMatchResult`.

### AI (`AUCAIController` / `uc::DecideState`, `SelectTarget`, `ComputeDrive`, `FBossController`)
States: patrol, pursue, engage, evade, retreat, with hysteresis. Personality is data. A boss is
a bot whose vehicle definition has phases; each phase rescales damage, fire rate and speed and
may trigger an ability.

### Profile (`UUCProfileSubsystem` / `uc::FPlayerProfile`)
Wallet (two currencies), inventory, loadout, level/XP, completed missions. Every grant and
purchase carries a transaction id and is idempotent. Stored as versioned text through
`IUCBackendService`; the shipped implementation is an on-device guest account.

### World (`AUCCheckpoint`, `AUCRepairZone`)
Objective checkpoints and repair/rearm areas.

## What presentation binds to

| Data / event | Source |
| --- | --- |
| Component health, armour, shield, fire, destroyed | `UUCVehicleHealthComponent` getters; `OnStateChanged`, `OnComponentDestroyed`, `OnVehicleDestroyed` |
| Ammo, reserve, heat, reloading, overheated, mount online | `UUCWeaponComponent::GetWeaponState`, `OnStateChanged` |
| Shot fired (muzzle, end point, hit) | `UUCWeaponComponent::OnFired` |
| Projectile detonation | `AUCProjectile::OnDetonated` |
| Ability cooldowns, charges, active | `UUCAbilityComponent::GetAbilityStates`, `OnAbilitiesChanged` |
| Speed | `AUCVehiclePawn::GetSpeedKmh` |
| Mode, phase, clock, team scores, objectives, lives, winner | `AUCGameState` fields, `OnMatchStateChanged` |
| Per-player kills, deaths, score, team | `AUCPlayerState` |
| End-of-match summary and levels gained | `AUCPlayerController::OnMatchResult` |
| Level, XP, balances, ownership, loadout, purchase/equip | `UUCProfileSubsystem`, `OnProfileChanged` |
| Catalog contents | `UUCProfileSubsystem::GetCatalog` |

## Networking

Server-authoritative. Designed for a dedicated server (`UnrealCombatServer` target, needs a
source-built engine) and also works as listen server or standalone. Clients send inputs and
intents (trigger, reload, ability); the server owns damage, ammo, scoring and match state.

## Testing

* `CoreTests` - headless, every rule; run on each push by `.github/workflows/unreal-combat-core.yml`.
* `Source/UnrealCombat/Private/Tests` - editor automation tests for data conversion and hit location.
* Still needed: functional tests in a test map once content exists (see `Roadmap.md`).
