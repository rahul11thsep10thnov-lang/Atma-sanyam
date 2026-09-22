import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


def new_uuid() -> str:
    return str(uuid.uuid4())


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class UUIDMixin:
    id: Mapped[str] = mapped_column(primary_key=True, default=new_uuid)


class TimestampMixin:
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, onupdate=utcnow
    )


class SoftDeleteMixin:
    """Metadata-level soft delete only. Per docs/PRIVACY.md, this is never a
    substitute for actually removing the underlying storage object — see
    PrivacyService for the real deletion path."""

    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), default=None)


class OwnedMixin:
    """Every user-owned table carries owner_id so all queries can (and must)
    be scoped by it, per build spec section 21."""

    owner_id: Mapped[str] = mapped_column(index=True)
