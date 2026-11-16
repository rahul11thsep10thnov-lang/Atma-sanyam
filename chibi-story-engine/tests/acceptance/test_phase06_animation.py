"""Phase 6 acceptance: a reusable animation library with states, transitions and constraints."""
from __future__ import annotations

import numpy as np
import pytest

from engine.animation.player import Catalogue, check_transition, clip_time, sample
from engine.common.errors import TransitionError, ValidationFailed
from engine.rendering import ffmpeg
from engine.rendering.service import RenderSettings
from tests.support import CROC_IN_RIVER, MONKEY_ON_BANK, MONKEY_ON_BRANCH, frame_difference, scene, shot, story

SPEC_CLIPS = [
    "idle", "blink", "breathe", "look_left", "look_right", "turn_head", "nod", "shake_head",
    "walk", "run", "jump", "climb", "sit", "stand", "fall", "swim", "fly",
    "pick_up", "put_down", "give", "receive", "eat", "drink", "throw", "catch", "point", "wave",
    "happy_reaction", "surprise_reaction", "fear_reaction", "anger_reaction", "sad_reaction", "relief_reaction",
    "monkey_tail_swing", "monkey_branch_jump", "monkey_branch_climb", "crocodile_swim", "crocodile_jaw_open", "crocodile_tail_swing",
]


@pytest.fixture(scope="module")
def catalogue(library):
    return Catalogue(library.animations())


def _act(aid, cid, animation, start=0.0, duration=None, **extra):
    return {"action_id": aid, "character_id": cid, "animation": animation, "start_seconds": start, "duration_seconds": duration, **extra}


def _compose(composer, actions, characters=None, seconds=3.0, strict=True, dialogue=None):
    st = story([scene("anim", [shot(seconds=seconds, characters=characters, actions=actions, dialogue=dialogue)])], story_id="phase06")
    return composer.compose(st, "anim", strict=strict)


def _track(plan, prefix):
    return [s for s in plan.shots[0].sprites if s.id.startswith(prefix)]


def test_registry_has_every_specified_animation(catalogue):
    assert set(SPEC_CLIPS) <= set(catalogue.clips)
    for clip in catalogue.clips.values():                     # each clip declares what the specification asks for
        assert clip.rig_compatibility and clip.duration > 0 and clip.start_states
        assert clip.root_motion.path in ("none", "linear", "arc") and isinstance(clip.loop, bool)
        assert clip.channels or clip.variant_tracks
        for keys in clip.channels.values():
            assert keys[0].t >= 0 and keys[-1].t <= clip.duration + 1e-6
    assert catalogue.get("crocodile_swim").rig_compatibility == ["quadruped_reptile"]
    assert catalogue.get("crocodile_swim").requires_feature == "water"
    assert catalogue.get("sit").end_state == "sitting" and catalogue.get("stand").start_states == ["sitting"]
    assert catalogue.for_semantic("swim", "quadruped_reptile").code == "crocodile_swim"
    assert catalogue.for_semantic("swim", "biped_chibi").code == "swim"
    assert catalogue.for_semantic("jump", "quadruped_reptile") is None     # not every character can do everything


def test_1_idle_plays_and_loops(catalogue, composer):
    idle = catalogue.get("idle")
    a, b = sample(idle, 0.0), sample(idle, idle.duration / 2)
    assert b.parts["body"].sy > a.parts["body"].sy                    # breathing
    assert clip_time(idle, idle.duration + 0.4, 10) == pytest.approx(0.4)
    plan, issues = _compose(composer, [])                             # no actions at all: characters still live
    assert not issues
    body = plan.shots[0].sprite("char.monkey_001.body.base")
    assert np.ptp(body.affine[:, 3]) > 0.5


def test_2_walk_moves_the_character(composer):
    walk = _act("w", "monkey_001", "walk", 0.2, 2.0, move_to={"x": 900, "y": 300}, loop=True)
    plan, issues = _compose(composer, [walk], [MONKEY_ON_BANK])
    assert not issues
    body = plan.shots[0].sprite("char.monkey_001.body.base")
    xs = body.affine[:, 4]
    assert xs[0] == pytest.approx(xs[4]) and xs[-1] - xs[0] == pytest.approx(900 - 560, abs=3)   # waits, then arrives
    assert np.all(np.diff(xs[6:50]) > 0)                              # steady travel
    leg = plan.shots[0].sprite("char.monkey_001.leg_l.base")
    swing = np.degrees(np.arctan2(leg.affine[:, 1], leg.affine[:, 0]))
    assert swing[8:50].max() > 15 and swing[8:50].min() < -15         # legs swing both ways while walking
    assert abs(swing[-1]) < 3                                         # and come to rest afterwards


def test_3_jump_follows_an_arc(composer):
    jump = _act("j", "monkey_001", "jump", 0.5, 1.0, move_to={"anchor": "tree_branch"})
    plan, issues = _compose(composer, [jump], [MONKEY_ON_BANK])
    assert not issues
    body = plan.shots[0].sprite("char.monkey_001.body.base")
    ys = body.affine[:, 5]
    start, end = ys[10], ys[-1]
    assert ys[12:36].max() > max(start, end) + 120                    # rises above both ends
    assert end - start == pytest.approx(512 - 300, abs=75)            # lands on the branch (sitting pose lowers it a little)


def test_4_eat_brings_food_to_the_mouth(composer):
    prop = {"prop_id": "jamun_bunch_001", "instance_id": "fruit", "position": {"anchor": "tree_branch"},
            "held_by": {"character_id": "monkey_001", "part": "mouth"}}
    eat = _act("e", "monkey_001", "eat", 0.2, 2.0, prop_id="fruit")
    st = story([scene("anim", [shot(seconds=3.0, actions=[eat], props=[prop])])], story_id="phase06")
    plan, issues = composer.compose(st, "anim")
    assert not issues
    mouths = {s.id.rsplit(".", 1)[1] for s in _track(plan, "char.monkey_001.mouth.") if s.opacity[5:50].any()}
    assert {"open", "closed"} <= mouths                               # chewing
    fruit = plan.shots[0].sprite("prop.fruit")
    head = plan.shots[0].sprite("char.monkey_001.head.base")
    hx0, hy0, hx1, hy1 = head.bounds(20)
    fx0, fy0, fx1, fy1 = fruit.bounds(20)
    assert hx0 < (fx0 + fx1) / 2 < hx1 and hy0 < (fy0 + fy1) / 2 < hy1    # the fruit is at the face


def test_5_talking_moves_the_mouth_with_the_voice(composer):
    line = [{"line_id": "l1", "speaker": "monkey_001", "text": "नमस्ते मित्र, तुम कैसे हो?"},
            {"line_id": "l2", "speaker": "crocodile_001", "text": "मैं ठीक हूँ।"}]
    plan, issues = _compose(composer, [], seconds=5.0, dialogue=line)
    assert not [i for i in issues if i.severity == "error"]
    shapes = {s.id.rsplit(".", 1)[1]: s.opacity for s in _track(plan, "char.monkey_001.mouth.")}
    assert {"closed", "small", "open"} <= set(shapes)
    speaking = shapes["small"] + shapes["open"]
    assert speaking[8:60].sum() > 10 and speaking[80:].sum() == 0     # mouth works during the line, rests afterwards
    jaw = plan.shots[0].sprite("char.crocodile_001.jaw.base")
    head = plan.shots[0].sprite("char.crocodile_001.head.base")
    angle = np.degrees(np.arctan2(jaw.affine[:, 1], jaw.affine[:, 0]) - np.arctan2(head.affine[:, 1], head.affine[:, 0]))
    angle = (angle + 180) % 360 - 180                                 # jaw angle relative to the head
    quiet, talking = angle[:40], angle[75:105]
    assert np.ptp(talking) > 6 > np.ptp(quiet)                        # the crocodile's jaw flaps only on its own line


def test_6_crocodile_swims(composer):
    swim = _act("s", "crocodile_001", "crocodile_swim", 0.0, 3.0, move_to={"anchor": "river_far"}, loop=True)
    plan, issues = _compose(composer, [swim])
    assert not issues
    body = plan.shots[0].sprite("char.crocodile_001.body.base")
    tail = plan.shots[0].sprite("char.crocodile_001.tail.base")
    assert body.bounds(71)[0] - body.bounds(0)[0] > 300               # it gets somewhere
    rel = np.degrees(np.arctan2(tail.affine[:, 1], tail.affine[:, 0])) - np.degrees(np.arctan2(body.affine[:, 1], body.affine[:, 0]))
    assert np.ptp(rel[5:65]) > 30                                     # with a beating tail
    assert body.affine[40, 0] > 0 > body.affine[0, 0] or body.affine[40, 0] != body.affine[0, 0]     # and it turns to face its way


def test_7_transitions_between_animations(composer, catalogue):
    actions = [_act("a", "monkey_001", "sit", 0.2, 0.6), _act("b", "monkey_001", "stand", 1.4, 0.6), _act("c", "monkey_001", "walk", 2.2, 0.7)]
    plan, issues = _compose(composer, actions, [MONKEY_ON_BANK])
    assert not issues                                                 # standing -> sitting -> standing -> walking is legal
    body = plan.shots[0].sprite("char.monkey_001.body.base")
    y = body.affine[:, 5]
    assert y[25] < y[0] - 25 and y[52] == pytest.approx(y[0], abs=3)  # down while sitting, back up after standing
    assert np.abs(np.diff(y)).max() < 14                              # no pops: every change is animated
    assert check_transition(catalogue.get("sit"), "standing", "m") == "sitting"
    loop = catalogue.get("walk")                                      # looping clips fade in and out instead of snapping
    assert loop.blend_in > 0


def test_8_incompatible_transitions_are_prevented(composer, catalogue):
    with pytest.raises(TransitionError, match="cannot play 'walk' while sitting"):
        check_transition(catalogue.get("walk"), "sitting", "monkey_001")
    cases = [
        ([_act("a", "monkey_001", "walk", 0, 1.0)], [MONKEY_ON_BRANCH, CROC_IN_RIVER], "incompatible_transition"),       # walking while seated
        ([_act("a", "monkey_001", "stand", 0, 0.6)], [MONKEY_ON_BANK], "incompatible_transition"),                       # already standing
        ([_act("a", "monkey_001", "crocodile_swim", 0, 1.0)], None, "incompatible_asset"),                               # wrong rig
        ([_act("a", "crocodile_001", "jump", 0, 1.0)], None, "incompatible_asset"),
        ([_act("a", "monkey_001", "swim", 0, 1.0)], [MONKEY_ON_BANK], "constraint_violation"),                           # no water here
        ([_act("a", "monkey_001", "wave", 0, 1.2), _act("b", "monkey_001", "point", 0.5, 1.0)], None, "timeline_conflict"),
        ([_act("a", "monkey_001", "moonwalk", 0, 1.0)], None, "animation_error"),
    ]
    for actions, characters, code in cases:
        _, issues = _compose(composer, actions, characters, strict=False)
        assert code in [i.code for i in issues if i.severity == "error"], (code, [i.to_dict() for i in issues])
        with pytest.raises(ValidationFailed):
            _compose(composer, actions, characters)


@pytest.mark.render
def test_9_10_render_an_animation_sequence_with_the_right_duration(render_service, artifacts):
    actions = [
        _act("a1", "monkey_001", "jump", 0.2, 1.0, move_to={"anchor": "riverbank"}),
        _act("a2", "monkey_001", "happy_reaction", 1.4, 1.2),
        _act("b1", "crocodile_001", "crocodile_swim", 0.0, 2.5, move_to={"anchor": "river_far"}, loop=True),
        _act("b2", "crocodile_001", "crocodile_laugh", 2.6, 1.2),
    ]
    st = story([scene("anim", [shot(seconds=4.0, actions=actions, camera={"preset": "establishing_wide"})])], story_id="phase06_anim")
    plan, _ = render_service.plan_scene(st, "anim")
    assert plan.n_frames == 96 and plan.duration == 4.0               # timeline length is exact
    result = render_service.render_scene(st, "anim", RenderSettings.preview(st))
    assert result.ok, result.error
    info = ffmpeg.probe(result.path)
    assert info.frames == 96 and info.fps == 24 and info.video_duration == pytest.approx(4.0, abs=0.01)
    frames = [ffmpeg.extract_frame(result.path, t, artifacts / f"phase06_anim_{i}.png") for i, t in enumerate((0.1, 0.7, 2.0, 3.2))]
    assert all(frame_difference(a, b) > 0.5 for a, b in zip(frames, frames[1:]))
    (artifacts / "phase06_animation.mp4").write_bytes(result.path.read_bytes())
