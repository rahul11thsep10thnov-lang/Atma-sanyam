# Character and location continuity

A character must look the same in shot 1, shot 7 and the follow-up
episode. Locations and props must also stay consistent. Continuity is
carried by **reference rows** and **deterministic keys**, not by hoping a
model reproduces a face.

## References

| Table | Key | Created |
|---|---|---|
| `CharacterReference` | `story:<storyId>:<characterKey>` for named people; `generic:<role>:<gender>:<ageGroup>` for anonymised officials and generic roles (a reusable cast across stories) | PLAN_SHOTS, once per drawable character (never for minors) |
| `LocationReference` | `<category>:<region>:<timeBucket>:v<n>` | PLAN_SHOTS, per shot location |
| `PropReference` | `prop:<propKey>:<style>` | composition planning |

A `CharacterReference` stores the resolved **look**:

* gender, age group, build, skin tone, hair
* outfit and colours, e.g. kurta-pyjama, saree, salwar kameez, police uniform, doctor's coat
* accessories
* occupation, voice code and style key
* a seed derived from the key

`resolveCharacterLook()` (`procedural/characterRig.ts`) derives that look
only from the approved script's role and appearance hints. It never invents
identifying features of real people.

Columns that exist but are **not populated yet**: `masterAssetId`,
`rigAssetId`, `expressionAssets`, `poseAssets` and `referenceImages`. Today
the link from a reference to its pictures is `Asset.characterRefId`
(`locationRefId`, `propRefId`) plus the asset reuse key.

## How a look stays the same

* **Procedural rigs.**
  * One rig per character and size tier: `char:<refKey>:<style>:<S|M|L>`.
  * Every pose (17), expression (15), blink, speech movement and gesture is
    produced at render time from the same parts, so the character cannot
    drift.
  * The rig's parts: pelvis, torso, head, back hair, skirt or kameez,
    upper and lower arms, thighs and shins, and optional phone and bag props.
* **Image models.**
  * Each pose and expression is its own image
    (`…:<pose>:<expression>`).
  * The first image becomes the master. Later variants are generated with
    **MODIFY**, which passes the master image as an identity reference, and
    use the key's deterministic seed.
  * Editors approve or regenerate variants in the Asset library.
* **Locations.**
  * Same category, region and time bucket → same key → the same background
    plate, midground and foreground elements.
  * A railway platform at evening in Bihar is painted once and reused by
    every story set there.
* **Seeds.** `seedFor(reuseKey, story seedBase)` makes regeneration
  reproducible. Changing a story's `styleBible.seedBase` deliberately
  re-rolls its look.

## Safety rules that override continuity

* Minors are never drawn, and no reference is created for them.
* SENSITIVE scenes render the same rig as a **silhouette**: same shape,
  no face.
* RESTRICTED scenes use substitute environments with no people.
* Anonymised officials use the generic cast, never a real person's likeness.
