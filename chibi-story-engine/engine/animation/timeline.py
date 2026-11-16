"""A character's performance over one shot: which clip plays when, the resulting pose per frame, and its state.

Layers, bottom to top: state pose -> idle or the active clip (cross-faded) -> additive clips ->
expression -> clip image overrides -> blink -> talk (lip-sync).
"""
from __future__ import annotations

import hashlib
import random
from dataclasses import dataclass, field

from ..character_manager.rig import HIDDEN, Pose, Rig
from ..common.errors import AnimationError, IncompatibleAsset, TransitionError
from ..schema.animation import AnimationClip
from ..schema.assets import CharacterManifest, PartPose
from .player import Catalogue, check_transition, clip_time, sample

BLINK_SECONDS = 0.13
OPEN_EYES = {"open", "wide", "sad", "angry"}


@dataclass
class ScheduledAction:
    action_id: str
    clip: AnimationClip
    start: float
    duration: float
    loop: bool
    expression: str | None = None

    @property
    def end(self) -> float:
        return self.start + self.duration


@dataclass
class TimelineIssue:
    code: str
    message: str
    action_id: str | None = None


@dataclass
class PoseTimeline:
    character_id: str
    manifest: CharacterManifest
    rig: Rig
    catalogue: Catalogue
    initial_state: str
    expression: str
    fps: int
    n_frames: int
    actions: list[ScheduledAction] = field(default_factory=list)
    named_pose: str | None = None
    talk: list[float] | None = None            # mouth openness 0..1 per frame
    seed: str = ""
    time_offset: float = 0.0                   # scene time at frame 0, so idles and blinks do not restart at every cut
    issues: list[TimelineIssue] = field(default_factory=list)

    def __post_init__(self) -> None:
        self.parts = set(self.rig.parts)
        self.base = sorted((a for a in self.actions if not a.clip.additive), key=lambda a: a.start)
        self.additive = [a for a in self.actions if a.clip.additive]
        self._states = self._plan_states()
        self._blinks = self._plan_blinks()
        self._talk_clip = self.catalogue.for_semantic("talk", self.manifest.rig.template)
        if self.expression not in self.manifest.expressions:
            self.issues.append(TimelineIssue("unknown_expression", f"'{self.character_id}' has no expression '{self.expression}'"))
            self.expression = "neutral"
        for a in self.actions:
            if a.expression and a.expression not in self.manifest.expressions:
                self.issues.append(TimelineIssue("unknown_expression", f"'{self.character_id}' has no expression '{a.expression}'", a.action_id))
                a.expression = None

    # ---------------------------------------------------------------- plan
    def _plan_states(self) -> list[tuple[float, str]]:
        """(time, state from that time on). Also checks transitions and overlapping clips."""
        states = [(0.0, self.initial_state)]
        state = self.initial_state
        previous: ScheduledAction | None = None
        for a in self.base:
            if previous is not None and a.start < previous.end - 1e-6:
                self.issues.append(TimelineIssue(
                    "timeline_conflict",
                    f"'{self.character_id}': '{a.clip.code}' starts at {a.start:.2f}s while '{previous.clip.code}' runs until {previous.end:.2f}s",
                    a.action_id))
            try:
                after = check_transition(a.clip, state, self.character_id)
            except TransitionError as exc:
                self.issues.append(TimelineIssue("incompatible_transition", exc.message, a.action_id))
                after = state
            if after != state:
                states.append((a.end, after))
                state = after
            previous = a
        return states

    def _plan_blinks(self) -> list[float]:
        rng = random.Random(int(hashlib.sha256(f"blink:{self.character_id}:{self.seed}".encode()).hexdigest()[:12], 16))
        total = self.n_frames / self.fps
        out, t = [], rng.uniform(0.6, 2.6) - (self.time_offset % 1.0)
        while t < total:
            if t >= 0:
                out.append(t)
            t += rng.uniform(2.2, 4.6)
        return out

    def state_at(self, t: float) -> str:
        state = self._states[0][1]
        for when, name in self._states:
            if t >= when - 1e-9:
                state = name
        return state

    def final_state(self) -> str:
        return self._states[-1][1]

    def duration_seconds(self) -> float:
        return self.n_frames / self.fps

    # ---------------------------------------------------------------- pose
    def _apply(self, pose: Pose, parts: dict[str, PartPose], variants: dict[str, str]) -> None:
        for part, pp in parts.items():
            if part in self.parts:
                pose.add(part, rotation=pp.rotation, x=pp.x, y=pp.y, sx=pp.sx, sy=pp.sy)
        for part, variant in variants.items():
            if part in self.parts:
                pose.variants[part] = variant

    def _idle(self, state: str) -> AnimationClip | None:
        rig = self.manifest.rig.template
        if state not in ("standing", "sitting"):
            clip = self.catalogue.for_semantic("float" if state == "in_water" else "idle", rig, state)
            if clip:
                return clip
        return self.catalogue.for_semantic("idle", rig, state) or self.catalogue.for_semantic("idle", rig)

    def pose_at(self, frame: int) -> Pose:
        t = frame / self.fps
        state = self.state_at(t)
        pose = Pose()
        for name in (state, self.named_pose):
            if name and name in self.manifest.poses:
                self._apply(pose, self.manifest.poses[name], {})

        active = next((a for a in self.base if a.start - 1e-9 <= t < a.end), None)
        weight = 0.0
        expression = self.expression
        overrides: dict[str, str] = {}
        if active is not None:
            weight = 1.0
            if active.clip.loop and active.clip.blend_in > 0:
                weight = min(1.0, (t - active.start) / active.clip.blend_in + 0.05, (active.end - t) / active.clip.blend_in + 0.05)
            s = sample(active.clip, clip_time(active.clip, t - active.start, active.duration), weight, self.parts)
            self._apply(pose, s.parts, {})
            overrides.update(s.variants)
            expression = active.expression or active.clip.expression or expression
        if weight < 1.0:
            idle = self._idle(state)
            if idle is not None:
                s = sample(idle, (t + self.time_offset) % idle.duration, 1.0 - weight, self.parts)
                self._apply(pose, s.parts, {})
        for a in self.additive:
            if a.start - 1e-9 <= t < a.end:
                s = sample(a.clip, clip_time(a.clip, t - a.start, a.duration), 1.0, self.parts)
                self._apply(pose, s.parts, {})
                overrides.update(s.variants)
                expression = a.expression or a.clip.expression or expression

        pose.apply_facial(self.manifest.expressions[expression])
        pose.variants.update(overrides)

        if any(b <= t < b + BLINK_SECONDS for b in self._blinks) and pose.variants.get("eyes") in OPEN_EYES:
            eyes = self.rig.parts.get("eyes")
            if eyes is not None and "closed" in eyes.variants:
                pose.variants["eyes"] = "closed"
                if "pupils" in self.parts:
                    pose.variants["pupils"] = HIDDEN

        if self.talk is not None and frame < len(self.talk):
            self._talk(pose, frame)
        return pose

    def _talk(self, pose: Pose, frame: int) -> None:
        level = self.talk[frame]                       # type: ignore[index]
        rig = self.manifest.rig
        window = self.talk[max(0, frame - 3): frame + 4]  # type: ignore[index]
        speaking = max(window) > 0.02
        if speaking and self._talk_clip is not None:
            t = (frame / self.fps + self.time_offset) % self._talk_clip.duration
            self._apply(pose, sample(self._talk_clip, t, min(1.0, sum(1 for v in window if v > 0.02) / 4), self.parts).parts, {})
        if level <= 0.02:
            return
        if rig.talk_mode == "jaw" and rig.jaw_part:
            pose.add(rig.jaw_part, rotation=rig.jaw_open_degrees * min(1.0, 0.25 + level))
        else:
            shapes = rig.talk_variants
            index = 0 if level <= 0.12 else 1 + min(len(shapes) - 2, int((level - 0.12) / 0.88 * (len(shapes) - 1)))
            pose.variants[rig.talk_part] = shapes[index]


def schedule(character: CharacterManifest, catalogue: Catalogue, raw: list[dict], shot_seconds: float, check) -> tuple[list[ScheduledAction], list[TimelineIssue]]:
    """Turn story actions (already flattened to absolute starts) into scheduled clips, validating each.

    `raw` items: {"action_id", "animation", "start", "duration" (or None), "loop" (or None), "expression"}.
    `check(manifest, clip)` raises IncompatibleAsset when the rig cannot play the clip.
    """
    out: list[ScheduledAction] = []
    issues: list[TimelineIssue] = []
    for item in raw:
        try:
            clip = catalogue.get(item["animation"])
            check(character, clip)
        except (AnimationError, IncompatibleAsset) as exc:
            issues.append(TimelineIssue(exc.code, exc.message, item["action_id"]))
            continue
        loop = clip.loop if item.get("loop") is None else bool(item["loop"]) and clip.loop
        duration = item.get("duration") or (max(0.1, shot_seconds - item["start"]) if loop else clip.duration)
        duration = min(duration, max(0.05, shot_seconds - item["start"]))
        out.append(ScheduledAction(item["action_id"], clip, item["start"], duration, loop, item.get("expression")))
    return out, issues
