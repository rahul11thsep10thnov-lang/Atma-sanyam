"""Deterministic placeholder audio generator (build spec section 45). No
network access; produces a valid WAV file whose duration is estimated from
word count at a natural speaking pace (~150 wpm), so downstream timing/
rendering logic can be exercised realistically without ElevenLabs.
"""
import math
import struct
import wave

from app.schemas.voice import VoiceGenerationRequest, VoiceGenerationResult
from app.services.voice.base import VoiceService

WORDS_PER_MINUTE = 150
SAMPLE_RATE = 22050
TONE_HZ = 220.0


class MockVoiceService(VoiceService):
    def generate(self, request: VoiceGenerationRequest, output_path: str) -> VoiceGenerationResult:
        word_count = max(1, len(request.text.split()))
        duration_s = max(0.6, (word_count / WORDS_PER_MINUTE) * 60.0)
        duration_s = duration_s / max(request.speed, 0.1)
        _write_placeholder_wav(output_path, duration_s)
        return VoiceGenerationResult(
            audio_path=output_path,
            duration_ms=int(duration_s * 1000),
            generated_by="mock",
            cached=False,
        )


def _write_placeholder_wav(path: str, duration_s: float) -> None:
    n_samples = int(SAMPLE_RATE * duration_s)
    with wave.open(path, "w") as wav_file:
        wav_file.setnchannels(1)
        wav_file.setsampwidth(2)
        wav_file.setframerate(SAMPLE_RATE)
        frames = bytearray()
        # A very quiet sine tone (not silence) so QC/duration tooling that
        # inspects amplitude still has something non-zero to look at, while
        # staying clearly identifiable as a placeholder, not real speech.
        amplitude = 800
        for i in range(n_samples):
            value = int(amplitude * math.sin(2 * math.pi * TONE_HZ * i / SAMPLE_RATE))
            frames += struct.pack("<h", value)
        wav_file.writeframes(bytes(frames))
