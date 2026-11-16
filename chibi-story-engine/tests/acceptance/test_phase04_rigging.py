"""Phase 4 acceptance: layered rigs for the monkey and the crocodile, validated and rendered."""
from __future__ import annotations

import math

import numpy as np
import pytest

from engine.character_manager.registry import CharacterRegistry
from engine.character_manager.rig import HIDDEN, Pose, Rig, validate_rig
from engine.rendering import ffmpeg
from engine.rendering.raster import render_character
from engine.rendering.service import RenderSettings
from engine.schema.assets import STANDARD_COMPONENTS, AssetType, CharacterManifest
from tests.support import frame_difference, scene, shot, story


@pytest.fixture(scope="module")
def registry(library):
    return CharacterRegistry(library)


def _matrices(rig: Rig, pose: Pose) -> dict[str, np.ndarray]:
    return {s.part: s.matrix for s in rig.solve(pose)}


def _moved(a: dict, b: dict) -> set[str]:
    return {k for k in a if k in b and not np.allclose(a[k], b[k], atol=1e-6)}


def test_1_2_load_monkey_and_crocodile_rigs(registry, library):
    monkey, croc = registry.rig("monkey_001"), registry.rig("crocodile_001")
    assert registry.get("monkey_001").rig.template == "biped_chibi" and registry.get("crocodile_001").rig.template == "quadruped_reptile"
    templates = library.rig_templates()
    for cid, rig in (("monkey_001", monkey), ("crocodile_001", croc), ("crocodile_wife_001", registry.rig("crocodile_wife_001"))):
        manifest = registry.get(cid)
        template = templates[manifest.rig.template]
        assert validate_rig(manifest, template) == []
        for component in STANDARD_COMPONENTS:                       # root, body, head, eyes, eyebrows, mouth, arms, legs
            assert all(p in rig.parts for p in template.components[component]), (cid, component)
        assert "tail" in rig.parts                                  # tail where applicable
        assert len(rig.solve(Pose())) >= 11
    assert "tail" not in registry.rig("farmer_001").parts           # ...and absent where it is not


def test_3_head_moves_independently(registry):
    for cid in ("monkey_001", "crocodile_001"):
        rig = registry.rig(cid)
        rest = _matrices(rig, Pose())
        pose = Pose()
        pose.add("head", rotation=15)
        moved = _moved(rest, _matrices(rig, pose))
        face = {"head", "eyes", "pupils"} | ({"brow_l", "brow_r", "mouth"} if cid == "monkey_001" else {"brow", "jaw"})
        assert moved == face, (cid, moved)                          # the face follows the head; body, limbs and tail do not move


def test_4_blink(registry, library):
    rig = registry.rig("monkey_001")
    manifest = registry.get("monkey_001")
    open_pose, shut = Pose(), Pose()
    open_pose.apply_facial(manifest.expressions["neutral"])
    shut.apply_facial(manifest.expressions["neutral"])
    shut.variants.update({"eyes": "closed", "pupils": HIDDEN})
    parts_open = {s.part: s.variant for s in rig.solve(open_pose)}
    parts_shut = {s.part: s.variant for s in rig.solve(shut)}
    assert parts_open["eyes"] == "open" and "pupils" in parts_open
    assert parts_shut["eyes"] == "closed" and "pupils" not in parts_shut
    asset_dir = library.asset_dir(AssetType.character, "monkey_001")
    assert frame_difference(render_character(asset_dir, rig, open_pose), render_character(asset_dir, rig, shut)) > 0.3


def test_5_change_expression(registry, library):
    for cid in ("monkey_001", "crocodile_001"):
        manifest, rig = registry.get(cid), registry.rig(cid)
        asset_dir = library.asset_dir(AssetType.character, cid)
        rendered = {}
        for name in ("neutral", "happy", "sad", "surprised", "angry", "worried", "thinking", "laughing", "speaking"):
            pose = Pose()
            pose.apply_facial(manifest.expressions[name])
            rendered[name] = render_character(asset_dir, rig, pose, zoom=0.5)
        names = list(rendered)
        for i, a in enumerate(names):
            for b in names[i + 1:]:
                assert frame_difference(rendered[a], rendered[b]) > 0.02, (cid, a, b)     # every face is visibly distinct
        # identity is untouched: body, limbs and tail are pixel-identical parts in every expression
        base = {s.part: (s.file, s.matrix.tobytes()) for s in rig.solve(Pose())}
        happy = Pose()
        happy.apply_facial(manifest.expressions["happy"])
        after = {s.part: (s.file, s.matrix.tobytes()) for s in rig.solve(happy)}
        for part in ("body", "tail"):
            assert base[part] == after[part]


def test_6_arms_and_legs_move(registry):
    rig = registry.rig("monkey_001")
    rest = _matrices(rig, Pose())
    for part in ("arm_l", "arm_r", "leg_l", "leg_r"):
        pose = Pose()
        pose.add(part, rotation=40)
        assert _moved(rest, _matrices(rig, pose)) == {part}
    croc = registry.rig("crocodile_001")
    rest = _matrices(croc, Pose())
    for part in ("leg_fl", "leg_fr", "leg_bl", "leg_br"):
        pose = Pose()
        pose.add(part, rotation=-20)
        assert _moved(rest, _matrices(croc, pose)) == {part}


def test_7_8_tail_and_jaw(registry):
    monkey = registry.rig("monkey_001")
    pose = Pose()
    pose.add("tail", rotation=25)
    assert _moved(_matrices(monkey, Pose()), _matrices(monkey, pose)) == {"tail"}
    croc = registry.rig("crocodile_001")
    rest = _matrices(croc, Pose())
    jaw = Pose()
    jaw.add("jaw", rotation=-20)
    assert _moved(rest, _matrices(croc, jaw)) == {"jaw"}
    # the jaw hinges at the back of the mouth: its tip drops, the hinge stays
    hinge = croc.to_rig(croc.parts["jaw"].pivot)
    before, after = croc.world_matrices(Pose())["jaw"], croc.world_matrices(jaw)["jaw"]
    tip = (hinge[0] + 240, hinge[1])
    assert np.allclose(before @ [*hinge, 1], after @ [*hinge, 1])
    assert (after @ [*tip, 1])[1] < (before @ [*tip, 1])[1] - 60
    tail = Pose()
    tail.add("tail", rotation=20)
    assert _moved(rest, _matrices(croc, tail)) == {"tail"}


def test_10_no_unexpected_deformation(registry):
    for cid in ("monkey_001", "crocodile_001", "lion_001", "farmer_001"):
        rig = registry.rig(cid)
        pose = Pose()
        for part in rig.parts:
            pose.add(part, rotation=400)                            # absurd input
        for part, limits in ((p.id, p.rotation_limits) for p in rig.definition.parts):
            if limits:
                assert limits[0] <= rig.clamp(part, pose.parts[part].rotation) <= limits[1]
        for s in rig.solve(pose):                                   # every sprite stays a rigid image: no shear, no squash
            a, b, c, d = s.matrix[0, 0], s.matrix[1, 0], s.matrix[0, 1], s.matrix[1, 1]
            image = rig.parts[s.part].variants[s.variant]
            assert math.isclose(math.hypot(a, b), image.size[0], rel_tol=1e-6)
            assert math.isclose(math.hypot(c, d), image.size[1], rel_tol=1e-6)
            assert abs(a * c + b * d) < 1e-6 * image.size[0] * image.size[1]
        # joints stay attached: a child's pivot is carried by its parent
        bent = Pose()
        bent.add("body", rotation=15)
        world = rig.world_matrices(bent)
        for part in rig.definition.parts:
            if part.parent == "body":
                pivot = rig.to_rig(part.pivot)
                assert np.allclose(world[part.id] @ [*pivot, 1], world["body"] @ [*pivot, 1])


def test_rig_validation_finds_missing_components(registry, library):
    data = registry.get("monkey_001").model_dump(mode="json")
    data["rig"]["parts"] = [p for p in data["rig"]["parts"] if p["id"] not in ("brow_l", "mouth")]
    broken = CharacterManifest.model_validate(data)
    messages = [i["message"] for i in validate_rig(broken, library.rig_templates()["biped_chibi"])]
    assert any("missing rig component 'eyebrows'" in m for m in messages)
    assert any("missing rig component 'mouth'" in m for m in messages)
    assert any("talk part 'mouth' is not defined" in m for m in messages)


@pytest.mark.render
def test_9_render_a_short_rig_sequence(render_service, artifacts):
    """Both rigs driven through head, eyes, limbs, tail and jaw, rendered by Blender."""
    actions = [
        {"action_id": "a1", "character_id": "monkey_001", "animation": "wave", "start_seconds": 0.1, "duration_seconds": 1.2},
        {"action_id": "a2", "character_id": "monkey_001", "animation": "monkey_tail_swing", "start_seconds": 0.0, "duration_seconds": 2.0},
        {"action_id": "a3", "character_id": "monkey_001", "animation": "turn_head", "start_seconds": 1.2, "duration_seconds": 0.8},
        {"action_id": "b1", "character_id": "crocodile_001", "animation": "crocodile_jaw_open", "start_seconds": 0.2, "duration_seconds": 1.0},
        {"action_id": "b2", "character_id": "crocodile_001", "animation": "crocodile_tail_swing", "start_seconds": 0.0, "duration_seconds": 2.0},
    ]
    st = story([scene("rig_test", [shot(seconds=2.0, actions=actions, camera={"preset": "slow_push_in"})])], story_id="phase04_rigs")
    result = render_service.render_scene(st, "rig_test", RenderSettings.preview(st))
    assert result.ok, result.error
    info = ffmpeg.probe(result.path)
    assert (info.frames, info.width, info.height) == (48, 640, 360)
    a = ffmpeg.extract_frame(result.path, 0.05, artifacts / "phase04_rig_0.png")
    b = ffmpeg.extract_frame(result.path, 0.5, artifacts / "phase04_rig_1.png")
    assert frame_difference(a, b) > 0.8                              # the characters really move
    (artifacts / "phase04_rig_sequence.mp4").write_bytes(result.path.read_bytes())
