from app.core.config import Settings
from app.services.voice.base import VoiceService
from app.services.voice.chatterbox_service import ChatterboxVoiceService
from app.services.voice.elevenlabs_service import ElevenLabsVoiceService
from app.services.voice.mock_service import MockVoiceService


def get_voice_service(settings: Settings) -> VoiceService:
    if settings.mock_voice:
        return MockVoiceService()
    if settings.voice_provider == "chatterbox":
        return ChatterboxVoiceService(base_url=settings.chatterbox_api_url)
    if settings.voice_provider == "elevenlabs":
        return ElevenLabsVoiceService(api_key=settings.elevenlabs_api_key)
    raise ValueError(f"Unknown VOICE_PROVIDER '{settings.voice_provider}'")
