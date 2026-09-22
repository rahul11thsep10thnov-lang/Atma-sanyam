"""Strict Pydantic contract for the Teaching Plan JSON (build spec section 12).

This is the single source of truth consumed by the Remotion renderer. No
malformed JSON is ever allowed to reach the renderer (`RenderService`
validates through `TeachingPlan.model_validate` before writing renderer
props). Mirrored by hand in `renderer/src/types.ts` and
`frontend/types/lesson.ts` — see docs/ARCHITECTURE.md for why.

PROMPT_VERSION-tagged services record which schema version generated a plan.
"""
from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field, field_validator

SCENE_TYPES = Literal[
    "SPEAK_ONLY",
    "WRITE_ONLY",
    "WRITE_AND_SPEAK",
    "DIAGRAM",
    "FORMULA",
    "EMPHASIS",
    "PAUSE",
    "ERASE",
    "HIGHLIGHT",
    "CIRCLE",
    "ARROW",
    "ZOOM",
]

BOARD_ACTION_TYPES = Literal[
    "write",
    "write_formula",
    "diagram",
    "arrow",
    "circle",
    "rectangle",
    "underline",
    "highlight",
    "erase",
    "camera_zoom",
    "camera_pan",
]

WRITING_SPEEDS = Literal["realistic", "medium", "fast"]
HAND_MODES = Literal["OFF", "OCCASIONAL", "CONTINUOUS"]


class Position(BaseModel):
    """Normalized 0-1 board coordinates so the renderer can target any
    resolution/aspect ratio without the backend knowing pixel dimensions."""

    x: float = Field(ge=0, le=1, default=0.1)
    y: float = Field(ge=0, le=1, default=0.1)
    width: float | None = Field(default=None, ge=0, le=1)
    height: float | None = Field(default=None, ge=0, le=1)


class Style(BaseModel):
    color: str = "#1a1a1a"
    font_size: int = Field(default=36, ge=12, le=120)
    stroke_width: int = Field(default=3, ge=1, le=20)
    bold: bool = False


class BoardAction(BaseModel):
    action: BOARD_ACTION_TYPES
    content: str = ""
    position: Position = Field(default_factory=Position)
    style: Style = Field(default_factory=Style)
    start_time_ms: int = Field(default=0, ge=0)
    duration_ms: int = Field(default=800, ge=0)
    target_action_id: str | None = None  # for erase/circle/underline/highlight targeting


class Scene(BaseModel):
    scene_id: str
    type: SCENE_TYPES
    narration: str = ""
    board_actions: list[BoardAction] = Field(default_factory=list)
    pause_before_ms: int = Field(default=0, ge=0)
    pause_after_ms: int = Field(default=400, ge=0)
    emphasis: list[str] = Field(default_factory=list)
    hand_mode: HAND_MODES | None = None  # None = inherit lesson default

    # Populated by TimingService once audio duration is known; absent at
    # generation time.
    start_ms: int | None = None
    duration_ms: int | None = None

    @field_validator("scene_id")
    @classmethod
    def _non_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("scene_id must not be empty")
        return v


class SubtitleSettings(BaseModel):
    enabled: bool = True
    font: str = "Inter"
    size: int = 42
    position: Literal["bottom", "top"] = "bottom"
    burned_in: bool = False


class WhiteboardSettings(BaseModel):
    writing_speed: WRITING_SPEEDS = "medium"
    pause_between_words_ms: int = 60
    pause_between_lines_ms: int = 300
    hand_mode: HAND_MODES = "OCCASIONAL"


class TeachingPlan(BaseModel):
    lesson_title: str
    estimated_duration_seconds: int = Field(default=0, ge=0)
    learning_objectives: list[str] = Field(default_factory=list)
    scenes: list[Scene]
    language: str = "en"
    video_format: Literal["1920x1080", "1080x1920", "1080x1080"] = "1920x1080"
    fps: int = 30
    subtitles: SubtitleSettings = Field(default_factory=SubtitleSettings)
    whiteboard: WhiteboardSettings = Field(default_factory=WhiteboardSettings)
    prompt_version: str = ""

    @field_validator("scenes")
    @classmethod
    def _at_least_one_scene(cls, v: list[Scene]) -> list[Scene]:
        if not v:
            raise ValueError("teaching plan must contain at least one scene")
        ids = [s.scene_id for s in v]
        if len(ids) != len(set(ids)):
            raise ValueError("scene_id values must be unique")
        return v
