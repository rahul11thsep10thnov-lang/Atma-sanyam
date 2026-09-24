"""Chatterbox integration (self-hosted, free, open-source TTS — see
docs/CHATTERBOX.md). This is the ONLY file that talks to a Chatterbox
server, mirroring how elevenlabs_service.py is the only file that talks to
ElevenLabs (build spec section 3: isolate each voice backend).

Unlike ElevenLabs, there is no per-request cost and no API key: the app
just needs the URL of a Chatterbox server the user is running (their own
machine, or a rented box). Voice cloning works by uploading a short
reference clip once (`upload_reference_audio`) and then referencing it by
filename on every generation — this mirrors ElevenLabs' "fixed voice ID"
model even though the underlying mechanism is different (build spec
section 4: one consistent voice across every video, no per-scene
switching).
"""
import httpx

from app.schemas.voice import VoiceGenerationRequest, VoiceGenerationResult
from app.services.voice.audio_probe import probe_duration_ms
from app.services.voice.base import VoiceService, VoiceServiceError

_CONNECT_HELP = (
    "Could not reach the Chatterbox server. Confirm it's running and that "
    "CHATTERBOX_API_URL in .env points at it — see docs/CHATTERBOX.md."
)


class ChatterboxVoiceService(VoiceService):
    def __init__(self, base_url: str) -> None:
        if not base_url:
            raise VoiceServiceError(
                "CHATTERBOX_API_URL is not set. Set it in .env or use MOCK_VOICE=true for development."
            )
        self._base_url = base_url.rstrip("/")

    def generate(self, request: VoiceGenerationRequest, output_path: str) -> VoiceGenerationResult:
        if not request.voice_id:
            raise VoiceServiceError(
                "No Chatterbox voice configured. Clone a voice from Settings -> Voice first."
            )
        voice_mode = request.extra.get("voice_mode", "clone")
        payload: dict = {
            "text": request.text,
            "voice_mode": voice_mode,
            "output_format": "wav",
            "language": request.language,
            "speed_factor": request.speed,
            "temperature": request.extra.get("temperature", 0.8),
            "exaggeration": request.extra.get("exaggeration", 0.5),
            "cfg_weight": request.extra.get("cfg_weight", 0.5),
        }
        if voice_mode == "clone":
            payload["reference_audio_filename"] = request.voice_id
        else:
            payload["predefined_voice_id"] = request.voice_id

        try:
            response = httpx.post(f"{self._base_url}/tts", json=payload, timeout=120.0)
            response.raise_for_status()
        except httpx.ConnectError as exc:
            raise VoiceServiceError(_CONNECT_HELP) from exc
        except httpx.HTTPError as exc:
            raise VoiceServiceError(
                "Voice generation failed. Check the Chatterbox server logs or retry the scene."
            ) from exc

        with open(output_path, "wb") as f:
            f.write(response.content)

        duration_ms = probe_duration_ms(output_path, len(response.content))
        return VoiceGenerationResult(
            audio_path=output_path,
            duration_ms=duration_ms,
            generated_by="chatterbox",
            cached=False,
        )

    def upload_reference_audio(self, local_path: str, filename: str) -> str:
        """Uploads a short voice sample to the Chatterbox server once; the
        returned filename is then stored as VoiceProfile.voice_id and reused
        on every future generation (build spec section 4: no re-cloning per
        video)."""
        try:
            with open(local_path, "rb") as f:
                response = httpx.post(
                    f"{self._base_url}/upload_reference",
                    files={"file": (filename, f, "audio/wav")},
                    timeout=60.0,
                )
            response.raise_for_status()
        except httpx.ConnectError as exc:
            raise VoiceServiceError(_CONNECT_HELP) from exc
        except httpx.HTTPError as exc:
            raise VoiceServiceError(f"Uploading the reference voice clip failed: {exc}") from exc

        body = response.json()
        return body.get("filename", filename)
