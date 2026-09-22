"""Central prompt template engine (build spec section 38). No giant prompt
string is inlined anywhere else in the backend — every AI-facing service
calls PromptService.render(template_name, **context).

Templates are versioned so a lesson's stored `prompt_version` lets you
reproduce (or knowingly diverge from) exactly what generated it, even after
prompts improve.
"""
from dataclasses import dataclass

PROMPT_VERSION = "1.0.0"

_TEMPLATES: dict[str, str] = {
    "lesson_analysis": (
        "You are analyzing teaching material to produce structured "
        "lesson_analysis JSON. Subject: {subject}. Education level: {level}. "
        "Language: {language}.\n\nSource material:\n{source_material}\n\n"
        "Identify: topic, subtopics, learning objectives, definitions, "
        "concepts/formulas, facts, original examples with their numeric "
        "variables, prerequisite concepts, likely visual elements, and a "
        "teaching sequence. Return ONLY structured data, no prose."
    ),
    "example_transformation": (
        "You are rewriting a single teaching example so it uses different "
        "context/names/numbers while preserving the same underlying concept "
        "and the same difficulty level. Preserve difficulty: {preserve_difficulty}. "
        "Change numbers: {change_numbers}. Change context: {change_context}.\n\n"
        "Original example: {original_example}\nConcept/formula it teaches: "
        "{formula}\n\nPropose a new example with its own variables, the "
        "formula applied, step-by-step calculation, and the expected numeric "
        "result. Do not just substitute random numbers — the numbers must "
        "produce a clean, verifiable result appropriate to {level}."
    ),
    "teaching_script": (
        "You are writing a natural-sounding whiteboard teacher's script as "
        "teaching_script JSON (scenes with narration + board_actions), for "
        "style preset {teaching_style}, language {language}, target duration "
        "~{target_duration_seconds}s.\n\nLesson analysis: {analysis}\nVerified "
        "example: {example}\n\nSome sentences should be spoken without "
        "writing; some should be written while spoken. Use natural teaching "
        "transitions sparingly. Let the AI decide where pauses belong. Do not "
        "produce robotic, bullet-by-bullet narration."
    ),
    "whiteboard_actions": (
        "Given this scene narration: {narration}\nProduce board_actions "
        "(write/write_formula/diagram/arrow/circle/underline/highlight/erase/"
        "camera_zoom/camera_pan) with normalized 0-1 positions that "
        "visually match what a teacher would put on a whiteboard while "
        "saying this sentence."
    ),
    "quality_check": (
        "Review this rendered lesson's scene/timing/asset data for the "
        "quality issues listed in the schema (missing narration, missing "
        "audio, timing problems, overflow, invalid calculations, etc). "
        "Lesson data: {lesson_data}"
    ),
}


@dataclass
class RenderedPrompt:
    system_prompt: str
    user_prompt: str
    schema_hint: str
    template_name: str
    version: str = PROMPT_VERSION


class PromptService:
    SYSTEM_PROMPT = (
        "You are the content-generation engine of an educational whiteboard "
        "video studio. You always respond with structured JSON only, you "
        "never fabricate calculations, and you always preserve the "
        "underlying teaching concept of the source material while producing "
        "independently worded explanations and new examples."
    )

    def render(self, template_name: str, schema_hint: str = "{}", **context: object) -> RenderedPrompt:
        template = _TEMPLATES.get(template_name)
        if template is None:
            raise KeyError(f"Unknown prompt template '{template_name}'")
        user_prompt = template.format(**{**_DEFAULTS, **context})
        return RenderedPrompt(
            system_prompt=self.SYSTEM_PROMPT,
            user_prompt=user_prompt,
            schema_hint=schema_hint,
            template_name=template_name,
        )


_DEFAULTS = {
    "subject": "",
    "level": "general",
    "language": "en",
    "preserve_difficulty": True,
    "change_numbers": True,
    "change_context": True,
    "teaching_style": "CLASSROOM",
    "target_duration_seconds": 60,
    "formula": "",
}
