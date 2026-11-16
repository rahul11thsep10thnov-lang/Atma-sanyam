"""Phase 9 acceptance: the rendering pipeline. Every assertion here is about real files made by Blender and FFmpeg."""
from __future__ import annotations

import threading
import time

import pytest

from engine.audio.providers import ToneProvider
from engine.audio.speech import AudioCache, DialogueService, NarrationService, produce_speech
from engine.audio.timing import retime_story
from engine.audio.voices import VoiceRegistry
from engine.quality_control.checks import QualityControl
from engine.rendering import ffmpeg
from engine.rendering.service import RenderService, RenderSettings
from tests.support import scene, shot, story

pytestmark = pytest.mark.render


def _line(lid, speaker, text):
    return {"line_id": lid, "speaker": speaker, "text": text}


def _two_scenes(story_id="phase09", **output):
    a = scene("scene_a", [shot("a1", 2.0, dialogue=[_line("a_l1", "narrator", "नदी किनारे एक बंदर रहता था।")],
                               camera={"preset": "slow_push_in"})], transition_in={"type": "fade", "duration_seconds": 0.25})
    b = scene("scene_b", [shot("b1", 2.0, dialogue=[_line("b_l1", "crocodile_001", "नमस्ते, मित्र!")],
                               actions=[{"action_id": "w", "character_id": "monkey_001", "animation": "wave", "start_seconds": 0.2}],
                               camera={"preset": "character_closeup", "target": "crocodile_001"})],
              environment="forest_river_001", transition_out={"type": "fade", "duration_seconds": 0.25})
    return story([a, b], story_id=story_id, audio={"narrator_voice": "narrator_hi", "music": {"track_id": "gentle_story_001"}}, **output)


@pytest.fixture(scope="module")
def voiced(library, tmp_path_factory):
    narration = NarrationService(ToneProvider(), VoiceRegistry(library.root / "voices"), AudioCache(tmp_path_factory.mktemp("p9") / "cache"))
    dialogue = DialogueService(narration, library)
    st = _two_scenes()
    speech = produce_speech(st, dialogue)
    st, _ = retime_story(st, speech.durations())
    return st, speech, dialogue


@pytest.fixture(scope="module")
def rendered(render_service, voiced):
    st, speech, _ = voiced
    return render_service.render_story(st, RenderSettings.preview(st), speech)


def test_1_2_render_one_and_several_scenes(render_service, voiced, rendered):
    st, speech, _ = voiced
    assert set(rendered.scenes) == {"scene_a", "scene_b"} and not rendered.failed()
    for sid, result in rendered.scenes.items():
        assert result.status == "rendered" and result.path.is_file() and result.attempts == 1
        info = ffmpeg.probe(result.path)
        assert info.frames == result.frames == round(st.scene(sid).total_duration * 24) and not info.has_audio
        assert result.path.with_suffix(".json").is_file()
    single = render_service.render_scene(st, "scene_a", RenderSettings.preview(st), speech)
    assert single.status == "cached" and single.path == rendered.scenes["scene_a"].path


def test_3_4_scenes_are_assembled_with_synchronised_audio(voiced, rendered, artifacts):
    st, _, _ = voiced
    assert rendered.ok and rendered.final.is_file() and rendered.validation == []
    info = ffmpeg.probe(rendered.final)
    assert info.has_video and info.has_audio and info.video_codec == "h264" and info.audio_codec == "aac"
    assert info.frames == sum(r.frames for r in rendered.scenes.values())
    assert info.video_duration == pytest.approx(st.total_duration, abs=0.05)
    assert info.audio_duration == pytest.approx(info.video_duration, abs=0.1)        # sound and picture end together
    levels = ffmpeg.audio_levels(rendered.final)
    assert -40 < levels["mean_volume"] < -8 and levels["max_volume"] < -0.1
    (artifacts / "phase09_two_scenes_preview.mp4").write_bytes(rendered.final.read_bytes())


def test_5_to_8_export_1080p_with_correct_frame_rate_and_durations(render_service, library, voiced, tmp_path, artifacts):
    _, _, dialogue = voiced
    one = story([scene("hd", [shot("h1", 1.0, dialogue=[_line("hd_l1", "narrator", "शुभ प्रभात।")])])], story_id="phase09_hd",
                audio={"narrator_voice": "narrator_hi"})
    speech = produce_speech(one, dialogue)
    one, _ = retime_story(one, speech.durations())
    settings = RenderSettings.final(one)
    assert (settings.width, settings.height, settings.fps) == (1920, 1080, 24)
    result = render_service.render_story(one, settings, speech)
    assert result.ok, (result.error, result.validation)
    info = ffmpeg.probe(result.final)
    assert (info.width, info.height) == (1920, 1080)                                  # 5: 1080p MP4
    assert info.fps == pytest.approx(24.0)                                            # 6: frame rate
    assert info.video_duration == pytest.approx(one.total_duration, abs=0.05)         # 7: video duration
    assert info.audio_duration == pytest.approx(one.total_duration, abs=0.1)          # 8: audio duration
    report = QualityControl(library).check_video(one, result.final, settings, result.duration, result.audio)
    assert report.passed, [i.to_dict() for i in report.automatic]
    assert {"resolution", "frame_rate", "duration", "black_frames", "audio_clipping", "video_corruption"} <= set(report.checks_run)
    exported = render_service.export_video(result.final, tmp_path / "export" / "phase09_hd.mp4")
    assert exported.stat().st_size == result.final.stat().st_size
    (artifacts / "phase09_1080p.mp4").write_bytes(result.final.read_bytes())


def test_9_corrupted_output_is_detected(rendered, voiced, tmp_path, library):
    st, _, _ = voiced
    settings = RenderSettings.preview(st)
    good = rendered.final.read_bytes()
    truncated = tmp_path / "truncated.mp4"
    truncated.write_bytes(good[: len(good) // 3])
    garbage = tmp_path / "garbage.mp4"
    garbage.write_bytes(b"this is not a video " * 500)
    damaged = bytearray(good)
    for i in range(len(damaged) // 2, len(damaged) // 2 + 20000):
        damaged[i] = 0x55
    scrambled = tmp_path / "scrambled.mp4"
    scrambled.write_bytes(bytes(damaged))
    for path in (truncated, garbage, scrambled, tmp_path / "absent.mp4"):
        issues = RenderService.validate_video(path, settings, st.total_duration)
        assert any(i["severity"] == "error" for i in issues), path.name
        assert not QualityControl(library).check_video(st, path, settings, st.total_duration).passed
    wrong = RenderService.validate_video(rendered.final, RenderSettings.final(st), st.total_duration + 3)
    assert {"wrong_resolution", "wrong_duration", "wrong_frame_count"} <= {i["code"] for i in wrong}


def test_10_recover_from_a_failed_scene(library, engine_paths, voiced, tmp_path):
    """Scene b's renderer is broken on purpose. Scene a must survive, and b must render once the fault is gone."""
    _, speech, dialogue = voiced
    st = _two_scenes("phase09_recovery")
    speech = produce_speech(st, dialogue)
    st, _ = retime_story(st, speech.durations())
    settings = RenderSettings.preview(st)
    healthy = RenderService(library, engine_paths, timeout=600, retries=1)
    first = healthy.render_scene(st, "scene_a", settings, speech)
    assert first.status == "rendered"

    broken_python = tmp_path / "broken_python.sh"
    broken_python.write_text("#!/bin/sh\necho 'Segmentation fault (simulated)' >&2\nexit 139\n")
    broken_python.chmod(0o755)
    broken = RenderService(library, engine_paths, timeout=600, retries=1, python=str(broken_python))
    result = broken.render_story(st, settings, speech)
    assert result.scenes["scene_a"].status == "cached"                                 # the completed scene was kept and reused
    assert result.scenes["scene_b"].status == "failed" and result.scenes["scene_b"].attempts == 2     # retried, then reported
    assert "exited with status 139" in result.scenes["scene_b"].error
    assert result.final is None and "scene_b" in result.error
    assert first.path.is_file() and first.path.read_bytes()[:4] != b""

    again = healthy.render_story(st, settings, speech)
    assert again.scenes["scene_a"].status == "cached" and again.scenes["scene_b"].status == "rendered"
    assert again.ok and ffmpeg.probe(again.final).frames == round(st.total_duration * 24)


def test_cancellation_keeps_finished_frames_and_resumes(library, engine_paths, voiced):
    _, _, dialogue = voiced
    long = story([scene("long", [shot("l1", 8.0, camera={"preset": "horizontal_pan"})])], story_id="phase09_cancel")
    settings = RenderSettings.preview(long, workers=1)
    service = RenderService(library, engine_paths, timeout=600)
    cancel = threading.Event()
    seen = {"frames": 0.0}

    def progress(scene_id, fraction, phase):
        seen["frames"] = fraction
        if fraction > 0.2:
            cancel.set()

    result = service.render_scene(long, "long", settings, None, progress, cancel)
    assert result.status == "cancelled"
    work = service.work_dir(long.story_id, "long", result.key)
    kept = sorted(work.glob("frames/frame_[0-9]*.png"))
    assert 20 < len(kept) < 192 and not service.scene_path(long.story_id, "long", result.key).exists()
    stamp = {p.name: p.stat().st_mtime_ns for p in kept if not p.name.endswith(".tmp.png")}
    time.sleep(0.05)
    resumed = service.render_scene(long, "long", settings)
    assert resumed.status == "rendered" and ffmpeg.probe(resumed.path).frames == 192
    assert not work.exists()                                                           # temporary files go only after success


def test_11_only_the_changed_scene_is_rendered_again(render_service, voiced, rendered):
    st, speech, _ = voiced
    edited = st.model_copy(deep=True)
    edited.scene("scene_b").shots[0].camera.preset = "establishing_wide"
    edited.scene("scene_b").shots[0].camera.target = None
    again = render_service.render_story(edited, RenderSettings.preview(edited), speech)
    assert again.scenes["scene_a"].status == "cached" and again.scenes["scene_a"].path == rendered.scenes["scene_a"].path
    assert again.scenes["scene_b"].status == "rendered" and again.scenes["scene_b"].key != rendered.scenes["scene_b"].key
    assert again.ok and again.final != rendered.final
    # rendering just the changed scene still assembles the whole story from what is already there
    only = render_service.render_story(edited, RenderSettings.preview(edited), speech, scene_ids=["scene_b"])
    assert only.ok and set(only.scenes) == {"scene_a", "scene_b"} and all(r.status == "cached" for r in only.scenes.values())
    unchanged = render_service.render_story(st, RenderSettings.preview(st), speech)
    assert all(r.status == "cached" for r in unchanged.scenes.values())               # the earlier version is still there too
