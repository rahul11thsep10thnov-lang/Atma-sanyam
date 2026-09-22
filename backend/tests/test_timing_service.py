from app.schemas.lesson import BoardAction, Scene, TeachingPlan
from app.services.timing.timing_service import TimingService


def test_timing_uses_actual_audio_duration_not_uniform_guess():
    plan = TeachingPlan(
        lesson_title="x",
        scenes=[
            Scene(scene_id="s1", type="SPEAK_ONLY", narration="short"),
            Scene(scene_id="s2", type="SPEAK_ONLY", narration="a much much longer sentence than the first one"),
        ],
    )
    durations = {"s1": 900, "s2": 6200}
    timeline = TimingService().compute_timeline(plan, durations)

    assert timeline[0].duration_ms >= 900
    assert timeline[1].duration_ms >= 6200
    # Scenes must not be forced to equal durations despite differing audio.
    assert timeline[0].duration_ms != timeline[1].duration_ms


def test_timing_respects_pauses():
    plan = TeachingPlan(
        lesson_title="x",
        scenes=[Scene(scene_id="s1", type="SPEAK_ONLY", narration="hi", pause_before_ms=500, pause_after_ms=700)],
    )
    timeline = TimingService().compute_timeline(plan, {"s1": 1000})
    assert timeline[0].start_ms == 500
    assert timeline[0].duration_ms == 1000 + 700


def test_timing_scene_at_least_as_long_as_board_actions():
    plan = TeachingPlan(
        lesson_title="x",
        scenes=[
            Scene(
                scene_id="s1",
                type="WRITE_ONLY",
                narration="",
                board_actions=[BoardAction(action="write", content="x", duration_ms=3000)],
            )
        ],
    )
    timeline = TimingService().compute_timeline(plan, {})
    assert timeline[0].duration_ms >= 3000


def test_scenes_are_sequential_non_overlapping():
    plan = TeachingPlan(
        lesson_title="x",
        scenes=[
            Scene(scene_id="s1", type="SPEAK_ONLY", narration="a"),
            Scene(scene_id="s2", type="SPEAK_ONLY", narration="b"),
            Scene(scene_id="s3", type="SPEAK_ONLY", narration="c"),
        ],
    )
    timeline = TimingService().compute_timeline(plan, {"s1": 1000, "s2": 1500, "s3": 800})
    for i in range(len(timeline) - 1):
        assert timeline[i + 1].start_ms >= timeline[i].start_ms + timeline[i].duration_ms
