"""Voice identities: who sounds like what, independent of which provider speaks."""
from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from pydantic import BaseModel, Field

from ..common.errors import AudioError


class VoiceIdentity(BaseModel):
    id: str = Field(pattern=r"^[a-z0-9][a-z0-9_\-]{0,63}$")
    name: str
    language: str = "hi-IN"
    description: str = ""
    providers: dict[str, dict[str, Any]] = Field(default_factory=dict, description="provider name -> that provider's settings")

    def settings_for(self, provider: str) -> dict[str, Any]:
        return dict(self.providers.get(provider, {}))


class VoiceRegistry:
    """Voices stored in <library>/voices/voices.json; `pronunciation.json` beside it holds spelling fixes."""

    def __init__(self, directory: Path) -> None:
        self.directory = Path(directory)
        self._voices: dict[str, VoiceIdentity] = {}
        path = self.directory / "voices.json"
        if path.is_file():
            for item in json.loads(path.read_text(encoding="utf-8")):
                voice = VoiceIdentity.model_validate(item)
                self._voices[voice.id] = voice
        ppath = self.directory / "pronunciation.json"
        self.pronunciation: dict[str, dict[str, str]] = json.loads(ppath.read_text(encoding="utf-8")) if ppath.is_file() else {}

    def get(self, voice_id: str) -> VoiceIdentity:
        voice = self._voices.get(voice_id)
        if voice is None:
            raise AudioError(f"Unknown voice '{voice_id}'", details={"voice_id": voice_id, "available": sorted(self._voices)})
        return voice

    def has(self, voice_id: str) -> bool:
        return voice_id in self._voices

    def list(self) -> list[VoiceIdentity]:
        return sorted(self._voices.values(), key=lambda v: v.id)

    def register(self, voice: VoiceIdentity) -> None:
        self._voices[voice.id] = voice
        self.directory.mkdir(parents=True, exist_ok=True)
        (self.directory / "voices.json").write_text(
            json.dumps([v.model_dump() for v in self.list()], ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    def correct(self, text: str, language: str) -> str:
        """Apply pronunciation fixes (whole-word replacements) for a language."""
        for wrong, right in self.pronunciation.get(language.split("-")[0], {}).items():
            text = text.replace(wrong, right)
        return text
