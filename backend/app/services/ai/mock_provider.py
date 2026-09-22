"""Deterministic mock LLM provider (build spec section 45). Returns
canned-but-structurally-valid JSON keyed off simple heuristics in the
prompt, so the whole pipeline can be exercised with MOCK_AI=true and no
network access. Deterministic means: the same input always produces the
same output, which matters for reproducible tests and for the render/script
hash caching described in build spec section 33.
"""
from app.services.ai.base import LLMProvider

DEMO_ANALYSIS = {
    "topic": "Average Speed",
    "subject": "Physics",
    "subtopics": ["Distance", "Time", "Rate"],
    "objectives": [
        "Understand average speed as a ratio of distance to time",
        "Apply the formula speed = distance / time to a real example",
    ],
    "definitions": {"Average speed": "Total distance travelled divided by total time taken"},
    "concepts": [{"name": "Average speed", "formula": "speed = distance / time", "description": ""}],
    "facts": [],
    "examples": [
        {
            "statement": "A train travels 240 km in 4 hours.",
            "variables": {"distance_km": 240, "time_hours": 4},
            "expected_result": 60,
        }
    ],
    "prerequisite_concepts": ["Division", "Units of distance and time"],
    "visual_elements": ["formula box", "worked calculation", "circled answer"],
    "teaching_sequence": ["Define speed", "Introduce formula", "Work an example", "State the answer"],
}


class MockLLMProvider(LLMProvider):
    def complete_json(self, *, system_prompt: str, user_prompt: str, schema_hint: str) -> dict:
        # Dispatch on the USER prompt only (not system_prompt, which is
        # shared boilerplate and could accidentally contain a marker
        # substring) using phrases unique to each template in
        # prompt_service.py's _TEMPLATES.
        combined = user_prompt.lower()
        if "lesson_analysis json" in combined:
            return dict(DEMO_ANALYSIS)
        if "propose a new example" in combined:
            return {
                "statement": "A cyclist travels 45 km in 3 hours.",
                "variables": {"distance_km": 45, "time_hours": 3},
                "formula": "speed = distance / time",
                "calculation_steps": [{"expression": "45 / 3", "result": 15.0}],
                "expected_result": 15.0,
                "unit": "km/h",
            }
        if "teaching_script json" in combined or "produce board_actions" in combined:
            return _demo_teaching_plan()
        if "review this rendered lesson" in combined:
            return {"status": "PASS", "issues": []}
        return {}


def _demo_teaching_plan() -> dict:
    return {
        "lesson_title": "Average Speed",
        "estimated_duration_seconds": 45,
        "learning_objectives": [
            "Understand average speed",
            "Apply distance / time to a new example",
        ],
        "language": "en",
        "video_format": "1920x1080",
        "fps": 30,
        "scenes": [
            {
                "scene_id": "scene_001",
                "type": "SPEAK_ONLY",
                "narration": "Let's understand average speed with a simple example.",
                "board_actions": [],
                "pause_before_ms": 0,
                "pause_after_ms": 500,
                "emphasis": [],
            },
            {
                "scene_id": "scene_002",
                "type": "WRITE_AND_SPEAK",
                "narration": "Suppose a cyclist travels 45 kilometres in 3 hours.",
                "board_actions": [
                    {
                        "action": "write",
                        "content": "45 km in 3 hours",
                        "position": {"x": 0.1, "y": 0.15},
                        "style": {"color": "#1a1a1a", "font_size": 40},
                        "duration_ms": 1600,
                    }
                ],
                "pause_before_ms": 200,
                "pause_after_ms": 400,
                "emphasis": ["45 km", "3 hours"],
            },
            {
                "scene_id": "scene_003",
                "type": "FORMULA",
                "narration": "Speed is distance divided by time.",
                "board_actions": [
                    {
                        "action": "write_formula",
                        "content": "speed = distance / time",
                        "position": {"x": 0.1, "y": 0.35},
                        "style": {"color": "#1c4587", "font_size": 44, "bold": True},
                        "duration_ms": 1400,
                    }
                ],
                "pause_before_ms": 200,
                "pause_after_ms": 400,
                "emphasis": ["speed"],
            },
            {
                "scene_id": "scene_004",
                "type": "WRITE_AND_SPEAK",
                "narration": "Let's put our numbers in: 45 kilometres divided by 3 hours.",
                "board_actions": [
                    {
                        "action": "write_formula",
                        "content": "speed = 45 km / 3 hr",
                        "position": {"x": 0.1, "y": 0.5},
                        "style": {"color": "#1a1a1a", "font_size": 40},
                        "duration_ms": 1600,
                    }
                ],
                "pause_before_ms": 200,
                "pause_after_ms": 400,
                "emphasis": [],
            },
            {
                "scene_id": "scene_005",
                "type": "WRITE_AND_SPEAK",
                "narration": "So the average speed is 15 kilometres per hour.",
                "board_actions": [
                    {
                        "action": "write_formula",
                        "content": "speed = 15 km/h",
                        "position": {"x": 0.1, "y": 0.65},
                        "style": {"color": "#1a1a1a", "font_size": 44, "bold": True},
                        "duration_ms": 1400,
                    },
                    {
                        "action": "circle",
                        "content": "15 km/h",
                        "position": {"x": 0.1, "y": 0.65, "width": 0.32, "height": 0.09},
                        "style": {"color": "#c0392b", "stroke_width": 4},
                        "duration_ms": 900,
                        "target_action_id": None,
                    },
                ],
                "pause_before_ms": 300,
                "pause_after_ms": 700,
                "emphasis": ["15 km/h"],
            },
        ],
    }
