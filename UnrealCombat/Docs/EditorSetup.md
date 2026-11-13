# Editor setup (first run)

The repository holds code and configuration only. Binary assets must be created in the Unreal
editor. These steps produce a playable greybox test using placeholders.

## 1. Build
Generate project files, build `UnrealCombatEditor` (Development Editor), open the project.
This will be the first compile of the Unreal module - fix any compile errors before continuing.

## 2. Input assets (`Content/Input`)
Create Input Actions:

| Asset | Value type |
| --- | --- |
| `IA_Throttle` | Axis1D |
| `IA_Steer` | Axis1D |
| `IA_Handbrake`, `IA_FirePrimary`, `IA_FireSecondary`, `IA_Reload`, `IA_Ability1`, `IA_Ability2` | Digital (bool) |

Create `IMC_Driving` and map, for example: W / S (S with Negate) and gamepad triggers to
throttle; A (Negate) / D and left stick X to steer; Space to handbrake; mouse buttons / gamepad
bumpers to fire; R to reload; Q / E to abilities.

## 3. Placeholder vehicle (`Content/Vehicles`)
1. Use any Chaos-compatible vehicle skeletal mesh (the engine's vehicle template mesh works).
2. Create a Blueprint with parent **UCVehiclePawn**: assign the mesh and its animation Blueprint,
   enable *Simulation Generates Hit Events* on the mesh.
3. On the vehicle movement component add four wheel setups **in the order FL, FR, RL, RR** and tune
   engine / transmission / steering as usual.
4. Add a spring arm and camera.
5. Move `PrimaryWeapon` and `SecondaryWeapon` to the muzzle positions (X forward = line of fire).
6. Assign `IMC_Driving` and the input actions in the *Unreal Combat | Input* category.
7. Optional: fill `BoneToComponent` on the Health component with physics-body names.

## 4. Data assets (`Content/Data`)
* `UCWeaponDefinition` - e.g. a machine gun (defaults) and a rocket (ProjectileSpeed > 0,
  ProjectileClass = a Blueprint of **UCProjectile**, ExplosionRadius > 0).
* `UCVehicleDefinition` - set `PawnClass` to the vehicle Blueprint and assign weapons. Make a
  second one with `BossPhases` for boss testing.
* `UCCatalog` - list vehicles and weapons with prices; ids must use only letters, digits, `.`, `_`, `-`.
* Project Settings > Game > Unreal Combat - set the catalog and starter items.
* Optional `UCMissionDefinition` for PvE.

## 5. Test map (`Content/Maps`)
A flat greybox with several Player Starts, a `UCRepairZone` and, for missions, `UCCheckpoint`s.
Create a Blueprint of **UCGameMode**, set `DefaultVehicle` (and `Mission` or bot settings), and
use it as the map's game mode. Set the map as *Game Default Map* in Project Settings.

## 6. Play
Play in editor. The text read-out in the corner is placeholder PH-HUD-001. Check: driving,
firing, bots patrol/attack, damage reduces engine power and grip, destroyed vehicles respawn,
the match ends on score or time, and credits/XP increase afterwards.
Run automation tests from *Tools > Session Frontend > Automation > UnrealCombat*.

## 7. Android
Install SDK/NDK/JDK through *Platforms > SDK Management*, change `PackageName` in
`Config/DefaultEngine.ini`, then *Platforms > Android > Package Project*.
