"""Real ElevenLabs integration (build spec Phase 12 / section 3). This is
the ONLY file in the codebase that calls the ElevenLabs API. It never
creates or manages voice clones — only text-to-speech against a
pre-existing, fixed ELEVENLABS_VOICE_ID (build spec section 4).
"""
import contextlib
import wave

import httpx

from app.schemas.voice import VoiceGenerationRequest, VoiceGenerationResult
from app.services.voice.base import VoiceService, VoiceServiceError

_ELEVENLABS_TTS_URL = "https://api.elevenlabs.io/v1/text-to-speech/{voice_id}"


class ElevenLabsVoiceService(VoiceService):
    def __init__(self, api_key: str) -> None:
        if not api_key:
            raise VoiceServiceError(
                "ELEVENLABS_API_KEY is not set. Set it in .env or use MOCK_VOICE=true for development."
            )
        self._api_key = api_key

    def generate(self, request: VoiceGenerationRequest, output_path: str) -> VoiceGenerationResult:
        if not request.voice_id:
            raise VoiceServiceError("No ELEVENLABS_VOICE_ID configured. Set it in Settings -> Voice.")
        try:
            response = httpx.post(
                _ELEVENLABS_TTS_URL.format(voice_id=request.voice_id),
                headers={
                    "xi-api-key": self._api_key,
                    "content-type": "application/json",
                    "accept": "audio/mpeg",
                },
                json={
                    "text": request.text,
                    "model_id": request.model_id,
                    "voice_settings": {
                        "stability": request.stability,
                        "similarity_boost": request.similarity,
                        "style": request.style,
                        "speed": request.speed,
                    },
                },
                timeout=60.0,
            )
            response.raise_for_status()
        except httpx.HTTPError as exc:
            raise VoiceServiceError(
                "Voice generation failed. Check your ElevenLabs connection or retry the scene."
            ) from exc

        with open(output_path, "wb") as f:
            f.write(response.content)

        duration_ms = _probe_duration_ms(output_path, len(response.content))
        return VoiceGenerationResult(
            audio_path=output_path,
            duration_ms=duration_ms,
            generated_by="elevenlabs",
            cached=False,
        )


def _probe_duration_ms(path: str, byte_length: int) -> int:
    with contextlib.suppress(Exception):
        with wave.open(path, "rb") as wav_file:
            frames = wav_file.getnframes()
            rate = wav_file.getframerate()
            if rate:
                return int((frames / rate) * 1000)
    # MP3 output: exact duration is computed by MediaProcessingService via
    # ffprobe when the file is post-processed; this is a rough estimate.
    return int((byte_length / 16000) * 1000)
