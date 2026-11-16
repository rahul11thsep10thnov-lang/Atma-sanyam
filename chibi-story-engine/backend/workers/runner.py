"""In-process render job runner. Job state lives in PostgreSQL; each scene renders in its own subprocess.

This is the seam for a distributed queue: a Celery task would call `JobRunner.execute(job_id)` unchanged.
"""
from __future__ import annotations

import logging
import queue
import threading
import time
import uuid
from datetime import datetime, timezone

from sqlalchemy import select

from engine.audio.speech import produce_speech
from engine.common.errors import EngineError
from engine.common.paths import sha256_file
from engine.rendering.service import RenderSettings, SceneResult
from engine.schema.story import parse_story

from ..db import Database
from ..models import RenderJob, RenderOutput, Scene, Story, StoryVersion
from ..services.engine import EngineHub

log = logging.getLogger("csae.jobs")


class JobRunner:
    def __init__(self, db: Database, hub: EngineHub, workers: int = 1) -> None:
        self.db, self.hub = db, hub
        self._queue: "queue.Queue[uuid.UUID | None]" = queue.Queue()
        self._cancels: dict[uuid.UUID, threading.Event] = {}
        self._threads = [threading.Thread(target=self._loop, name=f"render-{i}", daemon=True) for i in range(max(1, workers))]
        self._started = False

    # ------------------------------------------------------------ lifecycle
    def start(self) -> None:
        if self._started:
            return
        self._started = True
        with self.db.transaction() as s:
            # whatever was mid-render when the process died did not finish: say so, keep its completed scenes
            for job in s.scalars(select(RenderJob).where(RenderJob.status == "running")):
                job.status, job.error_message = "interrupted", "The server stopped while this job was rendering; resume it to continue"
            waiting = [j.id for j in s.scalars(select(RenderJob).where(RenderJob.status == "queued").order_by(RenderJob.created_at))]
        for job_id in waiting:
            self._queue.put(job_id)
        for t in self._threads:
            t.start()

    def stop(self) -> None:
        for event in self._cancels.values():
            event.set()
        for _ in self._threads:
            self._queue.put(None)

    def submit(self, job_id: uuid.UUID) -> None:
        self._cancels[job_id] = threading.Event()
        self._queue.put(job_id)

    def cancel(self, job_id: uuid.UUID) -> None:
        event = self._cancels.get(job_id)
        if event:
            event.set()

    def _loop(self) -> None:
        while True:
            job_id = self._queue.get()
            if job_id is None:
                return
            try:
                self.execute(job_id)
            except Exception:                              # the worker thread must survive anything
                log.exception("job_crashed", extra={"job_id": str(job_id)})
                self._finish(job_id, "failed", "Unexpected error while rendering; see the server log")

    # ------------------------------------------------------------ execution
    def _finish(self, job_id: uuid.UUID, status: str, error: str | None = None, progress: float | None = None) -> None:
        with self.db.transaction() as s:
            job = s.get(RenderJob, job_id)
            if job is None:
                return
            job.status, job.error_message, job.completed_at = status, error, datetime.now(timezone.utc)
            job.current_scene = None
            if progress is not None:
                job.progress = progress

    def execute(self, job_id: uuid.UUID) -> None:
        cancel = self._cancels.setdefault(job_id, threading.Event())
        with self.db.transaction() as s:
            job = s.get(RenderJob, job_id)
            if job is None or job.status != "queued":
                return
            if job.cancel_requested:
                job.status = "cancelled"
                return
            version = s.scalar(select(StoryVersion).where(StoryVersion.story_id == job.story_id, StoryVersion.version_number == job.story_version))
            config = dict(job.configuration_json)
            job.status, job.started_at, job.progress, job.error_message = "running", datetime.now(timezone.utc), 0.0, None
            story_json = version.story_json if version else None
        if story_json is None:
            self._finish(job_id, "failed", "The story version this job was created for no longer exists")
            return

        try:
            story = parse_story(story_json)
            settings = (RenderSettings.preview if config.get("mode") == "preview" else RenderSettings.final)(
                story, workers=int(config.get("workers", 2)))
            scene_ids = config.get("scene_ids") or [sc.scene_id for sc in story.scenes]
            speech = produce_speech(story, self.hub.dialogue()) if config.get("audio", True) else None
            weights = {sc.scene_id: sc.total_duration for sc in story.scenes if sc.scene_id in scene_ids}
            total = sum(weights.values()) or 1.0
            state = {"done": 0.0, "last": 0.0, "scenes": {sid: {"status": "pending", "progress": 0.0} for sid in scene_ids}}

            def progress(scene_id: str, fraction: float, phase: str) -> None:
                if scene_id:
                    state["scenes"][scene_id] = {"status": phase, "progress": round(fraction, 3)}
                overall = sum(weights.get(sid, 0) * (1.0 if v["status"] in ("rendered", "cached") else v["progress"])
                              for sid, v in state["scenes"].items()) / total
                now = time.time()
                if now - state["last"] < 1.0 and phase not in ("rendered", "cached", "assembling"):
                    return
                state["last"] = now
                with self.db.transaction() as s:
                    job = s.get(RenderJob, job_id)
                    job.progress = min(0.99, round(overall * 0.97, 4))
                    job.current_scene = scene_id or None
                    job.scene_status = {k: dict(v) for k, v in state["scenes"].items()}
                    if job.cancel_requested:
                        cancel.set()

            log_dir = self.hub.paths.renders / "jobs" / str(job_id)
            if config.get("kind") == "scene_preview":
                result, preview = self.hub.render.preview_scene(story, scene_ids[0], speech, settings, progress, cancel)
                results = {scene_ids[0]: result}
                final, duration, error = preview, result.duration, result.error
                output_type = "preview"
            else:
                outcome = self.hub.render.render_story(story, settings, speech, config.get("scene_ids"), progress, cancel,
                                                       bool(config.get("force")), log_dir)
                results, final, duration, error = outcome.scenes, outcome.final, outcome.duration, outcome.error
                output_type = "final" if config.get("mode") != "preview" else "preview"
                problems = [v["message"] for v in outcome.validation if v["severity"] == "error"]
                if problems:
                    error, final = "Final video failed validation: " + "; ".join(problems), None
            self._record(job_id, results, final, duration, settings, output_type)
            if cancel.is_set():
                self._finish(job_id, "cancelled", "Cancelled; completed scenes were kept")
            elif final is None:
                self._finish(job_id, "failed", error or "Rendering failed")
            else:
                self._finish(job_id, "completed", None, 1.0)
                with self.db.transaction() as s:
                    story_row = s.get(Story, s.get(RenderJob, job_id).story_id)
                    if output_type == "final" and story_row.status in ("storyboarded", "in_production"):
                        story_row.status = "rendered"
        except EngineError as exc:
            detail = "; ".join(f"{i.get('path', '')}: {i.get('message', '')}" for i in exc.details.get("issues", [])[:3])
            self._finish(job_id, "failed", exc.message + (f" ({detail})" if detail else ""))
        finally:
            self._cancels.pop(job_id, None)

    def _record(self, job_id: uuid.UUID, results: dict[str, SceneResult], final, duration: float, settings: RenderSettings, output_type: str) -> None:
        root = self.hub.paths.renders
        with self.db.transaction() as s:
            job = s.get(RenderJob, job_id)
            scene_rows = {sc.scene_code: sc.id for sc in s.scalars(select(Scene).where(Scene.story_id == job.story_id))}
            status = {}
            for sid, r in results.items():
                status[sid] = {"status": r.status, "progress": 1.0 if r.ok else 0.0, "frames": r.frames, "seconds": round(r.seconds, 1),
                               "attempts": r.attempts, "error": r.error, "warnings": len(r.warnings)}
                if r.ok and r.path is not None:
                    s.add(RenderOutput(render_job_id=job.id, scene_id=scene_rows.get(sid), scene_code=sid, output_type="scene",
                                       file_reference=r.path.relative_to(root).as_posix(), duration=r.duration,
                                       resolution=f"{settings.width}x{settings.height}", checksum=sha256_file(r.path), cached=r.status == "cached"))
            job.scene_status = status
            if final is not None:
                s.add(RenderOutput(render_job_id=job.id, output_type=output_type, file_reference=final.relative_to(root).as_posix(),
                                   scene_code=next(iter(results)) if job.configuration_json.get("kind") == "scene_preview" else None,
                                   duration=duration, resolution=f"{settings.width}x{settings.height}", checksum=sha256_file(final)))
