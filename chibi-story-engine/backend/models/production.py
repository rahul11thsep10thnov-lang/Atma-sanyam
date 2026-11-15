"""Audio assets, render jobs and render outputs."""
from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import CheckConstraint, DateTime, Float, ForeignKey, Index, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base, Timestamps, uuid_pk

JOB_STATUSES = ("queued", "running", "completed", "failed", "cancelled", "interrupted")


class AudioAsset(Base, Timestamps):
    __tablename__ = "audio_assets"
    id: Mapped[uuid.UUID] = uuid_pk()
    story_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("stories.id", ondelete="CASCADE"), nullable=False, index=True)
    scene_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("scenes.id", ondelete="SET NULL"))
    audio_type: Mapped[str] = mapped_column(String(24), nullable=False)
    speaker_id: Mapped[str | None] = mapped_column(String(64))
    line_code: Mapped[str | None] = mapped_column(String(200))
    language: Mapped[str] = mapped_column(String(16), default="hi-IN", nullable=False)
    file_reference: Mapped[str] = mapped_column(String(500), nullable=False)
    duration: Mapped[float] = mapped_column(Float, nullable=False)
    metadata_json: Mapped[dict[str, Any]] = mapped_column(JSONB, default=dict, nullable=False)
    __table_args__ = (
        CheckConstraint("audio_type in ('narration','dialogue','music','sound_effect','mix')", name="type_valid"),
        CheckConstraint("duration >= 0", name="duration_non_negative"),
    )


class RenderJob(Base, Timestamps):
    __tablename__ = "render_jobs"
    id: Mapped[uuid.UUID] = uuid_pk()
    story_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("stories.id", ondelete="CASCADE"), nullable=False, index=True)
    story_version: Mapped[int] = mapped_column(Integer, nullable=False)
    job_type: Mapped[str] = mapped_column(String(24), default="story", nullable=False)
    status: Mapped[str] = mapped_column(String(16), default="queued", nullable=False, index=True)
    progress: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    current_scene: Mapped[str | None] = mapped_column(String(64))
    scene_status: Mapped[dict[str, Any]] = mapped_column(JSONB, default=dict, nullable=False)
    cancel_requested: Mapped[bool] = mapped_column(default=False, nullable=False)
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    error_message: Mapped[str | None] = mapped_column(Text)
    configuration_json: Mapped[dict[str, Any]] = mapped_column(JSONB, default=dict, nullable=False)
    log_reference: Mapped[str | None] = mapped_column(String(500))
    created_by: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))
    outputs: Mapped[list["RenderOutput"]] = relationship(back_populates="job", cascade="all, delete-orphan")
    __table_args__ = (
        CheckConstraint("status in ('queued','running','completed','failed','cancelled','interrupted')", name="status_valid"),
        CheckConstraint("progress >= 0 and progress <= 1", name="progress_range"),
    )


class RenderOutput(Base):
    __tablename__ = "render_outputs"
    id: Mapped[uuid.UUID] = uuid_pk()
    render_job_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("render_jobs.id", ondelete="CASCADE"), nullable=False, index=True)
    scene_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("scenes.id", ondelete="SET NULL"))
    scene_code: Mapped[str | None] = mapped_column(String(64))
    output_type: Mapped[str] = mapped_column(String(24), nullable=False)
    file_reference: Mapped[str] = mapped_column(String(500), nullable=False)
    duration: Mapped[float] = mapped_column(Float, nullable=False)
    resolution: Mapped[str] = mapped_column(String(16), nullable=False)
    checksum: Mapped[str] = mapped_column(String(64), nullable=False)
    cached: Mapped[bool] = mapped_column(default=False, nullable=False)
    published: Mapped[bool] = mapped_column(default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    job: Mapped[RenderJob] = relationship(back_populates="outputs")
    __table_args__ = (
        CheckConstraint("output_type in ('scene','preview','final','audio','frame')", name="type_valid"),
        Index("ix_render_outputs_type", "output_type"),
    )
