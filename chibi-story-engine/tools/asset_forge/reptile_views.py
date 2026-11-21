"""Front, three-quarter and back views for the side-primary reptile rigs.

front / back: separately drawn head-on and tail-on pictures (head, body, visible legs); parts that cannot be seen from that angle are
    left out of the view (a clip that drives an absent part simply does nothing there). Head retraction and slithering therefore read
    only in the side and three-quarter views; the jaw is fixed in head-on views.
three_quarter: the side-view body, legs and tail squeezed along the length of the body (foreshortened), with the head-on head and face swung toward the viewer on the neck.
"""
from __future__ import annotations

import math
from pathlib import Path

from .characters import INK, RH, RW, R_GROUND
from .characters_ext import _save_part
from .reptiles import CH, CW, C_GROUND, EYE_VARIANTS, SH, SW, S_GROUND, RepSpec, build_chel, build_quad, build_serpent
from .svg import Art, darken, lighten

_o = lambda c: darken(c, 0.55)


def two_eyes(s, variant: str, centres, rx, ry, w, h) -> Art:
    a = Art(w, h)
    for k, (cx, cy) in enumerate(centres):
        if variant in ("open", "wide", "sad", "angry", "half", "tear"):
            ex, ey = (rx + 4, ry + 5) if variant == "wide" else (rx, ry)
            a.ellipse(cx, cy, ex, ey, "#ffffff", INK, 6)
            if variant in ("sad", "angry", "half", "tear"):
                cid = f"fe{k}"
                a.defs.append(f'<clipPath id="{cid}"><ellipse cx="{cx}" cy="{cy}" rx="{ex}" ry="{ey}"/></clipPath>')
                a.raw(f'<g clip-path="url(#{cid})">')
                sign = -1 if k == 0 else 1
                if variant == "half":
                    a.rect(cx - 50, cy - 70, 100, 70 + 2, s.skin, None, 0)
                elif variant == "angry":
                    a.poly([(cx - 50, cy - 60), (cx + 50, cy - 60), (cx + sign * 50, cy - 12), (cx - sign * 50, cy - 40)], s.skin)
                else:
                    a.poly([(cx - 50, cy - 60), (cx + 50, cy - 60), (cx - sign * 50, cy - 12), (cx + sign * 50, cy - 40)], s.skin)
                a.raw("</g>")
                a.ellipse(cx, cy, ex, ey, None, INK, 6)
            if variant == "tear":
                a.path(f"M {cx + 4} {cy + ey} Q {cx - 6} {cy + ey + 34} {cx + 4} {cy + ey + 52} Q {cx + 14} {cy + ey + 34} {cx + 4} {cy + ey} Z", "#7fc8f0", "#3a7ab0", 3, 0.9)
        elif variant == "closed":
            a.path(f"M {cx - rx} {cy + 2} Q {cx} {cy + 24} {cx + rx} {cy + 2}", None, INK, 8)
        elif variant == "happy":
            a.path(f"M {cx - rx} {cy + 10} Q {cx} {cy - 24} {cx + rx} {cy + 10}", None, INK, 8)
    return a


def two_pupils(s, variant: str, centres, w, h) -> Art:
    a = Art(w, h)
    r = 18 if variant == "normal" else 11
    for cx, cy in centres:
        a.circle(cx, cy + 3, r, a.radial(lighten(s.iris, 0.3), darken(s.iris, 0.25)), INK, 3)
        a.ellipse(cx, cy + 3, r * 0.42, r * 0.8, "#140c08")
        a.circle(cx - r * 0.36, cy - r * 0.35, r * 0.3, "#ffffff")
    return a


def two_brows(s, centres, w, h, dy=-38) -> Art:
    a = Art(w, h)
    for cx, cy in centres:
        a.path(f"M {cx - 28} {cy + dy + 6} Q {cx} {cy + dy - 8} {cx + 28} {cy + dy + 6}", None, darken(s.skin, 0.6), 9)
    return a


def toes(a: Art, x: float, y: float, n: int = 3, spread: float = 18) -> None:
    for k in range(n):
        a.circle(x + (k - (n - 1) / 2) * spread, y, 5, "#fff7e0")


def _save(parts, out, view, pid, comp, parent, pivot, order, drawings, limits=None):
    variants = {}
    for vname, art in drawings.items():
        origin, size = _save_part(art, out, f"{pid}_{vname}", folder=f"views/{view}/rig")
        variants[vname] = {"file": f"views/{view}/rig/{pid}_{vname}.png", "svg": f"views/{view}/rig/{pid}_{vname}.svg", "origin": origin, "size": size}
    parts.append({"id": pid, "component": comp, "parent": parent, "pivot": list(pivot), "order": order, "variants": variants, "rotation_limits": limits})


def _root(w, h, ground):
    return {"id": "root", "component": "root", "parent": None, "pivot": list(ground), "order": 0, "variants": {}}


def _rig(template, canvas, ground, parts, attach, jaw=True):
    r = {"template": template, "canvas": list(canvas), "ground": list(ground), "parts": parts, "attach_points": attach}
    if jaw:
        r.update({"talk_part": "jaw", "talk_mode": "jaw", "jaw_part": "jaw", "jaw_open_degrees": -17.0})
    return r


# ------------------------------------------------------------------------------------------------ quadruped
def quad_front_back(s: RepSpec, out: Path) -> dict:
    croc = s.species in ("crocodile", "alligator")
    sw = 118 if croc else 96
    o = _o(s.skin)
    eyes_c = [(366, 168), (534, 168)]
    views = {}

    def body(front: bool) -> Art:
        a = Art(RW, RH)
        for k, (x, y, sz) in enumerate(((450, 214, 26), (450, 238, 28), (450, 264, 30))):      # ridge of spikes down the middle
            a.poly([(x - sz * 0.6, y + 30), (x, y - sz * 0.7), (x + sz * 0.6, y + 30)], a.shaded(s.accent), _o(s.accent), 4)
        a.ellipse(450, 320, 168, 112, a.shaded(s.skin), o, 6)
        if front:
            a.ellipse(450, 372, 104, 62, s.belly, None, opacity=0.95)
        else:
            for dx in (-80, -30, 30, 80):
                a.ellipse(450 + dx, 290, 22, 14, darken(s.skin, 0.14), None, opacity=0.7)
        return a

    def leg(x: float, far: bool) -> Art:
        a = Art(RW, RH)
        c = darken(s.skin, 0.12) if far else s.skin
        a.rect(x - 30, 330, 60, 80, a.shaded(c), _o(c), rx=24)
        a.ellipse(x, 414, 48, 15, a.shaded(c), _o(c))
        toes(a, x, 420, 3, 20)
        return a

    def head_front() -> Art:
        a = Art(RW, RH)
        for cx, cy in eyes_c:
            a.circle(cx, cy + 4, 46, a.shaded(s.skin), o)
        a.ellipse(450, 250, sw, 74, a.shaded(s.skin), o, 6)
        for dx in (-34, 34):
            a.ellipse(450 + dx, 212, 13, 9, a.shaded(s.skin), o, 4)
            a.circle(450 + dx, 212, 4, INK)
        a.path(f"M {450 - sw + 18} 296 Q 450 318 {450 + sw - 18} 296", None, INK, 6)
        for k in range(9):
            x = 450 - sw + 30 + k * ((2 * sw - 60) / 8)
            a.poly([(x - 8, 298), (x, 314), (x + 8, 298)], "#fffdf2", INK, 3)
        a.ellipse(450 - sw + 24, 262, 20, 11, "#ff8f8f", None, opacity=0.45)
        a.ellipse(450 + sw - 24, 262, 20, 11, "#ff8f8f", None, opacity=0.45)
        if s.flower:
            for i in range(5):
                ang = i * math.tau / 5
                a.circle(520 + 15 * math.cos(ang), 150 + 15 * math.sin(ang), 12, s.flower, darken(s.flower, 0.4), 3)
            a.circle(520, 150, 8, "#ffd84a")
        return a

    def jaw_front() -> Art:
        a = Art(RW, RH)
        a.ellipse(450, 312, sw - 14, 34, a.shaded(lighten(s.belly, 0.05)), o, 5)
        return a

    # front
    P = [_root(RW, RH, R_GROUND)]
    _save(P, out, "front", "leg_fl", "left_arm", "body", (330, 342), -2, {"base": leg(330, True)}, [-60, 100])
    _save(P, out, "front", "leg_fr", "right_arm", "body", (570, 346), -2, {"base": leg(570, False)}, [-60, 110])
    _save(P, out, "front", "body", "body", "root", (450, 380), 0, {"base": body(True)}, [-20, 20])
    _save(P, out, "front", "jaw", "mouth", "head", (450, 300), 3, {"base": jaw_front()}, [0, 0])
    _save(P, out, "front", "head", "head", "body", (450, 290), 4, {"base": head_front()}, [-30, 30])
    _save(P, out, "front", "eyes", "eyes", "head", (450, 172), 6, {v: two_eyes(s, v, eyes_c, 26, 30, RW, RH) for v in EYE_VARIANTS})
    _save(P, out, "front", "pupils", "eyes", "eyes", (450, 172), 7, {v: two_pupils(s, v, eyes_c, RW, RH) for v in ("normal", "small")})
    _save(P, out, "front", "brow", "eyebrows", "head", (450, 130), 8, {"base": two_brows(s, eyes_c, RW, RH)}, [-40, 40])
    views["front"] = _rig("quadruped_reptile", (RW, RH), R_GROUND, P, {"back": {"part": "body", "point": [450, 220]}, "mouth": {"part": "head", "point": [450, 306]},
                                                                      "hand": {"part": "leg_fr", "point": [570, 410]}, "head_top": {"part": "head", "point": [450, 120]}})
    # back
    P = [_root(RW, RH, R_GROUND)]
    tail = Art(RW, RH)
    tail.ellipse(450, 392, 44, 30, tail.shaded(s.skin), o, 5)
    tail.poly([(430, 362), (450, 340), (470, 362)], tail.shaded(s.accent), _o(s.accent), 4)
    _save(P, out, "back", "leg_bl", "left_leg", "body", (330, 342), -2, {"base": leg(330, True)}, [-60, 60])
    _save(P, out, "back", "leg_br", "right_leg", "body", (570, 346), -2, {"base": leg(570, False)}, [-60, 60])
    _save(P, out, "back", "body", "body", "root", (450, 380), 0, {"base": body(False)}, [-20, 20])
    _save(P, out, "back", "tail", "tail", "body", (450, 372), 3, {"base": tail}, [-40, 40])
    peek = Art(RW, RH)
    for cx, cy in eyes_c:
        peek.circle(cx, cy + 4, 42, peek.shaded(s.skin), o)
    peek.ellipse(450, 214, 96, 50, peek.shaded(s.skin), o, 5)
    _save(P, out, "back", "head", "head", "body", (450, 250), -1, {"base": peek}, [-30, 30])
    views["back"] = _rig("quadruped_reptile", (RW, RH), R_GROUND, P, {"back": {"part": "body", "point": [450, 220]}, "mouth": {"part": "head", "point": [450, 214]},
                                                                    "hand": {"part": "leg_br", "point": [570, 410]}, "head_top": {"part": "head", "point": [450, 150]}}, jaw=False)
    return views


# ------------------------------------------------------------------------------------------------ chelonian
def chel_front_back(s: RepSpec, out: Path) -> dict:
    tall = s.species == "tortoise"
    sc = s.shell or s.skin
    top = 190 if tall else 250
    views = {}

    def shell(front: bool) -> Art:
        a = Art(CW, CH)
        a.ellipse(380, 360, 206, 120 + (40 if tall else 0), a.shaded(sc), _o(sc), 7)
        a.path(f"M 190 {top + 100} Q 380 {top + 60} 570 {top + 100}", None, s.accent, 5, 0.8)
        for i in range(5):
            x = 230 + i * 75
            a.path(f"M {x} 440 Q {x + 6} {top + 90} {x + 36} {top + 70}", None, s.accent, 5, 0.9)
        a.path("M 176 430 Q 380 470 584 430 L 584 450 Q 380 492 176 450 Z", a.shaded(s.belly), _o(s.belly), 5)
        return a

    def leg(x: float, far: bool) -> Art:
        a = Art(CW, CH)
        c = darken(s.skin, 0.15) if far else s.skin
        a.rect(x - 30, 410, 60, 62, a.shaded(c), _o(c), rx=24)
        a.ellipse(x, 474, 44, 14, a.shaded(c), _o(c))
        toes(a, x, 480, 3, 20)
        return a

    eyes_c = [(346, 372), (414, 372)]
    head = Art(CW, CH)
    head.ellipse(380, 392, 68, 58, head.shaded(s.skin), _o(s.skin), 6)
    head.ellipse(380, 418, 22, 9, "#ff8f8f", None, opacity=0.4)
    jaw = Art(CW, CH)
    jaw.ellipse(380, 428, 46, 18, jaw.shaded(lighten(s.belly, 0.05)), _o(s.skin), 5)
    P = [_root(CW, CH, C_GROUND)]
    _save(P, out, "front", "leg_fl", "left_arm", "body", (240, 440), -2, {"base": leg(240, True)}, [-60, 100])
    _save(P, out, "front", "leg_fr", "right_arm", "body", (520, 440), -2, {"base": leg(520, False)}, [-60, 110])
    _save(P, out, "front", "body", "body", "root", (380, 410), 0, {"base": shell(True)}, [-18, 18])
    _save(P, out, "front", "jaw", "mouth", "head", (380, 424), 3, {"base": jaw}, [0, 0])
    _save(P, out, "front", "head", "head", "body", (380, 392), 4, {"base": head}, [-30, 30])
    _save(P, out, "front", "eyes", "eyes", "head", (380, 372), 6, {v: two_eyes(s, v, eyes_c, 17, 21, CW, CH) for v in EYE_VARIANTS})
    _save(P, out, "front", "pupils", "eyes", "eyes", (380, 372), 7, {v: two_pupils(s, v, eyes_c, CW, CH) for v in ("normal", "small")})
    _save(P, out, "front", "brow", "eyebrows", "head", (380, 340), 8, {"base": two_brows(s, eyes_c, CW, CH, dy=-30)}, [-40, 40])
    views["front"] = _rig("chelonian", (CW, CH), C_GROUND, P, {"back": {"part": "body", "point": [380, 240]}, "mouth": {"part": "head", "point": [380, 432]},
                                                              "hand": {"part": "leg_fr", "point": [520, 474]}, "head_top": {"part": "head", "point": [380, 336]}})
    P = [_root(CW, CH, C_GROUND)]
    tail = Art(CW, CH)
    tail.ellipse(380, 452, 20, 14, tail.shaded(s.skin), _o(s.skin), 4)
    _save(P, out, "back", "leg_bl", "left_leg", "body", (240, 440), -2, {"base": leg(240, True)}, [-60, 60])
    _save(P, out, "back", "leg_br", "right_leg", "body", (520, 440), -2, {"base": leg(520, False)}, [-60, 60])
    _save(P, out, "back", "body", "body", "root", (380, 410), 0, {"base": shell(False)}, [-18, 18])
    _save(P, out, "back", "tail", "tail", "body", (380, 446), 3, {"base": tail}, [-40, 40])
    views["back"] = _rig("chelonian", (CW, CH), C_GROUND, P, {"back": {"part": "body", "point": [380, 240]}, "mouth": {"part": "body", "point": [380, 440]},
                                                            "hand": {"part": "leg_br", "point": [520, 474]}, "head_top": {"part": "body", "point": [380, 240]}}, jaw=False)
    return views


# ------------------------------------------------------------------------------------------------ serpent
def serp_front_back(s: RepSpec, out: Path) -> dict:
    views = {}
    cx = 500
    o = _o(s.skin)

    def coil(front: bool) -> Art:
        a = Art(SW, SH)
        for k, (y, rx) in enumerate(((396, 150), (352, 126), (312, 100))):
            a.ellipse(cx, y, rx, 42, a.shaded(s.skin), o, 6)
            a.ellipse(cx, y + 16, rx - 30, 22, s.belly, None, opacity=0.8)
            for dx in (-rx * 0.5, 0, rx * 0.5):
                a.poly([(cx + dx - 14, y - 10), (cx + dx, y - 30), (cx + dx + 14, y - 10)], s.accent, None, 0, 0.8)
        if not front:
            a.path(f"M {cx + 120} 396 Q {cx + 190} 400 {cx + 200} 360", None, o, 22)
            a.path(f"M {cx + 120} 396 Q {cx + 190} 400 {cx + 200} 360", None, s.skin, 14)
        return a

    eyes_c = [(cx - 40, 214), (cx + 40, 214)]
    head = Art(SW, SH)
    head.path(f"M {cx - 70} 270 Q {cx - 84} 196 {cx} 186 Q {cx + 84} 196 {cx + 70} 270 Q {cx} 292 {cx - 70} 270 Z", head.shaded(s.skin), o, 6)
    head.ellipse(cx - 56, 252, 14, 8, "#ff8f8f", None, opacity=0.4)
    head.ellipse(cx + 56, 252, 14, 8, "#ff8f8f", None, opacity=0.4)
    jaw = Art(SW, SH)
    jaw.ellipse(cx, 276, 52, 16, jaw.shaded(lighten(s.belly, 0.05)), o, 5)
    tongue = {"out": Art(SW, SH), "in": Art(SW, SH)}
    tongue["out"].path(f"M {cx} 284 L {cx} 330 M {cx} 330 L {cx - 12} 344 M {cx} 330 L {cx + 12} 344", None, "#d8365a", 5)
    tongue["in"].path(f"M {cx} 284 L {cx} 292", None, "#d8365a", 5)
    P = [_root(SW, SH, S_GROUND)]
    _save(P, out, "front", "body", "body", "root", (cx, 396), 0, {"base": coil(True)}, [-30, 30])
    _save(P, out, "front", "tongue", "tongue", "head", (cx, 284), 19, tongue)
    P[-1]["default_variant"] = "in"
    _save(P, out, "front", "jaw", "mouth", "head", (cx, 276), 21, {"base": jaw}, [0, 0])
    _save(P, out, "front", "head", "head", "body", (cx, 270), 20, {"base": head}, [-40, 40])
    _save(P, out, "front", "eyes", "eyes", "head", (cx, 214), 24, {v: two_eyes(s, v, eyes_c, 15, 18, SW, SH) for v in EYE_VARIANTS})
    _save(P, out, "front", "pupils", "eyes", "eyes", (cx, 214), 25, {v: two_pupils(s, v, eyes_c, SW, SH) for v in ("normal", "small")})
    _save(P, out, "front", "brow", "eyebrows", "head", (cx, 180), 26, {"base": two_brows(s, eyes_c, SW, SH, dy=-26)}, [-40, 40])
    views["front"] = _rig("serpentine_reptile", (SW, SH), S_GROUND, P, {"back": {"part": "body", "point": [cx, 330]}, "mouth": {"part": "head", "point": [cx, 286]},
                                                                       "hand": {"part": "body", "point": [cx + 120, 360]}, "head_top": {"part": "head", "point": [cx, 186]}})
    P = [_root(SW, SH, S_GROUND)]
    _save(P, out, "back", "body", "body", "root", (cx, 396), 0, {"base": coil(False)}, [-30, 30])
    hd = Art(SW, SH)
    hd.ellipse(cx, 270, 58, 40, hd.shaded(s.skin), o, 6)
    _save(P, out, "back", "head", "head", "body", (cx, 290), 20, {"base": hd}, [-40, 40])
    views["back"] = _rig("serpentine_reptile", (SW, SH), S_GROUND, P, {"back": {"part": "body", "point": [cx, 330]}, "mouth": {"part": "head", "point": [cx, 276]},
                                                                      "hand": {"part": "body", "point": [cx + 120, 360]}, "head_top": {"part": "head", "point": [cx, 232]}}, jaw=False)
    return views


# ------------------------------------------------------------------------------------------------ three-quarter
def squeeze(art: Art, f: float, cx: float, dx: float = 0.0) -> Art:
    out = Art(art.w, art.h)
    out.defs, out._n = list(art.defs), art._n
    out.items = [f'<g transform="translate({cx + dx} 0) scale({f} 1) translate({-cx} 0)">', *art.items, "</g>"]
    return out


FACE_PARTS = {"head", "jaw", "eyes", "pupils", "brow", "tongue"}


def _moved(art: Art, centre, to, sc: float) -> Art:
    out = Art(art.w, art.h)
    out.defs, out._n = list(art.defs), art._n
    hx, hy = centre
    out.items = [f'<g transform="translate({to[0]} {to[1]}) scale({sc}) translate({-hx} {-hy})">', *art.items, "</g>"]
    return out


def three_quarter(s: RepSpec, side_rig: dict, front_rig: dict, out: Path, canvas, cx: float, f: float, swap: dict) -> dict:
    """Body, legs and tail: the side parts squeezed along the body. Head and face: the head-on parts swung toward the viewer and placed on the neck."""
    base = Path(out)
    fparts = {p["id"]: p for p in front_rig["parts"]}
    hx, hy = swap["centre"]
    tx, ty = swap["to"]
    sc = swap["scale"]
    parts = []
    for p in side_rig["parts"]:
        if not p["variants"]:
            parts.append({**p})
            continue
        use_front = p["id"] in FACE_PARTS and p["id"] in fparts
        src = fparts[p["id"]] if use_front else p
        variants = {}
        for vname, v in src["variants"].items():
            art = _read_svg_art(base / v["svg"], canvas)
            art = _moved(art, (hx, hy), (tx, ty), sc) if use_front else squeeze(art, f, cx)
            origin, size = _save_part(art, out, f"{p['id']}_{vname}", folder="views/three_quarter/rig")
            variants[vname] = {"file": f"views/three_quarter/rig/{p['id']}_{vname}.png", "svg": f"views/three_quarter/rig/{p['id']}_{vname}.svg", "origin": origin, "size": size}
        if use_front:
            pv = fparts[p["id"]]["pivot"]
            pivot = [tx + (pv[0] - hx) * sc, ty + (pv[1] - hy) * sc]
        else:
            pivot = [cx + (p["pivot"][0] - cx) * f, p["pivot"][1]]
        extra = {"default_variant": src.get("default_variant")} if src.get("default_variant") else {}
        parts.append({**p, "variants": variants, "pivot": pivot, "rotation_limits": src.get("rotation_limits", p.get("rotation_limits")), **extra})
    ap = {}
    for k, v in side_rig["attach_points"].items():
        pt = v["point"]
        if v["part"] in FACE_PARTS:
            ap[k] = {"part": v["part"], "point": [tx, ty + (pt[1] - hy) * 0.2]}
        else:
            ap[k] = {"part": v["part"], "point": [cx + (pt[0] - cx) * f, pt[1]]}
    return {**side_rig, "parts": parts, "attach_points": ap}


def _read_svg_art(path: Path, canvas) -> Art:
    """Wrap an existing part SVG (cropped to its own box) back onto the full canvas so it can be transformed as one drawing."""
    import re
    text = path.read_text(encoding="utf-8")
    m = re.match(r'<svg [^>]*width="([\d.]+)" height="([\d.]+)" viewBox="([\d.\-]+) ([\d.\-]+) ([\d.]+) ([\d.]+)">(.*)</svg>', text, flags=re.S)
    inner = m.group(7)
    a = Art(canvas[0], canvas[1])
    a.items = [inner]
    return a


def build_rep_views(s: RepSpec, out: Path, side_data: dict) -> dict:
    """`side_data` is the manifest data of the primary (side) build, already written under `out`."""
    side = side_data["rig"]
    if s.family == "quad":
        views = quad_front_back(s, out)
        cx, canvas, f, swap = 450, (RW, RH), 0.8, {"centre": (450, 250), "to": (640, 262), "scale": 0.9}
    elif s.family == "chelonian":
        views = chel_front_back(s, out)
        cx, canvas, f, swap = 380, (CW, CH), 0.82, {"centre": (380, 392), "to": (642, 330), "scale": 0.85}
    else:
        views = serp_front_back(s, out)
        cx, canvas, f, swap = 500, (SW, SH), 0.8, {"centre": (500, 236), "to": (850, 356), "scale": 0.85}
    views["three_quarter"] = three_quarter(s, side, views["front"], out, canvas, cx, f, swap)
    return views
