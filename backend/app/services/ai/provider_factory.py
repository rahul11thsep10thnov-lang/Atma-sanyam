from app.core.config import Settings
from app.services.ai.anthropic_provider import AnthropicProvider
from app.services.ai.base import LLMProvider
from app.services.ai.mock_provider import MockLLMProvider


def get_llm_provider(settings: Settings) -> LLMProvider:
    if settings.mock_ai or settings.llm_provider == "mock":
        return MockLLMProvider()
    if settings.llm_provider == "anthropic":
        return AnthropicProvider(api_key=settings.llm_api_key, model=settings.llm_model)
    raise ValueError(f"Unknown LLM_PROVIDER '{settings.llm_provider}'")
