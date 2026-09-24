from __future__ import annotations

from typing import Any

from pydantic import BaseModel, ConfigDict, Field


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
    language: str = "en"
    # Provider-specific passthrough (e.g. Chatterbox's voice_mode/
    # exaggeration/cfg_weight) that doesn't belong on every provider's
    # request shape. Providers that don't recognize a key simply ignore it.
    extra: dict[str, Any] = Field(default_factory=dict)


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
    voice_mode: str
    model_id: str
    stability: float
    similarity: float
    style: float
    speed: float
    language: str
    enabled: bool
    connected_at: str
    status: str
