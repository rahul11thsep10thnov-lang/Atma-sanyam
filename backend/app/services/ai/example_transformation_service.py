"""Preserves the underlying educational concept while producing a
sufficiently different example (build spec section 10). The LLM proposes;
CalculationVerificationService independently verifies; on failure the
example is rejected and regeneration is attempted (bounded retries)."""
from app.schemas.analysis import Concept, OriginalExample
from app.schemas.example import GeneratedExample, VerificationResult
from app.services.ai.base import LLMProvider, LLMProviderError
from app.services.ai.calculation_verification_service import CalculationVerificationService
from app.services.ai.prompt_service import PromptService


class ExampleRejectedError(Exception):
    pass


class ExampleTransformationService:
    def __init__(
        self,
        provider: LLMProvider,
        prompts: PromptService | None = None,
        verifier: CalculationVerificationService | None = None,
    ) -> None:
        self._provider = provider
        self._prompts = prompts or PromptService()
        self._verifier = verifier or CalculationVerificationService()

    def transform(
        self,
        original: OriginalExample,
        concept: Concept,
        *,
        preserve_difficulty: bool = True,
        change_numbers: bool = True,
        change_context: bool = True,
        level: str = "general",
        max_attempts: int = 3,
    ) -> tuple[GeneratedExample, VerificationResult]:
        last_error = ""
        for _attempt in range(max_attempts):
            prompt = self._prompts.render(
                "example_transformation",
                schema_hint=str(GeneratedExample.model_json_schema()),
                original_example=original.statement,
                formula=concept.formula or "",
                preserve_difficulty=preserve_difficulty,
                change_numbers=change_numbers,
                change_context=change_context,
                level=level,
            )
            raw = self._provider.complete_json(
                system_prompt=prompt.system_prompt,
                user_prompt=prompt.user_prompt,
                schema_hint=prompt.schema_hint,
            )
            try:
                candidate = GeneratedExample.model_validate(raw)
            except Exception as exc:  # pydantic ValidationError
                last_error = f"Malformed example response: {exc}"
                continue

            result = self._verifier.verify(candidate)
            if result.verified:
                return candidate, result
            last_error = result.detail

        raise ExampleRejectedError(
            f"Could not produce a verified example after {max_attempts} attempts. "
            f"Last error: {last_error}"
        )
