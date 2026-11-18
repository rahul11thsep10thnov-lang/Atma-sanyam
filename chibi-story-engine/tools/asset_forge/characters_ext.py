"""Extended chibi figures: people, animals, birds and mythological beings on the existing `biped_chibi` rig.

A `FigSpec` is a `BipedSpec` plus extra features (horns, trunks, beaks, wings, headwear, beards, patterns, outfits, held items).
The rig is *identical* to the original biped rig (same part ids, canvas 600 x 720, pivots and attach points), so every existing
animation clip keeps working. Every part is drawn as SVG, the PNG is rasterised from that SVG and cropped to the same box, so the
two line up exactly. Poses and the fifteen expressions are data over the same joints and part variants.
"""
from __future__ import annotations

import math
from dataclasses import dataclass, field
from pathlib import Path

from .characters import (B_GROUND, BH, BW, EYE_L, EYE_R, INK, MOUTH_DARK, TONGUE, BipedSpec, _outline, biped_body, biped_brow, biped_eyes,
                         biped_head, biped_leg, biped_mouth, biped_pupils, biped_tail)
from .svg import Art, darken, lighten, mix

SKIN = {"fair": "#f0c8a0", "light": "#e8b887", "wheat": "#d99a63", "tan": "#c98a55", "brown": "#a8693f", "dark": "#7a4a2a", "deep": "#5a3520"}


@dataclass
class FigSpec(BipedSpec):
    category: str = "human"                 # human | animal | bird | mythological
    subcategory: str = ""
    code: str = ""                          # CHAR-HUM-0001
    stories: list[str] = field(default_factory=list)
    ears_ext: str | None = None             # floppy | elephant | bat | cat_small
    horns: str | None = None                # short | bull | ram | antlers | demon
    horn_colour: str = "#e8dcc0"
    muzzle_ext: str | None = None           # snout | trunk | wide | cat | beak_short | beak_hook | beak_long | beak_flat | beak_spear
    beak: str = "#f2a020"
    whiskers: bool = False
    headwear: str | None = None             # crown | cap | topknot | hood | hat_wide | tiara | jata | hair_long | plume | crest | helmet | hat_pointed
    headwear_colour: str = "#e6b93c"
    beard: str | None = None                # short | long | goatee | stubble
    beard_colour: str = "#2b2019"
    pattern: str | None = None              # stripes | spots | patches | zebra
    pattern_colour: str = "#2a1a10"
    outfit: str | None = None               # robe | armor | dress | vest | wrap
    wings: bool = False
    wing_colour: str | None = None
    held: str | None = None                 # staff | sword | scroll | flute | club | bow | bowl | lantern
    feet: str = "paw"                       # paw | hoof | claw | bare
    foot_colour: str | None = None
    tilak: str | None = None
    fangs: bool = False
    halo: str | None = None
    long_tail: str | None = None            # cow | horse | rat | fan | lizard | snake
    glow: str | None = None
    ridge: str | None = None                # horse/boar/camel crest of coarse hair
    long_hair: bool = False                 # long hair shown with any headwear


# ------------------------------------------------------------------------------------------------ helpers
def _join(*arts: Art) -> Art:
    out = Art(BW, BH)
    for i, a in enumerate(arts):
        out.defs += a.defs
        out.items += a.items
    return out


def _sub(n: int) -> Art:
    a = Art(BW, BH)
    a._n = n * 100
    return a


def _base(s: FigSpec) -> BipedSpec:
    """The BipedSpec that biped_head() understands (extended ears/muzzle/hair handled by us)."""
    d = {f: getattr(s, f) for f in BipedSpec.__dataclass_fields__}
    if s.ears_ext or s.muzzle_ext or s.category == "bird":
        d["ears"] = "none"
    if s.ridge:
        d["mane"] = None
    if s.muzzle_ext or s.category == "bird":
        d["muzzle"] = None
    if d["hair"] not in ("tuft", "short", "turban"):
        d["hair"] = None
    return BipedSpec(**d)


def _o(c: str) -> str:
    return darken(c, 0.55)


# ------------------------------------------------------------------------------------------------ head
def fig_head(s: FigSpec) -> Art:
    b = _sub(1)          # behind the head
    f = _sub(3)          # in front of the head
    fur, o = s.fur, _o(s.fur)
    # ears
    e = s.ears_ext
    if e == "floppy":
        for sx in (-1, 1):
            b.ellipse(300 + sx * 160, 300, 44, 104, b.shaded(darken(fur, 0.12)), o, rotate=sx * -10)
    elif e == "elephant":
        for sx in (-1, 1):
            b.ellipse(300 + sx * 186, 262, 104, 124, b.shaded(fur), o, rotate=sx * 6)
            b.ellipse(300 + sx * 186, 262, 74, 94, s.ear_inner, None, rotate=sx * 6)
    elif e == "bat":
        for sx in (-1, 1):
            b.poly([(300 + sx * 100, 150), (300 + sx * 200, 20), (300 + sx * 196, 200)], b.shaded(fur), o)
            b.poly([(300 + sx * 122, 148), (300 + sx * 190, 62), (300 + sx * 180, 180)], s.ear_inner)
    elif e == "elf":
        for sx in (-1, 1):
            b.poly([(300 + sx * 150, 236), (300 + sx * 214, 190), (300 + sx * 160, 296)], b.shaded(fur), o)
            b.poly([(300 + sx * 158, 246), (300 + sx * 196, 214), (300 + sx * 162, 282)], s.ear_inner)
    elif e == "hood":
        b.ellipse(300, 240, 208, 156, b.shaded(darken(fur, 0.12)), o)
        for dx in (-130, -65, 0, 65, 130):
            b.ellipse(300 + dx, 150 + abs(dx) * 0.25, 22, 18, darken(fur, 0.3), None, opacity=0.5)
    elif e == "cat_small":
        for sx in (-1, 1):
            b.poly([(300 + sx * 90, 150), (300 + sx * 128, 70), (300 + sx * 170, 170)], b.shaded(fur), o)
            b.poly([(300 + sx * 106, 148), (300 + sx * 128, 98), (300 + sx * 150, 164)], s.ear_inner)
    # horns (behind the head)
    h = s.horns
    hc = s.horn_colour
    if h in ("short", "demon"):
        for sx in (-1, 1):
            hh = 96 if h == "demon" else 60
            b.poly([(300 + sx * 70, 126), (300 + sx * 112, 126 - hh), (300 + sx * 136, 140)], b.shaded(hc), _o(hc))
    elif h == "bull":
        for sx in (-1, 1):
            d = f"M {300 + sx * 120} 150 C {300 + sx * 200} 140 {300 + sx * 232} 100 {300 + sx * 214} 40"
            b.path(d, None, _o(hc), 42)
            b.path(d, None, hc, 30)
    elif h == "ram":
        for sx in (-1, 1):
            d = f"M {300 + sx * 110} 150 C {300 + sx * 230} 120 {300 + sx * 240} 270 {300 + sx * 160} 262 C {300 + sx * 120} 256 {300 + sx * 140} 200 {300 + sx * 170} 210"
            b.path(d, None, _o(hc), 40)
            b.path(d, None, hc, 28)
    elif h == "antlers":
        for sx in (-1, 1):
            for d in (f"M {300 + sx * 70} 130 L {300 + sx * 120} 40 L {300 + sx * 110} -10", f"M {300 + sx * 100} 78 L {300 + sx * 170} 60",
                      f"M {300 + sx * 114} 52 L {300 + sx * 176} 14"):
                b.path(d, None, _o(hc), 20)
                b.path(d, None, hc, 11)
    # hair / hood / jata / crest (behind)
    hw = s.headwear
    if hw == "hood":
        b.ellipse(300, 250, 188, 170, b.shaded(s.headwear_colour), _o(s.headwear_colour))
    if hw == "hair_long" or s.long_hair:
        for sx in (-1, 1):
            b.path(f"M {300 + sx * 174} 200 Q {300 + sx * 214} 380 {300 + sx * 176} 520 L {300 + sx * 100} 520 Q {300 + sx * 130} 380 {300 + sx * 120} 270 Z",
                   b.shaded(s.hair_colour), _o(s.hair_colour))
        b.ellipse(300, 214, 178, 152, b.shaded(s.hair_colour), _o(s.hair_colour))
    elif hw == "hair_long_unused":
        pass
    elif hw == "jata":
        b.path("M 128 220 Q 90 420 160 470 Q 200 380 190 250 Z", b.shaded(s.hair_colour), _o(s.hair_colour))
        b.path("M 472 220 Q 510 420 440 470 Q 400 380 410 250 Z", b.shaded(s.hair_colour), _o(s.hair_colour))
    elif hw == "crest":
        for i, (dx, hh) in enumerate(((-50, 90), (0, 130), (50, 90))):
            b.ellipse(300 + dx, 110 - hh / 2 + 16, 24, hh / 2 + 10, b.shaded(s.headwear_colour), _o(s.headwear_colour), rotate=dx * 0.4)
    elif hw == "plume":
        b.path("M 300 112 C 280 40 330 0 380 -6 C 360 30 350 70 322 116 Z", b.shaded(s.headwear_colour), _o(s.headwear_colour))
    if s.ridge:
        for i in range(9):
            x = 190 + i * 27
            b.poly([(x - 14, 150), (x, 70 + abs(i - 4) * 10), (x + 14, 150)], b.shaded(s.ridge), _o(s.ridge), 3)
    if s.halo:
        b.circle(300, 120, 78, None, s.halo, 8, 0.8)
    if s.glow:
        b.ellipse(300, 260, 220, 200, b.radial(s.glow, s.glow), None, opacity=0.18)
    # base head
    head = biped_head(_base(s))
    # face pattern
    p = s.pattern
    pc = s.pattern_colour
    if p == "stripes":
        for sx in (-1, 1):
            for dy, ln in ((0, 56), (28, 46), (-26, 40)):
                f.path(f"M {300 + sx * 160} {240 + dy} Q {300 + sx * (160 - ln)} {236 + dy} {300 + sx * (160 - ln * 1.3)} {256 + dy}", None, pc, 12)
        for dx in (-24, 0, 24):
            f.path(f"M {300 + dx} 120 L {300 + dx * 0.8} {160 - abs(dx) * 0.3}", None, pc, 12)
    elif p == "spots":
        for x, y, r in ((200, 170, 11), (250, 140, 9), (350, 140, 9), (400, 170, 11), (170, 250, 10), (430, 250, 10), (300, 130, 8)):
            f.circle(x, y, r, pc, None, opacity=0.9)
    elif p == "patches":
        f.ellipse(210, 190, 52, 44, pc, None, opacity=0.95)
        f.ellipse(420, 300, 40, 30, pc, None, opacity=0.95)
    elif p == "zebra":
        for dx in (-70, -35, 0, 35, 70):
            f.path(f"M {300 + dx} 118 L {300 + dx * 1.2} 168", None, pc, 12)
        for sx in (-1, 1):
            for dy in (0, 30):
                f.path(f"M {300 + sx * 160} {220 + dy} L {300 + sx * 118} {226 + dy}", None, pc, 11)
    # muzzles / trunk / snout
    m = s.muzzle_ext
    if m == "snout":
        f.ellipse(300, 322, 62, 44, f.shaded("#f4a6a0"), _o("#f4a6a0"))
        for dx in (-20, 20):
            f.ellipse(300 + dx, 322, 9, 14, "#8a3a3a")
    elif m == "wide":
        f.ellipse(300, 330, 96, 60, f.shaded(lighten(s.belly, 0.1)), _o(s.belly), 5)
        for dx in (-34, 34):
            f.ellipse(300 + dx, 318, 10, 14, "#6a4a4a")
    elif m == "cat":
        f.ellipse(300, 326, 62, 40, lighten(s.belly, 0.2))
        f.poly([(284, 296), (316, 296), (300, 314)], s.nose, None)
        if s.whiskers:
            for sx in (-1, 1):
                for dy in (-6, 8):
                    f.path(f"M {300 + sx * 50} {326 + dy} L {300 + sx * 150} {316 + dy * 2}", None, "#ffffff", 4)
    elif m == "trunk":
        d = "M 262 290 C 262 380 252 430 262 470 C 270 500 304 500 312 470 C 318 450 300 440 300 420 L 338 290 Z"
        f.path(d, f.shaded(fur), o)
        for y in (330, 360, 390, 420):
            f.path(f"M 270 {y} Q 300 {y + 12} 330 {y - 4 - (y - 330) * 0.1}", None, darken(fur, 0.3), 4, 0.6)
        for sx in (-1, 1) if s.fangs or s.horns == "tusk" else ():
            f.path(f"M {300 + sx * 70} 330 Q {300 + sx * 120} 400 {300 + sx * 70} 440", None, "#fffdf2", 24)
    elif m == "tusk":
        pass
    # beard
    bd, bc = s.beard, s.beard_colour
    if bd == "short":
        f.path("M 150 300 Q 160 420 300 430 Q 440 420 450 300 Q 420 380 300 372 Q 180 380 150 300 Z", f.shaded(bc), _o(bc))
    elif bd == "long":
        f.path("M 150 296 Q 150 420 250 560 Q 300 600 350 560 Q 450 420 450 296 Q 420 392 300 390 Q 180 392 150 296 Z", f.shaded(bc), _o(bc))
    elif bd == "goatee":
        f.path("M 262 372 Q 300 360 338 372 Q 330 440 300 452 Q 270 440 262 372 Z", f.shaded(bc), _o(bc))
    elif bd == "stubble":
        f.path("M 160 310 Q 170 400 300 410 Q 430 400 440 310 Q 420 372 300 368 Q 180 372 160 310 Z", bc, None, 0, 0.35)
    # headwear on top
    if s.long_hair and hw not in ("hair_long", "jata", "hood", "hat_wide", "hat_pointed", "helmet"):
        f.path("M 134 232 Q 146 100 300 104 Q 454 100 466 232 Q 430 156 300 152 Q 170 156 134 232 Z", f.shaded(s.hair_colour), _o(s.hair_colour))
    c = s.headwear_colour
    if hw == "crown":
        f.path("M 170 156 L 176 70 L 224 118 L 262 56 L 300 112 L 338 56 L 376 118 L 424 70 L 430 156 Q 300 176 170 156 Z", f.shaded(c), _o(c), 6)
        for x in (176, 262, 338, 424):
            f.circle(x, 70 if x in (176, 424) else 56, 9, "#d8362a", _o(c), 3)
        f.circle(300, 140, 12, "#3a6ad8", _o(c), 3)
    elif hw == "tiara":
        f.path("M 190 160 Q 300 118 410 160 Q 300 140 190 160 Z", f.shaded(c), _o(c), 5)
        f.path("M 280 140 L 300 96 L 320 140 Z", f.shaded(c), _o(c), 4)
        f.circle(300, 134, 9, "#d8362a", _o(c), 3)
    elif hw == "cap":
        f.path("M 146 170 Q 150 80 300 78 Q 450 80 454 170 Q 300 148 146 170 Z", f.shaded(c), _o(c))
        f.path("M 146 170 Q 300 150 454 170", None, darken(c, 0.3), 8)
    elif hw == "helmet":
        f.path("M 140 190 Q 140 70 300 62 Q 460 70 460 190 L 440 186 Q 300 150 160 186 Z", f.shaded(c), _o(c))
        f.path("M 300 62 L 300 20", None, _o(c), 10)
        f.circle(300, 20, 14, "#d8362a", _o(c), 3)
    elif hw == "hat_wide":
        f.ellipse(300, 150, 222, 38, f.shaded(c), _o(c))
        f.path("M 190 150 Q 200 40 300 36 Q 400 40 410 150 Z", f.shaded(c), _o(c))
    elif hw == "hat_pointed":
        f.poly([(160, 150), (300, -40), (440, 150)], f.shaded(c), _o(c))
        f.path("M 160 150 Q 300 176 440 150", None, darken(c, 0.3), 8)
    elif hw == "topknot":
        f.path("M 138 232 Q 150 100 300 100 Q 450 100 462 232 Q 420 160 300 160 Q 180 160 138 232 Z", f.shaded(s.hair_colour), _o(s.hair_colour))
        f.circle(300, 84, 30, f.shaded(s.hair_colour), _o(s.hair_colour))
    elif hw in ("hair_long", "jata") or False:
        f.path("M 134 232 Q 146 86 300 90 Q 454 86 466 232 Q 430 150 300 148 Q 170 150 134 232 Z", f.shaded(s.hair_colour), _o(s.hair_colour))
        if hw == "jata":
            f.circle(300, 70, 40, f.shaded(s.hair_colour), _o(s.hair_colour))
            f.path("M 270 70 Q 300 40 330 70", None, darken(s.hair_colour, 0.3), 6)
    if s.horns == "nose":
        f.path("M 268 300 Q 300 214 332 300 Q 300 282 268 300 Z", f.shaded("#d8d0c0"), _o("#d8d0c0"), 4)
    if s.tilak:
        f.path("M 300 170 L 300 196", None, s.tilak, 11)
    if s.fangs:
        for dx in (-26, 26):
            f.poly([(300 + dx - 8, 352), (300 + dx + 8, 352), (300 + dx, 384)], "#ffffff", _o("#ffffff"), 2)
    return _join(b, head, f)


# ------------------------------------------------------------------------------------------------ body / limbs
def fig_body(s: FigSpec) -> Art:
    if s.outfit is None or not s.clothes:
        a = biped_body(s)
        if s.pattern in ("stripes", "spots", "patches", "zebra") and not s.clothes:
            pc = s.pattern_colour
            if s.pattern == "stripes" or s.pattern == "zebra":
                for dy in (440, 480, 520, 560):
                    a.path(f"M {206} {dy} Q 240 {dy - 12} 270 {dy}", None, pc, 12)
                    a.path(f"M {394} {dy} Q 360 {dy - 12} 330 {dy}", None, pc, 12)
            else:
                for x, y, r in ((240, 440, 16), (350, 470, 14), (270, 530, 17), (360, 560, 13), (210, 500, 11)):
                    a.circle(x, y, r, pc, None, opacity=0.9)
        if s.wings and not s.clothes:
            pass
        return a
    c = s.clothes
    top, trim = c["top"], c.get("trim", darken(c["top"], 0.2))
    a = Art(BW, BH)
    w = 98 * s.belly_scale
    if s.outfit == "robe":
        a.path(f"M {300 - w * 0.8} 392 Q 300 372 {300 + w * 0.8} 392 L {300 + w * 1.5} 670 Q 300 700 {300 - w * 1.5} 670 Z", a.shaded(top), _o(top))
        a.path("M 300 392 L 300 676", None, trim, 6)
        a.path(f"M {300 - w * 1.45} 660 Q 300 692 {300 + w * 1.45} 660", None, trim, 12)
        a.path(f"M {300 - w * 0.8} 440 Q 300 470 {300 + w * 0.8} 440", None, trim, 14)
    elif s.outfit == "armor":
        a.path(f"M {300 - w * 0.8} 392 Q 300 372 {300 + w * 0.8} 392 L {300 + w * 1.08} 590 Q 300 628 {300 - w * 1.08} 590 Z", a.shaded(c.get("bottom", top)), _o(top))
        a.path(f"M {300 - w * 0.85} 400 Q 300 380 {300 + w * 0.85} 400 L {300 + w * 0.9} 540 Q 300 566 {300 - w * 0.9} 540 Z", a.shaded("#b8bcc8"), "#5a5e6a")
        for y in (440, 480, 520):
            a.path(f"M {300 - w * 0.8} {y} Q 300 {y + 14} {300 + w * 0.8} {y}", None, "#7a7e8a", 4)
        a.path(f"M {300 - w * 1.05} 575 Q 300 612 {300 + w * 1.05} 575", None, trim, 14)
        a.circle(300, 470, 16, trim, _o(trim), 3)
    elif s.outfit == "dress":
        a.path(f"M {300 - w * 0.8} 392 Q 300 372 {300 + w * 0.8} 392 L {300 + w * 1.5} 640 Q 300 680 {300 - w * 1.5} 640 Z", a.shaded(top), _o(top))
        a.path(f"M {300 - w * 0.8} 392 L {300 + w * 1.3} 640", None, trim, 18, 0.85)
        a.path(f"M {300 - w * 1.45} 632 Q 300 676 {300 + w * 1.45} 632", None, trim, 12)
        a.path(f"M {300 - w * 0.8} 440 Q 300 460 {300 + w * 0.8} 440", None, trim, 8)
    elif s.outfit == "vest":
        a.ellipse(300, 495, w, 116, a.shaded(s.fur), _o(s.fur))
        a.path(f"M {300 - w * 0.9} 420 L {300 - w * 0.2} 410 L {300 - w * 0.3} 580 L {300 - w * 1.0} 570 Z", a.shaded(top), _o(top))
        a.path(f"M {300 + w * 0.9} 420 L {300 + w * 0.2} 410 L {300 + w * 0.3} 580 L {300 + w * 1.0} 570 Z", a.shaded(top), _o(top))
        a.path(f"M {300 - w * 1.0} 586 Q 300 622 {300 + w * 1.0} 586", None, trim, 12)
    else:  # wrap
        return biped_body(s)
    return a


def fig_leg(s: FigSpec, x: float) -> Art:
    a = Art(BW, BH)
    if s.category == "bird":
        col = s.foot_colour or "#e8902a"
        a.rect(x - 9, 580, 18, 96, a.shaded(col), _o(col), rx=8)
        for dx in (-34, 0, 34):
            a.path(f"M {x} 676 L {x + dx} 690", None, _o(col), 18)
            a.path(f"M {x} 676 L {x + dx} 690", None, col, 10)
        return a
    colour = s.clothes["bottom"] if s.clothes else s.fur
    if s.outfit in ("robe", "dress"):
        colour = s.clothes["top"]
    a.rect(x - 31, 572, 62, 100, a.shaded(colour), _o(colour), rx=28)
    foot = s.foot_colour or (s.clothes.get("shoes", "#6b4226") if s.clothes else darken(s.fur, 0.12))
    if s.feet == "hoof":
        a.path(f"M {x - 34} 662 L {x + 34} 662 L {x + 38} 692 L {x - 38} 692 Z", a.shaded(foot), _o(foot))
    elif s.feet == "claw":
        a.ellipse(x, 676, 46, 22, a.shaded(foot), _o(foot))
        for dx in (-22, 0, 22):
            a.poly([(x + dx - 6, 690), (x + dx + 6, 690), (x + dx, 704)], "#f4f0e0", _o("#f4f0e0"), 2)
    elif s.feet == "bare" and s.clothes:
        a.ellipse(x, 676, 44, 20, a.shaded(s.fur), _o(s.fur))
    else:
        a.ellipse(x, 676, 46, 22, a.shaded(foot), _o(foot))
    return a


def _held(a: Art, s: FigSpec, x: float) -> None:
    h = s.held
    if not h:
        return
    hx, hy = x, 548
    if h == "staff":
        a.rect(hx - 6, 360, 12, 330, a.shaded("#8a5a33"), _o("#8a5a33"), 3, rx=5)
        a.circle(hx, 356, 16, a.shaded("#e6b93c"), _o("#e6b93c"), 4)
    elif h == "sword":
        a.path(f"M {hx - 8} 548 L {hx - 8} 300 L {hx} 270 L {hx + 8} 300 L {hx + 8} 548 Z", a.shaded("#d8dce6"), "#5a5e6a", 4)
        a.rect(hx - 28, 540, 56, 12, a.shaded("#e6b93c"), _o("#e6b93c"), 3, rx=4)
    elif h == "scroll":
        a.rect(hx - 40, 520, 80, 44, "#f4e8c8", "#8a6a3a", 4, rx=10)
        a.ellipse(hx - 40, 542, 9, 22, "#c8a870", "#8a6a3a", 3)
        a.ellipse(hx + 40, 542, 9, 22, "#c8a870", "#8a6a3a", 3)
    elif h == "flute":
        a.rect(hx - 60, 536, 120, 14, a.shaded("#c9a050"), _o("#c9a050"), 3, rx=6, rotate=-12)
    elif h == "club":
        a.path(f"M {hx - 10} 560 L {hx - 14} 400 Q {hx - 40} 380 {hx - 36} 340 Q {hx} 300 {hx + 36} 340 Q {hx + 40} 380 {hx + 14} 400 L {hx + 10} 560 Z", a.shaded("#8a5a33"), _o("#8a5a33"), 4)
    elif h == "bow":
        a.path(f"M {hx} 340 Q {hx + 70} 450 {hx} 560", None, "#6a4a2a", 10)
        a.path(f"M {hx} 340 L {hx} 560", None, "#e8e0c8", 3)
    elif h == "bowl":
        a.path(f"M {hx - 38} 530 Q {hx} 600 {hx + 38} 530 Z", a.shaded("#c9783c"), _o("#c9783c"), 4)
    elif h == "lantern":
        a.rect(hx - 20, 560, 40, 56, a.shaded("#e6b93c"), "#6a4a2a", 4, rx=8)
        a.path(f"M {hx - 20} 560 Q {hx} 530 {hx + 20} 560", None, "#6a4a2a", 4)


def fig_arm(s: FigSpec, x: float, tilt: float, right: bool = False) -> Art:
    a = Art(BW, BH)
    g = f'<g transform="rotate({tilt} {x} 428)">'
    a.raw(g)
    if s.wings:
        wc = s.wing_colour or s.fur
        sign = 1 if right else -1
        a.path(f"M {x} 416 C {x + sign * 56} 410 {x + sign * 74} 500 {x + sign * 40} 590 C {x + sign * 20} 580 {x} 560 {x - sign * 14} 440 Z", a.shaded(wc), _o(wc))
        for i in range(4):
            a.path(f"M {x + sign * (10 + i * 12)} 500 L {x + sign * (16 + i * 10)} {584 - i * 4}", None, darken(wc, 0.25), 4, 0.7)
        a.raw("</g>")
        return a
    colour = s.clothes["top"] if s.clothes else s.fur
    if s.outfit == "armor":
        colour = "#b8bcc8"
    hand = s.fur if s.clothes else lighten(s.fur, 0.12)
    a.rect(x - 24, 412, 48, 132, a.shaded(colour), _o(colour), rx=24)
    if s.clothes and s.outfit in ("robe", "dress", "armor"):
        a.rect(x - 26, 506, 52, 14, a.shaded(s.clothes.get("trim", darken(colour, 0.2))), _o(colour), 3, rx=6)
    a.circle(x, 548, 27, a.shaded(hand), _o(hand))
    if right:
        _held(a, s, x)
    a.raw("</g>")
    return a


def fig_tail(s: FigSpec) -> Art:
    a = Art(BW, BH)
    lt = s.long_tail
    o = _o(s.fur)
    if lt == "cow":
        a.path("M 352 590 C 440 620 470 660 462 700", None, o, 26)
        a.path("M 352 590 C 440 620 470 660 462 700", None, s.fur, 15)
        a.ellipse(462, 706, 20, 30, a.shaded(darken(s.fur, 0.4)), _o(s.fur), 3)
    elif lt == "horse":
        tc = s.ridge or darken(s.fur, 0.4)
        a.path("M 350 580 C 450 575 490 630 468 690", None, o, 56)
        a.path("M 350 580 C 450 575 490 630 468 690", None, tc, 42)
    elif lt == "rat":
        a.path("M 352 600 C 470 640 520 560 560 520", None, o, 16)
        a.path("M 352 600 C 470 640 520 560 560 520", None, "#f0b8b0", 8)
    elif lt == "fan":
        base = s.headwear_colour if s.category == "bird" else s.fur
        for i in range(11):
            ang = (i - 5) * 0.27 - 0.5
            ex, ey = 340 + math.sin(ang) * 220 + 80, 560 - math.cos(ang) * 260
            a.path(f"M 340 580 L {ex} {ey}", None, "#2f8a58", 6)
            a.ellipse(ex, ey, 30, 42, a.shaded("#2a9a78"), "#1a5a48", 4, rotate=ang * 57)
            a.ellipse(ex, ey, 17, 25, "#3a6ad8", None, rotate=ang * 57)
            a.ellipse(ex, ey + 2, 8, 12, "#e6b93c", None, rotate=ang * 57)
    elif lt == "lizard":
        a.path("M 350 600 C 470 640 540 600 570 540", None, o, 36)
        a.path("M 350 600 C 470 640 540 600 570 540", None, s.fur, 24)
    elif lt == "snake":
        a.path("M 340 560 C 470 560 520 640 420 690 C 360 716 330 690 380 668", None, o, 44)
        a.path("M 340 560 C 470 560 520 640 420 690 C 360 716 330 690 380 668", None, s.fur, 32)
    elif lt == "feather":
        for i, (ang, ln) in enumerate(((10, 92), (32, 104), (54, 92))):
            r = math.radians(ang)
            cx, cy = 352 + math.sin(r) * ln * 0.5, 588 + math.cos(r) * ln * 0.5
            a.ellipse(cx, cy, 15, ln * 0.55, a.shaded(darken(s.fur, 0.12 * (i % 2))), o, 3, rotate=-ang)
    elif lt in ("wings", "wings_lizard"):
        wc = s.wing_colour or lighten(s.fur, 0.4)
        for sx in (-1, 1):
            a.path(f"M {300 + sx * 40} 440 C {300 + sx * 180} 330 {300 + sx * 260} 420 {300 + sx * 150} 540 C {300 + sx * 110} 520 {300 + sx * 70} 500 {300 + sx * 40} 480 Z",
                   a.shaded(wc), _o(wc), 4, 0.85)
            a.path(f"M {300 + sx * 50} 460 Q {300 + sx * 150} 420 {300 + sx * 200} 410", None, darken(wc, 0.3), 3, 0.7)
        if lt == "wings_lizard":
            a.path("M 350 600 C 470 640 540 600 570 540", None, o, 36)
            a.path("M 350 600 C 470 640 540 600 570 540", None, s.fur, 24)
    else:
        return biped_tail(s)
    return a


# ------------------------------------------------------------------------------------------------ face parts
def fig_eyes(s: FigSpec, variant: str) -> Art:
    if variant in ("open", "closed", "happy", "wide", "sad", "angry"):
        return biped_eyes(s, variant)
    a = Art(BW, BH)
    lid = s.face or s.fur
    for i, (cx, cy) in enumerate((EYE_L, EYE_R)):
        sign = -1 if i == 0 else 1
        a.ellipse(cx, cy, 38, 48, "#ffffff", INK, 6)
        clip = f"lidx{i}"
        a.defs.append(f'<clipPath id="{clip}"><ellipse cx="{cx}" cy="{cy}" rx="38" ry="48"/></clipPath>')
        a.raw(f'<g clip-path="url(#{clip})">')
        if variant == "half":
            a.rect(cx - 50, cy - 60, 100, 62, lid, None, 0)
            a.path(f"M {cx - 40} {cy + 2} L {cx + 40} {cy + 2}", None, INK, 6)
        elif variant == "tear":
            a.poly([(cx + sign * 48, cy - 60), (cx - sign * 48, cy - 60), (cx - sign * 48, cy - 44), (cx + sign * 48, cy - 14)], lid)
            a.path(f"M {cx - sign * 48} {cy - 44} L {cx + sign * 48} {cy - 14}", None, INK, 6)
        a.raw("</g>")
        a.ellipse(cx, cy, 38, 48, None, INK, 6)
        if variant == "tear":
            a.path(f"M {cx} {cy + 40} Q {cx - 12} {cy + 76} {cx} {cy + 96} Q {cx + 12} {cy + 76} {cx} {cy + 40} Z", "#7fc8f0", "#3a7ab0", 3, 0.9)
            a.ellipse(cx + sign * 30, cy + 70, 7, 12, "#7fc8f0", "#3a7ab0", 2, 0.85)
    return a


def fig_mouth(s: FigSpec, variant: str, cy: float) -> Art:
    if s.category == "bird" or s.muzzle_ext and s.muzzle_ext.startswith("beak"):
        return bird_beak(s, variant, cy)
    if variant in ("closed", "neutral", "sad", "small", "open", "wide", "o"):
        return biped_mouth(s, variant, cy)
    a = Art(BW, BH)
    if variant == "frown":
        a.path(f"M 270 {cy + 10} Q 300 {cy - 6} 330 {cy + 10}", None, INK, 7)
    elif variant == "smirk":
        a.path(f"M 272 {cy + 4} Q 304 {cy + 12} 334 {cy - 8}", None, INK, 7)
    elif variant == "grit":
        a.rect(268, cy - 10, 64, 24, "#ffffff", INK, 5, rx=8)
        a.path(f"M 268 {cy + 2} L 332 {cy + 2}", None, INK, 3)
        for x in (284, 300, 316):
            a.path(f"M {x} {cy - 10} L {x} {cy + 14}", None, INK, 2)
    elif variant == "cry":
        a.path(f"M 258 {cy + 30} Q 300 {cy - 18} 342 {cy + 30} Q 300 {cy + 12} 258 {cy + 30} Z", MOUTH_DARK, INK, 5)
        a.ellipse(300, cy + 24, 18, 7, TONGUE)
    return a


def bird_beak(s: FigSpec, variant: str, cy: float) -> Art:
    a = Art(BW, BH)
    c = s.beak
    kind = s.muzzle_ext or "beak_short"
    open_amt = {"open": 16, "wide": 28, "o": 12, "small": 8, "cry": 22}.get(variant, 0)
    droop = 8 if variant in ("sad", "frown") else 0
    top_y = 312 + droop
    if kind == "beak_hook":
        upper = f"M 250 {top_y} Q 300 {top_y - 28} 350 {top_y} Q 346 {top_y + 52} 306 {top_y + 70} Q 312 {top_y + 36} 300 {top_y + 24} Q 288 {top_y + 36} 294 {top_y + 70} Q 254 {top_y + 52} 250 {top_y} Z"
    elif kind == "beak_long":
        upper = f"M 276 {top_y} L 324 {top_y} L 304 {top_y + 120} L 296 {top_y + 120} Z"
    elif kind == "beak_flat":
        upper = f"M 220 {top_y} Q 300 {top_y - 24} 380 {top_y} Q 400 {top_y + 24} 300 {top_y + 34} Q 200 {top_y + 24} 220 {top_y} Z"
    elif kind == "beak_spear":
        upper = f"M 270 {top_y} L 330 {top_y} L 304 {top_y + 96} L 296 {top_y + 96} Z"
    else:
        upper = f"M 260 {top_y} Q 300 {top_y - 24} 340 {top_y} Q 330 {top_y + 38} 300 {top_y + 44} Q 270 {top_y + 38} 260 {top_y} Z"
    ln = {"beak_long": 118, "beak_spear": 94, "beak_flat": 32, "beak_hook": 66}.get(kind, 40)
    if open_amt:
        a.path(f"M 264 {top_y + ln * 0.5 + open_amt * 0.6} Q 300 {top_y + ln + open_amt} 336 {top_y + ln * 0.5 + open_amt * 0.6} Q 300 {top_y + ln * 0.5 + open_amt * 1.4} 264 {top_y + ln * 0.5 + open_amt * 0.6} Z"
               if kind not in ("beak_long", "beak_spear") else f"M 296 {top_y + ln * 0.5} L 304 {top_y + ln * 0.5} L 300 {top_y + ln + open_amt} Z", a.shaded(darken(c, 0.15)), _o(c), 4)
        a.ellipse(300, top_y + ln * 0.5 + open_amt * 0.9, 14, open_amt * 0.5, MOUTH_DARK, None)
    a.path(upper, a.shaded(c), _o(c), 5)
    return a


FACES = {
    "neutral": {"variants": {"eyes": "open", "pupils": "normal", "mouth": "closed"}},
    "happy": {"variants": {"eyes": "happy", "pupils": "none", "mouth": "closed"}, "parts": {"brow_l": {"y": 5}, "brow_r": {"y": 5}}},
    "sad": {"variants": {"eyes": "sad", "pupils": "normal", "mouth": "sad"}, "parts": {"brow_l": {"rotation": 16}, "brow_r": {"rotation": -16}, "pupils": {"y": -5}}},
    "surprised": {"variants": {"eyes": "wide", "pupils": "small", "mouth": "o"}, "parts": {"brow_l": {"y": 14}, "brow_r": {"y": 14}}},
    "angry": {"variants": {"eyes": "angry", "pupils": "normal", "mouth": "sad"}, "parts": {"brow_l": {"rotation": -18, "y": -8}, "brow_r": {"rotation": 18, "y": -8}}},
    "worried": {"variants": {"eyes": "wide", "pupils": "small", "mouth": "small"}, "parts": {"brow_l": {"rotation": 18, "y": 8}, "brow_r": {"rotation": -18, "y": 8}}},
    "thinking": {"variants": {"eyes": "open", "pupils": "normal", "mouth": "neutral"}, "parts": {"pupils": {"x": 9, "y": 10}, "brow_l": {"y": 10, "rotation": -6}}},
    "laughing": {"variants": {"eyes": "happy", "pupils": "none", "mouth": "wide"}, "parts": {"brow_l": {"y": 8}, "brow_r": {"y": 8}}},
    "speaking": {"variants": {"eyes": "open", "pupils": "normal", "mouth": "small"}},
    "crying": {"variants": {"eyes": "tear", "pupils": "none", "mouth": "cry"}, "parts": {"brow_l": {"rotation": 20, "y": 6}, "brow_r": {"rotation": -20, "y": 6}}},
    "frightened": {"variants": {"eyes": "wide", "pupils": "small", "mouth": "frown"}, "parts": {"brow_l": {"rotation": 22, "y": 16}, "brow_r": {"rotation": -22, "y": 16}, "pupils": {"y": -6}}},
    "suspicious": {"variants": {"eyes": "half", "pupils": "normal", "mouth": "smirk"}, "parts": {"pupils": {"x": 10, "y": 8}, "brow_l": {"rotation": -10, "y": -4}, "brow_r": {"y": 10}}},
    "excited": {"variants": {"eyes": "wide", "pupils": "normal", "mouth": "wide"}, "parts": {"brow_l": {"y": 14}, "brow_r": {"y": 14}}},
    "disappointed": {"variants": {"eyes": "half", "pupils": "normal", "mouth": "frown"}, "parts": {"pupils": {"y": 10}, "brow_l": {"rotation": 10, "y": 4}, "brow_r": {"rotation": -10, "y": 4}}},
    "determined": {"variants": {"eyes": "angry", "pupils": "small", "mouth": "grit"}, "parts": {"brow_l": {"rotation": -12, "y": -10}, "brow_r": {"rotation": 12, "y": -10}}},
}

POSES = {
    "standing": {},
    "walking": {"leg_l": {"rotation": 24}, "leg_r": {"rotation": -24}, "arm_l": {"rotation": -28}, "arm_r": {"rotation": 28}},
    "running": {"leg_l": {"rotation": 50}, "leg_r": {"rotation": -50}, "arm_l": {"rotation": -60}, "arm_r": {"rotation": 60}, "body": {"rotation": 8}, "root": {"y": -6}},
    "sitting": {"root": {"y": -66}, "leg_l": {"rotation": -68}, "leg_r": {"rotation": 68}},
    "sleeping": {"root": {"rotation": 88, "y": -40}, "arm_l": {"rotation": -20}, "arm_r": {"rotation": 20}},
    "jumping": {"root": {"y": -70}, "leg_l": {"rotation": -25}, "leg_r": {"rotation": 25}, "arm_l": {"rotation": -150}, "arm_r": {"rotation": 150}},
    "talking": {"arm_r": {"rotation": 40}, "head": {"rotation": 4}},
    "pointing": {"arm_r": {"rotation": 100}, "head": {"rotation": -4}},
    "waving": {"arm_r": {"rotation": 158}},
    "fighting": {"arm_l": {"rotation": -80}, "arm_r": {"rotation": 80}, "body": {"rotation": -8}, "leg_l": {"rotation": -30}, "leg_r": {"rotation": 30}},
    "dancing": {"arm_l": {"rotation": -140}, "arm_r": {"rotation": 96}, "body": {"rotation": 10}, "leg_l": {"rotation": 16}, "leg_r": {"rotation": -32}, "head": {"rotation": -8}},
    "kneeling": {"root": {"y": -58}, "leg_l": {"rotation": -88}, "leg_r": {"rotation": 22}, "arm_l": {"rotation": -24}},
    "falling": {"root": {"rotation": -35, "y": -30}, "arm_l": {"rotation": -150}, "arm_r": {"rotation": 150}, "leg_l": {"rotation": -35}, "leg_r": {"rotation": 35}},
    "climbing": {"arm_l": {"rotation": -168}, "arm_r": {"rotation": 125}, "leg_l": {"rotation": 62}, "leg_r": {"rotation": -20}, "body": {"rotation": -6}},
    "holding_object": {"arm_l": {"rotation": -62}, "arm_r": {"rotation": 62}},
}


# ------------------------------------------------------------------------------------------------ build
def _save_part(art: Art, out: Path, name: str) -> tuple[list[float], list[float]]:
    """Write the SVG master and the PNG rasterised from it, both cropped to the same box (+3px padding)."""
    from PIL import Image  # noqa: F401
    import io
    import re

    import cairosvg
    im = art.render()
    box = im.getbbox()
    if box is None:
        raise ValueError(f"nothing was drawn for {name}")
    box = (max(0, box[0] - 3), max(0, box[1] - 3), min(im.width, box[2] + 3), min(im.height, box[3] + 3))
    (out / "rig").mkdir(parents=True, exist_ok=True)
    im.crop(box).quantize(colors=256, method=Image.Quantize.FASTOCTREE, dither=Image.Dither.NONE).save(out / "rig" / f"{name}.png", optimize=True)
    w, h = box[2] - box[0], box[3] - box[1]
    svg = art.svg()
    head = re.match(r"<svg [^>]*>", svg).group(0)
    svg = svg.replace(head, f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="{box[0]} {box[1]} {w} {h}">', 1)
    (out / "rig" / f"{name}.svg").write_text(svg, encoding="utf-8")
    return [float(box[0]), float(box[1])], [float(w), float(h)]


def build_fig(s: FigSpec, out: Path) -> dict:
    mouth_y = 346 if (s.muzzle or s.muzzle_ext in ("snout", "wide", "cat")) else 352
    parts: list[dict] = []

    def part(pid, component, parent, pivot, order, drawings: dict[str, Art], limits=None):
        variants = {}
        for vname, art in drawings.items():
            origin, size = _save_part(art, out, f"{pid}_{vname}")
            variants[vname] = {"file": f"rig/{pid}_{vname}.png", "svg": f"rig/{pid}_{vname}.svg", "origin": origin, "size": size}
        parts.append({"id": pid, "component": component, "parent": parent, "pivot": list(pivot), "order": order, "variants": variants, "rotation_limits": limits})

    parts.append({"id": "root", "component": "root", "parent": None, "pivot": list(B_GROUND), "order": 0, "variants": {}})
    if s.tail or s.long_tail:
        part("tail", "tail", "body", (352, 590), -3, {"base": fig_tail(s)}, [-70, 70])
    part("leg_l", "left_leg", "root", (255, 588), -2, {"base": fig_leg(s, 255)}, [-100, 100])
    part("leg_r", "right_leg", "root", (345, 588), -2, {"base": fig_leg(s, 345)}, [-100, 100])
    part("arm_l", "left_arm", "body", (222, 428), -1, {"base": fig_arm(s, 222, 14)}, [-185, 185])
    part("body", "body", "root", (300, 600), 0, {"base": fig_body(s)}, [-25, 25])
    part("arm_r", "right_arm", "body", (378, 428), 3, {"base": fig_arm(s, 378, -14, right=True)}, [-185, 185])
    part("head", "head", "body", (300, 388), 5, {"base": fig_head(s)}, [-35, 35])
    part("eyes", "eyes", "head", (300, 262), 6, {v: fig_eyes(s, v) for v in ("open", "closed", "happy", "wide", "sad", "angry", "half", "tear")})
    part("pupils", "eyes", "eyes", (300, 262), 7, {v: biped_pupils(s, v) for v in ("normal", "small")})
    part("brow_l", "eyebrows", "head", (232, 200), 8, {"base": biped_brow(s, 232)}, [-40, 40])
    part("brow_r", "eyebrows", "head", (368, 200), 8, {"base": biped_brow(s, 368)}, [-40, 40])
    part("mouth", "mouth", "head", (300, mouth_y), 8,
         {v: fig_mouth(s, v, mouth_y) for v in ("closed", "neutral", "sad", "small", "open", "wide", "o", "frown", "smirk", "grit", "cry")})
    notes = ["Proportions: head about 1.45x the body height", "Colours are fixed by visual_identity", *s.identity_notes]
    return {
        "id": s.id, "asset_type": "character", "name": s.name, "species": s.species, "aliases": s.aliases, "description": s.description,
        "tags": sorted({s.species, s.category, s.subcategory, "chibi", "biped"} - {""}),
        "catalog_code": s.code, "category": s.category, "subcategory": s.subcategory, "related_stories": s.stories,
        "visual_identity": {"fur_or_skin": s.fur, "belly": s.belly, "face": s.face, "iris": s.iris, "ears": s.ears_ext or s.ears, "tail": s.tail or s.long_tail,
                            "mane": s.mane, "clothes": s.clothes, "horns": s.horns, "headwear": s.headwear, "beard": s.beard, "pattern": s.pattern,
                            "outfit": s.outfit, "held": s.held, "head_to_body_ratio": 1.45, "outline": "dark tone of each fill"},
        "continuity_rules": notes,
        "compatibility": {"habitat": s.habitat, "stage_scale": s.stage_scale, "style": "premium_chibi_anime", "clips": "biped_chibi"},
        "default_voice": s.voice,
        "states": ["standing", "sitting", "in_air"],
        "rig": {"template": "biped_chibi", "canvas": [BW, BH], "ground": list(B_GROUND), "parts": parts,
                "attach_points": {"hand": {"part": "arm_r", "point": [410, 548]}, "mouth": {"part": "head", "point": [300, mouth_y + 6]},
                                  "head_top": {"part": "head", "point": [300, 112]}, "back": {"part": "body", "point": [300, 470]}},
                "talk_part": "mouth", "talk_mode": "variants", "talk_variants": ["closed", "small", "open"]},
        "expressions": FACES, "poses": POSES,
    }
