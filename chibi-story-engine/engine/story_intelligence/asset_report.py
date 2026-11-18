"""Which library assets a story needs, which are matched, which are missing, and what could be used instead.

Built from the existing analysis and the existing matching rules (`StoryboardBuilder`), so what is reported is what a storyboard would do.
Nothing here invents assets: a requirement with no match is reported as missing, with the closest candidates the library has.
"""
from __future__ import annotations

from typing import Any

from ..asset_manager.index import LibraryIndex
from .models import StoryAnalysis
from .storyboard import StoryboardBuilder

PROP_TAGS = ("jamun", "fruit", "food", "money", "dye")


def build_asset_report(analysis: StoryAnalysis, index: LibraryIndex, *, character_overrides: dict[str, str] | None = None,
                       environment_overrides: dict[str, str] | None = None, candidates: int = 4) -> dict[str, Any]:
    builder = StoryboardBuilder(index)
    co, eo = character_overrides or {}, environment_overrides or {}
    chars_out, missing = [], []
    by_key = {}
    for ent in analysis.entities:
        if ent.kind != "character":
            continue
        cid = co.get(ent.key) or ent.matched_asset_id
        entry = index.character(cid) if cid else None
        row = {"key": ent.key, "name": ent.display_name, "species": ent.species, "matched": entry.id if entry else None,
               "overridden": ent.key in co and entry is not None, "candidates": [c for c in ent.candidate_asset_ids if c != (entry.id if entry else None)][:candidates],
               "rig_template": entry.rig_template if entry else None, "expressions_available": len(entry.expressions) if entry else 0,
               "poses_available": len(entry.poses) if entry else 0, "approved": entry.approved if entry else None}
        chars_out.append(row)
        by_key[ent.key] = entry
        if entry is None:
            missing.append({"kind": "character", "key": ent.key, "needed_for": ent.display_name,
                            "reason": f"no character in the library is known as '{ent.display_name}'"})
    scenes = []
    for sa in analysis.scenes:
        sid = f"scene_{sa.index:02d}"
        present = [by_key[k] for k in sa.characters if by_key.get(k) is not None]
        habitats = {c.habitat for c in present}
        ranked = builder.rank_environments(list(sa.location_tags), habitats, candidates + 1)
        override = eo.get(sid)
        chosen = index.environment(override) if override else None
        if chosen is None and ranked:
            chosen = ranked[0][1]
        emotions = sorted({b.emotion for b in sa.beats if b.emotion != "neutral"} | {e for b in sa.beats for e in b.emotions.values()})
        semantics = sorted({a.semantic for b in sa.beats for a in b.actions})
        rigs = {c.rig_template for c in present}
        anim_rows, anim_missing = [], []
        for sem in semantics:
            found = {r: (index.animation_for(sem, r).code if index.animation_for(sem, r) else None) for r in rigs}
            anim_rows.append({"semantic": sem, "by_rig": found})
            for r, code in found.items():
                if code is None:
                    anim_missing.append({"semantic": sem, "rig": r})
        lacking_expr = sorted({e for c in present for e in emotions if e not in c.expressions})
        env_row = {"tags": list(sa.location_tags), "chosen": chosen.id if chosen else None, "chosen_name": chosen.name if chosen else None,
                   "overridden": bool(override and chosen and override == chosen.id),
                   "candidates": [{"id": e.id, "name": e.name, "score": round(sc, 3), "category": e.category} for sc, e in ranked if not chosen or e.id != chosen.id][:candidates]}
        if chosen is None:
            missing.append({"kind": "environment", "key": ",".join(sa.location_tags) or "unknown", "needed_for": sid,
                            "reason": f"no environment matches the location tags {list(sa.location_tags) or []}"})
        props = [t for t in PROP_TAGS if any(t in (a.prop or "") for b in sa.beats for a in b.actions)]
        prop_rows = []
        for t in props:
            p = index.by_tag(index.props, t)
            prop_rows.append({"tag": t, "matched": p.id if p else None})
            if p is None:
                missing.append({"kind": "prop", "key": t, "needed_for": sid, "reason": f"no prop is tagged '{t}'"})
        for m in anim_missing:
            missing.append({"kind": "animation", "key": m["semantic"], "needed_for": sid, "reason": f"no clip for '{m['semantic']}' on rig {m['rig']}"})
        for e in lacking_expr:
            missing.append({"kind": "expression", "key": e, "needed_for": sid, "reason": f"a character in {sid} has no '{e}' expression"})
        scenes.append({"scene_id": sid, "title": sa.title, "characters": sa.characters, "environment": env_row, "expressions_needed": emotions,
                       "expressions_missing": lacking_expr, "animations": anim_rows, "props": prop_rows})
    return {"characters": chars_out, "scenes": scenes, "missing": missing, "complete": not missing}
