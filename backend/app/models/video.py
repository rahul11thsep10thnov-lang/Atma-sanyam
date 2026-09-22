from sqlalchemy import JSON, ForeignKey, Integer, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.base import OwnedMixin, TimestampMixin, UUIDMixin


class VideoAsset(Base, UUIDMixin, TimestampMixin, OwnedMixin):
    __tablename__ = "video_assets"

    lesson_id: Mapped[str] = mapped_column(ForeignKey("lessons.id"), index=True)
    kind: Mapped[str] = mapped_column(default="final")  # preview|final
    version: Mapped[int] = mapped_column(Integer, default=1)
    video_path: Mapped[str] = mapped_column(default="")
    thumbnail_path: Mapped[str] = mapped_column(default="")
    subtitle_srt_path: Mapped[str] = mapped_column(default="")
    subtitle_vtt_path: Mapped[str] = mapped_column(default="")
    duration_ms: Mapped[int] = mapped_column(Integer, default=0)
    width: Mapped[int] = mapped_column(Integer, default=1920)
    height: Mapped[int] = mapped_column(Integer, default=1080)
    fps: Mapped[int] = mapped_column(Integer, default=30)
    render_hash: Mapped[str] = mapped_column(default="", index=True)
    protected: Mapped[bool] = mapped_column(default=False)


class RenderJob(Base, UUIDMixin, TimestampMixin, OwnedMixin):
    __tablename__ = "render_jobs"

    lesson_id: Mapped[str] = mapped_column(ForeignKey("lessons.id"), index=True)
    kind: Mapped[str] = mapped_column(default="final")  # preview|final
    status: Mapped[str] = mapped_column(default="QUEUED", index=True)
    progress: Mapped[int] = mapped_column(Integer, default=0)
    error_message: Mapped[str] = mapped_column(Text, default="")
    retry_count: Mapped[int] = mapped_column(Integer, default=0)
    logs: Mapped[str] = mapped_column(Text, default="")
    video_asset_id: Mapped[str | None] = mapped_column(default=None)


class QualityReport(Base, UUIDMixin, TimestampMixin, OwnedMixin):
    __tablename__ = "quality_reports"

    lesson_id: Mapped[str] = mapped_column(ForeignKey("lessons.id"), index=True)
    video_asset_id: Mapped[str | None] = mapped_column(default=None)
    status: Mapped[str] = mapped_column(default="PASS")  # PASS|WARNING|FAIL
    issues: Mapped[list] = mapped_column(JSON, default=list)

    lesson: Mapped["Lesson"] = relationship(back_populates="quality_reports")
