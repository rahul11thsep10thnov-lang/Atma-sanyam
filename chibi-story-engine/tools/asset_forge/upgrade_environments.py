"""Add SVG masters to the seven original (hand-coded) environments as version 2, leaving their runtime PNGs exactly as they were.

Each environment function is re-run with its save step extended to write the layer's SVG, cropped to the same box as the PNG. The new PNGs
must equal the registered version-1 PNGs pixel for pixel, otherwise the upgrade is refused. Version 1 stays in versions/v1.

    python -m tools.asset_forge.upgrade_environments
"""
from __future__ import annotations

import re
import tempfile
from pathlib import Path

import numpy as np
from PIL import Image

from engine.asset_manager.library import AssetLibrary
from engine.schema.assets import AssetType

from . import environments as env
from .build import _roles

PROJECT_ROOT = Path(__file__).resolve().parents[2]
CODES = {"forest_river_001": ("ENV-ORG-0001", "river"), "river_open_001": ("ENV-ORG-0002", "river"), "crocodile_home_001": ("ENV-ORG-0003", "river"), "forest_well_001": ("ENV-ORG-0004", "well"),
         "village_001": ("ENV-ORG-0005", "village"), "farm_field_001": ("ENV-ORG-0006", "farm"), "mansion_001": ("ENV-ORG-0007", "mansion")}


def _save_with_svg(layer, path: Path, scale: float = 1.0) -> None:
    _orig_save(layer, path, scale)
    im = layer.render(scale)
    box = im.getbbox() or (0, 0, im.width, im.height)
    if layer.w > env.LW:
        box = (0, box[1], im.width, box[3])
    pad = 2
    box = (max(0, box[0] - pad), max(0, box[1] - pad), min(im.width, box[2] + pad), min(im.height, box[3] + pad))
    x0, y0, x1, y1 = (box[0] / scale, box[1] / scale, box[2] / scale, box[3] / scale)
    svg = layer.svg()
    head = re.match(r"<svg [^>]*>", svg).group(0)
    svg = svg.replace(head, f'<svg xmlns="http://www.w3.org/2000/svg" width="{x1 - x0:g}" height="{y1 - y0:g}" viewBox="{x0:g} {y0:g} {x1 - x0:g} {y1 - y0:g}">', 1)
    out = path.parent.parent / "masters"
    out.mkdir(parents=True, exist_ok=True)
    (out / f"{path.stem}.svg").write_text(svg, encoding="utf-8")


_orig_save = env._save


def upgrade(library_root: Path, log=print) -> list[str]:
    lib = AssetLibrary(library_root)
    done = []
    env._save = _save_with_svg
    try:
        with tempfile.TemporaryDirectory(prefix="csae_envup_") as tmp:
            for make in env.ENVIRONMENTS:
                work = Path(tmp) / make.__name__
                data = make(work)
                eid = data["id"]
                current = lib.environment(eid)
                if current.version != 1 or any(l.svg for l in current.layers):
                    log(f"skip {eid}: already upgraded")
                    continue
                base = lib.asset_dir(AssetType.environment, eid)
                for l in current.layers:
                    a = np.asarray(Image.open(base / l.file).convert("RGBA"), dtype=float)
                    b = np.asarray(Image.open(work / l.file).convert("RGBA"), dtype=float)
                    if a.shape != b.shape or float(np.abs(a - b).mean()) > 0.01:
                        raise RuntimeError(f"{eid}/{l.id}: re-drawn PNG differs from version 1; refusing to upgrade")
                layers = []
                for l in data["layers"]:
                    svg_rel = f"masters/{Path(l['file']).stem}.svg"
                    if not (work / svg_rel).is_file():
                        raise RuntimeError(f"{eid}/{l['id']}: no SVG master written")
                    layers.append({**l, "svg": svg_rel})
                files = {f"masters/{p.name}": p for p in sorted((work / "masters").glob("*.svg"))}
                roles = {rel: {"role": "svg_master"} for rel in files}
                code, sub = CODES[eid]
                comp = {**current.compatibility, "composition": "wide", "composition_group": eid, "seasons": ["spring", "summer", "monsoon", "autumn", "winter"],
                        "weather": ["clear", "cloudy", "rain", "fog", "storm", "snow"], "scare_levels": [0]}
                new = lib.update(AssetType.environment, eid, changes={"layers": layers, "catalog_code": code, "category": "ORG", "subcategory": sub, "compatibility": comp},
                                 files=files, roles=roles, change_summary="Upgrade: SVG master for every layer; runtime PNGs unchanged (verified pixel for pixel).")
                problems = lib.verify(AssetType.environment, eid)
                if problems:
                    raise RuntimeError(f"{eid}: validation failed: {problems[:2]}")
                log(f"{eid} -> v{new.version} ({len(files)} SVG masters)")
                done.append(eid)
    finally:
        env._save = _orig_save
    return done


def main() -> None:
    print(upgrade(PROJECT_ROOT / "asset_library") or "nothing to do")


if __name__ == "__main__":
    main()
