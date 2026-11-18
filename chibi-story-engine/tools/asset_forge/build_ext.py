"""Build and register the vector component library and the master background catalogue.

    python -m tools.asset_forge.build_ext --only components,environments [--force] [--ids env-for-0001,...]

Everything is registered through the same AssetLibrary API as the original forge (checksums, version 1, status `pending`).
An asset is registered only after it has been drawn, rasterised from its SVG and checked; a failed one leaves nothing behind.
"""
from __future__ import annotations

import argparse
import importlib
import tempfile
from pathlib import Path

from engine.asset_manager.library import AssetLibrary

from . import components_all
from .build import _fresh, _roles
from .env_kit import build_environment
from .kit import REGISTRY, save_master, find_box

PROJECT_ROOT = Path(__file__).resolve().parents[2]
SCENE_MODULES = ("scenes_forest", "scenes_palace", "scenes_village", "scenes_water", "scenes_mountain", "scenes_temple", "scenes_home", "scenes_spooky", "scenes_special")
KIND_CODE = {"tree": "TRE", "bush": "BSH", "flower": "FLW", "grass": "GRS", "rock": "RCK", "cloud": "CLD", "mountain": "MTN", "water": "WTR",
             "building": "BLD", "opening": "OPN", "barrier": "BAR", "lamp": "LMP"}
KIND_LABEL = {"opening": "doors and windows", "barrier": "fences and walls", "lamp": "lamps and lights", "water": "water features", "building": "buildings"}


def all_specs() -> list:
    specs = []
    for m in SCENE_MODULES:
        specs += importlib.import_module(f"tools.asset_forge.{m}").build()
    return specs


def build_components(library: AssetLibrary, force: bool, ids: set[str] | None, log=print) -> int:
    components_all.load()
    n = 0
    counters: dict[str, int] = {}
    with tempfile.TemporaryDirectory(prefix="csae_cmp_") as tmp:
        for cid, comp in REGISTRY.items():
            counters[comp.kind] = counters.get(comp.kind, 0) + 1
            if ids and cid not in ids:
                continue
            if not _fresh(library, "component", cid, force):
                continue
            art = components_all.draw_standalone(cid)
            work = Path(tmp) / cid
            box = find_box(art)
            if box is None:
                raise RuntimeError(f"component {cid} drew nothing; not registered")
            _, size = save_master(art, work / "component.svg", work / "component.png", scale=1.0, box=box)
            data = {
                "id": cid, "asset_type": "component", "name": comp.name, "description": f"{comp.name} ({comp.kind}); vector component, base point at the bottom centre.",
                "tags": sorted(set([comp.kind, *comp.tags])), "aliases": [cid.upper()], "catalog_code": f"CMP-{KIND_CODE.get(comp.kind, comp.kind[:3].upper())}-{counters[comp.kind]:04d}",
                "category": KIND_LABEL.get(comp.kind, comp.kind), "subcategory": comp.kind, "kind": comp.kind, "file": "component.png", "svg": "component.svg",
                "size": list(size), "licence": {"name": "CC0-1.0", "author": "Chibi Story Animation Engine (procedural vector art)", "source": "generated: tools/asset_forge", "notes": ""},
            }
            files, roles = {"component.png": work / "component.png", "component.svg": work / "component.svg"}, {"component.png": {"role": "image"}, "component.svg": {"role": "svg_master"}}
            library.register(data, files, roles)
            n += 1
    log(f"components   registered {n}  (catalogue has {len(REGISTRY)})")
    return n


def build_environments(library: AssetLibrary, force: bool, ids: set[str] | None, log=print) -> int:
    n = 0
    specs = all_specs()
    seen = set()
    for sp in specs:
        if sp.id in seen:
            raise RuntimeError(f"duplicate environment id {sp.id}")
        seen.add(sp.id)
    with tempfile.TemporaryDirectory(prefix="csae_env_") as tmp:
        for sp in specs:
            if ids and sp.id not in ids:
                continue
            if not _fresh(library, "environment", sp.id, force):
                continue
            work = Path(tmp) / sp.id
            built = build_environment(sp, work)
            files, _ = _roles(work, lambda rel: {})
            library.register(built["data"], files, built["roles"])
            n += 1
            log(f"environment  {sp.id}  {sp.name}  ({len(built['data']['layers'])} layers)")
    log(f"environments registered {n}  (catalogue has {len(specs)})")
    return n


def important_ids(specs: list) -> list[str]:
    """The backgrounds that get three compositions: those the tracked stories resolve to, plus the three most general of every category."""
    import json
    chosen: list[str] = []
    cat = PROJECT_ROOT / "stories" / "master_catalogue.json"
    if cat.exists():
        for c in json.loads(cat.read_text(encoding="utf-8"))["collections"]:
            for st in c["stories"]:
                for eid in st["matched"].get("environment_candidates", [])[:1]:
                    if eid not in chosen:
                        chosen.append(eid)
    seen: dict[str, int] = {}
    for sp in specs:
        seen[sp.category] = seen.get(sp.category, 0) + 1
        if seen[sp.category] <= 3 and sp.id not in chosen:
            chosen.append(sp.id)
    by_id = {sp.id for sp in specs}
    return [e for e in chosen if e in by_id]


def build_compositions(library: AssetLibrary, force: bool, ids: set[str] | None, log=print) -> int:
    from .env_kit import recompose
    n = 0
    specs = all_specs()
    wanted = ids or set(important_ids(specs))
    with tempfile.TemporaryDirectory(prefix="csae_cmp_env_") as tmp:
        for sp in specs:
            if sp.id not in wanted:
                continue
            for mode in ("medium", "closeup"):
                var, k = recompose(sp, mode)
                if not _fresh(library, "environment", var.id, force):
                    continue
                work = Path(tmp) / var.id
                built = build_environment(var, work, k=k)
                built["data"]["catalog_code"] = f"{sp.id.upper()}-{mode[0].upper()}"
                built["data"]["aliases"] = [built["data"]["catalog_code"], *[f"{a} ({mode})" for a in sp.aliases]]
                files, _ = _roles(work, lambda rel: {})
                library.register(built["data"], files, built["roles"])
                n += 1
                log(f"composition  {var.id}")
    log(f"compositions registered {n} for {len(wanted)} backgrounds")
    return n


def main() -> None:
    p = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    p.add_argument("--library", type=Path, default=PROJECT_ROOT / "asset_library")
    p.add_argument("--only", default="components,environments")
    p.add_argument("--force", action="store_true")
    p.add_argument("--ids", default="")
    a = p.parse_args()
    lib = AssetLibrary(a.library)
    ids = set(filter(None, a.ids.split(","))) or None
    only = set(a.only.split(","))
    if "components" in only:
        build_components(lib, a.force, ids)
    if "environments" in only:
        build_environments(lib, a.force, ids)
    if "compositions" in only:
        build_compositions(lib, a.force, ids)


if __name__ == "__main__":
    main()
