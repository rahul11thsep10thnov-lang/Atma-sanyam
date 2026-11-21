"""Four-view characters and the versioned upgrade of the original characters."""
from __future__ import annotations

import json

import numpy as np
import pytest
from PIL import Image

from engine.composition.plan import ScenePlan  # noqa: F401
from engine.rendering.raster import render_shot_frame
from engine.schema.assets import AssetType
from engine.schema.story import parse_story
from tests.support import ROOT, scene, shot, story

ORIGINAL = ["monkey_001", "lion_001", "rabbit_001", "jackal_001", "jackal_blue_001", "farmer_001", "rich_man_001", "crocodile_001", "crocodile_wife_001"]
VIEWS = {"side", "three_quarter", "back"}


def test_original_nine_are_version_two_and_version_one_is_intact(library):
    for cid in ORIGINAL:
        v2, v1 = library.character(cid), library.character(cid, 1)
        assert v2.version >= 2 and v1.version == 1, cid          # the reptiles later reached version 3 when their views were added
        assert v2.approval_status.value == "pending"
        assert library.verify(AssetType.character, cid) == [] and library.verify(AssetType.character, cid, 1) == [], cid
        assert len(v2.expressions) >= 15 and len(v2.poses) >= 15, cid
        assert len(v1.expressions) == 9 and not v1.views, cid
        assert v2.catalog_code.startswith("CHAR-ORG-")
        assert v2.change_summary


def test_every_part_of_the_original_nine_has_an_svg_master(library):
    for cid in ORIGINAL:
        m = library.character(cid)
        for part in m.rig.parts:
            for name, img in part.variants.items():
                assert img.svg and img.svg.endswith(".svg"), (cid, part.id, name)
        assert len(m.files_by_role("svg_master")) >= len([1 for p in m.rig.parts for _ in p.variants])


def test_upgraded_front_art_is_the_same_picture_as_version_one(library):
    for cid in ("monkey_001", "farmer_001", "lion_001"):
        v1, v2 = library.character(cid, 1), library.character(cid)
        d1, d2 = library.asset_dir(AssetType.character, cid, 1), library.asset_dir(AssetType.character, cid)
        for part in v1.rig.parts:
            for name, img in part.variants.items():
                a = np.asarray(Image.open(d1 / img.file).convert("RGBA"), dtype=float)
                new = v2.rig.part(part.id).variants[name]
                b = np.asarray(Image.open(d2 / new.file).convert("RGBA"), dtype=float)
                assert a.shape == b.shape and np.abs(a - b).mean() < 0.5, (cid, part.id, name)


def test_all_biped_family_characters_have_distinct_side_three_quarter_and_back_views(library):
    bipeds = [c for c in library.list_ids(AssetType.character) if library.character(c).rig.template == "biped_chibi"]
    assert len(bipeds) >= 113                       # 106 new + 7 original bipeds; the 6 reptiles use their own rigs
    for cid in bipeds:
        m = library.character(cid)
        assert set(m.views) == VIEWS, cid
        previews = {f.view: f.checksum for f in m.files_by_role("view")}
        assert {"front", *VIEWS} <= set(previews) and len(set(previews.values())) == 4, (cid, "views must be four different pictures")
        for name, view in m.views.items():
            assert all(img.svg for p in view.parts for img in p.variants.values()), (cid, name)
        assert library.verify(AssetType.character, cid) == []


@pytest.mark.parametrize("cid", ["monkey_001", "char-hum-0001", "char-ani-0003", "char-brd-0002"])
@pytest.mark.parametrize("view", ["side", "three_quarter", "back"])
def test_every_view_works_in_a_scene_with_existing_clips(composer, library, cid, view):
    ch = {"character_id": cid, "position": {"anchor": "center"}, "facing": "right", "state": "standing", "view": view}
    st = story([scene("s", [shot(seconds=2.0, characters=[ch], actions=[{"action_id": "w", "character_id": cid, "animation": "walk", "start_seconds": 0.1}])], environment="env-for-0001")],
               story_id="view_test", characters=(cid,))
    for c in st.characters:
        c.asset_version = library.character(cid).version
    plan, issues = composer.compose(st, "s")
    assert not [i for i in issues if i.severity == "error"], issues
    assert render_shot_frame(plan.shots[0], 10, 320, 180).size == (320, 180)
    parts = {s.id.split(".")[2] for s in plan.shots[0].sprites if s.id.startswith(f"char.{cid}.")}
    assert {"body", "head", "arm_l", "arm_r", "leg_l", "leg_r"} <= parts


def test_missing_view_is_reported_not_guessed(composer, library):
    ch = {"character_id": "monkey_001", "position": {"anchor": "center"}, "facing": "right", "state": "standing", "view": "back"}
    st = story([scene("s", [shot(characters=[ch])], environment="env-for-0001")], story_id="old_pin", characters=("monkey_001",))
    st.characters[0].asset_version = 1                                  # version 1 has no extra views
    from engine.common.errors import ValidationFailed
    with pytest.raises(ValidationFailed) as exc:
        composer.compose(st, "s")
    assert "no 'back' view" in json.dumps(exc.value.details)


def test_existing_stories_still_compose_with_the_upgraded_characters(composer, library):
    for path in sorted((ROOT / "stories").rglob("*.json")):
        if path.name in ("master_catalogue.json",) or ".auto" in path.name:
            continue
        data = json.loads(path.read_text(encoding="utf-8"))
        if "scenes" not in data:
            continue
        for c in data["characters"]:                                   # re-pin every character to its newest version
            c["asset_version"] = library.character(c["character_id"]).version
        st = parse_story(data)
        for sc in st.scenes:
            plan, issues = composer.compose(st, sc.scene_id)
            assert not [i for i in issues if i.severity == "error"], (path.name, sc.scene_id, issues)
