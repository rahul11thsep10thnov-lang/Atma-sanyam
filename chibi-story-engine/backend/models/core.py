"""Users, projects, stories and their scenes/shots."""
from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import CheckConstraint, DateTime, Float, ForeignKey, Index, Integer, String, Text, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base, SoftDelete, Timestamps, uuid_pk

ROLES = ("admin", "producer", "reviewer", "viewer")
STORY_STATUSES = ("draft", "analysed", "storyboarded", "in_production", "rendered", "published")


class User(Base, Timestamps):
    __tablename__ = "users"
    id: Mapped[uuid.UUID] = uuid_pk()
    email: Mapped[str] = mapped_column(String(320), unique=True, nullable=False)
    password_hash: Mapped[str | None] = mapped_column(String(200))
    external_auth_id: Mapped[str | None] = mapped_column(String(200), unique=True)
    role: Mapped[str] = mapped_column(String(20), nullable=False, default="viewer")
    is_active: Mapped[bool] = mapped_column(default=True, nullable=False)
    __table_args__ = (CheckConstraint("role in ('admin','producer','reviewer','viewer')", name="role_valid"),)


class Project(Base, Timestamps, SoftDelete):
    __tablename__ = "projects"
    id: Mapped[uuid.UUID] = uuid_pk()
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str] = mapped_column(Text, default="", nullable=False)
    default_language: Mapped[str] = mapped_column(String(16), default="hi-IN", nullable=False)
    visual_style: Mapped[str] = mapped_column(String(64), default="premium_chibi_anime", nullable=False)
    default_resolution: Mapped[str] = mapped_column(String(16), default="1920x1080", nullable=False)
    default_fps: Mapped[int] = mapped_column(Integer, default=24, nullable=False)
    stories: Mapped[list["Story"]] = relationship(back_populates="project")
    __table_args__ = (
        CheckConstraint("default_fps between 1 and 120", name="fps_range"),
        CheckConstraint("default_resolution ~ '^[0-9]{2,5}x[0-9]{2,5}$'", name="resolution_format"),
        Index("uq_projects_name_live", "name", unique=True, postgresql_where="deleted_at IS NULL"),
    )


class Story(Base, Timestamps, SoftDelete):
    __tablename__ = "stories"
    id: Mapped[uuid.UUID] = uuid_pk()
    project_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("projects.id", ondelete="RESTRICT"), nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(300), nullable=False)
    original_text: Mapped[str] = mapped_column(Text, nullable=False)
    language: Mapped[str] = mapped_column(String(16), default="hi-IN", nullable=False)
    genre: Mapped[str | None] = mapped_column(String(64))
    moral: Mapped[str | None] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(24), default="draft", nullable=False, index=True)
    current_version: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    analysis_json: Mapped[dict[str, Any] | None] = mapped_column(JSONB)
    settings_json: Mapped[dict[str, Any]] = mapped_column(JSONB, default=dict, nullable=False)
    project: Mapped[Project] = relationship(back_populates="stories")
    versions: Mapped[list["StoryVersion"]] = relationship(back_populates="story", order_by="StoryVersion.version_number")
    scenes: Mapped[list["Scene"]] = relationship(back_populates="story", order_by="Scene.scene_number")
    __table_args__ = (
        CheckConstraint("status in ('draft','analysed','storyboarded','in_production','rendered','published')", name="status_valid"),
        CheckConstraint("length(btrim(title)) > 0", name="title_not_blank"),
        CheckConstraint("length(btrim(original_text)) > 0", name="text_not_blank"),
    )


class StoryVersion(Base):
    __tablename__ = "story_versions"
    id: Mapped[uuid.UUID] = uuid_pk()
    story_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("stories.id", ondelete="CASCADE"), nullable=False)
    version_number: Mapped[int] = mapped_column(Integer, nullable=False)
    story_json: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False)
    change_summary: Mapped[str] = mapped_column(Text, default="", nullable=False)
    created_by: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    story: Mapped[Story] = relationship(back_populates="versions")
    __table_args__ = (UniqueConstraint("story_id", "version_number"), CheckConstraint("version_number >= 1", name="version_positive"))


class Scene(Base, Timestamps):
    """Projection of one scene of the story's current version (stable id per scene code)."""

    __tablename__ = "scenes"
    id: Mapped[uuid.UUID] = uuid_pk()
    story_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("stories.id", ondelete="CASCADE"), nullable=False)
    scene_code: Mapped[str] = mapped_column(String(64), nullable=False)
    scene_number: Mapped[int] = mapped_column(Integer, nullable=False)
    title: Mapped[str] = mapped_column(String(300), default="", nullable=False)
    description: Mapped[str] = mapped_column(Text, default="", nullable=False)
    duration: Mapped[float] = mapped_column(Float, nullable=False)
    environment_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("environments.id", ondelete="SET NULL"))
    environment_code: Mapped[str] = mapped_column(String(64), nullable=False)
    status: Mapped[str] = mapped_column(String(24), default="pending", nullable=False)
    scene_json: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False)
    story: Mapped[Story] = relationship(back_populates="scenes")
    shots: Mapped[list["Shot"]] = relationship(back_populates="scene", order_by="Shot.shot_number", cascade="all, delete-orphan")
    __table_args__ = (
        UniqueConstraint("story_id", "scene_code"),
        Index("ix_scenes_story_number", "story_id", "scene_number"),
        CheckConstraint("duration > 0", name="duration_positive"),
        CheckConstraint("status in ('pending','approved','rejected')", name="status_valid"),
    )


class Shot(Base):
    __tablename__ = "shots"
    id: Mapped[uuid.UUID] = uuid_pk()
    scene_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("scenes.id", ondelete="CASCADE"), nullable=False)
    shot_code: Mapped[str] = mapped_column(String(64), nullable=False)
    shot_number: Mapped[int] = mapped_column(Integer, nullable=False)
    duration: Mapped[float] = mapped_column(Float, nullable=False)
    camera_configuration: Mapped[dict[str, Any]] = mapped_column(JSONB, default=dict, nullable=False)
    composition_json: Mapped[dict[str, Any]] = mapped_column(JSONB, default=dict, nullable=False)
    animation_json: Mapped[dict[str, Any]] = mapped_column(JSONB, default=dict, nullable=False)
    scene: Mapped[Scene] = relationship(back_populates="shots")
    __table_args__ = (UniqueConstraint("scene_id", "shot_code"), CheckConstraint("duration > 0", name="duration_positive"))


class AuditLog(Base):
    __tablename__ = "audit_log"
    id: Mapped[uuid.UUID] = uuid_pk()
    at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False, index=True)
    user_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))
    action: Mapped[str] = mapped_column(String(64), nullable=False)
    entity_type: Mapped[str] = mapped_column(String(48), nullable=False)
    entity_id: Mapped[str] = mapped_column(String(64), nullable=False)
    details: Mapped[dict[str, Any]] = mapped_column(JSONB, default=dict, nullable=False)
    __table_args__ = (Index("ix_audit_entity", "entity_type", "entity_id"),)
