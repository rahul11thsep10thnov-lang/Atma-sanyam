"""A light, serialisable summary of the asset library used for matching and validation.

Story intelligence and validation depend on this view instead of the library itself,
so they can be tested (and run) without touching the filesystem.
"""
from __future__ import annotations

import unicodedata

from pydantic import BaseModel, Field


def norm_name(value: str) -> str:
    return unicodedata.normalize("NFC", value).strip().lower().replace("_", " ")


class CharacterEntry(BaseModel):
    id: str
    name: str
    species: str
    version: int = 1
    versions: list[int] = Field(default_factory=lambda: [1])
    aliases: list[str] = Field(default_factory=list)
    rig_template: str = "biped_chibi"
    habitat: str = "ground"
    parts: list[str] = Field(default_factory=list)
    expressions: list[str] = Field(default_factory=list)
    poses: list[str] = Field(default_factory=list)
    attach_points: list[str] = Field(default_factory=list)
    default_voice: str | None = None
    approved: bool = False
    category: str | None = None
    subcategory: str | None = None
    catalog_code: str | None = None

    def names(self) -> set[str]:
        return {norm_name(a) for a in [self.id, self.name, *self.aliases]}


class AnchorEntry(BaseModel):
    x: float
    y: float
    order: int = 100
    scale: float = 1.0
    features: list[str] = Field(default_factory=list)


class EnvironmentEntry(BaseModel):
    id: str
    name: str
    version: int = 1
    versions: list[int] = Field(default_factory=lambda: [1])
    tags: list[str] = Field(default_factory=list)
    aliases: list[str] = Field(default_factory=list)
    anchors: dict[str, AnchorEntry] = Field(default_factory=dict)
    default_anchor_by_role: dict[str, list[str]] = Field(default_factory=dict)
    habitats: list[str] = Field(default_factory=list)
    lighting_presets: list[str] = Field(default_factory=lambda: ["day"])
    ambience: str | None = None
    approved: bool = False
    category: str | None = None
    subcategory: str | None = None
    catalog_code: str | None = None
    scare_levels: list[int] = Field(default_factory=lambda: [0, 1, 2])
    composition: str | None = None

    def anchor_with(self, feature: str, exclude: set[str] | None = None) -> str | None:
        """First anchor that has a feature, preferring ones nobody stands on."""
        names = [name for name, a in self.anchors.items() if feature in a.features]
        free = [n for n in names if not exclude or n not in exclude]
        return (free or names or [None])[0]


class AnimationEntry(BaseModel):
    code: str
    category: str
    level: int = 2
    rigs: list[str]
    semantics: list[str] = Field(default_factory=list)
    duration: float = 1.0
    loop: bool = False
    additive: bool = False
    start_states: list[str] = Field(default_factory=lambda: ["*"])
    end_state: str | None = None
    requires_feature: str | None = None
    requires_prop: bool = False
    travels: bool = False


class SimpleEntry(BaseModel):
    id: str
    name: str = ""
    version: int = 1
    tags: list[str] = Field(default_factory=list)
    aliases: list[str] = Field(default_factory=list)
    duration: float | None = None
    approved: bool = False


class LibraryIndex(BaseModel):
    characters: list[CharacterEntry] = Field(default_factory=list)
    environments: list[EnvironmentEntry] = Field(default_factory=list)
    animations: list[AnimationEntry] = Field(default_factory=list)
    props: list[SimpleEntry] = Field(default_factory=list)
    effects: list[str] = Field(default_factory=list)
    music: list[SimpleEntry] = Field(default_factory=list)
    sound_effects: list[SimpleEntry] = Field(default_factory=list)
    lighting_presets: list[str] = Field(default_factory=lambda: ["day"])
    camera_presets: list[str] = Field(default_factory=list)

    def character(self, cid: str) -> CharacterEntry | None:
        return next((c for c in self.characters if c.id == cid), None)

    def environment(self, eid: str) -> EnvironmentEntry | None:
        return next((e for e in self.environments if e.id == eid), None)

    def animation(self, code: str) -> AnimationEntry | None:
        return next((a for a in self.animations if a.code == code), None)

    def animation_for(self, semantic: str, rig: str) -> AnimationEntry | None:
        """First clip that can drive `rig` and means `semantic` (exact code wins)."""
        exact = self.animation(semantic)
        if exact and rig in exact.rigs:
            return exact
        return next((a for a in self.animations if rig in a.rigs and semantic in a.semantics), None)

    def prop(self, pid: str) -> SimpleEntry | None:
        return next((p for p in self.props if p.id == pid), None)

    def by_tag(self, items: list[SimpleEntry], tag: str) -> SimpleEntry | None:
        return next((i for i in items if tag in i.tags or i.id == tag), None)
