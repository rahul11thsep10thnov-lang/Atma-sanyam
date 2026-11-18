"""The acceptance register: completion counted from registered files, validated rigs and the research files; never from plans.

A character counts as having "four views" only when its manifest holds the primary view plus three other drawn angles; "15 expressions" and
"15 poses" mean the named sets in the manifest; "SVG masters" means every image of every rig (and view rig) names an SVG master that exists.
"""
from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from ..character_manager.registry import CharacterRegistry
from ..schema.assets import ApprovalStatus, AssetType
from .library import AssetLibrary

FACES = {"neutral", "happy", "sad", "angry", "surprised", "worried", "thinking", "laughing", "speaking", "crying", "frightened", "suspicious", "excited", "disappointed", "determined"}
POSES = {"standing", "walking", "running", "sitting", "sleeping", "jumping", "talking", "pointing", "waving", "fighting", "dancing", "kneeling", "falling", "climbing", "holding_object"}
ORIGINAL_PREFIX = "CHAR-ORG-"          # catalogue code given to the characters the library shipped with
VIEWS = {"front", "side", "three_quarter", "back"}


def _has_svg(rig) -> bool:
    return all(img.svg for p in rig.parts for img in p.variants.values())


def characters(lib: AssetLibrary) -> dict[str, Any]:
    reg = CharacterRegistry(lib)
    out = {"total": 0, "with_svg_masters": 0, "with_four_views": 0, "with_15_expressions": 0, "with_15_poses": 0, "with_validated_rigs": 0, "approved": 0, "pending": 0, "rejected": 0,
           "by_rig_template": {}, "originals": {}, "without_four_views": []}
    for cid in lib.list_ids(AssetType.character):
        m = lib.character(cid)
        out["total"] += 1
        svg = _has_svg(m.rig) and all(_has_svg(v) for v in m.views.values())
        primary = m.compatibility.get("primary_view", "front")
        angles = {primary, *m.views}
        four = VIEWS <= angles
        ok_rig = not reg.rig_issues(m) and not lib.verify(AssetType.character, cid)
        out["with_svg_masters"] += svg
        out["with_four_views"] += four
        out["with_15_expressions"] += FACES <= set(m.expressions)
        out["with_15_poses"] += POSES <= set(m.poses)
        out["with_validated_rigs"] += ok_rig
        out[{"approved": "approved", "pending": "pending", "rejected": "rejected"}[m.approval_status.value]] += 1
        out["by_rig_template"][m.rig.template] = out["by_rig_template"].get(m.rig.template, 0) + 1
        if not four:
            out["without_four_views"].append(cid)
        if (m.catalog_code or "").startswith(ORIGINAL_PREFIX):
            out["originals"][cid] = {"version": m.version, "svg_masters": svg, "four_views": four, "expressions_15": FACES <= set(m.expressions), "poses_15": POSES <= set(m.poses),
                                     "validated_rig": ok_rig, "v1_intact": not lib.verify(AssetType.character, cid, 1) if m.version > 1 else None, "approval": m.approval_status.value}
    out["original_nine_fully_upgraded"] = sum(1 for v in out["originals"].values() if v["version"] >= 2 and v["svg_masters"] and v["four_views"] and v["expressions_15"] and v["poses_15"] and v["validated_rig"])
    out["original_total"] = len(out["originals"])
    out["original_nine_upgraded_to_v2"] = sum(1 for v in out["originals"].values() if v["version"] >= 2)
    return out


def environments(lib: AssetLibrary) -> dict[str, Any]:
    out = {"total": 0, "wide": 0, "medium": 0, "closeup": 0, "with_complete_layer_files": 0, "with_validated_camera_and_anchors": 0, "approved": 0, "pending": 0, "rejected": 0,
           "wide_with_all_three_compositions": 0, "legacy_environments_without_variants": 0}
    groups: dict[str, set[str]] = {}
    for eid in lib.list_ids(AssetType.environment):
        m = lib.environment(eid)
        out["total"] += 1
        comp = m.compatibility.get("composition", "wide")
        out[comp if comp in ("wide", "medium", "closeup") else "wide"] += 1
        groups.setdefault(m.compatibility.get("composition_group", eid), set()).add(comp)
        out["with_complete_layer_files"] += not lib.verify(AssetType.environment, eid) and all(l.svg for l in m.layers)
        x0, y0, x1, y1 = m.camera_bounds
        out["with_validated_camera_and_anchors"] += bool(m.anchors) and all(("offstage" in n) or (x0 <= a.x <= x1 and y0 <= a.y <= y1) for n, a in m.anchors.items()) and x1 > x0
        out[m.approval_status.value] += 1
    out["wide_with_all_three_compositions"] = sum(1 for g in groups.values() if {"wide", "medium", "closeup"} <= g)
    out["legacy_environments_without_variants"] = sum(1 for g, c in groups.items() if c == {"wide"} and not g.startswith("env-"))
    out["wide_without_variants"] = sum(1 for g, c in groups.items() if c == {"wide"})
    return out


def rigs(lib: AssetLibrary, root: Path) -> dict[str, Any]:
    templates = lib.rig_templates()
    by: dict[str, list[str]] = {}
    for cid in lib.list_ids(AssetType.character):
        by.setdefault(lib.character(cid).rig.template, []).append(cid)
    results = {}
    f = root / "docs" / "generated" / "rig_test_results.json"
    if f.exists():
        results = json.loads(f.read_text(encoding="utf-8"))
    rows = {"biped_chibi": "Biped", "quadruped_reptile": "Quadruped reptile", "chelonian": "Turtle / tortoise", "serpentine_reptile": "Serpentine reptile"}
    return {"rigs": [{"template": t, "label": label, "defined": t in templates, "characters": len(by.get(t, []))} for t, label in rows.items()] +
                    [{"template": "quadruped_mammal", "label": "Quadruped mammal", "defined": False, "characters": 0, "note": "not built: mammals use the biped chibi rig"}],
            "rig_test_results": results}


def research(root: Path) -> dict[str, Any]:
    f = root / "stories" / "research" / "register.json"
    if not f.exists():
        return {"available": False}
    r = json.loads(f.read_text(encoding="utf-8"))
    cols = r["collections"]
    return {"available": True, "collections_total": len(cols), "collections_with_a_consulted_source": sum(1 for c in cols if c["sources_consulted"]), **r["totals"],
            "regions": {s: sum(1 for x in r["regional_register"] if x["status"] == s) for s in {x["status"] for x in r["regional_register"]}},
            "gaps": [{"collection": c["name"], "gap": c["research_gaps"]} for c in cols if c["research_gaps"]]}


def compute(lib: AssetLibrary, root: Path) -> dict[str, Any]:
    return {"characters": characters(lib), "environments": environments(lib), "rigs": rigs(lib, root), "story_research": research(root)}
