from app.schemas.lesson import Scene, TeachingPlan
from app.services.quality.quality_control_service import QualityControlService
from app.services.timing.timing_service import TimingService


def test_quality_pass_for_clean_plan():
    plan = TeachingPlan(lesson_title="x", scenes=[Scene(scene_id="s1", type="SPEAK_ONLY", narration="Hello there.")])
    timeline = TimingService().compute_timeline(plan, {"s1": 2000})
    report = QualityControlService().check(plan, timeline)
    assert report.status == "PASS"


def test_quality_fails_on_missing_narration():
    plan = TeachingPlan(lesson_title="x", scenes=[Scene(scene_id="s1", type="SPEAK_ONLY", narration="")])
    timeline = TimingService().compute_timeline(plan, {})
    report = QualityControlService().check(plan, timeline)
    assert report.status == "FAIL"
    assert any(i.type in ("MISSING_NARRATION", "EMPTY_SCENE") for i in report.issues)


def test_quality_warns_on_fast_narration():
    plan = TeachingPlan(
        lesson_title="x",
        scenes=[Scene(scene_id="s1", type="SPEAK_ONLY", narration=" ".join(["word"] * 40))],
    )
    # 40 words in 3 seconds = 800 wpm, far above natural speech.
    timeline = TimingService().compute_timeline(plan, {"s1": 3000})
    report = QualityControlService().check(plan, timeline)
    assert any(i.type == "FAST_NARRATION" for i in report.issues)


def test_quality_flags_render_failure():
    plan = TeachingPlan(lesson_title="x", scenes=[Scene(scene_id="s1", type="SPEAK_ONLY", narration="hi")])
    timeline = TimingService().compute_timeline(plan, {"s1": 1000})
    report = QualityControlService().check(plan, timeline, render_succeeded=False, render_error="boom")
    assert report.status == "FAIL"
    assert any(i.type == "RENDER_FAILURE" for i in report.issues)
