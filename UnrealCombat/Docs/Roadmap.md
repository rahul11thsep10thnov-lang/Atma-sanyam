# Status and roadmap

## Done in this milestone (functional foundation)

* Project scaffold, module structure, Android/input/project configuration.
* Rules core with headless tests and CI: damage model, weapons, shield and abilities, economy,
  progression, save format, match rules for four modes, AI decisions and boss phases.
* Unreal gameplay module (uncompiled - see README): vehicle pawn, health, weapons, projectiles,
  abilities, game mode/state, bots and bosses, checkpoints and repair zones, profile subsystem
  with local persistence, placeholder HUD, automation tests.
* Visual implementation register, architecture, editor setup and backend design documents.

## Since the first commit

* Static review of the uncompiled module: removed `TObjectPtr<const T>` properties, added a missing
  forward declaration, replaced an unverified wheel-count call.
* Assists are now credited (opponents who damaged a vehicle in the 10 s before it died).

* Visual Delivery 02 implemented with placeholder art: touch controls (PH-TOUCH-001 v1.0) and in-match HUD
  (PH-HUD-001 v1.1), string table, theme tokens, boss/reload/cooldown/objective bindings. Debug HUD removed.

## Next, in order

1. **First engine build** - compile the Unreal module on a machine with UE 5.7 and fix errors.
2. **Greybox content** - follow `EditorSetup.md`; confirm the play loop end to end.
3. **Android device build** - package, measure frame rate and memory on a target device, tune.
4. **Functional tests** - automated test map covering damage, respawn, match end, rewards.
5. **Visual package integration** - incremental, one register row at a time, testing each.
6. **Backend** - implement per `BackendArchitecture.md` once the open decisions are made.

## Known gaps

| Area | Gap |
| --- | --- |
| Loadouts | Players all drive the game mode's `DefaultVehicle`; the equipped loadout in the profile is not yet used in matches (needs server-side ownership check). |
| Upgrades / consumables | Purchasable and stored, but have no in-match effect yet. |
| Weapons | Fixed forward-firing mounts; no turret aiming or lock-on. |
| AI | Direct steering with obstacle probe; no navmesh path following, so mazes and tight streets will defeat it. |
| Terrain | No surface-dependent grip or destructible scenery yet. |
| Multiplayer | Written for dedicated servers but untested over a network; no lobby, matchmaking or reconnect. |
| Rewards trust | Applied on the client (see backend doc). |
| Localisation | Placeholder HUD strings are not localised (the real UI will be). |
| Audio | Nothing implemented; ownership to be confirmed. |
| UI artwork | Icons, fonts and diagrams not delivered; the UI uses colour fills and the engine default font. |
| UI settings | No settings screen: left-handed layout, control opacity/scale not available. |
