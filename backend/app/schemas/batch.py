from __future__ import annotations

from pydantic import BaseModel, Field


class BatchStartEstimate(BaseModel):
    lesson_count: int
    estimated_audio_minutes: float
    estimated_processing_minutes: float
    estimated_storage_gb: float


class BatchStartRequest(BaseModel):
    confirm: bool = False
    expected_lesson_count: int | None = None


class BatchCreateRequest(BaseModel):
    name: str
    lesson_ids: list[str] = Field(default_factory=list)
