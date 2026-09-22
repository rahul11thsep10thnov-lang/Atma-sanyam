from sqlalchemy import Float, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.base import OwnedMixin, TimestampMixin, UUIDMixin


class VoiceProfile(Base, UUIDMixin, TimestampMixin, OwnedMixin):
    """A single configured voice used for every generated video (build spec
    section 4: "Important Voice Consistency Rule"). There is intentionally
    no per-lesson voice_id override column anywhere in the schema."""

    __tablename__ = "voice_profiles"

    provider: Mapped[str] = mapped_column(default="elevenlabs")
    voice_id: Mapped[str] = mapped_column(default="")
    model_id: Mapped[str] = mapped_column(default="eleven_multilingual_v2")
    stability: Mapped[float] = mapped_column(Float, default=0.5)
    similarity: Mapped[float] = mapped_column(Float, default=0.75)
    style: Mapped[float] = mapped_column(Float, default=0.0)
    speed: Mapped[float] = mapped_column(Float, default=1.0)
    language: Mapped[str] = mapped_column(default="en")
    enabled: Mapped[bool] = mapped_column(default=True)
    connected_at: Mapped[str] = mapped_column(default="")


class AudioAsset(Base, UUIDMixin, TimestampMixin, OwnedMixin):
    __tablename__ = "audio_assets"

    scene_id: Mapped[str] = mapped_column(ForeignKey("scenes.id"), index=True)
    voice_id: Mapped[str] = mapped_column(default="")
    text_hash: Mapped[str] = mapped_column(index=True)
    audio_path: Mapped[str] = mapped_column(default="")
    duration_ms: Mapped[int] = mapped_column(Integer, default=0)
    protected: Mapped[bool] = mapped_column(default=False)
    generated_by: Mapped[str] = mapped_column(default="mock")  # mock|elevenlabs
