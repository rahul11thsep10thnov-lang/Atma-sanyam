# Asset system

AI (or the procedural painter) produces *assets*: layer images, character
rigs, masks, depth maps and I2V clips. Our code decides where each asset
appears.

## Tables

| Table | Purpose |
|---|---|
| `Asset` | One logical asset: `kind` (IMAGE, RIG, MASK, DEPTH, VIDEO…), `role`, `reuseKey`, `status`, `isPlaceholder`, current version, storage key/URL, size, links to its Character/Location/Prop reference and to its source asset (for masks and depth) |
| `AssetVersion` | Every generation or replacement: generator, `modelId`, model version, **licence + commercialUse at generation time**, seed, prompt, parameters, duration, GPU worker |
| `ShotLayer` | Links a shot's layer to an asset and records the `reuseDecision` |

## Lifecycle (`AssetLifecycle`)

```
REQUIRED → GENERATING → READY ──(editor approves)──▶ APPROVED
                     ↘ FAILED        READY/APPROVED ──(editor rejects)──▶ REJECTED → regenerated
```

* Generation failures that will be retried keep the asset in `GENERATING`,
  so concurrent planning shares the in-flight asset instead of starting a
  second one. Only the final failure sets `FAILED`.
* **Placeholders.** Procedural output is real, usable art, but it is marked
  `isPlaceholder = true`.
  * Shot QC warns about it.
  * **The publish gate blocks it** until an editor approves the asset
    (`APPROVED`) or replaces it with model output.
  * Approval does not change the pixels, so it does not invalidate renders:
    the package hash excludes the placeholder flag.

## REUSE ▸ MODIFY ▸ GENERATE (`assetLibrary.ts`)

`resolveLayerAsset()` picks one of three paths for every layer:

1. **REUSE** an asset that is READY or APPROVED and has the same reuse key.
   * The model that generated it must still be licence-cleared
     (`isVersionUsable`).
   * For rigs, a *larger* size tier of the same character also counts,
     because scaling down is clean.
   * An asset that is still generating is shared, never duplicated.
2. **MODIFY**: a new pose or expression of a character that already has a
   master image. It is generated with that image as an identity reference.
3. **GENERATE** otherwise.
   * The seed is `seedFor(reuseKey, story seedBase)`, so regenerating
     reproduces the same picture.

Reuse keys:

| Layer | Key |
|---|---|
| background | `loc:<category>:<region>:<time>:v<n>:bg:<style>:<aspect>:h<H>` |
| midground / foreground | `loc:<locKey>:mid:<element>:<style>:h<H>` / `…:fg:<element>:…` |
| character | `char:<characterRefKey>:<style>:<S|M|L>` (image models add `:<pose>:<expression>`) |
| prop | `prop:<propRefKey>:<S|M|L>` |

Size tiers (`continuity.ts`):

| Tier | Heights | Generated at |
|---|---|---|
| S | ≤ 1100 px | 1100 px |
| M | ≤ 2200 px | 2200 px |
| L | larger | 4096 px |

Assets are always generated at the tier's maximum height, so a close-up never
upsamples a thumbnail. Shot QC raises an `asset_resolution` warning if a
layer is still drawn above its source resolution.

## Derived assets

* **Masks** (GENERATE_MASK) come from the segmentation model.
  * They turn an opaque generation into an RGBA cut-out (`image.png` plus `mask.png`).
  * When no segmentation model is available, the procedural alpha/key matte
    is used.
* **Depth** (GENERATE_DEPTH) comes from the depth model.
  * It is stored as a grey PNG, white = near, linked by `sourceAssetId`.
  * When no depth model is available, the procedural layer-depth prior is used.
* **Inpainting** (INPAINT_ASSET; Asset library → Inpaint) fills masked
  regions. The new result becomes a new version of the asset.

## Admin actions (Asset library page / `/admin/production/assets`)

| Action | Who | Effect |
|---|---|---|
| Approve | admin | resolves placeholders; recorded with approver and time |
| Reject (reason) | admin | asset leaves circulation; shots using it get a regenerated asset |
| Regenerate (optional new prompt) | admin | new version from the current default model |
| Replace (upload PNG/JPEG, licence, commercial-use flag) | super admin | new version with `generator = "upload"`; uploads without commercial rights are blocked from production like any uncleared model |
| Inpaint | admin | queue an inpainting job |

Every action is audit-logged.

## Storage layout (S3-compatible or local `storage/`)

```
studio/assets/<assetId>/v<n>/          image.png | rig.json + part PNGs | mask.png | depth.png
studio/stories/<storyId>/shots/<shotId>/package/v<n>/manifest.json
studio/stories/<storyId>/shots/<shotId>/renders/v<n>/shot_NNN.mp4, thumb.png
studio/stories/<storyId>/episodes/<episodeId>/master/v<n>/master_visual.mp4
```
