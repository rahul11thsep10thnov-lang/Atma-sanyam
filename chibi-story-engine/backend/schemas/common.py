from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

LANG = r"^[a-z]{2,3}(-[A-Z]{2})?$"


class In(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)


class Out(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class LoginIn(In):
    email: str = Field(min_length=3, max_length=320)
    password: str = Field(min_length=1, max_length=200)


class TokenOut(Out):
    access_token: str
    token_type: str = "bearer"
    role: str
    email: str


class UserOut(Out):
    id: uuid.UUID
    email: str
    role: str


class UserCreate(In):
    email: str = Field(min_length=3, max_length=320, pattern=r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
    password: str = Field(min_length=10, max_length=200)
    role: str = Field("viewer", pattern="^(admin|producer|reviewer|viewer)$")


class ProjectCreate(In):
    name: str = Field(min_length=1, max_length=200)
    description: str = Field("", max_length=5000)
    default_language: str = Field("hi-IN", pattern=LANG)
    visual_style: str = Field("premium_chibi_anime", min_length=1, max_length=64)
    default_resolution: str = Field("1920x1080", pattern=r"^[0-9]{2,5}x[0-9]{2,5}$")
    default_fps: int = Field(24, ge=1, le=120)


class ProjectOut(Out):
    id: uuid.UUID
    name: str
    description: str
    default_language: str
    visual_style: str
    default_resolution: str
    default_fps: int
    created_at: datetime
    updated_at: datetime


class StoryCreate(In):
    project_id: uuid.UUID
    title: str = Field(min_length=1, max_length=300)
    original_text: str = Field(min_length=1, max_length=60000)
    language: str = Field("hi-IN", pattern=LANG)
    genre: str | None = Field(None, max_length=64)
    moral: str | None = Field(None, max_length=2000)
    visual_style: str | None = Field(None, max_length=64)
    target_duration_seconds: float | None = Field(None, gt=5, le=3600)


class StoryPatch(In):
    title: str | None = Field(None, min_length=1, max_length=300)
    original_text: str | None = Field(None, min_length=1, max_length=60000)
    language: str | None = Field(None, pattern=LANG)
    genre: str | None = Field(None, max_length=64)
    moral: str | None = Field(None, max_length=2000)
    story_json: dict[str, Any] | None = Field(None, description="a full Story Definition; saved as a new version after validation")
    change_summary: str = Field("", max_length=500)


class StoryOut(Out):
    id: uuid.UUID
    project_id: uuid.UUID
    title: str
    original_text: str
    language: str
    genre: str | None
    moral: str | None
    status: str
    current_version: int
    settings_json: dict[str, Any]
    created_at: datetime
    updated_at: datetime


class StoryDetail(StoryOut):
    story_json: dict[str, Any] | None = None
    analysis_json: dict[str, Any] | None = None
    versions: list[dict[str, Any]] = []
