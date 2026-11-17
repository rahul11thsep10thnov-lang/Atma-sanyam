# Story Definition Format (SDF) 1.0

A story is one JSON document. It names assets, animations and timings; it never contains code.
The authoritative definition is `engine/schema/story.py` (Pydantic); `story_json_schema()` returns the JSON Schema.
Unknown fields are rejected everywhere.

## Document

| Field | Type | Default | Notes |
|---|---|---|---|
| `schema_version` | string | `"1.0"` | major version must be 1 |
| `story_id` | id | required | `[a-z0-9][a-z0-9_-]{0,63}` (all ids use this pattern) |
| `title`, `language`, `genre`, `moral`, `visual_style` | string | | `language` such as `hi-IN` |
| `output` | `{width, height, fps}` | 1920, 1080, 24 | |
| `audio` | `{narrator_voice, music: {track_id, volume, duck_under_speech}}` | narrator `narrator_hi` | |
| `characters` | list of `{character_id, asset_version, voice_id?, role?}` | | every character used must be declared here |
| `scenes` | list of Scene | at least one | |
| `metadata` | object | | free-form, not interpreted |

## Scene

`scene_id`, `title`, `description`, `environment_id`, `environment_version`, `time_of_day` (`day`, `morning`, `sunset`,
`night`, `overcast`), `weather` (`clear`, `windy`, `rain`), `depends_on` (ids of earlier scenes), `transition_in` /
`transition_out` (`{type: cut|fade, duration_seconds}`), `approval_status` (`pending`, `approved`, `rejected`),
`duration_seconds` (optional; must equal the sum of its shots), `shots`.

## Shot

| Field | Meaning |
|---|---|
| `shot_id`, `duration_seconds`, `description` | duration should be a whole number of frames |
| `animation_level` | 1 motion-comic, 2 cutout, 3 action; informational |
| `camera` | `{preset, target?, params, keyframes[]}`; keyframes `{t, x, y, zoom, easing}` override the preset |
| `characters` | placements: `{character_id, position, facing, scale, state, expression, pose?, visible, order, attach_to?}` |
| `props` | `{prop_id, instance_id?, position, scale, rotation, held_by?, visible_from, visible_until?}` |
| `actions` | scheduled animations, may nest (`children` start relative to the parent) |
| `dialogue` | `{line_id, speaker, text, emotion, start_seconds?, voice_id?}`; speaker `narrator` is narration |
| `effects` | `{effect_id, type, start_seconds, duration_seconds, position?, follow_character?, params}` |
| `audio` | cues `{cue_id, type: sfx|ambience|music, asset_id, start_seconds, duration_seconds?, volume, loop}` |

**Position**: `{anchor}` (a named place of the environment), `{x, y}` in stage pixels (1920×1080, y up), or an anchor
plus `offset`. **Attachment** (`attach_to`, `held_by`): `{character_id, part, offset}` where `part` is an attach point of
that character's rig (for example `back`, `hand`, `mouth`).

**Action**: `{action_id, character_id, animation, start_seconds, duration_seconds?, loop?, move_to?, target_character?,
prop_id?, expression?, facing?, params, children}`. `move_to` makes the character travel while the clip plays.
`target_character` with `params.attach_part` lands the character on another one and keeps it attached.
`prop_id` with `target_character` sends a held prop to the target (throw, give).

## Validation

1. **Shape** (types, ranges, ids, no extra fields).
2. **References and timing inside the document**: unique ids; characters declared; speakers known; actions, lines,
   effects, cues and camera keyframes inside their shot; scene dependencies point backwards; transitions fit.
3. **Against the asset library** (composition, `engine/composition/composer.py`): assets and versions exist and are
   intact; anchors, expressions, poses, attach points, effects and camera presets exist; each clip fits the character's
   rig; state transitions are legal; clips of one character do not overlap; a clip's environment needs are met.

Errors carry a path and a sentence, for example
`scenes[1](scene_02).shots[0](sc02_sh01).action(a1): character 'ghost_001' is not placed in this shot`.

## Example

See `stories/panchatantra/monkey_and_crocodile.json` (generated from the Hindi text, then re-timed to its audio).
