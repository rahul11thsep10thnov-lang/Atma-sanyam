"""Visual regression: approved reference frames are compared with fresh Blender renders, within tolerances."""
from __future__ import annotations

import json

import pytest
from PIL import Image, ImageDraw

from engine.quality_control.visual import Tolerance, compare, difference_image
from engine.rendering.raster import render_shot_frame
from engine.schema.story import parse_story
from tests.support import ROOT
from tools.make_references import FRAMES, REFERENCES, STORY


@pytest.fixture(scope="module")
def story():
    return parse_story(json.loads(STORY.read_text(encoding="utf-8")))


def test_comparison_measures_and_tolerances(tmp_path):
    base = Image.new("RGB", (480, 270), (120, 190, 230))
    ImageDraw.Draw(base).ellipse((200, 100, 280, 180), fill=(180, 110, 60))
    assert compare(base, base).passed and compare(base, base).mean == 0
    noisy = Image.eval(base, lambda v: min(255, v + 2))
    assert compare(noisy, base).passed                                     # sub-perceptual noise is not a failure
    missing = Image.new("RGB", (480, 270), (120, 190, 230))                # the object is gone
    result = compare(missing, base)
    assert not result.passed and "missing or moved" in " ".join(result.reasons)
    moved = Image.new("RGB", (480, 270), (120, 190, 230))
    ImageDraw.Draw(moved).ellipse((320, 100, 400, 180), fill=(180, 110, 60))
    assert not compare(moved, base).passed                                 # the object is somewhere else
    assert compare(moved, base, Tolerance(mean=50, changed_share=0.5, block=300)).passed     # tolerances are configurable
    darker = Image.eval(base, lambda v: int(v * 0.8))
    assert "overall difference" in compare(darker, base).reasons[0]
    half = base.resize((240, 135))
    assert compare(half, base).passed                                      # a different size is compared after scaling
    missing.save(tmp_path / "missing.png")
    base.save(tmp_path / "base.png")
    heat = difference_image(tmp_path / "missing.png", tmp_path / "base.png", tmp_path / "diff.png")
    assert Image.open(heat).size == (480, 270)


def test_reference_frames_exist():
    assert [p.name for p in sorted(REFERENCES.glob("*.png"))] == sorted(f"{s}_{t:.1f}s.png" for s, t in FRAMES)


@pytest.mark.render
def test_renders_match_the_approved_references(render_service, story, artifacts):
    for scene_id, t in FRAMES:
        (still,) = render_service.render_stills(story, scene_id, [t], artifacts / "visual")
        result = compare(still, REFERENCES / f"{scene_id}_{t:.1f}s.png")
        assert result.passed, (scene_id, result.to_dict())


@pytest.mark.render
def test_composition_changes_are_flagged(render_service, story, artifacts):
    scene_id, t = FRAMES[0]
    reference = REFERENCES / f"{scene_id}_{t:.1f}s.png"
    moved = story.model_copy(deep=True)
    moved.scene(scene_id).shots[0].characters[0].position.offset = (420.0, -260.0)        # the character slipped off its branch
    (still,) = render_service.render_stills(moved, scene_id, [t], artifacts / "visual_moved")
    result = compare(still, reference)
    assert not result.passed and any("missing or moved" in r for r in result.reasons)
    hidden = story.model_copy(deep=True)
    hidden.scene(scene_id).shots[0].characters[0].visible = False                          # the character is missing
    (still,) = render_service.render_stills(hidden, scene_id, [t], artifacts / "visual_hidden")
    assert not compare(still, reference).passed
    difference_image(still, reference, artifacts / "visual_hidden_difference.png")


def test_software_compositor_agrees_with_the_references(composer, story):
    """The fast preview compositor and Blender must tell the same story (looser tolerance: different samplers)."""
    for scene_id, t in FRAMES:
        plan, _ = composer.compose(story, scene_id)
        frame = int(round(t * plan.fps))
        for shot in plan.shots:
            if frame < shot.n_frames:
                image = render_shot_frame(shot, frame, 480, 270)
                break
            frame -= shot.n_frames
        result = compare(image, REFERENCES / f"{scene_id}_{t:.1f}s.png", Tolerance(mean=6.0, changed_share=0.06, block=45.0))
        assert result.passed, (scene_id, result.to_dict())
