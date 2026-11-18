"""Story Definition Format (SDF) v1.

The single declarative document that drives every animation. Nothing in a story
file is ever executed: it only names assets, animations and timings, all of
which are validated here (shape, references, timing) and again against the
asset library (see `engine.composition.validation`).
"""
from __future__ import annotations

from enum import Enum
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, ValidationError, field_validator, model_validator

from ..common.errors import ValidationFailed

SCHEMA_VERSION = "1.0"
SUPPORTED_MAJOR = 1
NARRATOR = "narrator"
ID_PATTERN = r"^[a-z0-9][a-z0-9_\-]{0,63}$"
TIME_EPS = 1e-3


class Model(BaseModel):
    model_config = ConfigDict(extra="forbid", validate_assignment=True)


class ApprovalStatus(str, Enum):
    pending = "pending"
    approved = "approved"
    rejected = "rejected"


class Easing(str, Enum):
    linear = "linear"
    ease_in = "ease_in"
    ease_out = "ease_out"
    ease_in_out = "ease_in_out"
    step = "step"
    bounce = "bounce"
    overshoot = "overshoot"


class OutputSpec(Model):
    width: int = Field(1920, ge=160, le=7680)
    height: int = Field(1080, ge=90, le=4320)
    fps: int = Field(24, ge=1, le=120)


class Position(Model):
    """A place on the stage: a named environment anchor, absolute stage pixels, or both (anchor + offset).

    Stage space is 1920x1080 reference pixels, x to the right, y up from the bottom edge.
    """

    anchor: str | None = None
    x: float | None = None
    y: float | None = None
    offset: tuple[float, float] = (0.0, 0.0)

    @model_validator(mode="after")
    def _one_of(self) -> "Position":
        if self.anchor is None and (self.x is None or self.y is None):
            raise ValueError("a position needs either an 'anchor' or both 'x' and 'y'")
        return self


class Attachment(Model):
    """Carry one character on a part of another (a rider on a mount's back)."""

    character_id: str = Field(pattern=ID_PATTERN)
    part: str = "body"
    offset: tuple[float, float] = (0.0, 0.0)


class CharacterRef(Model):
    character_id: str = Field(pattern=ID_PATTERN)
    asset_version: int = Field(1, ge=1)
    voice_id: str | None = None
    role: str | None = None


class CharacterPlacement(Model):
    """Where a character is and how it looks when a shot starts."""

    character_id: str = Field(pattern=ID_PATTERN)
    position: Position
    facing: Literal["left", "right"] = "right"
    view: Literal["front", "side", "three_quarter", "back"] | None = Field(None, description="which drawn view to use; omitted means the character's primary view (front for people and animals, side for reptiles)")
    scale: float = Field(1.0, gt=0.05, le=5)
    state: str = "standing"
    expression: str = "neutral"
    pose: str | None = None
    visible: bool = True
    order: int = 0
    attach_to: Attachment | None = None


class PropPlacement(Model):
    prop_id: str = Field(pattern=ID_PATTERN)
    instance_id: str | None = None
    asset_version: int = Field(1, ge=1)
    position: Position
    scale: float = Field(1.0, gt=0.01, le=10)
    rotation: float = 0.0
    order: int = 0
    held_by: Attachment | None = None
    visible_from: float = Field(0.0, ge=0)
    visible_until: float | None = None


class Action(Model):
    """A scheduled animation. Children start relative to their parent's start."""

    action_id: str = Field(pattern=ID_PATTERN)
    character_id: str | None = Field(None, pattern=ID_PATTERN)
    animation: str = Field(pattern=ID_PATTERN)
    start_seconds: float = Field(0.0, ge=0)
    duration_seconds: float | None = Field(None, gt=0)
    loop: bool | None = None
    move_to: Position | None = None
    target_character: str | None = None
    prop_id: str | None = None
    expression: str | None = None
    facing: Literal["left", "right"] | None = None
    params: dict[str, float | int | str | bool] = Field(default_factory=dict)
    children: list["Action"] = Field(default_factory=list)


class DialogueLine(Model):
    """One spoken line. `speaker` is a character id, or "narrator" for narration."""

    line_id: str = Field(pattern=ID_PATTERN)
    speaker: str = Field(pattern=ID_PATTERN)
    text: str = Field(min_length=1, max_length=2000)
    emotion: str = "neutral"
    start_seconds: float | None = Field(None, ge=0)
    voice_id: str | None = None

    @property
    def is_narration(self) -> bool:
        return self.speaker == NARRATOR

    @field_validator("text")
    @classmethod
    def _strip(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("text must not be blank")
        return v


class CameraKeyframe(Model):
    t: float = Field(ge=0, description="seconds from the start of the shot")
    x: float = 960.0
    y: float = 540.0
    zoom: float = Field(1.0, ge=0.5, le=3.0)
    easing: Easing = Easing.ease_in_out


class CameraSpec(Model):
    preset: str = "establishing_wide"
    target: str | None = Field(None, description="character id (or anchor name) the preset frames")
    params: dict[str, float | int | str | bool] = Field(default_factory=dict)
    keyframes: list[CameraKeyframe] = Field(default_factory=list)

    @field_validator("keyframes")
    @classmethod
    def _ordered(cls, v: list[CameraKeyframe]) -> list[CameraKeyframe]:
        times = [k.t for k in v]
        if times != sorted(times) or len(set(times)) != len(times):
            raise ValueError("camera keyframes must have strictly increasing times")
        return v


class Effect(Model):
    effect_id: str = Field(pattern=ID_PATTERN)
    type: str = Field(pattern=ID_PATTERN)
    start_seconds: float = Field(0.0, ge=0)
    duration_seconds: float = Field(1.0, gt=0)
    position: Position | None = None
    follow_character: str | None = None
    params: dict[str, float | int | str | bool] = Field(default_factory=dict)


class AudioCue(Model):
    cue_id: str = Field(pattern=ID_PATTERN)
    type: Literal["sfx", "ambience", "music"] = "sfx"
    asset_id: str = Field(pattern=ID_PATTERN)
    start_seconds: float = Field(0.0, ge=0)
    duration_seconds: float | None = Field(None, gt=0)
    volume: float = Field(1.0, ge=0, le=2)
    loop: bool = False


class Transition(Model):
    type: Literal["cut", "fade"] = "cut"
    duration_seconds: float = Field(0.0, ge=0, le=5)


class Shot(Model):
    shot_id: str = Field(pattern=ID_PATTERN)
    duration_seconds: float = Field(gt=0, le=600)
    description: str = ""
    animation_level: Literal[1, 2, 3] | None = Field(None, description="1 motion-comic, 2 cutout, 3 action; None = choose automatically")
    camera: CameraSpec = Field(default_factory=CameraSpec)
    characters: list[CharacterPlacement] = Field(default_factory=list)
    props: list[PropPlacement] = Field(default_factory=list)
    actions: list[Action] = Field(default_factory=list)
    dialogue: list[DialogueLine] = Field(default_factory=list)
    effects: list[Effect] = Field(default_factory=list)
    audio: list[AudioCue] = Field(default_factory=list)


class Scene(Model):
    scene_id: str = Field(pattern=ID_PATTERN)
    title: str = ""
    description: str = ""
    environment_id: str = Field(pattern=ID_PATTERN)
    environment_version: int = Field(1, ge=1)
    time_of_day: str = "day"
    weather: str = "clear"
    season: str = "summer"
    scare_level: int = Field(2, ge=0, le=2, description="0 gentle, 1 mild, 2 full: haunted environments hide their scarier layers below 2")
    duration_seconds: float | None = Field(None, gt=0, description="must equal the sum of shot durations when given")
    depends_on: list[str] = Field(default_factory=list)
    transition_in: Transition = Field(default_factory=Transition)
    transition_out: Transition = Field(default_factory=Transition)
    approval_status: ApprovalStatus = ApprovalStatus.pending
    shots: list[Shot] = Field(min_length=1)

    @property
    def total_duration(self) -> float:
        return round(sum(s.duration_seconds for s in self.shots), 6)


class MusicSpec(Model):
    track_id: str = Field(pattern=ID_PATTERN)
    volume: float = Field(0.5, ge=0, le=2)
    duck_under_speech: bool = True


class StoryAudio(Model):
    narrator_voice: str = "narrator_hi"
    music: MusicSpec | None = None


class Story(Model):
    schema_version: str = SCHEMA_VERSION
    story_id: str = Field(pattern=ID_PATTERN)
    title: str = ""
    language: str = "hi-IN"
    genre: str | None = None
    moral: str | None = None
    visual_style: str = "premium_chibi_anime"
    output: OutputSpec = Field(default_factory=OutputSpec)
    audio: StoryAudio = Field(default_factory=StoryAudio)
    characters: list[CharacterRef] = Field(default_factory=list)
    scenes: list[Scene] = Field(min_length=1)
    metadata: dict[str, Any] = Field(default_factory=dict)

    @field_validator("schema_version")
    @classmethod
    def _version(cls, v: str) -> str:
        try:
            major = int(v.split(".")[0])
        except ValueError as exc:
            raise ValueError(f"schema_version {v!r} is not of the form MAJOR.MINOR") from exc
        if major != SUPPORTED_MAJOR:
            raise ValueError(f"schema_version {v} is not supported by this engine (supports {SUPPORTED_MAJOR}.x)")
        return v

    @model_validator(mode="after")
    def _cross_checks(self) -> "Story":
        issues = collect_reference_issues(self)
        if issues:
            raise ValueError("; ".join(f"{i['path']}: {i['message']}" for i in issues))
        return self

    @property
    def total_duration(self) -> float:
        return round(sum(sc.total_duration for sc in self.scenes), 6)

    def character_ids(self) -> list[str]:
        return [c.character_id for c in self.characters]

    def scene(self, scene_id: str) -> Scene:
        for sc in self.scenes:
            if sc.scene_id == scene_id:
                return sc
        raise KeyError(scene_id)


def iter_actions(actions: list[Action], offset: float = 0.0):
    """Yield (action, absolute_start) for a tree of nested actions, parents first."""
    for a in actions:
        start = offset + a.start_seconds
        yield a, start
        yield from iter_actions(a.children, start)


def _dupes(values: list[str]) -> list[str]:
    seen: set[str] = set()
    out = []
    for v in values:
        if v in seen and v not in out:
            out.append(v)
        seen.add(v)
    return out


def collect_reference_issues(story: Story) -> list[dict[str, str]]:
    """Referential and timing rules that do not need the asset library."""
    issues: list[dict[str, str]] = []

    def add(path: str, message: str) -> None:
        issues.append({"path": path, "message": message})

    declared = story.character_ids()
    for d in _dupes(declared):
        add("characters", f"character '{d}' is declared more than once")
    for d in _dupes([s.scene_id for s in story.scenes]):
        add("scenes", f"scene id '{d}' is used more than once")

    seen_scenes: list[str] = []
    for si, scene in enumerate(story.scenes):
        sp = f"scenes[{si}]({scene.scene_id})"
        for dep in scene.depends_on:
            if dep == scene.scene_id:
                add(sp, "a scene cannot depend on itself")
            elif dep not in seen_scenes:
                add(sp, f"depends on '{dep}', which is not an earlier scene")
        seen_scenes.append(scene.scene_id)
        if scene.duration_seconds is not None and abs(scene.duration_seconds - scene.total_duration) > TIME_EPS:
            add(sp, f"duration_seconds is {scene.duration_seconds} but its shots add up to {scene.total_duration}")
        fades = scene.transition_in.duration_seconds + scene.transition_out.duration_seconds
        if fades > scene.total_duration:
            add(sp, f"transitions last {fades}s, longer than the scene ({scene.total_duration}s)")
        for d in _dupes([s.shot_id for s in scene.shots]):
            add(sp, f"shot id '{d}' is used more than once")

        for hi, shot in enumerate(scene.shots):
            hp = f"{sp}.shots[{hi}]({shot.shot_id})"
            dur = shot.duration_seconds
            placed = [c.character_id for c in shot.characters]
            for d in _dupes(placed):
                add(hp, f"character '{d}' is placed more than once")
            for c in shot.characters:
                if c.character_id not in declared:
                    add(hp, f"places character '{c.character_id}', which is not declared in story.characters")
                if c.attach_to:
                    if c.attach_to.character_id == c.character_id:
                        add(hp, f"character '{c.character_id}' cannot be attached to itself")
                    elif c.attach_to.character_id not in placed:
                        add(hp, f"'{c.character_id}' is attached to '{c.attach_to.character_id}', which is not in this shot")
            prop_ids = [p.instance_id or p.prop_id for p in shot.props]
            for d in _dupes(prop_ids):
                add(hp, f"prop instance '{d}' is used more than once")
            for p in shot.props:
                if p.held_by and p.held_by.character_id not in placed:
                    add(hp, f"prop '{p.prop_id}' is held by '{p.held_by.character_id}', which is not in this shot")
                if p.visible_until is not None and p.visible_until <= p.visible_from:
                    add(hp, f"prop '{p.prop_id}' has visible_until <= visible_from")

            all_actions = list(iter_actions(shot.actions))
            for d in _dupes([a.action_id for a, _ in all_actions]):
                add(hp, f"action id '{d}' is used more than once")
            for a, start in all_actions:
                ap = f"{hp}.action({a.action_id})"
                if a.character_id is None:
                    add(ap, "an action needs a character_id")
                elif a.character_id not in placed:
                    add(ap, f"character '{a.character_id}' is not placed in this shot")
                if a.target_character and a.target_character not in placed:
                    add(ap, f"target character '{a.target_character}' is not placed in this shot")
                if a.prop_id and a.prop_id not in prop_ids:
                    add(ap, f"prop '{a.prop_id}' is not placed in this shot")
                if start > dur + TIME_EPS:
                    add(ap, f"starts at {start:.2f}s, after the shot ends ({dur:.2f}s)")
                elif a.duration_seconds is not None and start + a.duration_seconds > dur + TIME_EPS:
                    add(ap, f"ends at {start + a.duration_seconds:.2f}s, after the shot ends ({dur:.2f}s)")

            for d in _dupes([l.line_id for l in shot.dialogue]):
                add(hp, f"dialogue line id '{d}' is used more than once")
            for l in shot.dialogue:
                lp = f"{hp}.dialogue({l.line_id})"
                if not l.is_narration and l.speaker not in declared:
                    add(lp, f"speaker '{l.speaker}' is neither 'narrator' nor a declared character")
                if l.start_seconds is not None and l.start_seconds > dur + TIME_EPS:
                    add(lp, f"starts at {l.start_seconds:.2f}s, after the shot ends ({dur:.2f}s)")
            for e in shot.effects:
                if e.start_seconds > dur + TIME_EPS:
                    add(f"{hp}.effect({e.effect_id})", f"starts at {e.start_seconds:.2f}s, after the shot ends ({dur:.2f}s)")
                if e.follow_character and e.follow_character not in placed:
                    add(f"{hp}.effect({e.effect_id})", f"follows '{e.follow_character}', which is not in this shot")
            for d in _dupes([e.effect_id for e in shot.effects]):
                add(hp, f"effect id '{d}' is used more than once")
            for c in shot.audio:
                if c.start_seconds > dur + TIME_EPS:
                    add(f"{hp}.audio({c.cue_id})", f"starts at {c.start_seconds:.2f}s, after the shot ends ({dur:.2f}s)")
            for k in shot.camera.keyframes:
                if k.t > dur + TIME_EPS:
                    add(f"{hp}.camera", f"keyframe at {k.t:.2f}s is after the shot ends ({dur:.2f}s)")
            if shot.camera.target and shot.camera.target in declared and shot.camera.target not in placed:
                add(f"{hp}.camera", f"targets '{shot.camera.target}', which is not placed in this shot")
    return issues


def format_validation_error(exc: ValidationError) -> list[dict[str, str]]:
    out = []
    for err in exc.errors():
        path = ".".join(str(p) for p in err["loc"]) or "story"
        msg = err["msg"]
        if msg.startswith("Value error, "):
            msg = msg[len("Value error, "):]
        out.append({"path": path, "message": msg, "type": err["type"]})
    return out


def parse_story(data: Any) -> Story:
    """Validate untrusted story data. Raises ValidationFailed with a list of readable issues."""
    if not isinstance(data, dict):
        raise ValidationFailed("A story must be a JSON object", [{"path": "story", "message": f"expected an object, got {type(data).__name__}"}])
    try:
        return Story.model_validate(data)
    except ValidationError as exc:
        issues = format_validation_error(exc)
        raise ValidationFailed(f"Story definition is invalid ({len(issues)} problem{'s' if len(issues) != 1 else ''})", issues) from exc


def story_json_schema() -> dict[str, Any]:
    return Story.model_json_schema()
