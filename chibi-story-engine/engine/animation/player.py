"""Sampling animation clips and tracking what a character may do next."""
from __future__ import annotations

from dataclasses import dataclass

from ..common.errors import AnimationError, TransitionError
from ..schema.animation import ANY_STATE, AnimationClip
from ..schema.assets import PartPose
from .easing import interpolate

RELEASE = "@"     # variant key: give the part back to the current expression


@dataclass
class ClipSample:
    parts: dict[str, PartPose]
    variants: dict[str, str]


def clip_time(clip: AnimationClip, elapsed: float, duration: float) -> float:
    """Clip-local time for an action that has run `elapsed` of `duration` seconds."""
    if clip.loop:
        return elapsed % clip.duration
    if duration <= 0:
        return clip.duration
    return min(1.0, max(0.0, elapsed / duration)) * clip.duration


def sample(clip: AnimationClip, t: float, weight: float = 1.0, available: set[str] | None = None) -> ClipSample:
    """Joint deltas and image overrides of `clip` at clip-local time t, scaled by weight."""
    parts: dict[str, PartPose] = {}
    for name, keys in clip.channels.items():
        part, _, prop = name.partition(".")
        if available is not None and part not in available:
            continue
        value = interpolate([(k.t, k.v, k.ease) for k in keys], t)
        pp = parts.setdefault(part, PartPose())
        if prop in ("sx", "sy"):
            setattr(pp, prop, 1.0 + (value - 1.0) * weight)
        else:
            setattr(pp, prop, value * weight)
    variants: dict[str, str] = {}
    if weight >= 0.5:
        for part, keys in clip.variant_tracks.items():
            if available is not None and part not in available:
                continue
            current = None
            for k in keys:
                if k.t <= t + 1e-9:
                    current = k.variant
            if current and current != RELEASE:
                variants[part] = current
    return ClipSample(parts, variants)


class Catalogue:
    """The clips available to the engine, with lookups by meaning."""

    def __init__(self, clips: dict[str, AnimationClip]) -> None:
        self.clips = clips

    def get(self, code: str) -> AnimationClip:
        clip = self.clips.get(code)
        if clip is None:
            raise AnimationError(f"Unknown animation '{code}'", details={"animation": code})
        return clip

    def for_semantic(self, semantic: str, rig: str, state: str | None = None) -> AnimationClip | None:
        best = None
        for clip in self.clips.values():
            if rig not in clip.rig_compatibility:
                continue
            if clip.code != semantic and semantic not in clip.metadata.get("semantics", []):
                continue
            if state is not None and ANY_STATE not in clip.start_states and state not in clip.start_states:
                continue
            if clip.code == semantic:
                return clip
            best = best or clip
        return best


def check_transition(clip: AnimationClip, state: str, character_id: str) -> str:
    """State after playing `clip` from `state`; raises if the clip cannot start there."""
    if ANY_STATE not in clip.start_states and state not in clip.start_states:
        raise TransitionError(
            f"'{character_id}' cannot play '{clip.code}' while {state}: it starts from {' or '.join(clip.start_states)}",
            details={"character": character_id, "animation": clip.code, "state": state, "allowed": clip.start_states})
    return clip.end_state or state
