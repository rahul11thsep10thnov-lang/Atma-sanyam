import shutil
from pathlib import Path

from fastapi import APIRouter, Depends, File, Form, UploadFile
from fastapi.responses import RedirectResponse
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_app_settings, get_current_user, get_db, get_storage
from app.core.config import Settings
from app.core.errors import AppError
from app.models.lesson import Example, Lesson, LessonAnalysis, TeachingPlan
from app.models.user import User
from app.models.video import QualityReport, VideoAsset
from app.models.voice import VoiceProfile
from app.services import pipeline
from app.services.extraction.base import ExtractionQualityError
from app.services.extraction.factory import get_extractor
from app.services.storage.base import StorageService

router = APIRouter(prefix="/lessons", tags=["lessons"])

_ALLOWED_SOURCE_TYPES = {"txt", "pdf", "docx"}


def _owned_lesson(db: Session, owner_id: str, lesson_id: str) -> Lesson:
    lesson = db.execute(
        select(Lesson).where(Lesson.id == lesson_id, Lesson.owner_id == owner_id)
    ).scalar_one_or_none()
    if lesson is None:
        raise AppError("LESSON_NOT_FOUND", "Lesson not found.", status_code=404)
    return lesson


@router.post("/upload")
def upload_lesson(
    file: UploadFile = File(...),
    title: str = Form(""),
    subject: str = Form(""),
    education_level: str = Form(""),
    language: str = Form("en"),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    storage: StorageService = Depends(get_storage),
):
    ext = Path(file.filename or "").suffix.lower().lstrip(".")
    if ext not in _ALLOWED_SOURCE_TYPES:
        raise AppError(
            "UNSUPPORTED_FILE_TYPE",
            f"Unsupported file type '.{ext}'. Supported: {sorted(_ALLOWED_SOURCE_TYPES)}.",
        )

    dest_path = storage.build_path("uploads", f"{user.id}_{file.filename}")
    with open(dest_path, "wb") as f:
        shutil.copyfileobj(file.file, f)

    try:
        result = get_extractor(ext).extract(dest_path)
    except ExtractionQualityError as exc:
        raise AppError("EXTRACTION_QUALITY_LOW", str(exc)) from exc

    lesson = Lesson(
        owner_id=user.id,
        title=title,
        source_filename=file.filename or "",
        source_type=ext,
        source_text=result.text,
        source_file_asset_id=dest_path,
        subject=subject,
        education_level=education_level,
        language=language,
        status="UPLOADED",
    )
    db.add(lesson)
    db.commit()
    db.refresh(lesson)
    return {"id": lesson.id, "status": lesson.status, "warnings": result.warnings or []}


@router.post("")
def create_lesson_from_text(
    payload: dict,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    text = payload.get("source_text", "")
    if not text.strip():
        raise AppError("EMPTY_SOURCE_TEXT", "source_text must not be empty.")
    lesson = Lesson(
        owner_id=user.id,
        title=payload.get("title", ""),
        source_type="text",
        source_text=text,
        subject=payload.get("subject", ""),
        education_level=payload.get("education_level", ""),
        language=payload.get("language", "en"),
        status="UPLOADED",
    )
    db.add(lesson)
    db.commit()
    db.refresh(lesson)
    return {"id": lesson.id, "status": lesson.status}


@router.get("")
def list_lessons(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    lessons = db.execute(select(Lesson).where(Lesson.owner_id == user.id)).scalars().all()
    return [
        {"id": l.id, "title": l.title, "status": l.status, "subject": l.subject, "created_at": l.created_at}
        for l in lessons
    ]


@router.get("/{lesson_id}")
def get_lesson(lesson_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    lesson = _owned_lesson(db, user.id, lesson_id)
    analysis = db.execute(
        select(LessonAnalysis).where(LessonAnalysis.lesson_id == lesson.id).order_by(LessonAnalysis.version.desc())
    ).scalars().first()
    example = db.execute(
        select(Example).where(Example.lesson_id == lesson.id).order_by(Example.version.desc())
    ).scalars().first()
    plan = db.execute(
        select(TeachingPlan).where(TeachingPlan.lesson_id == lesson.id).order_by(TeachingPlan.version.desc())
    ).scalars().first()
    videos = db.execute(select(VideoAsset).where(VideoAsset.lesson_id == lesson.id)).scalars().all()
    return {
        "id": lesson.id,
        "title": lesson.title,
        "status": lesson.status,
        "source_text": lesson.source_text,
        "language": lesson.language,
        "subject": lesson.subject,
        "analysis": analysis.analysis_json if analysis else None,
        "example": {
            "generated": example.generated_example,
            "verified": example.verified,
        }
        if example
        else None,
        "teaching_plan": plan.plan_json if plan else None,
        "videos": [{"id": v.id, "kind": v.kind, "video_path": v.video_path} for v in videos],
    }


@router.post("/{lesson_id}/analyze")
def analyze_lesson(
    lesson_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_app_settings),
):
    lesson = _owned_lesson(db, user.id, lesson_id)
    analysis = pipeline.run_analysis(db, settings, lesson)
    return {"lesson_id": lesson.id, "analysis": analysis.analysis_json, "status": lesson.status}


@router.post("/{lesson_id}/transform")
def transform_lesson(
    lesson_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_app_settings),
):
    lesson = _owned_lesson(db, user.id, lesson_id)
    analysis = db.execute(
        select(LessonAnalysis).where(LessonAnalysis.lesson_id == lesson.id).order_by(LessonAnalysis.version.desc())
    ).scalars().first()
    if analysis is None:
        raise AppError("ANALYSIS_REQUIRED", "Run /analyze before /transform.", status_code=409)
    example = pipeline.run_transform(db, settings, lesson, analysis)
    return {"lesson_id": lesson.id, "example": example.generated_example, "verified": example.verified}


@router.post("/{lesson_id}/generate-script")
def generate_script(
    lesson_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_app_settings),
):
    lesson = _owned_lesson(db, user.id, lesson_id)
    analysis = db.execute(
        select(LessonAnalysis).where(LessonAnalysis.lesson_id == lesson.id).order_by(LessonAnalysis.version.desc())
    ).scalars().first()
    example = db.execute(
        select(Example).where(Example.lesson_id == lesson.id).order_by(Example.version.desc())
    ).scalars().first()
    if analysis is None or example is None:
        raise AppError("PREREQUISITES_MISSING", "Run /analyze and /transform before /generate-script.", status_code=409)
    plan = pipeline.run_generate_script(db, settings, lesson, analysis, example)
    return {"lesson_id": lesson.id, "teaching_plan": plan.plan_json}


@router.post("/{lesson_id}/generate-audio")
def generate_audio(
    lesson_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_app_settings),
    storage: StorageService = Depends(get_storage),
):
    lesson = _owned_lesson(db, user.id, lesson_id)
    plan = db.execute(
        select(TeachingPlan).where(TeachingPlan.lesson_id == lesson.id).order_by(TeachingPlan.version.desc())
    ).scalars().first()
    if plan is None:
        raise AppError("SCRIPT_REQUIRED", "Run /generate-script before /generate-audio.", status_code=409)
    voice_profile = db.execute(select(VoiceProfile).where(VoiceProfile.owner_id == user.id)).scalars().first()
    if voice_profile is None:
        raise AppError("VOICE_NOT_CONFIGURED", "No voice profile configured. Visit Settings -> Voice.", status_code=409)
    audio_paths = pipeline.run_generate_audio(db, settings, storage, lesson, plan, voice_profile)
    return {"lesson_id": lesson.id, "audio_paths": audio_paths}


def _latest_plan_and_audio(db: Session, storage: StorageService, lesson: Lesson):
    plan = db.execute(
        select(TeachingPlan).where(TeachingPlan.lesson_id == lesson.id).order_by(TeachingPlan.version.desc())
    ).scalars().first()
    if plan is None:
        raise AppError("SCRIPT_REQUIRED", "Run /generate-script before rendering.", status_code=409)
    from app.models.voice import AudioAsset

    audio_paths: dict[str, str] = {}
    audio_durations: dict[str, int] = {}
    for scene in sorted(plan.scenes, key=lambda s: s.order_index):
        asset = db.execute(
            select(AudioAsset)
            .where(AudioAsset.scene_id == scene.id)
            .order_by(AudioAsset.created_at.desc())
        ).scalars().first()
        if asset is not None:
            audio_paths[scene.scene_key] = asset.audio_path
            audio_durations[scene.scene_key] = asset.duration_ms
    return plan, audio_paths, audio_durations


@router.post("/{lesson_id}/preview")
def render_preview(
    lesson_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_app_settings),
    storage: StorageService = Depends(get_storage),
):
    lesson = _owned_lesson(db, user.id, lesson_id)
    plan, audio_paths, audio_durations = _latest_plan_and_audio(db, storage, lesson)
    video_asset, job = pipeline.run_render(
        db, settings, storage, lesson, plan, audio_paths, audio_durations, kind="preview"
    )
    return {"video_asset_id": video_asset.id, "job_status": job.status}


@router.post("/{lesson_id}/render")
def render_final(
    lesson_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_app_settings),
    storage: StorageService = Depends(get_storage),
):
    lesson = _owned_lesson(db, user.id, lesson_id)
    plan, audio_paths, audio_durations = _latest_plan_and_audio(db, storage, lesson)
    video_asset, job = pipeline.run_render(
        db, settings, storage, lesson, plan, audio_paths, audio_durations, kind="final"
    )
    return {"video_asset_id": video_asset.id, "job_status": job.status}


@router.post("/{lesson_id}/quality-check")
def quality_check(
    lesson_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    storage: StorageService = Depends(get_storage),
):
    lesson = _owned_lesson(db, user.id, lesson_id)
    plan, _audio_paths, audio_durations = _latest_plan_and_audio(db, storage, lesson)
    video_asset = db.execute(
        select(VideoAsset).where(VideoAsset.lesson_id == lesson.id).order_by(VideoAsset.created_at.desc())
    ).scalars().first()
    if video_asset is None:
        raise AppError("RENDER_REQUIRED", "Run /render before /quality-check.", status_code=409)
    report = pipeline.run_quality_check(db, lesson, plan, video_asset, audio_durations)
    return {"status": report.status, "issues": report.issues}


@router.post("/{lesson_id}/approve")
def approve_lesson(lesson_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    lesson = _owned_lesson(db, user.id, lesson_id)
    lesson.status = "COMPLETED"
    db.commit()
    return {"id": lesson.id, "status": lesson.status}


@router.get("/{lesson_id}/video")
def get_lesson_video(lesson_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    lesson = _owned_lesson(db, user.id, lesson_id)
    video = db.execute(
        select(VideoAsset)
        .where(VideoAsset.lesson_id == lesson.id, VideoAsset.kind == "final")
        .order_by(VideoAsset.created_at.desc())
    ).scalars().first()
    if video is None:
        raise AppError("VIDEO_NOT_FOUND", "No final video has been rendered for this lesson.", status_code=404)
    return RedirectResponse(url=f"/api/assets/{video.id}/download?type=video")
