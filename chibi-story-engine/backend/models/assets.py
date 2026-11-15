"""Asset registry mirrored from the file-based asset library (metadata and file references only)."""
from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import CheckConstraint, DateTime, Float, ForeignKey, Integer, String, Text, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base, SoftDelete, Timestamps, uuid_pk

APPROVALS = "approval_status in ('pending','approved','rejected')"


class Asset(Base, Timestamps, SoftDelete):
    """One library asset of any type. `project_id` NULL means it is shared by every project."""

    __tablename__ = "assets"
    id: Mapped[uuid.UUID] = uuid_pk()
    project_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("projects.id", ondelete="RESTRICT"), index=True)
    asset_code: Mapped[str] = mapped_column(String(64), nullable=False)
    asset_type: Mapped[str] = mapped_column(String(24), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str] = mapped_column(Text, default="", nullable=False)
    current_version: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    approval_status: Mapped[str] = mapped_column(String(16), default="pending", nullable=False)
    metadata_json: Mapped[dict[str, Any]] = mapped_column(JSONB, default=dict, nullable=False)
    versions: Mapped[list["AssetVersion"]] = relationship(back_populates="asset", order_by="AssetVersion.version_number", cascade="all, delete-orphan")
    __table_args__ = (
        UniqueConstraint("project_id", "asset_type", "asset_code", postgresql_nulls_not_distinct=True),
        CheckConstraint(APPROVALS, name="approval_valid"),
    )


class AssetVersion(Base):
    __tablename__ = "asset_versions"
    id: Mapped[uuid.UUID] = uuid_pk()
    asset_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("assets.id", ondelete="CASCADE"), nullable=False)
    version_number: Mapped[int] = mapped_column(Integer, nullable=False)
    file_reference: Mapped[str] = mapped_column(String(500), nullable=False)
    checksum: Mapped[str] = mapped_column(String(64), nullable=False)
    approval_status: Mapped[str] = mapped_column(String(16), default="pending", nullable=False)
    change_summary: Mapped[str] = mapped_column(Text, default="", nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    asset: Mapped[Asset] = relationship(back_populates="versions")
    __table_args__ = (
        UniqueConstraint("asset_id", "version_number"),
        CheckConstraint("version_number >= 1", name="version_positive"),
        CheckConstraint(APPROVALS, name="approval_valid"),
    )


class Character(Base, Timestamps, SoftDelete):
    __tablename__ = "characters"
    id: Mapped[uuid.UUID] = uuid_pk()
    asset_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("assets.id", ondelete="CASCADE"), nullable=False, unique=True)
    project_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("projects.id", ondelete="RESTRICT"), index=True)
    character_code: Mapped[str] = mapped_column(String(64), nullable=False)
    display_name: Mapped[str] = mapped_column(String(200), nullable=False)
    species: Mapped[str] = mapped_column(String(64), nullable=False)
    description: Mapped[str] = mapped_column(Text, default="", nullable=False)
    visual_identity_json: Mapped[dict[str, Any]] = mapped_column(JSONB, default=dict, nullable=False)
    continuity_rules_json: Mapped[list[Any]] = mapped_column(JSONB, default=list, nullable=False)
    status: Mapped[str] = mapped_column(String(16), default="pending", nullable=False)
    current_version: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    assets: Mapped[list["CharacterAsset"]] = relationship(back_populates="character", cascade="all, delete-orphan")
    __table_args__ = (UniqueConstraint("project_id", "character_code", postgresql_nulls_not_distinct=True),)


class CharacterAsset(Base):
    __tablename__ = "character_assets"
    id: Mapped[uuid.UUID] = uuid_pk()
    character_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("characters.id", ondelete="CASCADE"), nullable=False, index=True)
    asset_type: Mapped[str] = mapped_column(String(32), nullable=False)
    view: Mapped[str | None] = mapped_column(String(32))
    expression: Mapped[str | None] = mapped_column(String(32))
    pose: Mapped[str | None] = mapped_column(String(32))
    file_reference: Mapped[str] = mapped_column(String(500), nullable=False)
    version: Mapped[int] = mapped_column(Integer, nullable=False)
    metadata_json: Mapped[dict[str, Any]] = mapped_column(JSONB, default=dict, nullable=False)
    character: Mapped[Character] = relationship(back_populates="assets")
    __table_args__ = (UniqueConstraint("character_id", "version", "file_reference"),)


class Environment(Base, Timestamps, SoftDelete):
    __tablename__ = "environments"
    id: Mapped[uuid.UUID] = uuid_pk()
    asset_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("assets.id", ondelete="CASCADE"), nullable=False, unique=True)
    project_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("projects.id", ondelete="RESTRICT"), index=True)
    environment_code: Mapped[str] = mapped_column(String(64), nullable=False)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str] = mapped_column(Text, default="", nullable=False)
    metadata_json: Mapped[dict[str, Any]] = mapped_column(JSONB, default=dict, nullable=False)
    current_version: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    layers: Mapped[list["EnvironmentAsset"]] = relationship(back_populates="environment", cascade="all, delete-orphan")
    __table_args__ = (UniqueConstraint("project_id", "environment_code", postgresql_nulls_not_distinct=True),)


class EnvironmentAsset(Base):
    __tablename__ = "environment_assets"
    id: Mapped[uuid.UUID] = uuid_pk()
    environment_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("environments.id", ondelete="CASCADE"), nullable=False, index=True)
    layer_type: Mapped[str] = mapped_column(String(32), nullable=False)
    file_reference: Mapped[str] = mapped_column(String(500), nullable=False)
    version: Mapped[int] = mapped_column(Integer, nullable=False)
    metadata_json: Mapped[dict[str, Any]] = mapped_column(JSONB, default=dict, nullable=False)
    environment: Mapped[Environment] = relationship(back_populates="layers")
    __table_args__ = (UniqueConstraint("environment_id", "version", "file_reference"),)


class Prop(Base, Timestamps, SoftDelete):
    __tablename__ = "props"
    id: Mapped[uuid.UUID] = uuid_pk()
    asset_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("assets.id", ondelete="CASCADE"), nullable=False, unique=True)
    project_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("projects.id", ondelete="RESTRICT"), index=True)
    prop_code: Mapped[str] = mapped_column(String(64), nullable=False)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    asset_reference: Mapped[str] = mapped_column(String(500), nullable=False)
    metadata_json: Mapped[dict[str, Any]] = mapped_column(JSONB, default=dict, nullable=False)
    __table_args__ = (UniqueConstraint("project_id", "prop_code", postgresql_nulls_not_distinct=True),)


class Animation(Base, Timestamps):
    __tablename__ = "animations"
    id: Mapped[uuid.UUID] = uuid_pk()
    animation_code: Mapped[str] = mapped_column(String(64), nullable=False, unique=True)
    character_type: Mapped[str] = mapped_column(String(64), nullable=False)
    animation_type: Mapped[str] = mapped_column(String(32), nullable=False, index=True)
    rig_compatibility: Mapped[list[Any]] = mapped_column(JSONB, default=list, nullable=False)
    duration: Mapped[float] = mapped_column(Float, nullable=False)
    animation_reference: Mapped[str] = mapped_column(String(500), nullable=False)
    version: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    metadata_json: Mapped[dict[str, Any]] = mapped_column(JSONB, default=dict, nullable=False)
    __table_args__ = (CheckConstraint("duration > 0", name="duration_positive"),)
