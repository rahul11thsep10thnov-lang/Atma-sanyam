"""Provider-independent LLM access for story analysis.

An LLM only ever returns *data*: a StoryAnalysis JSON document, which is parsed and
validated exactly like any other untrusted input. Nothing it returns is executed.
"""
from __future__ import annotations

import json
import re
from typing import Protocol, runtime_checkable

from ..asset_manager.index import LibraryIndex
from ..common.errors import ProviderUnavailable, ValidationFailed
from .models import StoryAnalysis, parse_analysis
from .text import detect_language, normalise


@runtime_checkable
class LLMProvider(Protocol):
    """The whole contract an LLM integration has to meet."""

    name: str

    def complete(self, *, system: str, prompt: str, max_tokens: int = 16000) -> str:
        """Return the model's text answer for one prompt."""
        ...


class AnthropicProvider:
    """Claude through the official Anthropic SDK. Needs the `llm` extra and credentials in the environment."""

    name = "anthropic"

    def __init__(self, model: str = "claude-opus-5-5", api_key: str | None = None) -> None:
        try:
            import anthropic
        except ImportError as exc:  # pragma: no cover - depends on the installed extras
            raise ProviderUnavailable("The 'anthropic' package is not installed (pip install '.[llm]')") from exc
        self._anthropic = anthropic
        self._client = anthropic.Anthropic(api_key=api_key) if api_key else anthropic.Anthropic()
        self.model = model

    def complete(self, *, system: str, prompt: str, max_tokens: int = 16000) -> str:
        anthropic = self._anthropic
        try:
            # Server-side fallbacks: a safety decline is re-run on a fallback model in the same call.
            response = self._client.beta.messages.create(
                model=self.model, max_tokens=max_tokens, system=system,
                betas=["server-side-fallback-2026-07-01"], fallbacks="default",
                messages=[{"role": "user", "content": prompt}],
            )
        except anthropic.AuthenticationError as exc:
            raise ProviderUnavailable("Anthropic credentials are missing or invalid") from exc
        except anthropic.RateLimitError as exc:
            raise ProviderUnavailable("Anthropic rate limit reached; try again later") from exc
        except anthropic.APIStatusError as exc:
            raise ProviderUnavailable(f"Anthropic API error ({exc.status_code})") from exc
        except anthropic.APIConnectionError as exc:
            raise ProviderUnavailable("Could not reach the Anthropic API") from exc
        if response.stop_reason == "refusal":
            raise ProviderUnavailable("The model declined to analyse this story")
        if response.stop_reason == "max_tokens":
            raise ValidationFailed("The model's answer was cut off", [{"path": "analysis", "message": "output exceeded max_tokens"}])
        return "".join(block.text for block in response.content if block.type == "text")


SYSTEM_PROMPT = """You analyse children's stories for an animation pipeline.
Return ONLY one JSON object that matches the JSON Schema you are given. No prose, no code fences.
Rules:
- Keep every scene and beat in the order of the story; do not invent or drop events.
- Split narration from spoken dialogue: a dialogue beat holds only the spoken words and names its speaker.
- Use one stable snake_case English key per character (e.g. "monkey", "crocodile_wife") everywhere.
- Copy story text verbatim in its original language and script.
- emotion values must come from the schema's enumeration."""


def build_prompt(text: str, language: str, index: LibraryIndex | None) -> str:
    known = ""
    if index and index.characters:
        rows = [f'- key "{re.sub(r"_[0-9]+$", "", c.id)}": {", ".join(c.aliases[:4]) or c.name} (asset {c.id}, habitat {c.habitat})' for c in index.characters]
        known = "Characters that already exist in the asset library (reuse these keys when they appear):\n" + "\n".join(rows) + "\n\n"
    schema = json.dumps(StoryAnalysis.model_json_schema(), ensure_ascii=False)
    return (f"{known}Action semantics to use: swim, jump, climb, throw, eat, drink, sit, run, fly, fall, leave, arrive, laugh, cry, "
            f"pick_up, sleep, look, walk, give.\nAction targets to use when they apply: back, tree, from_tree, water, well, down, near.\n\n"
            f"JSON Schema:\n{schema}\n\nLanguage: {language}\n\nStory:\n<story>\n{text}\n</story>")


def extract_json(raw: str) -> object:
    """Pull one JSON object out of a model answer, tolerating code fences and surrounding prose."""
    if not raw or not raw.strip():
        raise ValidationFailed("The model returned an empty answer", [{"path": "analysis", "message": "empty response"}])
    text = raw.strip()
    fence = re.search(r"```(?:json)?\s*(.*?)```", text, re.DOTALL)
    if fence:
        text = fence.group(1).strip()
    start = text.find("{")
    if start < 0:
        raise ValidationFailed("The model's answer contains no JSON object",
                               [{"path": "analysis", "message": f"answer starts with: {text[:80]!r}"}])
    try:
        obj, _ = json.JSONDecoder().raw_decode(text[start:])
    except json.JSONDecodeError as exc:
        raise ValidationFailed("The model's answer is not valid JSON",
                               [{"path": "analysis", "message": f"{exc.msg} at line {exc.lineno}, column {exc.colno}"}]) from exc
    return obj


class LLMStoryAnalyser:
    """Story analysis by an LLM, with strict validation and one self-repair attempt."""

    def __init__(self, provider: LLMProvider, index: LibraryIndex | None = None, repair_attempts: int = 1) -> None:
        self.provider = provider
        self.index = index
        self.repair_attempts = repair_attempts
        self.name = f"llm:{provider.name}"

    def analyse(self, text: str, language: str | None = None) -> StoryAnalysis:
        text = normalise(text)
        if not text:
            raise ValidationFailed("The story text is empty", [{"path": "text", "message": "nothing to analyse"}])
        lang = language or detect_language(text).code
        prompt = build_prompt(text, lang, self.index)
        last: ValidationFailed | None = None
        for attempt in range(self.repair_attempts + 1):
            raw = self.provider.complete(system=SYSTEM_PROMPT, prompt=prompt)
            try:
                data = extract_json(raw)
                if isinstance(data, dict):
                    data["analyser"] = self.name
                    data.setdefault("language", lang)
                analysis = parse_analysis(data)
                self._match_assets(analysis)
                return analysis
            except ValidationFailed as exc:
                last = exc
                problems = "\n".join(f"- {i['path']}: {i['message']}" for i in exc.issues[:25])
                prompt = (f"{build_prompt(text, lang, self.index)}\n\nYour previous answer was rejected:\n{problems}\n"
                          f"Return the corrected JSON object only.")
        assert last is not None
        raise ValidationFailed(f"LLM output rejected after {self.repair_attempts + 1} attempt(s): {last.message}", last.issues)

    def _match_assets(self, analysis: StoryAnalysis) -> None:
        if not self.index:
            return
        from ..asset_manager.index import norm_name
        for ent in analysis.entities:
            names = {norm_name(n) for n in [ent.key, ent.display_name, *ent.names]}
            matches = sorted(c.id for c in self.index.characters if names & c.names())
            ent.candidate_asset_ids = matches
            ent.matched_asset_id = matches[0] if matches else None
