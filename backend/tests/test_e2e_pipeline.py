"""End-to-end pipeline test (build spec sections 51/52):

    SOURCE TEXT -> LESSON JSON -> MOCK AUDIO -> TIMING -> REMOTION -> MP4

Runs entirely in mock mode (no network access, no API keys) and invokes the
real Remotion CLI as a subprocess, so a passing run proves the whole chain
actually produces a playable MP4 — not just that the Python objects are
internally consistent.
"""
import shutil

import pytest

from app.core.config import get_settings
from app.models.lesson import Lesson, TeachingPlan
from app.models.voice import AudioAsset, VoiceProfile
from app.services import pipeline
from app.services.media.media_processing_service import MediaProcessingService
from app.services.storage.local_storage import LocalStorageService

SOURCE_TEXT = (
    "Average speed tells us how fast something travels on average over a "
    "journey. A train travels 240 km in 4 hours. To find the average speed, "
    "we divide the distance by the time: speed = distance / time."
)


@pytest.mark.skipif(shutil.which("npx") is None, reason="Node/npx not available in this environment")
def test_full_pipeline_produces_playable_mp4(db_session):
    settings = get_settings()
    storage = LocalStorageService(root=settings.storage_path)

    # ---- UPLOAD / EXTRACT (text path; file-based extraction is covered by
    # tests/test_extraction.py) ----
    lesson = Lesson(
        owner_id="e2e-test-owner",
        title="",
        source_type="text",
        source_text=SOURCE_TEXT,
        subject="Physics",
        education_level="general",
        language="en",
        status="UPLOADED",
    )
    db_session.add(lesson)
    db_session.commit()
    db_session.refresh(lesson)

    # ---- ANALYZE ----
    analysis = pipeline.run_analysis(db_session, settings, lesson)
    assert analysis.analysis_json["topic"]
    assert analysis.analysis_json["concepts"]

    # ---- TRANSFORM (generate + independently verify a new example) ----
    example = pipeline.run_transform(db_session, settings, lesson, analysis)
    assert example.verified is True
    assert example.generated_example["expected_result"] is not None

    # ---- GENERATE TEACHING PLAN (narration + whiteboard actions) ----
    teaching_plan = pipeline.run_generate_script(db_session, settings, lesson, analysis, example)
    assert len(teaching_plan.scenes) > 0
    assert lesson.status == "AWAITING_REVIEW"

    # ---- GENERATE AUDIO (mock voice, cached via AudioAsset) ----
    voice_profile = VoiceProfile(
        owner_id=lesson.owner_id,
        provider="mock",
        voice_id="mock-voice",
        model_id="mock-model",
    )
    db_session.add(voice_profile)
    db_session.commit()

    audio_paths = pipeline.run_generate_audio(
        db_session, settings, storage, lesson, teaching_plan, voice_profile
    )
    assert audio_paths, "expected at least one scene to have generated audio"
    for path in audio_paths.values():
        assert storage.exists(path)

    # Re-running audio generation must reuse cached AudioAsset rows rather
    # than regenerating (build spec section 18 / 33).
    audio_asset_count_before = db_session.query(AudioAsset).count()
    pipeline.run_generate_audio(db_session, settings, storage, lesson, teaching_plan, voice_profile)
    assert db_session.query(AudioAsset).count() == audio_asset_count_before

    audio_durations = {
        scene.scene_key: db_session.query(AudioAsset)
        .filter(AudioAsset.scene_id == scene.id)
        .order_by(AudioAsset.created_at.desc())
        .first()
        .duration_ms
        for scene in teaching_plan.scenes
        if scene.narration_text.strip()
    }

    # ---- TIMING (computed, not assumed-equal durations) ----
    timeline, plan_schema = pipeline.compute_timeline(teaching_plan, audio_durations)
    assert len(timeline) == len(teaching_plan.scenes)
    durations = {t.audio_duration_ms for t in timeline if t.audio_duration_ms > 0}
    assert len(durations) > 1, "expected scenes to have different actual audio durations"

    # ---- RENDER (real Remotion subprocess -> real MP4) ----
    video_asset, render_job = pipeline.run_render(
        db_session, settings, storage, lesson, teaching_plan, audio_paths, audio_durations, kind="final"
    )
    assert render_job.status == "COMPLETED"
    assert storage.exists(video_asset.video_path)
    assert video_asset.width == 1920
    assert video_asset.height == 1080

    media = MediaProcessingService()
    probed_duration_ms = media.probe_duration_ms(video_asset.video_path)
    assert probed_duration_ms > 5000, "rendered video should be several seconds long"

    assert storage.exists(video_asset.subtitle_srt_path)
    srt_content = open(video_asset.subtitle_srt_path).read()
    assert "-->" in srt_content

    # ---- QUALITY CHECK ----
    report = pipeline.run_quality_check(db_session, lesson, teaching_plan, video_asset, audio_durations)
    assert report.status in ("PASS", "WARNING")
    assert lesson.status == "COMPLETED"
