"""Asset manifest formats: characters (with rigs), environments, props, effects and audio.

Every asset directory in the library has one `metadata.json` that validates
against one of these models. Files are referenced relative to that directory.
"""
from __future__ import annotations

from datetime import datetime, timezone
from enum import Enum
from typing import Any, Literal

from pydantic import Field, field_validator, model_validator

from .story import ID_PATTERN, ApprovalStatus, Model

MANIFEST_VERSION = "1.0"

# The components every character rig must provide (spec part 9). "tail" is per template.
STANDARD_COMPONENTS = ("root", "body", "head", "eyes", "eyebrows", "mouth", "left_arm", "right_arm", "left_leg", "right_leg")
FACIAL_POSES = ("neutral", "happy", "sad", "surprised", "angry", "worried", "thinking", "laughing", "speaking")


class AssetType(str, Enum):
    character = "character"
    environment = "environment"
    prop = "prop"
    effect = "effect"
    component = "component"
    background = "background"
    music = "music"
    sound_effect = "sound_effect"


class Licence(Model):
    name: str = "CC0-1.0"
    author: str = "Chibi Story Animation Engine (procedurally generated)"
    source: str = "generated"
    notes: str = ""


class AssetFile(Model):
    """One file of an asset, with what is needed to verify it has not changed."""

    role: str
    path: str
    format: str
    checksum: str = Field(pattern=r"^[0-9a-f]{64}$")
    width: int | None = None
    height: int | None = None
    duration_seconds: float | None = None
    view: str | None = None
    expression: str | None = None
    pose: str | None = None

    @field_validator("path")
    @classmethod
    def _relative(cls, v: str) -> str:
        if v.startswith(("/", "\\")) or ".." in v.replace("\\", "/").split("/") or ":" in v:
            raise ValueError(f"file path {v!r} must be relative to the asset directory")
        return v.replace("\\", "/")


class BaseManifest(Model):
    manifest_version: str = MANIFEST_VERSION
    id: str = Field(pattern=ID_PATTERN)
    asset_type: AssetType
    name: str
    version: int = Field(1, ge=1)
    description: str = ""
    aliases: list[str] = Field(default_factory=list, description="names this asset is known by, in any language; used for matching")
    tags: list[str] = Field(default_factory=list)
    catalog_code: str | None = Field(None, description="human-facing catalogue code such as CHAR-HUM-0001")
    category: str | None = None
    subcategory: str | None = None
    related_stories: list[str] = Field(default_factory=list, description="story ids from the master story catalogue that use this asset")
    licence: Licence = Field(default_factory=Licence)
    approval_status: ApprovalStatus = ApprovalStatus.pending
    compatibility: dict[str, Any] = Field(default_factory=dict)
    files: list[AssetFile] = Field(default_factory=list)
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat(timespec="seconds"))
    change_summary: str = ""

    def file_entry(self, path: str) -> AssetFile | None:
        for f in self.files:
            if f.path == path:
                return f
        return None

    def files_by_role(self, role: str) -> list[AssetFile]:
        return [f for f in self.files if f.role == role]


# ---------------------------------------------------------------- characters

class PartImage(Model):
    file: str
    svg: str | None = Field(None, description="editable SVG master this runtime PNG was rasterised from")
    origin: tuple[float, float] = Field(description="top-left of the image on the rig canvas, in canvas pixels (y down)")
    size: tuple[float, float]


class RigPart(Model):
    id: str = Field(pattern=ID_PATTERN)
    component: str
    parent: str | None = None
    pivot: tuple[float, float] = Field(description="joint position on the rig canvas (y down)")
    order: int = 0
    variants: dict[str, PartImage] = Field(default_factory=dict)
    default_variant: str | None = None
    rotation_limits: tuple[float, float] | None = None

    @model_validator(mode="after")
    def _default_exists(self) -> "RigPart":
        if self.variants:
            if self.default_variant is None:
                self.default_variant = next(iter(self.variants))
            elif self.default_variant not in self.variants:
                raise ValueError(f"part '{self.id}': default_variant '{self.default_variant}' is not one of its variants")
        return self


class AttachPoint(Model):
    part: str
    point: tuple[float, float]


class PartPose(Model):
    rotation: float = 0.0
    x: float = 0.0
    y: float = 0.0
    sx: float = 1.0
    sy: float = 1.0


class FacialPose(Model):
    """A named face: which image each face part shows, plus small offsets (brows, pupils)."""

    variants: dict[str, str] = Field(default_factory=dict)
    parts: dict[str, PartPose] = Field(default_factory=dict)


class RigDefinition(Model):
    template: str = Field(pattern=ID_PATTERN)
    canvas: tuple[int, int]
    ground: tuple[float, float] = Field(description="canvas point that stands on the character's stage position")
    parts: list[RigPart]
    attach_points: dict[str, AttachPoint] = Field(default_factory=dict)
    talk_part: str = "mouth"
    talk_mode: Literal["variants", "jaw"] = "variants"
    talk_variants: list[str] = Field(default_factory=lambda: ["closed", "small", "open"])
    jaw_part: str | None = None
    jaw_open_degrees: float = 18.0

    def part(self, part_id: str) -> RigPart | None:
        for p in self.parts:
            if p.id == part_id:
                return p
        return None

    def part_ids(self) -> list[str]:
        return [p.id for p in self.parts]


class CharacterManifest(BaseManifest):
    asset_type: Literal[AssetType.character] = AssetType.character
    species: str
    visual_identity: dict[str, Any] = Field(default_factory=dict)
    continuity_rules: list[str] = Field(default_factory=list)
    default_voice: str | None = None
    rig: RigDefinition
    views: dict[str, RigDefinition] = Field(default_factory=dict, description="extra viewing angles of the same character (side, three_quarter, back); `rig` is the front view")
    expressions: dict[str, FacialPose] = Field(default_factory=dict)
    poses: dict[str, dict[str, PartPose]] = Field(default_factory=dict)
    states: list[str] = Field(default_factory=lambda: ["standing"])


# -------------------------------------------------------------- environments

class LayerMotion(Model):
    type: Literal["sway", "scroll", "bob", "drift"]
    amplitude: float = 0.0
    period: float = Field(4.0, gt=0)
    phase: float = 0.0
    speed: float = 0.0
    pivot: tuple[float, float] | None = None
    wind_scaled: bool = False


class EnvironmentLayer(Model):
    id: str = Field(pattern=ID_PATTERN)
    type: Literal["background", "far", "middle", "foreground", "effects", "prop"]
    file: str
    rect: tuple[float, float, float, float] = Field(description="x, y (bottom-left), width, height in stage pixels as seen by the resting camera")
    parallax: float = Field(1.0, gt=0.05, le=2.5, description="how much the layer shifts when the camera does; < 1 is far away")
    order: int = Field(0, description="draw order among layers at the same depth; characters default to 100")
    cover: bool = Field(False, description="the layer must fill the frame at every camera position")
    cover_horizontal: bool = Field(False, description="the layer must span the frame's width (its top or bottom may show)")
    motion: list[LayerMotion] = Field(default_factory=list)
    tint_group: Literal["background", "character", "foliage", "none"] = "background"
    scare: int = Field(0, ge=0, le=2, description="shown only when the scene's scare_level is at least this (0 = always)")
    svg: str | None = Field(None, description="editable SVG master this runtime PNG was rasterised from")


class Anchor(Model):
    x: float
    y: float
    order: int = 100
    scale: float = 1.0
    features: list[str] = Field(default_factory=list)
    description: str = ""


class EnvironmentManifest(BaseManifest):
    asset_type: Literal[AssetType.environment] = AssetType.environment
    stage: tuple[int, int] = (1920, 1080)
    layers: list[EnvironmentLayer]
    anchors: dict[str, Anchor] = Field(default_factory=dict)
    lighting_presets: list[str] = Field(default_factory=lambda: ["day"])
    camera_bounds: tuple[float, float, float, float] | None = Field(
        None, description="left, bottom, right, top on the stage plane: the painted world the camera must stay inside")
    default_anchor_by_role: dict[str, list[str]] = Field(default_factory=dict, description="habitat -> anchors a character of that habitat stands at by default")

    @model_validator(mode="after")
    def _unique_layers(self) -> "EnvironmentManifest":
        ids = [l.id for l in self.layers]
        if len(ids) != len(set(ids)):
            raise ValueError("environment layer ids must be unique")
        return self


# ------------------------------------------------------- props, effects, audio

class PropManifest(BaseManifest):
    asset_type: Literal[AssetType.prop] = AssetType.prop
    file: str
    size: tuple[float, float] = Field(description="size on stage in pixels at scale 1")
    pivot: tuple[float, float] = Field((0.5, 0.0), description="normalised point (u, v from bottom-left) that sits on the position")


class EffectManifest(BaseManifest):
    asset_type: Literal[AssetType.effect] = AssetType.effect
    sprites: dict[str, str] = Field(description="sprite name -> file")
    sprite_size: tuple[float, float] = (64, 64)


class AudioManifest(BaseManifest):
    asset_type: Literal[AssetType.music, AssetType.sound_effect]
    file: str
    duration_seconds: float = Field(gt=0)
    sample_rate: int = 44100
    loopable: bool = False
    gain_db: float = 0.0


class ComponentManifest(BaseManifest):
    """A reusable vector component (tree, rock, building, lamp, ...) with its editable SVG master."""

    asset_type: Literal[AssetType.component] = AssetType.component
    kind: str
    file: str = Field(description="transparent runtime PNG")
    svg: str = Field(description="editable SVG master")
    size: tuple[float, float] = Field(description="size of the PNG in pixels")


class RigTemplate(Model):
    """What a family of rigs has in common; animations target templates, not characters."""

    id: str = Field(pattern=ID_PATTERN)
    name: str
    description: str = ""
    components: dict[str, list[str]] = Field(description="standard component -> part ids that realise it")
    optional_parts: list[str] = Field(default_factory=list)
    optional_components: list[str] = Field(default_factory=list, description="standard components this family may leave out (a snake has no limbs)")
    has_tail: bool = True
    states: list[str] = Field(default_factory=lambda: ["standing"])

    def required_parts(self) -> list[str]:
        out: list[str] = []
        for parts in self.components.values():
            out.extend(p for p in parts if p not in out)
        return out


MANIFEST_MODELS: dict[AssetType, type[BaseManifest]] = {
    AssetType.character: CharacterManifest,
    AssetType.environment: EnvironmentManifest,
    AssetType.prop: PropManifest,
    AssetType.effect: EffectManifest,
    AssetType.component: ComponentManifest,
    AssetType.music: AudioManifest,
    AssetType.sound_effect: AudioManifest,
}
