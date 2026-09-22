from app.core.config import Settings
from app.services.voice.base import VoiceService
from app.services.voice.elevenlabs_service import ElevenLabsVoiceService
from app.services.voice.mock_service import MockVoiceService


def get_voice_service(settings: Settings) -> VoiceService:
    if settings.mock_voice:
        return MockVoiceService()
    return ElevenLabsVoiceService(api_key=settings.elevenlabs_api_key)
