from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.models.base import TimestampMixin, UUIDMixin


class User(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "users"

    email: Mapped[str] = mapped_column(unique=True, index=True)
    display_name: Mapped[str] = mapped_column(default="")
    # Simple local-auth token for the MVP (build spec section: "Simple local
    # authentication initially"). Replace with real session/JWT auth later;
    # only app/api/deps.py needs to change.
    api_token: Mapped[str] = mapped_column(unique=True, index=True)
