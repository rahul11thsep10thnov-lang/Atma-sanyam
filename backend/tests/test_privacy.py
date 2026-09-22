from app.models.lesson import Lesson, Scene, TeachingPlan
from app.models.voice import AudioAsset
from app.services.privacy.privacy_service import LessonNotFoundError, PrivacyService
from app.services.storage.local_storage import LocalStorageService


def test_delete_lesson_cascade_removes_audio_files_and_rows(db_session, tmp_path):
    storage = LocalStorageService(root=str(tmp_path))
    owner_id = "privacy-owner-1"

    lesson = Lesson(owner_id=owner_id, source_text="x", status="UPLOADED")
    db_session.add(lesson)
    db_session.flush()
    plan = TeachingPlan(owner_id=owner_id, lesson_id=lesson.id, plan_json={})
    db_session.add(plan)
    db_session.flush()
    scene = Scene(owner_id=owner_id, teaching_plan_id=plan.id, scene_key="s1", scene_json={})
    db_session.add(scene)
    db_session.flush()

    audio_path = storage.build_path("audio", "test.wav")
    with open(audio_path, "wb") as f:
        f.write(b"fake audio bytes")
    audio = AudioAsset(owner_id=owner_id, scene_id=scene.id, text_hash="h", audio_path=audio_path)
    db_session.add(audio)
    db_session.commit()

    assert storage.exists(audio_path)

    svc = PrivacyService(db_session, storage)
    counts = svc.delete_lesson_cascade(owner_id, lesson.id)

    assert counts["audio"] == 1
    assert not storage.exists(audio_path)
    assert db_session.query(Lesson).filter(Lesson.id == lesson.id).first() is None
    assert db_session.query(AudioAsset).filter(AudioAsset.id == audio.id).first() is None


def test_delete_lesson_requires_ownership(db_session, tmp_path):
    storage = LocalStorageService(root=str(tmp_path))
    lesson = Lesson(owner_id="real-owner", source_text="x", status="UPLOADED")
    db_session.add(lesson)
    db_session.commit()

    svc = PrivacyService(db_session, storage)
    try:
        svc.delete_lesson_cascade("someone-else", lesson.id)
        raised = False
    except LessonNotFoundError:
        raised = True
    assert raised

    # The lesson must still exist — an unauthorized caller cannot delete it.
    assert db_session.query(Lesson).filter(Lesson.id == lesson.id).first() is not None


def test_storage_breakdown_reflects_written_files(db_session, tmp_path):
    storage = LocalStorageService(root=str(tmp_path))
    audio_path = storage.build_path("audio", "a.wav")
    with open(audio_path, "wb") as f:
        f.write(b"x" * 1000)

    svc = PrivacyService(db_session, storage)
    breakdown = svc.storage_breakdown("any-owner")
    assert breakdown["audio_bytes"] >= 1000
    assert breakdown["total_bytes"] >= 1000
