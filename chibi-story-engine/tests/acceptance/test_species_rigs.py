"""Species-specific reptile rigs: they validate, animate through the existing pipeline, and stay connected while they move."""
from __future__ import annotations

import pytest

from engine.character_manager.registry import CharacterRegistry
from engine.rendering.raster import render_shot_frame
from engine.schema.assets import AssetType
from tests.support import scene, shot, story

CASES = {
    "crocodile_001": ("quadruped_reptile", ["reptile_walk_articulated", "reptile_run_articulated", "reptile_crawl", "reptile_turn", "reptile_rest", "crocodile_jaw_open", "crocodile_walk"], "standing"),
    "char-ani-0028": ("quadruped_reptile", ["reptile_walk_articulated", "reptile_crawl", "reptile_turn", "reptile_rest"], "standing"),
    "char-ani-0025": ("chelonian", ["chelonian_walk", "chelonian_crawl", "chelonian_rest", "chelonian_retract_head"], "standing"),
    "char-ani-0026": ("chelonian", ["chelonian_walk", "chelonian_crawl", "chelonian_rest", "chelonian_retract_head"], "standing"),
    "char-ani-0027": ("serpentine_reptile", ["serpent_slither", "serpent_coil", "serpent_rear_up", "serpent_strike", "serpent_tongue_flick"], "standing"),
}


def _plan(composer, cid, clip, state="standing", seconds=2.0):
    ch = {"character_id": cid, "position": {"anchor": "center"}, "facing": "right", "state": state}
    st = story([scene("s", [shot(seconds=seconds, characters=[ch], actions=[{"action_id": "a", "character_id": cid, "animation": clip, "start_seconds": 0.1}])], environment="env-for-0001")],
               story_id="rig_test", characters=(cid,))
    for c in st.characters:                                   # a new story pins the current version, as the storyboard builder does
        c.asset_version = composer.library.character(c.character_id).version
    plan, issues = composer.compose(st, "s")
    return plan, [i for i in issues if i.severity == "error"]


@pytest.mark.parametrize("cid", list(CASES))
def test_species_rig_is_valid_and_not_biped(library, cid):
    m = library.character(cid)
    template = CASES[cid][0]
    assert m.rig.template == template and m.rig.template != "biped_chibi"
    assert CharacterRegistry(library).rig_issues(m) == []
    assert len(m.expressions) >= 15 and len(m.poses) >= 15
    assert library.verify(AssetType.character, cid) == []
    assert m.compatibility["primary_view"] == "side"


@pytest.mark.parametrize("cid", list(CASES))
def test_clips_run_without_errors_and_parts_stay_attached(composer, library, cid):
    m = library.character(cid)
    parents = {p.id: p.parent for p in m.rig.parts if p.variants}
    by_id = {p.id: p for p in m.rig.parts}

    def box(tracks, pid, f):
        """Bounds of the part's visible images at frame f (a part can have several variant images, only one shown)."""
        pts = [t.bounds(f) for t in tracks.get(pid, []) if t.opacity[f] > 0]
        return (min(p[0] for p in pts), min(p[1] for p in pts), max(p[2] for p in pts), max(p[3] for p in pts)) if pts else None

    for clip in CASES[cid][1]:
        plan, errors = _plan(composer, cid, clip)
        assert not errors, (cid, clip, errors)
        tracks: dict[str, list] = {}
        for s in plan.shots[0].sprites:
            if s.id.startswith(f"char.{cid}."):
                tracks.setdefault(s.id.split(".")[2], []).append(s)
        for f in range(0, plan.shots[0].n_frames, 4):
            for pid, parent in parents.items():
                a = box(tracks, pid, f)
                while parent is not None and box(tracks, parent, f) is None:        # a hidden ancestor: attach to the next visible one
                    parent = by_id[parent].parent
                if a is None or parent is None:
                    continue
                b = box(tracks, parent, f)
                gap_x, gap_y = max(a[0] - b[2], b[0] - a[2], 0), max(a[1] - b[3], b[1] - a[3], 0)
                assert gap_x < 4 and gap_y < 4, f"{cid} {clip} frame {f}: '{pid}' is separated from '{parent}' by ({gap_x:.0f}, {gap_y:.0f})"


@pytest.mark.parametrize("cid", list(CASES))
def test_frames_render(composer, cid):
    clip = CASES[cid][1][0]
    plan, errors = _plan(composer, cid, clip)
    assert not errors
    assert render_shot_frame(plan.shots[0], 12, 320, 180).size == (320, 180)


def test_head_retracts_and_extends(composer, library):
    plan, _ = _plan(composer, "char-ani-0025", "chelonian_retract_head", seconds=1.6)
    head = next(s for s in plan.shots[0].sprites if s.id.startswith("char.char-ani-0025.head."))
    xs = [head.bounds(f)[0] for f in range(plan.shots[0].n_frames)]
    assert xs[0] - min(xs) > 40, "the head did not move back into the shell"
    plan2, errs = _plan(composer, "char-ani-0025", "chelonian_extend_head", state="retracted", seconds=1.6)
    assert not errs


def test_old_crocodile_version_still_loads_and_animates(composer, library):
    m = library.character("crocodile_001", 1)
    assert m.version == 1 and not m.rig.part("chest")
    ch = {"character_id": "crocodile_001", "position": {"anchor": "center"}, "facing": "right", "state": "standing"}
    st = story([scene("s", [shot(seconds=1.5, characters=[ch], actions=[{"action_id": "a", "character_id": "crocodile_001", "animation": "crocodile_walk"}])], environment="env-for-0001")],
               story_id="old_croc", characters=("crocodile_001",))
    st.characters[0].asset_version = 1
    plan, issues = composer.compose(st, "s")
    assert not [i for i in issues if i.severity == "error"]
