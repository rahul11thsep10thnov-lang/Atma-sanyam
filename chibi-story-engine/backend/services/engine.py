"""The engine as the backend sees it: one hub of long-lived engine services, and the library -> database mirror."""
from __future__ import annotations

import logging
import threading
from dataclasses import dataclass

from sqlalchemy import select
from sqlalchemy.orm import Session

from engine.asset_manager.library import TYPE_DIRS, AssetLibrary
from engine.audio.providers import VoiceProvider, make_provider
from engine.audio.speech import AudioCache, DialogueService, NarrationService
from engine.audio.voices import VoiceRegistry
from engine.common.errors import ProviderUnavailable
from engine.common.paths import EnginePaths
from engine.quality_control.checks import QualityControl
from engine.rendering.service import RenderService
from engine.schema.assets import AssetType, CharacterManifest, EnvironmentManifest, PropManifest
from engine.story_intelligence.analyser import RuleBasedAnalyser
from engine.story_intelligence.llm import AnthropicProvider, LLMStoryAnalyser

from ..models import Animation, Asset, AssetVersion, Character, CharacterAsset, Environment, EnvironmentAsset, Prop
from ..settings import Settings

log = logging.getLogger("csae.engine")


@dataclass
class EngineHub:
    settings: Settings
    paths: EnginePaths
    library: AssetLibrary
    voices: VoiceRegistry
    render: RenderService
    qc: QualityControl
    lock: threading.Lock

    @classmethod
    def create(cls, settings: Settings, paths: EnginePaths) -> "EngineHub":
        library = AssetLibrary(paths.asset_library)
        render = RenderService(library, paths, timeout=settings.render_timeout_seconds, retries=settings.render_retries)
        return cls(settings, paths, library, VoiceRegistry(library.root / "voices"), render, QualityControl(library), threading.Lock())

    def voice_provider(self) -> VoiceProvider:
        if self.settings.voice_provider == "sarvam":
            return make_provider("sarvam", api_key=self.settings.sarvam_api_key)
        return make_provider(self.settings.voice_provider)

    def dialogue(self) -> DialogueService:
        narration = NarrationService(self.voice_provider(), self.voices, AudioCache(self.paths.renders / "audio" / "cache"))
        return DialogueService(narration, self.library)

    def analyser(self, use_llm: bool | None = None):
        index = self.library.index()
        want_llm = self.settings.llm_provider == "anthropic" if use_llm is None else use_llm
        if want_llm:
            if self.settings.llm_provider != "anthropic":
                raise ProviderUnavailable("No LLM provider is configured (set CSAE_LLM_PROVIDER=anthropic and credentials)")
            return LLMStoryAnalyser(AnthropicProvider(api_key=self.settings.anthropic_api_key or None), index)
        return RuleBasedAnalyser(index)


def sync_library(session: Session, library: AssetLibrary) -> dict[str, int]:
    """Mirror the file library into the asset tables (metadata and file references only). Idempotent."""
    counts = {"assets": 0, "versions": 0}
    existing = {(a.asset_type, a.asset_code): a for a in session.scalars(select(Asset).where(Asset.project_id.is_(None)))}
    for asset_type in TYPE_DIRS:
        for asset_id in library.list_ids(asset_type):
            manifest = library.load(asset_type, asset_id)
            row = existing.get((asset_type.value, asset_id))
            if row is None:
                row = Asset(asset_code=asset_id, asset_type=asset_type.value, name=manifest.name)
                session.add(row)
            row.name, row.description, row.current_version = manifest.name, manifest.description, manifest.version
            row.approval_status, row.deleted_at = manifest.approval_status.value, None
            row.metadata_json = {"tags": manifest.tags, "aliases": manifest.aliases, "licence": manifest.licence.model_dump(),
                                 "compatibility": manifest.compatibility, "files": len(manifest.files)}
            session.flush()
            counts["assets"] += 1
            known = {v.version_number for v in row.versions}
            for number in library.versions(asset_type, asset_id):
                if number in known:
                    if number == manifest.version:
                        next(v for v in row.versions if v.version_number == number).approval_status = manifest.approval_status.value
                    continue
                m = manifest if number == manifest.version else library.load(asset_type, asset_id, number)
                digest = _manifest_digest(m)
                session.add(AssetVersion(asset_id=row.id, version_number=number, file_reference=f"{TYPE_DIRS[asset_type]}/{asset_id}@v{number}",
                                         checksum=digest, approval_status=m.approval_status.value, change_summary=m.change_summary))
                counts["versions"] += 1
            if isinstance(manifest, CharacterManifest):
                _sync_character(session, row, manifest)
            elif isinstance(manifest, EnvironmentManifest):
                _sync_environment(session, row, manifest)
            elif isinstance(manifest, PropManifest):
                prop = session.scalar(select(Prop).where(Prop.asset_id == row.id)) or Prop(asset_id=row.id, prop_code=asset_id, name=manifest.name, asset_reference="")
                prop.name, prop.asset_reference = manifest.name, f"props/{asset_id}/{manifest.file}"
                prop.metadata_json = {"size": list(manifest.size), "tags": manifest.tags}
                session.add(prop)
    known_clips = {a.animation_code: a for a in session.scalars(select(Animation))}
    for code, clip in library.animations().items():
        row = known_clips.get(code) or Animation(animation_code=code, character_type="", animation_type="", duration=clip.duration, animation_reference="")
        row.character_type, row.animation_type = ",".join(clip.rig_compatibility), clip.category
        row.rig_compatibility, row.duration, row.version = clip.rig_compatibility, clip.duration, clip.version
        row.animation_reference = f"animations/{code}.json"
        row.metadata_json = {"loop": clip.loop, "additive": clip.additive, "level": clip.level, "start_states": clip.start_states,
                             "end_state": clip.end_state, "semantics": clip.metadata.get("semantics", []), "name": clip.name}
        session.add(row)
    session.flush()
    return counts


def _manifest_digest(manifest) -> str:
    import hashlib
    return hashlib.sha256("|".join(sorted(f"{f.path}:{f.checksum}" for f in manifest.files)).encode()).hexdigest()


def _sync_character(session: Session, asset: Asset, m: CharacterManifest) -> None:
    row = session.scalar(select(Character).where(Character.asset_id == asset.id))
    if row is None:
        row = Character(asset_id=asset.id, character_code=m.id, display_name=m.name, species=m.species)
        session.add(row)
    row.display_name, row.species, row.description = m.name, m.species, m.description
    row.visual_identity_json, row.continuity_rules_json = m.visual_identity, m.continuity_rules
    row.status, row.current_version, row.deleted_at = m.approval_status.value, m.version, None
    session.flush()
    have = {(a.version, a.file_reference) for a in row.assets}
    for f in m.files:
        if (m.version, f.path) not in have:
            session.add(CharacterAsset(character_id=row.id, asset_type=f.role, view=f.view, expression=f.expression, pose=f.pose,
                                       file_reference=f.path, version=m.version,
                                       metadata_json={"checksum": f.checksum, "width": f.width, "height": f.height}))


def _sync_environment(session: Session, asset: Asset, m: EnvironmentManifest) -> None:
    row = session.scalar(select(Environment).where(Environment.asset_id == asset.id))
    if row is None:
        row = Environment(asset_id=asset.id, environment_code=m.id, name=m.name)
        session.add(row)
    row.name, row.description, row.current_version, row.deleted_at = m.name, m.description, m.version, None
    row.metadata_json = {"tags": m.tags, "anchors": {k: v.model_dump() for k, v in m.anchors.items()}, "lighting_presets": m.lighting_presets}
    session.flush()
    have = {(l.version, l.file_reference) for l in row.layers}
    for layer in m.layers:
        if (m.version, layer.file) not in have:
            session.add(EnvironmentAsset(environment_id=row.id, layer_type=layer.type, file_reference=layer.file, version=m.version,
                                         metadata_json={"layer": layer.id, "parallax": layer.parallax, "order": layer.order}))
