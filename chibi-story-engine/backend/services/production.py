"""Production steps for one story: analysis, storyboard, scene edits, audio, quality control, exports."""
from __future__ import annotations

import uuid
from pathlib import Path
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from engine.audio.speech import StorySpeech, produce_speech
from engine.audio.timing import retime_story
from engine.common.errors import ValidationFailed
from engine.rendering.service import RenderSettings
from engine.schema.story import OutputSpec, parse_story
from engine.schema.story import Story as StoryDef
from engine.story_intelligence.models import parse_analysis
from engine.story_intelligence.storyboard import StoryboardBuilder

from ..errors import ApiError, not_found
from ..models import AudioAsset, RenderJob, RenderOutput, Scene, Story, User
from . import audit
from .engine import EngineHub
from .stories import StoryService


def _slug(story: Story) -> str:
    return "story_" + story.id.hex[:12]


class ProductionService:
    def __init__(self, session: Session, hub: EngineHub) -> None:
        self.s = session
        self.hub = hub
        self.stories = StoryService(session)

    # ---------------------------------------------------------------- analyse
    def analyse(self, story_id: uuid.UUID, user: User, use_llm: bool | None = None) -> dict[str, Any]:
        story = self.stories.require(story_id, lock=True)
        analysis = self.hub.analyser(use_llm).analyse(story.original_text, story.language)
        story.analysis_json = analysis.model_dump(mode="json")
        if story.status == "draft":
            story.status = "analysed"
        if analysis.moral and not story.moral:
            story.moral = analysis.moral
        audit.record(self.s, user.id, "story.analysed", "story", story.id, analyser=analysis.analyser, scenes=len(analysis.scenes))
        return story.analysis_json

    def _board(self, story: Story, overrides: dict[str, str] | None, env_overrides: dict[str, str] | None = None):
        if story.analysis_json is None:
            raise ApiError(409, "not_analysed", "Analyse the story before generating a storyboard")
        analysis = parse_analysis(story.analysis_json)
        width, height = (int(v) for v in story.settings_json.get("resolution", "1920x1080").split("x"))
        output = OutputSpec(width=width, height=height, fps=int(story.settings_json.get("fps", 24)))
        builder = StoryboardBuilder(self.hub.library.index())
        return builder.build(analysis, story_id=_slug(story), title=story.title, output=output, genre=story.genre,
                             visual_style=story.settings_json.get("visual_style", "premium_chibi_anime"), character_overrides=overrides,
                             environment_overrides=env_overrides)

    def asset_report(self, story_id: uuid.UUID, character_overrides: dict[str, str] | None = None, environment_overrides: dict[str, str] | None = None) -> dict[str, Any]:
        from engine.story_intelligence.asset_report import build_asset_report
        story = self.stories.require(story_id)
        if story.analysis_json is None:
            raise ApiError(409, "not_analysed", "Analyse the story before asking for its asset report")
        return build_asset_report(parse_analysis(story.analysis_json), self.hub.library.index(), character_overrides=character_overrides,
                                  environment_overrides=environment_overrides)

    def generate_storyboard(self, story_id: uuid.UUID, user: User, overrides: dict[str, str] | None = None,
                            env_overrides: dict[str, str] | None = None) -> dict[str, Any]:
        story = self.stories.require(story_id, lock=True)
        board = self._board(story, overrides, env_overrides)
        self.stories.save_version(story, board.story, "Storyboard generated", user)
        audit.record(self.s, user.id, "story.storyboard_generated", "story", story.id, version=story.current_version,
                     missing=len(board.missing_assets))
        return {"story": self.stories.detail(story), "missing_assets": [m.model_dump() for m in board.missing_assets],
                "warnings": board.warnings, "character_map": board.character_map, "environment_map": board.environment_map}

    # ----------------------------------------------------------------- scenes
    def _scene(self, scene_id: uuid.UUID) -> tuple[Scene, Story, StoryDef]:
        scene = self.s.get(Scene, scene_id)
        if scene is None:
            raise not_found("Scene", scene_id)
        story = self.stories.require(scene.story_id, lock=True)
        return scene, story, self.stories.require_definition(story)

    def patch_scene(self, scene_id: uuid.UUID, changes: dict[str, Any], user: User) -> Scene:
        """Apply field changes (or a whole replacement scene) and save the story as a new version."""
        scene, story, definition = self._scene(scene_id)
        data = definition.model_dump(mode="json")
        index = next(i for i, s in enumerate(data["scenes"]) if s["scene_id"] == scene.scene_code)
        if "approval_status" in changes and user.role not in ("admin", "reviewer"):
            raise ApiError(403, "forbidden", "Only a reviewer or an admin may approve or reject a scene")
        replacement = changes.pop("scene_json", None)
        if replacement is not None:
            if replacement.get("scene_id") != scene.scene_code:
                raise ApiError(422, "validation_failed", "scene_json.scene_id must stay the same",
                               {"issues": [{"path": "scene_json.scene_id", "message": f"expected '{scene.scene_code}'"}]})
            data["scenes"][index] = replacement
        data["scenes"][index].update(changes)
        if replacement is not None or any(k != "approval_status" for k in changes):
            if "approval_status" not in changes:
                data["scenes"][index]["approval_status"] = "pending"          # an edited scene needs approval again
        data["scenes"][index]["duration_seconds"] = None
        updated = parse_story(data)
        self.stories.save_version(story, updated, f"Edit scene {scene.scene_code}", user)
        audit.record(self.s, user.id, "scene.updated", "scene", scene.id, fields=sorted(changes) + (["scene_json"] if replacement else []))
        self.s.refresh(scene)
        return scene

    def regenerate_scene(self, scene_id: uuid.UUID, user: User) -> Scene:
        """Rebuild one scene from the analysis, leaving every other scene as edited."""
        scene, story, definition = self._scene(scene_id)
        board = self._board(story, None)
        fresh = next((s for s in board.story.scenes if s.scene_id == scene.scene_code), None)
        if fresh is None:
            raise ApiError(409, "cannot_regenerate", "This scene no longer exists in the story analysis")
        data = definition.model_dump(mode="json")
        index = next(i for i, s in enumerate(data["scenes"]) if s["scene_id"] == scene.scene_code)
        data["scenes"][index] = fresh.model_dump(mode="json")
        known = {c["character_id"] for c in data["characters"]}
        data["characters"] += [c.model_dump(mode="json") for c in board.story.characters if c.character_id not in known]
        self.stories.save_version(story, parse_story(data), f"Regenerate scene {scene.scene_code}", user)
        audit.record(self.s, user.id, "scene.regenerated", "scene", scene.id)
        self.s.refresh(scene)
        return scene

    # ------------------------------------------------------------------ audio
    def speech_for(self, definition: StoryDef, scene_ids: list[str] | None = None, force: bool = False) -> StorySpeech:
        return produce_speech(definition, self.hub.dialogue(), scene_ids, force)

    def generate_audio(self, story_id: uuid.UUID, user: User, force: bool = False, retime: bool = True) -> dict[str, Any]:
        story = self.stories.require(story_id, lock=True)
        definition = self.stories.require_definition(story)
        speech = self.speech_for(definition, force=force)
        changes: list[dict] = []
        if retime and not speech.problems:
            definition2, changes = retime_story(definition, speech.durations())
            if changes:
                self.stories.save_version(story, definition2, f"Re-time {len(changes)} shots to the recorded audio", user)
                definition = definition2
        scene_rows = {s.scene_code: s.id for s in self.stories.repo.scenes(story.id)}
        for row in self.s.scalars(select(AudioAsset).where(AudioAsset.story_id == story.id, AudioAsset.audio_type.in_(("narration", "dialogue")))):
            self.s.delete(row)
        self.s.flush()
        cache_root = self.hub.paths.renders / "audio" / "cache"
        for key, clip in speech.clips.items():
            scene_code, _, _ = key.split("/")
            narration = clip.voice_id == definition.audio.narrator_voice and key.rsplit("/", 1)[1] in {
                l.line_id for sc in definition.scenes for sh in sc.shots for l in sh.dialogue if l.is_narration}
            self.s.add(AudioAsset(story_id=story.id, scene_id=scene_rows.get(scene_code), audio_type="narration" if narration else "dialogue",
                                  speaker_id=clip.voice_id, line_code=key, language=story.language,
                                  file_reference=clip.path.relative_to(cache_root).as_posix(), duration=clip.duration,
                                  metadata_json={"text": clip.text, "cached": clip.cached, **clip.stats.to_dict()}))
        if story.status == "storyboarded":
            story.status = "in_production"
        audit.record(self.s, user.id, "story.audio_generated", "story", story.id, generated=speech.generated, reused=speech.reused)
        return {"generated": speech.generated, "reused": speech.reused, "problems": speech.problems, "retimed_shots": changes,
                "total_duration": definition.total_duration, "provider": self.hub.voice_provider().name,
                "story_version": story.current_version}

    # --------------------------------------------------------------------- QC
    def quality_check(self, story_id: uuid.UUID) -> dict[str, Any]:
        story = self.stories.require(story_id)
        definition = self.stories.require_definition(story)
        has_audio = self.s.scalar(select(AudioAsset.id).where(AudioAsset.story_id == story.id).limit(1)) is not None
        speech = self.speech_for(definition) if has_audio else None
        report = self.hub.qc.check_story(definition, speech).to_dict()
        final = self.latest_final(story)
        if final is not None:
            path = self.hub.paths.renders / final.file_reference
            width, height = (int(v) for v in final.resolution.split("x"))
            settings = RenderSettings(width=width, height=height, fps=definition.output.fps)
            stale = final.job.story_version != story.current_version
            video = self.hub.qc.check_video(definition, path, settings, final.duration if stale else definition.total_duration,
                                            None, expect_audio=True).to_dict()
            report["video"] = {**video, "output_id": str(final.id), "stale": stale, "story_version": final.job.story_version}
            report["passed"] = report["passed"] and video["passed"]
        else:
            report["video"] = None
        return report

    # ---------------------------------------------------------------- exports
    def latest_final(self, story: Story) -> RenderOutput | None:
        return self.s.scalar(select(RenderOutput).join(RenderJob).where(RenderJob.story_id == story.id, RenderOutput.output_type == "final")
                             .order_by(RenderOutput.created_at.desc()).limit(1))

    def exports(self, story_id: uuid.UUID) -> list[RenderOutput]:
        story = self.stories.require(story_id)
        return list(self.s.scalars(select(RenderOutput).join(RenderJob).where(
            RenderJob.story_id == story.id, RenderOutput.output_type.in_(("final", "preview"))).order_by(RenderOutput.created_at.desc())))

    def publish(self, story_id: uuid.UUID, output_id: uuid.UUID, user: User, override: bool = False) -> RenderOutput:
        """Mark a final render as the published video. Needs clean QC and every approval, unless an admin overrides."""
        story = self.stories.require(story_id, lock=True)
        output = self.s.get(RenderOutput, output_id)
        if output is None or output.job.story_id != story.id or output.output_type != "final":
            raise not_found("Final render", output_id)
        report = self.quality_check(story_id)
        if not report["passed"]:
            raise ApiError(409, "quality_check_failed", "The story does not pass quality control", {"summary": report["summary"]})
        if report["video"] and report["video"].get("stale"):
            raise ApiError(409, "stale_render", "The story changed after this video was rendered; render it again")
        if report["human_review"]:
            if not (override and user.role == "admin"):
                raise ApiError(409, "approval_required", "Designs or scenes still await approval",
                               {"awaiting": [i["message"] for i in report["human_review"]]})
        output.published = True
        story.status = "published"
        audit.record(self.s, user.id, "story.published", "story", story.id, output=str(output.id),
                     overridden_approvals=len(report["human_review"]) if override else 0)
        return output
