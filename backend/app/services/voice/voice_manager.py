"""Orchestrates VoiceService + AudioAsset caching (build spec section 18):
same voice_id + same voice settings + same narration text => reuse existing
audio rather than regenerating it.
"""
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.voice import AudioAsset, VoiceProfile
from app.schemas.voice import VoiceGenerationRequest
from app.services.storage.base import StorageService
from app.services.voice.base import VoiceService
from app.utils.hashing import voice_cache_key


class VoiceManager:
    def __init__(self, db: Session, voice_service: VoiceService, storage: StorageService) -> None:
        self._db = db
        self._voice_service = voice_service
        self._storage = storage

    def generate_for_scene(
        self, *, owner_id: str, scene_id: str, text: str, profile: VoiceProfile
    ) -> AudioAsset:
        settings_dict = {
            "stability": profile.stability,
            "similarity": profile.similarity,
            "style": profile.style,
            "speed": profile.speed,
        }
        text_hash = voice_cache_key(profile.voice_id, profile.model_id, settings_dict, text)

        existing = self._db.execute(
            select(AudioAsset).where(
                AudioAsset.owner_id == owner_id,
                AudioAsset.scene_id == scene_id,
                AudioAsset.text_hash == text_hash,
            )
        ).scalar_one_or_none()
        if existing is not None and self._storage.exists(existing.audio_path):
            return existing

        output_path = self._storage.build_path("audio", f"{scene_id}_{text_hash[:16]}.wav")
        request = VoiceGenerationRequest(
            text=text,
            voice_id=profile.voice_id,
            model_id=profile.model_id,
            stability=profile.stability,
            similarity=profile.similarity,
            style=profile.style,
            speed=profile.speed,
        )
        result = self._voice_service.generate(request, output_path)

        if existing is not None:
            existing.audio_path = result.audio_path
            existing.duration_ms = result.duration_ms
            existing.generated_by = result.generated_by
            existing.voice_id = profile.voice_id
            asset = existing
        else:
            asset = AudioAsset(
                owner_id=owner_id,
                scene_id=scene_id,
                voice_id=profile.voice_id,
                text_hash=text_hash,
                audio_path=result.audio_path,
                duration_ms=result.duration_ms,
                generated_by=result.generated_by,
            )
            self._db.add(asset)
        self._db.flush()
        return asset
