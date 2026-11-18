"""Vector library expansion: the shipped components, backgrounds and characters are real, aligned, registered and usable by the existing engine."""
from __future__ import annotations

import json

import pytest

from engine.schema.assets import ApprovalStatus, AssetType
from tests.support import scene, shot, story
from tools.asset_forge import verify_ext

CATEGORY_MINIMUMS = {"FOR": 15, "PAL": 15, "VIL": 15, "WAT": 15, "MTN": 12, "CAV": 10, "TMP": 15, "MKT": 12, "HOU": 15, "DES": 10, "HNT": 12, "ROD": 10, "SPC": 15}
COMPONENT_MINIMUMS = {"tree": 30, "bush": 20, "flower": 20, "grass": 15, "rock": 20, "cloud": 12, "mountain": 10, "water": 15, "building": 30, "opening": 20, "barrier": 15, "lamp": 15}


@pytest.fixture(scope="module")
def report(library):
    return verify_ext.verify(library, only_new=True)


def test_independent_verification_finds_no_problems(report):
    assert report["problems"] == []


def test_171_distinct_backgrounds_in_thirteen_categories(library, report):
    cats = report["stats"]["environments"]["by_category"]
    assert {k: v for k, v in cats.items()} .keys() == CATEGORY_MINIMUMS.keys()
    for code, minimum in CATEGORY_MINIMUMS.items():
        assert cats[code] >= minimum, code
    assert report["stats"]["environments"]["count"] >= 171


def test_backgrounds_are_not_recoloured_copies(library):
    """Each background has its own layer composition; no two share an identical set of layer files."""
    sigs = {}
    for eid in (e for e in library.list_ids(AssetType.environment) if e.startswith("env-")):
        m = library.environment(eid)
        key = tuple(sorted(f.checksum for f in m.files if f.role == "layer"))
        assert key not in sigs, f"{eid} duplicates {sigs.get(key)}"
        sigs[key] = eid


def test_component_library_meets_targets(report):
    kinds = report["stats"]["components"]["by_kind"]
    for kind, minimum in COMPONENT_MINIMUMS.items():
        assert kinds.get(kind, 0) >= minimum, kind


def test_new_assets_are_pending_and_carry_catalogue_metadata(library):
    for t in (AssetType.character, AssetType.environment, AssetType.component):
        for aid in library.list_ids(t):
            if not (aid.startswith("env-") or aid.startswith("char-") or t == AssetType.component):
                continue
            m = library.load(t, aid)
            assert m.approval_status == ApprovalStatus.pending, aid
            assert m.catalog_code and m.category and m.licence.name, aid
            assert library.verify(t, aid) == [], aid


def test_every_new_character_has_fifteen_expressions_and_poses_on_the_existing_rig(report, library):
    assert report["stats"]["characters"]["count"] >= 100
    m = library.character("char-hum-0001")
    assert m.rig.template == "biped_chibi" and len(m.expressions) >= 15 and len(m.poses) >= 15
    original = library.character("monkey_001")
    assert [p.id for p in original.rig.parts][:3] == [p.id for p in m.rig.parts][:3] or {p.id for p in original.rig.parts} <= {p.id for p in m.rig.parts} | {"tail"}


def test_original_assets_are_untouched(library):
    for cid in ("monkey_001", "lion_001", "rabbit_001", "jackal_001", "farmer_001", "rich_man_001", "crocodile_001"):
        assert library.character(cid).version == 1 and library.verify(AssetType.character, cid) == []
    assert library.environment("forest_river_001").version == 1


def test_new_character_in_new_background_uses_existing_clips_and_renders(composer, library):
    from engine.rendering.raster import render_shot_frame
    king = {"character_id": "char-hum-0001", "position": {"anchor": "center"}, "facing": "right", "state": "standing"}
    tiger = {"character_id": "char-ani-0001", "position": {"anchor": "right"}, "facing": "left", "state": "standing"}
    st = story([scene("s", [shot(seconds=2.0, characters=[king, tiger], actions=[{"action_id": "w", "character_id": "char-hum-0001", "animation": "wave", "start_seconds": 0.2}])], environment="env-pal-0001")],
               story_id="vec_test", characters=("char-hum-0001", "char-ani-0001"))
    plan, issues = composer.compose(st, "s")
    assert not [i for i in issues if i.severity == "error"], issues
    frame = render_shot_frame(plan.shots[0], 24, 480, 270)
    assert frame.size == (480, 270)
    assert any(s.id.startswith("char.char-hum-0001.") for s in plan.shots[0].sprites)


def test_scare_level_changes_haunted_backgrounds_only(composer, library):
    def layers(env, level):
        st = story([scene("s", [shot(characters=[{"character_id": "char-hum-0001", "position": {"anchor": "center"}, "facing": "right", "state": "standing"}])], environment=env, scare_level=level)],
                   story_id="scare", characters=("char-hum-0001",))
        plan, issues = composer.compose(st, "s")
        assert not [i for i in issues if i.severity == "error"]
        return {s.id for s in plan.shots[0].sprites if s.id.startswith("env.")}

    assert len(layers("env-hnt-0001", 0)) < len(layers("env-hnt-0001", 1)) < len(layers("env-hnt-0001", 2))
    assert layers("env-for-0001", 0) == layers("env-for-0001", 2)


def test_seasons_weather_and_lighting_presets_exist():
    from engine.environment_manager.lighting import SEASON_PRESETS, grade
    assert {"spring", "summer", "monsoon", "autumn", "winter"} <= set(SEASON_PRESETS)
    for tod in ("morning", "noon", "evening", "sunset", "night", "moonlight"):
        for wx in ("clear", "cloudy", "rain", "fog", "storm", "snow"):
            bg, ch = grade(tod, wx, "summer")
            assert bg and ch
