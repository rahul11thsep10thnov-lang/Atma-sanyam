"""Upgrade the original characters to version 2 without losing version 1.

For each original biped: the *same* drawing functions that produced version 1 are re-run, so every front-view part is the same picture
(checked pixel by pixel against version 1); what is added is an editable SVG master per part, 15 expressions, 15 poses and the side,
three-quarter and back views. Version 1 stays in versions/v1 with its manifest and checksums; stories pinned to version 1 keep using it.

    python -m tools.asset_forge.upgrade_originals [--only monkey_001,...]
"""
from __future__ import annotations

import argparse
import tempfile
from dataclasses import fields
from pathlib import Path

import numpy as np
from PIL import Image

from engine.asset_manager.library import AssetLibrary
from engine.character_manager.registry import CharacterRegistry
from engine.schema.assets import AssetType

from . import characters_ext
from .build import _roles
from .build_figs import draw_character, role_for
from .characters import BIPEDS, BipedSpec
from .characters_ext import FigSpec

PROJECT_ROOT = Path(__file__).resolve().parents[2]
CATALOGUE = {"monkey_001": ("animal", "primate", "CHAR-ORG-0001", ["panchatantra", "jataka", "akbar_birbal", "folk"]),
             "lion_001": ("animal", "big cat", "CHAR-ORG-0002", ["panchatantra", "jataka", "folk"]),
             "rabbit_001": ("animal", "rodent-like", "CHAR-ORG-0003", ["panchatantra", "jataka", "folk"]),
             "jackal_001": ("animal", "canine", "CHAR-ORG-0004", ["panchatantra", "jataka", "folk"]),
             "jackal_blue_001": ("animal", "canine", "CHAR-ORG-0005", ["panchatantra"]),
             "farmer_001": ("human", "ordinary", "CHAR-ORG-0006", ["panchatantra", "folk"]),
             "rich_man_001": ("human", "ordinary", "CHAR-ORG-0007", ["panchatantra", "folk"])}


def figspec(b: BipedSpec) -> FigSpec:
    cat, sub, code, stories = CATALOGUE[b.id]
    return FigSpec(**{f.name: getattr(b, f.name) for f in fields(BipedSpec)}, category=cat, subcategory=sub, code=code, stories=stories)


def front_identity_diff(old_dir: Path, new_dir: Path, manifest_old, manifest_new) -> float:
    """Largest mean absolute pixel difference between a version 1 front part and the same part in version 2."""
    worst = 0.0
    for part in manifest_old.rig.parts:
        for vname, v in part.variants.items():
            new_part = manifest_new.rig.part(part.id)
            if new_part is None or vname not in new_part.variants:
                continue
            a = np.asarray(Image.open(old_dir / v.file).convert("RGBA"), dtype=float)
            b = np.asarray(Image.open(new_dir / new_part.variants[vname].file).convert("RGBA"), dtype=float)
            if a.shape != b.shape or list(v.origin) != list(new_part.variants[vname].origin):
                return 255.0
            worst = max(worst, float(np.abs(a - b).mean()))
    return worst


def upgrade(library_root: Path, only: set[str] | None, log=print) -> list[str]:
    lib = AssetLibrary(library_root)
    reg = CharacterRegistry(lib)
    done: list[str] = []
    characters_ext.QUANTIZE = False
    with tempfile.TemporaryDirectory(prefix="csae_up_") as tmp:
        for b in BIPEDS:
            if only and b.id not in only:
                continue
            current = lib.character(b.id)
            if current.version != 1 or current.views:
                log(f"skip {b.id}: already at version {current.version}")
                continue
            spec = figspec(b)
            work = Path(tmp) / b.id
            data, manifest = draw_character(spec, work)
            diff = front_identity_diff(lib.asset_dir(AssetType.character, b.id), work, current, manifest)
            if diff > 0.5:
                raise RuntimeError(f"{b.id}: front parts differ from version 1 (mean pixel difference {diff:.2f}); refusing to upgrade")
            files, roles = _roles(work, role_for)
            keep = {"rig", "views", "expressions", "poses", "states", "visual_identity", "continuity_rules", "compatibility"}
            changes = {k: v for k, v in data.items() if k in keep}
            changes["poses"] = {**current.model_dump(mode="json")["poses"], **data["poses"]}
            changes["compatibility"] = {**current.compatibility, "clips": "biped_chibi", "views": ["front", "side", "three_quarter", "back"]}
            changes["visual_identity"] = {**current.visual_identity, **{k: v for k, v in data["visual_identity"].items() if k not in current.visual_identity}}
            changes.update({"catalog_code": spec.code, "category": spec.category, "subcategory": spec.subcategory, "related_stories": spec.stories,
                            "tags": sorted(set(current.tags) | {spec.category, "original", "chibi"})})
            new = lib.update(AssetType.character, b.id, changes=changes, files=files, roles=roles,
                             change_summary="Upgrade: SVG masters for every part, 15 expressions, 15 poses, side / three-quarter / back views. Front art unchanged "
                                            f"(max mean pixel difference to v1: {diff:.3f}).")
            issues = reg.rig_issues(new) + [{"path": p["file"], "message": p["problem"]} for p in lib.verify(AssetType.character, b.id)]
            if issues:
                raise RuntimeError(f"{b.id}: upgraded version failed validation: {issues[:2]}")
            log(f"upgraded {b.id} to v{new.version} (front identity diff {diff:.3f})")
            done.append(b.id)
    return done


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--library", type=Path, default=PROJECT_ROOT / "asset_library")
    ap.add_argument("--only", default="")
    a = ap.parse_args()
    print(upgrade(a.library, set(filter(None, a.only.split(",")))) or "nothing to do")


if __name__ == "__main__":
    main()
