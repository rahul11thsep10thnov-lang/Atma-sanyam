"""Phase 8 acceptance: a scene is built from JSON alone, validated, previewed and rebuilt after an edit."""
from __future__ import annotations

import json

import numpy as np
import pytest

from engine.audio.providers import ToneProvider
from engine.audio.speech import AudioCache, DialogueService, NarrationService, produce_speech
from engine.audio.voices import VoiceRegistry
from engine.common.errors import ValidationFailed
from engine.composition.plan import ScenePlan
from engine.rendering import ffmpeg
from engine.rendering.raster import render_shot_frame
from engine.rendering.service import RenderSettings
from engine.schema.story import parse_story
from tests.support import CROC_IN_RIVER, MONKEY_ON_BRANCH, ROOT, frame_difference, scene, shot, story

STORY_FILE = ROOT / "stories" / "panchatantra" / "monkey_and_crocodile.auto.json"


@pytest.fixture(scope="module")
def monkey_story():
    return parse_story(json.loads(STORY_FILE.read_text(encoding="utf-8")))


@pytest.fixture(scope="module")
def plan(composer, monkey_story):
    plan, issues = composer.compose(monkey_story, "scene_02")
    assert not [i for i in issues if i.severity == "error"]
    return plan


def test_1_build_a_scene_from_json(plan, monkey_story):
    scene_def = monkey_story.scene("scene_02")
    assert [s.shot_id for s in plan.shots] == [s.shot_id for s in scene_def.shots]
    assert plan.n_frames == round(scene_def.total_duration * 24) and (plan.width, plan.height, plan.fps) == (1920, 1080, 24)
    assert plan.fade_in == 0.5 and plan.meta["environment"] == "forest_river_001"


def test_2_3_correct_characters_and_environment(plan, library):
    first = plan.shots[0]
    owners = {s.id.split(".")[1] for s in first.sprites if s.id.startswith("char.")}
    assert owners == {"monkey_001", "crocodile_001"}
    for sprite in first.sprites:
        if sprite.id.startswith("char.monkey_001."):
            assert "/characters/monkey_001/" in sprite.image and "/rig/" in sprite.image and len(sprite.checksum) == 64   # version 1 now lives in versions/v1
    layers = [s.id[4:] for s in first.sprites if s.id.startswith("env.")]
    assert layers == [l.id for l in library.environment("forest_river_001").layers]
    assert {s.parallax for s in first.sprites if s.id.startswith("env.")} >= {0.12, 0.3, 0.55, 1.0, 1.3}


def test_4_characters_are_positioned_at_their_anchors(plan, library):
    env = library.environment("forest_river_001")
    talk = plan.shots[1]                                              # the monkey's first line: both are in place
    monkey = talk.sprite("char.monkey_001.body.base").bounds(0)
    croc = talk.sprite("char.crocodile_001.body.base").bounds(0)
    branch, river = env.anchors["tree_branch"], env.anchors["river_near"]
    assert monkey[0] < branch.x < monkey[2] and abs(monkey[1] - branch.y) < 60        # sitting on the branch
    assert croc[0] < river.x < croc[2] and croc[1] < 130                              # low in the water
    water = talk.sprite("env.water_front")
    assert water.order > talk.sprite("char.crocodile_001.body.base").order            # the water surface is drawn over the crocodile
    assert talk.sprite("char.monkey_001.body.base").order > talk.sprite("env.tree").order
    assert talk.sprite("char.crocodile_001.head.base").affine[0, 0] < 0               # facing left, towards the monkey


def test_5_scheduled_actions_are_executed(plan, monkey_story):
    arrive = plan.shots[0]                                            # "a crocodile came swimming"
    action = monkey_story.scene("scene_02").shots[0].actions[0]
    body = arrive.sprite("char.crocodile_001.body.base")
    centre = [(body.bounds(f)[0] + body.bounds(f)[2]) / 2 for f in range(arrive.n_frames)]
    start, end = int(action.start_seconds * 24), int((action.start_seconds + action.duration_seconds) * 24)
    assert centre[0] > 2100 and centre[start] == pytest.approx(centre[0], abs=2)      # waits off stage
    assert centre[end + 1] == pytest.approx(1330, abs=60)                             # arrives at river_near
    assert all(b <= a + 0.5 for a, b in zip(centre[start:end], centre[start + 1:end + 1]))
    throw = plan.shots[2]                                             # the monkey throws jamun: the prop leaves the hand
    fruit = next(s for s in throw.sprites if s.id.startswith("prop."))
    seen = np.nonzero(fruit.opacity)[0]
    assert len(seen) > 20
    y = [fruit.bounds(f)[1] for f in seen]
    assert y[0] > 500 and min(y) < 350                                # from the tree down towards the crocodile
    ripple = [s for s in arrive.sprites if s.id.startswith("fx.")]
    assert ripple and any(s.opacity.max() > 0 for s in ripple)        # effects scheduled by the storyboard are present


def test_6_camera_movements_are_executed(plan, monkey_story):
    presets = [s.camera.preset for s in monkey_story.scene("scene_02").shots]
    assert presets[0] == "tracking_shot" and "character_closeup" in presets
    tracking = plan.shots[0].camera
    assert tracking[:, 0].max() - tracking[:, 0].min() > 150          # the camera travels with the crocodile
    closeup = plan.shots[presets.index("character_closeup")].camera
    assert closeup[:, 2].min() > 1.5                                  # and pushes in for dialogue
    for shot_plan in plan.shots:
        assert np.all(shot_plan.camera[:, 2] >= 0.5) and np.all(np.isfinite(shot_plan.camera))


def test_7_audio_is_integrated(composer, monkey_story, library, tmp_path):
    narration = NarrationService(ToneProvider(), VoiceRegistry(library.root / "voices"), AudioCache(tmp_path / "cache"))
    speech = produce_speech(monkey_story, DialogueService(narration, library), ["scene_02"])
    timing = speech.scene_timing(monkey_story, "scene_02")
    plan, _ = composer.compose(monkey_story, "scene_02", timing)
    line = timing["sc02_sh02"].lines[0]
    assert line.speaker == "monkey_001" and line.envelope is not None and line.audio_path
    talk = plan.shots[1]
    open_mouth = sum(s.opacity for s in talk.sprites if s.id in ("char.monkey_001.mouth.small", "char.monkey_001.mouth.open"))
    first, last = int(line.start * 24), int((line.start + line.duration) * 24)
    loud = [f for f in range(first, last) if line.envelope[f - first] > 0.3]
    assert loud and np.mean(open_mouth[loud]) > 0.9                   # the mouth is open exactly where the audio is loud
    assert open_mouth[: first - 1].sum() == 0 and open_mouth[last + 2:].sum() == 0
    without, _ = composer.compose(monkey_story, "scene_02")
    assert plan.digest() != without.digest()                          # real audio changes the performance, hence the render key


def test_9_composition_is_validated(composer):
    bad = story([scene("bad", [shot(
        characters=[{**MONKEY_ON_BRANCH, "position": {"anchor": "the_moon"}, "expression": "smug"}, CROC_IN_RIVER],
        actions=[{"action_id": "a", "character_id": "crocodile_001", "animation": "jump"}],
        effects=[{"effect_id": "e", "type": "confetti"}],
        props=[{"prop_id": "umbrella_001", "position": {"x": 100, "y": 100}}],
        camera={"preset": "dolly_zoom"})])], story_id="phase08_bad")
    with pytest.raises(ValidationFailed) as err:
        composer.compose(bad, "bad")
    text = json.dumps(err.value.issues)
    for expected in ("no anchor 'the_moon'", "no expression 'smug'", "'jump' is for rig", "unknown effect 'confetti'",
                     "umbrella_001", "unknown camera preset 'dolly_zoom'"):
        assert expected in text, expected
    assert all(i["path"].startswith("scene(bad)") for i in err.value.issues)
    missing = story([scene("s", [shot()], environment="moon_base_001")], story_id="phase08_missing")
    with pytest.raises(ValidationFailed, match="cannot be composed") as err:
        composer.compose(missing, "s")
    assert "moon_base_001" in err.value.issues[0]["message"]
    stale = story([scene("s", [shot()])], story_id="phase08_version")
    stale.characters[0].asset_version = 9
    with pytest.raises(ValidationFailed) as err:
        composer.compose(stale, "s")
    assert "no version 9" in err.value.issues[0]["message"]
    off = story([scene("s", [shot(seconds=4.0, camera={"keyframes": [{"t": 0, "x": 2000, "y": 200, "zoom": 3.0}]},
                                  dialogue=[{"line_id": "l", "speaker": "monkey_001", "text": "कोई मुझे देख सकता है?"}])])], story_id="phase08_off")
    _, issues = composer.compose(off, "s")
    assert [i.code for i in issues] == ["speaker_off_screen"] and issues[0].severity == "warning"


def test_10_an_edited_scene_is_regenerated(composer, monkey_story, tmp_path):
    before = {s.scene_id: composer.compose(monkey_story, s.scene_id)[0].digest() for s in monkey_story.scenes[:3]}
    edited = monkey_story.model_copy(deep=True)
    edited.scene("scene_02").shots[1].camera.preset = "reaction_closeup"
    edited.scene("scene_02").time_of_day = "sunset"
    after = {s.scene_id: composer.compose(edited, s.scene_id)[0].digest() for s in edited.scenes[:3]}
    assert after["scene_02"] != before["scene_02"]                    # the edited scene is new...
    assert after["scene_01"] == before["scene_01"] and after["scene_03"] == before["scene_03"]     # ...the others are untouched
    plan, _ = composer.compose(edited, "scene_02")
    assert plan.shots[0].sprite("env.sky").tint != (1.0, 1.0, 1.0)    # sunset grading applied
    saved = ScenePlan.load(plan.save(tmp_path / "plan"))
    assert saved.digest() == plan.digest() and saved.n_frames == plan.n_frames
    assert composer.compose(monkey_story, "scene_02")[0].digest() == before["scene_02"]             # composing is deterministic


@pytest.mark.render
def test_8_generate_a_preview(render_service, monkey_story, library, tmp_path, artifacts):
    narration = NarrationService(ToneProvider(), VoiceRegistry(library.root / "voices"), AudioCache(tmp_path / "cache"))
    short = monkey_story.model_copy(deep=True)
    short.story_id = "phase08_preview"
    short.scenes = [short.scene("scene_01")]
    speech = produce_speech(short, DialogueService(narration, library))
    result, preview = render_service.preview_scene(short, "scene_01", speech)
    assert result.ok and preview is not None, result.error
    info = ffmpeg.probe(preview)
    assert (info.width, info.height) == (640, 360) and info.has_audio and info.audio_duration == pytest.approx(info.video_duration, abs=0.1)
    # the rendered frame matches what the composition says it should be
    frame = ffmpeg.extract_frame(preview, 4.0, artifacts / "phase08_preview_frame.png")
    plan, _ = render_service.plan_scene(short, "scene_01", speech)
    expected = render_shot_frame(plan.shots[0], 96, 640, 360)
    assert frame_difference(frame, expected) < 6.0
    (artifacts / "phase08_scene_preview.mp4").write_bytes(preview.read_bytes())
