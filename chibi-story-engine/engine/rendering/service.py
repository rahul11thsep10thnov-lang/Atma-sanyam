"""Render service: scenes and stories -> validated MP4 files, with caching, retry, resume and cancellation.

Guarantees:
- a scene video is stored under a key derived from everything that affects its pixels; identical input is never rendered twice;
- a finished scene is never touched by another scene's failure;
- frames of an interrupted scene stay on disk and the next attempt continues after the last complete frame;
- temporary files are removed only after the encoded scene has passed validation.
"""
from __future__ import annotations

import hashlib
import json
import shutil
import subprocess
import sys
import threading
import time
from collections.abc import Callable
from dataclasses import asdict, dataclass, field
from pathlib import Path

from ..asset_manager.library import AssetLibrary
from ..audio.soundtrack import build_scene_audio, build_story_audio
from ..audio.speech import StorySpeech
from ..common.errors import EngineError, RenderCancelled, RenderError, ValidationFailed
from ..common.paths import PROJECT_ROOT, EnginePaths, require_id, sha256_file
from ..composition.composer import ComposeConfig, Issue, SceneComposer
from ..composition.plan import ScenePlan
from ..schema.story import Story
from . import ffmpeg

RENDER_VERSION = 3          # bump when the worker's output changes for the same plan
Progress = Callable[[str, float, str], None]     # (scene id, 0..1, phase)


@dataclass(frozen=True)
class RenderSettings:
    width: int = 1920
    height: int = 1080
    fps: int = 24
    samples: int = 1
    crf: int = 18
    preset: str = "medium"
    mode: str = "final"
    workers: int = 2

    @classmethod
    def final(cls, story: Story, **overrides) -> "RenderSettings":
        return cls(**{"width": story.output.width, "height": story.output.height, "fps": story.output.fps, **overrides})

    @classmethod
    def preview(cls, story: Story, **overrides) -> "RenderSettings":
        height = 360
        width = int(round(story.output.width / story.output.height * height / 2)) * 2
        return cls(**{"width": width, "height": height, "fps": story.output.fps, "crf": 24, "preset": "veryfast", "mode": "preview",
                      **overrides})

    def pixel_key(self) -> str:
        return f"{self.width}x{self.height}@{self.fps}/s{self.samples}/crf{self.crf}/{self.preset}"


@dataclass
class SceneResult:
    scene_id: str
    status: str                      # "rendered" | "cached" | "failed" | "cancelled"
    path: Path | None = None
    key: str = ""
    frames: int = 0
    duration: float = 0.0
    seconds: float = 0.0
    attempts: int = 0
    error: str | None = None
    warnings: list[dict] = field(default_factory=list)

    @property
    def ok(self) -> bool:
        return self.status in ("rendered", "cached")


@dataclass
class StoryResult:
    story_id: str
    scenes: dict[str, SceneResult]
    final: Path | None = None
    audio: Path | None = None
    duration: float = 0.0
    validation: list[dict] = field(default_factory=list)
    error: str | None = None

    @property
    def ok(self) -> bool:
        return self.final is not None and not any(v["severity"] == "error" for v in self.validation)

    def failed(self) -> list[str]:
        return [sid for sid, r in self.scenes.items() if not r.ok]


class RenderService:
    def __init__(self, library: AssetLibrary, paths: EnginePaths, *, timeout: int = 3600, retries: int = 1,
                 python: str | None = None) -> None:
        self.library = library
        self.paths = paths.ensure()
        self.timeout = timeout
        self.retries = retries
        self.python = python or sys.executable
        self.composer = SceneComposer(library)

    # ------------------------------------------------------------ locations
    def scene_dir(self, story_id: str, scene_id: str) -> Path:
        return self.paths.renders / "scenes" / require_id(story_id) / require_id(scene_id)

    def scene_path(self, story_id: str, scene_id: str, key: str) -> Path:
        return self.scene_dir(story_id, scene_id) / f"{key}.mp4"

    def work_dir(self, story_id: str, scene_id: str, key: str) -> Path:
        return self.paths.renders / "temporary" / require_id(story_id) / f"{require_id(scene_id)}_{key[:16]}"

    @staticmethod
    def scene_key(plan: ScenePlan, settings: RenderSettings) -> str:
        return hashlib.sha256(f"{RENDER_VERSION}|{plan.digest()}|{settings.pixel_key()}".encode()).hexdigest()[:32]

    # ---------------------------------------------------------------- plans
    def plan_scene(self, story: Story, scene_id: str, speech: StorySpeech | None = None) -> tuple[ScenePlan, list[Issue]]:
        timing = speech.scene_timing(story, scene_id) if speech is not None else None
        return self.composer.compose(story, scene_id, timing, ComposeConfig(story.output.width, story.output.height, story.output.fps))

    # --------------------------------------------------------------- scenes
    def render_scene(self, story: Story, scene_id: str, settings: RenderSettings, speech: StorySpeech | None = None,
                     progress: Progress | None = None, cancel: threading.Event | None = None, force: bool = False,
                     log_dir: Path | None = None) -> SceneResult:
        started = time.time()
        try:
            plan, issues = self.plan_scene(story, scene_id, speech)
        except ValidationFailed as exc:
            detail = "; ".join(f"{i['path']}: {i['message']}" for i in exc.issues[:4])
            return SceneResult(scene_id, "failed", error=f"{exc.message}: {detail}")
        key = self.scene_key(plan, settings)
        warnings = [i.to_dict() for i in issues if i.severity == "warning"]
        target = self.scene_path(story.story_id, scene_id, key)
        if not force and self._valid_scene(target, plan, settings):
            if progress:
                progress(scene_id, 1.0, "cached")
            return SceneResult(scene_id, "cached", target, key, plan.n_frames, plan.duration, time.time() - started, 0, warnings=warnings)

        work = self.work_dir(story.story_id, scene_id, key)
        frames_dir = work / "frames"
        if force and work.exists():
            shutil.rmtree(work)
        plan.save(work / "plan")
        log_path = (log_dir or work) / f"{scene_id}.log"
        log_path.parent.mkdir(parents=True, exist_ok=True)
        attempts = 0
        error: str | None = None
        while attempts <= self.retries:
            attempts += 1
            try:
                self._run_workers(work / "plan", frames_dir, plan.n_frames, settings, scene_id, progress, cancel, log_path)
                missing = [i for i in range(plan.n_frames) if not (frames_dir / f"frame_{i:06d}.png").is_file()]
                if missing:
                    raise RenderError(f"{len(missing)} frames were not produced (first: {missing[0]})", recoverable=True)
                if progress:
                    progress(scene_id, 0.97, "encoding")
                tmp = work / "scene.mp4"
                ffmpeg.encode_frames(frames_dir, settings.fps, tmp, n_frames=plan.n_frames, crf=settings.crf, preset=settings.preset,
                                     fade_in=plan.fade_in, fade_out=plan.fade_out)
                problems = [p for p in self.validate_video(tmp, settings, plan.duration, expect_audio=False) if p["severity"] == "error"]
                if problems:
                    raise RenderError("encoded scene failed validation: " + "; ".join(p["message"] for p in problems), recoverable=False)
                target.parent.mkdir(parents=True, exist_ok=True)
                tmp.replace(target)
                target.with_suffix(".json").write_text(json.dumps({
                    "scene_id": scene_id, "story_id": story.story_id, "key": key, "plan_digest": plan.digest(), "frames": plan.n_frames,
                    "duration": plan.duration, "settings": asdict(settings), "checksum": sha256_file(target),
                    "render_seconds": round(time.time() - started, 2)}, indent=1), encoding="utf-8")
                shutil.rmtree(work, ignore_errors=True)        # only now: the scene is safely stored
                if progress:
                    progress(scene_id, 1.0, "rendered")
                return SceneResult(scene_id, "rendered", target, key, plan.n_frames, plan.duration, time.time() - started, attempts,
                                   warnings=warnings)
            except RenderCancelled:
                return SceneResult(scene_id, "cancelled", key=key, frames=plan.n_frames, seconds=time.time() - started, attempts=attempts,
                                   error="cancelled", warnings=warnings)
            except RenderError as exc:
                error = exc.message + (f" ({exc.details.get('stderr', '')[-200:]})" if exc.details.get("stderr") else "")
                with open(log_path, "a", encoding="utf-8") as fh:
                    fh.write(f"\n[attempt {attempts}] {error}\n")
                if not exc.recoverable:
                    break
        return SceneResult(scene_id, "failed", key=key, frames=plan.n_frames, seconds=time.time() - started, attempts=attempts,
                           error=error, warnings=warnings)

    def _valid_scene(self, path: Path, plan: ScenePlan, settings: RenderSettings) -> bool:
        if not path.is_file():
            return False
        meta_path = path.with_suffix(".json")
        try:
            meta = json.loads(meta_path.read_text(encoding="utf-8"))
            return meta.get("frames") == plan.n_frames and meta.get("checksum") == sha256_file(path)
        except (OSError, ValueError):
            return False

    def _run_workers(self, plan_dir: Path, frames_dir: Path, n_frames: int, settings: RenderSettings, scene_id: str,
                     progress: Progress | None, cancel: threading.Event | None, log_path: Path) -> None:
        """Render all missing frames, split over `settings.workers` Blender processes."""
        frames_dir.mkdir(parents=True, exist_ok=True)
        count = max(1, min(settings.workers, n_frames // 24 or 1))
        bounds = [round(i * n_frames / count) for i in range(count + 1)]
        procs: list[tuple[subprocess.Popen, int, int]] = []
        errors: list[str] = []

        def pump(index: int, proc: subprocess.Popen, first: int, last: int) -> None:
            with open(log_path, "a", encoding="utf-8") as log:
                for line in proc.stdout:                                  # type: ignore[union-attr]
                    if line.startswith("CSAE_PROGRESS"):
                        continue                                          # progress is measured from the frames on disk
                    elif line.startswith("CSAE_ERROR"):
                        errors.append(line[len("CSAE_ERROR"):].strip())
                        log.write(line)
                    elif not line.startswith(("Fra:", "Saved:", " Time:")) and line.strip():
                        log.write(line)

        for i in range(count):
            first, last = bounds[i], bounds[i + 1]
            args = [self.python, "-m", "engine.rendering.blender_worker", "--plan", str(plan_dir), "--out", str(frames_dir),
                    "--samples", str(settings.samples), "--width", str(settings.width), "--height", str(settings.height),
                    "--first", str(first), "--last", str(last), "--resume"]
            proc = subprocess.Popen(args, cwd=str(PROJECT_ROOT), stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
            thread = threading.Thread(target=pump, args=(i, proc, first, last), daemon=True)
            thread.start()
            procs.append((proc, first, last))
        deadline = time.time() + self.timeout
        try:
            while any(p.poll() is None for p, _, _ in procs):
                if cancel is not None and cancel.is_set():
                    raise RenderCancelled("Render was cancelled")
                if time.time() > deadline:
                    raise RenderError(f"scene '{scene_id}' exceeded the render time limit of {self.timeout}s", recoverable=False)
                if progress:
                    have = sum(1 for _ in frames_dir.glob("frame_[0-9]*.png") if not _.name.endswith(".tmp.png"))
                    progress(scene_id, min(0.95, 0.95 * have / max(1, n_frames)), "rendering")
                time.sleep(0.5)
        except BaseException:
            for p, _, _ in procs:
                if p.poll() is None:
                    p.kill()
            for p, _, _ in procs:
                p.wait(timeout=30)
            raise
        failed = [p.returncode for p, _, _ in procs if p.returncode != 0]
        if failed:
            message = errors[0] if errors else f"Blender worker exited with status {failed[0]}"
            # a crash (signal, out of memory) may succeed on a second attempt; a reported error will not
            raise RenderError(f"scene '{scene_id}': {message}", recoverable=not errors)

    # -------------------------------------------------------------- preview
    def preview_scene(self, story: Story, scene_id: str, speech: StorySpeech | None = None, settings: RenderSettings | None = None,
                      progress: Progress | None = None, cancel: threading.Event | None = None) -> tuple[SceneResult, Path | None]:
        """A low-resolution scene render with its own sound (speech, effects, music) for review."""
        settings = settings or RenderSettings.preview(story)
        result = self.render_scene(story, scene_id, settings, speech, progress, cancel)
        if not result.ok or result.path is None:
            return result, None
        out = self.paths.renders / "previews" / story.story_id / f"{scene_id}_{result.key[:12]}.mp4"
        if speech is None or not speech.clips:
            out.parent.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(result.path, out)
            return result, out
        audio = build_scene_audio(story, scene_id, speech, self.library, out.with_suffix(".wav"), with_music=True)
        ffmpeg.mux(result.path, audio.path, out, result.duration)
        audio.path.unlink(missing_ok=True)
        return result, out

    # ---------------------------------------------------------------- story
    def render_selected_scenes(self, story: Story, scene_ids: list[str], settings: RenderSettings, speech: StorySpeech | None = None,
                               progress: Progress | None = None, cancel: threading.Event | None = None, force: bool = False,
                               log_dir: Path | None = None) -> dict[str, SceneResult]:
        results: dict[str, SceneResult] = {}
        for scene_id in scene_ids:
            if cancel is not None and cancel.is_set():
                results[scene_id] = SceneResult(scene_id, "cancelled", error="cancelled")
                continue
            try:
                results[scene_id] = self.render_scene(story, scene_id, settings, speech, progress, cancel, force, log_dir)
            except EngineError as exc:          # one scene's failure never stops the others
                results[scene_id] = SceneResult(scene_id, "failed", error=exc.message)
        return results

    def render_story(self, story: Story, settings: RenderSettings, speech: StorySpeech | None = None,
                     scene_ids: list[str] | None = None, progress: Progress | None = None, cancel: threading.Event | None = None,
                     force: bool = False, log_dir: Path | None = None) -> StoryResult:
        """Render (or reuse) the requested scenes; when every scene of the story is available, assemble the final video."""
        wanted = scene_ids or [s.scene_id for s in story.scenes]
        results = self.render_selected_scenes(story, wanted, settings, speech, progress, cancel, force, log_dir)
        out = StoryResult(story.story_id, results)
        if cancel is not None and cancel.is_set():
            out.error = "cancelled"
            return out
        if out.failed():
            out.error = f"{len(out.failed())} scene(s) failed: {', '.join(out.failed())}"
            return out
        # scenes that were not requested this time must already exist (re-rendering one changed scene)
        all_results: dict[str, SceneResult] = {}
        for scene in story.scenes:
            if scene.scene_id in results:
                all_results[scene.scene_id] = results[scene.scene_id]
                continue
            cached = self._lookup(story, scene.scene_id, settings, speech)
            if cached is None:
                out.error = f"scene '{scene.scene_id}' has not been rendered yet; render it to assemble the story"
                return out
            all_results[scene.scene_id] = cached
        out.scenes = {**all_results}
        try:
            if progress:
                progress("", 0.98, "assembling")
            out.final, out.audio, out.duration = self.assemble_video(story, all_results, speech, settings)
            out.validation = self.validate_video(out.final, settings, out.duration, expect_audio=speech is not None and bool(speech.clips))
        except EngineError as exc:
            out.error = exc.message
        return out

    def _lookup(self, story: Story, scene_id: str, settings: RenderSettings, speech: StorySpeech | None) -> SceneResult | None:
        try:
            plan, _ = self.plan_scene(story, scene_id, speech)
        except ValidationFailed:
            return None
        key = self.scene_key(plan, settings)
        path = self.scene_path(story.story_id, scene_id, key)
        if self._valid_scene(path, plan, settings):
            return SceneResult(scene_id, "cached", path, key, plan.n_frames, plan.duration)
        return None

    def assemble_video(self, story: Story, scenes: dict[str, SceneResult], speech: StorySpeech | None,
                       settings: RenderSettings) -> tuple[Path, Path | None, float]:
        ordered = [scenes[s.scene_id] for s in story.scenes]
        if any(r.path is None for r in ordered):
            raise RenderError("cannot assemble: a scene has no video")
        stamp = hashlib.sha256("|".join(r.key for r in ordered).encode()).hexdigest()[:10]
        out_dir = self.paths.renders / "final" / story.story_id
        name = f"{story.story_id}_{settings.width}x{settings.height}_{stamp}"
        silent = out_dir / f"{name}.silent.mp4"
        ffmpeg.concat_videos([r.path for r in ordered], silent)          # type: ignore[misc]
        duration = sum(r.duration for r in ordered)
        final = out_dir / f"{name}.mp4"
        audio_path: Path | None = None
        if speech is not None and speech.clips:
            audio = build_story_audio(story, speech, self.library, out_dir / f"{name}.wav")
            audio_path = audio.path
            ffmpeg.mux(silent, audio.path, final, duration)
            silent.unlink(missing_ok=True)
        else:
            silent.replace(final)
        return final, audio_path, duration

    # ----------------------------------------------------------- validation
    @staticmethod
    def validate_video(path: Path, settings: RenderSettings, duration: float, expect_audio: bool = True) -> list[dict]:
        """Technical checks of an encoded file. Returns issues with severity error/warning."""
        issues: list[dict] = []

        def add(severity: str, code: str, message: str) -> None:
            issues.append({"severity": severity, "code": code, "message": message})

        if not Path(path).is_file() or Path(path).stat().st_size < 1000:
            add("error", "missing_output", "the video file is missing or empty")
            return issues
        try:
            info = ffmpeg.probe(path)
        except RenderError as exc:
            add("error", "corrupt_video", exc.message)
            return issues
        if not info.has_video:
            add("error", "no_video_stream", "the file has no video stream")
            return issues
        if (info.width, info.height) != (settings.width, settings.height):
            add("error", "wrong_resolution", f"resolution is {info.width}x{info.height}, expected {settings.width}x{settings.height}")
        if abs(info.fps - settings.fps) > 0.01:
            add("error", "wrong_frame_rate", f"frame rate is {info.fps:.3f}, expected {settings.fps}")
        expected_frames = int(round(duration * settings.fps))
        if abs(info.frames - expected_frames) > 1:
            add("error", "wrong_frame_count", f"video has {info.frames} frames, expected {expected_frames}")
        if abs(info.video_duration - duration) > 2.0 / settings.fps + 0.05:
            add("error", "wrong_duration", f"video lasts {info.video_duration:.2f}s, expected {duration:.2f}s")
        if expect_audio:
            if not info.has_audio:
                add("error", "no_audio_stream", "the file has no audio stream")
            elif abs(info.audio_duration - duration) > 0.15:
                add("error", "audio_video_mismatch", f"audio lasts {info.audio_duration:.2f}s but video lasts {duration:.2f}s")
        errors = ffmpeg.decode_errors(path)
        if errors:
            add("error", "corrupt_video", f"decoding reported {len(errors)} error(s): {errors[0][:160]}")
        return issues

    def export_video(self, final: Path, destination: Path) -> Path:
        """Copy a validated final video to an export location, verifying the copy."""
        destination.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(final, destination)
        if sha256_file(final) != sha256_file(destination):
            raise RenderError("exported file does not match the rendered file")
        return destination
