from sqlalchemy import ForeignKey, Integer, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.base import OwnedMixin, TimestampMixin, UUIDMixin


class BatchJob(Base, UUIDMixin, TimestampMixin, OwnedMixin):
    __tablename__ = "batch_jobs"

    name: Mapped[str] = mapped_column(default="")
    total_lessons: Mapped[int] = mapped_column(Integer, default=0)
    completed: Mapped[int] = mapped_column(Integer, default=0)
    failed: Mapped[int] = mapped_column(Integer, default=0)
    status: Mapped[str] = mapped_column(default="DRAFT", index=True)
    # DRAFT | READY | RUNNING | PAUSED | COMPLETED | CANCELLED

    items: Mapped[list["BatchItem"]] = relationship(
        back_populates="batch", cascade="all, delete-orphan"
    )


class BatchItem(Base, UUIDMixin, TimestampMixin, OwnedMixin):
    __tablename__ = "batch_items"

    batch_id: Mapped[str] = mapped_column(ForeignKey("batch_jobs.id"), index=True)
    lesson_id: Mapped[str] = mapped_column(ForeignKey("lessons.id"), index=True)
    status: Mapped[str] = mapped_column(default="WAITING", index=True)
    # WAITING | PROCESSING | COMPLETED | FAILED | RETRYING
    error: Mapped[str] = mapped_column(Text, default="")
    started_at: Mapped[str | None] = mapped_column(default=None)
    completed_at: Mapped[str | None] = mapped_column(default=None)

    batch: Mapped["BatchJob"] = relationship(back_populates="items")
