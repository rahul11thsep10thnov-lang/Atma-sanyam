# Unreal Combat

Vehicular combat game for Unreal Engine 5.7, Android first. This folder is a self-contained
Unreal project; it shares nothing with the rest of the repository.

**Division of responsibility.** This codebase is the *functional* game: physics, damage, weapons,
AI, modes, progression, persistence, networking. Visual identity, UI/UX, vehicle exteriors,
environment art, VFX and animation direction are owned by the external visual package and are
integrated through [`Docs/VisualImplementationRegister.md`](Docs/VisualImplementationRegister.md).
Anything on screen today is a labelled placeholder.

## Layout

| Path | What it is |
| --- | --- |
| `Source/UnrealCombatCore` | Game rules in standard C++ with no engine dependency: damage model, weapons, defences, economy, progression, save format, match rules, AI decisions. |
| `Source/UnrealCombat` | Unreal gameplay module: Chaos vehicle pawn, components, game mode, AI controller, profile subsystem, world actors. Wraps the core with replication and events. |
| `CoreTests` | Headless tests for the rules core (CMake, no engine needed). |
| `Config` | Project, input and Android settings. |
| `Content` | Empty. Maps, Blueprints, input assets and data assets are created in the editor - see `Docs/EditorSetup.md`. |
| `Docs` | Architecture, editor setup, backend design, visual register, status and roadmap. |

## Verification status

| Part | Status |
| --- | --- |
| Rules core | Compiles warning-free (`-Wall -Wextra -Wshadow -Wconversion -Werror`, no exceptions, no RTTI); 217 checks in 15 tests pass. Runs in CI. |
| Unreal module | **Written but not yet compiled** - no Unreal Engine was available where it was authored. Expect some compile fixes on first build. |
| Content | Not created. No map, vehicle Blueprint or input assets exist yet, so the game cannot be played until `Docs/EditorSetup.md` is followed. |
| Android package | Settings are in place; no build has been produced. |

## Run the core tests

```
cmake -S CoreTests -B CoreTests/build
cmake --build CoreTests/build
ctest --test-dir CoreTests/build --output-on-failure
```

## Open the project

1. Install Unreal Engine 5.7 with Android support, then Android SDK/NDK/JDK via *Platforms > SDK Management*.
2. Right-click `UnrealCombat.uproject` > *Generate project files*, build the `UnrealCombatEditor` target, open the project.
3. Follow `Docs/EditorSetup.md`.
