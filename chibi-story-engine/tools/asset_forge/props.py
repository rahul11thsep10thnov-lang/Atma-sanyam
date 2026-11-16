"""Props and effect sprites."""
from __future__ import annotations

from pathlib import Path

from .svg import Art, darken, lighten


def jamun_bunch() -> Art:
    a = Art(160, 160)
    a.path("M 80 18 Q 70 50 80 70", None, "#5a7a2a", 7)
    a.ellipse(104, 34, 26, 12, "#5fae4e", "#2f6a2a", 4, rotate=-25)
    for x, y in ((58, 84), (100, 82), (80, 112), (44, 116), (116, 116), (80, 142)):
        a.circle(x, y, 22, a.radial("#7d55b8", "#3a1f66"), "#24123f", 4)
        a.circle(x - 7, y - 8, 6, "#ffffff", opacity=0.6)
    return a


def money_bag() -> Art:
    a = Art(200, 220)
    a.path("M 70 60 Q 100 40 130 60 L 124 84 L 76 84 Z", "#b58a4a", "#5a3d18", 5)
    a.path("M 76 84 Q 10 150 60 200 Q 100 214 140 200 Q 190 150 124 84 Z", a.shaded("#c99a55"), "#5a3d18", 6)
    a.path("M 72 86 L 128 86", None, "#7a2e2e", 8)
    a.circle(100, 150, 24, "#ffd84a", "#a8801a", 5)
    return a


def food_plate() -> Art:
    a = Art(220, 140)
    a.ellipse(110, 100, 100, 30, a.shaded("#e6e6ea"), "#7a7a86", 5)
    for x, c in ((70, "#f0c070"), (110, "#f6d28a"), (150, "#eab860")):
        a.ellipse(x, 78, 30, 20, a.shaded(c), darken(c, 0.5), 4)
    return a


PROPS = [
    ("jamun_bunch_001", "Bunch of jamun fruit", ["jamun", "fruit"], ["जामुन", "jamun"], jamun_bunch, (110, 110)),
    ("money_bag_001", "Bag of gold coins", ["money"], ["थैली", "धन", "money bag"], money_bag, (130, 143)),
    ("food_plate_001", "Plate of rotis", ["food"], ["रोटी", "भोजन", "food"], food_plate, (150, 95)),
]


def _droplet() -> Art:
    a = Art(64, 64)
    a.path("M 32 4 Q 54 34 48 46 Q 40 60 32 60 Q 24 60 16 46 Q 10 34 32 4 Z", a.radial("#e9fbff", "#7fd0ee"), "#3d8fc0", 3)
    return a


def _ring() -> Art:
    a = Art(256, 64)
    a.ellipse(128, 32, 118, 24, None, "#ffffff", 7, 0.9)
    a.ellipse(128, 32, 84, 15, None, "#ffffff", 4, 0.6)
    return a


def _leaf() -> Art:
    a = Art(96, 64)
    a.path("M 6 34 Q 40 2 90 30 Q 44 62 6 34 Z", a.shaded("#6fbf55"), "#2f6a2a", 4)
    a.path("M 10 34 L 84 30", None, "#2f6a2a", 3)
    return a


def _sparkle() -> Art:
    a = Art(64, 64)
    a.path("M 32 2 Q 36 28 62 32 Q 36 36 32 62 Q 28 36 2 32 Q 28 28 32 2 Z", "#fff6b0", "#f2c230", 3)
    return a


def _heart() -> Art:
    a = Art(64, 64)
    a.path("M 32 56 Q 2 34 8 16 Q 18 2 32 18 Q 46 2 56 16 Q 62 34 32 56 Z", a.shaded("#ff6f91"), "#b52f55", 4)
    return a


def _puff() -> Art:
    a = Art(96, 96)
    for x, y, r in ((36, 54, 26), (60, 52, 24), (48, 36, 24)):
        a.circle(x, y, r, "#efe6d4", opacity=0.9)
    return a


def _streak() -> Art:
    a = Art(8, 96)
    a.rect(1, 0, 6, 96, a.linear([(0, "#ffffff"), (1, "#bfe6ff")], opacity=[0.1, 0.9]), rx=3)
    return a


EFFECT_SPRITES = {"droplet": _droplet, "ring": _ring, "leaf": _leaf, "sparkle": _sparkle, "heart": _heart, "puff": _puff, "streak": _streak}


def build_prop(pid, name, tags, aliases, draw, size, out: Path) -> dict:
    out.mkdir(parents=True, exist_ok=True)
    draw().render().save(out / "prop.png", optimize=True)
    return {"id": pid, "asset_type": "prop", "name": name, "tags": tags, "aliases": aliases, "file": "prop.png",
            "size": list(size), "pivot": [0.5, 0.5], "description": name}


def build_effects(out: Path) -> dict:
    (out / "sprites").mkdir(parents=True, exist_ok=True)
    for name, draw in EFFECT_SPRITES.items():
        draw().render().save(out / "sprites" / f"{name}.png", optimize=True)
    return {"id": "particles_001", "asset_type": "effect", "name": "Particle sprites", "tags": ["particles"],
            "description": "Sprites used by the built-in effects (splash, ripples, leaves, sparkles, hearts, dust, rain).",
            "sprites": {name: f"sprites/{name}.png" for name in EFFECT_SPRITES}}
