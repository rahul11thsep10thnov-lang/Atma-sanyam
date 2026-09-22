from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field

QUALITY_ISSUE_TYPES = Literal[
    "MISSING_NARRATION",
    "MISSING_AUDIO",
    "AUDIO_DURATION",
    "EMPTY_SCENE",
    "BOARD_TEXT_OVERFLOW",
    "INVALID_CALCULATION",
    "MISSING_ASSET",
    "RENDER_FAILURE",
    "AV_DURATION_MISMATCH",
    "SUBTITLE_TIMING",
    "LONG_SILENCE",
    "FAST_NARRATION",
    "LONG_SCENE",
    "UNREADABLE_BOARD_TEXT",
]


class QualityIssue(BaseModel):
    type: QUALITY_ISSUE_TYPES
    message: str
    scene_id: str | None = None
    severity: Literal["WARNING", "FAIL"] = "WARNING"


class QualityReportResult(BaseModel):
    status: Literal["PASS", "WARNING", "FAIL"]
    issues: list[QualityIssue] = Field(default_factory=list)
