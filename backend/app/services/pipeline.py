"""Pipeline orchestrator: one function per stage of build spec section 6,
each calling exactly one service and persisting its result. Used directly
by API route handlers (single-lesson, interactive use) and by Celery tasks
(`app/workers/tasks/*.py`) for batch/background use — both paths share this
one implementation so business logic is never duplicated.
"""
import hashlib
from pathlib import Path

from sqlalchemy.orm import Session

from app.core.config import Settings
from app.models.lesson import Example, Lesson, LessonAnalysis, Scene, TeachingPlan
from app.models.video import QualityReport, RenderJob, VideoAsset
from app.models.voice import VoiceProfile
from app.schemas.analysis import Concept, OriginalExample
from app.schemas.lesson import TeachingPlan as TeachingPlanSchema
from app.services.ai.example_transformation_service import ExampleTransformationService
from app.services.ai.lesson_analysis_service import LessonAnalysisService
from app.services.ai.prompt_service import PROMPT_VERSION
from app.services.ai.provider_factory import get_llm_provider
from app.services.ai.teaching_plan_service import TeachingPlanService
from app.services.media.media_processing_service import MediaProcessingService
from app.services.media.subtitle_service import SubtitleService
from app.services.quality.quality_control_service import QualityControlService
from app.services.render.render_service import RenderError, RenderService
from app.services.storage.base import StorageService
from app.services.timing.timing_service import TimingService
from app.services.voice.factory import get_voice_service
from app.services.voice.voice_manager import VoiceManager
from app.utils.hashing import sha256_json, sha256_text


def run_analysis(db: Session, settings: Settings, lesson: Lesson) -> LessonAnalysis:
    lesson.status = "ANALYZING"
    db.flush()

    provider = get_llm_provider(settings)
    result = LessonAnalysisService(provider).analyze(
        lesson.source_text, subject=lesson.subject, level=lesson.education_level, language=lesson.language
    )
    source_hash = sha256_text(lesson.source_text)
    analysis = LessonAnalysis(
        owner_id=lesson.owner_id,
        lesson_id=lesson.id,
        version=_next_version(db, LessonAnalysis, lesson.id),
        analysis_json=result.model_dump(),
        source_hash=source_hash,
        prompt_version=PROMPT_VERSION,
    )
    lesson.source_hash = source_hash
    lesson.subject = lesson.subject or result.subject
    lesson.title = lesson.title or result.topic
    lesson.status = "TRANSFORMING"
    db.add(analysis)
    db.commit()
    db.refresh(analysis)
    return analysis


def run_transform(db: Session, settings: Settings, lesson: Lesson, analysis: LessonAnalysis) -> Example:
    from app.schemas.analysis import LessonAnalysisResult

    analysis_result = LessonAnalysisResult.model_validate(analysis.analysis_json)
    if not analysis_result.examples or not analysis_result.concepts:
        raise ValueError("Lesson analysis has no example/concept to transform.")

    provider = get_llm_provider(settings)
    original = OriginalExample(**analysis_result.examples[0].model_dump())
    concept = Concept(**analysis_result.concepts[0].model_dump())

    generated, verification = ExampleTransformationService(provider).transform(
        original,
        concept,
        preserve_difficulty=lesson.preserve_difficulty,
        change_numbers=lesson.change_numbers,
        change_context=lesson.change_context,
        level=lesson.education_level or "general",
    )
    example = Example(
        owner_id=lesson.owner_id,
        lesson_id=lesson.id,
        version=_next_version(db, Example, lesson.id),
        original_example=original.model_dump(),
        generated_example=generated.model_dump(),
        verified=verification.verified,
        verification_detail=verification.model_dump(),
        prompt_version=PROMPT_VERSION,
    )
    db.add(example)
    db.commit()
    db.refresh(example)
    return example


def run_generate_script(
    db: Session, settings: Settings, lesson: Lesson, analysis: LessonAnalysis, example: Example
) -> TeachingPlan:
    from app.schemas.analysis import LessonAnalysisResult
    from app.schemas.example import GeneratedExample

    analysis_result = LessonAnalysisResult.model_validate(analysis.analysis_json)
    generated_example = GeneratedExample.model_validate(example.generated_example)

    provider = get_llm_provider(settings)
    plan = TeachingPlanService(provider).generate(
        analysis_result,
        generated_example,
        teaching_style=lesson.teaching_style,
        language=lesson.language,
    )
    script_hash = sha256_json(plan.model_dump())

    teaching_plan = TeachingPlan(
        owner_id=lesson.owner_id,
        lesson_id=lesson.id,
        version=_next_version(db, TeachingPlan, lesson.id),
        plan_json=plan.model_dump(),
        script_hash=script_hash,
        prompt_version=PROMPT_VERSION,
    )
    db.add(teaching_plan)
    db.flush()

    for i, scene in enumerate(plan.scenes):
        db.add(
            Scene(
                owner_id=lesson.owner_id,
                teaching_plan_id=teaching_plan.id,
                scene_key=scene.scene_id,
                order_index=i,
                scene_json=scene.model_dump(),
                narration_text=scene.narration,
                text_hash=sha256_text(scene.narration),
            )
        )
    lesson.status = "AWAITING_REVIEW"
    db.commit()
    db.refresh(teaching_plan)
    return teaching_plan


def run_generate_audio(
    db: Session,
    settings: Settings,
    storage: StorageService,
    lesson: Lesson,
    teaching_plan: TeachingPlan,
    voice_profile: VoiceProfile,
) -> dict[str, str]:
    lesson.status = "GENERATING_AUDIO"
    db.flush()

    voice_service = get_voice_service(settings)
    manager = VoiceManager(db, voice_service, storage)

    scenes = sorted(teaching_plan.scenes, key=lambda s: s.order_index)
    audio_paths: dict[str, str] = {}
    for scene in scenes:
        if not scene.narration_text.strip():
            continue
        asset = manager.generate_for_scene(
            owner_id=lesson.owner_id, scene_id=scene.id, text=scene.narration_text, profile=voice_profile
        )
        audio_paths[scene.scene_key] = asset.audio_path
    db.commit()
    return audio_paths


def compute_timeline(teaching_plan: TeachingPlan, audio_durations_ms: dict[str, int]):
    plan_schema = TeachingPlanSchema.model_validate(teaching_plan.plan_json)
    return TimingService().compute_timeline(plan_schema, audio_durations_ms), plan_schema


def run_render(
    db: Session,
    settings: Settings,
    storage: StorageService,
    lesson: Lesson,
    teaching_plan: TeachingPlan,
    audio_paths: dict[str, str],
    audio_durations_ms: dict[str, int],
    kind: str = "final",
) -> tuple[VideoAsset, RenderJob]:
    lesson.status = "RENDERING"
    db.flush()

    job = RenderJob(owner_id=lesson.owner_id, lesson_id=lesson.id, kind=kind, status="PROCESSING")
    db.add(job)
    db.flush()

    timeline, plan_schema = compute_timeline(teaching_plan, audio_durations_ms)

    render_hash = sha256_json({"plan": teaching_plan.plan_json, "audio": audio_paths, "kind": kind})

    render_service = RenderService(
        settings.renderer_path, settings.storage_path, concurrency=settings.remotion_concurrency
    )
    raw_output = storage.build_path("video", f"{lesson.id}_{kind}_{render_hash[:12]}_raw.mp4")
    props_path = storage.build_path("tmp", f"{lesson.id}_{kind}_props.json")

    try:
        render_service.render(plan_schema, audio_paths, timeline, raw_output, props_path)
    except RenderError as exc:
        job.status = "FAILED"
        job.error_message = str(exc)
        job.retry_count += 1
        lesson.status = "FAILED"
        db.commit()
        raise

    media = MediaProcessingService()
    final_output = storage.build_path("video", f"{lesson.id}_{kind}_{render_hash[:12]}.mp4")
    thumbnail_path = storage.build_path("thumbnails", f"{lesson.id}_{kind}_{render_hash[:12]}.jpg")

    Path(final_output).write_bytes(Path(raw_output).read_bytes())
    try:
        media.extract_thumbnail(final_output, thumbnail_path)
        video_duration_ms = media.probe_duration_ms(final_output)
    except Exception:
        video_duration_ms = TimingService().total_duration_ms(timeline)

    subtitles = SubtitleService()
    narrations = {s.scene_id: s.narration for s in plan_schema.scenes}
    srt_path = storage.build_path("video", f"{lesson.id}_{kind}_{render_hash[:12]}.srt")
    vtt_path = storage.build_path("video", f"{lesson.id}_{kind}_{render_hash[:12]}.vtt")
    Path(srt_path).write_text(subtitles.generate_srt(timeline, narrations))
    Path(vtt_path).write_text(subtitles.generate_vtt(timeline, narrations))

    video_asset = VideoAsset(
        owner_id=lesson.owner_id,
        lesson_id=lesson.id,
        kind=kind,
        version=_next_version(db, VideoAsset, lesson.id),
        video_path=final_output,
        thumbnail_path=thumbnail_path,
        subtitle_srt_path=srt_path,
        subtitle_vtt_path=vtt_path,
        duration_ms=video_duration_ms,
        width=int(plan_schema.video_format.split("x")[0]),
        height=int(plan_schema.video_format.split("x")[1]),
        fps=plan_schema.fps,
        render_hash=render_hash,
    )
    db.add(video_asset)
    job.status = "COMPLETED"
    job.progress = 100
    lesson.status = "QUALITY_CHECK"
    db.commit()
    db.refresh(video_asset)
    db.refresh(job)
    job.video_asset_id = video_asset.id
    db.commit()
    return video_asset, job


def run_quality_check(
    db: Session,
    lesson: Lesson,
    teaching_plan: TeachingPlan,
    video_asset: VideoAsset,
    audio_durations_ms: dict[str, int],
) -> QualityReport:
    timeline, plan_schema = compute_timeline(teaching_plan, audio_durations_ms)
    result = QualityControlService().check(plan_schema, timeline, video_duration_ms=video_asset.duration_ms)

    report = QualityReport(
        owner_id=lesson.owner_id,
        lesson_id=lesson.id,
        video_asset_id=video_asset.id,
        status=result.status,
        issues=[issue.model_dump() for issue in result.issues],
    )
    db.add(report)
    if result.status != "FAIL":
        lesson.status = "COMPLETED" if lesson.status != "AWAITING_REVIEW" else lesson.status
    db.commit()
    db.refresh(report)
    return report


def _next_version(db: Session, model, lesson_id: str) -> int:
    existing = db.query(model).filter(model.lesson_id == lesson_id).count()
    return existing + 1
