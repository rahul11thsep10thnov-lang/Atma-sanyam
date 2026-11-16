"""Media delivery. Files are addressed by ids or by library-relative names; nothing here reveals a filesystem path."""
from __future__ import annotations

import uuid

from fastapi import APIRouter
from fastapi.responses import FileResponse

from engine.common.paths import safe_join
from engine.schema.assets import AssetType

from ...deps import AnyUser, Ctx, Db
from ...errors import ApiError, not_found
from ...models import AudioAsset, RenderOutput

router = APIRouter(prefix="/media", tags=["media"])
SERVABLE = {".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".wav": "audio/wav"}


@router.get("/outputs/{output_id}", summary="A rendered video", response_class=FileResponse)
def output(output_id: uuid.UUID, ctx: Ctx, db: Db, _: AnyUser, download: bool = False):
    row = db.get(RenderOutput, output_id)
    if row is None:
        raise not_found("Render output", output_id)
    path = safe_join(ctx.paths.renders, row.file_reference)
    if not path.is_file():
        raise ApiError(410, "gone", "This render is no longer stored; render the story again")
    name = f"{row.output_type}_{row.scene_code or 'story'}_{row.resolution}.mp4"
    return FileResponse(path, media_type="video/mp4", filename=name if download else None,
                        content_disposition_type="attachment" if download else "inline")


@router.get("/audio/{audio_id}", summary="A generated narration or dialogue clip", response_class=FileResponse)
def audio(audio_id: uuid.UUID, ctx: Ctx, db: Db, _: AnyUser):
    row = db.get(AudioAsset, audio_id)
    if row is None:
        raise not_found("Audio", audio_id)
    path = safe_join(ctx.paths.renders / "audio" / "cache", row.file_reference)
    if not path.is_file():
        raise ApiError(410, "gone", "This audio is no longer stored; generate it again")
    return FileResponse(path, media_type="audio/wav")


@router.get("/assets/{asset_type}/{asset_id}/{file_path:path}", summary="An image or sound belonging to a library asset",
            response_class=FileResponse)
def asset_file(asset_type: AssetType, asset_id: str, file_path: str, ctx: Ctx, _: AnyUser, version: int | None = None):
    suffix = "." + file_path.rsplit(".", 1)[-1].lower() if "." in file_path else ""
    if suffix not in SERVABLE:
        raise ApiError(404, "not_found", "No such file")
    library = ctx.services["hub"].library
    manifest = library.load(asset_type, asset_id, version)
    if manifest.file_entry(file_path) is None:              # only files the manifest lists are ever served
        raise ApiError(404, "not_found", "No such file")
    return FileResponse(library.file_path(asset_type, asset_id, file_path, version), media_type=SERVABLE[suffix],
                        headers={"Cache-Control": "private, max-age=300"})
