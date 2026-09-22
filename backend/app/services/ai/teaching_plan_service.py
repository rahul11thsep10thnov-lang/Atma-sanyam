from app.schemas.analysis import LessonAnalysisResult
from app.schemas.example import GeneratedExample
from app.schemas.lesson import TeachingPlan
from app.services.ai.base import LLMProvider, LLMProviderError
from app.services.ai.prompt_service import PROMPT_VERSION, PromptService


class TeachingPlanService:
    """Generates narration + whiteboard board_actions together (build spec
    section 12/13/14) and validates the result against the strict
    TeachingPlan schema before it can reach the renderer."""

    def __init__(self, provider: LLMProvider, prompts: PromptService | None = None) -> None:
        self._provider = provider
        self._prompts = prompts or PromptService()

    def generate(
        self,
        analysis: LessonAnalysisResult,
        example: GeneratedExample,
        *,
        teaching_style: str = "CLASSROOM",
        language: str = "en",
        target_duration_seconds: int = 60,
    ) -> TeachingPlan:
        prompt = self._prompts.render(
            "teaching_script",
            schema_hint=str(TeachingPlan.model_json_schema()),
            analysis=analysis.model_dump(),
            example=example.model_dump(),
            teaching_style=teaching_style,
            language=language,
            target_duration_seconds=target_duration_seconds,
        )
        raw = self._provider.complete_json(
            system_prompt=prompt.system_prompt,
            user_prompt=prompt.user_prompt,
            schema_hint=prompt.schema_hint,
        )
        raw.setdefault("prompt_version", PROMPT_VERSION)
        raw.setdefault("language", language)
        try:
            return TeachingPlan.model_validate(raw)
        except Exception as exc:  # pydantic ValidationError
            raise LLMProviderError(f"Teaching plan response failed schema validation: {exc}") from exc
