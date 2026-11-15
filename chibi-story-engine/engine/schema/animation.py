"""Animation clip format: declarative keyframes over rig part channels."""
from __future__ import annotations

from typing import Any, Literal

from pydantic import Field, field_validator, model_validator

from .story import ID_PATTERN, Easing, Model

CHANNEL_PROPERTIES = ("rotation", "x", "y", "sx", "sy")
ANY_STATE = "*"


class Keyframe(Model):
    t: float = Field(ge=0, description="seconds from the start of the clip")
    v: float
    ease: Easing = Easing.ease_in_out


class VariantKey(Model):
    t: float = Field(ge=0)
    variant: str


class RootMotion(Model):
    """How the character travels while the clip plays (when the action has `move_to`)."""

    path: Literal["none", "linear", "arc"] = "none"
    arc_height: float = Field(0.0, description="peak height of an arc in stage pixels")
    ease: Easing = Easing.linear


class AnimationClip(Model):
    code: str = Field(pattern=ID_PATTERN)
    name: str
    category: Literal["basic", "locomotion", "interaction", "emotional", "animal"]
    level: Literal[1, 2, 3] = 2
    version: int = Field(1, ge=1)
    description: str = ""
    rig_compatibility: list[str] = Field(min_length=1, description="rig template ids this clip can drive")
    required_parts: list[str] = Field(default_factory=list)
    duration: float = Field(gt=0)
    loop: bool = False
    additive: bool = Field(False, description="layered on top of the base clip instead of replacing it")
    start_states: list[str] = Field(default_factory=lambda: [ANY_STATE])
    end_state: str | None = Field(None, description="state after the clip; None leaves it unchanged")
    root_motion: RootMotion = Field(default_factory=RootMotion)
    requires_move_to: bool = False
    requires_feature: str | None = Field(None, description="environment anchor feature the character must be at, e.g. 'water'")
    requires_prop: bool = False
    max_speed: float | None = Field(None, gt=0, description="stage pixels per second; faster moves are rejected")
    expression: str | None = None
    blend_in: float = Field(0.15, ge=0, le=2)
    channels: dict[str, list[Keyframe]] = Field(default_factory=dict)
    variant_tracks: dict[str, list[VariantKey]] = Field(default_factory=dict)
    metadata: dict[str, Any] = Field(default_factory=dict)

    @field_validator("channels")
    @classmethod
    def _channels(cls, v: dict[str, list[Keyframe]]) -> dict[str, list[Keyframe]]:
        for name, keys in v.items():
            part, _, prop = name.partition(".")
            if not part or prop not in CHANNEL_PROPERTIES:
                raise ValueError(f"channel '{name}' must be '<part>.<property>' with property in {CHANNEL_PROPERTIES}")
            if not keys:
                raise ValueError(f"channel '{name}' has no keyframes")
            times = [k.t for k in keys]
            if times != sorted(times):
                raise ValueError(f"channel '{name}' keyframes are not in time order")
        return v

    @model_validator(mode="after")
    def _within_duration(self) -> "AnimationClip":
        for name, keys in self.channels.items():
            if keys[-1].t > self.duration + 1e-6:
                raise ValueError(f"channel '{name}' has a keyframe at {keys[-1].t}s, after the clip ends ({self.duration}s)")
        for name, keys in self.variant_tracks.items():
            if keys and keys[-1].t > self.duration + 1e-6:
                raise ValueError(f"variant track '{name}' has a key after the clip ends")
        if self.root_motion.path != "none" and not self.requires_move_to:
            self.requires_move_to = False  # travel is optional: without move_to the clip plays in place
        return self

    def driven_parts(self) -> list[str]:
        parts = {name.partition(".")[0] for name in self.channels} | set(self.variant_tracks)
        return sorted(parts | set(self.required_parts))
