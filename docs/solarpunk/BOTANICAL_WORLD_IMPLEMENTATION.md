# 3D Botanical World — implementation status

This is the first working version of the 3D Botanical World built on the
existing Solarpunk prototype. It shows **your real garden** in 3D. It sits
**alongside** the existing Garden tab and does **not** replace it. It is hidden
unless the build flag `EXPO_PUBLIC_SOLARPUNK_PROTOTYPE=1` is set.

## How to open it on your phone

In PowerShell, in `C:\dev\focus-app`:

```powershell
git pull
npm install
$env:EXPO_PUBLIC_SOLARPUNK_PROTOTYPE = "1"
npx expo start
```

Scan the QR code with Expo Go on the Android phone. Then go to **Settings → About →
"3D Botanical World (preview)"**. The world reads the plants you already have.
To grow a new one, use the normal plant session from Home; when it completes,
the world welcomes it with the camera.

To build an installable test APK with the preview inside, set the same variable
before `npm run build:android:preview`. **Production builds do not contain it**
(checked: an Android export without the flag contains none of the world's code).

## How it works (the safe design)

```
completed focus session ──► creditCompletedSession (existing, src/spaces/focusEngine.ts)
                               └─► plantFromSession → focus.paradise.v1   (existing, unchanged)
                                                         │  read only
                                                         ▼
                           3D world: reconcile(...) → focus.world.v1   (new key)
                                                         │
                                                         ▼
                                    three.js scenes (existing engine)
```

* **Plants are not copied.** A plant is still the record the existing garden
  keeps (one per completed session, keyed by `sessionId`). The world only stores
  *where* each plant stands. So nothing in the world can create, duplicate or
  lose a plant, coins are untouched, and the existing Garden keeps working.
* **Abandoned sessions** still create the existing wilted-sapling record
  (`addPenalty`); the world shows it as a wilted sapling. Clearing it with coins
  stays in the Garden tab.
* **Rollback:** turn the flag off (or delete `focus.world.v1`). The existing
  garden was never written by the world, so there is nothing to undo.

## Storage schema: `focus.world.v1`

| Field | Meaning |
|---|---|
| `schemaVersion` | `1`. Any other value is copied to `focus.world.v1.unreadable` and never overwritten silently. |
| `version`, `createdAt` | timestamps |
| `landmarks[]` | `{ id: 'grand-banyan', wing: 'northern-arboretum', x: 0, z: 0, species: 'banyan', permanent: true, establishedAt }`. Restored and re-pinned to its coordinates on every load. |
| `wings` | `{ [wingId]: { unlockedAt } }` — Central Conservatory and Northern Arboretum are open from the start; the others open by progression (sessions, focused minutes, species), never by payment. |
| `placements` | by plant/sapling id: `{ kind: 'specimen' | 'penalty', refId, wing, slotId, zone, x, z, radius, placedAt }`. Coordinates are stored, so a placed plant never moves. |
| `pending[]` | plants grown but waiting for room. Never discarded; they take the next free position. |
| `lastWelcomed` | the last plant the camera welcomed, so a welcome happens once. |

Code: `src/world/model.ts` (rules), `src/world/zones.ts` (wings, 15 + 10 zones,
species → zone), `src/world/repository.ts` (saving, via `src/storage/safeStore`).

## What was implemented

| Requirement | Status |
|---|---|
| Existing garden, coins, timer untouched | **Done.** World only reads `focus.paradise.v1`; tests and a browser check confirm plants are byte-identical after visits. |
| Separate versioned persistence + rollback | **Done** (`focus.world.v1`, flag). |
| Real focus sessions → one permanent specimen | **Done** through the existing completion path. A session reported twice still makes one plant (tested). |
| Abandoned sessions → wilted sapling, no plant | **Done** (tested). |
| Grand Banyan permanent, no slot, fixed coordinates | **Done** (tested: removed or moved landmark is restored). Ordinary banyans grow as normal trees. |
| 15 conservatory zones, 10 arboretum zones | **Done** as zone areas with their own species; tap the ground to see a zone. Each zone's *landscaping* is still the shared diorama, not individually designed. |
| ≥200 plant + ≥100 tree positions | **Done:** 763 positions over the two wings (302 + 461), never a hard-coded total. |
| No plant lost when full | **Done** (pending list, tested with 900 plants). |
| Placed plants never move; new wings never move plants | **Done** (tested). |
| Natural placement (zone, footprint, ceiling, water, paths, landmark) | **Done** (clearance tested, no overlaps). |
| 30 plants, 15 trees, 7 stages each | **Done:** 30 plants and 19 trees, each its own procedural model and 7 distinct stages. The app's other 84-catalogue species use the nearest model, and the card says so. |
| Glass corridor between wings, smooth transition | **Done** (corridor in both scenes, fade transition; skipped with Reduce Motion). |
| Camera: overview, zoom, pinch, two-finger pan, rotate, tap inspect, focus on new specimen and banyan, bounds | **Done** (web, with real touch events; not yet on a phone). |
| Environment: wind, water, koi, pollen, sun shafts, butterflies, falling petals, day/golden/dusk, lanterns | **Done**; all frozen when the phone's Reduce Motion is on. Birds: **not done.** |
| Victorian glasshouse look (from the reference) | **Improved**: cream glazing-bar grid, arched ribs, drum and lantern; dome fades away in close-up (cutaway). Still not photographic. |
| Greenhouse map, wing unlocking by progression | **Done** for the data and the map; only the two first wings are built as 3D scenes. |

## Not done yet (honest list)

1. **Tested on a real Android phone: no.** Everything was checked in a browser
   with software rendering. Frame rate, memory and heat on phones are unknown.
2. **Photorealism:** procedural models with vertex colours; better than before,
   still clearly stylised compared with the reference collage.
3. **The focus screen's growing seedling is still the existing 2D one.** The 3D
   seedling during a session is not built.
4. **Plant picker with 3D previews:** choosing a plant still uses the existing
   picker on Home. The prototype's Collection screen shows all 3D models.
5. **Performance work:** LOD by distance exists; instancing of repeated species,
   texture atlases/compression, and GL-context-loss recovery are not done.
   Both built wings are generated on opening (about 1–3 s); other wings are
   not built at all.
6. **Eight further wings** (Eastern, Western, Southern, Aquatic, Orchid, Desert,
   Japanese, Rainforest, Experimental) exist as data and on the map only.
7. **Per-zone landscaping** (e.g. raked gravel in the Zen garden, raised beds in
   the Vegetable garden, waterfalls) is not modelled.
8. Peony, hydrangea and olive have 3D models but are not in the app's plant
   catalogue yet, so they cannot be grown by a session.
9. Corridor tap: the "Walk through" card is implemented, but my automated test
   aimed at the wrong wing and did not confirm it.

## Test results

* `npm run typecheck` — passes.
* `npm run test:world` — **14 / 14 pass** (`src/world/__tests__/world.test.ts`):
  own storage key; 15 + 10 zones and 11 wings; one session → one plant → one
  position; growth table unchanged (15/30/60/90/120/150/180); abandoned → sapling
  only; placed plants never move; 900 plants on a small floor → none lost;
  no overlaps and nothing on the landmark; banyan restored and pinned; ordinary
  banyan placed as a tree; species go to the right zones; wings open by
  progression; save round-trip and schema rejection; 1,000 plants place in < 4 s.
* Browser run of the real screen (web export, software GL): 39 seeded plants + 1
  sapling all placed (0 pending); restart → identical placements and identical
  garden plants; a new completed session (reported twice) → one plant, placed in
  the Tropical Garden and welcomed, no other plant moved; tapping a plant shows its
  real record; banyan card; no page errors.
* Android export **without** the flag: succeeds; none of the world's code is in it.

Screenshots: `docs/solarpunk/screenshots/world/`.
