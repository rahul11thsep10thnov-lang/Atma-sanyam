"""Tests the Chatterbox integration against a mocked HTTP transport — no
real Chatterbox server is available in this environment (it needs a GPU/CPU
worker running the actual model), but the request/response contract with
the server (see docs/CHATTERBOX.md) is fully exercised here."""
import httpx
import pytest

from app.core.config import Settings
from app.schemas.voice import VoiceGenerationRequest
from app.services.voice.base import VoiceServiceError
from app.services.voice.chatterbox_service import ChatterboxVoiceService
from app.services.voice.factory import get_voice_service
from app.services.voice.mock_service import MockVoiceService


def _fake_wav_bytes() -> bytes:
    import io
    import wave

    buf = io.BytesIO()
    with wave.open(buf, "w") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(22050)
        wf.writeframes(b"\x00\x00" * 22050)  # 1 second of silence
    return buf.getvalue()


def test_generate_posts_clone_mode_payload(tmp_path, monkeypatch):
    captured = {}

    def fake_post(url, json=None, timeout=None, **kwargs):
        captured["url"] = url
        captured["json"] = json
        return httpx.Response(200, content=_fake_wav_bytes(), request=httpx.Request("POST", url))

    monkeypatch.setattr(httpx, "post", fake_post)

    service = ChatterboxVoiceService(base_url="http://localhost:8004")
    request = VoiceGenerationRequest(
        text="Hello there.",
        voice_id="my_voice.wav",
        language="en",
        speed=1.0,
        extra={"voice_mode": "clone"},
    )
    output_path = str(tmp_path / "out.wav")
    result = service.generate(request, output_path)

    assert captured["url"] == "http://localhost:8004/tts"
    assert captured["json"]["voice_mode"] == "clone"
    assert captured["json"]["reference_audio_filename"] == "my_voice.wav"
    assert "predefined_voice_id" not in captured["json"]
    assert result.generated_by == "chatterbox"
    assert result.duration_ms == pytest.approx(1000, abs=50)


def test_generate_posts_predefined_mode_payload(tmp_path, monkeypatch):
    captured = {}

    def fake_post(url, json=None, timeout=None, **kwargs):
        captured["json"] = json
        return httpx.Response(200, content=_fake_wav_bytes(), request=httpx.Request("POST", url))

    monkeypatch.setattr(httpx, "post", fake_post)

    service = ChatterboxVoiceService(base_url="http://localhost:8004")
    request = VoiceGenerationRequest(
        text="Hello there.",
        voice_id="default_female",
        extra={"voice_mode": "predefined"},
    )
    service.generate(request, str(tmp_path / "out.wav"))

    assert captured["json"]["voice_mode"] == "predefined"
    assert captured["json"]["predefined_voice_id"] == "default_female"
    assert "reference_audio_filename" not in captured["json"]


def test_generate_requires_voice_id(tmp_path):
    service = ChatterboxVoiceService(base_url="http://localhost:8004")
    request = VoiceGenerationRequest(text="Hi", voice_id="")
    with pytest.raises(VoiceServiceError):
        service.generate(request, str(tmp_path / "out.wav"))


def test_generate_raises_actionable_error_on_connect_failure(tmp_path, monkeypatch):
    def fake_post(*args, **kwargs):
        raise httpx.ConnectError("refused")

    monkeypatch.setattr(httpx, "post", fake_post)

    service = ChatterboxVoiceService(base_url="http://localhost:8004")
    request = VoiceGenerationRequest(text="Hi", voice_id="my_voice.wav")
    with pytest.raises(VoiceServiceError, match="Chatterbox server"):
        service.generate(request, str(tmp_path / "out.wav"))


def test_upload_reference_audio_returns_server_filename(tmp_path, monkeypatch):
    sample = tmp_path / "sample.wav"
    sample.write_bytes(_fake_wav_bytes())

    def fake_post(url, files=None, timeout=None, **kwargs):
        assert url == "http://localhost:8004/upload_reference"
        return httpx.Response(
            200, json={"filename": "sample_uploaded.wav"}, request=httpx.Request("POST", url)
        )

    monkeypatch.setattr(httpx, "post", fake_post)

    service = ChatterboxVoiceService(base_url="http://localhost:8004")
    filename = service.upload_reference_audio(str(sample), "sample.wav")
    assert filename == "sample_uploaded.wav"


def test_service_requires_base_url():
    with pytest.raises(VoiceServiceError):
        ChatterboxVoiceService(base_url="")


def test_factory_dispatches_to_chatterbox():
    settings = Settings(mock_voice=False, voice_provider="chatterbox", chatterbox_api_url="http://x:8004")
    service = get_voice_service(settings)
    assert isinstance(service, ChatterboxVoiceService)


def test_factory_dispatches_to_mock_regardless_of_provider():
    settings = Settings(mock_voice=True, voice_provider="chatterbox")
    assert isinstance(get_voice_service(settings), MockVoiceService)


def test_factory_rejects_unknown_provider():
    settings = Settings(mock_voice=False, voice_provider="nonexistent")
    with pytest.raises(ValueError):
        get_voice_service(settings)
