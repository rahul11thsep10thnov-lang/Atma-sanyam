# Animation clip format

A clip is a JSON file in `asset_library/animations/` validated by `engine/schema/animation.py`. Clips target rig
templates, never individual characters.

| Field | Meaning |
|---|---|
| `code`, `name`, `category`, `level`, `version`, `description` | category: basic, locomotion, interaction, emotional, animal |
| `rig_compatibility` | rig templates the clip can drive |
| `required_parts` | parts that must exist (for example `tail`) |
| `duration`, `loop` | seconds; a looping clip repeats for as long as its action lasts |
| `additive` | layered on top of the base clip (blink, nod, tail swing) instead of replacing it |
| `start_states`, `end_state` | states it may start from (`*` = any) and the state it leaves the character in |
| `root_motion` | `{path: none|linear|arc, arc_height, ease}`: how the character travels when the action has `move_to` |
| `requires_feature` | anchor feature the character must be at (for example `water`) |
| `requires_prop`, `max_speed`, `expression`, `blend_in` | constraints and defaults |
| `channels` | `"<part>.<property>"` → keyframes `{t, v, ease}`; properties `rotation` (degrees, anticlockwise), `x`, `y`, `sx`, `sy` |
| `variant_tracks` | part → `{t, variant}`; `@` returns the part to the current expression |
| `metadata.semantics` | meanings the storyboard builder can ask for (`swim`, `eat`, `idle`, …) |

Easing: `linear`, `ease_in`, `ease_out`, `ease_in_out`, `step`, `bounce`, `overshoot`.

## How a pose is built each frame

state pose → idle (or the active clip, cross-faded) → additive clips → expression → clip image overrides → blink →
talk (mouth shape or jaw angle from the loudness of the character's own audio).

## Rules enforced before rendering

- The character's rig template must be in `rig_compatibility`, and the rig must have every driven part
  (parts a template lists as optional are skipped).
- `start_states` must include the character's state: walking while seated is an `incompatible_transition`.
- Two non-additive clips of one character may not overlap (`timeline_conflict`).
- `requires_feature` must be satisfied where the character is or is going (`constraint_violation`).

## Catalogue

48 clips ship with the library, including every clip in the specification (idle, blink, breathe, look_left/right,
turn_head, nod, shake_head; walk, run, jump, climb, sit, stand, fall, swim, fly; pick_up, put_down, give, receive, eat,
drink, throw, catch, point, wave; the six reactions; monkey_tail_swing, monkey_branch_jump, monkey_branch_climb,
crocodile_swim, crocodile_jaw_open, crocodile_tail_swing) plus `talk` and the crocodile's own idle, float, walk, talk
and reactions. `GET /api/v1/animations?rig=<template>` lists what a rig can play.
