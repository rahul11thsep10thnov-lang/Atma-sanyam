from sqlalchemy import JSON, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.models.base import OwnedMixin, TimestampMixin, UUIDMixin


class ProjectSetting(Base, UUIDMixin, TimestampMixin, OwnedMixin):
    __tablename__ = "project_settings"
    __table_args__ = (UniqueConstraint("owner_id", "key", name="uq_project_setting_owner_key"),)

    key: Mapped[str]  # e.g. "retention", "ai", "video", "whiteboard", "batch", "language"
    value: Mapped[dict] = mapped_column(JSON, default=dict)
