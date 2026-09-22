from sqlalchemy import Integer, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.models.base import OwnedMixin, TimestampMixin, UUIDMixin


class DeletionEvent(Base, UUIDMixin, TimestampMixin, OwnedMixin):
    """Minimal operational audit record. Never stores deleted content."""

    __tablename__ = "deletion_events"

    asset_type: Mapped[str] = mapped_column(default="")
    asset_id: Mapped[str] = mapped_column(default="")
    deletion_reason: Mapped[str] = mapped_column(default="USER_REQUEST")
    # USER_REQUEST | RETENTION_POLICY | PROJECT_DELETION | ACCOUNT_DELETION | CLEANUP


class DeletionJob(Base, UUIDMixin, TimestampMixin, OwnedMixin):
    __tablename__ = "deletion_jobs"

    kind: Mapped[str] = mapped_column(default="delete_all")  # delete_lesson|delete_all|export
    status: Mapped[str] = mapped_column(default="QUEUED")  # QUEUED|PROCESSING|COMPLETED|FAILED
    total_items: Mapped[int] = mapped_column(Integer, default=0)
    processed_items: Mapped[int] = mapped_column(Integer, default=0)
    error_message: Mapped[str] = mapped_column(Text, default="")
    result_path: Mapped[str] = mapped_column(default="")  # for export jobs
