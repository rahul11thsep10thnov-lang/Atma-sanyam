"""File-based asset library: manifests, checksums, immutable versions and search.

Layout (per asset):   <root>/<type dir>/<asset id>/metadata.json   current version
                      <root>/<type dir>/<asset id>/...             its files
                      <root>/<type dir>/<asset id>/versions/vN/    full snapshot of every earlier version
"""
from __future__ import annotations

import json
import shutil
import wave
from pathlib import Path
from typing import Any

from pydantic import ValidationError

from ..common.errors import AssetIntegrityError, AssetNotFound, ValidationFailed
from ..common.paths import require_id, safe_join, sha256_file
from ..schema.animation import AnimationClip
from ..schema.assets import (MANIFEST_MODELS, AssetFile, AssetType, AudioManifest, BaseManifest, CharacterManifest,
                             ComponentManifest, EffectManifest, EnvironmentManifest, PropManifest, RigTemplate)
from ..schema.story import ApprovalStatus, format_validation_error
from .index import (AnchorEntry, AnimationEntry, CharacterEntry, EnvironmentEntry, LibraryIndex, SimpleEntry, norm_name)

TYPE_DIRS: dict[AssetType, str] = {
    AssetType.character: "characters", AssetType.environment: "environments", AssetType.prop: "props",
    AssetType.effect: "effects", AssetType.component: "components", AssetType.music: "music", AssetType.sound_effect: "sound_effects",
    AssetType.background: "backgrounds",
}
MANIFEST_NAME = "metadata.json"
IMAGE_FORMATS = {".png": "png", ".webp": "webp", ".jpg": "jpeg", ".jpeg": "jpeg"}
VECTOR_FORMATS = {".svg": "svg"}
AUDIO_FORMATS = {".wav": "wav"}


def describe_file(path: Path, rel: str, role: str, **meta: Any) -> AssetFile:
    """Build a manifest entry for a file on disk: format, size or duration, checksum."""
    suffix = path.suffix.lower()
    fmt = IMAGE_FORMATS.get(suffix) or VECTOR_FORMATS.get(suffix) or AUDIO_FORMATS.get(suffix) or suffix.lstrip(".") or "bin"
    width = height = duration = None
    if suffix in IMAGE_FORMATS:
        from PIL import Image
        with Image.open(path) as im:
            width, height = im.size
    elif suffix == ".wav":
        with wave.open(str(path), "rb") as w:
            duration = round(w.getnframes() / float(w.getframerate()), 4)
    return AssetFile(role=role, path=rel, format=fmt, checksum=sha256_file(path), width=width, height=height,
                     duration_seconds=duration, **meta)


class AssetLibrary:
    def __init__(self, root: Path) -> None:
        self.root = Path(root)

    # ------------------------------------------------------------- locating
    def _type(self, asset_type: AssetType | str) -> AssetType:
        return asset_type if isinstance(asset_type, AssetType) else AssetType(asset_type)

    def asset_dir(self, asset_type: AssetType | str, asset_id: str, version: int | None = None) -> Path:
        t = self._type(asset_type)
        base = safe_join(self.root, TYPE_DIRS[t], require_id(asset_id, "asset id"))
        if version is None:
            return base
        current = self._read_manifest_dict(base / MANIFEST_NAME, t, asset_id).get("version", 1)
        return base if version == current else base / "versions" / f"v{int(version)}"

    def exists(self, asset_type: AssetType | str, asset_id: str) -> bool:
        try:
            return (self.asset_dir(asset_type, asset_id) / MANIFEST_NAME).is_file()
        except Exception:
            return False

    def list_ids(self, asset_type: AssetType | str) -> list[str]:
        base = self.root / TYPE_DIRS[self._type(asset_type)]
        if not base.is_dir():
            return []
        return sorted(p.name for p in base.iterdir() if (p / MANIFEST_NAME).is_file())

    def versions(self, asset_type: AssetType | str, asset_id: str) -> list[int]:
        base = self.asset_dir(asset_type, asset_id)
        current = self.load(asset_type, asset_id).version
        older = [int(p.name[1:]) for p in (base / "versions").glob("v*") if p.name[1:].isdigit()] if (base / "versions").is_dir() else []
        return sorted(set(older + [current]))

    # -------------------------------------------------------------- loading
    def _read_manifest_dict(self, path: Path, t: AssetType, asset_id: str) -> dict[str, Any]:
        if not path.is_file():
            raise AssetNotFound(f"{t.value} '{asset_id}' is not in the asset library", details={"asset_type": t.value, "id": asset_id})
        try:
            return json.loads(path.read_text(encoding="utf-8"))
        except json.JSONDecodeError as exc:
            raise AssetIntegrityError(f"{t.value} '{asset_id}' has an unreadable manifest: {exc.msg}") from exc

    def load(self, asset_type: AssetType | str, asset_id: str, version: int | None = None) -> BaseManifest:
        t = self._type(asset_type)
        directory = self.asset_dir(t, asset_id, version)
        if not (directory / MANIFEST_NAME).is_file() and version is not None:
            raise AssetNotFound(f"{t.value} '{asset_id}' has no version {version}", details={"id": asset_id, "version": version})
        data = self._read_manifest_dict(directory / MANIFEST_NAME, t, asset_id)
        if version is not None and data.get("version") != version:
            raise AssetNotFound(f"{t.value} '{asset_id}' has no version {version}", details={"id": asset_id, "version": version})
        return self._validate(t, data, asset_id)

    @staticmethod
    def _validate(t: AssetType, data: dict[str, Any], asset_id: str) -> BaseManifest:
        try:
            return MANIFEST_MODELS[t].model_validate(data)
        except ValidationError as exc:
            raise ValidationFailed(f"Manifest of {t.value} '{asset_id}' is invalid", format_validation_error(exc)) from exc

    def character(self, cid: str, version: int | None = None) -> CharacterManifest:
        return self.load(AssetType.character, cid, version)  # type: ignore[return-value]

    def environment(self, eid: str, version: int | None = None) -> EnvironmentManifest:
        return self.load(AssetType.environment, eid, version)  # type: ignore[return-value]

    def prop(self, pid: str, version: int | None = None) -> PropManifest:
        return self.load(AssetType.prop, pid, version)  # type: ignore[return-value]

    def effect(self, eid: str) -> EffectManifest:
        return self.load(AssetType.effect, eid)  # type: ignore[return-value]

    def audio(self, asset_type: AssetType | str, aid: str) -> AudioManifest:
        return self.load(asset_type, aid)  # type: ignore[return-value]

    def file_path(self, asset_type: AssetType | str, asset_id: str, rel: str, version: int | None = None) -> Path:
        """Absolute path of one file of an asset; refuses paths outside the asset directory."""
        path = safe_join(self.asset_dir(asset_type, asset_id, version), rel)
        if not path.is_file():
            raise AssetNotFound(f"File '{rel}' of {self._type(asset_type).value} '{asset_id}' is missing",
                                details={"id": asset_id, "file": rel, "version": version})
        return path

    # -------------------------------------------------------------- writing
    def _write(self, directory: Path, manifest: BaseManifest) -> None:
        directory.mkdir(parents=True, exist_ok=True)
        tmp = directory / (MANIFEST_NAME + ".tmp")
        tmp.write_text(json.dumps(manifest.model_dump(mode="json"), ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        tmp.replace(directory / MANIFEST_NAME)

    def _ingest(self, directory: Path, files: dict[str, Path]) -> None:
        for rel, src in files.items():
            dest = safe_join(directory, rel)
            if not Path(src).is_file():
                raise AssetNotFound(f"Source file for '{rel}' does not exist")
            dest.parent.mkdir(parents=True, exist_ok=True)
            if Path(src).resolve() != dest.resolve():
                shutil.copyfile(src, dest)

    def _complete(self, t: AssetType, asset_id: str, directory: Path, data: dict[str, Any], roles: dict[str, dict[str, Any]]) -> BaseManifest:
        """Fill in `files` from what is on disk, then validate: every referenced file must exist."""
        entries: dict[str, AssetFile] = {}
        for old in data.get("files", []):
            entries[old["path"]] = AssetFile.model_validate(old)
        for rel, meta in roles.items():
            path = safe_join(directory, rel)
            if not path.is_file():
                raise AssetNotFound(f"File '{rel}' was declared for {t.value} '{asset_id}' but is not present")
            meta = dict(meta)
            entries[rel] = describe_file(path, rel, meta.pop("role", "file"), **meta)
        for rel, entry in list(entries.items()):          # refresh checksums of files that were replaced
            path = safe_join(directory, rel)
            if not path.is_file():
                raise AssetNotFound(f"File '{rel}' of {t.value} '{asset_id}' is missing")
            if sha256_file(path) != entry.checksum:
                entries[rel] = describe_file(path, rel, entry.role, view=entry.view, expression=entry.expression, pose=entry.pose)
        data["files"] = [e.model_dump(mode="json") for e in entries.values()]
        manifest = self._validate(t, data, asset_id)
        missing = [rel for rel in referenced_files(manifest) if manifest.file_entry(rel) is None]
        if missing:
            raise ValidationFailed(f"{t.value} '{asset_id}' refers to files that are not registered",
                                   [{"path": "files", "message": f"'{m}' is referenced but has no file entry"} for m in missing])
        return manifest

    def register(self, data: dict[str, Any], files: dict[str, Path], roles: dict[str, dict[str, Any]]) -> BaseManifest:
        """Create version 1 of a new asset. `files`: relative path -> source; `roles`: relative path -> entry metadata."""
        t = self._type(data.get("asset_type", ""))
        asset_id = require_id(str(data.get("id", "")), "asset id")
        directory = self.asset_dir(t, asset_id)
        if (directory / MANIFEST_NAME).exists():
            raise ValidationFailed(f"{t.value} '{asset_id}' already exists; use update() to create a new version",
                                   [{"path": "id", "message": "already registered"}])
        data = {**data, "version": 1}
        existed = directory.exists()
        try:
            self._ingest(directory, files)
            manifest = self._complete(t, asset_id, directory, data, roles)
            self._write(directory, manifest)
        except Exception:
            if not existed:
                shutil.rmtree(directory, ignore_errors=True)   # a failed registration leaves nothing behind
            raise
        return manifest

    def update(self, asset_type: AssetType | str, asset_id: str, changes: dict[str, Any] | None = None,
               files: dict[str, Path] | None = None, roles: dict[str, dict[str, Any]] | None = None,
               change_summary: str = "") -> BaseManifest:
        """Create the next version. The current version is snapshotted first and never modified again."""
        t = self._type(asset_type)
        directory = self.asset_dir(t, asset_id)
        current = self.load(t, asset_id)
        snapshot = directory / "versions" / f"v{current.version}"
        if snapshot.exists():
            raise AssetIntegrityError(f"Version {current.version} of '{asset_id}' has already been archived")
        snapshot.mkdir(parents=True)
        for entry in current.files:
            src = safe_join(directory, entry.path)
            dest = safe_join(snapshot, entry.path)
            dest.parent.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(src, dest)
        self._write(snapshot, current)
        try:
            data = current.model_dump(mode="json")
            data.update(changes or {})
            data.update({"id": asset_id, "asset_type": t.value, "version": current.version + 1, "change_summary": change_summary,
                         "approval_status": ApprovalStatus.pending.value})
            data.pop("created_at", None)
            self._ingest(directory, files or {})
            manifest = self._complete(t, asset_id, directory, data, roles or {})
            self._write(directory, manifest)
            return manifest
        except Exception:
            for entry in current.files:                    # roll the working copy back to the snapshot
                shutil.copyfile(safe_join(snapshot, entry.path), safe_join(directory, entry.path))
            self._write(directory, current)
            shutil.rmtree(snapshot)
            raise

    def set_approval(self, asset_type: AssetType | str, asset_id: str, status: ApprovalStatus | str) -> BaseManifest:
        manifest = self.load(asset_type, asset_id)
        manifest.approval_status = ApprovalStatus(status)
        self._write(self.asset_dir(asset_type, asset_id), manifest)
        return manifest

    # ------------------------------------------------------------ integrity
    def verify(self, asset_type: AssetType | str, asset_id: str, version: int | None = None) -> list[dict[str, str]]:
        """Compare every file with its recorded checksum. Returns a list of problems (empty = intact)."""
        manifest = self.load(asset_type, asset_id, version)
        directory = self.asset_dir(asset_type, asset_id, version)
        problems: list[dict[str, str]] = []
        for entry in manifest.files:
            try:
                path = safe_join(directory, entry.path)
            except Exception:
                problems.append({"file": entry.path, "problem": "unsafe_path"})
                continue
            if not path.is_file():
                problems.append({"file": entry.path, "problem": "missing"})
            elif sha256_file(path) != entry.checksum:
                problems.append({"file": entry.path, "problem": "checksum_mismatch"})
        for rel in referenced_files(manifest):
            if manifest.file_entry(rel) is None:
                problems.append({"file": rel, "problem": "unregistered"})
        return problems

    def require_intact(self, asset_type: AssetType | str, asset_id: str, version: int | None = None) -> None:
        problems = self.verify(asset_type, asset_id, version)
        if problems:
            raise AssetIntegrityError(f"{self._type(asset_type).value} '{asset_id}' failed its integrity check",
                                      details={"problems": problems})

    # --------------------------------------------------------------- search
    def search(self, query: str, asset_type: AssetType | str | None = None) -> list[BaseManifest]:
        """Exact id first; otherwise assets whose name, aliases or tags match the query."""
        types = [self._type(asset_type)] if asset_type else list(TYPE_DIRS)
        q = norm_name(query)
        exact, fuzzy = [], []
        for t in types:
            for aid in self.list_ids(t):
                m = self.load(t, aid)
                if aid == query:
                    exact.append(m)
                    continue
                names = {norm_name(n) for n in [m.name, *m.aliases]}
                tags = {norm_name(x) for x in m.tags}
                if q in names or q in tags:
                    fuzzy.append((0, m))
                elif any(q in n for n in names) or q in norm_name(m.description):
                    fuzzy.append((1, m))
        return exact if exact else [m for _, m in sorted(fuzzy, key=lambda r: (r[0], r[1].id))]

    # ---------------------------------------------------- templates and clips
    def rig_templates(self) -> dict[str, RigTemplate]:
        base = self.root / "rig_templates"
        out = {}
        for p in sorted(base.glob("*.json")) if base.is_dir() else []:
            out[p.stem] = RigTemplate.model_validate(json.loads(p.read_text(encoding="utf-8")))
        return out

    def animations(self) -> dict[str, AnimationClip]:
        base = self.root / "animations"
        out: dict[str, AnimationClip] = {}
        for p in sorted(base.glob("*.json")) if base.is_dir() else []:
            try:
                clip = AnimationClip.model_validate(json.loads(p.read_text(encoding="utf-8")))
            except ValidationError as exc:
                raise ValidationFailed(f"Animation clip '{p.stem}' is invalid", format_validation_error(exc)) from exc
            out[clip.code] = clip
        return out

    # ---------------------------------------------------------------- index
    def index(self) -> LibraryIndex:
        from ..camera.presets import CAMERA_PRESETS
        from ..composition.effects import EFFECT_TYPES
        from ..environment_manager.lighting import LIGHTING_PRESETS
        chars = []
        for cid in self.list_ids(AssetType.character):
            m = self.character(cid)
            chars.append(CharacterEntry(
                id=m.id, name=m.name, species=m.species, version=m.version, versions=self.versions(AssetType.character, cid),
                aliases=m.aliases, rig_template=m.rig.template, habitat=str(m.compatibility.get("habitat", "ground")),
                parts=m.rig.part_ids(), expressions=sorted(m.expressions), poses=sorted(m.poses),
                attach_points=sorted(m.rig.attach_points), default_voice=m.default_voice,
                approved=m.approval_status == ApprovalStatus.approved))
        envs = []
        for eid in self.list_ids(AssetType.environment):
            e = self.environment(eid)
            envs.append(EnvironmentEntry(
                id=e.id, name=e.name, version=e.version, versions=self.versions(AssetType.environment, eid), tags=e.tags,
                aliases=e.aliases, anchors={n: AnchorEntry(x=a.x, y=a.y, order=a.order, scale=a.scale, features=a.features)
                                            for n, a in e.anchors.items()},
                default_anchor_by_role=e.default_anchor_by_role, habitats=list(e.compatibility.get("habitats", [])),
                lighting_presets=e.lighting_presets, ambience=e.compatibility.get("ambience"), approved=e.approval_status == ApprovalStatus.approved))
        anims = [AnimationEntry(code=c.code, category=c.category, level=c.level, rigs=c.rig_compatibility,
                                semantics=list(c.metadata.get("semantics", [])), duration=c.duration, loop=c.loop, additive=c.additive,
                                start_states=c.start_states, end_state=c.end_state, requires_feature=c.requires_feature,
                                requires_prop=c.requires_prop, travels=c.root_motion.path != "none")
                 for c in self.animations().values()]

        def simple(t: AssetType) -> list[SimpleEntry]:
            out = []
            for aid in self.list_ids(t):
                m = self.load(t, aid)
                out.append(SimpleEntry(id=m.id, name=m.name, version=m.version, tags=m.tags, aliases=m.aliases,
                                       duration=getattr(m, "duration_seconds", None),
                                       approved=m.approval_status == ApprovalStatus.approved))
            return out

        return LibraryIndex(characters=chars, environments=envs, animations=anims, props=simple(AssetType.prop),
                            effects=sorted(EFFECT_TYPES), music=simple(AssetType.music), sound_effects=simple(AssetType.sound_effect),
                            lighting_presets=sorted(LIGHTING_PRESETS), camera_presets=sorted(CAMERA_PRESETS))


def referenced_files(manifest: BaseManifest) -> list[str]:
    """Every file a manifest's structured fields point at (rig part images, layers, sprites, audio)."""
    out: list[str] = []
    if isinstance(manifest, CharacterManifest):
        for part in manifest.rig.parts:
            out.extend(v.file for v in part.variants.values())
            out.extend(v.svg for v in part.variants.values() if v.svg)
    elif isinstance(manifest, EnvironmentManifest):
        out.extend(layer.file for layer in manifest.layers)
        out.extend(layer.svg for layer in manifest.layers if layer.svg)
    elif isinstance(manifest, (PropManifest, AudioManifest)):
        out.append(manifest.file)
    elif isinstance(manifest, ComponentManifest):
        out.extend([manifest.file, manifest.svg])
    elif isinstance(manifest, EffectManifest):
        out.extend(manifest.sprites.values())
    return list(dict.fromkeys(out))
