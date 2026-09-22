import pytest
from pydantic import ValidationError

from app.schemas.lesson import BoardAction, Scene, TeachingPlan


def test_valid_teaching_plan_parses():
    plan = TeachingPlan(
        lesson_title="Average Speed",
        scenes=[
            Scene(scene_id="scene_001", type="SPEAK_ONLY", narration="Let's begin."),
            Scene(
                scene_id="scene_002",
                type="WRITE_AND_SPEAK",
                narration="45 km in 3 hours",
                board_actions=[BoardAction(action="write", content="45 km")],
            ),
        ],
    )
    assert len(plan.scenes) == 2


def test_duplicate_scene_ids_rejected():
    with pytest.raises(ValidationError):
        TeachingPlan(
            lesson_title="x",
            scenes=[
                Scene(scene_id="scene_001", type="SPEAK_ONLY", narration="a"),
                Scene(scene_id="scene_001", type="SPEAK_ONLY", narration="b"),
            ],
        )


def test_empty_scenes_rejected():
    with pytest.raises(ValidationError):
        TeachingPlan(lesson_title="x", scenes=[])


def test_empty_scene_id_rejected():
    with pytest.raises(ValidationError):
        Scene(scene_id="  ", type="SPEAK_ONLY", narration="x")


def test_invalid_scene_type_rejected():
    with pytest.raises(ValidationError):
        Scene(scene_id="s1", type="NOT_A_TYPE", narration="x")


def test_board_action_position_bounds():
    with pytest.raises(ValidationError):
        BoardAction(action="write", content="x", position={"x": 1.5, "y": 0.1})


def test_malformed_json_never_reaches_renderer():
    """The renderer only ever receives TeachingPlan.model_dump() output from
    a validated instance — this asserts arbitrary malformed input is
    rejected before that point (build spec section 12)."""
    with pytest.raises(ValidationError):
        TeachingPlan.model_validate({"lesson_title": "x", "scenes": [{"scene_id": "s1"}]})
