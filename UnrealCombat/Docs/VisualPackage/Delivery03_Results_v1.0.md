# UNREAL COMBAT — VISUAL SPECIFICATION
## Delivery 03 · Results & Rewards Screen
**Component ID:** `PH-RESULTS-001` (new register ID)  
**Version:** `v1.0`  
**Engine:** Unreal Engine 5.7 · **Platform:** Android first · **Orientation:** Landscape  
**Reference canvas:** 1920 × 1080  
**Design basis:** `UnrealCombat/Docs/VisualImplementationRegister.md`, `Architecture.md`, `Roadmap.md`, plus the approved project decisions in the current conversation.

---

# 0. Source review and scope

The source documents were reopened from the supplied `UnrealCombat.zip` for this delivery.

## 0.1 Register entry

The current register contains the row:

- `Results / rewards screen`
- Gameplay data dependencies: `AUCPlayerController::OnMatchResult`, `LastLevelsGained`
- Implementation: Awaiting spec
- Testing: Not tested
- Not started by design

This delivery assigns the new component ID `PH-RESULTS-001`, version `v1.0`. Add this ID to the register and replace the generic Results / rewards row; do not create a duplicate.

## 0.2 Source-supported presentation data

The Architecture document explicitly supports:
- End-of-match summary and levels gained from `AUCPlayerController::OnMatchResult`.
- `FUCMatchResult` as the match result payload delivered to each client.
- Per-player kills, deaths, score and team from `AUCPlayerState`.
- Mode, phase, team scores, objectives, lives and winner from `AUCGameState`.
- Level, XP, balances, ownership and loadout from `UUCProfileSubsystem`, with `OnProfileChanged`.
- The profile wallet contains two currencies.
- The register explicitly identifies `LastLevelsGained`.

The exact field schema of `FUCMatchResult` is not shown in the supplied Architecture document. Therefore, this specification does not invent names or values for reward grants, match duration, assists, placement, damage dealt, accuracy, currency earned, bonus multipliers or mission stars.

## 0.3 Important distinction: displayable balance vs earned reward

The current architecture supports profile currency balances, but the supplied presentation table does not explicitly identify a per-match currency reward breakdown or a reward-grant event/payload. Therefore:

- The screen may display current balances from `UUCProfileSubsystem`.
- It may display an earned amount only if that amount is actually present in `FUCMatchResult` or a documented reward/grant result exposed to presentation.
- It must not calculate or invent credits/premium currency earned from score, kills, match mode or other values.
- If a per-match reward amount is not exposed, omit the earned-amount card and record the missing field as a functional request.

Likewise, level and XP may be displayed from the profile subsystem, and the number of levels gained from `LastLevelsGained`. Do not invent a level-up animation count or XP award formula.

## 0.4 Design authority

This is a presentation specification only. It does not change:
- Match outcomes or winner determination.
- Reward calculations, reward amounts or grant timing.
- XP calculations or level curves.
- Currency prices or economy rules.
- Score, kills, deaths or team attribution.
- Mission completion rules.

All displayed values are read from authoritative existing presentation data. The UI must not award, grant, save or mutate rewards.

---

# 1. Visual concept

**Identity:** IRON FRONT — Combat Systems Interface  
**Screen title:** MATCH RESULTS  
**Tone:** decisive, premium, industrial, readable at a glance.

The screen should feel like the post-operation debrief of a vehicular combat match: a large result verdict, a restrained battlefield/vehicle hero area, a concise performance summary, progression status and only those reward details the data contract actually supplies.

The screen must not become a cluttered loot explosion. Use strong hierarchy and short reveal motion. The player should understand the outcome and progression in under three seconds.

## 1.1 Semantic colours

Use the revised v1.1 design-system tokens:

| Token | HEX | Results-screen use |
|---|---|---|
| `UC-Graphite-950` | `#0B0F13` | Main background |
| `UC-Graphite-900` | `#121920` | Panels |
| `UC-Graphite-800` | `#1C2730` | Raised panels |
| `UC-Steel-700` | `#394752` | Dividers / tracks |
| `UC-Steel-400` | `#8B9AA5` | Secondary text |
| `UC-White` | `#F4F7F9` | Primary text |
| `UC-Player-Amber` | `#FFB000` | Player identity / progression accent |
| `UC-Action-Orange` | `#F07824` | Primary action accent |
| `UC-Warning-Yellow` | `#FFD43B` | Warning only |
| `UC-Critical-Magenta` | `#E0448A` | Critical damage only |
| `UC-Destroyed-Red` | `#B4232F` | Destroyed state only |
| `UC-Enemy-Red` | `#E84A3B` | Enemy team identity |
| `UC-Healthy-Green` | `#35C878` | Victory / successful completion accent |
| `UC-Shield-Cyan` | `#22B8D6` | Energy / shield only |
| `UC-Team-Blue` | `#2676D8` | Blue team identity |

**Result verdict colour:**
- Victory / won: `UC-Healthy-Green`.
- Defeat / lost: `UC-Enemy-Red` only as the opponent/team identity accent; use neutral white text and muted red panel trim for the defeat verdict.
- Draw / tie: `UC-Steel-400` or neutral white.
- Aborted / no result / unavailable: neutral steel.
- Do not use critical magenta for match defeat; it is reserved for critical vehicle/system damage.
- Do not use player amber to imply warning.

The exact result enum values must come from `FUCMatchResult` / match state. If a draw or aborted result is not represented by the source, do not fabricate it.

## 1.2 Typography

- Display verdict and large figures: Rajdhani Bold.
- Labels and descriptions: Inter Medium / Inter.
- Numeric values: tabular numerals where supported.
- Result title: 54–68 px at 1920×1080.
- Main performance figures: 34–42 px.
- Section titles: 22–26 px.
- Supporting labels: 16–20 px.
- Minimum important mobile text: 16 px reference before DPI scaling.

Use official font files and retain SIL Open Font License 1.1 notices.

---

# 2. Screen layout

## 2.1 1920×1080 reference layout

The screen uses a full-screen landscape composition with a left/right information grid and a shallow hero header.

| Region | X | Y | W | H | Anchor | Content |
|---|---:|---:|---:|---:|---|---|
| Background / hero | 0 | 0 | 1920 | 1080 | Full screen | Darkened arena/vehicle backdrop |
| Result verdict | 64 | 52 | 720 | 190 | Top-left | Victory/defeat/draw result |
| Match context | 64 | 244 | 720 | 52 | Top-left | Mode label; optional phase/result context only if exposed |
| Performance panel | 64 | 340 | 800 | 330 | Left | Player score, kills, deaths, team |
| Progression panel | 64 | 704 | 1792 | 230 | Bottom | Current level, XP, levels gained |
| Currency balance panel | 900 | 340 | 956 | 150 | Right | Two current wallet balances |
| Earned reward panel | 900 | 510 | 956 | 160 | Right | Only if actual per-match reward amounts are exposed |
| Footer action region | 900 | 704 | 956 | 230 | Bottom-right | No decorative buttons; actions only after navigation contract exists |

The layout may be reflowed to prevent empty reward panels when per-match reward amounts are unavailable. The progression panel should use the freed area rather than showing placeholder cards.

## 2.2 Background and hero

- Use a supplied arena/vehicle background or a darkened in-game scene capture only if the implementation pipeline can provide it reliably.
- Background is presentation art; it must not imply a different vehicle, map, or match result from the actual match.
- Use a dark graphite scrim (approximately 65–75% opacity) behind content.
- Keep high-contrast text and panels readable over bright explosions, sky or headlights.
- Do not require a live 3D vehicle render in v1.0. A static illustrated/approved background is acceptable.
- No invented player vehicle name, vehicle class, MVP badge or team banner unless corresponding data is exposed.

## 2.3 Result verdict panel

**Component sub-ID:** `PH-RESULTS-001-VERDICT`

Display:
- Result title from the authoritative match result.
- A small result emblem/icon.
- Mode name only if available from match state/result.
- Optional winner/team indicator only when supported by `AUCGameState` / `FUCMatchResult`.

States:
- Victory / won.
- Defeat / lost.
- Draw / tie only if the source result supports it.
- Unavailable / invalid result: neutral fallback, no fabricated winner.

Do not show “VICTORY” solely because the local player's team has the higher displayed score if the authoritative result says otherwise. `FUCMatchResult` is the result authority.

## 2.4 Performance panel

**Component sub-ID:** `PH-RESULTS-001-PERFORMANCE`

Supported fields:
- Score.
- Kills.
- Deaths.
- Team.

Sources:
- `AUCPlayerState` for per-player kills, deaths, score and team.
- `AUCGameState` for match mode and team scores/winner when required.

Rules:
- Show the local player's values, not a bot's or another player's.
- Do not invent assists, damage dealt, shots fired, accuracy, objective contribution, placement, MVP or survival time.
- If a field is unavailable, omit its row rather than showing `0` or a placeholder.
- Do not assume every mode uses teams. In free-for-all, omit team-specific presentation if there is no team value.
- Score is shown as supplied; no bonus multiplier is applied in the UI.

Suggested order:
1. Score — largest numeric emphasis.
2. Kills.
3. Deaths.
4. Team — only if present.

## 2.5 Currency balances

**Component sub-ID:** `PH-RESULTS-001-BALANCES`

The profile wallet contains two currencies. The current project context identifies them as credits and premium currency; use the actual currency identifiers/display metadata from the profile/catalog rather than hardcoding labels if available.

Display:
- Current credits balance.
- Current premium currency balance.

Source:
- `UUCProfileSubsystem` profile wallet / balance getters.
- Refresh from `OnProfileChanged` if it fires after the match result is applied.

Important:
- These are current balances, not automatically “earned this match”.
- Do not display `+X` or a reward animation unless a per-match grant amount is actually exposed.
- If the profile has not yet updated when `OnMatchResult` arrives, show a neutral loading state for the balance region, then update when `OnProfileChanged` arrives. Do not flash an incorrect zero.

States:
- Loaded.
- Loading.
- Unavailable / profile not ready.
- Balance value is zero.
- Profile update received.

## 2.6 Earned reward panel

**Component sub-ID:** `PH-RESULTS-001-EARNED-REWARDS`

This panel is conditional.

Show only reward amounts that are explicitly included in `FUCMatchResult` or in a documented presentation-accessible reward/grant result. The source documents do not define such fields today.

If reward amounts are not exposed:
- Hide this panel.
- Do not calculate amounts.
- Do not show example values.
- Do not show an empty reward chest or a fake “REWARDS” heading.
- Expand the progression panel into the available space.

If a future approved contract exposes currency reward amounts:
- Show each currency grant separately.
- Show amount and currency identity.
- Distinguish earned amount from current wallet balance.
- Never perform the grant from the UI.
- Avoid invented bonus labels or multipliers.

## 2.7 Progression panel

**Component sub-ID:** `PH-RESULTS-001-PROGRESSION`

Supported data:
- Current player level.
- Current XP.
- XP progression information only to the extent exposed by `UUCProfileSubsystem`.
- `LastLevelsGained` from the result flow.

Display:
- Current level.
- XP progress bar only if the profile subsystem exposes both current XP and the relevant next-level threshold/required XP.
- Levels gained as a concise `LEVEL UP` notification and count if `LastLevelsGained` is greater than zero.
- If `LastLevelsGained` is zero, do not show a level-up banner.

Do not derive the level curve inside the widget. The level curve belongs to `UUCGameSettings` / profile progression logic. If the profile subsystem does not expose next-level XP threshold, show level and XP as text without a progress bar.

### Level-up presentation
- When `LastLevelsGained > 0`, animate the level-up panel once.
- If the exact resulting level is available from the profile, display it.
- Do not animate through multiple levels unless the exact sequence/level data is available.
- If only a count is available, display `+N LEVEL` / `+N LEVELS` using localisation plural rules; do not guess the final level.
- Do not grant XP or levels from this animation.

---

# 3. Interactions and navigation

The register and architecture specify `OnMatchResult` and `LastLevelsGained`, but they do not define a results-screen navigation action, a scoreboard-opening action, or a return-to-menu action.

Therefore v1.0 is a results presentation screen with **no invented interactive buttons**.

The following are functional requests, not implemented controls in this design:
- `Continue` / return to main menu or lobby.
- `View Scoreboard`.
- `Rematch`.
- `Share result`.
- `Claim reward`.

Do not draw these as buttons until the developer confirms the relevant navigation/action contract and the target screens exist. A decorative button that does nothing is prohibited.

If a navigation action already exists elsewhere in the code but is absent from the supplied documents, the developer must identify it and add it to the presentation contract before it is included in the widget.

## 3.1 Entry and lifecycle

- Listen to `AUCPlayerController::OnMatchResult`.
- Present the result screen only when a valid result event is received.
- Bind the local player's result and profile values.
- Wait for `OnProfileChanged` if the profile values are still updating.
- Avoid duplicate presentation if the result delegate fires more than once for the same result.
- Do not mutate the match result or profile.
- If the result event is invalid/missing, do not invent a default victory/defeat screen.

The precise event signature and payload fields must be confirmed from source code during implementation if the public docs do not specify them.

---

# 4. States

| State | Presentation |
|---|---|
| Initial / entering | Darkened background; result panel fades/slides in |
| Victory | Green verdict accent; neutral high-contrast text |
| Defeat | Muted enemy-red accent; neutral high-contrast text |
| Draw | Neutral steel accent, only if source supports draw |
| Result unavailable | Neutral fallback; no fabricated result |
| Performance loaded | Show available PlayerState values |
| Performance partial | Omit unavailable fields |
| Profile loading | Show loading treatment in balance/progression regions |
| Profile loaded | Show current balances and progression |
| Zero balance | Display `0` normally |
| No level gained | No level-up banner |
| Level(s) gained | One-time progression reveal using `LastLevelsGained` |
| Earned rewards absent | Hide earned reward panel |
| Earned rewards available | Show only explicit grant amounts |
| Result already shown | Do not replay the entry animation |

---

# 5. Animation specification

All animation is presentation-only and must not delay match-end processing.

| Element | Duration | Easing | Behaviour |
|---|---:|---|---|
| Background fade | 240 ms | Ease-out | Dark scrim fades in |
| Result verdict entry | 320 ms | Ease-out | Short vertical settle and opacity |
| Performance panel | 220 ms | Ease-out | Fade/slide in |
| Balance panel | 220 ms | Ease-out | Fade/slide in, stagger 60 ms |
| Progression panel | 260 ms | Ease-out | Fade/slide in |
| XP bar fill | 500 ms | Ease-out | Animate only when valid start/end XP values exist |
| Level-up accent | 450 ms | Ease-out | One-time glow/scale settle when levels gained > 0 |
| Currency amount reveal | 300 ms | Ease-out | Only for explicit per-match grant amounts |
| Result screen exit | 180 ms | Ease-in | Only when a real navigation action is approved |

No looping particle bursts, flashing gold coins, screen shake or repeated reward pulses. Keep the result screen calm and premium.

---

# 6. Responsive layout

## 6.1 20:9 Android phones

- Use the 1920×1080 logical layout as the design reference and Unreal DPI scaling for physical device adaptation.
- Keep the verdict and mode in the top-left.
- Use two-column performance and profile panels when width permits.
- If the visible safe width is constrained, stack performance above progression and collapse the optional earned-reward region.
- Do not scale text below the specified minimum to preserve a desktop-like layout.
- Use Safe Zone widget for notches/cut-outs and system bars.

## 6.2 4:3 tablets

- Maintain the same hierarchy but use a two-column grid with reduced hero height.
- Maximum content width: 1760 px at the 1920 reference.
- Keep panels aligned to a common 8 px grid.
- Do not stretch the hero vehicle image to fill the full screen; crop using a deliberate focal point.
- Stack the two currency balances vertically if necessary.

## 6.3 Safe areas

Use Unreal Safe Zone widget and project DPI scaling as confirmed by the developer. Do not hardcode device notch sizes or manually duplicate safe-area padding in child widgets.

---

# 7. Asset list

Folder: `Visual/PH-RESULTS-001/v1.0/`

| File | Format | Source size | Purpose |
|---|---|---:|---|
| `Results_Background_IndustrialArena.webp` | WebP | 1920×1080 | Darkened background / hero art |
| `Results_Verdict_Victory.svg` | SVG | 512×256 viewBox | Victory emblem |
| `Results_Verdict_Defeat.svg` | SVG | 512×256 viewBox | Defeat emblem |
| `Results_Verdict_Draw.svg` | SVG | 512×256 viewBox | Draw emblem; use only if source supports draw |
| `Results_Icon_Score.svg` | SVG | 96×96 | Score |
| `Results_Icon_Kills.svg` | SVG | 96×96 | Kills |
| `Results_Icon_Deaths.svg` | SVG | 96×96 | Deaths |
| `Results_Icon_Team.svg` | SVG | 96×96 | Team |
| `Results_Icon_Credits.svg` | SVG | 128×128 | Credits identity |
| `Results_Icon_PremiumCurrency.svg` | SVG | 128×128 | Premium currency identity |
| `Results_Icon_Level.svg` | SVG | 128×128 | Level/progression |
| `Results_Icon_XP.svg` | SVG | 96×96 | XP |
| `Results_Panel_Base_9Slice.svg` | SVG | 512×256 viewBox | Reusable panel |
| `Results_Panel_Accent_Victory.svg` | SVG | Vector | Victory accent |
| `Results_Panel_Accent_Defeat.svg` | SVG | Vector | Defeat accent |
| `Results_ProgressTrack.svg` | SVG | 512×64 | XP progress track |
| `Results_ProgressFill.svg` | SVG | 512×64 | XP progress fill |
| `Results_Font_Rajdhani_*` | TTF/OTF | Official files | Display/numeric font |
| `Results_Font_Inter_*` | TTF/OTF | Official files | UI font |
| `ST_Results.csv` or Unreal string-table asset | CSV / UE asset | Keys below | Localised text |

Do not use fake/placeholder reward art if the corresponding reward type or amount is unavailable. Icons should be vector masters and rasterised only as required by the runtime UI pipeline.

---

# 8. Localisation string keys

All visible text must use Unreal string tables. Suggested table: `ST_Results`.

| Key | English source text |
|---|---|
| `Results.Title` | MATCH RESULTS |
| `Results.Verdict.Victory` | VICTORY |
| `Results.Verdict.Defeat` | DEFEAT |
| `Results.Verdict.Draw` | DRAW |
| `Results.Mode` | MATCH MODE |
| `Results.Performance.Title` | YOUR PERFORMANCE |
| `Results.Stats.Score` | SCORE |
| `Results.Stats.Kills` | KILLS |
| `Results.Stats.Deaths` | DEATHS |
| `Results.Stats.Team` | TEAM |
| `Results.Balances.Title` | CURRENT BALANCE |
| `Results.Currency.Credits` | CREDITS |
| `Results.Currency.Premium` | PREMIUM CURRENCY |
| `Results.Rewards.Title` | MATCH REWARDS |
| `Results.Progression.Title` | PLAYER PROGRESSION |
| `Results.Progression.Level` | LEVEL |
| `Results.Progression.XP` | XP |
| `Results.Progression.LevelUp` | LEVEL UP |
| `Results.Progression.LevelsGained` | LEVELS GAINED |
| `Results.Loading` | LOADING |
| `Results.Unavailable` | UNAVAILABLE |

Use Unreal string-table pluralisation/formatting for the number of levels gained. Do not concatenate English phrases in code.

---

# 9. Performance constraints

Initial design targets, subject to measurement on the first Android build:

| Area | Target |
|---|---|
| Device class | Mid-range Android, 6 GB RAM class |
| Compatibility | Lower-mid-range Android, 4 GB RAM class |
| Frame rate | 60 FPS target; 30 FPS fallback if required by overall game budget |
| Results UI texture memory | 8 MB compressed GPU memory target for the full UI package; aim for 4 MB |
| Background art | One compressed 1920×1080 background; use device-appropriate mip/texture settings |
| Animation | UMG opacity/translation/scale only; avoid expensive full-screen blur |
| Widget updates | Event-driven on result/profile changes |
| Number animation | No per-frame Blueprint binding that rebuilds the entire widget |
| Memory lifetime | Release result-only assets when leaving the screen if not shared |

These are design targets, not measured performance claims.

---

# 10. Functional requests / developer questions

The following items are not confirmed by the supplied source documents and must not be silently assumed.

## 10.1 Match result schema
- [ ] Provide the exact `FUCMatchResult` fields and types available to presentation.
- [ ] Confirm exact result enum values (win/loss/draw/aborted or other).
- [ ] Confirm whether the result includes mode, winning team, local-player result and match summary fields.
- [ ] Confirm whether result payload is replicated/available consistently on all clients.

## 10.2 Reward breakdown
- [ ] Confirm whether `FUCMatchResult` contains per-match credits earned.
- [ ] Confirm whether it contains per-match premium currency earned.
- [ ] If rewards are generated elsewhere, expose a presentation-safe grant summary (currency ID + amount) after the grant is accepted.
- [ ] Confirm whether the profile balance is updated before or after `OnMatchResult`.
- [ ] Confirm whether reward grants can be pending/failed; if so, expose a state rather than letting UI assume success.

## 10.3 Progression
- [ ] Confirm exact `LastLevelsGained` type and whether it is a count or a list of level transitions.
- [ ] Confirm profile getters expose current level and current XP.
- [ ] Confirm whether the XP required for the next level is exposed to presentation.
- [ ] If next-level XP is not exposed, keep XP progress bar out of the screen; show level/current XP only.

## 10.4 Navigation
- [ ] Define the action that closes the results screen and returns the player to the correct destination.
- [ ] Confirm whether a scoreboard screen can be opened from results and what action performs that transition.
- [ ] Confirm whether rematch is supported in the current project. The Roadmap says multiplayer has no lobby/matchmaking/reconnect, so do not show rematch until a valid path exists.
- [ ] Confirm whether results can be reopened after travel/reconnect; current roadmap lists reconnect as a gap.

## 10.5 Scoreboard dependency
- [ ] Confirm if `AUCGameState::PlayerArray` remains available after match end and during results presentation.
- [ ] Confirm whether the future scoreboard should show all players/bots and what sorting order is authoritative.
- [ ] Do not add a scoreboard button until the scoreboard specification and navigation action are approved.

## 10.6 Trust and persistence
The Roadmap identifies that rewards are currently applied on the client. This is a known gap. The results screen must not imply server-verified reward settlement unless the backend/reward trust design has been updated. The screen displays only the state currently supplied by the profile/result APIs.

---

# 11. Acceptance checklist

- [ ] Register updated with `PH-RESULTS-001 v1.0`.
- [ ] Screen is driven by `AUCPlayerController::OnMatchResult`.
- [ ] Uses only the actual `FUCMatchResult` fields and documented PlayerState/GameState/Profile data.
- [ ] Victory/defeat comes from authoritative result state, not UI-side score comparison.
- [ ] Performance panel shows only available score/kills/deaths/team values.
- [ ] Currency balances are clearly labelled as current balances.
- [ ] Earned currency is shown only when a real per-match grant amount is exposed.
- [ ] No invented XP, currency, bonus, multiplier, placement, assists or MVP data.
- [ ] Current level and XP are read from profile subsystem.
- [ ] XP bar appears only when current XP and next-level threshold are both exposed.
- [ ] `LastLevelsGained` controls the level-up presentation.
- [ ] No decorative/non-functional buttons.
- [ ] All strings are localised through Unreal string tables.
- [ ] Safe Zone and DPI scaling are respected.
- [ ] 20:9 phone and 4:3 tablet layouts are validated.
- [ ] Widget updates are event-driven.
- [ ] Results UI does not mutate gameplay, profile, rewards or progression.

---

# 12. Delivery boundary

This delivery specifies only `PH-RESULTS-001 v1.0`.

Next components remain in the agreed sequence:
1. Main menu and navigation.
2. Garage / showroom and loadout.
3. Store / economy screens.
4. Mission select.
5. Scoreboard.
6. Transitions and cinematics.
7. Vehicle exteriors (`PH-VEH-001`).
8. Environments (`PH-ENV-001`).
9. Weapon fire, impacts, explosions, vehicle damage and fire (`PH-VFX-001`).

**Implementation authority:** implement this screen faithfully. If a field, state or navigation action is absent from the source contract, omit that presentation element and record the missing dependency. Do not fill gaps with invented game data or decorative controls.
