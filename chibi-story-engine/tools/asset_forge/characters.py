"""Procedural chibi characters: every rig part is drawn as vector art and rasterised to a layer.

Two families are drawn here, matching the two rig templates: front-facing bipeds (animals that stand,
and people) and a side-view crocodile. A character is a `BipedSpec`/`ReptileSpec`: adding one is data.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path

from .svg import Art, darken, lighten, mix, save_cropped

INK = "#3b2414"
MOUTH_DARK = "#7a2e2e"
TONGUE = "#f08a8a"


# =============================================================== biped ====
BW, BH = 600, 720
B_GROUND = (300, 690)
EYE_L, EYE_R = (232, 262), (368, 262)


@dataclass
class BipedSpec:
    id: str
    name: str
    species: str
    aliases: list[str]
    description: str
    fur: str
    belly: str
    voice: str
    habitat: str = "ground"
    face: str | None = None            # lighter face mask
    ear_inner: str = "#f3b6a5"
    ears: str = "round_side"           # round_side | long | round_top | pointed | human
    muzzle: str | None = "round"       # round | pointed | None
    nose: str = "#3b2414"
    tail: str | None = None            # curl | tuft | puff | bushy
    tail_tip: str | None = None
    mane: str | None = None
    hair: str | None = None            # tuft | short | turban
    hair_colour: str = "#2b2019"
    clothes: dict[str, str] | None = None
    moustache: bool = False
    iris: str = "#4a2a12"
    belly_scale: float = 1.0
    stage_scale: float = 0.6
    identity_notes: list[str] = field(default_factory=list)


def _outline(colour: str) -> str:
    return darken(colour, 0.55)


def biped_body(s: BipedSpec) -> Art:
    a = Art(BW, BH)
    w = 98 * s.belly_scale
    if s.clothes:
        top = s.clothes["top"]
        a.path(f"M {300 - w * 0.8} 392 Q 300 372 {300 + w * 0.8} 392 L {300 + w * 1.08} 590 Q 300 628 {300 - w * 1.08} 590 Z",
               a.shaded(top), _outline(top))
        trim = s.clothes.get("trim", darken(top, 0.2))
        a.path("M 300 392 L 300 520", None, trim, 7)
        for y in (425, 460, 495):
            a.circle(300, y, 6, trim)
        a.path(f"M {300 - w * 1.05} 585 Q 300 622 {300 + w * 1.05} 585", None, trim, 9)
    else:
        a.ellipse(300, 495, w, 116, a.shaded(s.fur), _outline(s.fur))
        a.ellipse(300, 512, w * 0.64, 82, s.belly, None, opacity=0.95)
    return a


def biped_leg(s: BipedSpec, x: float) -> Art:
    a = Art(BW, BH)
    colour = s.clothes["bottom"] if s.clothes else s.fur
    a.rect(x - 31, 572, 62, 100, a.shaded(colour), _outline(colour), rx=28)
    foot = s.clothes.get("shoes", "#6b4226") if s.clothes else darken(s.fur, 0.12)
    a.ellipse(x, 676, 46, 22, a.shaded(foot), _outline(foot))
    return a


def biped_arm(s: BipedSpec, x: float, tilt: float) -> Art:
    a = Art(BW, BH)
    colour = s.clothes["top"] if s.clothes else s.fur
    hand = s.fur if s.clothes else lighten(s.fur, 0.12)
    g = f'<g transform="rotate({tilt} {x} 428)">'
    a.raw(g)
    a.rect(x - 24, 412, 48, 132, a.shaded(colour), _outline(colour), rx=24)
    a.circle(x, 548, 27, a.shaded(hand), _outline(hand))
    a.raw("</g>")
    return a


def biped_tail(s: BipedSpec) -> Art:
    a = Art(BW, BH)
    o = _outline(s.fur)
    if s.tail == "curl":
        d = "M 352 588 C 470 606 536 520 482 440 C 448 392 398 424 428 462"
        a.path(d, None, o, 38)
        a.path(d, None, s.fur, 26)
    elif s.tail == "tuft":
        d = "M 352 590 C 440 600 500 560 500 470"
        a.path(d, None, o, 26)
        a.path(d, None, s.fur, 15)
        tip = s.tail_tip or darken(s.fur, 0.45)
        a.ellipse(500, 452, 30, 40, a.shaded(tip), _outline(tip), rotate=10)
    elif s.tail == "puff":
        a.circle(382, 596, 36, a.shaded(s.tail_tip or s.fur), o)
    elif s.tail == "bushy":
        a.path("M 350 590 C 430 610 530 560 520 440 C 470 470 420 520 350 560 Z", a.shaded(s.fur), o)
        a.path("M 520 440 C 498 452 486 470 480 492 C 506 486 520 470 520 440 Z", s.tail_tip or "#ffffff", None)
    return a


def biped_head(s: BipedSpec) -> Art:
    a = Art(BW, BH)
    o = _outline(s.fur)
    import math
    if s.mane:
        mo = _outline(s.mane)
        for i in range(16):
            ang = i * math.tau / 16
            a.circle(300 + 172 * math.cos(ang), 250 + 150 * math.sin(ang), 56, a.shaded(s.mane), mo)
        a.ellipse(300, 250, 186, 162, s.mane)
    if s.ears == "round_side":
        for x in (138, 462):
            a.circle(x, 250, 50, a.shaded(s.fur), o)
            a.circle(x, 250, 30, s.ear_inner)
    elif s.ears == "round_top":
        for x in (176, 424):
            a.circle(x, 136, 42, a.shaded(s.fur), o)
            a.circle(x, 140, 23, s.ear_inner)
    elif s.ears == "long":
        for x, r in ((236, -9), (364, 9)):
            a.ellipse(x, 86, 38, 112, a.shaded(s.fur), o, rotate=r)
            a.ellipse(x, 92, 19, 84, s.ear_inner, rotate=r)
    elif s.ears == "pointed":
        for sx in (-1, 1):
            a.poly([(300 + sx * 78, 150), (300 + sx * 150, 40), (300 + sx * 172, 190)], a.shaded(s.fur), o)
            a.poly([(300 + sx * 104, 150), (300 + sx * 146, 82), (300 + sx * 156, 172)], s.ear_inner)
    elif s.ears == "human":
        for x in (136, 464):
            a.circle(x, 272, 28, a.shaded(s.fur), o)
    a.ellipse(300, 250, 166, 140, a.shaded(s.fur), o)
    if s.face:
        a.circle(244, 232, 66, s.face)
        a.circle(356, 232, 66, s.face)
        a.ellipse(300, 292, 128, 92, s.face)
    if s.muzzle == "round":
        a.ellipse(300, 326, 80, 52, lighten(s.belly, 0.1), None)
        a.ellipse(300, 298, 19, 12, s.nose, None)
    elif s.muzzle == "pointed":
        a.path("M 208 300 Q 300 250 392 300 Q 372 388 300 392 Q 228 388 208 300 Z", lighten(s.belly, 0.1))
        a.ellipse(300, 296, 20, 14, s.nose, None)
    else:
        a.path("M 290 300 Q 300 312 310 300", None, darken(s.fur, 0.35), 5)
    for x in (188, 412):
        a.ellipse(x, 322, 26, 15, "#ff8f8f", None, opacity=0.45)
    if s.hair == "tuft":
        a.path("M 270 122 Q 280 80 300 112 Q 312 70 330 122 Z", s.fur, o)
    elif s.hair == "short":
        a.path("M 138 232 Q 150 92 300 98 Q 450 92 462 232 Q 420 150 300 150 Q 180 150 138 232 Z", s.hair_colour, _outline(s.hair_colour))
    elif s.hair == "turban":
        t = s.hair_colour
        a.path("M 132 214 Q 128 92 300 78 Q 472 92 468 214 Q 400 168 300 168 Q 200 168 132 214 Z", a.shaded(t), _outline(t))
        for d in ("M 160 150 Q 300 96 440 150", "M 146 186 Q 300 124 454 186"):
            a.path(d, None, darken(t, 0.22), 6)
        a.circle(300, 120, 17, s.clothes.get("jewel", lighten(t, 0.5)) if s.clothes else lighten(t, 0.5), _outline(t), 4)
    if s.moustache:
        a.path("M 300 324 Q 262 316 236 338 Q 268 342 300 334 Q 332 342 364 338 Q 338 316 300 324 Z", s.hair_colour if s.hair != "turban" else "#2b2019")
    return a


def _lid_colour(s: BipedSpec) -> str:
    return s.face or s.fur


def biped_eyes(s: BipedSpec, variant: str) -> Art:
    a = Art(BW, BH)
    for i, (cx, cy) in enumerate((EYE_L, EYE_R)):
        sign = -1 if i == 0 else 1          # -1: the eye on the left of the picture
        if variant in ("open", "sad", "angry"):
            a.ellipse(cx, cy, 38, 48, "#ffffff", INK, 6)
        elif variant == "wide":
            a.ellipse(cx, cy, 43, 55, "#ffffff", INK, 6)
        elif variant == "closed":
            a.path(f"M {cx - 36} {cy + 4} Q {cx} {cy + 30} {cx + 36} {cy + 4}", None, INK, 8)
        elif variant == "happy":
            a.path(f"M {cx - 36} {cy + 14} Q {cx} {cy - 30} {cx + 36} {cy + 14}", None, INK, 8)
        if variant in ("sad", "angry"):
            # an eyelid slanting down towards the outside (sad) or the nose (angry)
            outer, inner = (cy - 14, cy - 44) if variant == "sad" else (cy - 46, cy - 12)
            xo, xi = cx + sign * 48, cx - sign * 48
            a.poly([(xo, cy - 60), (xi, cy - 60), (xi, inner), (xo, outer)], _lid_colour(s))
            a.path(f"M {xi} {inner} L {xo} {outer}", None, INK, 6)
    return a


def biped_pupils(s: BipedSpec, variant: str) -> Art:
    a = Art(BW, BH)
    r = 27 if variant == "normal" else 16
    for i, (cx, cy) in enumerate((EYE_L, EYE_R)):
        x = cx + (5 if i == 0 else -5)
        y = cy + 5
        a.circle(x, y, r, a.radial(lighten(s.iris, 0.25), darken(s.iris, 0.3)), INK, 3)
        a.circle(x, y, r * 0.55, "#140c08")
        a.circle(x - r * 0.36, y - r * 0.4, r * 0.34, "#ffffff")
        a.circle(x + r * 0.3, y + r * 0.34, r * 0.15, "#ffffff")
    return a


def biped_brow(s: BipedSpec, cx: float) -> Art:
    a = Art(BW, BH)
    sign = -1 if cx < 300 else 1
    colour = "#2b2019" if s.clothes else darken(s.fur, 0.5)
    a.path(f"M {cx - sign * 30} 203 Q {cx} 188 {cx + sign * 32} 204", None, colour, 10)
    return a


def biped_mouth(s: BipedSpec, variant: str, cy: float) -> Art:
    a = Art(BW, BH)
    if variant == "closed":
        a.path(f"M 270 {cy - 6} Q 300 {cy + 18} 330 {cy - 6}", None, INK, 7)
    elif variant == "neutral":
        a.path(f"M 280 {cy + 2} Q 300 {cy + 7} 320 {cy + 2}", None, INK, 7)
    elif variant == "sad":
        a.path(f"M 274 {cy + 12} Q 300 {cy - 10} 326 {cy + 12}", None, INK, 7)
    elif variant == "small":
        a.ellipse(300, cy + 4, 14, 10, MOUTH_DARK, INK, 5)
    elif variant == "open":
        a.ellipse(300, cy + 8, 25, 21, MOUTH_DARK, INK, 5)
        a.ellipse(300, cy + 19, 14, 8, TONGUE)
    elif variant == "wide":
        a.path(f"M 258 {cy - 8} Q 300 {cy + 2} 342 {cy - 8} Q 338 {cy + 42} 300 {cy + 44} Q 262 {cy + 42} 258 {cy - 8} Z", MOUTH_DARK, INK, 5)
        a.path(f"M 266 {cy - 4} Q 300 {cy + 5} 334 {cy - 4} L 331 {cy + 6} Q 300 {cy + 13} 269 {cy + 6} Z", "#ffffff")
        a.ellipse(300, cy + 32, 20, 9, TONGUE)
    elif variant == "o":
        a.ellipse(300, cy + 6, 15, 19, MOUTH_DARK, INK, 5)
    return a


BIPED_FACES = {
    "neutral": {"variants": {"eyes": "open", "pupils": "normal", "mouth": "closed"}},
    "happy": {"variants": {"eyes": "happy", "pupils": "none", "mouth": "closed"},
              "parts": {"brow_l": {"y": 5}, "brow_r": {"y": 5}}},
    "sad": {"variants": {"eyes": "sad", "pupils": "normal", "mouth": "sad"},
            "parts": {"brow_l": {"rotation": 16}, "brow_r": {"rotation": -16}, "pupils": {"y": -5}}},
    "surprised": {"variants": {"eyes": "wide", "pupils": "small", "mouth": "o"},
                  "parts": {"brow_l": {"y": 14}, "brow_r": {"y": 14}}},
    "angry": {"variants": {"eyes": "angry", "pupils": "normal", "mouth": "sad"},
              "parts": {"brow_l": {"rotation": -18, "y": -8}, "brow_r": {"rotation": 18, "y": -8}}},
    "worried": {"variants": {"eyes": "wide", "pupils": "small", "mouth": "small"},
                "parts": {"brow_l": {"rotation": 18, "y": 8}, "brow_r": {"rotation": -18, "y": 8}}},
    "thinking": {"variants": {"eyes": "open", "pupils": "normal", "mouth": "neutral"},
                 "parts": {"pupils": {"x": 9, "y": 10}, "brow_l": {"y": 10, "rotation": -6}}},
    "laughing": {"variants": {"eyes": "happy", "pupils": "none", "mouth": "wide"},
                 "parts": {"brow_l": {"y": 8}, "brow_r": {"y": 8}}},
    "speaking": {"variants": {"eyes": "open", "pupils": "normal", "mouth": "small"}},
}
BIPED_POSES = {
    "sitting": {"root": {"y": -66}, "leg_l": {"rotation": -68}, "leg_r": {"rotation": 68}},
    "arms_up": {"arm_l": {"rotation": -150}, "arm_r": {"rotation": 150}},
    "in_air": {"leg_l": {"rotation": -25}, "leg_r": {"rotation": 25}, "arm_l": {"rotation": -70}, "arm_r": {"rotation": 70}},
}


def build_biped(s: BipedSpec, out: Path) -> dict:
    """Draw every part into `out`/rig and return the character's manifest data (without file entries)."""
    mouth_y = 346 if s.muzzle else 352
    parts: list[dict] = []

    def part(pid, component, parent, pivot, order, drawings: dict[str, Art], limits=None):
        variants = {}
        for vname, art in drawings.items():
            origin, size = save_cropped(art, out / "rig" / f"{pid}_{vname}.png")
            variants[vname] = {"file": f"rig/{pid}_{vname}.png", "origin": origin, "size": size}
        parts.append({"id": pid, "component": component, "parent": parent, "pivot": list(pivot), "order": order,
                      "variants": variants, "rotation_limits": limits})

    parts.append({"id": "root", "component": "root", "parent": None, "pivot": list(B_GROUND), "order": 0, "variants": {}})
    if s.tail:
        part("tail", "tail", "body", (352, 590), -3, {"base": biped_tail(s)}, [-70, 70])
    part("leg_l", "left_leg", "root", (255, 588), -2, {"base": biped_leg(s, 255)}, [-100, 100])
    part("leg_r", "right_leg", "root", (345, 588), -2, {"base": biped_leg(s, 345)}, [-100, 100])
    part("arm_l", "left_arm", "body", (222, 428), -1, {"base": biped_arm(s, 222, 14)}, [-185, 185])
    part("body", "body", "root", (300, 600), 0, {"base": biped_body(s)}, [-25, 25])
    part("arm_r", "right_arm", "body", (378, 428), 3, {"base": biped_arm(s, 378, -14)}, [-185, 185])
    part("head", "head", "body", (300, 388), 5, {"base": biped_head(s)}, [-35, 35])
    part("eyes", "eyes", "head", (300, 262), 6, {v: biped_eyes(s, v) for v in ("open", "closed", "happy", "wide", "sad", "angry")})
    part("pupils", "eyes", "eyes", (300, 262), 7, {v: biped_pupils(s, v) for v in ("normal", "small")})
    part("brow_l", "eyebrows", "head", (232, 200), 8, {"base": biped_brow(s, 232)}, [-40, 40])
    part("brow_r", "eyebrows", "head", (368, 200), 8, {"base": biped_brow(s, 368)}, [-40, 40])
    part("mouth", "mouth", "head", (300, mouth_y), 8,
         {v: biped_mouth(s, v, mouth_y) for v in ("closed", "neutral", "sad", "small", "open", "wide", "o")})

    return {
        "id": s.id, "asset_type": "character", "name": s.name, "species": s.species, "aliases": s.aliases, "description": s.description,
        "tags": [s.species, "chibi", "biped"],
        "visual_identity": {"fur_or_skin": s.fur, "belly": s.belly, "face": s.face, "iris": s.iris, "ears": s.ears, "tail": s.tail,
                            "mane": s.mane, "clothes": s.clothes, "head_to_body_ratio": 1.45, "outline": "dark tone of each fill"},
        "continuity_rules": ["Proportions: head about 1.45x the body height", "Colours are fixed by visual_identity",
                             *s.identity_notes],
        "compatibility": {"habitat": s.habitat, "stage_scale": s.stage_scale, "style": "premium_chibi_anime"},
        "default_voice": s.voice,
        "states": ["standing", "sitting", "in_air"],
        "rig": {"template": "biped_chibi", "canvas": [BW, BH], "ground": list(B_GROUND), "parts": parts,
                "attach_points": {"hand": {"part": "arm_r", "point": [410, 548]}, "mouth": {"part": "head", "point": [300, mouth_y + 6]},
                                  "head_top": {"part": "head", "point": [300, 112]}, "back": {"part": "body", "point": [300, 470]}},
                "talk_part": "mouth", "talk_mode": "variants", "talk_variants": ["closed", "small", "open"]},
        "expressions": BIPED_FACES, "poses": BIPED_POSES,
    }


# ============================================================= reptile ====
RW, RH = 920, 480
R_GROUND = (450, 410)
R_EYE = (668, 196)


@dataclass
class ReptileSpec:
    id: str
    name: str
    species: str
    aliases: list[str]
    description: str
    skin: str
    belly: str
    voice: str
    spikes: str
    iris: str = "#c98a1a"
    lashes: bool = False
    flower: str | None = None
    lips: str | None = None
    stage_scale: float = 0.8
    habitat: str = "aquatic"
    identity_notes: list[str] = field(default_factory=list)


def reptile_body(s: ReptileSpec) -> Art:
    a = Art(RW, RH)
    o = _outline(s.skin)
    for x in range(290, 600, 44):
        a.poly([(x, 236), (x + 22, 196), (x + 44, 236)], a.shaded(s.spikes), _outline(s.spikes), 5)
    a.path("M 250 300 Q 250 222 380 222 L 560 222 Q 650 226 650 300 Q 650 372 560 376 L 340 376 Q 250 372 250 300 Z", a.shaded(s.skin), o)
    a.path("M 280 338 Q 450 362 632 330 Q 628 370 560 372 L 340 372 Q 286 368 280 338 Z", s.belly, None, opacity=0.95)
    for x in (330, 400, 470, 540):
        a.ellipse(x, 268, 14, 9, darken(s.skin, 0.14), None, opacity=0.7)
    return a


def reptile_tail(s: ReptileSpec) -> Art:
    a = Art(RW, RH)
    for x in (120, 164, 208):
        a.poly([(x, 276), (x + 18, 244), (x + 38, 272)], a.shaded(s.spikes), _outline(s.spikes), 5)
    a.path("M 290 240 Q 180 262 40 330 Q 190 350 290 362 Z", a.shaded(s.skin), _outline(s.skin))
    a.path("M 286 336 Q 190 338 70 332 Q 190 348 288 358 Z", s.belly, None, opacity=0.9)
    return a


def reptile_leg(s: ReptileSpec, x: float, far: bool) -> Art:
    a = Art(RW, RH)
    colour = darken(s.skin, 0.2) if far else s.skin
    a.rect(x - 26, 336, 52, 62, a.shaded(colour), _outline(colour), rx=22)
    a.ellipse(x + 8, 400, 40, 15, a.shaded(colour), _outline(colour))
    for dx in (-12, 8, 28):
        a.circle(x + dx, 408, 5, "#fff7e0")
    return a


def reptile_head(s: ReptileSpec) -> Art:
    a = Art(RW, RH)
    o = _outline(s.skin)
    a.circle(R_EYE[0], R_EYE[1] + 4, 50, a.shaded(s.skin), o)                       # eye bump
    a.path("M 600 300 Q 590 212 690 214 Q 780 224 860 246 Q 892 256 886 286 Q 880 300 850 300 Z", a.shaded(s.skin), o)
    a.ellipse(858, 252, 15, 10, a.shaded(s.skin), o, 5)                              # nostril bump
    a.circle(862, 252, 4, INK)
    for x in range(676, 860, 34):                                                    # upper teeth
        a.poly([(x, 298), (x + 10, 316), (x + 20, 298)], "#fffdf2", INK, 3)
    a.ellipse(650, 268, 24, 13, "#ff8f8f", None, opacity=0.45)
    if s.lips:
        a.path("M 640 298 Q 760 304 878 296", None, s.lips, 7)
    if s.flower:
        for i in range(5):
            import math
            ang = i * math.tau / 5
            a.circle(612 + 15 * math.cos(ang), 190 + 15 * math.sin(ang), 12, s.flower, darken(s.flower, 0.4), 3)
        a.circle(612, 190, 8, "#ffd84a")
    return a


def reptile_jaw(s: ReptileSpec) -> Art:
    a = Art(RW, RH)
    a.path("M 606 296 L 866 296 Q 884 300 874 318 Q 780 346 640 344 Q 600 336 606 296 Z", a.shaded(lighten(s.belly, 0.05)), _outline(s.skin))
    for x in range(694, 850, 34):
        a.poly([(x, 298), (x + 10, 282), (x + 20, 298)], "#fffdf2", INK, 3)
    return a


def reptile_eyes(s: ReptileSpec, variant: str) -> Art:
    a = Art(RW, RH)
    cx, cy = R_EYE
    if variant in ("open", "sad", "angry"):
        a.ellipse(cx, cy, 30, 34, "#ffffff", INK, 6)
    elif variant == "wide":
        a.ellipse(cx, cy, 34, 39, "#ffffff", INK, 6)
    elif variant == "closed":
        a.path(f"M {cx - 28} {cy + 2} Q {cx} {cy + 24} {cx + 28} {cy + 2}", None, INK, 8)
    elif variant == "happy":
        a.path(f"M {cx - 28} {cy + 10} Q {cx} {cy - 24} {cx + 28} {cy + 10}", None, INK, 8)
    if variant in ("sad", "angry"):
        left, right = (cy - 30, cy - 8) if variant == "angry" else (cy - 8, cy - 30)   # the snout is to the right
        if variant == "angry":
            left, right = cy - 34, cy - 6
        else:
            left, right = cy - 6, cy - 34
        a.poly([(cx - 40, cy - 46), (cx + 40, cy - 46), (cx + 40, right), (cx - 40, left)], s.skin)
        a.path(f"M {cx - 40} {left} L {cx + 40} {right}", None, INK, 6)
    if s.lashes and variant in ("open", "wide", "sad", "angry"):
        for dx, dy in ((-30, -22), (-20, -34), (-6, -40)):
            a.path(f"M {cx + dx * 0.8} {cy + dy * 0.8} L {cx + dx * 1.3} {cy + dy * 1.3}", None, INK, 5)
    return a


def reptile_pupils(s: ReptileSpec, variant: str) -> Art:
    a = Art(RW, RH)
    r = 20 if variant == "normal" else 12
    x, y = R_EYE[0] + 5, R_EYE[1] + 3
    a.circle(x, y, r, a.radial(lighten(s.iris, 0.3), darken(s.iris, 0.25)), INK, 3)
    a.ellipse(x, y, r * 0.42, r * 0.8, "#140c08")
    a.circle(x - r * 0.36, y - r * 0.4, r * 0.3, "#ffffff")
    return a


def reptile_brow(s: ReptileSpec) -> Art:
    a = Art(RW, RH)
    a.path(f"M {R_EYE[0] - 30} 150 Q {R_EYE[0]} 136 {R_EYE[0] + 32} 150", None, darken(s.skin, 0.6), 10)
    return a


REPTILE_FACES = {
    "neutral": {"variants": {"eyes": "open", "pupils": "normal"}},
    "happy": {"variants": {"eyes": "happy", "pupils": "none"}, "parts": {"jaw": {"rotation": -5}, "brow": {"y": 5}}},
    "sad": {"variants": {"eyes": "sad", "pupils": "normal"}, "parts": {"brow": {"rotation": 16}, "pupils": {"y": -4}, "head": {"rotation": -5}}},
    "surprised": {"variants": {"eyes": "wide", "pupils": "small"}, "parts": {"jaw": {"rotation": -13}, "brow": {"y": 12}}},
    "angry": {"variants": {"eyes": "angry", "pupils": "normal"}, "parts": {"brow": {"rotation": -18, "y": -6}}},
    "worried": {"variants": {"eyes": "wide", "pupils": "small"}, "parts": {"brow": {"rotation": 18, "y": 6}, "jaw": {"rotation": -4}}},
    "thinking": {"variants": {"eyes": "open", "pupils": "normal"}, "parts": {"pupils": {"x": 6, "y": 8}, "brow": {"y": 8}}},
    "laughing": {"variants": {"eyes": "happy", "pupils": "none"}, "parts": {"jaw": {"rotation": -16}, "head": {"rotation": 5}}},
    "speaking": {"variants": {"eyes": "open", "pupils": "normal"}, "parts": {"jaw": {"rotation": -6}}},
}
REPTILE_POSES = {"in_water": {"root": {"y": -8}}}


def build_reptile(s: ReptileSpec, out: Path) -> dict:
    parts: list[dict] = []

    def part(pid, component, parent, pivot, order, drawings: dict[str, Art], limits=None):
        variants = {}
        for vname, art in drawings.items():
            origin, size = save_cropped(art, out / "rig" / f"{pid}_{vname}.png")
            variants[vname] = {"file": f"rig/{pid}_{vname}.png", "origin": origin, "size": size}
        parts.append({"id": pid, "component": component, "parent": parent, "pivot": list(pivot), "order": order,
                      "variants": variants, "rotation_limits": limits})

    parts.append({"id": "root", "component": "root", "parent": None, "pivot": list(R_GROUND), "order": 0, "variants": {}})
    part("tail", "tail", "body", (286, 300), -3, {"base": reptile_tail(s)}, [-40, 40])
    part("leg_bl", "left_leg", "body", (300, 342), -2, {"base": reptile_leg(s, 300, True)}, [-60, 60])
    part("leg_fl", "left_arm", "body", (540, 342), -2, {"base": reptile_leg(s, 540, True)}, [-60, 60])
    part("body", "body", "root", (450, 380), 0, {"base": reptile_body(s)}, [-20, 20])
    part("leg_br", "right_leg", "body", (350, 346), 2, {"base": reptile_leg(s, 350, False)}, [-60, 60])
    part("leg_fr", "right_arm", "body", (590, 346), 2, {"base": reptile_leg(s, 590, False)}, [-60, 60])
    part("jaw", "mouth", "head", (622, 300), 3, {"base": reptile_jaw(s)}, [-32, 4])
    part("head", "head", "body", (620, 290), 4, {"base": reptile_head(s)}, [-25, 25])
    part("eyes", "eyes", "head", R_EYE, 6, {v: reptile_eyes(s, v) for v in ("open", "closed", "happy", "wide", "sad", "angry")})
    part("pupils", "eyes", "eyes", R_EYE, 7, {v: reptile_pupils(s, v) for v in ("normal", "small")})
    part("brow", "eyebrows", "head", (R_EYE[0], 146), 8, {"base": reptile_brow(s)}, [-40, 40])

    return {
        "id": s.id, "asset_type": "character", "name": s.name, "species": s.species, "aliases": s.aliases, "description": s.description,
        "tags": [s.species, "chibi", "reptile"],
        "visual_identity": {"skin": s.skin, "belly": s.belly, "spikes": s.spikes, "iris": s.iris, "lashes": s.lashes,
                            "flower": s.flower, "snout": "long, rounded, teeth visible", "outline": "dark tone of each fill"},
        "continuity_rules": ["Always seen from the side, snout to the right before any flip", "Colours are fixed by visual_identity",
                             *s.identity_notes],
        "compatibility": {"habitat": s.habitat, "stage_scale": s.stage_scale, "style": "premium_chibi_anime"},
        "default_voice": s.voice,
        "states": ["standing", "in_water"],
        "rig": {"template": "quadruped_reptile", "canvas": [RW, RH], "ground": list(R_GROUND), "parts": parts,
                "attach_points": {"back": {"part": "body", "point": [440, 232]}, "mouth": {"part": "head", "point": [800, 306]},
                                  "hand": {"part": "leg_fr", "point": [598, 398]}, "head_top": {"part": "head", "point": [668, 150]}},
                "talk_part": "jaw", "talk_mode": "jaw", "jaw_part": "jaw", "jaw_open_degrees": -17.0},
        "expressions": REPTILE_FACES, "poses": REPTILE_POSES,
    }


# ============================================================== roster ====
BIPEDS = [
    BipedSpec("monkey_001", "Monkey", "monkey", ["बंदर", "बन्दर", "वानर", "monkey"],
              "A clever, cheerful young monkey with warm brown fur and a cream face.", fur="#b9763c", belly="#f6dcae", voice="monkey_hi",
              habitat="arboreal", face="#f8dfb5", ear_inner="#f3c9a0", ears="round_side", muzzle=None, tail="curl", hair="tuft",
              identity_notes=["Cream heart-shaped face mask", "Long curled tail", "Small tuft of hair on top"]),
    BipedSpec("lion_001", "Lion", "lion", ["शेर", "सिंह", "lion"], "A proud lion with a golden coat and a deep orange mane.",
              fur="#f2b84b", belly="#fbe6b3", voice="lion_hi", ears="round_top", ear_inner="#e59a5b", muzzle="round", nose="#6b3a1e",
              tail="tuft", tail_tip="#a8501a", mane="#c8661c", stage_scale=0.72,
              identity_notes=["Scalloped orange mane all around the head", "Dark tuft at the end of the tail"]),
    BipedSpec("rabbit_001", "Rabbit", "rabbit", ["खरगोश", "rabbit", "hare"], "A small, quick-witted white rabbit with long ears.",
              fur="#f4efe8", belly="#ffffff", voice="rabbit_hi", ears="long", ear_inner="#f7b9c4", muzzle="round", nose="#ef8fa3",
              tail="puff", iris="#7a3b52", stage_scale=0.5, identity_notes=["Long upright ears with pink insides", "Pink nose"]),
    BipedSpec("jackal_001", "Jackal", "jackal", ["सियार", "गीदड़", "jackal"], "A lean tawny jackal with pointed ears and a bushy tail.",
              fur="#c98f55", belly="#f3e2c4", voice="jackal_hi", ears="pointed", ear_inner="#f0c9a0", muzzle="pointed", tail="bushy",
              iris="#7a5a12", stage_scale=0.58, identity_notes=["Pointed ears", "White-tipped bushy tail"]),
    BipedSpec("jackal_blue_001", "Blue Jackal", "jackal", ["नीला सियार", "blue jackal"],
              "The same jackal after falling into the dyer's vat: bright indigo all over.", fur="#3f6fd8", belly="#a9c4f5",
              voice="jackal_hi", ears="pointed", ear_inner="#8fb0f0", muzzle="pointed", tail="bushy", tail_tip="#cfe0ff", iris="#7a5a12",
              stage_scale=0.58, identity_notes=["Identical shape to jackal_001; only the colour differs"]),
    BipedSpec("farmer_001", "Farmer", "human", ["किसान", "farmer"], "A kind, hard-working farmer in a white kurta and turban.",
              fur="#d99a63", belly="#d99a63", voice="farmer_hi", ears="human", muzzle=None, hair="turban", hair_colour="#f2efe6",
              clothes={"top": "#f4f1e8", "bottom": "#e8dcc0", "trim": "#c9b98f", "shoes": "#7a4a28", "jewel": "#d8a23a"}, moustache=True,
              stage_scale=0.66, identity_notes=["White turban", "Plain cream kurta", "Black moustache"]),
    BipedSpec("rich_man_001", "Rich Man", "human", ["सेठ", "साहूकार", "ज़मींदार", "जमींदार", "धनी आदमी", "अमीर आदमी", "rich man"],
              "A stout, wealthy landlord in a purple kurta with gold trim and a red turban.", fur="#e0a875", belly="#e0a875",
              voice="rich_man_hi", ears="human", muzzle=None, hair="turban", hair_colour="#c0392b",
              clothes={"top": "#7a3fa0", "bottom": "#f3e9c8", "trim": "#e6b93c", "shoes": "#3b2414", "jewel": "#ffd84a"}, moustache=True,
              belly_scale=1.28, stage_scale=0.68, identity_notes=["Red turban with a gold jewel", "Purple kurta with gold trim", "Round belly"]),
]
REPTILES = [
    ReptileSpec("crocodile_001", "Crocodile", "crocodile", ["मगरमच्छ", "घड़ियाल", "crocodile"],
                "A big, soft-hearted green crocodile with a cream belly.", skin="#5fa84a", belly="#f1e7a8", voice="crocodile_hi",
                spikes="#3f7d34", identity_notes=["Green skin, darker green back spikes", "Amber eye"]),
    ReptileSpec("crocodile_wife_001", "Crocodile's Wife", "crocodile",
                ["मगरमच्छ की पत्नी", "घड़ियाल की पत्नी", "मगरमच्छनी", "crocodile wife", "crocodile's wife"],
                "The crocodile's wife: teal skin, long eyelashes and a pink flower behind the eye.", skin="#4fb59a", belly="#f6e6c0",
                voice="crocodile_wife_hi", spikes="#2f8a78", iris="#b0507a", lashes=True, flower="#ff8fb3", lips="#d9486e",
                stage_scale=0.72, identity_notes=["Teal skin", "Eyelashes", "Pink flower", "Slightly smaller than her husband"]),
]
