import shutil
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, File, UploadFile
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_app_settings, get_current_user, get_db, get_storage
from app.core.config import Settings
from app.core.errors import AppError
from app.models.user import User
from app.models.voice import VoiceProfile
from app.services.storage.base import StorageService
from app.services.voice.base import VoiceServiceError
from app.services.voice.chatterbox_service import ChatterboxVoiceService
from app.services.voice.factory import get_voice_service

router = APIRouter(prefix="/voices", tags=["voices"])


@router.get("")
def get_voice_profile(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    profile = db.execute(select(VoiceProfile).where(VoiceProfile.owner_id == user.id)).scalars().first()
    if profile is None:
        return None
    # Never returns an API key — only the configured, non-secret voice info.
    return {
        "provider": profile.provider,
        "voice_id": profile.voice_id,
        "voice_mode": profile.voice_mode,
        "model_id": profile.model_id,
        "stability": profile.stability,
        "similarity": profile.similarity,
        "style": profile.style,
        "speed": profile.speed,
        "language": profile.language,
        "enabled": profile.enabled,
        "connected_at": profile.connected_at,
        "status": "configured" if profile.voice_id else "not_configured",
    }


@router.post("/test")
def test_voice(
    payload: dict,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_app_settings),
    storage: StorageService = Depends(get_storage),
):
    text = payload.get("text", "Hello, let's begin today's lesson.")
    profile = db.execute(select(VoiceProfile).where(VoiceProfile.owner_id == user.id)).scalars().first()
    if profile is None:
        raise AppError("VOICE_NOT_CONFIGURED", "No voice profile configured. Visit Settings -> Voice.", status_code=409)

    from app.schemas.voice import VoiceGenerationRequest

    voice_service = get_voice_service(settings)
    output_path = storage.build_path("audio", f"test_{user.id}.wav")
    request = VoiceGenerationRequest(
        text=text,
        voice_id=profile.voice_id,
        model_id=profile.model_id,
        stability=profile.stability,
        similarity=profile.similarity,
        style=profile.style,
        speed=profile.speed,
        language=profile.language,
        extra={"voice_mode": profile.voice_mode},
    )
    try:
        result = voice_service.generate(request, output_path)
    except VoiceServiceError as exc:
        raise AppError("VOICE_GENERATION_FAILED", str(exc), status_code=502) from exc

    return {
        "audio_path": result.audio_path,
        "duration_ms": result.duration_ms,
        "generated_by": result.generated_by,
        "voice_settings": {
            "stability": profile.stability,
            "similarity": profile.similarity,
            "style": profile.style,
            "speed": profile.speed,
        },
    }


@router.post("/upload-reference")
def upload_reference_voice(
    file: UploadFile = File(...),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_app_settings),
    storage: StorageService = Depends(get_storage),
):
    """Uploads a short voice sample to a self-hosted Chatterbox server and
    makes it the account's one consistent voice (build spec section 4).
    Only relevant when VOICE_PROVIDER=chatterbox — ElevenLabs clones are
    created on ElevenLabs' own site, never by this app (docs/ELEVENLABS.md)."""
    if settings.mock_voice or settings.voice_provider != "chatterbox":
        raise AppError(
            "NOT_CHATTERBOX",
            "Voice cloning uploads only apply when VOICE_PROVIDER=chatterbox and MOCK_VOICE=false.",
            status_code=409,
        )

    profile = db.execute(select(VoiceProfile).where(VoiceProfile.owner_id == user.id)).scalars().first()
    if profile is None:
        raise AppError("VOICE_NOT_CONFIGURED", "No voice profile found for this account.", status_code=409)

    tmp_path = storage.build_path("tmp", f"reference_upload_{user.id}_{file.filename}")
    with open(tmp_path, "wb") as f:
        shutil.copyfileobj(file.file, f)

    chatterbox = ChatterboxVoiceService(base_url=settings.chatterbox_api_url)
    try:
        filename = chatterbox.upload_reference_audio(tmp_path, file.filename or "reference.wav")
    except VoiceServiceError as exc:
        raise AppError("VOICE_UPLOAD_FAILED", str(exc), status_code=502) from exc
    finally:
        storage.delete(tmp_path)

    profile.provider = "chatterbox"
    profile.voice_mode = "clone"
    profile.voice_id = filename
    profile.enabled = True
    profile.connected_at = datetime.now(timezone.utc).isoformat()
    db.commit()

    return {"voice_id": filename, "voice_mode": "clone", "status": "configured"}
