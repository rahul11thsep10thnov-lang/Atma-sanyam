"""Character registry: creation, references, expressions, poses, rig checks and continuity."""
from __future__ import annotations

from pathlib import Path
from typing import Any

from ..asset_manager.library import AssetLibrary
from ..common.errors import AssetIntegrityError, IncompatibleAsset, RigError, ValidationFailed
from ..common.paths import require_id
from ..schema.animation import AnimationClip
from ..schema.assets import AssetType, CharacterManifest, FacialPose, PartPose
from .rig import Rig, validate_rig


class CharacterRegistry:
    def __init__(self, library: AssetLibrary) -> None:
        self.library = library

    # ------------------------------------------------------------- reading
    def get(self, character_id: str, version: int | None = None) -> CharacterManifest:
        return self.library.character(character_id, version)

    def list(self) -> list[CharacterManifest]:
        return [self.library.character(cid) for cid in self.library.list_ids(AssetType.character)]

    def rig(self, character_id: str, version: int | None = None) -> Rig:
        """Load a rig for posing; refuses rigs that fail validation or whose files changed."""
        manifest = self.get(character_id, version)
        issues = self.rig_issues(manifest)
        if issues:
            raise RigError(f"Rig of '{character_id}' is not usable: {issues[0]['message']}", details={"issues": issues})
        self.library.require_intact(AssetType.character, character_id, version)
        return Rig(manifest.rig)

    def rig_issues(self, manifest: CharacterManifest) -> list[dict[str, str]]:
        return validate_rig(manifest, self.library.rig_templates().get(manifest.rig.template))

    def missing_assets(self, character_id: str, version: int | None = None) -> list[dict[str, str]]:
        """Rig problems plus files that are absent or altered."""
        manifest = self.get(character_id, version)
        out = [{"kind": "rig", **i} for i in self.rig_issues(manifest)]
        out += [{"kind": "file", "path": p["file"], "message": p["problem"]} for p in
                self.library.verify(AssetType.character, character_id, version)]
        if not manifest.files_by_role("reference"):
            out.append({"kind": "reference", "path": "references", "message": "no reference image registered"})
        return out

    # ------------------------------------------------------------- writing
    def create(self, data: dict[str, Any], part_files: dict[str, Path], extra_files: dict[str, tuple[Path, dict[str, Any]]] | None = None) -> CharacterManifest:
        """Register a new character. `part_files`: relative path -> source for every rig part image."""
        require_id(str(data.get("id", "")), "character id")
        data = {**data, "asset_type": "character"}
        files = dict(part_files)
        roles: dict[str, dict[str, Any]] = {rel: {"role": "rig_part"} for rel in part_files}
        for rel, (src, meta) in (extra_files or {}).items():
            files[rel] = src
            roles[rel] = meta
        manifest = self.library.register(data, files, roles)
        assert isinstance(manifest, CharacterManifest)
        issues = self.rig_issues(manifest)
        if issues:
            import shutil
            shutil.rmtree(self.library.asset_dir(AssetType.character, manifest.id))
            raise ValidationFailed(f"Character '{manifest.id}' has an invalid rig", issues)
        return manifest

    def add_file(self, character_id: str, rel: str, source: Path, *, role: str, summary: str, **meta: Any) -> CharacterManifest:
        return self.library.update(AssetType.character, character_id, files={rel: source},
                                   roles={rel: {"role": role, **meta}}, change_summary=summary)  # type: ignore[return-value]

    def add_reference(self, character_id: str, source: Path, name: str | None = None, view: str = "front") -> CharacterManifest:
        rel = f"references/{name or Path(source).name}"
        return self.add_file(character_id, rel, source, role="reference", view=view, summary=f"Add reference image {rel}")

    def register_expression(self, character_id: str, name: str, face: FacialPose, preview: Path | None = None) -> CharacterManifest:
        manifest = self.get(character_id)
        expressions = {k: v.model_dump(mode="json") for k, v in manifest.expressions.items()}
        expressions[name] = face.model_dump(mode="json")
        files = {f"expressions/{name}.png": preview} if preview else {}
        roles = {f"expressions/{name}.png": {"role": "expression", "expression": name}} if preview else {}
        self._precheck(manifest, {"expressions": expressions})
        updated = self.library.update(AssetType.character, character_id, {"expressions": expressions}, files, roles,
                                      change_summary=f"Register expression '{name}'")
        return updated  # type: ignore[return-value]

    def register_pose(self, character_id: str, name: str, pose: dict[str, PartPose], preview: Path | None = None) -> CharacterManifest:
        manifest = self.get(character_id)
        poses = {k: {p: v.model_dump() for p, v in parts.items()} for k, parts in manifest.poses.items()}
        poses[name] = {p: v.model_dump() for p, v in pose.items()}
        files = {f"poses/{name}.png": preview} if preview else {}
        roles = {f"poses/{name}.png": {"role": "pose", "pose": name}} if preview else {}
        self._precheck(manifest, {"poses": poses})
        updated = self.library.update(AssetType.character, character_id, {"poses": poses}, files, roles,
                                      change_summary=f"Register pose '{name}'")
        return updated  # type: ignore[return-value]

    def _precheck(self, manifest: CharacterManifest, changes: dict[str, Any]) -> None:
        """Validate a change before any version is written."""
        candidate = CharacterManifest.model_validate({**manifest.model_dump(mode="json"), **changes})
        issues = [i for i in self.rig_issues(candidate) if i["path"].startswith(("expressions.", "poses."))]
        if issues:
            raise ValidationFailed(f"Change to '{manifest.id}' has invalid references", issues)

    # -------------------------------------------------------- compatibility
    def check_animation(self, manifest: CharacterManifest, clip: AnimationClip) -> None:
        """Refuse to give a character a clip its rig cannot play."""
        if manifest.rig.template not in clip.rig_compatibility:
            raise IncompatibleAsset(
                f"Animation '{clip.code}' is for rig {clip.rig_compatibility}, but '{manifest.id}' uses '{manifest.rig.template}'",
                details={"animation": clip.code, "character": manifest.id, "rig": manifest.rig.template})
        missing = [p for p in clip.driven_parts() if manifest.rig.part(p) is None]
        if missing:
            raise IncompatibleAsset(f"Animation '{clip.code}' drives parts that '{manifest.id}' does not have: {', '.join(missing)}",
                                    details={"animation": clip.code, "character": manifest.id, "missing_parts": missing})
        for part, keys in clip.variant_tracks.items():
            have = manifest.rig.part(part).variants  # type: ignore[union-attr]
            bad = sorted({k.variant for k in keys if k.variant not in have and k.variant != "none"})
            if bad:
                raise IncompatibleAsset(f"Animation '{clip.code}' needs images {bad} for part '{part}' that '{manifest.id}' lacks")

    def continuity_issues(self, uses: list[tuple[str, str, int]]) -> list[dict[str, str]]:
        """`uses`: (where, character id, asset version). One character must keep one version and intact files."""
        issues: list[dict[str, str]] = []
        seen: dict[str, tuple[str, int]] = {}
        checked: set[tuple[str, int]] = set()
        for where, cid, version in uses:
            if cid in seen and seen[cid][1] != version:
                issues.append({"path": where, "message": f"'{cid}' appears as version {version} here but version {seen[cid][1]} in {seen[cid][0]}"})
            seen.setdefault(cid, (where, version))
            if (cid, version) not in checked:
                checked.add((cid, version))
                try:
                    self.library.require_intact(AssetType.character, cid, version)
                except AssetIntegrityError as exc:
                    issues.append({"path": where, "message": f"'{cid}' v{version}: files differ from the registered design ({len(exc.details['problems'])} problems)"})
                except Exception as exc:  # missing asset or version
                    issues.append({"path": where, "message": getattr(exc, "message", str(exc))})
        return issues
