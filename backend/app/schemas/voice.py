from __future__ import annotations

from pydantic import BaseModel, ConfigDict


class VoiceGenerationRequest(BaseModel):
    model_config = ConfigDict(protected_namespaces=())

    text: str
    voice_id: str
    model_id: str = "eleven_multilingual_v2"
    stability: float = 0.5
    similarity: float = 0.75
    style: float = 0.0
    speed: float = 1.0
    output_format: str = "mp3_44100_128"


class VoiceGenerationResult(BaseModel):
    audio_path: str
    duration_ms: int
    generated_by: str  # mock|elevenlabs
    cached: bool = False


class VoiceProfilePublic(BaseModel):
    """Never includes the API key — only what's safe to show in the UI."""

    model_config = ConfigDict(protected_namespaces=())

    provider: str
    voice_id: str
    model_id: str
    stability: float
    similarity: float
    style: float
    speed: float
    language: str
    enabled: bool
    connected_at: str
    status: str
