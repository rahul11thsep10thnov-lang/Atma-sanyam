"""Build stories/master_catalogue.json and docs/generated/story_asset_coverage.md from tools/catalogue/data.py and the real library.

Asset coverage is *computed* by running the engine's own matching (aliases for characters, tag overlap for environments, props by tag,
clips by semantic and rig) against the shipped asset_library. Nothing is hand-marked as available.
"""
from __future__ import annotations

import json
from pathlib import Path

from engine.asset_manager.index import norm_name
from engine.asset_manager.library import AssetLibrary
from engine.story_intelligence.storyboard import StoryboardBuilder

from .data import COLLECTIONS, EXCLUDED, STORIES

ROOT = Path(__file__).resolve().parents[2]
STORY_FILES = {"monkey_and_crocodile": "stories/panchatantra/monkey_and_crocodile.json", "blue_jackal": "stories/panchatantra/blue_jackal.json",
               "lion_and_clever_rabbit": "stories/panchatantra/lion_and_clever_rabbit.json", "farmer_and_rich_man": "stories/original/farmer_and_rich_man.json"}


def build(library: AssetLibrary | None = None) -> dict:
    lib = library or AssetLibrary(ROOT / "asset_library")
    idx = lib.index()
    names: dict[str, list[str]] = {}
    for c in idx.characters:
        for n in c.names() | {norm_name(c.species)}:
            names.setdefault(n, []).append(c.id)
    builder = StoryboardBuilder(idx)
    out_collections, totals = [], {"stories": 0, "implemented": 0, "fully_covered": 0}
    all_missing: dict[str, set[str]] = {"character": set(), "environment": set(), "prop": set(), "animation": set()}
    for ckey, meta in COLLECTIONS.items():
        stories = []
        for (sid, ten, thi, premise, chars, locs, props, acts, emos) in STORIES.get(ckey, []):
            cmatch, cmiss = {}, []
            for ch in chars:
                hits = names.get(norm_name(ch)) or names.get(norm_name(ch.replace("_", " ")))
                if hits:
                    cmatch[ch] = hits[:3]
                else:
                    cmiss.append(ch)
            ranked = builder.rank_environments(locs, set(), 3)
            env_best = ranked[0][1].id if ranked else None
            pmiss = [p for p in props if not idx.by_tag(idx.props, p)]
            rigs = {idx.character(v[0]).rig_template for v in cmatch.values()} or {"biped_chibi"}
            amiss = sorted({f"{a}@{r}" for a in acts for r in rigs if not idx.animation_for(a, r)})
            missing = {"characters": cmiss, "environment": [] if env_best else locs, "props": pmiss, "animations": amiss}
            covered = not any(missing.values())
            for k, key in (("characters", "character"), ("props", "prop"), ("animations", "animation")):
                all_missing[key].update(missing[k])
            if not env_best:
                all_missing["environment"].update(locs)
            stories.append({"id": sid, "title_en": ten, "title_hi": thi, "premise": premise, "source_verified": sid in STORY_FILES and False,
                            "implemented": sid in STORY_FILES, "story_file": STORY_FILES.get(sid),
                            "needs": {"characters": chars, "location_tags": locs, "props": props, "actions": acts, "expressions": emos},
                            "matched": {"characters": cmatch, "environment": env_best, "environment_candidates": [e.id for _, e in ranked]},
                            "missing": missing, "fully_covered": covered})
            totals["stories"] += 1
            totals["implemented"] += sid in STORY_FILES
            totals["fully_covered"] += covered
        out_collections.append({"id": ckey, **meta, "tracked_stories": len(stories), "complete_collection": False, "stories": stories})
    return {"catalogue_version": 1, "provenance": "Seed list written from general knowledge; every entry is unverified against a source (source_verified=false). "
                                                  "No collection is claimed to be fully catalogued.", "totals": totals,
            "unmatched_needs": {k: sorted(v) for k, v in all_missing.items()}, "excluded": EXCLUDED, "collections": out_collections}


def to_markdown(cat: dict) -> str:
    lines = ["# Story catalogue: asset coverage", "", f"Generated from the real library by `tools/catalogue/build_catalogue.py`. {cat['provenance']}", "",
             f"- Tracked stories: **{cat['totals']['stories']}** (implemented as Story Definitions: {cat['totals']['implemented']})",
             f"- Stories whose every required character / location / prop / animation matched the library: **{cat['totals']['fully_covered']}**", ""]
    for c in cat["collections"]:
        lines += [f"## {c['name']}", f"_{c['origin']}_  \nTracked: {c['tracked_stories']} (collection not fully catalogued)", ""]
        if c["stories"]:
            lines += ["| Story | Implemented | Characters missing | Environment | Props missing | Animations missing |", "|---|---|---|---|---|---|"]
            for s in c["stories"]:
                m = s["missing"]
                lines.append(f"| {s['title_en']} | {'yes' if s['implemented'] else 'no'} | {', '.join(m['characters']) or '-'} | {s['matched']['environment'] or 'MISSING'} | {', '.join(m['props']) or '-'} | {', '.join(m['animations']) or '-'} |")
            lines.append("")
    lines += ["## Excluded", ""] + [f"- **{e['title']}**: {e['reason']}" for e in cat["excluded"]]
    lines += ["", "## Needs the library cannot meet yet", ""] + [f"- {k}: {', '.join(v) or 'none'}" for k, v in cat["unmatched_needs"].items()]
    return "\n".join(lines) + "\n"


def main() -> None:
    cat = build()
    (ROOT / "stories" / "master_catalogue.json").write_text(json.dumps(cat, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    (ROOT / "docs" / "generated").mkdir(parents=True, exist_ok=True)
    (ROOT / "docs" / "generated" / "story_asset_coverage.md").write_text(to_markdown(cat), encoding="utf-8")
    print(json.dumps(cat["totals"]), json.dumps(cat["unmatched_needs"], ensure_ascii=False))


if __name__ == "__main__":
    main()
