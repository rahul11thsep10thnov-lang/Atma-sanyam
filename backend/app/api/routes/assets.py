"""Authenticated, ownership-checked asset downloads (build spec section 19 /
docs/PRIVACY.md "Download security"). Raw storage paths are never exposed
to the client directly."""
from fastapi import APIRouter, Depends, Query
from fastapi.responses import FileResponse
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db, get_storage
from app.core.errors import AppError
from app.models.user import User
from app.models.video import VideoAsset
from app.models.voice import AudioAsset
from app.services.storage.base import StorageService

router = APIRouter(prefix="/assets", tags=["assets"])


@router.get("/{asset_id}/download")
def download_asset(
    asset_id: str,
    type: str = Query(..., description="video|audio"),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    storage: StorageService = Depends(get_storage),
):
    if type == "video":
        asset = db.execute(
            select(VideoAsset).where(VideoAsset.id == asset_id, VideoAsset.owner_id == user.id)
        ).scalar_one_or_none()
        path = asset.video_path if asset else None
        filename = "lesson_video.mp4"
    elif type == "audio":
        asset = db.execute(
            select(AudioAsset).where(AudioAsset.id == asset_id, AudioAsset.owner_id == user.id)
        ).scalar_one_or_none()
        path = asset.audio_path if asset else None
        filename = "lesson_audio.wav"
    else:
        raise AppError("INVALID_ASSET_TYPE", "type must be 'video' or 'audio'.")

    if asset is None or not path or not storage.exists(path):
        raise AppError("ASSET_NOT_FOUND", "Asset not found or has been deleted.", status_code=404)
    return FileResponse(path, filename=filename)
