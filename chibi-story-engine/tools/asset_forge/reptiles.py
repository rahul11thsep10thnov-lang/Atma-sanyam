"""Species-specific rigs for reptiles: articulated quadruped (crocodile, lizard), shelled (turtle, tortoise), serpentine (snake).

None of these uses the biped rig. All are side views facing right (the character's `primary_view` is `side`).

quadruped_reptile (extended, backward compatible): body (hips) -> chest (shoulders) -> neck -> head -> jaw; tail -> tail_mid -> tail_tip;
    four independent legs (hips on body, shoulders on chest). Version 1 crocodiles, which lack chest/neck/tail segments, still load.
chelonian: shell body, neck that extends and retracts behind a shell lip, four limbs, tail, jaw.
serpentine_reptile: a chain of body segments (body, seg1..seg7), neck, head, jaw and a tongue.

The original crocodile art is reused slice by slice (clip regions of the very same SVG drawing), so the upgrade is not a redraw.
"""
from __future__ import annotations

import math
from dataclasses import dataclass, field
from pathlib import Path

from .characters import (INK, RH, RW, R_EYE, R_GROUND, ReptileSpec, _outline, reptile_body, reptile_brow, reptile_eyes, reptile_head, reptile_jaw, reptile_leg,
                         reptile_pupils, reptile_tail)
from .characters_ext import _save_part
from .svg import Art, darken, lighten, mix

CW, CH = 760, 520                  # chelonian canvas
C_GROUND = (380, 470)
SW, SH = 1000, 480                 # serpent canvas
S_GROUND = (500, 430)
EYE_VARIANTS = ("open", "closed", "happy", "wide", "sad", "angry", "half", "tear")


def clipped(art: Art, x0: float, x1: float, y0: float = -50, y1: float = 2000, cid: str = "c") -> Art:
    """The same drawing, limited to a rectangle: used to cut one drawing into articulated pieces."""
    out = Art(art.w, art.h)
    out.defs = list(art.defs) + [f'<clipPath id="{cid}"><rect x="{x0}" y="{y0}" width="{x1 - x0}" height="{y1 - y0}"/></clipPath>']
    out._n = art._n
    out.items = [f'<g clip-path="url(#{cid})">', *art.items, "</g>"]
    return out


FACES15 = {
    "neutral": {"variants": {"eyes": "open", "pupils": "normal"}},
    "happy": {"variants": {"eyes": "happy", "pupils": "none"}, "parts": {"jaw": {"rotation": -5}, "brow": {"y": 5}}},
    "sad": {"variants": {"eyes": "sad", "pupils": "normal"}, "parts": {"brow": {"rotation": 16}, "pupils": {"y": -4}, "head": {"rotation": -5}}},
    "surprised": {"variants": {"eyes": "wide", "pupils": "small"}, "parts": {"jaw": {"rotation": -13}, "brow": {"y": 12}}},
    "angry": {"variants": {"eyes": "angry", "pupils": "normal"}, "parts": {"brow": {"rotation": -18, "y": -6}}},
    "worried": {"variants": {"eyes": "wide", "pupils": "small"}, "parts": {"brow": {"rotation": 18, "y": 6}, "jaw": {"rotation": -4}}},
    "thinking": {"variants": {"eyes": "open", "pupils": "normal"}, "parts": {"pupils": {"x": 6, "y": 8}, "brow": {"y": 8}}},
    "laughing": {"variants": {"eyes": "happy", "pupils": "none"}, "parts": {"jaw": {"rotation": -16}, "head": {"rotation": 5}}},
    "speaking": {"variants": {"eyes": "open", "pupils": "normal"}, "parts": {"jaw": {"rotation": -6}}},
    "crying": {"variants": {"eyes": "tear", "pupils": "none"}, "parts": {"jaw": {"rotation": -9}, "brow": {"rotation": 20, "y": 4}, "head": {"rotation": -9}}},
    "frightened": {"variants": {"eyes": "wide", "pupils": "small"}, "parts": {"brow": {"rotation": 22, "y": 14}, "jaw": {"rotation": -7}, "pupils": {"y": -4}}},
    "suspicious": {"variants": {"eyes": "half", "pupils": "normal"}, "parts": {"pupils": {"x": 8, "y": 5}, "brow": {"rotation": -10, "y": -2}}},
    "excited": {"variants": {"eyes": "wide", "pupils": "normal"}, "parts": {"jaw": {"rotation": -12}, "brow": {"y": 12}, "head": {"rotation": 4}}},
    "disappointed": {"variants": {"eyes": "half", "pupils": "normal"}, "parts": {"pupils": {"y": 8}, "brow": {"rotation": 10, "y": 3}, "head": {"rotation": -7}}},
    "determined": {"variants": {"eyes": "angry", "pupils": "small"}, "parts": {"brow": {"rotation": -14, "y": -8}, "jaw": {"rotation": -2}}},
}


def eyes_ext(s, variant: str, eye=R_EYE, w=RW, h=RH, rx=30, ry=34) -> Art:
    """The six original eye drawings plus 'half' (lids) and 'tear'."""
    if variant in ("open", "closed", "happy", "wide", "sad", "angry"):
        return reptile_eyes(s, variant)
    a = Art(w, h)
    cx, cy = eye
    a.ellipse(cx, cy, rx, ry, "#ffffff", INK, 6)
    a.defs.append(f'<clipPath id="lidr"><ellipse cx="{cx}" cy="{cy}" rx="{rx}" ry="{ry}"/></clipPath>')
    a.raw('<g clip-path="url(#lidr)">')
    if variant == "half":
        a.rect(cx - 40, cy - 50, 80, 52, s.skin, None, 0)
        a.path(f"M {cx - 36} {cy + 2} L {cx + 36} {cy + 2}", None, INK, 6)
    else:
        a.poly([(cx - 40, cy - 46), (cx + 40, cy - 46), (cx + 40, cy - 34), (cx - 40, cy - 6)], s.skin)
        a.path(f"M {cx - 40} {cy - 6} L {cx + 40} {cy - 34}", None, INK, 6)
    a.raw("</g>")
    a.ellipse(cx, cy, rx, ry, None, INK, 6)
    if variant == "tear":
        a.path(f"M {cx + 4} {cy + 30} Q {cx - 8} {cy + 64} {cx + 4} {cy + 82} Q {cx + 16} {cy + 64} {cx + 4} {cy + 30} Z", "#7fc8f0", "#3a7ab0", 3, 0.9)
    return a


QUAD_POSES = {
    "standing": {}, "walking": {"leg_fl": {"rotation": 22}, "leg_br": {"rotation": 22}, "leg_fr": {"rotation": -22}, "leg_bl": {"rotation": -22}, "tail": {"rotation": 8}, "tail_mid": {"rotation": -10}},
    "running": {"leg_fl": {"rotation": 40}, "leg_br": {"rotation": 40}, "leg_fr": {"rotation": -40}, "leg_bl": {"rotation": -40}, "chest": {"rotation": -5}, "tail": {"rotation": 14}, "root": {"y": 8}},
    "sitting": {"root": {"y": -8}, "leg_bl": {"rotation": 50}, "leg_br": {"rotation": 50}, "chest": {"rotation": 8}, "tail": {"rotation": -8}},
    "sleeping": {"root": {"y": -14}, "leg_fl": {"rotation": 55}, "leg_fr": {"rotation": 55}, "leg_bl": {"rotation": 55}, "leg_br": {"rotation": 55}, "head": {"rotation": -14}, "neck": {"rotation": -8}},
    "jumping": {"root": {"y": 44}, "leg_fl": {"rotation": -45}, "leg_fr": {"rotation": -45}, "leg_bl": {"rotation": 40}, "leg_br": {"rotation": 40}, "chest": {"rotation": 10}, "tail": {"rotation": 18}},
    "talking": {"head": {"rotation": 4}, "jaw": {"rotation": -8}},
    "pointing": {"leg_fr": {"rotation": 82}, "head": {"rotation": 6}},
    "waving": {"leg_fr": {"rotation": 100}, "head": {"rotation": 5}},
    "fighting": {"chest": {"rotation": 10}, "head": {"rotation": 6}, "jaw": {"rotation": -26}, "leg_fl": {"rotation": 70}, "leg_fr": {"rotation": 70}, "tail": {"rotation": 18}},
    "dancing": {"body": {"rotation": 6}, "chest": {"rotation": -10}, "leg_fl": {"rotation": 50}, "leg_br": {"rotation": -35}, "tail": {"rotation": 20}, "tail_mid": {"rotation": -24}, "head": {"rotation": 6}},
    "kneeling": {"chest": {"y": -16, "rotation": 8}, "leg_fl": {"rotation": 60}, "leg_fr": {"rotation": 60}, "head": {"rotation": -6}},
    "falling": {"root": {"rotation": -34, "y": -10}, "leg_fl": {"rotation": 60}, "leg_fr": {"rotation": 60}, "leg_bl": {"rotation": -50}, "leg_br": {"rotation": -50}, "tail": {"rotation": 24}},
    "climbing": {"body": {"rotation": 22}, "chest": {"rotation": 6}, "leg_fl": {"rotation": 62}, "leg_br": {"rotation": 40}, "leg_fr": {"rotation": -10}, "leg_bl": {"rotation": -20}},
    "holding_object": {"leg_fr": {"rotation": 58}, "head": {"rotation": 4}},
}


@dataclass
class RepSpec:
    id: str
    name: str
    species: str
    family: str                       # quad | chelonian | serpent
    aliases: list[str]
    description: str
    voice: str
    skin: str
    belly: str
    accent: str                       # spikes / shell pattern / scale pattern
    iris: str = "#c98a1a"
    lashes: bool = False
    flower: str | None = None
    lips: str | None = None
    stage_scale: float = 0.6
    habitat: str = "ground"
    shell: str | None = None
    category: str = "animal"
    subcategory: str = "reptile"
    code: str = ""
    stories: list[str] = field(default_factory=list)
    identity_notes: list[str] = field(default_factory=list)
    original: ReptileSpec | None = None


# ------------------------------------------------------------------------------------------------ quadruped
def _croc_view(s: RepSpec) -> ReptileSpec:
    return s.original or ReptileSpec(s.id, s.name, s.species, s.aliases, s.description, s.skin, s.belly, s.voice, s.accent, s.iris, s.lashes, s.flower, s.lips,
                                     s.stage_scale, s.habitat, s.identity_notes)


def lizard_body(s: RepSpec) -> Art:
    a = Art(RW, RH)
    o = _outline(s.skin)
    for x in range(300, 560, 40):
        a.poly([(x, 248), (x + 14, 228), (x + 28, 248)], a.shaded(s.accent), _outline(s.accent), 4)
    a.path("M 270 316 Q 270 250 380 250 L 560 250 Q 640 254 640 316 Q 640 372 560 374 L 340 374 Q 270 370 270 316 Z", a.shaded(s.skin), o)
    a.path("M 296 346 Q 450 366 622 340 Q 616 372 560 372 L 340 372 Q 300 368 296 346 Z", s.belly, None, opacity=0.95)
    for x in (330, 410, 490, 560):
        a.ellipse(x, 290, 12, 8, s.accent, None, opacity=0.55)
    return a


def lizard_tail(s: RepSpec) -> Art:
    a = Art(RW, RH)
    a.path("M 290 262 Q 170 270 20 360 Q 180 352 290 366 Z", a.shaded(s.skin), _outline(s.skin))
    a.path("M 286 346 Q 170 350 40 356 Q 180 360 288 364 Z", s.belly, None, opacity=0.9)
    for x in (230, 170, 110, 60):
        a.ellipse(x, 312 + (230 - x) * 0.12, 8, 5, s.accent, None, opacity=0.55)
    return a


def lizard_leg(s: RepSpec, x: float, far: bool) -> Art:
    a = Art(RW, RH)
    c = darken(s.skin, 0.2) if far else s.skin
    a.path(f"M {x - 22} 340 L {x + 22} 340 L {x + 16} 392 L {x - 14} 392 Z", a.shaded(c), _outline(c))
    a.ellipse(x + 6, 400, 36, 13, a.shaded(c), _outline(c))
    for dx in (-18, -2, 14, 28):
        a.path(f"M {x + dx} 404 L {x + dx + 8} 416", None, "#fff7e0", 5)
    return a


def lizard_head(s: RepSpec) -> Art:
    a = Art(RW, RH)
    o = _outline(s.skin)
    a.circle(R_EYE[0], R_EYE[1] + 4, 48, a.shaded(s.skin), o)
    a.path("M 604 300 Q 596 214 680 216 Q 744 224 770 252 Q 792 270 772 292 Q 760 300 736 300 Z", a.shaded(s.skin), o)
    a.circle(762, 258, 4, INK)
    a.path("M 640 300 Q 700 306 770 296", None, darken(s.skin, 0.5), 5)
    a.path("M 650 300 Q 690 350 640 372 Q 610 340 620 300 Z", a.shaded(s.accent), _outline(s.accent), 4)       # throat fan
    return a


def lizard_jaw(s: RepSpec) -> Art:
    a = Art(RW, RH)
    a.path("M 610 298 L 766 298 Q 780 302 770 316 Q 710 334 640 332 Q 604 326 610 298 Z", a.shaded(lighten(s.belly, 0.05)), _outline(s.skin))
    return a


def build_quad(s: RepSpec, out: Path) -> tuple[list[dict], dict]:
    croc = s.family == "quad" and s.species in ("crocodile", "alligator")
    spec = _croc_view(s)
    body_art = reptile_body(spec) if croc else lizard_body(s)
    tail_art = reptile_tail(spec) if croc else lizard_tail(s)
    leg = (lambda x, far: reptile_leg(spec, x, far)) if croc else (lambda x, far: lizard_leg(s, x, far))
    head_art = reptile_head(spec) if croc else lizard_head(s)
    jaw_art = reptile_jaw(spec) if croc else lizard_jaw(s)
    parts: list[dict] = []

    def part(pid, comp, parent, pivot, order, drawings, limits=None):
        variants = {}
        for vname, art in drawings.items():
            origin, size = _save_part(art, out, f"{pid}_{vname}")
            variants[vname] = {"file": f"rig/{pid}_{vname}.png", "svg": f"rig/{pid}_{vname}.svg", "origin": origin, "size": size}
        parts.append({"id": pid, "component": comp, "parent": parent, "pivot": list(pivot), "order": order, "variants": variants, "rotation_limits": limits})

    parts.append({"id": "root", "component": "root", "parent": None, "pivot": list(R_GROUND), "order": 0, "variants": {}})
    part("tail", "tail", "body", (286, 300), -3, {"base": clipped(tail_art, 170, 300, cid="t0")}, [-40, 40])
    part("tail_mid", "tail", "tail", (180, 312), -3, {"base": clipped(tail_art, 80, 190, cid="t1")}, [-45, 45])
    part("tail_tip", "tail", "tail_mid", (92, 326), -3, {"base": clipped(tail_art, 0, 100, cid="t2")}, [-50, 50])
    part("leg_bl", "left_leg", "body", (300, 342), -2, {"base": leg(300, True)}, [-60, 60])
    part("leg_fl", "left_arm", "chest", (540, 342), -2, {"base": leg(540, True)}, [-60, 100])
    part("body", "body", "root", (450, 380), 0, {"base": clipped(body_art, -50, 455, cid="b0")}, [-20, 20])
    part("chest", "body", "body", (450, 300), 0, {"base": clipped(body_art, 440, 585, cid="b1")}, [-18, 18])
    part("neck", "neck", "chest", (580, 300), 1, {"base": clipped(body_art, 570, 700, cid="b2")}, [-30, 30])
    part("leg_br", "right_leg", "body", (350, 346), 2, {"base": leg(350, False)}, [-60, 60])
    part("leg_fr", "right_arm", "chest", (590, 346), 2, {"base": leg(590, False)}, [-60, 110])
    part("jaw", "mouth", "head", (622, 300), 3, {"base": jaw_art}, [-32, 4])
    part("head", "head", "neck", (620, 290), 4, {"base": head_art}, [-30, 30])
    part("eyes", "eyes", "head", R_EYE, 6, {v: eyes_ext(spec, v) for v in EYE_VARIANTS})
    part("pupils", "eyes", "eyes", R_EYE, 7, {v: reptile_pupils(spec, v) for v in ("normal", "small")})
    part("brow", "eyebrows", "head", (R_EYE[0], 146), 8, {"base": reptile_brow(spec)}, [-40, 40])
    sn = 800 if croc else 744
    rig = {"template": "quadruped_reptile", "canvas": [RW, RH], "ground": list(R_GROUND), "parts": parts,
           "attach_points": {"back": {"part": "body", "point": [440, 232]}, "mouth": {"part": "head", "point": [sn, 306]},
                             "hand": {"part": "leg_fr", "point": [598, 398]}, "head_top": {"part": "head", "point": [668, 150]}},
           "talk_part": "jaw", "talk_mode": "jaw", "jaw_part": "jaw", "jaw_open_degrees": -17.0}
    return parts, rig


# ------------------------------------------------------------------------------------------------ chelonian
def shell_art(s: RepSpec, tall: bool) -> Art:
    a = Art(CW, CH)
    top = 230 if tall else 300
    sc = s.shell or s.skin
    o = _outline(sc)
    a.path(f"M 150 410 Q 150 {top} 380 {top} Q 610 {top} 610 410 Z", a.shaded(sc), o, 7)
    a.path("M 138 410 L 622 410 Q 626 432 600 438 L 160 438 Q 134 432 138 410 Z", a.shaded(s.belly), _outline(s.belly), 5)       # lower rim / plastron edge
    cols = 5
    for i in range(cols):                                                                                                       # scutes
        x = 190 + i * 80
        h = (410 - top) * (0.55 + 0.45 * math.sin(math.pi * (x - 150) / 460))
        a.path(f"M {x} 410 Q {x + 6} {410 - h} {x + 40} {410 - h - 6} Q {x + 76} {410 - h} {x + 80} 410", None, s.accent, 5, 0.9)
    a.path(f"M 180 {top + 70} Q 380 {top + 40} 580 {top + 70}", None, s.accent, 5, 0.8)
    for i in range(4):
        a.circle(230 + i * 100, top + 80 + (i % 2) * 22, 8, s.accent, None, opacity=0.5)
    return a


def chel_leg(s: RepSpec, x: float, far: bool, flipper: bool) -> Art:
    a = Art(CW, CH)
    c = darken(s.skin, 0.2) if far else s.skin
    if flipper:
        a.path(f"M {x - 24} 400 Q {x - 40} 450 {x + 10} 474 Q {x + 50} 470 {x + 40} 420 Q {x + 20} 396 {x - 24} 400 Z", a.shaded(c), _outline(c), 5)
        for dx in (0, 16, 30):
            a.path(f"M {x + dx} 462 L {x + dx + 4} 474", None, "#fff7e0", 4)
    else:
        a.rect(x - 28, 396, 56, 76, a.shaded(c), _outline(c), rx=22)
        a.ellipse(x + 4, 474, 38, 14, a.shaded(c), _outline(c))
        for dx in (-14, 4, 22):
            a.circle(x + dx, 480, 5, "#fff7e0")
    return a


def chel_neck(s: RepSpec) -> Art:
    a = Art(CW, CH)
    a.path("M 560 330 Q 600 300 660 318 Q 668 380 636 404 Q 590 410 556 396 Z", a.shaded(s.skin), _outline(s.skin))
    for y in (340, 362, 384):
        a.path(f"M 572 {y} Q 610 {y + 10} 650 {y - 6}", None, darken(s.skin, 0.2), 4, 0.6)
    return a


def chel_head(s: RepSpec) -> Art:
    a = Art(CW, CH)
    o = _outline(s.skin)
    a.path("M 612 320 Q 606 260 664 258 Q 736 262 752 306 Q 756 330 730 334 L 640 336 Z", a.shaded(s.skin), o)
    a.circle(704, 296, 5, INK)
    a.ellipse(664, 320, 16, 10, "#ff8f8f", None, opacity=0.4)
    return a


def chel_jaw(s: RepSpec) -> Art:
    a = Art(CW, CH)
    a.path("M 630 330 L 740 330 Q 752 336 742 350 Q 690 366 648 358 Q 624 352 630 330 Z", a.shaded(lighten(s.belly, 0.05)), _outline(s.skin))
    return a


def chel_tail(s: RepSpec) -> Art:
    a = Art(CW, CH)
    a.path("M 160 380 Q 110 392 80 420 Q 130 416 168 408 Z", a.shaded(s.skin), _outline(s.skin))
    return a


def shell_lip(s: RepSpec) -> Art:
    """The front rim of the shell: drawn over the neck so a retracted head disappears behind it."""
    a = Art(CW, CH)
    sc = s.shell or s.skin
    a.path("M 540 410 Q 590 340 604 300 Q 622 360 616 412 Z", a.shaded(sc), _outline(sc), 6)
    return a


CEYE = (690, 290)


def chel_eyes(s: RepSpec, variant: str) -> Art:
    a = Art(CW, CH)
    cx, cy = CEYE
    if variant in ("open", "sad", "angry", "half", "tear", "wide"):
        r = (26, 32) if variant == "wide" else (24, 28)
        a.ellipse(cx, cy, *r, "#ffffff", INK, 6)
        if variant in ("sad", "angry", "half", "tear"):
            a.defs.append('<clipPath id="cl"><ellipse cx="%d" cy="%d" rx="24" ry="28"/></clipPath>' % (cx, cy))
            a.raw('<g clip-path="url(#cl)">')
            if variant == "half":
                a.rect(cx - 30, cy - 40, 60, 42, s.skin, None, 0)
            elif variant == "angry":
                a.poly([(cx - 30, cy - 40), (cx + 30, cy - 40), (cx + 30, cy - 4), (cx - 30, cy - 30)], s.skin)
            else:
                a.poly([(cx - 30, cy - 40), (cx + 30, cy - 40), (cx + 30, cy - 28), (cx - 30, cy - 4)], s.skin)
            a.raw("</g>")
            a.ellipse(cx, cy, 24, 28, None, INK, 6)
        if variant == "tear":
            a.path(f"M {cx + 4} {cy + 26} Q {cx - 6} {cy + 56} {cx + 4} {cy + 70} Q {cx + 14} {cy + 56} {cx + 4} {cy + 26} Z", "#7fc8f0", "#3a7ab0", 3, 0.9)
    elif variant == "closed":
        a.path(f"M {cx - 24} {cy + 2} Q {cx} {cy + 22} {cx + 24} {cy + 2}", None, INK, 7)
    elif variant == "happy":
        a.path(f"M {cx - 24} {cy + 10} Q {cx} {cy - 22} {cx + 24} {cy + 10}", None, INK, 7)
    return a


def chel_pupils(s: RepSpec, variant: str) -> Art:
    a = Art(CW, CH)
    r = 16 if variant == "normal" else 10
    x, y = CEYE[0] + 4, CEYE[1] + 3
    a.circle(x, y, r, a.radial(lighten(s.iris, 0.3), darken(s.iris, 0.25)), INK, 3)
    a.circle(x, y, r * 0.5, "#140c08")
    a.circle(x - r * 0.35, y - r * 0.4, r * 0.3, "#ffffff")
    return a


def chel_brow(s: RepSpec) -> Art:
    a = Art(CW, CH)
    a.path(f"M {CEYE[0] - 24} 252 Q {CEYE[0]} 240 {CEYE[0] + 26} 254", None, darken(s.skin, 0.6), 8)
    return a


CHEL_POSES = {
    "standing": {}, "walking": {"leg_fl": {"rotation": 20}, "leg_br": {"rotation": 20}, "leg_fr": {"rotation": -20}, "leg_bl": {"rotation": -20}, "body": {"y": 4}},
    "running": {"leg_fl": {"rotation": 34}, "leg_br": {"rotation": 34}, "leg_fr": {"rotation": -34}, "leg_bl": {"rotation": -34}, "neck": {"x": 14}, "root": {"y": 6}},
    "sitting": {"root": {"y": -8}, "leg_bl": {"rotation": 40}, "leg_br": {"rotation": 40}},
    "sleeping": {"neck": {"x": -70}, "head": {"sx": 0.9}, "leg_fl": {"rotation": 50}, "leg_fr": {"rotation": 50}, "leg_bl": {"rotation": 50}, "leg_br": {"rotation": 50}, "root": {"y": -8}},
    "jumping": {"root": {"y": 36}, "leg_fl": {"rotation": -40}, "leg_fr": {"rotation": -40}, "leg_bl": {"rotation": 40}, "leg_br": {"rotation": 40}},
    "talking": {"head": {"rotation": 4}, "jaw": {"rotation": -8}, "neck": {"x": 10}},
    "pointing": {"leg_fr": {"rotation": 85}, "neck": {"x": 16}},
    "waving": {"leg_fr": {"rotation": 105}, "neck": {"x": 10}},
    "fighting": {"neck": {"x": 24, "rotation": 6}, "jaw": {"rotation": -24}, "leg_fl": {"rotation": 60}, "leg_fr": {"rotation": 60}},
    "dancing": {"body": {"rotation": 6, "y": 6}, "leg_fl": {"rotation": 50}, "leg_br": {"rotation": -36}, "neck": {"x": 10}, "head": {"rotation": 8}},
    "kneeling": {"leg_fl": {"rotation": 60}, "leg_fr": {"rotation": 60}, "neck": {"rotation": -6}, "root": {"y": -6}},
    "falling": {"root": {"rotation": -30, "y": -10}, "leg_fl": {"rotation": 60}, "leg_fr": {"rotation": 60}, "leg_bl": {"rotation": -50}, "leg_br": {"rotation": -50}},
    "climbing": {"body": {"rotation": 18}, "leg_fl": {"rotation": 60}, "leg_br": {"rotation": 40}, "leg_fr": {"rotation": -10}, "leg_bl": {"rotation": -20}},
    "holding_object": {"leg_fr": {"rotation": 60}},
}


def build_chel(s: RepSpec, out: Path) -> tuple[list[dict], dict]:
    tall = s.species == "tortoise"
    parts: list[dict] = []

    def part(pid, comp, parent, pivot, order, drawings, limits=None):
        variants = {}
        for vname, art in drawings.items():
            origin, size = _save_part(art, out, f"{pid}_{vname}")
            variants[vname] = {"file": f"rig/{pid}_{vname}.png", "svg": f"rig/{pid}_{vname}.svg", "origin": origin, "size": size}
        parts.append({"id": pid, "component": comp, "parent": parent, "pivot": list(pivot), "order": order, "variants": variants, "rotation_limits": limits})

    parts.append({"id": "root", "component": "root", "parent": None, "pivot": list(C_GROUND), "order": 0, "variants": {}})
    part("tail", "tail", "body", (166, 396), -3, {"base": chel_tail(s)}, [-40, 40])
    part("leg_bl", "left_leg", "body", (230, 404), -2, {"base": chel_leg(s, 230, True, not tall)}, [-60, 60])
    part("leg_fl", "left_arm", "body", (500, 404), -2, {"base": chel_leg(s, 500, True, not tall)}, [-60, 100])
    part("neck", "neck", "body", (566, 372), -1, {"base": chel_neck(s)}, [-30, 30])
    part("head", "head", "neck", (630, 330), 0, {"base": chel_head(s)}, [-30, 30])
    part("jaw", "mouth", "head", (632, 334), 1, {"base": chel_jaw(s)}, [-30, 4])
    part("body", "body", "root", (380, 410), 1, {"base": shell_art(s, tall)}, [-18, 18])
    part("shell_lip", "body", "body", (570, 400), 3, {"base": shell_lip(s)})
    part("leg_br", "right_leg", "body", (270, 406), 4, {"base": chel_leg(s, 270, False, not tall)}, [-60, 60])
    part("leg_fr", "right_arm", "body", (540, 406), 4, {"base": chel_leg(s, 540, False, not tall)}, [-60, 110])
    part("eyes", "eyes", "head", CEYE, 6, {v: chel_eyes(s, v) for v in EYE_VARIANTS})
    part("pupils", "eyes", "eyes", CEYE, 7, {v: chel_pupils(s, v) for v in ("normal", "small")})
    part("brow", "eyebrows", "head", (CEYE[0], 248), 8, {"base": chel_brow(s)}, [-40, 40])
    rig = {"template": "chelonian", "canvas": [CW, CH], "ground": list(C_GROUND), "parts": parts,
           "attach_points": {"back": {"part": "body", "point": [380, 240]}, "mouth": {"part": "head", "point": [740, 340]},
                             "hand": {"part": "leg_fr", "point": [548, 470]}, "head_top": {"part": "head", "point": [690, 262]}},
           "talk_part": "jaw", "talk_mode": "jaw", "jaw_part": "jaw", "jaw_open_degrees": -17.0}
    return parts, rig


# ------------------------------------------------------------------------------------------------ serpent
SEG_L = 86
SEG0 = 90                                  # x of the first joint
EYE_S = None


def _snake_y():
    return 380


def seg_radius(i: int, n: int = 9) -> float:
    return [14, 20, 27, 32, 35, 35, 33, 30, 26][i]


def seg_art(s: RepSpec, i: int) -> Art:
    a = Art(SW, SH)
    x0 = SEG0 + i * SEG_L
    y = _snake_y()
    r0, r1 = seg_radius(i), seg_radius(min(i + 1, 8))
    o = _outline(s.skin)
    a.path(f"M {x0 - 10} {y - r0} L {x0 + SEG_L + 10} {y - r1} A {r1} {r1} 0 0 1 {x0 + SEG_L + 10} {y + r1} L {x0 - 10} {y + r0} A {r0} {r0} 0 0 1 {x0 - 10} {y - r0} Z",
           a.shaded(s.skin), o, 6)
    a.path(f"M {x0 - 8} {y + r0 * 0.45} L {x0 + SEG_L + 8} {y + r1 * 0.45} L {x0 + SEG_L + 8} {y + r1 * 0.95} L {x0 - 8} {y + r0 * 0.95} Z", s.belly, None, opacity=0.9)
    for k in range(2):
        cx = x0 + 22 + k * 40
        r = (r0 + (r1 - r0) * (cx - x0) / SEG_L) * 0.55
        a.poly([(cx, y - r * 1.5), (cx + 14, y - r * 0.4), (cx, y + r * 0.2), (cx - 14, y - r * 0.4)], s.accent, None, 0, 0.85)
    return a


def snake_head(s: RepSpec) -> Art:
    a = Art(SW, SH)
    x = SEG0 + 9 * SEG_L - 6
    y = _snake_y()
    o = _outline(s.skin)
    a.path(f"M {x} {y - 30} Q {x + 20} {y - 52} {x + 90} {y - 40} Q {x + 140} {y - 20} {x + 132} {y + 6} Q {x + 90} {y + 16} {x} {y + 28} Z", a.shaded(s.skin), o, 6)
    a.ellipse(x + 108, y - 22, 5, 4, INK)
    a.ellipse(x + 44, y - 26, 16, 9, "#ff8f8f", None, opacity=0.4)
    return a


def snake_jaw(s: RepSpec) -> Art:
    a = Art(SW, SH)
    x = SEG0 + 9 * SEG_L - 6
    y = _snake_y()
    a.path(f"M {x + 10} {y + 10} L {x + 128} {y + 8} Q {x + 136} {y + 14} {x + 124} {y + 24} Q {x + 70} {y + 40} {x + 10} {y + 34} Z", a.shaded(lighten(s.belly, 0.05)), _outline(s.skin), 5)
    return a


def snake_tongue(s: RepSpec, out: bool) -> Art:
    a = Art(SW, SH)
    x = SEG0 + 9 * SEG_L + 124
    y = _snake_y() + 8
    L = 60 if out else 8
    a.path(f"M {x} {y} L {x + L} {y}", None, "#d8365a", 6)
    a.path(f"M {x + L} {y} L {x + L + 16} {y - 12} M {x + L} {y} L {x + L + 16} {y + 12}", None, "#d8365a", 5)
    return a


def serp_eye(s: RepSpec, variant: str) -> Art:
    a = Art(SW, SH)
    cx, cy = SEG0 + 9 * SEG_L + 100, _snake_y() - 22
    if variant in ("open", "wide", "sad", "angry", "half", "tear"):
        a.ellipse(cx, cy, 15 if variant != "wide" else 18, 18 if variant != "wide" else 21, "#ffffff", INK, 5)
        if variant in ("sad", "angry", "half", "tear"):
            a.defs.append('<clipPath id="sl"><ellipse cx="%d" cy="%d" rx="15" ry="18"/></clipPath>' % (cx, cy))
            a.raw('<g clip-path="url(#sl)">')
            a.rect(cx - 20, cy - 30, 40, 28 if variant == "half" else 18, s.skin, None, 0)
            a.raw("</g>")
            a.ellipse(cx, cy, 15, 18, None, INK, 5)
        if variant == "tear":
            a.path(f"M {cx + 2} {cy + 18} Q {cx - 4} {cy + 36} {cx + 2} {cy + 46} Q {cx + 8} {cy + 36} {cx + 2} {cy + 18} Z", "#7fc8f0", "#3a7ab0", 2, 0.9)
    elif variant == "closed":
        a.path(f"M {cx - 14} {cy + 2} Q {cx} {cy + 14} {cx + 14} {cy + 2}", None, INK, 6)
    elif variant == "happy":
        a.path(f"M {cx - 14} {cy + 7} Q {cx} {cy - 14} {cx + 14} {cy + 7}", None, INK, 6)
    return a


def serp_pupil(s: RepSpec, variant: str) -> Art:
    a = Art(SW, SH)
    cx, cy = SEG0 + 9 * SEG_L + 102, _snake_y() - 20
    r = 10 if variant == "normal" else 7
    a.ellipse(cx, cy, r * 0.5, r, "#140c08", None)
    a.circle(cx - 2, cy - 4, 2.5, "#ffffff")
    return a


def serp_brow(s: RepSpec) -> Art:
    a = Art(SW, SH)
    cx, cy = SEG0 + 9 * SEG_L + 100, _snake_y() - 52
    a.path(f"M {cx - 16} {cy + 4} Q {cx} {cy - 6} {cx + 18} {cy + 4}", None, darken(s.skin, 0.6), 6)
    return a


def build_serpent(s: RepSpec, out: Path) -> tuple[list[dict], dict]:
    parts: list[dict] = []

    def part(pid, comp, parent, pivot, order, drawings, limits=None):
        variants = {}
        for vname, art in drawings.items():
            origin, size = _save_part(art, out, f"{pid}_{vname}")
            variants[vname] = {"file": f"rig/{pid}_{vname}.png", "svg": f"rig/{pid}_{vname}.svg", "origin": origin, "size": size}
        parts.append({"id": pid, "component": comp, "parent": parent, "pivot": list(pivot), "order": order, "variants": variants, "rotation_limits": limits})

    y = _snake_y()
    parts.append({"id": "root", "component": "root", "parent": None, "pivot": list(S_GROUND), "order": 0, "variants": {}})
    names = ["tail", "body", "seg1", "seg2", "seg3", "seg4", "seg5", "seg6", "seg7"]
    comps = ["tail", "body", "body", "body", "body", "body", "body", "body", "neck"]
    parent = "root"
    for i, (nm, comp) in enumerate(zip(names, comps)):
        part(nm, comp, parent, (SEG0 + i * SEG_L, y), i, {"base": seg_art(s, i)}, [-38, 38])
        parent = nm
    jx = SEG0 + 9 * SEG_L - 6
    part("head", "head", "seg7", (jx, y), 20, {"base": snake_head(s)}, [-40, 40])
    part("jaw", "mouth", "head", (jx + 8, y + 14), 21, {"base": snake_jaw(s)}, [-34, 4])
    part("tongue", "tongue", "head", (jx + 124, y + 8), 19, {"out": snake_tongue(s, True), "in": snake_tongue(s, False)})
    parts[-1]["default_variant"] = "in"
    part("eyes", "eyes", "head", (jx + 100, y - 22), 24, {v: serp_eye(s, v) for v in EYE_VARIANTS})
    part("pupils", "eyes", "eyes", (jx + 102, y - 20), 25, {v: serp_pupil(s, v) for v in ("normal", "small")})
    part("brow", "eyebrows", "head", (jx + 100, y - 52), 26, {"base": serp_brow(s)}, [-40, 40])
    rig = {"template": "serpentine_reptile", "canvas": [SW, SH], "ground": list(S_GROUND), "parts": parts,
           "attach_points": {"back": {"part": "seg3", "point": [SEG0 + 4 * SEG_L, y - 34]}, "mouth": {"part": "head", "point": [jx + 130, y + 12]},
                             "hand": {"part": "seg6", "point": [SEG0 + 7 * SEG_L, y - 30]}, "head_top": {"part": "head", "point": [jx + 70, y - 52]}},
           "talk_part": "jaw", "talk_mode": "jaw", "jaw_part": "jaw", "jaw_open_degrees": -22.0}
    return parts, rig


SERP_FACES = {k: {**v, "parts": {pk: pv for pk, pv in v.get("parts", {}).items() if pk != "head"}} for k, v in FACES15.items()}
SERP_FACES.update({"happy": {"variants": {"eyes": "happy", "pupils": "none"}, "parts": {"jaw": {"rotation": -5}, "tongue": {"x": 0}}}})
SERP_POSES = {
    "standing": {}, "walking": {f"seg{i}": {"rotation": 10 * (-1) ** i} for i in range(1, 7)}, "running": {f"seg{i}": {"rotation": 16 * (-1) ** i} for i in range(1, 7)},
    "sitting": {**{f"seg{i}": {"rotation": 13} for i in range(1, 7)}, "body": {"rotation": 13}, "tail": {"rotation": 13}},
    "sleeping": {**{f"seg{i}": {"rotation": 16} for i in range(1, 7)}, "body": {"rotation": 16}, "tail": {"rotation": 16}, "head": {"rotation": -16}},
    "jumping": {"seg4": {"rotation": 14}, "seg5": {"rotation": 14}, "seg6": {"rotation": 14}, "seg7": {"rotation": 14}, "head": {"rotation": 10}, "root": {"y": 30}},
    "talking": {"head": {"rotation": 4}, "jaw": {"rotation": -8}}, "pointing": {"seg6": {"rotation": 22}, "seg7": {"rotation": 22}, "head": {"rotation": -8}},
    "waving": {"seg5": {"rotation": 26}, "seg6": {"rotation": 26}, "seg7": {"rotation": 26}, "head": {"rotation": 10}},
    "fighting": {"seg4": {"rotation": 28}, "seg5": {"rotation": 28}, "seg6": {"rotation": 28}, "seg7": {"rotation": -50}, "head": {"rotation": -8}, "jaw": {"rotation": -30}},
    "dancing": {**{f"seg{i}": {"rotation": 14 * (-1) ** i} for i in range(1, 7)}, "head": {"rotation": 14}},
    "kneeling": {"seg6": {"rotation": 20}, "seg7": {"rotation": 20}, "head": {"rotation": -14}},
    "falling": {"root": {"rotation": -30}, **{f"seg{i}": {"rotation": 10} for i in range(1, 7)}},
    "climbing": {**{f"seg{i}": {"rotation": 18} for i in range(1, 8)}, "head": {"rotation": 8}},
    "holding_object": {"seg7": {"rotation": 18}, "head": {"rotation": -10}},
}


def build_rep(s: RepSpec, out: Path) -> dict:
    if s.family == "quad":
        parts, rig = build_quad(s, out)
        poses, states, tags = QUAD_POSES, ["standing", "in_water", "resting"], ["reptile", "quadruped"]
        faces = FACES15
    elif s.family == "chelonian":
        parts, rig = build_chel(s, out)
        poses, states, tags = CHEL_POSES, ["standing", "in_water", "resting", "retracted"], ["reptile", "chelonian"]
        faces = FACES15
    else:
        parts, rig = build_serpent(s, out)
        poses, states, tags = SERP_POSES, ["slithering", "coiled", "raised", "resting"], ["reptile", "serpentine"]
        faces = SERP_FACES
    return {
        "id": s.id, "asset_type": "character", "name": s.name, "species": s.species, "aliases": s.aliases, "description": s.description,
        "tags": sorted({s.species, "chibi", *tags}), "catalog_code": s.code, "category": s.category, "subcategory": s.subcategory, "related_stories": s.stories,
        "visual_identity": {"skin": s.skin, "belly": s.belly, "accent": s.accent, "iris": s.iris, "shell": s.shell, "lashes": s.lashes, "flower": s.flower,
                            "family": s.family, "outline": "dark tone of each fill"},
        "continuity_rules": ["Seen from the side, facing right before any flip", "Colours are fixed by visual_identity", *s.identity_notes],
        "compatibility": {"habitat": s.habitat, "stage_scale": s.stage_scale, "style": "premium_chibi_anime", "primary_view": "side", "rig_family": s.family},
        "default_voice": s.voice, "states": states, "rig": rig, "expressions": faces, "poses": poses,
    }
