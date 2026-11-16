"""Build the procedural asset library:  python -m tools.asset_forge.build [--library DIR] [--only characters,...]

Assets are registered through the same AssetLibrary API a human-made asset would use, so every file
gets a checksum and a manifest. Existing assets are left alone unless --force is given (which rebuilds
them from scratch at version 1: only for a library nobody else depends on yet).
"""
from __future__ import annotations

import argparse
import shutil
import tempfile
from pathlib import Path

from engine.asset_manager.library import TYPE_DIRS, AssetLibrary
from engine.character_manager.registry import CharacterRegistry
from engine.character_manager.rig import Pose, Rig
from engine.common.paths import PROJECT_ROOT
from engine.rendering.raster import contact_sheet, render_character
from engine.schema.assets import AssetType, CharacterManifest

from . import animations, audio_synth, characters, environments, props, templates, voices

GROUPS = ("templates", "animations", "voices", "characters", "environments", "props", "effects", "audio")


def _fresh(library: AssetLibrary, asset_type: str, asset_id: str, force: bool) -> bool:
    """True if the asset should be (re)built."""
    if not library.exists(asset_type, asset_id):
        return True
    if force:
        shutil.rmtree(library.asset_dir(asset_type, asset_id))
        return True
    return False


def _roles(root: Path, role_for) -> tuple[dict[str, Path], dict[str, dict]]:
    files, roles = {}, {}
    for p in sorted(root.rglob("*")):
        if p.is_file():
            rel = p.relative_to(root).as_posix()
            files[rel] = p
            roles[rel] = role_for(rel)
    return files, roles


def build_character(library: AssetLibrary, spec, tmp: Path, log) -> None:
    work = tmp / spec.id
    builder = characters.build_biped if isinstance(spec, characters.BipedSpec) else characters.build_reptile
    data = builder(spec, work)
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
        im.save(work / "expressions" / f"{name}.png", optimize=True)
        sheet.append((name, im))
    (work / "poses").mkdir(exist_ok=True)
    for name, parts in manifest.poses.items():
        pose = Pose({k: v.model_copy() for k, v in parts.items()})
        pose.apply_facial(manifest.expressions["neutral"])
        render_character(work, rig, pose, zoom=0.5).save(work / "poses" / f"{name}.png", optimize=True)
    contact_sheet(sheet, columns=5, cell=(300, 300)).save(work / "references" / "expression_sheet.png", optimize=True)

    def role(rel: str) -> dict:
        folder, _, name = rel.partition("/")
        stem = Path(name).stem
        return {"rig": {"role": "rig_part"}, "references": {"role": "reference", "view": "front"}, "views": {"role": "view", "view": "front"},
                "expressions": {"role": "expression", "expression": stem}, "poses": {"role": "pose", "pose": stem}}[folder]

    files, roles = _roles(work, role)
    part_files = {k: v for k, v in files.items() if k.startswith("rig/")}
    extra = {k: (v, roles[k]) for k, v in files.items() if not k.startswith("rig/")}
    CharacterRegistry(library).create(data, part_files, extra)
    log(f"character   {spec.id}  ({len(files)} files)")


def build(library_root: Path, only: set[str], force: bool = False, log=print) -> None:
    library = AssetLibrary(library_root)
    for d in TYPE_DIRS.values():
        (library_root / d).mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix="csae_forge_") as tmp_name:
        tmp = Path(tmp_name)
        if "templates" in only:
            templates.write_templates(library_root)
            log(f"templates   {len(templates.RIG_TEMPLATES)}")
        if "animations" in only:
            log(f"animations  {animations.write_animations(library_root)}")
            library.animations()                                  # validates every clip
        if "voices" in only:
            log(f"voices      {voices.write_voices(library_root)}")
        if "characters" in only:
            for spec in characters.BIPEDS + characters.REPTILES:
                if _fresh(library, "character", spec.id, force):
                    build_character(library, spec, tmp, log)
        if "environments" in only:
            for make in environments.ENVIRONMENTS:
                work = tmp / make.__name__
                data = make(work)
                if _fresh(library, "environment", data["id"], force):
                    files, roles = _roles(work, lambda rel: {"role": "layer"})
                    library.register(data, files, roles)
                    log(f"environment {data['id']}  ({len(files)} layers)")
        if "props" in only:
            for pid, name, tags, aliases, draw, size in props.PROPS:
                if _fresh(library, "prop", pid, force):
                    work = tmp / pid
                    data = props.build_prop(pid, name, tags, aliases, draw, size, work)
                    library.register(data, {"prop.png": work / "prop.png"}, {"prop.png": {"role": "image"}})
                    log(f"prop        {pid}")
        if "effects" in only and _fresh(library, "effect", "particles_001", force):
            work = tmp / "particles"
            data = props.build_effects(work)
            files, roles = _roles(work, lambda rel: {"role": "sprite"})
            library.register(data, files, roles)
            log("effect      particles_001")
        if "audio" in only:
            for aid, atype, name, tags, gen, loopable in audio_synth.AUDIO:
                if _fresh(library, atype, aid, force):
                    work = tmp / aid
                    data = audio_synth.build_audio(aid, atype, name, tags, gen, loopable, work)
                    library.register(data, {"audio.wav": work / "audio.wav"}, {"audio.wav": {"role": "audio"}})
                    log(f"{atype:<11} {aid}  ({data['duration_seconds']:.1f}s)")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--library", type=Path, default=PROJECT_ROOT / "asset_library")
    parser.add_argument("--only", default=",".join(GROUPS), help="comma-separated: " + ", ".join(GROUPS))
    parser.add_argument("--force", action="store_true", help="rebuild assets that already exist (resets them to version 1)")
    args = parser.parse_args()
    build(args.library, set(args.only.split(",")), args.force)


if __name__ == "__main__":
    main()
