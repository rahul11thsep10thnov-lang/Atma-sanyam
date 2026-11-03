# Visual Style Guide — extracted from the owner's reference collage

Source of truth: the owner's 40-scene reference collage (6 columns × 7 rows, 40 panels). The collage is a
2D concept image and is **not stored in this repository** (ownership/licence of the image is the owner's to
decide). This guide records what it shows, and what each element would take to reproduce in real time.

Status of the prototype against this guide: **far from the reference** (section 5). Nothing here has been
implemented yet beyond the earlier prototype.

## 1. What the reference shows (by row)

| Rows | Panels | Observed |
|---|---|---|
| 1 | Exterior, interior domes, aerial overview, elevated walkway | **Victorian-style glass houses**: pale-gold/cream wrought-iron ribs, tall arched bays, rounded domes, glazing bars in a fine rectangular grid. Elevated curved walkway with bronze railings and warm lights. Hilltop setting with blue sky. |
| 2 | Grand Banyan (5 panels) | Very wide, flat-topped canopy filling the dome; **dozens of straight, golden-tan columnar aerial roots**, thick buttressed trunk with exposed root flares; circular stone-edged pool with water lilies; lanterns, bench, flower beds; waterfall; sun-rays through leaves. |
| 3 | Waterfalls, lotus, stream, flower borders, flowering trees | Tiered rock waterfalls into clear ponds, large mossy boulders, pink lilies, orange koi, curving paths with dense mixed borders, a pink flowering tree. |
| 4 | Roses, lavender, hydrangea, hibiscus, sunflower, orchid | Mostly **close/macro photography**: large, sharp, individually modelled blooms and leaves, shallow depth of field. |
| 5 | Japanese garden, bamboo, cherry grove, vegetable beds, cactus garden | Red maple + stone lantern + koi pond + tea house; tall bamboo with a stone path; pink cherry canopy over flower beds; timber raised beds; barrel cacti. |
| 6 | Avenue trees, flame tree + jacaranda, olive, orchard, vertical garden, walkway ring | Mature, individually distinct trees; lawn; fruit on trees; living wall on a glass-railed multi-storey structure. |

## 2. Visual characteristics to reproduce

- **Light:** low, warm golden sun from one side, strong rim lighting on leaves, visible sun-rays, cool blue sky through the glass. Bright and fresh, not dark.
- **Palette:** deep and fresh greens, golden-tan roots/bark, warm cream stone, turquoise-green water, saturated-but-natural pink, magenta, red, violet, yellow blooms.
- **Density:** every bed is packed; no bare soil, no visible grid; layered planting (ground cover, shrubs, mid trees, canopy).
- **Materials:** photographic bark with ridges and moss; leaves with veins and translucency; rounded wet rocks with moss; pale paving with joints; glass with reflections of sky and foliage.
- **Architecture:** classic botanical-house ironwork (cream/gold), **not** a geodesic spaceship dome.
- **Camera:** mostly elevated diagonal, some eye-level and macro. Several panels use shallow depth of field.

## 3. What it takes to reproduce each element in real time (phone)

| Element | Needs | Procedural code alone? |
|---|---|---|
| Photographic bark, stone, moss, soil | PBR texture sets (albedo, normal, roughness) | No |
| Leaves with detail and translucency | Leaf photo/alpha textures on many cards, or modelled leaves + normal maps | No (looks plastic) |
| Hero flowers (roses, hibiscus, orchids, hydrangea) | Modelled blooms with petal textures | Only crude |
| Mature, distinct trees | Authored tree models (several variants per species) | Crude silhouettes only |
| Banyan with dozens of golden columns | Authored/sculpted model + bark textures | Prototype has the idea, not the look |
| Victorian glasshouse | Modelled ironwork + glass | Possible, moderate effort |
| Waterfalls | Rock models + animated water shader and particles | Possible, moderate effort |
| Lighting: GI, AO, rays | **Baked** lighting (AO/light maps) + fake rays; real GI is not available on phones | Partly |
| Lush density at 1,000+ plants | Instancing, LOD, impostors | Engineering, yes |

Key point: the reference look comes from **authored art**, and the app's runtime budget on a phone
(roughly 300–500k triangles, a few hundred draw calls — estimate) means that art must be baked and optimised.

## 4. Where real assets could come from

The sandbox I work in blocks asset sites (e.g. Poly Haven, ambientCG), so I could not fetch any. Options for the owner:

1. **Free CC0 libraries** the owner downloads on their own machine: Poly Haven (textures, HDRIs, some models), ambientCG (textures), Quaternius (stylised, not photoreal).
2. **Paid libraries:** Quixel Megascans (free for Unreal users, licence terms apply elsewhere), SpeedTree, Sketchfab store, Turbosquid, Evermotion plant packs, Blender Market.
3. **Commission a 3D environment artist** to model a hero set (banyan, ~12 trees, ~20 flowers, glasshouse kit, rocks) using the reference as the brief.
4. **Reuse the repo's own Blender pipeline** (`tools/balcony-render/render_paradise.py`, which made the 672 existing sprites) to render photoreal *impostors* of the final assets for far distance.

Licence must allow redistribution inside an app. App size must be budgeted (the existing `assets/paradise` is already 45 MB).

## 5. Acceptance test (section 11 of the owner's brief) — current honest answers

| Question | Prototype today |
|---|---|
| Greenhouse architecture equally elegant? | **No.** Gold geodesic dome; the reference is Victorian ironwork. |
| Equally lush and botanically rich? | **No.** Sparse, simple leaves and flowers. |
| Paths and compositions equally beautiful? | **Partly.** Circular path, pond and bridges exist; borders and composition are much simpler. |
| Ponds and waterfalls realistic? | **No.** Pond has reflection; there is no waterfall. |
| Flowering trees vibrant? | **Partly.** Cherry blossom and gulmohar exist; they are crude. |
| Grand Banyan same presence? | **No.** Good scale and roots, but far thinner and untextured. |
| Same warm immersive lighting? | **Partly.** Golden look exists; no rays, no bounce light. |
| Feels like a real botanical paradise? | **No.** It reads as a stylised 3D diorama. |

## 6. Plan to close the gap (not started; needs owner decisions)

1. Decide the asset source (section 4) and licences.
2. Rebuild the glasshouse as a Victorian ironwork kit (modelled, baked AO), replacing the geodesic dome.
3. Introduce real PBR textures for bark, stone, moss, soil, water normals.
4. Build 3–4 hero specimens to the reference standard (Grand Banyan, one flowering tree, one rose bed, one tropical cluster) and test them on real phones **before** producing the rest.
5. Add the missing zones one at a time: Flower Garden, Tropical Garden, Water Garden with waterfall, Japanese Garden, then others.
6. Re-compare against the reference after each step, using the table in section 5.

Per the owner's instruction, none of this proceeds to production until the visual prototype is approved.
