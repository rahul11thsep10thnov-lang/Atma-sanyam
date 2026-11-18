"""Draw, check and register the extended character roster (people, animals, birds, mythological beings).

    python -m tools.asset_forge.build_figs [--only id,id] [--force] [--sheet out.jpg]
"""
from __future__ import annotations

import argparse
import tempfile
from pathlib import Path

from PIL import Image

from engine.asset_manager.library import AssetLibrary
from engine.character_manager.registry import CharacterRegistry
from engine.character_manager.rig import Pose, Rig
from engine.rendering.raster import contact_sheet, render_character
from engine.schema.assets import CharacterManifest

from .build import _fresh, _roles
from .characters_ext import build_fig

PROJECT_ROOT = Path(__file__).resolve().parents[2]


def _small(im: Image.Image, scale: float) -> Image.Image:
    return im.resize((max(1, int(im.width * scale)), max(1, int(im.height * scale))), Image.LANCZOS)


def draw_character(spec, work: Path) -> tuple[dict, CharacterManifest]:
    data = build_fig(spec, work)
    manifest = CharacterManifest.model_validate({**data, "files": []})
    rig = Rig(manifest.rig)
    rest = Pose()
    rest.apply_facial(manifest.expressions["neutral"])
    front = render_character(work, rig, rest)
    for sub in ("references", "views"):
        (work / sub).mkdir(exist_ok=True)
        front.save(work / sub / "front.png", optimize=True)
    sheet = []
    (work / "expressions").mkdir(exist_ok=True)
    for name, face in manifest.expressions.items():
        pose = Pose()
        pose.apply_facial(face)
        im = render_character(work, rig, pose, zoom=0.5)
        sheet.append((name, im))
        _small(im, 0.6).quantize(colors=128, method=Image.Quantize.FASTOCTREE, dither=Image.Dither.NONE).save(work / "expressions" / f"{name}.png", optimize=True)
    (work / "poses").mkdir(exist_ok=True)
    psheet = []
    for name, parts in manifest.poses.items():
        pose = Pose({k: v.model_copy() for k, v in parts.items()})
        pose.apply_facial(manifest.expressions["neutral"])
        im = render_character(work, rig, pose, zoom=0.5)
        psheet.append((name, im))
        _small(im, 0.6).quantize(colors=128, method=Image.Quantize.FASTOCTREE, dither=Image.Dither.NONE).save(work / "poses" / f"{name}.png", optimize=True)
    contact_sheet(sheet, columns=5, cell=(300, 300)).convert("RGB").save(work / "references" / "expression_sheet.jpg", quality=82)
    contact_sheet(psheet, columns=5, cell=(300, 300)).convert("RGB").save(work / "references" / "pose_sheet.jpg", quality=82)
    return data, manifest


def role_for(rel: str) -> dict:
    folder, _, name = rel.partition("/")
    stem = Path(name).stem
    if folder == "rig":
        return {"role": "svg_master"} if name.endswith(".svg") else {"role": "rig_part"}
    return {"references": {"role": "reference", "view": "front"}, "views": {"role": "view", "view": "front"},
            "expressions": {"role": "expression", "expression": stem}, "poses": {"role": "pose", "pose": stem}}[folder]


def register(library: AssetLibrary, spec, work: Path, data: dict) -> None:
    files, roles = _roles(work, role_for)
    part_files = {k: v for k, v in files.items() if k.startswith("rig/") and roles[k]["role"] == "rig_part"}
    extra = {k: (v, roles[k]) for k, v in files.items() if k not in part_files}
    CharacterRegistry(library).create(data, part_files, extra)


def build_all(library_root: Path, specs: list, only: set[str] | None, force: bool, log=print, sheet: Path | None = None) -> int:
    library = AssetLibrary(library_root)
    n, sheet_items = 0, []
    with tempfile.TemporaryDirectory(prefix="csae_fig_") as tmp:
        for spec in specs:
            if only and spec.id not in only:
                continue
            if sheet is None and not _fresh(library, "character", spec.id, force):
                continue
            work = Path(tmp) / spec.id
            data, _ = draw_character(spec, work)
            if sheet is not None:
                sheet_items.append((spec.id, Image.open(work / "views" / "front.png").convert("RGBA")))
                continue
            register(library, spec, work, data)
            n += 1
            log(f"character {spec.id}  {spec.name}")
    if sheet is not None:
        contact_sheet(sheet_items, columns=6, cell=(280, 340)).convert("RGB").save(sheet, quality=82)
    return n


def main() -> None:
    from .figures import ROSTER
    p = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    p.add_argument("--library", type=Path, default=PROJECT_ROOT / "asset_library")
    p.add_argument("--only", default="")
    p.add_argument("--force", action="store_true")
    p.add_argument("--sheet", type=Path, default=None)
    a = p.parse_args()
    n = build_all(a.library, ROSTER, set(filter(None, a.only.split(","))) or None, a.force, sheet=a.sheet)
    print(f"registered {n} characters (roster has {len(ROSTER)})")


if __name__ == "__main__":
    main()
