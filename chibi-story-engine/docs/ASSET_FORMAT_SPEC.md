# Asset format

## Library layout

```
asset_library/
  characters/<id>/metadata.json, rig/, references/, views/, expressions/, poses/, versions/vN/
  environments/<id>/metadata.json, layers/
  props/<id>/, effects/<id>/, music/<id>/, sound_effects/<id>/, backgrounds/
  animations/<code>.json          clip catalogue (shared by every character of a rig template)
  rig_templates/<id>.json
  voices/voices.json, pronunciation.json
```

Ids are permanent and never derived from display names (`monkey_001`). The current version of an asset lives in its
folder; every earlier version is a complete snapshot under `versions/vN/` and is never modified.

## Manifest (`metadata.json`), all asset types

| Field | Meaning |
|---|---|
| `id`, `asset_type`, `name`, `description` | type: character, environment, prop, effect, music, sound_effect |
| `version`, `change_summary`, `created_at` | version starts at 1 and only grows |
| `aliases`, `tags` | names in any language and keywords used for matching |
| `licence` | `{name, author, source, notes}` |
| `approval_status` | `pending`, `approved`, `rejected`; any new version returns to `pending` |
| `compatibility` | free-form hints (`habitat`, `stage_scale`, `ambience`, …) |
| `files[]` | `{role, path, format, checksum (sha256), width, height, duration_seconds, view, expression, pose}` |

Every file a manifest refers to must be listed in `files` with its checksum. `AssetLibrary.verify()` reports missing,
changed and unregistered files.

## Character

Adds `species`, `visual_identity`, `continuity_rules`, `default_voice`, `states`, `rig`, `expressions`, `poses`.

`rig`: `template`, `canvas`, `ground` (the canvas point that stands on the stage position), `parts[]`, `attach_points`,
and how it talks (`talk_mode` `variants` with `talk_variants`, or `jaw` with `jaw_part` and `jaw_open_degrees`).
A part: `{id, component, parent, pivot, order, variants: {name: {file, origin, size}}, default_variant, rotation_limits}`.
The variant name `none` hides a part.

Templates (`rig_templates/`) say which parts realise the standard components (root, body, head, eyes, eyebrows, mouth,
left/right arm, left/right leg, tail where applicable). Shipped: `biped_chibi`, `quadruped_reptile`.

`expressions`: the nine facial poses (neutral, happy, sad, surprised, angry, worried, thinking, laughing, speaking),
each `{variants: {part: variant}, parts: {part: {rotation, x, y, sx, sy}}}`. `poses`: named body poses; a pose named
after a state (`sitting`, `in_water`) is applied while the character is in that state.

## Environment

`stage`, `camera_bounds` (the painted world on the stage plane), `layers[]`, `anchors`, `lighting_presets`,
`default_anchor_by_role` (habitat → anchors).

Layer: `{id, type (background|far|middle|foreground|effects|prop), file, rect [x, y, w, h], parallax, order, cover,
cover_horizontal, motion[], tint_group}`. `parallax` < 1 is far away, > 1 is in front of the stage. Characters draw at
order 100 by default, so a layer with a higher order (the front of a river, the near wall of a well) covers them.
Motion: `sway` (rotation about a pivot, scaled by wind), `scroll` (endless horizontal slide of a tiling image),
`bob`, `drift`.

Anchor: `{x, y, order, scale, features[]}`. Features are what staging and clips look for: `ground`, `water`, `tree`,
`seat`, `offstage`, `pit`, or a place name such as `well_side`.

## Prop, effect, audio

- Prop: `file`, `size` (stage pixels), `pivot`.
- Effect: `sprites` (name → file). Behaviour lives in `engine/composition/effects.py`.
- Music / sound effect: `file` (WAV), `duration_seconds`, `sample_rate`, `loopable`.

## Adding assets

- Programmatically: `AssetLibrary.register(...)`, `.update(...)`; characters through `CharacterRegistry.create(...)`,
  which refuses rigs with missing components.
- Through the API: `POST /api/v1/assets` (prop image or WAV), `POST /api/v1/characters` (new character from an existing rig).
- The shipped library is drawn by `python -m tools.asset_forge.build`.
