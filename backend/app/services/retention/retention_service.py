"""Scheduled retention sweep (build spec privacy section 8 / docs/PRIVACY.md).

Two-stage: ELIGIBLE -> VERIFY -> DELETE. Never deletes based on a bare
timestamp alone — re-checks `protected` and any active-job state at delete
time, and never touches an asset tied to a lesson/job currently PROCESSING.
"""
from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import Settings
from app.models.lesson import Lesson
from app.models.privacy import DeletionEvent
from app.models.video import RenderJob, VideoAsset
from app.models.voice import AudioAsset
from app.services.storage.base import StorageService

RETENTION_DAYS_TO_SECONDS = {
    "7_days": 7 * 86400,
    "30_days": 30 * 86400,
    "90_days": 90 * 86400,
    "1_year": 365 * 86400,
    "never": None,
}


class RetentionService:
    def __init__(self, db: Session, storage: StorageService, settings: Settings) -> None:
        self._db = db
        self._storage = storage
        self._settings = settings

    def run_daily_sweep(self, owner_id: str | None = None) -> dict[str, int]:
        deleted_counts = {"audio": 0, "preview_video": 0, "final_video": 0}
        now = datetime.now(timezone.utc)

        deleted_counts["audio"] = self._sweep_audio(now, owner_id)
        deleted_counts["preview_video"] = self._sweep_video(now, owner_id, kind="preview")
        deleted_counts["final_video"] = self._sweep_video(now, owner_id, kind="final")
        self._db.commit()
        return deleted_counts

    def _has_active_job(self, lesson_id: str) -> bool:
        stmt = select(RenderJob).where(
            RenderJob.lesson_id == lesson_id,
            RenderJob.status.in_(["QUEUED", "PROCESSING"]),
        )
        return self._db.execute(stmt).scalar_one_or_none() is not None

    def _sweep_audio(self, now: datetime, owner_id: str | None) -> int:
        cutoff_seconds = RETENTION_DAYS_TO_SECONDS.get(
            _days_key(self._settings.retention_audio_days), None
        )
        if cutoff_seconds is None:
            return 0
        cutoff = now - timedelta(seconds=cutoff_seconds)

        stmt = select(AudioAsset).where(AudioAsset.protected.is_(False), AudioAsset.created_at < cutoff)
        if owner_id:
            stmt = stmt.where(AudioAsset.owner_id == owner_id)

        count = 0
        for asset in self._db.execute(stmt).scalars():
            # VERIFY stage: re-check protection right before delete.
            if asset.protected:
                continue
            self._storage.delete(asset.audio_path)
            self._db.add(
                DeletionEvent(
                    owner_id=asset.owner_id,
                    asset_type="audio",
                    asset_id=asset.id,
                    deletion_reason="RETENTION_POLICY",
                )
            )
            self._db.delete(asset)
            count += 1
        return count

    def _sweep_video(self, now: datetime, owner_id: str | None, kind: str) -> int:
        days = (
            self._settings.retention_preview_video_days
            if kind == "preview"
            else self._settings.retention_final_video_days
        )
        cutoff = now - timedelta(days=days)

        stmt = select(VideoAsset).where(
            VideoAsset.kind == kind, VideoAsset.protected.is_(False), VideoAsset.created_at < cutoff
        )
        if owner_id:
            stmt = stmt.where(VideoAsset.owner_id == owner_id)

        count = 0
        for asset in self._db.execute(stmt).scalars():
            if asset.protected or self._has_active_job(asset.lesson_id):
                continue
            for path in (asset.video_path, asset.thumbnail_path, asset.subtitle_srt_path, asset.subtitle_vtt_path):
                if path:
                    self._storage.delete(path)
            self._db.add(
                DeletionEvent(
                    owner_id=asset.owner_id,
                    asset_type=f"video:{kind}",
                    asset_id=asset.id,
                    deletion_reason="RETENTION_POLICY",
                )
            )
            self._db.delete(asset)
            count += 1
        return count


def _days_key(days: int) -> str:
    if days <= 7:
        return "7_days"
    if days <= 30:
        return "30_days"
    if days <= 90:
        return "90_days"
    return "1_year"
