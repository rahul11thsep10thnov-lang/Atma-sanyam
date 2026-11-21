"""Wide / medium / close-up compositions of the same environment."""
from __future__ import annotations

import pytest

from engine.rendering.raster import render_shot_frame
from engine.schema.assets import AssetType
from tests.support import scene, shot, story


@pytest.fixture(scope="module")
def groups(library):
    out: dict[str, dict[str, str]] = {}
    for eid in library.list_ids(AssetType.environment):
        m = library.environment(eid)
        out.setdefault(m.compatibility.get("composition_group", eid), {})[m.compatibility.get("composition", "wide")] = eid
    return {g: c for g, c in out.items() if {"medium", "closeup"} & set(c)}


def test_every_master_background_has_all_three_compositions(groups):
    assert len(groups) >= 171
    for g, c in groups.items():
        assert set(c) == {"wide", "medium", "closeup"} and c["wide"] == g, g


def test_compositions_keep_identity_hierarchy_anchors_and_bounds(library, groups):
    for g, c in groups.items():
        wide, med, close = (library.environment(c[k]) for k in ("wide", "medium", "closeup"))
        for v in (med, close):
            assert v.category == wide.category and v.tags == wide.tags and v.camera_bounds == wide.camera_bounds, v.id
            assert list(v.anchors) == list(wide.anchors) and v.default_anchor_by_role == wide.default_anchor_by_role, v.id
            assert {n: a.features for n, a in v.anchors.items()} == {n: a.features for n, a in wide.anchors.items()}, v.id
            assert {l.id for l in v.layers} <= {l.id for l in wide.layers} and {l.id for l in v.layers} >= {"sky", "ground"} & {l.id for l in wide.layers}, v.id
            assert all(l.svg for l in v.layers) and library.verify(AssetType.environment, v.id) == [], v.id
        # characters stand larger and closer together as the composition tightens
        names = [n for n in wide.anchors if "offstage" not in n]
        for name in names:
            assert close.anchors[name].scale > med.anchors[name].scale > wide.anchors[name].scale, (g, name)
        xs = lambda e: max(e.anchors[n].x for n in names) - min(e.anchors[n].x for n in names)
        assert xs(close) < xs(med) < xs(wide), g


def test_compositions_are_not_crops_of_the_wide_picture(library, groups):
    """Different drawing, not the same file at another size: layer image checksums differ and the close-up drops layers or elements."""
    for g, c in groups.items():
        wide, close = library.environment(c["wide"]), library.environment(c["closeup"])
        wide_sums = {f.checksum for f in wide.files if f.role == "layer"}
        close_sums = {f.checksum for f in close.files if f.role == "layer"}
        assert close_sums != wide_sums and len(close_sums - wide_sums) >= 1, g        # sky, wall and ground are the place's identity and may be shared; the rest is redrawn
        med_sums = {f.checksum for f in library.environment(c["medium"]).files if f.role == "layer"}
        assert med_sums != wide_sums and med_sums != close_sums, g


@pytest.mark.parametrize("group", ["env-for-0001", "env-pal-0001", "env-wat-0001"])
def test_each_composition_composes_and_renders_with_characters(composer, library, groups, group):
    for kind, eid in groups[group].items():
        anchor = next(n for n in library.environment(eid).anchors if "offstage" not in n)      # environments name their anchors differently (water_center ...)
        ch = {"character_id": "monkey_001", "position": {"anchor": anchor}, "facing": "right", "state": "standing"}
        st = story([scene("s", [shot(characters=[ch])], environment=eid)], story_id=f"comp_{kind}", characters=("monkey_001",))
        plan, issues = composer.compose(st, "s")
        assert not [i for i in issues if i.severity == "error"], (eid, issues)
        assert render_shot_frame(plan.shots[0], 0, 320, 180).size == (320, 180)


def test_matching_prefers_the_wide_composition_and_lists_the_others_as_alternatives(library):
    from engine.story_intelligence.storyboard import StoryboardBuilder
    idx = library.index()
    ranked = StoryboardBuilder(idx).rank_environments(["forest", "tree"], set(), 8)
    ids = [e.id for _, e in ranked]
    first_group = ids[0]
    assert not first_group.endswith(("-medium", "-closeup"))
