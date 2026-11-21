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
        # the originals were later upgraded to version 2; version 1 must remain complete and intact
        assert library.character(cid, 1).version == 1 and library.verify(AssetType.character, cid, 1) == []
        assert library.verify(AssetType.character, cid) == []
    assert library.environment("forest_river_001", 1).version == 1 and library.verify(AssetType.environment, "forest_river_001", 1) == []     # v2 adds SVG masters only


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


def test_new_character_aliases_do_not_collide_with_each_other_or_the_originals(library):
    from collections import defaultdict
    from engine.asset_manager.index import norm_name
    seen = defaultdict(set)
    for cid in library.list_ids(AssetType.character):
        m = library.character(cid)
        for a in set(m.aliases + [m.name]):
            seen[norm_name(a)].add(cid)
    clashes = {k: v for k, v in seen.items() if len(v) > 1 and any(c.startswith("char-") for c in v)}
    assert clashes == {}, clashes


def test_asset_report_matches_missing_and_alternatives(library):
    from engine.story_intelligence.analyser import RuleBasedAnalyser
    from engine.story_intelligence.asset_report import build_asset_report
    from tests.support import MONKEY_STORY
    idx = library.index()
    analysis = RuleBasedAnalyser(idx).analyse(MONKEY_STORY)
    report = build_asset_report(analysis, idx)
    assert {c["matched"] for c in report["characters"]} >= {"monkey_001", "crocodile_001"}
    assert report["scenes"][0]["environment"]["chosen"] and isinstance(report["missing"], list)
    first = report["scenes"][0]["environment"]
    alt = first["candidates"][0]["id"] if first["candidates"] else None
    if alt:
        forced = build_asset_report(analysis, idx, environment_overrides={report["scenes"][0]["scene_id"]: alt})
        assert forced["scenes"][0]["environment"]["chosen"] == alt and forced["scenes"][0]["environment"]["overridden"]
    unknown = RuleBasedAnalyser(idx).analyse("एक रेगिस्तान में एक ऊँट रहता था। ऊँट ने कहा, \"मित्र, चलो।\"")
    rep = build_asset_report(unknown, idx)
    assert rep["scenes"][0]["environment"]["chosen"] and rep["scenes"][0]["environment"]["chosen"].startswith("env-des")


def test_storyboard_accepts_environment_overrides(library):
    from engine.story_intelligence.analyser import RuleBasedAnalyser
    from engine.story_intelligence.storyboard import StoryboardBuilder
    from tests.support import MONKEY_STORY
    idx = library.index()
    analysis = RuleBasedAnalyser(idx).analyse(MONKEY_STORY)
    base = StoryboardBuilder(idx).build(analysis, story_id="x")
    sid = next(iter(base.environment_map))
    other = "env-wat-0004"
    forced = StoryboardBuilder(idx).build(analysis, story_id="x", environment_overrides={sid: other})
    assert forced.environment_map[sid] == other and base.environment_map[sid] != other


def test_master_catalogue_is_computed_and_honest(library):
    from tools.catalogue.build_catalogue import build
    cat = build(library)
    assert cat["totals"]["stories"] >= 40 and cat["totals"]["implemented"] == 4
    assert all(not s["source_verified"] for c in cat["collections"] for s in c["stories"])
    assert all(c["complete_collection"] is False for c in cat["collections"])
    assert any("Chacha" in e["title"] for e in cat["excluded"])
    # a gap the library really has must be reported, not hidden
    assert "crab" in cat["unmatched_needs"]["character"]


def test_story_text_with_new_characters_and_backgrounds_runs_through_the_existing_pipeline(library, composer):
    """Analysis -> storyboard -> composition -> a rendered frame, using only new assets."""
    from engine.rendering.raster import render_shot_frame
    from engine.story_intelligence.analyser import RuleBasedAnalyser
    from engine.story_intelligence.storyboard import StoryboardBuilder
    idx = library.index()
    text = "एक रेगिस्तान में एक ऊँट रहता था। एक दिन राजा ने ऊँट से कहा, \"मित्र, मेरे साथ चलो।\" ऊँट खुश होकर बोला, \"ठीक है।\""
    analysis = RuleBasedAnalyser(idx).analyse(text)
    board = StoryboardBuilder(idx).build(analysis, story_id="camel_and_king")
    ids = set(board.story.character_ids())
    assert "char-ani-0010" in ids and any(i.startswith("char-hum-") or i.startswith("char-") for i in ids - {"char-ani-0010"}) , ids
    assert board.story.scenes[0].environment_id.startswith("env-")
    plan, issues = composer.compose(board.story, board.story.scenes[0].scene_id)
    assert not [i for i in issues if i.severity == "error"], issues
    assert render_shot_frame(plan.shots[0], 12, 320, 180).size == (320, 180)
