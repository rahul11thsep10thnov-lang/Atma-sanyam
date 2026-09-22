"""Real LLM integration (build spec Phase 11). Isolated here exactly like
ElevenLabs is isolated under services/voice/ — no other module constructs
this HTTP call. Used only when LLM_PROVIDER=anthropic and MOCK_AI=false.
"""
import json
import re

import httpx

from app.services.ai.base import LLMProvider, LLMProviderError

_ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages"


class AnthropicProvider(LLMProvider):
    def __init__(self, api_key: str, model: str) -> None:
        if not api_key:
            raise LLMProviderError(
                "LLM_API_KEY is not set. Set it in .env or use MOCK_AI=true for development."
            )
        self._api_key = api_key
        self._model = model

    def complete_json(self, *, system_prompt: str, user_prompt: str, schema_hint: str) -> dict:
        full_system = (
            f"{system_prompt}\n\nRespond with ONLY a single JSON object matching this shape "
            f"(no markdown fences, no commentary):\n{schema_hint}"
        )
        try:
            response = httpx.post(
                _ANTHROPIC_API_URL,
                headers={
                    "x-api-key": self._api_key,
                    "anthropic-version": "2023-06-01",
                    "content-type": "application/json",
                },
                json={
                    "model": self._model,
                    "max_tokens": 4096,
                    "system": full_system,
                    "messages": [{"role": "user", "content": user_prompt}],
                },
                timeout=60.0,
            )
            response.raise_for_status()
        except httpx.HTTPError as exc:
            raise LLMProviderError(f"LLM request failed: {exc}") from exc

        data = response.json()
        text = "".join(
            block.get("text", "") for block in data.get("content", []) if block.get("type") == "text"
        )
        return _extract_json(text)


def _extract_json(text: str) -> dict:
    match = re.search(r"\{.*\}", text, re.DOTALL)
    if not match:
        raise LLMProviderError("LLM response did not contain a JSON object.")
    try:
        return json.loads(match.group(0))
    except json.JSONDecodeError as exc:
        raise LLMProviderError(f"LLM response was not valid JSON: {exc}") from exc
