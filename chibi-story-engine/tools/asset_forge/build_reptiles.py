"""Register the species-specific reptile characters as new versions: crocodile and its wife (originals, version 2), turtle, tortoise, snake, lizard.

The previous versions (the original side-view crocodiles; the upright chibi turtle, tortoise, snake and lizard) stay in versions/v1.
"""
from __future__ import annotations

import argparse
import tempfile
from pathlib import Path

import numpy as np
from PIL import Image

from engine.asset_manager.library import AssetLibrary
from engine.character_manager.registry import CharacterRegistry
from engine.character_manager.rig import Pose, Rig
from engine.rendering.raster import render_character
from engine.schema.assets import AssetType

from . import characters_ext
from .build import _roles
from .build_figs import draw_character, role_for
from .characters import REPTILES
from .figures import ROSTER
from .reptile_views import build_rep_views
from .reptiles import RepSpec, build_rep

PROJECT_ROOT = Path(__file__).resolve().parents[2]
ORIGINAL = {"crocodile_001": ("CHAR-ORG-0008", ["panchatantra", "jataka", "folk"]), "crocodile_wife_001": ("CHAR-ORG-0009", ["panchatantra"])}


def specs() -> list[RepSpec]:
    out = []
    for r in REPTILES:
        code, st = ORIGINAL[r.id]
        out.append(RepSpec(r.id, r.name, r.species, "quad", r.aliases, r.description, r.voice, r.skin, r.belly, r.spikes, r.iris, r.lashes, r.flower, r.lips,
                           r.stage_scale, r.habitat, category="animal", subcategory="reptile", code=code, stories=st, identity_notes=r.identity_notes, original=r))
    by = {r.species: r for r in ROSTER}
    for slug, fam in (("turtle", "chelonian"), ("tortoise", "chelonian"), ("snake", "serpent"), ("lizard", "quad")):
        f = by[slug]
        shell = (f.fur if slug == "tortoise" else "#4a8a3a") if fam == "chelonian" else None
        out.append(RepSpec(f.id, f.name, f.species, fam, f.aliases, f.description, f.voice, f.fur, f.belly, f.pattern_colour or "#3a6a2a", f.iris, False, None, None,
                           f.stage_scale, f.habitat, shell=shell, category=f.category, subcategory="reptile", code=f.code, stories=f.stories, identity_notes=f.identity_notes))
    return out


def rest_difference(old_dir: Path, old_manifest, new_dir: Path, new_manifest) -> float:
    def frame(d, m):
        pose = Pose()
        pose.apply_facial(m.expressions["neutral"])
        return np.asarray(render_character(d, Rig(m.rig), pose), dtype=float)
    a, b = frame(old_dir, old_manifest), frame(new_dir, new_manifest)
    return float(np.abs(a - b).mean()) if a.shape == b.shape else 255.0


def run(library_root: Path, only: set[str] | None, log=print) -> list[str]:
    lib = AssetLibrary(library_root)
    reg = CharacterRegistry(lib)
    done = []
    characters_ext.QUANTIZE = False
    with tempfile.TemporaryDirectory(prefix="csae_rep_") as tmp:
        for sp in specs():
            if only and sp.id not in only:
                continue
            current = lib.character(sp.id)
            if current.rig.template == {"quad": "quadruped_reptile", "chelonian": "chelonian", "serpent": "serpentine_reptile"}[sp.family] and current.views:
                log(f"skip {sp.id}: already has views (v{current.version})")
                continue
            work = Path(tmp) / sp.id
            data, manifest = draw_character(sp, work, build_rep, build_rep_views)
            files, roles = _roles(work, role_for)
            original = sp.id in ORIGINAL
            if original:
                diff = rest_difference(lib.asset_dir(AssetType.character, sp.id), current, work, manifest)
                if diff > 2.0:
                    raise RuntimeError(f"{sp.id}: version 2 at rest differs from version 1 (mean pixel difference {diff:.2f}); refusing to upgrade")
                changes = {k: data[k] for k in ("rig", "views", "expressions", "poses", "states")}
                changes["compatibility"] = {**current.compatibility, "primary_view": "side", "rig_family": sp.family, "clips": "quadruped_reptile", "views": ["side", "front", "three_quarter", "back"]}
                changes["visual_identity"] = {**current.visual_identity, "family": sp.family}
                changes.update({"catalog_code": sp.code, "category": "animal", "subcategory": "reptile", "related_stories": sp.stories,
                                "tags": sorted(set(current.tags) | {"original", "quadruped"})})
                note = f"Upgrade: SVG masters, articulated spine/neck/tail, 15 expressions, 15 poses. Rest pose identical to v1 (mean pixel difference {diff:.3f})."
            else:
                diff = None
                changes = {k: v for k, v in data.items() if k not in ("id", "asset_type", "files")}
                changes["files"] = []
                note = f"Replaced the upright biped figure with the {sp.family} rig; the earlier version stays in versions/v1."
            new = lib.update(AssetType.character, sp.id, changes=changes, files=files, roles=roles, change_summary=note)
            if not original:                                              # drop the superseded working files; v1 keeps its own copy
                keep = {e.path for e in new.files}
                directory = lib.asset_dir(AssetType.character, sp.id)
                for p in sorted(directory.rglob("*")):
                    rel = p.relative_to(directory).as_posix()
                    if p.is_file() and not rel.startswith("versions/") and rel != "metadata.json" and rel not in keep:
                        p.unlink()
            issues = reg.rig_issues(new) + [{"path": p["file"], "message": p["problem"]} for p in lib.verify(AssetType.character, sp.id)]
            if issues:
                raise RuntimeError(f"{sp.id}: validation failed: {issues[:2]}")
            log(f"{sp.id} v{new.version} ({sp.family})" + (f", rest diff {diff:.3f}" if diff is not None else ""))
            done.append(sp.id)
    return done


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--library", type=Path, default=PROJECT_ROOT / "asset_library")
    ap.add_argument("--only", default="")
    a = ap.parse_args()
    print(run(a.library, set(filter(None, a.only.split(",")))) or "nothing to do")


if __name__ == "__main__":
    main()
