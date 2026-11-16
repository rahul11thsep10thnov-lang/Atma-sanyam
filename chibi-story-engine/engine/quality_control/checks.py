"""Quality control: automatic technical checks, kept apart from what needs a human eye."""
from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path

from ..asset_manager.library import AssetLibrary
from ..audio.analysis import analyse, read_wav
from ..audio.speech import StorySpeech, line_key
from ..audio.timing import TAIL, layout_shot
from ..character_manager.registry import CharacterRegistry
from ..common.errors import EngineError
from ..composition.composer import SceneComposer
from ..rendering import ffmpeg
from ..rendering.service import RenderService, RenderSettings
from ..schema.assets import AssetType
from ..schema.story import ApprovalStatus, Story

CATEGORY_BY_CODE = {
    "missing_asset": "assets", "asset_integrity_error": "assets", "unknown_anchor": "assets", "unknown_effect": "assets",
    "unknown_attach_point": "assets", "validation_failed": "assets", "unknown_lighting": "assets", "unknown_weather": "assets",
    "rig_error": "characters", "incompatible_asset": "characters", "unknown_expression": "characters", "unknown_pose": "characters",
    "animation_error": "characters", "missing_carrier": "characters", "unknown_state": "characters",
    "timeline_conflict": "timing", "incompatible_transition": "timing", "constraint_violation": "timing", "attachment_cycle": "timing",
    "unknown_camera_preset": "timing", "unknown_camera_target": "timing", "speaker_off_screen": "composition", "missing_prop": "composition",
}


@dataclass
class QCItem:
    category: str
    check: str
    severity: str            # "error" | "warning" | "info"
    message: str
    where: str = ""

    def to_dict(self) -> dict:
        return dict(self.__dict__)


@dataclass
class QCReport:
    story_id: str
    stage: str
    automatic: list[QCItem] = field(default_factory=list)
    human_review: list[QCItem] = field(default_factory=list)
    checks_run: list[str] = field(default_factory=list)

    @property
    def passed(self) -> bool:
        return not any(i.severity == "error" for i in self.automatic)

    @property
    def ready_to_publish(self) -> bool:
        return self.passed and not self.human_review

    def errors(self) -> list[QCItem]:
        return [i for i in self.automatic if i.severity == "error"]

    def by_category(self, category: str) -> list[QCItem]:
        return [i for i in self.automatic if i.category == category]

    def to_dict(self) -> dict:
        return {"story_id": self.story_id, "stage": self.stage, "passed": self.passed, "ready_to_publish": self.ready_to_publish,
                "checks_run": self.checks_run, "automatic": [i.to_dict() for i in self.automatic],
                "human_review": [i.to_dict() for i in self.human_review],
                "summary": {"errors": len(self.errors()), "warnings": sum(i.severity == "warning" for i in self.automatic),
                            "awaiting_approval": len(self.human_review)}}


class QualityControl:
    def __init__(self, library: AssetLibrary) -> None:
        self.library = library
        self.registry = CharacterRegistry(library)

    # ----------------------------------------------------------- pre-render
    def check_story(self, story: Story, speech: StorySpeech | None = None, composer: SceneComposer | None = None) -> QCReport:
        report = QCReport(story.story_id, "pre_render")
        composer = composer or SceneComposer(self.library)
        fps = story.output.fps

        report.checks_run += ["missing_assets", "character_references", "timeline_conflicts", "composition"]
        for scene in story.scenes:
            timing = speech.scene_timing(story, scene.scene_id) if speech is not None else None
            try:
                _, issues = composer.compose(story, scene.scene_id, timing, strict=False)
            except EngineError as exc:
                report.automatic.append(QCItem("assets", "compose", "error", exc.message, scene.scene_id))
                continue
            for issue in issues:
                report.automatic.append(QCItem(CATEGORY_BY_CODE.get(issue.code, "composition"), issue.code, issue.severity, issue.message, issue.path))

        report.checks_run.append("character_continuity")
        uses = [(scene.scene_id, c.character_id, next((r.asset_version for r in story.characters if r.character_id == c.character_id), 1))
                for scene in story.scenes for shot in scene.shots for c in shot.characters]
        seen = set()
        for issue in self.registry.continuity_issues([u for u in uses if not (u in seen or seen.add(u))]):
            if not any(a.where.startswith(f"scene({issue['path']})") and a.check in ("missing_asset", "asset_integrity_error") for a in report.automatic):
                report.automatic.append(QCItem("characters", "character_continuity", "error", issue["message"], issue["path"]))

        report.checks_run += ["scene_duration", "frame_rate", "resolution"]
        for scene in story.scenes:
            if scene.total_duration < 1.0:
                report.automatic.append(QCItem("timing", "scene_duration", "error", f"scene lasts only {scene.total_duration:.2f}s", scene.scene_id))
            if scene.total_duration > 180:
                report.automatic.append(QCItem("timing", "scene_duration", "warning", f"scene lasts {scene.total_duration:.0f}s; consider splitting it", scene.scene_id))
            for shot in scene.shots:
                frames = shot.duration_seconds * fps
                if abs(frames - round(frames)) > 0.01:
                    report.automatic.append(QCItem("timing", "frame_grid", "warning",
                                                   f"shot lasts {shot.duration_seconds}s, which is not a whole number of frames at {fps} fps",
                                                   f"{scene.scene_id}/{shot.shot_id}"))
        if story.output.fps not in (24, 25, 30, 50, 60):
            report.automatic.append(QCItem("timing", "frame_rate", "warning", f"unusual frame rate {story.output.fps}"))
        if story.output.width % 2 or story.output.height % 2:
            report.automatic.append(QCItem("timing", "resolution", "error", "width and height must be even for H.264"))

        report.checks_run += ["missing_audio", "audio_quality", "speech_fits_shot"]
        if speech is None:
            report.automatic.append(QCItem("audio", "missing_audio", "warning", "no narration or dialogue audio has been generated yet"))
        else:
            for p in speech.problems:
                report.automatic.append(QCItem("audio", "missing_audio", "error", p["message"], p["line"]))
            for scene in story.scenes:
                for shot in scene.shots:
                    durations = {}
                    for line in shot.dialogue:
                        key = line_key(scene.scene_id, shot.shot_id, line.line_id)
                        clip = speech.clips.get(key)
                        if clip is None:
                            if not any(p["line"] == key for p in speech.problems):
                                report.automatic.append(QCItem("audio", "missing_audio", "error", "no audio for this line", key))
                            continue
                        durations[line.line_id] = clip.duration
                        if clip.text != line.text:
                            report.automatic.append(QCItem("audio", "stale_audio", "error", "the line's text changed after its audio was generated", key))
                        if clip.stats.clipped_runs:
                            report.automatic.append(QCItem("audio", "audio_clipping", "error", f"audio is clipped ({clip.stats.clipped_runs} runs)", key))
                        if clip.stats.silent:
                            report.automatic.append(QCItem("audio", "silent_audio", "error", "audio is silent", key))
                    end = layout_shot(shot, durations).end()
                    if end > shot.duration_seconds + 0.02:
                        report.automatic.append(QCItem(
                            "timing", "speech_overrun", "error",
                            f"speech ends at {end:.2f}s but the shot lasts {shot.duration_seconds:.2f}s (needs {end + TAIL:.2f}s); re-time the story",
                            f"{scene.scene_id}/{shot.shot_id}"))

        self._approvals(story, report)
        return report

    def _approvals(self, story: Story, report: QCReport) -> None:
        report.checks_run.append("approvals")
        for ref in story.characters:
            try:
                manifest = self.library.character(ref.character_id, ref.asset_version)
            except EngineError:
                continue
            if manifest.approval_status != ApprovalStatus.approved:
                report.human_review.append(QCItem("approval", "character_design", "info",
                                                  f"character design '{ref.character_id}' v{ref.asset_version} is {manifest.approval_status.value}",
                                                  ref.character_id))
        for env_id, version in sorted({(s.environment_id, s.environment_version) for s in story.scenes}):
            try:
                manifest = self.library.environment(env_id, version)
            except EngineError:
                continue
            if manifest.approval_status != ApprovalStatus.approved:
                report.human_review.append(QCItem("approval", "environment_design", "info",
                                                  f"environment '{env_id}' v{version} is {manifest.approval_status.value}", env_id))
        for scene in story.scenes:
            if scene.approval_status != ApprovalStatus.approved:
                report.human_review.append(QCItem("approval", "scene_composition", "info",
                                                  f"scene composition is {scene.approval_status.value}", scene.scene_id))

    # ---------------------------------------------------------- post-render
    def check_video(self, story: Story, video: Path, settings: RenderSettings, duration: float, audio: Path | None = None,
                    expect_audio: bool = True) -> QCReport:
        report = QCReport(story.story_id, "post_render")
        report.checks_run += ["final_render", "resolution", "frame_rate", "duration", "audio_stream", "video_corruption"]
        for issue in RenderService.validate_video(video, settings, duration, expect_audio):
            report.automatic.append(QCItem("video", issue["code"], issue["severity"], issue["message"], Path(video).name))
        if any(i.check in ("missing_output", "corrupt_video", "no_video_stream") for i in report.automatic):
            return report

        report.checks_run.append("black_frames")
        boundaries, t = [0.0], 0.0
        for scene in story.scenes:
            t += scene.total_duration
            boundaries.append(t)
        allowed = max((s.transition_in.duration_seconds + s.transition_out.duration_seconds for s in story.scenes), default=0.0) + 0.4
        for start, end in ffmpeg.black_segments(video, min_duration=0.5):
            at_boundary = any(start - 1.2 <= b <= end + 1.2 for b in boundaries)
            if end - start > allowed or not at_boundary:
                report.automatic.append(QCItem("video", "black_frames", "error",
                                               f"black picture from {start:.2f}s to {end:.2f}s" + ("" if at_boundary else " in the middle of a scene"),
                                               Path(video).name))

        report.checks_run.append("audio_clipping")
        if expect_audio:
            levels = ffmpeg.audio_levels(video)
            if levels.get("max_volume", -99.0) >= -0.05:
                report.automatic.append(QCItem("audio", "audio_clipping", "error", f"soundtrack peaks at {levels['max_volume']:.2f} dBFS", Path(video).name))
            if levels.get("mean_volume", 0.0) < -40:
                report.automatic.append(QCItem("audio", "quiet_audio", "warning", f"soundtrack is very quiet ({levels['mean_volume']:.1f} dBFS mean)", Path(video).name))
            if audio is not None and Path(audio).is_file():
                stats = analyse(read_wav(audio))
                if stats.clipped_runs:
                    report.automatic.append(QCItem("audio", "audio_clipping", "error", f"mix has {stats.clipped_runs} clipped runs", Path(audio).name))
        self._approvals(story, report)
        return report
