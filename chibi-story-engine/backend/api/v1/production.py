"""Story production endpoints: analysis, storyboard, scenes, audio, rendering, quality control, exports."""
from __future__ import annotations

import io
import uuid
from datetime import datetime
from typing import Any, Literal

from fastapi import APIRouter, Query, Response
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import select

from engine.composition.composer import SceneComposer
from engine.rendering.raster import render_shot_frame
from engine.schema.story import parse_story

from ...deps import AnyUser, Ctx, Db, Producer, ProducerOrReviewer
from ...errors import ApiError, not_found
from ...models import RenderJob, RenderOutput, Scene
from ...services import audit
from ...services.production import ProductionService
from ...services.stories import StoryService

router = APIRouter(tags=["production"])


class Body(BaseModel):
    model_config = ConfigDict(extra="forbid")


class AnalyseIn(Body):
    use_llm: bool | None = Field(None, description="true: require the configured LLM; false: rule-based; omit: server default")


class StoryboardIn(Body):
    character_overrides: dict[str, str] = Field(default_factory=dict, description="entity key -> character id to use")


class ScenePatch(Body):
    title: str | None = Field(None, max_length=300)
    description: str | None = Field(None, max_length=4000)
    environment_id: str | None = Field(None, pattern=r"^[a-z0-9][a-z0-9_\-]{0,63}$")
    environment_version: int | None = Field(None, ge=1)
    time_of_day: str | None = Field(None, max_length=32)
    weather: str | None = Field(None, max_length=32)
    approval_status: Literal["pending", "approved", "rejected"] | None = None
    scene_json: dict[str, Any] | None = Field(None, description="a complete replacement scene (same scene_id)")


class AudioIn(Body):
    force: bool = False
    retime: bool = True


class RenderIn(Body):
    mode: Literal["preview", "final"] = "final"
    scene_ids: list[str] | None = None
    force: bool = False
    audio: bool = True


class PublishIn(Body):
    output_id: uuid.UUID
    override_approvals: bool = False


def hub(ctx):
    return ctx.services["hub"]


def scene_out(scene: Scene) -> dict[str, Any]:
    data = scene.scene_json
    shots = data.get("shots", [])
    lines = [l for sh in shots for l in sh.get("dialogue", [])]
    return {"id": str(scene.id), "scene_id": scene.scene_code, "scene_number": scene.scene_number, "title": scene.title,
            "description": scene.description, "duration": scene.duration, "environment_id": scene.environment_code,
            "time_of_day": data.get("time_of_day", "day"), "weather": data.get("weather", "clear"), "approval_status": scene.status,
            "shot_count": len(shots), "characters": sorted({c["character_id"] for sh in shots for c in sh.get("characters", [])}),
            "narration": [l["text"] for l in lines if l["speaker"] == "narrator"],
            "dialogue": [{"speaker": l["speaker"], "text": l["text"], "emotion": l.get("emotion", "neutral")} for l in lines if l["speaker"] != "narrator"],
            "scene_json": data}


def job_out(job: RenderJob) -> dict[str, Any]:
    scenes = job.scene_status or {}
    elapsed = ((job.completed_at or datetime.now(job.started_at.tzinfo)) - job.started_at).total_seconds() if job.started_at else 0.0
    return {"id": str(job.id), "story_id": str(job.story_id), "story_version": job.story_version, "type": job.job_type,
            "mode": job.configuration_json.get("mode"), "status": job.status, "progress": job.progress, "current_scene": job.current_scene,
            "scenes": scenes, "completed_scenes": [k for k, v in scenes.items() if v.get("status") in ("rendered", "cached")],
            "failed_scenes": [k for k, v in scenes.items() if v.get("status") == "failed"],
            "error_message": job.error_message, "render_seconds": round(elapsed, 1),
            "created_at": job.created_at.isoformat(), "started_at": job.started_at.isoformat() if job.started_at else None,
            "completed_at": job.completed_at.isoformat() if job.completed_at else None,
            "outputs": [output_out(o) for o in sorted(job.outputs, key=lambda o: o.created_at)]}


def output_out(o: RenderOutput) -> dict[str, Any]:
    return {"id": str(o.id), "type": o.output_type, "scene_id": o.scene_code, "duration": o.duration, "resolution": o.resolution,
            "checksum": o.checksum, "cached": o.cached, "published": o.published, "created_at": o.created_at.isoformat(),
            "url": f"/api/v1/media/outputs/{o.id}"}


@router.post("/stories/{story_id}/analyse", summary="Analyse the story text: characters, scenes, dialogue, emotions, actions")
def analyse(story_id: uuid.UUID, ctx: Ctx, db: Db, user: Producer, body: AnalyseIn | None = None) -> dict[str, Any]:
    return ProductionService(db, hub(ctx)).analyse(story_id, user, body.use_llm if body else None)


@router.post("/stories/{story_id}/generate-storyboard", summary="Build a Story Definition from the analysis and the asset library")
def generate_storyboard(story_id: uuid.UUID, ctx: Ctx, db: Db, user: Producer, body: StoryboardIn | None = None) -> dict[str, Any]:
    svc = ProductionService(db, hub(ctx))
    if svc.stories.require(story_id).analysis_json is None:
        svc.analyse(story_id, user)
    return svc.generate_storyboard(story_id, user, body.character_overrides if body else None)


@router.get("/stories/{story_id}/scenes")
def list_scenes(story_id: uuid.UUID, db: Db, _: AnyUser) -> list[dict[str, Any]]:
    svc = StoryService(db)
    svc.require(story_id)
    return [scene_out(s) for s in svc.repo.scenes(story_id)]


@router.patch("/scenes/{scene_id}", summary="Edit a scene; the story is saved as a new version")
def patch_scene(scene_id: uuid.UUID, body: ScenePatch, ctx: Ctx, db: Db, user: ProducerOrReviewer) -> dict[str, Any]:
    changes = body.model_dump(exclude_none=True)
    if not changes:
        raise ApiError(422, "validation_failed", "No changes were given")
    if user.role == "reviewer" and set(changes) != {"approval_status"}:
        raise ApiError(403, "forbidden", "A reviewer may only approve or reject a scene")
    return scene_out(ProductionService(db, hub(ctx)).patch_scene(scene_id, changes, user))


@router.post("/scenes/{scene_id}/regenerate", summary="Rebuild this scene from the story analysis, keeping edits to other scenes")
def regenerate_scene(scene_id: uuid.UUID, ctx: Ctx, db: Db, user: Producer) -> dict[str, Any]:
    return scene_out(ProductionService(db, hub(ctx)).regenerate_scene(scene_id, user))


def _create_job(db, ctx, story, user, config: dict[str, Any], job_type: str) -> RenderJob:
    job = RenderJob(story_id=story.id, story_version=story.current_version, job_type=job_type, configuration_json=config, created_by=user.id)
    db.add(job)
    db.flush()
    audit.record(db, user.id, "render.requested", "render_job", job.id, **{k: v for k, v in config.items() if k != "workers"})
    db.commit()                                            # the runner reads the job in its own transaction
    ctx.services["jobs"].submit(job.id)
    return job


@router.post("/scenes/{scene_id}/preview", status_code=202, summary="Render a low-resolution preview of one scene (a job)")
def preview_scene(scene_id: uuid.UUID, ctx: Ctx, db: Db, user: Producer) -> dict[str, Any]:
    scene = db.get(Scene, scene_id)
    if scene is None:
        raise not_found("Scene", scene_id)
    svc = StoryService(db)
    story = svc.require(scene.story_id)
    svc.require_definition(story)
    job = _create_job(db, ctx, story, user, {"kind": "scene_preview", "mode": "preview", "scene_ids": [scene.scene_code], "audio": True}, "scene_preview")
    return job_out(job)


@router.get("/scenes/{scene_id}/frame", summary="A still of the scene at a time (software compositor; fast)",
            responses={200: {"content": {"image/jpeg": {}}}}, response_class=Response)
def scene_frame(scene_id: uuid.UUID, ctx: Ctx, db: Db, _: AnyUser, t: float = Query(0.0, ge=0), width: int = Query(640, ge=160, le=1280)):
    scene = db.get(Scene, scene_id)
    if scene is None:
        raise not_found("Scene", scene_id)
    svc = StoryService(db)
    definition = svc.require_definition(svc.require(scene.story_id))
    plan, _issues = SceneComposer(hub(ctx).library).compose(definition, scene.scene_code)
    frame = min(plan.n_frames - 1, int(t * plan.fps))
    for shot in plan.shots:
        if frame < shot.n_frames:
            image = render_shot_frame(shot, frame, width, int(width * plan.height / plan.width)).convert("RGB")
            buf = io.BytesIO()
            image.save(buf, "JPEG", quality=85)
            return Response(buf.getvalue(), media_type="image/jpeg", headers={"Cache-Control": "no-store"})
        frame -= shot.n_frames
    raise ApiError(422, "validation_failed", "That time is after the end of the scene")


@router.post("/stories/{story_id}/generate-audio", summary="Generate (or reuse) narration and dialogue; optionally re-time shots to fit")
def generate_audio(story_id: uuid.UUID, ctx: Ctx, db: Db, user: Producer, body: AudioIn | None = None) -> dict[str, Any]:
    body = body or AudioIn()
    return ProductionService(db, hub(ctx)).generate_audio(story_id, user, body.force, body.retime)


@router.get("/stories/{story_id}/audio")
def list_audio(story_id: uuid.UUID, db: Db, _: AnyUser) -> list[dict[str, Any]]:
    from ...models import AudioAsset
    StoryService(db).require(story_id)
    rows = db.scalars(select(AudioAsset).where(AudioAsset.story_id == story_id).order_by(AudioAsset.line_code))
    return [{"id": str(a.id), "type": a.audio_type, "voice_id": a.speaker_id, "line": a.line_code, "duration": a.duration,
             "text": a.metadata_json.get("text", ""), "peak_db": a.metadata_json.get("peak_db"), "url": f"/api/v1/media/audio/{a.id}"} for a in rows]


@router.post("/stories/{story_id}/render", status_code=202, summary="Start a render job for the story (or selected scenes)")
def render_story(story_id: uuid.UUID, ctx: Ctx, db: Db, user: Producer, body: RenderIn | None = None) -> dict[str, Any]:
    body = body or RenderIn()
    svc = StoryService(db)
    story = svc.require(story_id)
    definition = svc.require_definition(story)
    known = {s.scene_id for s in definition.scenes}
    unknown = [s for s in (body.scene_ids or []) if s not in known]
    if unknown:
        raise ApiError(422, "validation_failed", "Unknown scene ids", {"issues": [{"path": "scene_ids", "message": f"unknown: {', '.join(unknown)}"}]})
    job = _create_job(db, ctx, story, user, {"kind": "story", "mode": body.mode, "scene_ids": body.scene_ids, "force": body.force,
                                             "audio": body.audio, "workers": 2}, "story")
    return job_out(job)


@router.get("/render-jobs", summary="Render jobs, newest first")
def list_jobs(db: Db, _: AnyUser, story_id: uuid.UUID | None = None, limit: int = Query(20, ge=1, le=100)) -> list[dict[str, Any]]:
    stmt = select(RenderJob).order_by(RenderJob.created_at.desc()).limit(limit)
    if story_id:
        stmt = stmt.where(RenderJob.story_id == story_id)
    return [job_out(j) for j in db.scalars(stmt)]


@router.get("/render-jobs/{job_id}")
def get_job(job_id: uuid.UUID, db: Db, _: AnyUser) -> dict[str, Any]:
    job = db.get(RenderJob, job_id)
    if job is None:
        raise not_found("Render job", job_id)
    return job_out(job)


@router.post("/render-jobs/{job_id}/cancel", summary="Stop a job; scenes that already finished are kept")
def cancel_job(job_id: uuid.UUID, ctx: Ctx, db: Db, user: Producer) -> dict[str, Any]:
    job = db.get(RenderJob, job_id)
    if job is None:
        raise not_found("Render job", job_id)
    if job.status not in ("queued", "running"):
        raise ApiError(409, "not_cancellable", f"This job is already {job.status}")
    job.cancel_requested = True
    if job.status == "queued":
        job.status = "cancelled"
    audit.record(db, user.id, "render.cancel_requested", "render_job", job.id)
    db.commit()
    ctx.services["jobs"].cancel(job.id)
    return job_out(job)


@router.post("/render-jobs/{job_id}/resume", status_code=202, summary="Run a failed, cancelled or interrupted job again; finished scenes are reused")
def resume_job(job_id: uuid.UUID, ctx: Ctx, db: Db, user: Producer) -> dict[str, Any]:
    job = db.get(RenderJob, job_id)
    if job is None:
        raise not_found("Render job", job_id)
    if job.status not in ("failed", "cancelled", "interrupted"):
        raise ApiError(409, "not_resumable", f"A {job.status} job cannot be resumed")
    job.status, job.cancel_requested, job.error_message, job.completed_at = "queued", False, None, None
    audit.record(db, user.id, "render.resumed", "render_job", job.id)
    db.commit()
    ctx.services["jobs"].submit(job.id)
    return job_out(job)


@router.post("/stories/{story_id}/quality-check", summary="Automatic technical checks, and what still needs human approval")
def quality_check(story_id: uuid.UUID, ctx: Ctx, db: Db, _: AnyUser) -> dict[str, Any]:
    return ProductionService(db, hub(ctx)).quality_check(story_id)


@router.get("/stories/{story_id}/exports", summary="Finished videos of this story")
def exports(story_id: uuid.UUID, ctx: Ctx, db: Db, _: AnyUser) -> list[dict[str, Any]]:
    return [{**output_out(o), "story_version": o.job.story_version, "download_url": f"/api/v1/media/outputs/{o.id}?download=1"}
            for o in ProductionService(db, hub(ctx)).exports(story_id)]


@router.post("/stories/{story_id}/publish", summary="Mark a final render as published (needs clean QC and approvals)")
def publish(story_id: uuid.UUID, body: PublishIn, ctx: Ctx, db: Db, user: ProducerOrReviewer) -> dict[str, Any]:
    return output_out(ProductionService(db, hub(ctx)).publish(story_id, body.output_id, user, body.override_approvals))
