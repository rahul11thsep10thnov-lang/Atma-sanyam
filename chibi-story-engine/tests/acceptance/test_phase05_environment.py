"""Phase 5 acceptance: a layered forest-and-river environment with parallax, moving water and leaves."""
from __future__ import annotations

import numpy as np
import pytest
from PIL import Image

from engine.camera.guards import constrain, min_zoom_for, uncovered
from engine.environment_manager.bounds import cover_layers
from engine.camera.presets import CAMERA_PRESETS, Target, evaluate_camera
from engine.camera.projection import CameraState, project
from engine.environment_manager.lighting import LIGHTING_PRESETS, grade
from engine.rendering import ffmpeg
from engine.rendering.service import RenderSettings
from engine.schema.assets import AssetType
from engine.schema.story import CameraSpec
from tests.support import frame_difference, scene, shot, story


def _empty(camera=None, seconds=2.0, **extra):
    return story([scene("env", [shot(seconds=seconds, characters=[], camera=camera or {"preset": "establishing_wide"})], **extra)],
                 story_id="phase05_env", characters=())


def test_1_2_load_environment_and_each_layer(library):
    env = library.environment("forest_river_001")
    assert library.verify(AssetType.environment, env.id) == []
    types = {l.type for l in env.layers}
    assert {"background", "far", "middle", "foreground"} <= types
    for layer in env.layers:                                         # every layer is its own image and loads on its own
        with Image.open(library.file_path(AssetType.environment, env.id, layer.file)) as im:
            assert im.mode == "RGBA" and im.width > 100 and im.height > 20
            assert layer.rect[2] > 0 and layer.rect[3] > 0
    assert {"tree_branch", "riverbank", "river_near"} <= set(env.anchors)
    assert "water" in env.anchors["river_near"].features and "tree" in env.anchors["tree_branch"].features
    for other in ("river_open_001", "crocodile_home_001"):
        assert library.verify(AssetType.environment, other) == []


def test_3_4_camera_moves_and_layers_shift_by_depth():
    rest, moved = CameraState(), CameraState(x=1160.0)               # camera 200 px to the right
    shifts = {p: project(960, 540, p, rest)[0] - project(960, 540, p, moved)[0] for p in (0.12, 0.3, 0.55, 1.0, 1.3)}
    for p, shift in shifts.items():
        assert shift == pytest.approx(200 * p, rel=1e-6)             # far layers move less, near layers more
    assert shifts[0.12] < shifts[0.55] < shifts[1.0] < shifts[1.3]
    # a push-in is a dolly: the stage plane doubles in size, a distant layer hardly grows
    zoomed = CameraState(zoom=2.0)
    near = project(1160, 540, 1.0, zoomed)[0] - 960
    far = project(1160, 540, 0.12, zoomed)[0] - 960
    assert near == pytest.approx(400) and 200 < far < 215


def test_camera_presets_all_run():
    assert set(CAMERA_PRESETS) == {"establishing_wide", "slow_push_in", "slow_pull_out", "horizontal_pan", "vertical_pan", "tracking_shot",
                                   "character_closeup", "reaction_closeup", "dramatic_reveal", "action_follow", "parallax_drift"}
    target = Target([(700 + 5 * i, 560.0) for i in range(48)], height=400)
    for name in CAMERA_PRESETS:
        states = evaluate_camera(CameraSpec(preset=name), 48, 24, target)
        assert len(states) == 48 and all(0.5 <= s.zoom <= 3.0 for s in states)
    keyed = evaluate_camera(CameraSpec(keyframes=[{"t": 0, "x": 800, "zoom": 1.0}, {"t": 2, "x": 1200, "zoom": 1.5, "easing": "linear"}]), 49, 24)
    assert keyed[0].x == 800 and keyed[24].x == pytest.approx(1000) and keyed[48].zoom == pytest.approx(1.5)
    follow = evaluate_camera(CameraSpec(preset="tracking_shot"), 48, 24, target)
    assert follow[-1].x > follow[0].x + 150                          # the camera travels with its subject


def test_5_6_river_and_leaves_are_animated(composer):
    plan, issues = composer.compose(_empty(seconds=4.0), "env")
    assert not issues
    shot_plan = plan.shots[0]
    ripples = shot_plan.sprite("env.ripples_near")
    xs = ripples.affine[:, 4]
    assert len(set(np.round(xs, 2))) > 80                             # the water highlights keep sliding...
    assert xs.max() - xs.min() < 700                                  # ...and wrap around instead of running out
    leaves = shot_plan.sprite("env.leaves_1")
    angles = np.degrees(np.arctan2(leaves.affine[:, 1], leaves.affine[:, 0]))
    assert angles.max() > 1.0 and angles.min() < -1.0                 # leaves sway both ways
    assert np.allclose(shot_plan.sprite("env.tree").affine, shot_plan.sprite("env.tree").affine[0])   # the trunk does not
    windy, _ = composer.compose(_empty(seconds=4.0, weather="windy"), "env")
    w_angles = np.degrees(np.arctan2(windy.shots[0].sprite("env.leaves_1").affine[:, 1], windy.shots[0].sprite("env.leaves_1").affine[:, 0]))
    assert w_angles.max() > angles.max() * 1.8                        # wind makes them sway harder


def test_lighting_presets():
    assert {"day", "morning", "sunset", "night", "overcast"} <= set(LIGHTING_PRESETS)
    day, night = grade("day", "clear"), grade("night", "clear")
    assert day[0] == (1.0, 1.0, 1.0) and sum(night[0]) < 2.0 and night[0][2] > night[0][0]      # night is darker and bluer


def test_9_image_boundaries_and_clipping(library, composer):
    env = library.environment("forest_river_001")
    covers = cover_layers(env)
    assert covers and min_zoom_for(covers) <= 1.0                     # the resting camera is fully covered
    wild = CameraState(x=5000.0, y=-900.0, zoom=0.5)                  # far outside the painted world
    assert uncovered(wild, covers)
    safe = constrain(wild, covers)
    assert uncovered(safe, covers) == [] and safe.zoom >= min_zoom_for(covers) > 0.7      # pulled back inside the painted world
    for preset in CAMERA_PRESETS:                                     # no preset can show past an edge
        plan, _ = composer.compose(_empty({"preset": preset, "params": {"distance": 4000}}), "env")
        for cam in plan.shots[0].camera:
            assert uncovered(CameraState(*cam), covers) == [], preset
    plan, _ = composer.compose(_empty({"keyframes": [{"t": 0, "x": -3000, "zoom": 1.0}, {"t": 2, "x": 6000, "zoom": 1.0}]}), "env")
    assert "camera limited" in plan.shots[0].notes[0]


@pytest.mark.render
def test_7_8_render_environment_without_and_with_characters(render_service, artifacts):
    empty = _empty({"preset": "horizontal_pan"}, seconds=1.5)
    result = render_service.render_scene(empty, "env", RenderSettings.preview(empty))
    assert result.ok, result.error
    first = ffmpeg.extract_frame(result.path, 0.0, artifacts / "phase05_env_pan_start.png")
    last = ffmpeg.extract_frame(result.path, 1.4, artifacts / "phase05_env_pan_end.png")
    assert frame_difference(first, last) > 3.0                        # the pan and the water change the picture
    pixels = np.asarray(Image.open(first).convert("RGB"), dtype=float)
    border = np.concatenate([pixels[0], pixels[-1], pixels[:, 0], pixels[:, -1]])
    assert (border.sum(axis=1) < 12).mean() < 0.005                   # no black gaps at the frame edges
    assert pixels[:40].mean(axis=(0, 1))[2] > 150                     # sky at the top

    populated = story([scene("env", [shot(seconds=1.5, camera={"preset": "horizontal_pan"})])], story_id="phase05_env_chars")
    with_chars = render_service.render_scene(populated, "env", RenderSettings.preview(populated))
    assert with_chars.ok, with_chars.error
    crowd = ffmpeg.extract_frame(with_chars.path, 0.0, artifacts / "phase05_env_with_characters.png")
    assert frame_difference(first, crowd) > 1.0                       # the characters are in the picture
    (artifacts / "phase05_environment.mp4").write_bytes(with_chars.path.read_bytes())
