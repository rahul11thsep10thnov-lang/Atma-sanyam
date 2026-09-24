"""First-run bootstrap: creates the single local user (build spec: MVP ships
with a local user so owner_id scoping is real from day one — see
docs/ARCHITECTURE.md "Decisions made where the spec was ambiguous / Auth")
and a default VoiceProfile so /voices has something to display.
"""
import secrets

from sqlalchemy.orm import Session

from app.core.config import Settings
from app.models.user import User
from app.models.voice import VoiceProfile

LOCAL_USER_EMAIL = "local@studio"


def ensure_local_user(db: Session) -> User:
    user = db.query(User).filter(User.email == LOCAL_USER_EMAIL).first()
    if user is not None:
        return user
    user = User(email=LOCAL_USER_EMAIL, display_name="Local User", api_token=secrets.token_urlsafe(32))
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def ensure_default_voice_profile(db: Session, owner_id: str, settings: Settings) -> VoiceProfile:
    profile = db.query(VoiceProfile).filter(VoiceProfile.owner_id == owner_id).first()
    if profile is not None:
        return profile
    if settings.voice_provider == "chatterbox":
        profile = VoiceProfile(
            owner_id=owner_id,
            provider="chatterbox",
            voice_id=settings.chatterbox_voice_id,
            voice_mode=settings.chatterbox_voice_mode,
            language=settings.chatterbox_language,
            enabled=True,
        )
    else:
        profile = VoiceProfile(
            owner_id=owner_id,
            provider="elevenlabs",
            voice_id=settings.elevenlabs_voice_id,
            model_id=settings.elevenlabs_model_id,
            stability=settings.elevenlabs_stability,
            similarity=settings.elevenlabs_similarity,
            style=settings.elevenlabs_style,
            speed=settings.elevenlabs_speed,
            language="en",
            enabled=True,
        )
    db.add(profile)
    db.commit()
    db.refresh(profile)
    return profile
