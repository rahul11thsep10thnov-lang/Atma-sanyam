"""StoryAnalysis: what the analysers (rule-based or LLM) must produce. Always validated."""
from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, ValidationError

from ..common.errors import ValidationFailed
from ..schema.assets import FACIAL_POSES
from ..schema.story import NARRATOR, format_validation_error

KEY = r"^[a-z][a-z0-9_]{0,47}$"
Emotion = Literal["neutral", "happy", "sad", "surprised", "angry", "worried", "thinking", "laughing", "speaking"]
assert set(Emotion.__args__) == set(FACIAL_POSES)


class M(BaseModel):
    model_config = ConfigDict(extra="forbid")


class Entity(M):
    key: str = Field(pattern=KEY)
    display_name: str = Field(min_length=1, max_length=80)
    species: str = "unknown"
    habitat: str = "ground"
    kind: Literal["character", "group"] = "character"
    names: list[str] = Field(default_factory=list)
    mention_count: int = Field(0, ge=0)
    matched_asset_id: str | None = None
    candidate_asset_ids: list[str] = Field(default_factory=list)


class ActionBeat(M):
    actor: str = Field(pattern=KEY)
    semantic: str = Field(pattern=r"^[a-z_]{2,32}$")
    target: str | None = None
    target_entity: str | None = None
    prop: str | None = None


class Beat(M):
    kind: Literal["narration", "dialogue"]
    text: str = Field(min_length=1, max_length=2000)
    speaker: str = NARRATOR
    addressee: str | None = None
    emotion: Emotion = "neutral"
    emotions: dict[str, Emotion] = Field(default_factory=dict, description="narration: how each character feels")
    actions: list[ActionBeat] = Field(default_factory=list)
    is_moral: bool = False


class SceneAnalysis(M):
    index: int = Field(ge=1)
    title: str = ""
    summary: str = ""
    location_tags: list[str] = Field(default_factory=list)
    time_marker: str | None = None
    characters: list[str] = Field(default_factory=list)
    beats: list[Beat] = Field(min_length=1)
    estimated_duration: float = Field(0.0, ge=0)


class StoryAnalysis(M):
    analyser: str = "rule_based"
    language: str
    language_confidence: float = Field(1.0, ge=0, le=1)
    title: str | None = None
    moral: str | None = None
    entities: list[Entity] = Field(default_factory=list)
    scenes: list[SceneAnalysis] = Field(min_length=1)
    warnings: list[str] = Field(default_factory=list)
    coverage: float = Field(1.0, ge=0, le=1.5, description="share of the source text represented in beats")

    def entity(self, key: str) -> Entity | None:
        return next((e for e in self.entities if e.key == key), None)


def semantic_issues(analysis: StoryAnalysis) -> list[dict[str, str]]:
    """Rules a schema cannot express: references, ordering, dialogue/narration separation."""
    issues: list[dict[str, str]] = []
    keys = [e.key for e in analysis.entities]
    if len(keys) != len(set(keys)):
        issues.append({"path": "entities", "message": "entity keys must be unique"})
    for i, scene in enumerate(analysis.scenes):
        sp = f"scenes[{i}]"
        if scene.index != i + 1:
            issues.append({"path": sp, "message": f"scene index is {scene.index}, expected {i + 1}: scenes must be in story order"})
        for c in scene.characters:
            if c not in keys:
                issues.append({"path": f"{sp}.characters", "message": f"unknown entity '{c}'"})
        for j, beat in enumerate(scene.beats):
            bp = f"{sp}.beats[{j}]"
            if beat.kind == "dialogue":
                if beat.speaker == NARRATOR:
                    issues.append({"path": bp, "message": "a dialogue beat needs a character as speaker, not the narrator"})
                elif beat.speaker not in keys:
                    issues.append({"path": bp, "message": f"speaker '{beat.speaker}' is not a known entity"})
                elif beat.speaker not in scene.characters:
                    issues.append({"path": bp, "message": f"speaker '{beat.speaker}' is not listed among the scene's characters"})
            elif beat.speaker != NARRATOR:
                issues.append({"path": bp, "message": "a narration beat must have speaker 'narrator'"})
            for a in beat.actions:
                if a.actor not in keys:
                    issues.append({"path": bp, "message": f"action actor '{a.actor}' is not a known entity"})
                if a.target_entity and a.target_entity not in keys:
                    issues.append({"path": bp, "message": f"action target '{a.target_entity}' is not a known entity"})
            for k in beat.emotions:
                if k not in keys:
                    issues.append({"path": bp, "message": f"emotion given for unknown entity '{k}'"})
    return issues


def parse_analysis(data: object) -> StoryAnalysis:
    """Validate untrusted analysis data (for instance LLM output)."""
    if not isinstance(data, dict):
        raise ValidationFailed("Story analysis must be a JSON object",
                               [{"path": "analysis", "message": f"expected an object, got {type(data).__name__}"}])
    try:
        analysis = StoryAnalysis.model_validate(data)
    except ValidationError as exc:
        issues = format_validation_error(exc)
        raise ValidationFailed(f"Story analysis is invalid ({len(issues)} problems)", issues) from exc
    issues = semantic_issues(analysis)
    if issues:
        raise ValidationFailed(f"Story analysis is inconsistent ({len(issues)} problems)", issues)
    return analysis
