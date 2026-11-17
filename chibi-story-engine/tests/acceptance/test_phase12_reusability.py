"""Phase 12 acceptance: four different stories, one engine, no story-specific code."""
from __future__ import annotations

import json
import re

import pytest

from engine.audio.providers import ToneProvider
from engine.audio.speech import AudioCache, DialogueService, NarrationService, produce_speech
from engine.audio.voices import VoiceRegistry
from engine.quality_control.checks import QualityControl
from engine.rendering import ffmpeg
from engine.rendering.service import RenderSettings
from engine.schema.story import iter_actions, parse_story
from engine.story_intelligence.analyser import RuleBasedAnalyser
from engine.story_intelligence.storyboard import StoryboardBuilder
from tests.support import ROOT

STORIES = {
    "monkey_and_crocodile": ("panchatantra", {"monkey_001", "crocodile_001", "crocodile_wife_001"},
                             {"forest_river_001", "river_open_001", "crocodile_home_001"}),
    "lion_and_clever_rabbit": ("panchatantra", {"lion_001", "rabbit_001"}, {"forest_well_001"}),
    "blue_jackal": ("panchatantra", {"jackal_001", "jackal_blue_001", "lion_001"}, {"village_001", "forest_well_001"}),
    "farmer_and_rich_man": ("original", {"farmer_001", "rich_man_001"}, {"farm_field_001", "mansion_001"}),
}


def _text(name):
    return (ROOT / "stories" / STORIES[name][0] / f"{name}.hi.txt").read_text(encoding="utf-8")


def _committed(name):
    return parse_story(json.loads((ROOT / "stories" / STORIES[name][0] / f"{name}.json").read_text(encoding="utf-8")))


@pytest.fixture(scope="module")
def boards(library):
    index = library.index()
    return {name: StoryboardBuilder(index).build(RuleBasedAnalyser(index).analyse(_text(name)), story_id=name) for name in STORIES}


@pytest.mark.parametrize("name", list(STORIES))
def test_each_story_goes_through_the_same_engine(name, boards, library, composer):
    board = boards[name]
    _, characters, environments = STORIES[name]
    assert board.missing_assets == [], board.missing_assets
    assert set(board.story.character_ids()) == characters                       # different characters are found and used
    assert {s.environment_id for s in board.story.scenes} == environments        # different environments are selected
    report = QualityControl(library).check_story(board.story, composer=composer)
    assert report.passed, [i.to_dict() for i in report.errors()]
    committed = _committed(name)                                                 # the story file in the repository is this storyboard, re-timed to its audio
    assert committed.character_ids() == board.story.character_ids()
    assert [s.environment_id for s in committed.scenes] == [s.environment_id for s in board.story.scenes]
    assert [[a.animation for a, _ in iter_actions(sh.actions)] for sc in committed.scenes for sh in sc.shots] == \
           [[a.animation for a, _ in iter_actions(sh.actions)] for sc in board.story.scenes for sh in sc.shots]
    assert QualityControl(library).check_story(committed, composer=composer).passed


def test_key_story_events_are_staged(boards):
    lion = boards["lion_and_clever_rabbit"].story
    into_well = [a for sc in lion.scenes for sh in sc.shots for a in sh.actions if a.move_to and a.move_to.anchor == "well"]
    assert len(into_well) == 1 and into_well[0].character_id == "lion_001" and into_well[0].animation == "jump"
    assert "lion_001" not in {c.character_id for sh in lion.scenes[-1].shots for c in sh.characters}      # he does not come back
    walked = [a for sh in lion.scene("scene_03").shots for a in sh.actions if a.move_to and a.move_to.anchor and "well_side" in a.move_to.anchor]
    assert {a.character_id for a in walked} == {"lion_001", "rabbit_001"}                                  # the rabbit led him there

    jackal = boards["blue_jackal"].story
    assert [s.time_of_day for s in jackal.scenes] == ["night", "night", "day", "night"]
    first = {c.character_id for sh in jackal.scenes[0].shots for c in sh.characters}
    later = {c.character_id for sc in jackal.scenes[1:] for sh in sc.shots for c in sh.characters}
    assert first == {"jackal_001"} and "jackal_001" not in later and "jackal_blue_001" in later          # one design per identity, swapped in the vat
    assert any(a.move_to and a.move_to.anchor == "vat" for sh in jackal.scenes[0].shots for a in sh.actions)
    assert any(a.move_to and (a.move_to.anchor or "").startswith("offstage") for sh in jackal.scenes[-1].shots for a in sh.actions)

    farmer = boards["farmer_and_rich_man"].story
    props = {p.prop_id for sc in farmer.scenes for sh in sc.shots for p in sh.props}
    assert "money_bag_001" in props
    gave = [a for sc in farmer.scenes for sh in sc.shots for a in sh.actions if a.animation == "give"]
    assert gave and gave[0].character_id == "rich_man_001" and gave[0].target_character == "farmer_001"
    speakers = {l.speaker for sc in farmer.scenes for sh in sc.shots for l in sh.dialogue}
    assert speakers == {"narrator", "farmer_001", "rich_man_001"}


def test_animation_templates_are_reused_across_stories(boards, library):
    used = {name: {a.animation for sc in b.story.scenes for sh in sc.shots for a, _ in iter_actions(sh.actions)} for name, b in boards.items()}
    shared = [clip for clip in set().union(*used.values()) if sum(clip in u for u in used.values()) >= 2]
    assert {"walk", "jump"} <= set(shared), used
    clips = library.animations()
    for name, board in boards.items():                                            # every clip is a library template, never something per story
        assert used[name] <= set(clips), name
    by_rig = {c.id: c.rig_template for c in library.index().characters}
    riggers = {by_rig[c] for b in boards.values() for c in b.story.character_ids()}
    assert riggers == {"biped_chibi", "quadruped_reptile"}
    bipeds = {c for b in boards.values() for c in b.story.character_ids() if by_rig[c] == "biped_chibi"}
    assert len(bipeds) >= 7                                                       # seven different characters share one rig template and its clips


def test_voice_assignments_can_be_changed(boards, library, tmp_path):
    story = boards["lion_and_clever_rabbit"].story
    narration = NarrationService(ToneProvider(), VoiceRegistry(library.root / "voices"), AudioCache(tmp_path / "cache"))
    dialogue = DialogueService(narration, library)
    lines = [(sc.scene_id, sh.shot_id, l) for sc in story.scenes for sh in sc.shots for l in sh.dialogue]
    lion_line = next(l for _, _, l in lines if l.speaker == "lion_001")
    assert dialogue.assign_speaker(lion_line, story) == "lion_hi"
    before = produce_speech(story, dialogue)
    recast = story.model_copy(deep=True)
    next(c for c in recast.characters if c.character_id == "lion_001").voice_id = "rich_man_hi"
    recast.audio.narrator_voice = "farmer_hi"
    assert dialogue.assign_speaker(lion_line, recast) == "rich_man_hi"
    after = produce_speech(recast, dialogue)
    changed = [k for k in before.clips if before.clips[k].voice_id != after.clips[k].voice_id]
    rabbit = [k for k, c in before.clips.items() if c.voice_id == "rabbit_hi"]
    assert changed and all(after.clips[k].path != before.clips[k].path for k in changed)       # new voice, new audio
    assert rabbit and all(after.clips[k].path == before.clips[k].path for k in rabbit)         # untouched voices are reused


def test_no_story_specific_code_in_the_engine():
    """Rendering, animation, composition, audio and the backend never name a story, a character or a place."""
    words = r"monkey|crocodile|jamun|lion|rabbit|jackal|farmer|rich_man|well_side|vat|बंदर|मगरमच्छ|शेर|खरगोश|सियार|किसान|सेठ"
    core = ["animation", "camera", "composition", "rendering", "character_manager", "environment_manager", "audio", "asset_manager",
            "quality_control", "schema", "common"]
    hits = []
    for path in [p for d in core for p in (ROOT / "engine" / d).rglob("*.py")] + list((ROOT / "backend").rglob("*.py")) + \
            [ROOT / "engine" / "cli.py"]:
        for n, line in enumerate(path.read_text(encoding="utf-8").splitlines(), 1):
            if re.search(rf"(?<![a-z_])(?:{words})(?![a-z])", line, re.IGNORECASE):
                hits.append(f"{path.relative_to(ROOT)}:{n}: {line.strip()[:80]}")
    assert hits == []
    # the storyboard builder works from library metadata: it too is free of names (only generic staging words)
    builder = (ROOT / "engine" / "story_intelligence" / "storyboard.py").read_text(encoding="utf-8")
    assert not re.search(r"monkey|crocodile|jamun|lion|rabbit|jackal|farmer|बंदर|मगरमच्छ", builder, re.IGNORECASE)


@pytest.mark.render
@pytest.mark.parametrize("name", ["lion_and_clever_rabbit", "blue_jackal", "farmer_and_rich_man"])
def test_other_stories_render_with_the_same_renderer(name, render_service, artifacts):
    story = _committed(name)
    scene_id = story.scenes[0].scene_id
    result = render_service.render_scene(story, scene_id, RenderSettings.preview(story))
    assert result.ok, result.error
    info = ffmpeg.probe(result.path)
    assert info.frames == round(story.scenes[0].total_duration * 24) and (info.width, info.height) == (640, 360)
    ffmpeg.extract_frame(result.path, min(4.0, info.video_duration / 2), artifacts / f"phase12_{name}.png")


def test_rendered_films_are_valid_1080p(library):
    """The four finished films in renders/final (when present in this checkout) are real, complete 1080p videos."""
    found = 0
    for name in STORIES:
        films = sorted((ROOT / "renders" / "final" / name).glob(f"{name}_1920x1080_*.mp4"))
        if not films:
            continue
        found += 1
        story = _committed(name)
        report = QualityControl(library).check_video(story, films[-1], RenderSettings.final(story), story.total_duration)
        assert report.passed, (name, [i.to_dict() for i in report.automatic])
    if not found:
        pytest.skip("no rendered films in this checkout")
