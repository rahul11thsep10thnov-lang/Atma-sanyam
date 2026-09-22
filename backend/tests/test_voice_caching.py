from app.models.lesson import Lesson, Scene, TeachingPlan
from app.models.voice import AudioAsset, VoiceProfile
from app.services.storage.local_storage import LocalStorageService
from app.services.voice.mock_service import MockVoiceService
from app.services.voice.voice_manager import VoiceManager


def _make_scene(db_session, owner_id: str) -> Scene:
    lesson = Lesson(owner_id=owner_id, source_text="x", status="UPLOADED")
    db_session.add(lesson)
    db_session.flush()
    plan = TeachingPlan(owner_id=owner_id, lesson_id=lesson.id, plan_json={})
    db_session.add(plan)
    db_session.flush()
    scene = Scene(owner_id=owner_id, teaching_plan_id=plan.id, scene_key="scene_001", scene_json={})
    db_session.add(scene)
    db_session.commit()
    return scene


def test_voice_manager_generates_and_caches(db_session, tmp_path):
    storage = LocalStorageService(root=str(tmp_path))
    manager = VoiceManager(db_session, MockVoiceService(), storage)
    profile = VoiceProfile(owner_id="owner-1", voice_id="v1", model_id="m1")
    db_session.add(profile)
    db_session.flush()  # apply column defaults (stability/similarity/style/speed)
    scene = _make_scene(db_session, "owner-1")

    asset1 = manager.generate_for_scene(
        owner_id="owner-1", scene_id=scene.id, text="Hello world", profile=profile
    )
    count_after_first = db_session.query(AudioAsset).filter(AudioAsset.scene_id == scene.id).count()

    asset2 = manager.generate_for_scene(
        owner_id="owner-1", scene_id=scene.id, text="Hello world", profile=profile
    )
    count_after_second = db_session.query(AudioAsset).filter(AudioAsset.scene_id == scene.id).count()

    assert asset1.id == asset2.id
    assert count_after_first == count_after_second == 1


def test_voice_manager_regenerates_when_text_changes(db_session, tmp_path):
    storage = LocalStorageService(root=str(tmp_path))
    manager = VoiceManager(db_session, MockVoiceService(), storage)
    profile = VoiceProfile(owner_id="owner-2", voice_id="v1", model_id="m1")
    db_session.add(profile)
    db_session.flush()
    scene = _make_scene(db_session, "owner-2")

    manager.generate_for_scene(owner_id="owner-2", scene_id=scene.id, text="First version", profile=profile)
    manager.generate_for_scene(owner_id="owner-2", scene_id=scene.id, text="Second version", profile=profile)

    assert db_session.query(AudioAsset).filter(AudioAsset.scene_id == scene.id).count() == 2


def test_voice_manager_regenerates_when_voice_settings_change(db_session, tmp_path):
    storage = LocalStorageService(root=str(tmp_path))
    manager = VoiceManager(db_session, MockVoiceService(), storage)
    scene = _make_scene(db_session, "owner-3")

    profile_a = VoiceProfile(owner_id="owner-3", voice_id="v1", model_id="m1", stability=0.5)
    profile_b = VoiceProfile(owner_id="owner-3", voice_id="v1", model_id="m1", stability=0.9)
    db_session.add_all([profile_a, profile_b])
    db_session.flush()

    manager.generate_for_scene(owner_id="owner-3", scene_id=scene.id, text="Same text", profile=profile_a)
    manager.generate_for_scene(owner_id="owner-3", scene_id=scene.id, text="Same text", profile=profile_b)

    assert db_session.query(AudioAsset).filter(AudioAsset.scene_id == scene.id).count() == 2
