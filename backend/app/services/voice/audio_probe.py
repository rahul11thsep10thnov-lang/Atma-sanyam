"""Lightweight audio-duration estimation shared by every real VoiceService
implementation, so duration probing isn't duplicated per-provider (coding
rule: no duplicated business logic). Exact duration for non-WAV output is
recomputed later by MediaProcessingService via ffprobe when the file is
post-processed; this is only a fast, dependency-free estimate used to seed
the timing engine before that happens.
"""
import contextlib
import wave


def probe_duration_ms(path: str, byte_length: int, *, bytes_per_second_estimate: int = 16000) -> int:
    with contextlib.suppress(Exception):
        with wave.open(path, "rb") as wav_file:
            frames = wav_file.getnframes()
            rate = wav_file.getframerate()
            if rate:
                return int((frames / rate) * 1000)
    return int((byte_length / bytes_per_second_estimate) * 1000)
