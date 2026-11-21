"""Side, three-quarter and back views of a `FigSpec` character, on the same rig part ids as the front view.

* side: separately drawn profile (head, muzzle, single eye, near/far limbs, tail on the far side), facing right.
* back: separately drawn (no face, back of head and hair, plain back, tail moved to the middle and in front of the body).
* three_quarter: the front art turned about the vertical axis: near half kept, far half foreshortened, features shifted toward the far side,
  with far-side shading. It is built from the front vocabulary by a per-part turn transform, not drawn from scratch; documented as such.

Every view has the same body part ids, pivots in the same coordinate frame and the same attach points, so the existing clips drive it.
"""
from __future__ import annotations

import math
from pathlib import Path

from .characters import B_GROUND, BH, BW, INK, MOUTH_DARK, TONGUE, biped_body, biped_brow, biped_pupils
from .characters_ext import (FigSpec, _base, _held, _join, _o, _save_part, _sub, fig_arm, fig_body, fig_eyes, fig_head, fig_leg, fig_mouth, fig_tail,
                             head_behind)
from .svg import Art, darken, lighten

EYE_VARIANTS = ("open", "closed", "happy", "wide", "sad", "angry", "half", "tear")
MOUTH_VARIANTS = ("closed", "neutral", "sad", "small", "open", "wide", "o", "frown", "smirk", "grit", "cry")


# ------------------------------------------------------------------------------------------------ SIDE
HX, HY = 288, 250                  # side head centre
def _lid(s): return s.face or s.fur


def side_head(s: FigSpec) -> Art:
    b, f = _sub(1), _sub(3)
    base = _sub(2)
    fur, o = s.fur, _o(s.fur)
    # ears
    e = s.ears_ext or s.ears
    if e == "round_top":
        b.circle(330, 126, 38, b.shaded(darken(fur, 0.1)), o)
        f.circle(246, 130, 42, f.shaded(fur), o)
        f.circle(246, 134, 23, s.ear_inner)
    elif e == "long":
        b.ellipse(306, 66, 34, 104, b.shaded(darken(fur, 0.1)), o, rotate=8)
        f.ellipse(250, 70, 36, 108, f.shaded(fur), o, rotate=-10)
        f.ellipse(250, 76, 18, 80, s.ear_inner, rotate=-10)
    elif e == "pointed":
        b.poly([(270, 150), (350, 40), (356, 170)], b.shaded(darken(fur, 0.1)), o)
        f.poly([(210, 160), (246, 36), (316, 150)], f.shaded(fur), o)
        f.poly([(232, 150), (250, 78), (292, 146)], s.ear_inner)
    elif e == "human":
        f.circle(262, 276, 30, f.shaded(fur), o)
    elif e == "floppy":
        f.ellipse(250, 304, 42, 100, f.shaded(darken(fur, 0.12)), o, rotate=8)
    elif e == "elephant":
        b.ellipse(300, 262, 90, 118, b.shaded(darken(fur, 0.12)), o)
        f.ellipse(226, 276, 96, 120, f.shaded(fur), o)
        f.ellipse(226, 276, 68, 92, s.ear_inner)
    elif e in ("bat", "elf"):
        f.poly([(230, 236), (130, 170), (180, 300)], f.shaded(fur), o)
    elif e == "cat_small":
        b.poly([(290, 150), (340, 80), (372, 170)], b.shaded(darken(fur, 0.1)), o)
        f.poly([(206, 160), (236, 74), (290, 150)], f.shaded(fur), o)
        f.poly([(222, 150), (238, 98), (270, 146)], s.ear_inner)
    elif e == "round_side":
        f.circle(250, 266, 46, f.shaded(fur), o)
        f.circle(250, 266, 28, s.ear_inner)
    elif e == "hood":
        b.ellipse(272, 244, 190, 160, b.shaded(darken(fur, 0.12)), o)
    # horns
    h, hc = s.horns, s.horn_colour
    if h in ("short", "demon"):
        hh = 100 if h == "demon" else 62
        b.poly([(262, 126), (312, 126 - hh), (340, 140)], b.shaded(hc), _o(hc))
    elif h == "bull":
        d = "M 290 150 C 380 150 410 100 400 30"
        b.path(d, None, _o(hc), 42)
        b.path(d, None, hc, 30)
    elif h == "ram":
        d = "M 300 160 C 190 120 150 260 240 262 C 290 262 280 200 250 208"
        b.path(d, None, _o(hc), 40)
        b.path(d, None, hc, 28)
    elif h == "antlers":
        for d in ("M 280 130 L 330 40 L 320 -10", "M 310 78 L 380 62", "M 324 52 L 386 14"):
            b.path(d, None, _o(hc), 20)
            b.path(d, None, hc, 11)
    if s.ridge:
        for i in range(8):
            x = 190 + i * 26
            b.poly([(x - 14, 150), (x, 76 + abs(i - 3) * 10), (x + 14, 150)], b.shaded(s.ridge), _o(s.ridge), 3)
    if s.mane:
        for i in range(14):
            ang = math.pi * 0.5 + i * (math.pi * 1.5) / 13
            b.circle(HX + 150 * math.cos(ang) * 1.05, HY - 150 * math.sin(ang) * 0.95, 54, b.shaded(s.mane), _o(s.mane))
    hw = s.headwear
    if hw == "hair_long" or s.long_hair or hw == "jata":
        b.path("M 160 190 Q 100 420 190 530 L 290 530 Q 250 400 270 240 Z", b.shaded(s.hair_colour), _o(s.hair_colour))
    if hw == "hood":
        b.ellipse(262, 246, 196, 172, b.shaded(s.headwear_colour), _o(s.headwear_colour))
    if hw == "crest":
        for dx, hh in ((-40, 80), (0, 118), (40, 84)):
            b.ellipse(280 + dx, 110 - hh / 2 + 16, 22, hh / 2 + 10, b.shaded(s.headwear_colour), _o(s.headwear_colour), rotate=-20 + dx * 0.3)
    if hw == "plume":
        b.path("M 262 112 C 240 40 290 0 340 -6 C 322 30 312 70 284 116 Z", b.shaded(s.headwear_colour), _o(s.headwear_colour))
    if s.halo:
        b.circle(280, 120, 78, None, s.halo, 8, 0.8)
    if s.glow:
        b.ellipse(290, 260, 220, 200, b.radial(s.glow, s.glow), None, opacity=0.18)
    # base head and face mask
    base.ellipse(HX, HY, 154, 140, base.shaded(fur), o)
    if s.face:
        base.ellipse(372, 292, 78, 76, s.face)
    base.ellipse(372, 322, 24, 15, "#ff8f8f", None, opacity=0.4)
    # muzzle / nose
    m = s.muzzle_ext
    if m == "trunk":
        f.path("M 418 276 C 470 290 486 400 466 476 C 460 504 424 498 430 466 C 436 440 440 400 410 356 Z", f.shaded(fur), o)
        for y in (330, 364, 398, 432):
            f.path(f"M 424 {y} Q 450 {y + 12} 470 {y - 6}", None, darken(fur, 0.3), 4, 0.6)
        if s.fangs:
            f.path("M 420 340 Q 480 380 468 440", None, "#fffdf2", 22)
    elif m == "snout":
        f.ellipse(452, 314, 56, 40, f.shaded("#f4a6a0"), _o("#f4a6a0"))
        f.ellipse(480, 308, 8, 13, "#8a3a3a")
        if s.fangs:
            f.poly([(430, 346), (442, 346), (438, 376)], "#ffffff", _o("#ffffff"), 2)
    elif m == "wide":
        f.ellipse(448, 314, 84, 54, f.shaded(lighten(s.belly, 0.1)), _o(s.belly), 5)
        f.ellipse(506, 300, 9, 13, "#6a4a4a")
    elif m == "cat":
        f.ellipse(432, 320, 52, 36, lighten(s.belly, 0.2))
        f.poly([(464, 296), (486, 304), (470, 318)], s.nose, None)
        if s.whiskers:
            for dy in (-6, 10):
                f.path(f"M 440 {322 + dy} L 540 {312 + dy * 2}", None, "#ffffff", 4)
    elif s.muzzle == "round" and not m:
        f.ellipse(436, 314, 62, 44, lighten(s.belly, 0.1), None)
        f.ellipse(492, 298, 14, 11, s.nose, None)
    elif s.muzzle == "pointed" and not m:
        f.path("M 396 282 Q 470 290 528 322 Q 470 372 396 372 Z", lighten(s.belly, 0.1))
        f.ellipse(526, 320, 15, 11, s.nose, None)
    elif s.category != "bird" and not (m or "").startswith("beak"):
        f.ellipse(446, 288, 17, 14, darken(fur, 0.08), _o(fur), 4)       # a plain nose in profile
    if s.horns == "nose":
        f.path("M 456 296 Q 488 206 520 296 Q 488 280 456 296 Z", f.shaded("#d8d0c0"), _o("#d8d0c0"), 4)
    if s.pattern == "stripes" or s.pattern == "zebra":
        for dy in (-26, 0, 26):
            f.path(f"M 300 {244 + dy} Q 340 {236 + dy} 372 {256 + dy}", None, s.pattern_colour, 12)
        for dx in (-24, 0, 24):
            f.path(f"M {280 + dx} 122 L {280 + dx * 0.8} 160", None, s.pattern_colour, 12)
    elif s.pattern == "spots":
        for x, y, r in ((230, 170, 11), (290, 140, 9), (340, 170, 10), (250, 270, 10), (330, 130, 8)):
            f.circle(x, y, r, s.pattern_colour, None, opacity=0.9)
    elif s.pattern == "patches":
        f.ellipse(250, 190, 50, 42, s.pattern_colour, None, opacity=0.95)
    # beard, moustache
    if s.beard == "short":
        f.path("M 360 320 Q 420 330 420 380 Q 330 440 250 380 Q 300 380 330 340 Z", f.shaded(s.beard_colour), _o(s.beard_colour))
    elif s.beard == "long":
        f.path("M 360 320 Q 430 340 410 420 Q 380 540 300 560 Q 270 480 290 380 Z", f.shaded(s.beard_colour), _o(s.beard_colour))
    elif s.beard == "goatee":
        f.path("M 396 372 Q 430 366 438 390 Q 424 440 398 444 Q 384 410 396 372 Z", f.shaded(s.beard_colour), _o(s.beard_colour))
    elif s.beard == "stubble":
        f.path("M 330 320 Q 410 340 408 380 Q 340 410 280 370 Z", s.beard_colour, None, 0, 0.35)
    if s.moustache and s.category != "bird":
        f.path("M 440 326 Q 470 322 486 340 Q 456 344 436 336 Z", s.hair_colour)
    # hair and headwear
    c = s.headwear_colour
    if s.hair == "short" or (s.long_hair and hw not in ("hair_long", "jata")):
        f.path("M 136 250 Q 140 96 286 96 Q 396 96 428 186 Q 372 150 290 150 Q 200 150 160 280 Z", f.shaded(s.hair_colour), _o(s.hair_colour))
    if s.hair == "tuft":
        f.path("M 250 122 Q 262 80 280 112 Q 292 70 310 122 Z", fur, o)
    if s.hair == "turban":
        t = s.hair_colour
        f.path("M 130 214 Q 128 80 290 70 Q 436 84 440 214 Q 380 168 290 168 Q 196 168 130 214 Z", f.shaded(t), _o(t))
        for d in ("M 160 150 Q 290 96 420 150", "M 146 186 Q 290 124 430 186"):
            f.path(d, None, darken(t, 0.22), 6)
        f.circle(400, 130, 17, (s.clothes or {}).get("jewel", lighten(t, 0.5)), _o(t), 4)
    if hw == "crown":
        f.path("M 180 160 L 190 72 L 230 120 L 268 58 L 306 114 L 344 60 L 380 124 L 408 80 L 412 164 Q 296 184 180 160 Z", f.shaded(c), _o(c), 6)
        f.circle(300, 142, 11, "#3a6ad8", _o(c), 3)
    elif hw == "tiara":
        f.path("M 196 164 Q 296 120 404 164 Q 296 142 196 164 Z", f.shaded(c), _o(c), 5)
        f.circle(300, 132, 9, "#d8362a", _o(c), 3)
    elif hw == "cap":
        f.path("M 150 176 Q 154 82 290 80 Q 420 84 428 176 Q 290 152 150 176 Z", f.shaded(c), _o(c))
    elif hw == "helmet":
        f.path("M 140 196 Q 140 70 290 64 Q 432 72 436 196 L 416 192 Q 290 154 160 192 Z", f.shaded(c), _o(c))
        f.circle(290, 22, 14, "#d8362a", _o(c), 3)
    elif hw == "hat_wide":
        f.ellipse(290, 152, 214, 32, f.shaded(c), _o(c))
        f.path("M 190 152 Q 200 40 290 36 Q 380 40 392 152 Z", f.shaded(c), _o(c))
    elif hw == "hat_pointed":
        f.poly([(150, 152), (270, -44), (430, 152)], f.shaded(c), _o(c))
    elif hw == "topknot":
        f.path("M 138 232 Q 148 100 288 100 Q 420 100 432 220 Q 392 162 288 160 Q 184 160 138 232 Z", f.shaded(s.hair_colour), _o(s.hair_colour))
        f.circle(236, 84, 30, f.shaded(s.hair_colour), _o(s.hair_colour))
    elif hw in ("hair_long", "jata"):
        f.path("M 134 232 Q 144 90 288 92 Q 420 90 430 224 Q 396 150 288 150 Q 176 152 134 232 Z", f.shaded(s.hair_colour), _o(s.hair_colour))
        if hw == "jata":
            f.circle(260, 74, 40, f.shaded(s.hair_colour), _o(s.hair_colour))
    if s.tilak:
        f.path("M 404 196 L 408 218", None, s.tilak, 11)
    return _join(b, base, f)


def side_eyes(s: FigSpec, variant: str) -> Art:
    a = Art(BW, BH)
    cx, cy = 384, 258
    lid = _lid(s)
    if variant in ("open", "wide", "sad", "angry", "half", "tear"):
        rx, ry = (34, 54) if variant == "wide" else (30, 46)
        a.ellipse(cx, cy, rx, ry, "#ffffff", INK, 6)
        if variant in ("sad", "angry", "half", "tear"):
            clip = "sidelid"
            a.defs.append(f'<clipPath id="{clip}"><ellipse cx="{cx}" cy="{cy}" rx="{rx}" ry="{ry}"/></clipPath>')
            a.raw(f'<g clip-path="url(#{clip})">')
            if variant == "half":
                a.rect(cx - 50, cy - 60, 100, 62, lid, None, 0)
            elif variant == "angry":
                a.poly([(cx - 40, cy - 60), (cx + 40, cy - 60), (cx + 40, cy - 14), (cx - 40, cy - 46)], lid)
            else:
                a.poly([(cx - 40, cy - 60), (cx + 40, cy - 60), (cx + 40, cy - 44), (cx - 40, cy - 14)], lid)
            a.raw("</g>")
            a.ellipse(cx, cy, rx, ry, None, INK, 6)
        if variant == "tear":
            a.path(f"M {cx + 6} {cy + 44} Q {cx - 6} {cy + 80} {cx + 6} {cy + 100} Q {cx + 18} {cy + 80} {cx + 6} {cy + 44} Z", "#7fc8f0", "#3a7ab0", 3, 0.9)
    elif variant == "closed":
        a.path(f"M {cx - 30} {cy + 4} Q {cx} {cy + 30} {cx + 30} {cy + 4}", None, INK, 8)
    elif variant == "happy":
        a.path(f"M {cx - 30} {cy + 14} Q {cx} {cy - 30} {cx + 30} {cy + 14}", None, INK, 8)
    return a


def side_pupils(s: FigSpec, variant: str) -> Art:
    a = Art(BW, BH)
    r = 24 if variant == "normal" else 14
    x, y = 396, 264
    a.circle(x, y, r, a.radial(lighten(s.iris, 0.25), darken(s.iris, 0.3)), INK, 3)
    a.circle(x, y, r * 0.55, "#140c08")
    a.circle(x - r * 0.36, y - r * 0.4, r * 0.34, "#ffffff")
    return a


def side_brow(s: FigSpec) -> Art:
    a = Art(BW, BH)
    a.path("M 350 206 Q 386 190 418 208", None, "#2b2019" if s.clothes else darken(s.fur, 0.5), 10)
    return a


def side_mouth(s: FigSpec, variant: str, cy: float) -> Art:
    if s.category == "bird" or (s.muzzle_ext or "").startswith("beak"):
        return side_beak(s, variant)
    a = Art(BW, BH)
    wide = s.muzzle_ext in ("wide", "snout") or s.muzzle in ("round", "pointed")
    x0, x1 = (416, 492) if wide else (418, 462)
    y = cy - 4
    if variant == "closed":
        a.path(f"M {x0} {y} Q {(x0 + x1) / 2} {y + 18} {x1} {y - 4}", None, INK, 7)
    elif variant == "neutral":
        a.path(f"M {x0} {y + 4} L {x1} {y + 2}", None, INK, 7)
    elif variant in ("sad", "frown"):
        a.path(f"M {x0} {y + 12} Q {(x0 + x1) / 2} {y - 8} {x1} {y + 10}", None, INK, 7)
    elif variant == "smirk":
        a.path(f"M {x0} {y + 6} Q {(x0 + x1) / 2} {y + 12} {x1} {y - 10}", None, INK, 7)
    elif variant in ("small", "o"):
        a.ellipse((x0 + x1) / 2 + 6, y + 6, 11, 12 if variant == "o" else 9, MOUTH_DARK, INK, 5)
    elif variant == "grit":
        a.rect(x0 + 4, y - 8, x1 - x0 - 8, 22, "#ffffff", INK, 5, rx=8)
    else:                                                   # open, wide, cry
        k = {"open": 1.0, "wide": 1.5, "cry": 1.3}[variant]
        a.path(f"M {x0} {y - 4} Q {(x0 + x1) / 2} {y + 4} {x1} {y - 8} Q {x1 - 6} {y + 36 * k} {(x0 + x1) / 2} {y + 40 * k} Q {x0 + 8} {y + 32 * k} {x0} {y - 4} Z", MOUTH_DARK, INK, 5)
        a.ellipse((x0 + x1) / 2, y + 30 * k, 18, 8, TONGUE)
    return a


def side_beak(s: FigSpec, variant: str) -> Art:
    a = Art(BW, BH)
    c, kind = s.beak, s.muzzle_ext or "beak_short"
    op = {"open": 14, "wide": 26, "o": 10, "small": 7, "cry": 20}.get(variant, 0)
    y = 306 + (8 if variant in ("sad", "frown") else 0)
    L = {"beak_long": 130, "beak_spear": 106, "beak_flat": 70, "beak_hook": 76}.get(kind, 62)
    hook = f"Q {410 + L} {y + 6} {400 + L} {y + 40}" if kind == "beak_hook" else f"L {420 + L} {y + 14}"
    upper = f"M 400 {y - 14} Q 440 {y - 30} 440 {y - 6} {hook} L 400 {y + 22} Z"
    if kind == "beak_hook":
        upper = f"M 396 {y - 16} Q 450 {y - 34} {432 + L} {y + 14} Q {436 + L} {y + 40} {418 + L} {y + 46} Q {430 + L - 40} {y + 16} 396 {y + 18} Z"
    if op:
        a.path(f"M 400 {y + 18 + op * 0.4} L {420 + L * 0.8} {y + 24 + op} L 400 {y + 40 + op * 0.8} Z", a.shaded(darken(c, 0.15)), _o(c), 4)
    a.path(upper, a.shaded(c), _o(c), 5)
    return a


def side_body(s: FigSpec) -> Art:
    a = Art(BW, BH)
    w = 62 * s.belly_scale
    if s.clothes and s.outfit in ("robe", "dress"):
        top, trim = s.clothes["top"], s.clothes.get("trim", "#e6b93c")
        flare = 1.35 if s.outfit == "robe" else 1.6
        a.path(f"M {300 - w} 392 Q 300 374 {300 + w} 392 L {300 + w * flare} 668 Q 300 698 {300 - w * flare} 668 Z", a.shaded(top), _o(top))
        a.path(f"M {300 + w * 0.5} 400 L {300 + w * flare * 0.7} 670", None, trim, 6)
        a.path(f"M {300 - w * flare} 660 Q 300 692 {300 + w * flare} 660", None, trim, 12)
    elif s.clothes and s.outfit == "armor":
        a.path(f"M {300 - w} 392 Q 300 374 {300 + w} 392 L {300 + w * 1.05} 590 Q 300 628 {300 - w * 1.05} 590 Z", a.shaded(s.clothes.get("bottom", "#6a6a7a")), _o("#6a6a7a"))
        a.path(f"M {300 - w * 0.9} 400 Q 300 380 {300 + w * 0.9} 400 L {300 + w} 540 Q 300 566 {300 - w} 540 Z", a.shaded("#b8bcc8"), "#5a5e6a")
    elif s.clothes:
        top, trim = s.clothes["top"], s.clothes.get("trim", darken(s.clothes["top"], 0.2))
        a.path(f"M {300 - w} 392 Q 300 372 {300 + w} 392 L {300 + w * 1.12} 590 Q 300 628 {300 - w * 1.1} 590 Z", a.shaded(top), _o(top))
        a.path(f"M {300 + w * 0.7} 400 L {300 + w * 0.85} 570", None, trim, 6)
        a.path(f"M {300 - w * 1.05} 585 Q 300 622 {300 + w * 1.1} 585", None, trim, 9)
        if s.outfit == "vest":
            a.ellipse(300, 495, w, 116, a.shaded(s.fur), _o(s.fur))
            a.path(f"M {300 - w} 420 L {300 + w} 410 L {300 + w} 580 L {300 - w} 570 Z", a.shaded(top), _o(top))
    else:
        a.ellipse(300, 495, w * 1.05, 116, a.shaded(s.fur), _o(s.fur))
        a.ellipse(326, 512, w * 0.55, 80, s.belly, None, opacity=0.95)
        if s.pattern in ("stripes", "zebra"):
            for dy in (440, 480, 520, 560):
                a.path(f"M 250 {dy} Q 280 {dy - 12} 306 {dy}", None, s.pattern_colour, 12)
    return a


def side_leg(s: FigSpec, x: float, far: bool) -> Art:
    a = Art(BW, BH)
    if s.category == "bird":
        col = s.foot_colour or "#e8902a"
        col = darken(col, 0.15) if far else col
        a.rect(x - 8, 580, 16, 96, a.shaded(col), _o(col), rx=7)
        for dx in (-26, 6, 38):
            a.path(f"M {x} 676 L {x + dx + 16} 690", None, _o(col), 16)
            a.path(f"M {x} 676 L {x + dx + 16} 690", None, col, 9)
        return a
    colour = s.clothes["bottom"] if s.clothes else s.fur
    if s.outfit in ("robe", "dress"):
        colour = s.clothes["top"]
    colour = darken(colour, 0.12) if far else colour
    a.rect(x - 27, 572, 54, 100, a.shaded(colour), _o(colour), rx=26)
    foot = s.foot_colour or (s.clothes.get("shoes", "#6b4226") if s.clothes else darken(s.fur, 0.12))
    foot = darken(foot, 0.12) if far else foot
    if s.feet == "hoof":
        a.path(f"M {x - 28} 662 L {x + 34} 662 L {x + 44} 692 L {x - 30} 692 Z", a.shaded(foot), _o(foot))
    else:
        a.ellipse(x + 14, 676, 50, 22, a.shaded(foot), _o(foot))
        if s.feet == "claw":
            for dx in (30, 44, 58):
                a.poly([(x + dx - 5, 686), (x + dx + 5, 686), (x + dx + 2, 700)], "#f4f0e0", _o("#f4f0e0"), 2)
    return a


def side_arm(s: FigSpec, x: float, tilt: float, near: bool) -> Art:
    a = Art(BW, BH)
    a.raw(f'<g transform="rotate({tilt} {x} 428)">')
    if s.wings:
        wc = s.wing_colour or s.fur
        wc = wc if near else darken(wc, 0.12)
        a.path(f"M {x} 416 C {x + 48} 420 {x + 52} 520 {x + 20} 592 C {x} 580 {x - 20} 540 {x - 20} 440 Z", a.shaded(wc), _o(wc))
        for i in range(3):
            a.path(f"M {x + 6 + i * 12} 500 L {x + 8 + i * 8} {584 - i * 4}", None, darken(wc, 0.25), 4, 0.7)
        a.raw("</g>")
        return a
    colour = s.clothes["top"] if s.clothes else s.fur
    if s.outfit == "armor":
        colour = "#b8bcc8"
    hand = s.fur if s.clothes else lighten(s.fur, 0.12)
    if not near:
        colour, hand = darken(colour, 0.12), darken(hand, 0.12)
    a.rect(x - 20, 412, 40, 132, a.shaded(colour), _o(colour), rx=20)
    a.circle(x + 2, 548, 25, a.shaded(hand), _o(hand))
    if near:
        _held(a, s, x + 2)
    a.raw("</g>")
    return a


def mirror(art: Art, cx: float = 300) -> Art:
    out = Art(art.w, art.h)
    out.defs, out._n = list(art.defs), art._n
    out.items = [f'<g transform="translate({2 * cx} 0) scale(-1 1)">', *art.items, "</g>"]
    return out


def shifted(art: Art, dx: float, dy: float = 0) -> Art:
    out = Art(art.w, art.h)
    out.defs, out._n = list(art.defs), art._n
    out.items = [f'<g transform="translate({dx} {dy})">', *art.items, "</g>"]
    return out


# ------------------------------------------------------------------------------------------------ THREE-QUARTER FACE
def _eye_at(a: Art, s: FigSpec, variant: str, cx: float, cy: float, rx: float, ry: float, sign: int, k: int) -> None:
    lid = _lid(s)
    if variant in ("open", "wide", "sad", "angry", "half", "tear"):
        ex, ey = (rx + 4, ry + 6) if variant == "wide" else (rx, ry)
        a.ellipse(cx, cy, ex, ey, "#ffffff", INK, 6)
        if variant in ("sad", "angry", "half", "tear"):
            cid = f"tqe{k}"
            a.defs.append(f'<clipPath id="{cid}"><ellipse cx="{cx}" cy="{cy}" rx="{ex}" ry="{ey}"/></clipPath>')
            a.raw(f'<g clip-path="url(#{cid})">')
            if variant == "half":
                a.rect(cx - 60, cy - 70, 120, 72, lid, None, 0)
            elif variant == "angry":
                a.poly([(cx - 60, cy - 70), (cx + 60, cy - 70), (cx + sign * 60, cy - 12), (cx - sign * 60, cy - 46)], lid)
            else:
                a.poly([(cx - 60, cy - 70), (cx + 60, cy - 70), (cx - sign * 60, cy - 12), (cx + sign * 60, cy - 46)], lid)
            a.raw("</g>")
            a.ellipse(cx, cy, ex, ey, None, INK, 6)
        if variant == "tear":
            a.path(f"M {cx} {cy + ey} Q {cx - 10} {cy + ey + 34} {cx} {cy + ey + 52} Q {cx + 10} {cy + ey + 34} {cx} {cy + ey} Z", "#7fc8f0", "#3a7ab0", 3, 0.9)
    elif variant == "closed":
        a.path(f"M {cx - rx} {cy + 4} Q {cx} {cy + 30} {cx + rx} {cy + 4}", None, INK, 8)
    elif variant == "happy":
        a.path(f"M {cx - rx} {cy + 14} Q {cx} {cy - 30} {cx + rx} {cy + 14}", None, INK, 8)


TQ_EYES = ((258, 262, 38, 48, -1), (394, 262, 27, 46, 1))          # near eye full size, far eye narrower and turned away


def tq_eyes(s: FigSpec, variant: str) -> Art:
    a = Art(BW, BH)
    for k, (cx, cy, rx, ry, sign) in enumerate(TQ_EYES):
        _eye_at(a, s, variant, cx, cy, rx, ry, sign, k)
    return a


def tq_pupils(s: FigSpec, variant: str) -> Art:
    a = Art(BW, BH)
    for cx, cy, rx, ry, sign in TQ_EYES:
        r = (27 if variant == "normal" else 16) * (rx / 38) ** 0.6
        x, y = cx + 10 * (rx / 38), cy + 5
        a.ellipse(x, y, r * (0.85 if rx < 38 else 1.0), r, a.radial(lighten(s.iris, 0.25), darken(s.iris, 0.3)), INK, 3)
        a.ellipse(x, y, r * 0.5, r * 0.55, "#140c08")
        a.circle(x - r * 0.3, y - r * 0.4, r * 0.3, "#ffffff")
    return a


def tq_brow(s: FigSpec, which: str) -> Art:
    a = Art(BW, BH)
    colour = "#2b2019" if s.clothes else darken(s.fur, 0.5)
    if which == "l":
        a.path("M 224 205 Q 258 188 294 206", None, colour, 10)
    else:
        a.path("M 372 206 Q 396 192 420 206", None, colour, 9)
    return a


def tq_mouth(s: FigSpec, variant: str, cy: float) -> Art:
    """The front mouth moved toward the far side and narrowed, as it sits on a turned face."""
    m = fig_mouth(s, variant, cy)
    out = Art(m.w, m.h)
    out.defs, out._n = list(m.defs), m._n
    out.items = ['<g transform="translate(364 0) scale(0.86 1) translate(-300 0)">', *m.items, "</g>"]
    return out


# ------------------------------------------------------------------------------------------------ BACK
def back_head(s: FigSpec) -> Art:
    b, base, f = _sub(1), _sub(2), _sub(3)
    head_behind(s, b)
    fur, o = s.fur, _o(s.fur)
    base.ellipse(300, 250, 166, 140, base.shaded(fur), o)
    hw = s.headwear
    haired = s.hair in ("short", "tuft", "turban") or hw in ("hair_long", "jata", "topknot", "hood", "cap", "helmet", "crown", "tiara", "hat_wide", "hat_pointed") or s.long_hair
    if s.category in ("animal", "mythological") and not s.clothes:
        for dx in (-50, 0, 50):
            f.path(f"M {300 + dx} 150 Q {300 + dx * 1.3} 200 {300 + dx} 250", None, darken(fur, 0.2), 6, 0.6)
        if s.pattern in ("stripes", "zebra"):
            for dx in (-60, -20, 20, 60):
                f.path(f"M {300 + dx} 118 L {300 + dx * 1.1} 190", None, s.pattern_colour, 12)
        elif s.pattern == "spots":
            for x, y, r in ((220, 170, 11), (300, 140, 9), (380, 170, 11), (260, 230, 9), (350, 230, 9)):
                f.circle(x, y, r, s.pattern_colour, None, opacity=0.9)
        elif s.pattern == "patches":
            f.ellipse(230, 190, 50, 44, s.pattern_colour, None, opacity=0.95)
    if s.mane:
        for i in range(16):
            ang = i * math.tau / 16
            f.circle(300 + 160 * math.cos(ang), 250 + 140 * math.sin(ang), 60, f.shaded(s.mane), _o(s.mane))
        f.ellipse(300, 250, 150, 130, s.mane)
    if s.category == "bird":
        for i in range(5):
            f.path(f"M {220 + i * 40} 170 Q {226 + i * 40} 220 {220 + i * 40} 270", None, darken(fur, 0.2), 6, 0.6)
    if s.hair == "short" or (s.long_hair and hw not in ("hair_long", "jata")):
        f.path("M 136 260 Q 130 90 300 90 Q 470 90 464 260 Q 450 330 300 340 Q 150 330 136 260 Z", f.shaded(s.hair_colour), _o(s.hair_colour))
    if s.hair == "tuft":
        f.path("M 270 122 Q 280 80 300 112 Q 312 70 330 122 Z", fur, o)
    if s.hair == "turban":
        t = s.hair_colour
        f.path("M 130 224 Q 126 80 300 68 Q 474 80 470 224 Q 460 300 300 310 Q 140 300 130 224 Z", f.shaded(t), _o(t))
        for d in ("M 150 150 Q 300 96 450 150", "M 140 200 Q 300 140 460 200", "M 160 250 Q 300 200 440 250"):
            f.path(d, None, darken(t, 0.22), 6)
    c = s.headwear_colour
    if hw in ("hair_long", "jata"):
        f.path("M 134 250 Q 124 90 300 90 Q 476 90 466 250 Q 470 460 300 470 Q 130 460 134 250 Z", f.shaded(s.hair_colour), _o(s.hair_colour))
        f.path("M 300 100 L 300 460", None, darken(s.hair_colour, 0.3), 5, 0.7)
        if hw == "jata":
            f.circle(300, 70, 40, f.shaded(s.hair_colour), _o(s.hair_colour))
    elif hw == "topknot":
        f.path("M 138 260 Q 134 100 300 100 Q 466 100 462 260 Q 450 330 300 340 Q 150 330 138 260 Z", f.shaded(s.hair_colour), _o(s.hair_colour))
        f.circle(300, 84, 30, f.shaded(s.hair_colour), _o(s.hair_colour))
    elif hw == "crown":
        f.path("M 170 156 L 176 70 L 224 118 L 262 56 L 300 112 L 338 56 L 376 118 L 424 70 L 430 156 Q 300 176 170 156 Z", f.shaded(c), _o(c), 6)
    elif hw == "tiara":
        f.path("M 190 160 Q 300 118 410 160 Q 300 140 190 160 Z", f.shaded(c), _o(c), 5)
    elif hw in ("cap", "helmet"):
        f.path("M 140 190 Q 140 70 300 62 Q 460 70 460 190 Q 300 160 140 190 Z", f.shaded(c), _o(c))
    elif hw == "hat_wide":
        f.ellipse(300, 150, 222, 38, f.shaded(c), _o(c))
        f.path("M 190 150 Q 200 40 300 36 Q 400 40 410 150 Z", f.shaded(c), _o(c))
    elif hw == "hat_pointed":
        f.poly([(160, 150), (300, -40), (440, 150)], f.shaded(c), _o(c))
    elif hw == "hood":
        f.path("M 160 250 Q 300 330 440 250", None, darken(c, 0.3), 6)
    if not haired and s.category == "human":
        f.path("M 270 120 Q 300 100 330 120", None, darken(fur, 0.25), 5, 0.5)       # a bald head: a crease only
    return _join(b, base, f)


def back_body(s: FigSpec) -> Art:
    c = s.clothes
    if not c:
        a = Art(BW, BH)
        w = 98 * s.belly_scale
        a.ellipse(300, 495, w, 116, a.shaded(s.fur), _o(s.fur))
        a.path("M 300 400 L 300 590", None, darken(s.fur, 0.2), 5, 0.5)
        if s.pattern in ("stripes", "zebra"):
            for dy in (430, 470, 510, 550):
                a.path(f"M 206 {dy} Q 250 {dy - 12} 296 {dy}", None, s.pattern_colour, 12)
                a.path(f"M 394 {dy} Q 350 {dy - 12} 304 {dy}", None, s.pattern_colour, 12)
        elif s.pattern in ("spots", "patches"):
            for x, y, r in ((240, 440, 16), (350, 470, 14), (270, 530, 17), (360, 560, 13), (300, 500, 12)):
                a.circle(x, y, r, s.pattern_colour, None, opacity=0.9)
        if s.category == "bird":
            for i in range(4):
                a.path(f"M {240 + i * 40} 430 Q {250 + i * 40} 500 {240 + i * 40} 570", None, darken(s.fur, 0.2), 6, 0.6)
        return a
    a = fig_body(s)
    # the front placket, buttons and sash are removed: redraw the same garment as a plain back
    top = c["top"]
    plain = Art(BW, BH)
    w = 98 * s.belly_scale
    trim = c.get("trim", darken(top, 0.2))
    if s.outfit in ("robe", "dress"):
        flare = 1.5
        bottom = 670 if s.outfit == "robe" else 640
        plain.path(f"M {300 - w * 0.8} 392 Q 300 372 {300 + w * 0.8} 392 L {300 + w * flare} {bottom} Q 300 {bottom + 30} {300 - w * flare} {bottom} Z", plain.shaded(top), _o(top))
        plain.path(f"M {300 - w * flare * 0.97} {bottom - 10} Q 300 {bottom + 22} {300 + w * flare * 0.97} {bottom - 10}", None, trim, 12)
    elif s.outfit == "armor":
        plain.path(f"M {300 - w * 0.8} 392 Q 300 372 {300 + w * 0.8} 392 L {300 + w * 1.08} 590 Q 300 628 {300 - w * 1.08} 590 Z", plain.shaded(c.get("bottom", "#6a6a7a")), _o(top))
        plain.path(f"M {300 - w * 0.85} 400 Q 300 380 {300 + w * 0.85} 400 L {300 + w * 0.9} 540 Q 300 566 {300 - w * 0.9} 540 Z", plain.shaded("#b8bcc8"), "#5a5e6a")
        plain.path("M 300 400 L 300 540", None, "#7a7e8a", 4)
    elif s.outfit == "vest":
        plain.ellipse(300, 495, w, 116, plain.shaded(s.fur), _o(s.fur))
        plain.path(f"M {300 - w * 0.95} 420 L {300 + w * 0.95} 420 L {300 + w * 1.0} 580 L {300 - w * 1.0} 580 Z", plain.shaded(top), _o(top))
        plain.path("M 300 420 L 300 580", None, darken(top, 0.3), 5)
    else:
        plain.path(f"M {300 - w * 0.8} 392 Q 300 372 {300 + w * 0.8} 392 L {300 + w * 1.08} 590 Q 300 628 {300 - w * 1.08} 590 Z", plain.shaded(top), _o(top))
        plain.path("M 300 392 L 300 590", None, darken(top, 0.25), 5, 0.6)
        plain.path(f"M {300 - w * 1.05} 585 Q 300 622 {300 + w * 1.05} 585", None, trim, 9)
    return plain


def back_tail(s: FigSpec) -> Art:
    return shifted(fig_tail(s), -52)


# ------------------------------------------------------------------------------------------------ THREE-QUARTER
def turn(art: Art, shift: float = 24, far: float = 0.8, cx: float = 300, shade: float = 0.0) -> Art:
    """Turn a front-view part about the vertical axis: near half (left) kept, far half (right) foreshortened, both moved toward the far side."""
    out = Art(art.w, art.h)
    out.defs, out._n = list(art.defs), art._n
    tail = len(out.defs)
    out.defs.append(f'<clipPath id="tqL"><rect x="-200" y="-200" width="{cx + 200}" height="1400"/></clipPath><clipPath id="tqR"><rect x="{cx}" y="-200" width="1000" height="1400"/></clipPath>')
    inner = "".join(art.items)
    out.items = [f'<g clip-path="url(#tqL)"><g transform="translate({shift} 0)">{inner}</g></g>',
                 f'<g clip-path="url(#tqR)"><g transform="translate({cx + shift} 0) scale({far} 1) translate({-cx} 0)">{inner}</g></g>']
    return out


def turned_x(x: float, shift: float = 24, far: float = 0.8, cx: float = 300) -> float:
    return x + shift if x < cx else cx + shift + (x - cx) * far


# ------------------------------------------------------------------------------------------------ build
def _part(parts: list, out: Path, view: str, pid, component, parent, pivot, order, drawings, limits=None):
    variants = {}
    for vname, art in drawings.items():
        origin, size = _save_part(art, out, f"{pid}_{vname}", folder=f"views/{view}/rig")
        variants[vname] = {"file": f"views/{view}/rig/{pid}_{vname}.png", "svg": f"views/{view}/rig/{pid}_{vname}.svg", "origin": origin, "size": size}
    parts.append({"id": pid, "component": component, "parent": parent, "pivot": list(pivot), "order": order, "variants": variants, "rotation_limits": limits})


def _rig(parts, mouth_pt, head_top, hand_pt, back_pt, hand_part="arm_r", talk=True):
    ap = {"hand": {"part": hand_part, "point": list(hand_pt)}, "head_top": {"part": "head", "point": list(head_top)}, "back": {"part": "body", "point": list(back_pt)},
          "mouth": {"part": "head", "point": list(mouth_pt)}}
    rig = {"template": "biped_chibi", "canvas": [BW, BH], "ground": list(B_GROUND), "parts": parts, "attach_points": ap}
    if talk:
        rig.update({"talk_part": "mouth", "talk_mode": "variants", "talk_variants": ["closed", "small", "open"]})
    return rig


def build_views(s: FigSpec, out: Path) -> dict[str, dict]:
    has_tail = bool(s.tail or s.long_tail)
    mouth_y = 346 if (s.muzzle or s.muzzle_ext in ("snout", "wide", "cat")) else 352
    views: dict[str, dict] = {}

    # ---- side (facing right)
    P: list = [{"id": "root", "component": "root", "parent": None, "pivot": list(B_GROUND), "order": 0, "variants": {}}]
    if has_tail:
        _part(P, out, "side", "tail", "tail", "body", (248, 590), -3, {"base": mirror(fig_tail(s))}, [-70, 70])
    _part(P, out, "side", "leg_l", "left_leg", "root", (278, 588), -2, {"base": side_leg(s, 278, True)}, [-100, 100])
    _part(P, out, "side", "leg_r", "right_leg", "root", (324, 588), -1, {"base": side_leg(s, 324, False)}, [-100, 100])
    _part(P, out, "side", "arm_l", "left_arm", "body", (292, 428), -1, {"base": side_arm(s, 292, 6, False)}, [-185, 185])
    _part(P, out, "side", "body", "body", "root", (300, 600), 0, {"base": side_body(s)}, [-25, 25])
    _part(P, out, "side", "arm_r", "right_arm", "body", (310, 428), 3, {"base": side_arm(s, 310, -6, True)}, [-185, 185])
    _part(P, out, "side", "head", "head", "body", (290, 388), 5, {"base": side_head(s)}, [-35, 35])
    _part(P, out, "side", "eyes", "eyes", "head", (384, 262), 6, {v: side_eyes(s, v) for v in EYE_VARIANTS})
    _part(P, out, "side", "pupils", "eyes", "eyes", (384, 262), 7, {v: side_pupils(s, v) for v in ("normal", "small")})
    _part(P, out, "side", "brow_l", "eyebrows", "head", (384, 202), 8, {"base": side_brow(s)}, [-40, 40])
    _part(P, out, "side", "mouth", "mouth", "head", (450, mouth_y), 8, {v: side_mouth(s, v, mouth_y) for v in MOUTH_VARIANTS})
    views["side"] = _rig(P, (450, mouth_y + 6), (290, 112), (312, 548), (300, 470))

    # ---- back
    P = [{"id": "root", "component": "root", "parent": None, "pivot": list(B_GROUND), "order": 0, "variants": {}}]
    if has_tail:
        _part(P, out, "back", "tail", "tail", "body", (300, 590), 4, {"base": back_tail(s)}, [-70, 70])
    _part(P, out, "back", "leg_l", "left_leg", "root", (255, 588), -2, {"base": fig_leg(s, 255)}, [-100, 100])
    _part(P, out, "back", "leg_r", "right_leg", "root", (345, 588), -2, {"base": fig_leg(s, 345)}, [-100, 100])
    _part(P, out, "back", "arm_l", "left_arm", "body", (222, 428), -1, {"base": fig_arm(s, 222, 14)}, [-185, 185])
    _part(P, out, "back", "body", "body", "root", (300, 600), 0, {"base": back_body(s)}, [-25, 25])
    _part(P, out, "back", "arm_r", "right_arm", "body", (378, 428), 3, {"base": fig_arm(s, 378, -14, right=True)}, [-185, 185])
    _part(P, out, "back", "head", "head", "body", (300, 388), 5, {"base": back_head(s)}, [-35, 35])
    views["back"] = _rig(P, (300, 352), (300, 112), (410, 548), (300, 470), talk=False)

    # ---- three-quarter (facing right)
    sh, fr = 34, 0.72
    P = [{"id": "root", "component": "root", "parent": None, "pivot": list(B_GROUND), "order": 0, "variants": {}}]
    mp = lambda x, y: (turned_x(x, sh, fr), y)
    if has_tail:
        _part(P, out, "three_quarter", "tail", "tail", "body", mp(352, 590), -3, {"base": turn(fig_tail(s), sh, fr)}, [-70, 70])
    _part(P, out, "three_quarter", "leg_l", "left_leg", "root", mp(255, 588), -2, {"base": turn(fig_leg(s, 255), sh, fr)}, [-100, 100])
    _part(P, out, "three_quarter", "leg_r", "right_leg", "root", mp(345, 588), -2, {"base": turn(fig_leg(s, 345), sh, fr)}, [-100, 100])
    _part(P, out, "three_quarter", "arm_l", "left_arm", "body", mp(222, 428), -1, {"base": turn(fig_arm(s, 222, 14), sh, fr)}, [-185, 185])
    _part(P, out, "three_quarter", "body", "body", "root", mp(300, 600), 0, {"base": turn(fig_body(s), 16, 0.86)}, [-25, 25])
    _part(P, out, "three_quarter", "arm_r", "right_arm", "body", mp(378, 428), 3, {"base": turn(fig_arm(s, 378, -14, right=True), sh, fr)}, [-185, 185])
    _part(P, out, "three_quarter", "head", "head", "body", mp(300, 388), 5, {"base": turn(fig_head(s), sh, fr)}, [-35, 35])
    _part(P, out, "three_quarter", "eyes", "eyes", "head", (326, 262), 6, {v: tq_eyes(s, v) for v in EYE_VARIANTS})
    _part(P, out, "three_quarter", "pupils", "eyes", "eyes", (326, 262), 7, {v: tq_pupils(s, v) for v in ("normal", "small")})
    _part(P, out, "three_quarter", "brow_l", "eyebrows", "head", (258, 200), 8, {"base": tq_brow(s, "l")}, [-40, 40])
    _part(P, out, "three_quarter", "brow_r", "eyebrows", "head", (396, 200), 8, {"base": tq_brow(s, "r")}, [-40, 40])
    _part(P, out, "three_quarter", "mouth", "mouth", "head", (364, mouth_y), 8, {v: tq_mouth(s, v, mouth_y) for v in MOUTH_VARIANTS})
    views["three_quarter"] = _rig(P, mp(300, mouth_y + 6), mp(300, 112), mp(410, 548), mp(300, 470))
    return views
