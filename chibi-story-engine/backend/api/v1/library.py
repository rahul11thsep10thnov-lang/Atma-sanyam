"""Asset library endpoints: assets, characters, environments, animations, voices, uploads, approvals."""
from __future__ import annotations

import io
import shutil
import tempfile
import uuid
import wave
from pathlib import Path
from typing import Any, Literal

from fastapi import APIRouter, File, Form, Query, UploadFile
from pydantic import BaseModel, ConfigDict, Field

from engine.camera.presets import CAMERA_PRESETS
from engine.character_manager.registry import CharacterRegistry
from engine.composition.effects import EFFECT_TYPES
from engine.environment_manager.lighting import LIGHTING_PRESETS, SEASON_PRESETS, WEATHER_PRESETS
from engine.schema.assets import AssetType, CharacterManifest, EnvironmentManifest

from ...deps import AnyUser, Ctx, Db, Producer, Reviewer
from ...errors import ApiError
from ...services import audit
from ...services.engine import sync_library

router = APIRouter(tags=["library"])
ID = r"^[a-z0-9][a-z0-9_\-]{0,63}$"
IMAGE_MAGIC = {b"\x89PNG\r\n\x1a\n": "png", b"\xff\xd8\xff": "jpeg"}


class CharacterCreate(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)
    character_code: str = Field(pattern=ID)
    display_name: str = Field(min_length=1, max_length=200)
    based_on: str = Field(pattern=ID, description="existing character whose rig and art this one starts from")
    aliases: list[str] = Field(default_factory=list, max_length=20)
    description: str = Field("", max_length=2000)
    default_voice: str | None = Field(None, pattern=ID)


class ApprovalIn(BaseModel):
    model_config = ConfigDict(extra="forbid")
    status: Literal["approved", "rejected", "pending"]


def _lib(ctx):
    return ctx.services["hub"].library


def _media(asset_type: str, asset_id: str, rel: str) -> str:
    return f"/api/v1/media/assets/{asset_type}/{asset_id}/{rel}"


def asset_out(manifest, versions: list[int]) -> dict[str, Any]:
    t = manifest.asset_type.value
    thumb = None
    for role in ("reference", "view", "image", "layer", "sprite"):
        files = [f for f in manifest.files_by_role(role) if f.format in ("png", "jpeg", "webp")]
        if files:
            thumb = _media(t, manifest.id, next((f.path for f in files if "front" in f.path), files[0].path))
            break
    return {"id": manifest.id, "asset_type": t, "name": manifest.name, "description": manifest.description, "version": manifest.version,
            "versions": versions, "approval_status": manifest.approval_status.value, "tags": manifest.tags, "aliases": manifest.aliases,
            "licence": manifest.licence.name, "file_count": len(manifest.files), "thumbnail_url": thumb,
            "catalog_code": manifest.catalog_code, "category": manifest.category, "subcategory": manifest.subcategory,
            "related_stories": manifest.related_stories,
            "duration_seconds": getattr(manifest, "duration_seconds", None),
            "audio_url": _media(t, manifest.id, manifest.file) if t in ("music", "sound_effect") else None}


def character_out(m: CharacterManifest, versions: list[int], issues: list[dict]) -> dict[str, Any]:
    by_role = lambda role: [{"name": f.expression or f.pose or f.view or Path(f.path).stem, "url": _media("character", m.id, f.path)}
                            for f in m.files_by_role(role)]
    return {**asset_out(m, versions), "character_code": m.id, "display_name": m.name, "species": m.species,
            "visual_identity": m.visual_identity, "continuity_rules": m.continuity_rules, "default_voice": m.default_voice,
            "rig_template": m.rig.template, "parts": m.rig.part_ids(), "expressions": sorted(m.expressions), "poses": sorted(m.poses),
            "states": m.states, "habitat": m.compatibility.get("habitat"), "attach_points": sorted(m.rig.attach_points),
            "references": by_role("reference"), "expression_images": by_role("expression"), "pose_images": by_role("pose"),
            "svg_master_count": len(m.files_by_role("svg_master")), "problems": issues}


def environment_out(m: EnvironmentManifest, versions: list[int]) -> dict[str, Any]:
    return {**asset_out(m, versions), "environment_code": m.id, "anchors": {k: v.model_dump() for k, v in m.anchors.items()},
            "lighting_presets": m.lighting_presets, "default_anchor_by_role": m.default_anchor_by_role,
            "camera_bounds": list(m.camera_bounds), "compatibility": m.compatibility,
            "preview_url": f"/api/v1/environments/{m.id}/preview",
            "composite_url": next((_media("environment", m.id, f.path) for f in m.files_by_role("preview")), None),
            "layers": [{"id": l.id, "type": l.type, "parallax": l.parallax, "order": l.order, "animated": bool(l.motion),
                        "scare": l.scare, "tint_group": l.tint_group, "rect": list(l.rect), "cover": l.cover,
                        "svg_url": _media("environment", m.id, l.svg) if l.svg else None,
                        "url": _media("environment", m.id, l.file)} for l in m.layers]}


@router.get("/assets", summary="Search the asset library (exact id first, then names, aliases and tags)")
def list_assets(ctx: Ctx, _: AnyUser, asset_type: AssetType | None = None, q: str | None = Query(None, max_length=100)) -> list[dict[str, Any]]:
    library = _lib(ctx)
    if q:
        found = library.search(q, asset_type)
    else:
        types = [asset_type] if asset_type else list(AssetType)
        found = [library.load(t, aid) for t in types for aid in library.list_ids(t)]
    return [asset_out(m, library.versions(m.asset_type, m.id)) for m in found]


@router.post("/assets", status_code=201, summary="Upload a prop image or a sound (new asset, or a new version of an existing one)")
async def upload_asset(ctx: Ctx, db: Db, user: Producer, asset_id: str = Form(pattern=ID), name: str = Form(min_length=1, max_length=200),
                       asset_type: Literal["prop", "sound_effect", "music"] = Form(), tags: str = Form(""), description: str = Form("", max_length=2000),
                       licence: str = Form("unspecified", max_length=100), file: UploadFile = File()) -> dict[str, Any]:
    library, limit = _lib(ctx), ctx.settings.max_upload_bytes
    data = await file.read(limit + 1)
    if len(data) > limit:
        raise ApiError(413, "file_too_large", f"Uploads are limited to {limit // (1024 * 1024)} MB")
    tag_list = [t.strip().lower() for t in tags.split(",") if t.strip()][:20]
    with tempfile.TemporaryDirectory(prefix="csae_upload_") as tmp:
        if asset_type == "prop":
            kind = next((v for k, v in IMAGE_MAGIC.items() if data.startswith(k)), None)      # judged by content, not by file name
            if kind is None:
                raise ApiError(415, "unsupported_media_type", "A prop must be a PNG or JPEG image")
            from PIL import Image
            try:
                with Image.open(io.BytesIO(data)) as im:
                    im.verify()
                with Image.open(io.BytesIO(data)) as im:
                    width, height = im.size
                    if width > 4096 or height > 4096:
                        raise ApiError(422, "validation_failed", "Images may be at most 4096 pixels on a side")
                    src = Path(tmp) / "prop.png"
                    im.convert("RGBA").save(src)                                             # re-encoded: nothing but pixels survives
            except ApiError:
                raise
            except Exception as exc:
                raise ApiError(415, "unsupported_media_type", "The image could not be read") from exc
            scale = min(1.0, 160 / max(width, height))
            manifest_data = {"id": asset_id, "asset_type": "prop", "name": name, "tags": tag_list, "description": description,
                             "file": "prop.png", "size": [round(width * scale), round(height * scale)], "pivot": [0.5, 0.5],
                             "licence": {"name": licence, "author": user.email, "source": "upload"}}
            rel, role = "prop.png", "image"
        else:
            if not (data[:4] == b"RIFF" and data[8:12] == b"WAVE"):
                raise ApiError(415, "unsupported_media_type", "Audio must be a WAV file")
            src = Path(tmp) / "audio.wav"
            src.write_bytes(data)
            try:
                with wave.open(str(src), "rb") as w:
                    duration = w.getnframes() / float(w.getframerate())
            except (wave.Error, EOFError) as exc:
                raise ApiError(415, "unsupported_media_type", "The WAV file could not be read") from exc
            if not 0.05 <= duration <= 600:
                raise ApiError(422, "validation_failed", "Audio must be between 0.05 and 600 seconds long")
            manifest_data = {"id": asset_id, "asset_type": asset_type, "name": name, "tags": tag_list, "description": description,
                             "file": "audio.wav", "duration_seconds": round(duration, 4),
                             "licence": {"name": licence, "author": user.email, "source": "upload"}}
            rel, role = "audio.wav", "audio"
        if library.exists(asset_type, asset_id):
            changes = {k: v for k, v in manifest_data.items() if k not in ("id", "asset_type")}
            manifest = library.update(asset_type, asset_id, changes, {rel: src}, {rel: {"role": role}}, change_summary=f"Upload by {user.email}")
        else:
            manifest = library.register(manifest_data, {rel: src}, {rel: {"role": role}})
    sync_library(db, library)
    audit.record(db, user.id, "asset.uploaded", "asset", f"{asset_type}/{asset_id}", version=manifest.version)
    return asset_out(manifest, library.versions(asset_type, asset_id))


@router.post("/assets/{asset_type}/{asset_id}/approval", summary="Approve or reject the current version of an asset (reviewer)")
def set_approval(asset_type: AssetType, asset_id: str, body: ApprovalIn, ctx: Ctx, db: Db, user: Reviewer) -> dict[str, Any]:
    library = _lib(ctx)
    manifest = library.set_approval(asset_type, asset_id, body.status)
    sync_library(db, library)
    audit.record(db, user.id, f"asset.{body.status}", "asset", f"{asset_type.value}/{asset_id}", version=manifest.version)
    return asset_out(manifest, library.versions(asset_type, asset_id))


@router.get("/assets/{asset_type}/{asset_id}/verify", summary="Check every file of an asset against its recorded checksum")
def verify_asset(asset_type: AssetType, asset_id: str, ctx: Ctx, _: AnyUser, version: int | None = None) -> dict[str, Any]:
    problems = _lib(ctx).verify(asset_type, asset_id, version)
    return {"intact": not problems, "problems": problems}


@router.get("/characters")
def list_characters(ctx: Ctx, _: AnyUser) -> list[dict[str, Any]]:
    library = _lib(ctx)
    registry = CharacterRegistry(library)
    return [character_out(m, library.versions(AssetType.character, m.id), registry.missing_assets(m.id)) for m in registry.list()]


@router.get("/characters/{character_code}")
def get_character(character_code: str, ctx: Ctx, _: AnyUser, version: int | None = None) -> dict[str, Any]:
    library = _lib(ctx)
    registry = CharacterRegistry(library)
    m = registry.get(character_code, version)
    return character_out(m, library.versions(AssetType.character, m.id), registry.missing_assets(m.id, version))


@router.post("/characters", status_code=201, summary="Register a new character that starts from an existing character's rig")
def create_character(body: CharacterCreate, ctx: Ctx, db: Db, user: Producer) -> dict[str, Any]:
    library = _lib(ctx)
    registry = CharacterRegistry(library)
    if library.exists(AssetType.character, body.character_code):
        raise ApiError(409, "conflict", f"Character '{body.character_code}' already exists")
    if body.default_voice and not ctx.services["hub"].voices.has(body.default_voice):
        raise ApiError(422, "validation_failed", "Unknown voice", {"issues": [{"path": "default_voice", "message": f"no voice '{body.default_voice}'"}]})
    base = registry.get(body.based_on)
    base_dir = library.asset_dir(AssetType.character, base.id)
    data = base.model_dump(mode="json", exclude={"files", "created_at", "version", "approval_status", "change_summary"})
    data.update({"id": body.character_code, "name": body.display_name, "aliases": body.aliases, "default_voice": body.default_voice or base.default_voice,
                 "description": body.description or f"Based on {base.id}.",
                 "licence": {**base.licence.model_dump(), "notes": f"derived from {base.id} v{base.version}"}})
    parts = {f.path: base_dir / f.path for f in base.files_by_role("rig_part")}
    extra = {f.path: (base_dir / f.path, {"role": f.role, "view": f.view, "expression": f.expression, "pose": f.pose})
             for f in base.files if f.role != "rig_part"}
    manifest = registry.create(data, parts, extra)
    sync_library(db, library)
    audit.record(db, user.id, "character.created", "character", manifest.id, based_on=base.id)
    return character_out(manifest, [1], registry.missing_assets(manifest.id))


@router.get("/environments")
def list_environments(ctx: Ctx, _: AnyUser) -> list[dict[str, Any]]:
    library = _lib(ctx)
    return [environment_out(library.environment(e), library.versions(AssetType.environment, e)) for e in library.list_ids(AssetType.environment)]


@router.get("/components", summary="Reusable vector components (trees, rocks, buildings, lamps, ...) with their SVG masters")
def list_components(ctx: Ctx, _: AnyUser, kind: str | None = Query(None, max_length=40), q: str | None = Query(None, max_length=100)) -> list[dict[str, Any]]:
    library = _lib(ctx)
    out = []
    for cid in library.list_ids(AssetType.component):
        m = library.load(AssetType.component, cid)
        if kind and m.kind != kind:
            continue
        if q and q.lower() not in " ".join([m.id, m.name, *m.tags, *m.aliases]).lower():
            continue
        out.append({**asset_out(m, library.versions(AssetType.component, cid)), "kind": m.kind, "size": list(m.size),
                    "image_url": _media("component", m.id, m.file), "svg_url": _media("component", m.id, m.svg)})
    return out


def _catalogue_totals(ctx) -> dict[str, Any] | None:
    """Story coverage from the generated master catalogue (stories/master_catalogue.json), if it has been built."""
    import json
    path = Path(__file__).resolve().parents[3] / "stories" / "master_catalogue.json"
    if not path.exists():
        return None
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except ValueError:
        return None
    return {**data["totals"], "unmatched_needs": data["unmatched_needs"]}


@router.get("/library/stats", summary="Counts computed from the files on disk: by type, category, kind and approval status")
def library_stats(ctx: Ctx, _: AnyUser) -> dict[str, Any]:
    library = _lib(ctx)
    by_type, approval, env_cats, char_cats, comp_kinds = {}, {}, {}, {}, {}
    layers = svg = scare = png = multi = 0
    signatures: dict[tuple[str, ...], list[str]] = {}
    for t in AssetType:
        ids = library.list_ids(t)
        by_type[t.value] = len(ids)
        for aid in ids:
            m = library.load(t, aid)
            key = f"{t.value}:{m.approval_status.value}"
            approval[key] = approval.get(key, 0) + 1
            svg += len(m.files_by_role("svg_master"))
            png += sum(1 for f in m.files if f.format == "png" and f.role in ("layer", "rig_part", "image", "sprite"))
            multi += 1 if len(m.related_stories) > 1 else 0
            if t in (AssetType.environment, AssetType.character, AssetType.component) and m.files:
                signatures.setdefault(tuple(sorted(f.checksum for f in m.files if f.role in ("layer", "rig_part", "image"))), []).append(f"{t.value}:{m.id}")
            if t == AssetType.environment:
                env_cats[m.category or "uncategorised"] = env_cats.get(m.category or "uncategorised", 0) + 1
                layers += len(m.layers)
                scare += sum(1 for l in m.layers if l.scare)
            elif t == AssetType.character:
                char_cats[m.category or "original"] = char_cats.get(m.category or "original", 0) + 1
            elif t == AssetType.component:
                comp_kinds[m.kind] = comp_kinds.get(m.kind, 0) + 1
    duplicates = [ids for key, ids in signatures.items() if key and len(ids) > 1]
    catalogue = _catalogue_totals(ctx)
    return {"by_type": by_type, "approval": approval, "png_layers": png, "duplicate_asset_groups": duplicates, "assets_used_by_several_stories": multi,
            "stories": catalogue, "environment_categories": env_cats, "character_categories": char_cats,
            "component_kinds": comp_kinds, "environment_layers": layers, "scare_layers": scare, "svg_masters": svg,
            "expressions_per_character": 15, "poses_per_character": 15,
            "not_delivered": ["side, three-quarter and back character views", "separate medium / close-up background compositions"]}


@router.get("/environments/{environment_id}/preview", summary="Render one frame of an environment with a chosen time of day, weather, season and scare level")
def environment_preview(environment_id: str, ctx: Ctx, _: AnyUser, lighting: str = Query("day", max_length=24), weather: str = Query("clear", max_length=24),
                        season: str = Query("summer", max_length=24), scare: int = Query(2, ge=0, le=2), width: int = Query(960, ge=160, le=1920)):
    import io

    from fastapi.responses import Response
    from PIL import Image

    from engine.composition.composer import SceneComposer
    from engine.rendering.raster import render_shot_frame
    from engine.schema.story import parse_story
    library = _lib(ctx)
    if not library.exists(AssetType.environment, environment_id):
        raise ApiError(404, "not_found", "No such environment")
    story = parse_story({"story_id": "env_preview", "output": {"width": 1920, "height": 1080, "fps": 24}, "characters": [],
                         "scenes": [{"scene_id": "s", "environment_id": environment_id, "time_of_day": lighting, "weather": weather, "season": season, "scare_level": scare,
                                     "shots": [{"shot_id": "sh1", "duration_seconds": 2.0, "camera": {"preset": "establishing_wide"}, "characters": [], "actions": [],
                                                "dialogue": [], "effects": [], "props": [], "audio": []}]}]})
    plan, issues = SceneComposer(library).compose(story, "s")
    errors = [i for i in issues if i.severity == "error"]
    if errors:
        raise ApiError(422, "invalid_preview", errors[0].message)
    frame = render_shot_frame(plan.shots[0], 0, width, int(width * 9 / 16)).convert("RGB")
    buf = io.BytesIO()
    frame.save(buf, "JPEG", quality=84)
    return Response(buf.getvalue(), media_type="image/jpeg", headers={"Cache-Control": "private, max-age=300"})


@router.get("/animations")
def list_animations(ctx: Ctx, _: AnyUser, rig: str | None = Query(None, pattern=ID), category: str | None = None) -> list[dict[str, Any]]:
    out = []
    for clip in _lib(ctx).animations().values():
        if (rig and rig not in clip.rig_compatibility) or (category and clip.category != category):
            continue
        out.append({"code": clip.code, "name": clip.name, "category": clip.category, "level": clip.level, "rigs": clip.rig_compatibility,
                    "duration": clip.duration, "loop": clip.loop, "additive": clip.additive, "start_states": clip.start_states,
                    "end_state": clip.end_state, "travels": clip.root_motion.path != "none", "requires_feature": clip.requires_feature,
                    "semantics": clip.metadata.get("semantics", []), "description": clip.description, "parts": clip.driven_parts()})
    return sorted(out, key=lambda c: (c["category"], c["code"]))


@router.get("/voices")
def list_voices(ctx: Ctx, _: AnyUser) -> dict[str, Any]:
    hub = ctx.services["hub"]
    provider = hub.voice_provider()
    return {"provider": provider.name, "provider_available": provider.available(),
            "voices": [{"id": v.id, "name": v.name, "language": v.language, "description": v.description} for v in hub.voices.list()]}


@router.get("/library/presets", summary="Camera presets, lighting, weather, effects and rig templates the engine offers")
def presets(ctx: Ctx, _: AnyUser) -> dict[str, Any]:
    return {"camera_presets": sorted(CAMERA_PRESETS), "lighting": {k: v.description for k, v in LIGHTING_PRESETS.items()},
            "weather": sorted(WEATHER_PRESETS), "effects": sorted(EFFECT_TYPES),
            "rig_templates": [{"id": t.id, "name": t.name, "description": t.description} for t in _lib(ctx).rig_templates().values()],
            "facial_poses": ["neutral", "happy", "sad", "surprised", "angry", "worried", "thinking", "laughing", "speaking", "crying", "frightened",
                             "suspicious", "excited", "disappointed", "determined"],
            "seasons": sorted(SEASON_PRESETS), "scare_levels": [0, 1, 2],
            "poses": ["standing", "walking", "running", "sitting", "sleeping", "jumping", "talking", "pointing", "waving", "fighting", "dancing",
                      "kneeling", "falling", "climbing", "holding_object"]}


@router.post("/library/sync", summary="Re-read the asset library from disk into the database (admin or producer)")
def resync(ctx: Ctx, db: Db, user: Producer) -> dict[str, int]:
    counts = sync_library(db, _lib(ctx))
    audit.record(db, user.id, "library.synced", "library", "all", **counts)
    return counts
