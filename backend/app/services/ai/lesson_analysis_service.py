from app.schemas.analysis import LessonAnalysisResult
from app.services.ai.base import LLMProvider, LLMProviderError
from app.services.ai.prompt_service import PromptService


class LessonAnalysisService:
    def __init__(self, provider: LLMProvider, prompts: PromptService | None = None) -> None:
        self._provider = provider
        self._prompts = prompts or PromptService()

    def analyze(
        self, source_text: str, *, subject: str = "", level: str = "general", language: str = "en"
    ) -> LessonAnalysisResult:
        prompt = self._prompts.render(
            "lesson_analysis",
            schema_hint=str(LessonAnalysisResult.model_json_schema()),
            subject=subject,
            level=level,
            language=language,
            source_material=source_text,
        )
        raw = self._provider.complete_json(
            system_prompt=prompt.system_prompt,
            user_prompt=prompt.user_prompt,
            schema_hint=prompt.schema_hint,
        )
        try:
            return LessonAnalysisResult.model_validate(raw)
        except Exception as exc:  # pydantic ValidationError
            raise LLMProviderError(f"Lesson analysis response failed validation: {exc}") from exc
