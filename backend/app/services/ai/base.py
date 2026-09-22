"""LLM provider abstraction (build spec section: "LLM API through a
server-side abstraction layer"). Nothing outside this package ever calls an
LLM HTTP API directly."""
from abc import ABC, abstractmethod


class LLMProvider(ABC):
    @abstractmethod
    def complete_json(self, *, system_prompt: str, user_prompt: str, schema_hint: str) -> dict:
        """Returns a parsed JSON object. Implementations must raise
        LLMProviderError on failure rather than returning malformed data."""
        ...


class LLMProviderError(Exception):
    pass
