"""VoiceService abstraction (build spec section 3). All ElevenLabs-specific
code lives in elevenlabs_service.py; nothing else in the app calls
ElevenLabs directly."""
from abc import ABC, abstractmethod

from app.schemas.voice import VoiceGenerationRequest, VoiceGenerationResult


class VoiceServiceError(Exception):
    pass


class VoiceService(ABC):
    @abstractmethod
    def generate(self, request: VoiceGenerationRequest, output_path: str) -> VoiceGenerationResult: ...
