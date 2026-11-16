"""The animation catalogue, authored as data and written to <library>/animations/*.json.

Rotations are degrees, counter-clockwise positive; x/y are rig-canvas pixels with y up; sx/sy are scale
factors. Keys are (time in seconds, value[, easing]). Clips marked additive layer on top of the base clip.
A variant key "@" hands the part back to the current expression.
"""
from __future__ import annotations

import json
from pathlib import Path

BIPED, REPTILE = "biped_chibi", "quadruped_reptile"
BOTH = [BIPED, REPTILE]


def _keys(points):
    return [{"t": p[0], "v": p[1], "ease": p[2] if len(p) > 2 else "ease_in_out"} for p in points]


def clip(code, name, category, rigs, duration, channels=None, *, level=2, loop=False, additive=False, semantics=(),
         start=("*",), end=None, motion=None, arc=0.0, feature=None, prop=False, expression=None, variants=None, required=(),
         description="", blend=0.15):
    return {
        "code": code, "name": name, "category": category, "level": level, "rig_compatibility": rigs, "duration": duration,
        "loop": loop, "additive": additive, "start_states": list(start), "end_state": end,
        "root_motion": {"path": motion or "none", "arc_height": arc, "ease": "ease_in_out" if motion == "arc" else "linear"},
        "requires_feature": feature, "requires_prop": prop, "expression": expression, "blend_in": blend,
        "required_parts": list(required), "description": description,
        "channels": {k: _keys(v) for k, v in (channels or {}).items()},
        "variant_tracks": {k: [{"t": t, "variant": v} for t, v in keys] for k, keys in (variants or {}).items()},
        "metadata": {"semantics": list(semantics)},
    }


def _cycle(a, period):   # there-and-back
    return [(0, -a), (period / 2, a), (period, -a)]


CLIPS = [
    # ------------------------------------------------------------ basic (both rigs)
    clip("blink", "Blink", "basic", BOTH, 0.16, additive=True, variants={"eyes": [(0, "closed"), (0.13, "@")], "pupils": [(0, "none"), (0.13, "@")]},
         description="Eyes close for a moment."),
    clip("breathe", "Breathe", "basic", BOTH, 2.8, {"body.sy": [(0, 1), (1.4, 1.03), (2.8, 1)]}, additive=True, loop=True),
    clip("nod", "Nod", "basic", BOTH, 0.8, {"head.y": [(0, 0), (0.2, -12), (0.4, 0), (0.6, -8), (0.8, 0)]}, additive=True, semantics=["agree"]),
    clip("shake_head", "Shake head", "basic", BOTH, 0.9, {"head.rotation": [(0, 0), (0.2, 9), (0.45, -9), (0.7, 6), (0.9, 0)]},
         additive=True, semantics=["refuse"]),
    clip("turn_head", "Turn head", "basic", BOTH, 1.2, {"head.rotation": [(0, 0), (0.4, 10), (0.9, 10), (1.2, 0)],
                                                         "pupils.x": [(0, 0), (0.3, 10), (0.9, 10), (1.2, 0)]}, additive=True, semantics=["look"]),
    clip("look_left", "Look left", "basic", BOTH, 1.2, {"pupils.x": [(0, 0), (0.25, -11), (0.95, -11), (1.2, 0)]}, additive=True),
    clip("look_right", "Look right", "basic", BOTH, 1.2, {"pupils.x": [(0, 0), (0.25, 11), (0.95, 11), (1.2, 0)]}, additive=True),

    # ------------------------------------------------------------------- biped
    clip("idle", "Idle", "basic", [BIPED], 3.2, {
        "body.sy": [(0, 1), (1.6, 1.025), (3.2, 1)], "head.rotation": [(0, 0), (0.8, 2), (2.4, -2), (3.2, 0)],
        "arm_l.rotation": [(0, 0), (1.6, 4), (3.2, 0)], "arm_r.rotation": [(0, 0), (1.6, -4), (3.2, 0)],
        "tail.rotation": [(0, -6), (1.6, 6), (3.2, -6)]}, loop=True, semantics=["idle", "float"], level=1),
    clip("talk", "Talk", "basic", [BIPED], 1.2, {
        "head.rotation": [(0, 0), (0.3, 3), (0.6, -2), (0.9, 2), (1.2, 0)], "head.y": [(0, 0), (0.15, 4), (0.3, 0), (0.75, 3), (0.9, 0), (1.2, 0)],
        "arm_r.rotation": [(0, 0), (0.4, 32), (0.8, 18), (1.2, 0)]}, loop=True, additive=True, semantics=["talk"]),
    clip("walk", "Walk", "locomotion", [BIPED], 0.6, {
        "leg_l.rotation": _cycle(26, 0.6), "leg_r.rotation": _cycle(-26, 0.6), "arm_l.rotation": _cycle(-20, 0.6), "arm_r.rotation": _cycle(20, 0.6),
        "body.y": [(0, 0), (0.15, 9), (0.3, 0), (0.45, 9), (0.6, 0)], "head.rotation": _cycle(2, 0.6), "tail.rotation": _cycle(8, 0.6)},
        loop=True, motion="linear", semantics=["walk"], start=("standing",), level=3),
    clip("run", "Run", "locomotion", [BIPED], 0.36, {
        "leg_l.rotation": _cycle(44, 0.36), "leg_r.rotation": _cycle(-44, 0.36), "arm_l.rotation": _cycle(-50, 0.36), "arm_r.rotation": _cycle(50, 0.36),
        "body.y": [(0, 0), (0.09, 18), (0.18, 0), (0.27, 18), (0.36, 0)], "body.rotation": [(0, -6), (0.36, -6)], "tail.rotation": _cycle(12, 0.36)},
        loop=True, motion="linear", semantics=["run"], start=("standing",), level=3),
    clip("jump", "Jump", "locomotion", [BIPED], 1.0, {
        "body.sy": [(0, 1), (0.16, 0.86), (0.3, 1.08), (0.8, 1.0), (0.9, 0.9), (1.0, 1)],
        "arm_l.rotation": [(0, 0), (0.16, 20), (0.35, -150), (0.8, -110), (1.0, 0)],
        "arm_r.rotation": [(0, 0), (0.16, -20), (0.35, 150), (0.8, 110), (1.0, 0)],
        "leg_l.rotation": [(0, 0), (0.3, -30), (0.8, -18), (1.0, 0)], "leg_r.rotation": [(0, 0), (0.3, 30), (0.8, 18), (1.0, 0)],
        "tail.rotation": [(0, 0), (0.4, -28), (1.0, 0)]}, motion="arc", arc=230, semantics=["jump"], level=3),
    clip("climb", "Climb", "locomotion", [BIPED], 0.8, {
        "arm_l.rotation": [(0, -160), (0.4, -100), (0.8, -160)], "arm_r.rotation": [(0, 100), (0.4, 160), (0.8, 100)],
        "leg_l.rotation": [(0, -30), (0.4, 10), (0.8, -30)], "leg_r.rotation": [(0, -10), (0.4, 30), (0.8, -10)],
        "body.rotation": [(0, -4), (0.4, 4), (0.8, -4)]}, loop=True, motion="linear", semantics=["climb"], level=3),
    clip("sit", "Sit down", "locomotion", [BIPED], 0.6, {
        "root.y": [(0, 0), (0.6, -66)], "leg_l.rotation": [(0, 0), (0.6, -68)], "leg_r.rotation": [(0, 0), (0.6, 68)],
        "body.sy": [(0, 1), (0.45, 0.94), (0.6, 1)]}, semantics=["sit", "sleep"], start=("standing",), end="sitting"),
    clip("stand", "Stand up", "locomotion", [BIPED], 0.6, {
        "root.y": [(0, 0), (0.6, 66)], "leg_l.rotation": [(0, 0), (0.6, 68)], "leg_r.rotation": [(0, 0), (0.6, -68)]},
        semantics=["stand"], start=("sitting",), end="standing"),
    clip("fall", "Fall", "locomotion", [BIPED], 0.9, {
        "body.rotation": [(0, 0), (0.5, -24, "ease_in"), (0.9, 0, "bounce")], "arm_l.rotation": [(0, 0), (0.3, -150), (0.9, -20)],
        "arm_r.rotation": [(0, 0), (0.3, 150), (0.9, 20)], "leg_l.rotation": [(0, 0), (0.4, -40), (0.9, 0)],
        "leg_r.rotation": [(0, 0), (0.4, 40), (0.9, 0)]}, motion="arc", arc=60, semantics=["fall"], expression="surprised", level=3),
    clip("swim", "Swim", "locomotion", [BIPED], 0.9, {
        "body.rotation": [(0, -18), (0.9, -18)], "arm_l.rotation": [(0, -150), (0.45, -30), (0.9, -150)],
        "arm_r.rotation": [(0, 30), (0.45, 150), (0.9, 30)], "leg_l.rotation": _cycle(20, 0.9), "leg_r.rotation": _cycle(-20, 0.9)},
        loop=True, motion="linear", feature="water", semantics=["swim"], level=3),
    clip("fly", "Fly", "locomotion", [BIPED], 0.5, {
        "arm_l.rotation": [(0, -60), (0.25, -130), (0.5, -60)], "arm_r.rotation": [(0, 60), (0.25, 130), (0.5, 60)],
        "body.y": [(0, 0), (0.25, 14), (0.5, 0)]}, loop=True, motion="linear", semantics=["fly"], end="in_air", level=3),
    clip("pick_up", "Pick up", "interaction", [BIPED], 1.0, {
        "body.rotation": [(0, 0), (0.4, -20), (0.6, -20), (1.0, 0)], "arm_r.rotation": [(0, 0), (0.4, -30), (0.6, -30), (1.0, 0)],
        "head.rotation": [(0, 0), (0.4, -8), (1.0, 0)]}, semantics=["pick_up"]),
    clip("put_down", "Put down", "interaction", [BIPED], 1.0, {
        "body.rotation": [(0, 0), (0.5, -18), (1.0, 0)], "arm_r.rotation": [(0, -40), (0.5, -20), (1.0, 0)]}, semantics=["put_down"]),
    clip("give", "Give", "interaction", [BIPED], 1.2, {
        "arm_r.rotation": [(0, 0), (0.4, 80), (0.8, 80), (1.2, 0)], "body.rotation": [(0, 0), (0.4, -5), (0.8, -5), (1.2, 0)]},
        semantics=["give"], prop=True),
    clip("receive", "Receive", "interaction", [BIPED], 1.2, {
        "arm_l.rotation": [(0, 0), (0.4, -70), (0.8, -70), (1.2, 0)], "arm_r.rotation": [(0, 0), (0.4, 70), (0.8, 70), (1.2, 0)]}, semantics=["receive"]),
    clip("eat", "Eat", "interaction", [BIPED], 1.0, {
        "arm_r.rotation": [(0, 0), (0.25, -128), (0.75, -128), (1.0, 0)], "head.rotation": [(0, 0), (0.3, 4), (0.5, -2), (0.7, 4), (1.0, 0)],
        "head.y": [(0, 0), (0.4, -5), (0.5, 0), (0.6, -5), (0.7, 0), (1.0, 0)]},
        variants={"mouth": [(0, "@"), (0.25, "open"), (0.4, "closed"), (0.5, "small"), (0.6, "closed"), (0.7, "small"), (0.8, "closed"), (0.95, "@")]},
        semantics=["eat"]),
    clip("drink", "Drink", "interaction", [BIPED], 1.5, {
        "arm_r.rotation": [(0, 0), (0.4, -122), (1.1, -122), (1.5, 0)], "head.rotation": [(0, 0), (0.5, 9), (1.1, 9), (1.5, 0)]},
        variants={"mouth": [(0, "@"), (0.4, "small"), (1.1, "@")]}, semantics=["drink"]),
    clip("throw", "Throw", "interaction", [BIPED], 1.2, {
        "arm_r.rotation": [(0, 0), (0.35, 165), (0.55, 60, "ease_in"), (0.8, 40), (1.2, 0)],
        "body.rotation": [(0, 0), (0.35, 7), (0.55, -8), (1.2, 0)]}, semantics=["throw"], prop=True),
    clip("catch", "Catch", "interaction", [BIPED], 0.9, {
        "arm_l.rotation": [(0, 0), (0.3, -120), (0.6, -90), (0.9, 0)], "arm_r.rotation": [(0, 0), (0.3, 120), (0.6, 90), (0.9, 0)],
        "body.sy": [(0, 1), (0.3, 1.04), (0.9, 1)]}, semantics=["catch"]),
    clip("point", "Point", "interaction", [BIPED], 1.2, {"arm_r.rotation": [(0, 0), (0.3, 96), (0.9, 96), (1.2, 0)]}, semantics=["point"]),
    clip("wave", "Wave", "interaction", [BIPED], 1.4, {
        "arm_r.rotation": [(0, 0), (0.25, 150), (0.5, 122), (0.75, 150), (1.0, 122), (1.4, 0)]}, semantics=["wave", "greet"]),
    clip("happy_reaction", "Happy reaction", "emotional", [BIPED], 1.2, {
        "root.y": [(0, 0), (0.25, 60), (0.5, 0, "ease_in"), (0.75, 36), (1.0, 0, "ease_in"), (1.2, 0)],
        "arm_l.rotation": [(0, 0), (0.25, -150), (1.0, -150), (1.2, 0)], "arm_r.rotation": [(0, 0), (0.25, 150), (1.0, 150), (1.2, 0)],
        "tail.rotation": [(0, 0), (0.3, 14), (0.6, -14), (0.9, 14), (1.2, 0)]}, semantics=["laugh", "happy_reaction"], expression="laughing"),
    clip("surprise_reaction", "Surprise reaction", "emotional", [BIPED], 0.9, {
        "body.sy": [(0, 1), (0.15, 1.1, "overshoot"), (0.9, 1)], "head.y": [(0, 0), (0.15, 16, "overshoot"), (0.9, 0)],
        "arm_l.rotation": [(0, 0), (0.15, -60), (0.9, 0)], "arm_r.rotation": [(0, 0), (0.15, 60), (0.9, 0)]},
        semantics=["surprise_reaction"], expression="surprised"),
    clip("fear_reaction", "Fear reaction", "emotional", [BIPED], 1.2, {
        "body.x": [(i * 0.075, (5 if i % 2 else -5)) for i in range(17)], "body.sy": [(0, 1), (0.2, 0.94), (1.0, 0.94), (1.2, 1)],
        "arm_l.rotation": [(0, 0), (0.2, 40), (1.0, 40), (1.2, 0)], "arm_r.rotation": [(0, 0), (0.2, -40), (1.0, -40), (1.2, 0)]},
        semantics=["fear_reaction"], expression="worried"),
    clip("anger_reaction", "Anger reaction", "emotional", [BIPED], 1.0, {
        "leg_r.rotation": [(0, 0), (0.2, 36), (0.32, 0, "ease_in"), (0.55, 36), (0.67, 0, "ease_in"), (1.0, 0)],
        "arm_l.rotation": [(0, 0), (0.2, -34), (0.8, -34), (1.0, 0)], "arm_r.rotation": [(0, 0), (0.2, 34), (0.8, 34), (1.0, 0)],
        "head.y": [(0, 0), (0.2, -8), (0.8, -8), (1.0, 0)]}, semantics=["anger_reaction"], expression="angry"),
    clip("sad_reaction", "Sad reaction", "emotional", [BIPED], 1.4, {
        "head.y": [(0, 0), (0.5, -16), (1.1, -16), (1.4, 0)], "head.rotation": [(0, 0), (0.5, -6), (1.1, -6), (1.4, 0)],
        "body.sy": [(0, 1), (0.5, 0.95), (1.1, 0.95), (1.4, 1)], "arm_l.rotation": [(0, 0), (0.5, 8), (1.4, 0)],
        "arm_r.rotation": [(0, 0), (0.5, -8), (1.4, 0)]}, semantics=["cry", "sad_reaction"], expression="sad"),
    clip("relief_reaction", "Relief reaction", "emotional", [BIPED], 1.2, {
        "body.sy": [(0, 1), (0.3, 1.06), (0.9, 0.95), (1.2, 1)], "head.rotation": [(0, 0), (0.9, 6), (1.2, 0)],
        "arm_r.rotation": [(0, 0), (0.4, -100), (0.8, -100), (1.2, 0)]}, semantics=["relief_reaction"], expression="happy"),
    clip("monkey_tail_swing", "Tail swing", "animal", [BIPED], 1.4, {"tail.rotation": [(0, -16), (0.7, 16), (1.4, -16)]},
         loop=True, additive=True, required=["tail"], semantics=["tail_swing"]),
    clip("monkey_branch_jump", "Branch jump", "animal", [BIPED], 1.1, {
        "body.sy": [(0, 1), (0.14, 0.84), (0.3, 1.1), (0.9, 1.0), (1.0, 0.92), (1.1, 1)],
        "arm_l.rotation": [(0, 0), (0.3, -165), (0.9, -140), (1.1, 0)], "arm_r.rotation": [(0, 0), (0.3, 165), (0.9, 140), (1.1, 0)],
        "leg_l.rotation": [(0, 0), (0.3, -46), (0.9, -30), (1.1, 0)], "leg_r.rotation": [(0, 0), (0.3, 46), (0.9, 30), (1.1, 0)],
        "tail.rotation": [(0, 0), (0.4, -40), (0.9, 20), (1.1, 0)]}, motion="arc", arc=300, required=["tail"],
        semantics=["branch_jump"], level=3),
    clip("monkey_branch_climb", "Branch climb", "animal", [BIPED], 0.7, {
        "arm_l.rotation": [(0, -170), (0.35, -110), (0.7, -170)], "arm_r.rotation": [(0, 110), (0.35, 170), (0.7, 110)],
        "leg_l.rotation": [(0, -36), (0.35, 6), (0.7, -36)], "leg_r.rotation": [(0, -6), (0.35, 36), (0.7, -6)],
        "tail.rotation": [(0, -20), (0.35, 20), (0.7, -20)]}, loop=True, motion="linear", required=["tail"], semantics=["branch_climb"], level=3),

    # ----------------------------------------------------------------- reptile
    clip("crocodile_idle", "Crocodile idle", "animal", [REPTILE], 3.0, {
        "body.sy": [(0, 1), (1.5, 1.03), (3.0, 1)], "head.rotation": [(0, 0), (1.5, 2.5), (3.0, 0)], "tail.rotation": [(0, -5), (1.5, 5), (3.0, -5)]},
        loop=True, semantics=["idle"], start=("standing",), level=1),
    clip("crocodile_float", "Crocodile float", "animal", [REPTILE], 2.6, {
        "root.y": [(0, -5), (1.3, 5), (2.6, -5)], "body.rotation": [(0, -1.2), (1.3, 1.2), (2.6, -1.2)],
        "tail.rotation": [(0, -9), (1.3, 9), (2.6, -9)], "head.rotation": [(0, 1), (1.3, -1), (2.6, 1)]},
        loop=True, semantics=["float"], start=("in_water",), level=1),
    clip("crocodile_swim", "Crocodile swim", "animal", [REPTILE], 1.0, {
        "tail.rotation": [(0, -22), (0.5, 22), (1.0, -22)], "body.rotation": [(0, -3), (0.5, 3), (1.0, -3)],
        "root.y": [(0, -4), (0.5, 4), (1.0, -4)], "leg_fl.rotation": _cycle(24, 1.0), "leg_fr.rotation": _cycle(-24, 1.0),
        "leg_bl.rotation": _cycle(-24, 1.0), "leg_br.rotation": _cycle(24, 1.0), "head.rotation": [(0, 2), (0.5, -2), (1.0, 2)]},
        loop=True, motion="linear", feature="water", semantics=["swim"], start=("in_water",), level=3),
    clip("crocodile_walk", "Crocodile walk", "animal", [REPTILE], 0.8, {
        "leg_fl.rotation": _cycle(22, 0.8), "leg_br.rotation": _cycle(22, 0.8), "leg_fr.rotation": _cycle(-22, 0.8), "leg_bl.rotation": _cycle(-22, 0.8),
        "body.y": [(0, 0), (0.2, 5), (0.4, 0), (0.6, 5), (0.8, 0)], "tail.rotation": _cycle(10, 0.8)},
        loop=True, motion="linear", semantics=["walk", "run"], start=("standing",), level=3),
    clip("crocodile_jaw_open", "Jaw open", "animal", [REPTILE], 1.0, {
        "jaw.rotation": [(0, 0), (0.2, -26), (0.4, -2, "ease_in"), (0.6, -20), (0.8, -2, "ease_in"), (1.0, 0)],
        "head.rotation": [(0, 0), (0.2, 7), (0.4, 0), (0.6, 5), (1.0, 0)]}, semantics=["eat", "drink", "jaw_open"]),
    clip("crocodile_tail_swing", "Tail swing", "animal", [REPTILE], 1.2, {"tail.rotation": [(0, -18), (0.6, 18), (1.2, -18)]},
         loop=True, additive=True, semantics=["tail_swing"]),
    clip("crocodile_talk", "Crocodile talk", "animal", [REPTILE], 1.2, {
        "head.rotation": [(0, 0), (0.3, 3), (0.6, -1), (0.9, 2), (1.2, 0)], "tail.rotation": [(0, 0), (0.6, 5), (1.2, 0)]},
        loop=True, additive=True, semantics=["talk"]),
    clip("crocodile_laugh", "Crocodile laugh", "animal", [REPTILE], 1.2, {
        "head.rotation": [(0, 0), (0.2, 9), (1.0, 9), (1.2, 0)], "jaw.rotation": [(0, 0), (0.2, -18), (0.4, -8), (0.6, -18), (0.8, -8), (1.0, -18), (1.2, 0)],
        "root.y": [(0, 0), (0.3, 10), (0.6, 0), (0.9, 10), (1.2, 0)], "tail.rotation": [(0, 0), (0.3, 16), (0.6, -16), (0.9, 16), (1.2, 0)]},
        semantics=["laugh", "happy_reaction"], expression="laughing"),
    clip("crocodile_droop", "Crocodile droop", "animal", [REPTILE], 1.4, {
        "head.rotation": [(0, 0), (0.5, -10), (1.1, -10), (1.4, 0)], "tail.rotation": [(0, 0), (0.5, -12), (1.1, -12), (1.4, 0)],
        "body.sy": [(0, 1), (0.5, 0.95), (1.1, 0.95), (1.4, 1)]}, semantics=["cry", "sad_reaction"], expression="sad"),
    clip("crocodile_startle", "Crocodile startle", "animal", [REPTILE], 0.9, {
        "root.y": [(0, 0), (0.15, 26, "ease_out"), (0.45, 0, "bounce"), (0.9, 0)], "head.rotation": [(0, 0), (0.15, 12), (0.9, 0)],
        "jaw.rotation": [(0, 0), (0.15, -16), (0.9, 0)], "tail.rotation": [(0, 0), (0.15, 20), (0.9, 0)]},
        semantics=["surprise_reaction", "fear_reaction"], expression="surprised"),
    clip("crocodile_snap", "Crocodile snap", "animal", [REPTILE], 1.0, {
        "jaw.rotation": [(0, 0), (0.25, -28), (0.35, 0, "ease_in"), (0.6, -28), (0.7, 0, "ease_in"), (1.0, 0)],
        "body.x": [(0, 0), (0.3, 14), (0.5, 0), (0.65, 14), (1.0, 0)]}, semantics=["anger_reaction"], expression="angry"),
]


def write_animations(library_root: Path) -> int:
    out = Path(library_root) / "animations"
    out.mkdir(parents=True, exist_ok=True)
    for c in CLIPS:
        (out / f"{c['code']}.json").write_text(json.dumps(c, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    return len(CLIPS)
