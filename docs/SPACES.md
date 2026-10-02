# The three spaces: balcony, garden, room

FOCUS has three photographic places that grow with focused time — a
balcony, a garden and a room — each its own tab. They share one engine
(`src/spaces/`), one store, one jigsaw art wall and one coin balance.

The test for every change: **hide all the controls — does it still look
like a photograph of a real, beautiful place?**

## How they are built

Every surface, plant and object is path-traced offline in Blender Cycles
(`tools/balcony-render/`, fully procedural: no downloaded assets) and the
phone only stacks the pictures. Objects are rendered **in each place they
can stand**, with their own shadows, so moving one swaps to the photograph
of it in that spot. See `docs/PHOTO_BALCONY.md` for why this beats
real-time 3D on low-end Android.

| Space | Scene | Lighting states rendered |
| --- | --- | --- |
| Balcony | `focusbalcony/scene.py` | morning |
| Garden | `focusbalcony/garden.py` — lawn with real grass, flagstone path, raised beds, neem, gulmohar, frangipani, hedges and fence, tree line and hills | morning, night, sunset, rain |
| Room | `focusbalcony/room.py` — 3.6 × 5.2 m bedroom: four walls, oak floor, window on the left wall with a garden beyond, teak door on the right, bed with draped linen under the window, far wall kept for art | morning, night, sunset, rain |

**Afternoon** and **evening** are derived on the phone from the nearest
rendered state with a colour veil (`src/spaces/states.ts`); every other
state is a real render. The garden and room offer a chip that cycles
*Now → Morning → Afternoon → Sunset → Evening → Night → Rain*; *Now*
follows the clock. Rain adds a scrolling streak layer and wet, darker
materials.

## What grows

| Space | Focus plant | Stages |
| --- | --- | --- |
| Balcony | peace lily | seedling 0 → small 25 → growing 45 → mature 60 → flowering 90 min |
| Garden | Kachnar (orchid tree) | seed 0 → seedling 5 h → young 20 h → mature 50 h → large 100 h → flowering 250 h → grand 500 h (with a plank swing) |
| Room | peace lily | as the balcony |

The focus plant grows only from completed sessions in that space.
Abandoning a session (after the ten-second grace) makes it droop and
leaves two **penalty objects** in the space: a wilted sapling and a broken
picture. They cannot be put away or thrown in the bin; each clears only for
`PENALTY_REMOVAL_COINS` (40) coins.

Garden plants bought in the store — marigold, hibiscus, rose, jasmine,
bougainvillea — are **growable**: seed → sprout → young → mature →
flowering at 0 / 25 / 60 / 120 / 240 focused minutes while placed, with a
wilted render below 60 % health.

## The store, inventory, rack and dustbin

- `src/spaces/catalog.ts` lists the **100 items** for sale (12 balcony, 35
  garden, 53 room), each with a coin price, a rupee value
  (`rupeesFor`), the spaces it fits and when it unlocks.
- Each space has an **Inventory**: everything owned there, placed or put
  away, with its value; put-away things can be placed again or thrown away.
- Finished jigsaw artworks that hang nowhere lean on the garden's
  **picture rack** (rendered with 0–4 pictures). The Gallery can hang one
  here, in another space, or throw it away.
- The garden's **dustbin** has infinite capacity: in Customize, drop any
  item on it; from the balcony and room, "Throw away" in the Inventory
  sends it there. Penalties and fixtures never go in.

## Coins, ads, membership

- One coin per focused minute of a completed session; nothing for an
  abandoned one; milestone bonuses.
- Leaving within the first **10 seconds** of a session is free: no record,
  no droop, no penalties.
- **Rewarded ads** (`src/ads/rewardedAds.ts`): a 30-second ad pays 30
  coins; every ad watched within the last three hours multiplies the next
  reward by 0.6 (30, 18, 11, 6, 4, …, floor 2). No ad network is wired yet
  — the bundled provider plays a placeholder countdown and says so.
- **Membership** (`src/membership/membership.ts`, Settings): ₹~~199~~ ₹30
  a month, ad-free. No billing library is wired yet; in development builds
  "Subscribe" activates it locally so the ad-free flow can be tested; in
  production it explains payments are not connected.

## Languages

`src/i18n/`: English (source), French, German, Italian, Spanish, Standard
Arabic (RTL), Mandarin Chinese, Russian. The language screen shows on first
launch and from Settings; `t(key, params)` falls back to English for any
key a table lacks.

## Home

- **My spaces**: the three spaces composited live.
- **Grow plants**: every plant that grows with focus, pictured in place;
  picking one starts the session in that space.
- **Jigsaw pictures**: the library's Heritage / Nature / Wildlife /
  Spirituality collections (`backend/content-packs/india_jigsaw_160`, 160
  real photographs resolved from Wikimedia Commons; see
  `docs/CONTENT_PACKS.md`).

## Code map — `src/spaces/`

| File | |
| --- | --- |
| `packTypes.ts`, `packs/*.generated.ts`, `packs/index.ts` | the rendered packs (v2: per-state layers) |
| `catalog.ts` | the store, artworks, puzzle size, grace, penalty price |
| `model.ts` | a space's state and every rule (placement, surfaces that depend on furniture, growth, penalties, bin, rack, art) |
| `repository.ts`, `useSpaces.ts` | persistence and live subscription; migrates the old balcony state |
| `rewards.ts` | coins, milestones, the ad ledger, membership |
| `focusEngine.ts` | what a completed or abandoned session does |
| `states.ts` | time of day → lighting state; derived states |
| `scene/SpaceScene.tsx` | the layered compositor |
| `ui/SpaceScreen.tsx` | a space's tab; `EditLayer`, `StoreSheet`, `InventorySheet`, `GallerySheet`, `AdSheet` |

## Rendering

```bash
cd tools/balcony-render
python render_space.py --space garden --state morning     # plates + every object, every slot
python render_space.py --space garden --state night
python render_space.py --space room --state morning
python gen_space_pack.py garden                           # crop, feather, preview, thumbs, TS module
python gen_space_pack.py room
python gen_space_pack.py balcony                          # upgrades the balcony's v1 manifest
```

`compose_space.py` composes any state for the "hide all UI" check. A
full state of the garden is about 230 renders; with Cycles persistent data
on it takes roughly 1–2 hours on 4 CPU cores.

## What would gain most from artist or photographic assets

Everything is generated, so the same list as the balcony applies, plus:
the lawn (hair-particle grass is convincing at phone size but a
photographic ground plate would be richer), the garden's tree line, the
bed linen (cloth simulation would drape better than displaced geometry),
and the artworks (any 3:4 photograph drops in). Swap any file in
`assets/<space>/` for a better image of the same size and alignment; the
manifest positions it.
