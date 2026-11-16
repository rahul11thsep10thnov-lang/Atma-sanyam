"""Voice providers behind one interface. espeak-ng is local and free; Sarvam AI is optional."""
from __future__ import annotations

import base64
import hashlib
import math
import os
import shutil
import subprocess
from abc import ABC, abstractmethod
from pathlib import Path
from typing import Any, Callable

import numpy as np

from ..common.errors import AudioError, ProviderUnavailable
from .analysis import SAMPLE_RATE, write_wav
from .voices import VoiceIdentity


class VoiceProvider(ABC):
    """Everything the engine needs from a text-to-speech service."""

    name: str = "provider"
    version: str = "1"

    @abstractmethod
    def generate_voice(self, text: str, voice: VoiceIdentity, out_path: Path) -> Path:
        """Synthesise `text` to a WAV file at `out_path`."""

    @abstractmethod
    def get_available_voices(self) -> list[dict[str, Any]]:
        """Voices the provider itself offers (not the engine's voice identities)."""

    def get_generation_status(self, job_id: str) -> dict[str, Any]:
        """Synchronous providers are always finished."""
        return {"job_id": job_id, "status": "completed"}

    def available(self) -> bool:
        return True

    def cache_fingerprint(self, voice: VoiceIdentity) -> dict[str, Any]:
        """Whatever changes the sound: part of the cache key."""
        return {"provider": self.name, "version": self.version, "settings": voice.settings_for(self.name)}


class EspeakProvider(VoiceProvider):
    """espeak-ng: a small local formant synthesiser with a Hindi voice. Robotic, but offline and deterministic."""

    name = "espeak"

    def __init__(self, executable: str = "espeak-ng") -> None:
        self.executable = executable

    def available(self) -> bool:
        return shutil.which(self.executable) is not None

    def generate_voice(self, text: str, voice: VoiceIdentity, out_path: Path) -> Path:
        exe = shutil.which(self.executable)
        if exe is None:
            raise ProviderUnavailable("espeak-ng is not installed")
        s = voice.settings_for(self.name)
        name = s.get("voice", voice.language.split("-")[0])
        if s.get("variant"):
            name = f"{name}+{s['variant']}"
        out_path = Path(out_path)
        out_path.parent.mkdir(parents=True, exist_ok=True)
        args = [exe, "-v", name, "-p", str(int(s.get("pitch", 50))), "-s", str(int(s.get("speed", 150))),
                "-a", str(int(s.get("amplitude", 120))), "-g", str(int(s.get("word_gap", 2))), "-w", str(out_path), "--", text]
        proc = subprocess.run(args, capture_output=True, text=True, timeout=120)
        if proc.returncode != 0 or not out_path.is_file() or out_path.stat().st_size < 100:
            raise AudioError("espeak-ng could not synthesise the text", details={"stderr": proc.stderr.strip()[-300:]})
        return out_path

    def get_available_voices(self) -> list[dict[str, Any]]:
        exe = shutil.which(self.executable)
        if exe is None:
            return []
        out = subprocess.run([exe, "--voices"], capture_output=True, text=True, timeout=30).stdout.splitlines()[1:]
        voices = []
        for line in out:
            cols = line.split()
            if len(cols) >= 4:
                voices.append({"id": cols[1], "name": cols[3], "language": cols[1]})
        return voices


class SarvamProvider(VoiceProvider):
    """Sarvam AI text-to-speech (optional). The key comes from the environment, never from code or story data.

    `transport(url, headers, json_body) -> dict` can be injected; by default httpx is used.
    """

    name = "sarvam"
    URL = "https://api.sarvam.ai/text-to-speech"

    def __init__(self, api_key: str | None = None, transport: Callable[[str, dict, dict], dict] | None = None) -> None:
        self.api_key = api_key or os.environ.get("CSAE_SARVAM_API_KEY") or os.environ.get("SARVAM_API_KEY") or ""
        self._transport = transport

    def available(self) -> bool:
        return bool(self.api_key)

    def _post(self, url: str, headers: dict, body: dict) -> dict:
        if self._transport is not None:
            return self._transport(url, headers, body)
        import httpx
        try:
            response = httpx.post(url, headers=headers, json=body, timeout=60)
        except httpx.HTTPError as exc:
            raise ProviderUnavailable("Could not reach Sarvam AI") from exc
        if response.status_code in (401, 403):
            raise ProviderUnavailable("Sarvam AI rejected the API key")
        if response.status_code >= 400:
            raise AudioError(f"Sarvam AI returned HTTP {response.status_code}", details={"body": response.text[:300]})
        return response.json()

    def generate_voice(self, text: str, voice: VoiceIdentity, out_path: Path) -> Path:
        if not self.api_key:
            raise ProviderUnavailable("Sarvam AI is not configured: set CSAE_SARVAM_API_KEY")
        s = voice.settings_for(self.name)
        body = {"inputs": [text], "target_language_code": voice.language, "speaker": s.get("speaker", "meera"),
                "model": s.get("model", "bulbul:v1"), "pitch": s.get("pitch", 0), "pace": s.get("pace", 1.0),
                "loudness": s.get("loudness", 1.0), "speech_sample_rate": 22050, "enable_preprocessing": True}
        data = self._post(self.URL, {"api-subscription-key": self.api_key, "Content-Type": "application/json"}, body)
        audios = data.get("audios") if isinstance(data, dict) else None
        if not audios:
            raise AudioError("Sarvam AI returned no audio")
        out_path = Path(out_path)
        out_path.parent.mkdir(parents=True, exist_ok=True)
        try:
            out_path.write_bytes(base64.b64decode(audios[0], validate=True))
        except (ValueError, TypeError) as exc:
            raise AudioError("Sarvam AI returned audio that is not valid base64") from exc
        return out_path

    def get_available_voices(self) -> list[dict[str, Any]]:
        return [{"id": s, "name": s.title(), "language": "hi-IN"} for s in ("meera", "pavithra", "maitreyi", "arvind", "amol", "amartya")]


class ToneProvider(VoiceProvider):
    """Test adapter: speech-shaped tones (one syllable-like burst per word). Deterministic and dependency-free."""

    name = "tone"

    def generate_voice(self, text: str, voice: VoiceIdentity, out_path: Path) -> Path:
        s = voice.settings_for(self.name)
        base = float(s.get("frequency", 180.0))
        words = max(1, len(text.split()))
        seed = int(hashlib.sha256(text.encode("utf-8")).hexdigest()[:8], 16)
        rng = np.random.default_rng(seed)
        chunks = [np.zeros(int(0.05 * SAMPLE_RATE))]
        for _ in range(words):
            length = rng.uniform(0.16, 0.3)
            t = np.arange(int(length * SAMPLE_RATE)) / SAMPLE_RATE
            f = base * rng.uniform(0.9, 1.25)
            burst = 0.5 * np.sin(2 * math.pi * f * t) * np.sin(math.pi * t / length) ** 2
            chunks += [burst, np.zeros(int(0.06 * SAMPLE_RATE))]
        return write_wav(Path(out_path), np.concatenate(chunks).astype(np.float32))

    def get_available_voices(self) -> list[dict[str, Any]]:
        return [{"id": "tone", "name": "Test tone", "language": "und"}]


def make_provider(name: str, **kwargs: Any) -> VoiceProvider:
    providers = {"espeak": EspeakProvider, "sarvam": SarvamProvider, "tone": ToneProvider}
    if name not in providers:
        raise AudioError(f"Unknown voice provider '{name}' (have: {', '.join(providers)})")
    return providers[name](**kwargs)
