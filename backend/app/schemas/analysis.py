"""Structured lesson analysis contract (build spec section 9). The AI is
never trusted to return unstructured text internally — every AI-facing
service parses into one of these models or rejects the response."""
from __future__ import annotations

from pydantic import BaseModel, Field


class Concept(BaseModel):
    name: str
    formula: str | None = None
    description: str = ""


class OriginalExample(BaseModel):
    statement: str
    variables: dict[str, float | str] = Field(default_factory=dict)
    expected_result: float | str | None = None


class LessonAnalysisResult(BaseModel):
    topic: str
    subject: str = ""
    subtopics: list[str] = Field(default_factory=list)
    objectives: list[str] = Field(default_factory=list)
    definitions: dict[str, str] = Field(default_factory=dict)
    concepts: list[Concept] = Field(default_factory=list)
    facts: list[str] = Field(default_factory=list)
    examples: list[OriginalExample] = Field(default_factory=list)
    prerequisite_concepts: list[str] = Field(default_factory=list)
    visual_elements: list[str] = Field(default_factory=list)
    teaching_sequence: list[str] = Field(default_factory=list)
