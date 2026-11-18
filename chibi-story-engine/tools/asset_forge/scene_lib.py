"""Helpers shared by the category recipe modules."""
from __future__ import annotations

import math
import random

from .env_kit import (FLOOR, SHAPES, At, EnvSpec, L, L_far, L_fg, L_fx, L_ground, L_items, L_mid, L_sky, L_wall, Row, Scatter, Shape, SWAY, ground_anchors,
                      water_anchors)
from .kit import REGISTRY, V, ol
from .svg import darken, lighten, mix

FOLIAGE_KEYS = ("leaf", "leaf2", "leaf3")


def haze(pal: dict | None, toward: str, amt: float) -> dict:
    """Push a palette towards the sky colour: distant things look paler and bluer."""
    base = {"leaf": "#4aa550", "leaf2": "#3f9447", "leaf3": "#6bbf5c", "bark": "#8a5a33", "stone": "#a9a59c"}
    base.update(pal or {})
    return {k: mix(v, toward, amt) for k, v in base.items()}


def sh_vines(v, k, rng, n=14, top=1280.0, lo=420.0, hi=1000.0, col="#3f8a3c"):
    for _ in range(n):
        x = rng.uniform(-300, 2220)
        ln = rng.uniform(top - hi, top - lo)
        sway = rng.uniform(-40, 40)
        pts = [(x, top), (x + sway * 0.5, top - ln * 0.4), (x - sway * 0.4, top - ln * 0.75), (x + sway * 0.2, top - ln)]
        v.L(pts, ol(col), 11)
        v.L(pts, mix(col, "#7acb6a", rng.random() * 0.5), 7)
        for t in (0.35, 0.55, 0.75, 0.95):
            px, py = x + sway * (0.5 * t - 0.2), top - ln * t
            for sgn in (-1, 1):
                v.E(px + sgn * 14, py - 6, 14, 8, fill=mix(col, "#9ad56a", rng.random()), stroke=ol(col), sw=2, rot=sgn * 30)


def sh_branch(v, k, rng, x, y, w=420, th=42, col="#8a5a33", leaves="#4aa550"):
    """A thick limb reaching out from a trunk at the left, ending at (x, y)."""
    pts = [(x - w, y - 18), (x - w * 0.6, y - 6), (x - w * 0.2, y + 2), (x, y + 6)]
    v.L(pts, ol(col), th + 8)
    v.L(pts, col, th)
    for t in (0.2, 0.45, 0.7, 0.95):
        bx, by = x - w * (1 - t), y + 6 - 24 * (1 - t)
        for dx, dy, r in ((-10, 36, 26), (14, 52, 20)):
            v.E(bx + dx, by + dy, r, fill=mix(leaves, "#9ad56a", rng.random() * 0.4), stroke=ol(leaves), sw=3)


def sh_leaf_litter(v, k, rng, n=40, cols=("#d9702a", "#b4521c", "#f0a23a", "#c8a050"), y0=-190.0, y1=300.0):
    for _ in range(n):
        x, y = rng.uniform(-300, 2220), rng.uniform(y0, y1)
        c = cols[rng.randrange(len(cols))]
        v.E(x, y, rng.uniform(9, 16), rng.uniform(5, 8), fill=c, stroke=ol(c), sw=1.5, rot=rng.uniform(0, 180))


def sh_petals(v, k, rng, n=60, col="#ffe4ee"):
    for _ in range(n):
        v.E(rng.uniform(-300, 2220), rng.uniform(-190, 1100), rng.uniform(5, 9), rng.uniform(3, 5), fill=col, op=rng.uniform(0.6, 0.95), rot=rng.uniform(0, 180))


def sh_trunk_wall(v, k, rng, x, w=220, col="#6a4a2a", top=1280.0, base=330.0):
    """A huge close tree trunk framing the picture."""
    pts = [(x - w * 0.7, base - 100), (x - w * 0.5, base + 200), (x - w * 0.42, top), (x + w * 0.42, top), (x + w * 0.5, base + 200), (x + w * 0.7, base - 100)]
    v.S(pts, v.G([(0, lighten(col, 0.12)), (1, darken(col, 0.18))], False), ol(col), 8)
    for _ in range(9):
        yy = rng.uniform(base, top - 100)
        v.L([(x - w * 0.3, yy), (x - w * 0.1, yy + 90), (x + w * 0.1, yy + 40)], darken(col, 0.35), 5, 0.6)


SHAPES.update({"vines": sh_vines, "branch": sh_branch, "leaf_litter": sh_leaf_litter, "petals": sh_petals, "trunk_wall": sh_trunk_wall})


def make_env(eid: str, name: str, cat: str, sub: str, desc: str, layers: list[dict], anchors: dict, roles: dict, habitats: list[str], tags: list[str],
             aliases: list[str] | None = None, stories: list[str] | None = None, seed: int = 1, **kw) -> EnvSpec:
    return EnvSpec(eid, name, cat, sub, desc, layers, anchors, roles, habitats, tags, aliases or [], stories or [], seed=seed, **kw)


def std_roles(anchors: dict, arboreal: str | None = None) -> dict:
    g = [a for a in ("center", "left", "right", "far_left", "far_right") if a in anchors]
    roles = {"ground": g}
    if arboreal:
        roles["arboreal"] = [arboreal, *g[:1]]
    else:
        roles["arboreal"] = g[:2]
    water = [a for a in anchors if a.startswith("water_")]
    if water:
        roles["aquatic"] = water
    return roles


# --------------------------------------------------------------------------------- the general composer
from .env_kit import SCROLL, BOB, SKY_COLOURS, build_beams  # noqa: E402
from .environments import ripples, water_body, water_front  # noqa: E402


def scene(*, sky=None, wall=None, far=(), back=(), decor=(), ground=("grass", FLOOR), water=None, mid=(), veg=(), occl=(), fg=(), fx=(), scare=(),
          beams=None, seed=1, anchor_y=215.0, anchors=None, roles=None, arboreal=None, far_parallax=0.3, back_parallax=0.55, ground_amp=8.0, framing=(),
          back_tint="foliage", fg_tint="foliage", far_tint="background"):
    """Compose a scene from layers. `sky` = (kind, kwargs) for outdoors, `wall` = (kind, kwargs) for interiors."""
    layers = []
    if wall:
        kind, kw = wall
        layers.append(L_wall(kind, 5, 0.94, seed, **kw))
    else:
        kind, kw = sky or ("day", {})
        layers.append(L_sky(kind, seed, **kw))
    if far:
        layers.append(L_far(list(far), far_parallax, "far", 1, tint=far_tint))
    if back:
        layers.append(L_far(list(back), back_parallax, "back", 2, tint=back_tint))
    if decor:
        layers.append(L("wall_decor", "far", 0.94, 6, items=list(decor), scale=0.8, tint="background"))
    if beams is not None:
        from .env_kit import build_beams as _bb
        layers.append(L("ceiling", "far", 0.97, 7, art=_bb(beams), scale=0.6))
    if water:
        top = water.get("top", 400.0)
        layers.append(L("water", "middle", 1.0, 8, special=("water", water.get("c1", "#7fd6e8"), water.get("c2", "#2f8fc4"), top), cover_x=True, scale=0.5))
        lo, hi = water.get("ripples", (150.0, top - 12))
        layers.append(L("ripples", "middle", 1.0, 12, art=ripples(lo, hi, seed + 21, water.get("n", 24), opacity=0.45), scale=0.9, motion=[SCROLL(30), BOB(3, 3)]))
    gk, gtop = ground[0], ground[1]
    layers.append(L_ground(gk, gtop, 10, seed + 3, amp=ground_amp, **(ground[2] if len(ground) > 2 else {})))
    if water and water.get("front", True):
        from .environments import water_front as _wf
        layers.append(L("water_front", "foreground", 1.0, 130, art=_wf(water.get("front_top", 120.0), water.get("front_col", "#3b9fd0")), scale=0.5, motion=[BOB(4, 2.6)]))
    if mid:
        layers.append(L_mid(list(mid), 1.0, "main_scenery", 40, tint="background"))
    if veg:
        layers.append(L_mid(list(veg), 1.0, "vegetation", 45, tint="foliage"))
    if occl:
        layers.append(L("foreground_objects", "foreground", 1.0, 130, items=list(occl), scale=0.9, tint="background"))
    if framing:
        layers.append(L("framing", "foreground", 1.12, 700, items=list(framing), scale=0.8, tint="background"))
    if fg:
        layers.append(L_fg(list(fg), tint=fg_tint))
    if fx:
        layers.append(L_fx(list(fx), "atmosphere", 920))
    if scare:
        layers.append(L_fx(list(scare), "spooky", 925, scare=1))
    an = anchors if anchors is not None else (water_anchors(105.0, anchor_y) if water else ground_anchors(anchor_y))
    return layers, an, (roles or std_roles(an, arboreal))


# ------------------------------------------------------------------------------------- more shapes
def sh_stove(v, k, rng, x, y, s=1.0):
    s *= k ** 0.5
    v.S([(x - 110 * s, y), (x - 100 * s, y + 120 * s), (x + 100 * s, y + 120 * s), (x + 110 * s, y)], v.shaded("#c9783c"), ol("#c9783c"), 5)
    v.E(x, y + 120 * s, 86 * s, 18 * s, fill="#2a1a14", stroke=ol("#c9783c"), sw=4)
    v.S([(x - 60 * s, y), (x - 60 * s, y + 50 * s), (x, y + 70 * s), (x + 60 * s, y + 50 * s), (x + 60 * s, y)], "#1a1010")
    v.glow(x, y + 36 * s, 120 * s, "#ff9a30", 0.7)
    REGISTRY["lamp-diya"].render(v, x - 4 * s, y + 20 * s, 0.01)
    v.S([(x - 50 * s, y + 130 * s), (x - 70 * s, y + 200 * s), (x - 40 * s, y + 250 * s), (x + 40 * s, y + 250 * s), (x + 70 * s, y + 200 * s), (x + 50 * s, y + 130 * s)], v.shaded("#8a8a92"), ol("#8a8a92"), 5)
    for i in range(3):
        v.E(x + (i - 1) * 24 * s, y + 280 * s + i * 14 * s, 18 * s, 10 * s, fill="#ffffff", op=0.55)


def sh_charpai(v, k, rng, x, y, w=300):
    w *= k ** 0.5
    v.R(x - w / 2, y + 50, w, 18, v.shaded("#8a5a33"), ol("#8a5a33"), 4, 4)
    for dx in (-0.46, 0.46):
        v.R(x + dx * w - 9, y, 18, 56, v.shaded("#7a4a2a"), ol("#7a4a2a"), 3)
    for i in range(int(w / 22)):
        v.L([(x - w / 2 + 12 + i * 22, y + 66), (x - w / 2 + 12 + i * 22, y + 76)], "#e8d8b0", 4, smooth=False)
    v.R(x - w / 2 + 6, y + 66, w - 12, 12, "#d8c090", ol("#c0a870"), 2)


def sh_sacks(v, k, rng, x, y, s=1.0, n=5):
    s *= k ** 0.5
    for i in range(n):
        sx, sy = x + (i - n / 2) * 78 * s, y + (i % 2) * 70 * s
        v.S([(sx - 44 * s, sy), (sx - 52 * s, sy + 70 * s), (sx - 26 * s, sy + 120 * s), (sx + 26 * s, sy + 120 * s), (sx + 52 * s, sy + 70 * s), (sx + 44 * s, sy)], v.shaded("#d8c090"), ol("#d8c090"), 4)
        v.L([(sx - 22 * s, sy + 112 * s), (sx + 22 * s, sy + 112 * s)], "#8a6a3a", 4, smooth=False)


def sh_barrel(v, k, rng, x, y, s=1.0):
    s *= k ** 0.5
    v.S([(x - 50 * s, y), (x - 62 * s, y + 60 * s), (x - 50 * s, y + 130 * s), (x + 50 * s, y + 130 * s), (x + 62 * s, y + 60 * s), (x + 50 * s, y)], v.shaded("#9a6a3a"), ol("#9a6a3a"), 5)
    for yy in (22, 66, 108):
        v.L([(x - 56 * s, y + yy * s), (x + 56 * s, y + yy * s)], "#4a4a52", 5, smooth=False)


def sh_cart(v, k, rng, x, y, s=1.0):
    s *= k ** 0.5
    v.R(x - 160 * s, y + 70 * s, 320 * s, 30 * s, v.shaded("#9a6a3a"), ol("#9a6a3a"), 5, 4)
    for i in range(9):
        v.R(x - 150 * s + i * 36 * s, y + 100 * s, 30 * s, 60 * s, v.shaded("#a87a48"), ol("#8a5a33"), 3)
    v.L([(x - 230 * s, y + 90 * s), (x - 160 * s, y + 80 * s)], "#7a4a2a", 10 * s, smooth=False)
    for dx in (-90, 100):
        v.E(x + dx * s, y + 60 * s, 62 * s, fill="#7a4a2a", stroke=ol("#7a4a2a"), sw=6)
        v.E(x + dx * s, y + 60 * s, 14 * s, fill="#3a2a1a")
        for a in range(8):
            ang = a * math.pi / 4
            v.L([(x + dx * s, y + 60 * s), (x + dx * s + math.cos(ang) * 58 * s, y + 60 * s + math.sin(ang) * 58 * s)], "#5a3a1a", 4, smooth=False)


def sh_altar(v, k, rng, x, y, s=1.0, idol="#e6b93c"):
    s *= k ** 0.5
    v.R(x - 200 * s, y, 400 * s, 40 * s, v.shaded("#d8c098"), ol("#d8c098"), 5, 5)
    v.R(x - 160 * s, y + 40 * s, 320 * s, 30 * s, v.shaded("#c8a878"), ol("#c8a878"), 5, 5)
    v.S([(x - 70 * s, y + 70 * s), (x - 80 * s, y + 200 * s), (x - 40 * s, y + 280 * s), (x + 40 * s, y + 280 * s), (x + 80 * s, y + 200 * s), (x + 70 * s, y + 70 * s)], v.shaded(idol), ol(idol), 5)
    v.E(x, y + 320 * s, 44 * s, 50 * s, fill=v.shaded(idol), stroke=ol(idol), sw=5)
    v.E(x, y + 380 * s, 22 * s, 18 * s, fill=v.shaded(idol), stroke=ol(idol), sw=4)
    v.glow(x, y + 250 * s, 260 * s, "#ffcf70", 0.45)
    for dx in (-150, -100, 100, 150):
        REGISTRY["lamp-diya"].render(v, x + dx * s, y + 72 * s, 0.8 * s)
    for dx in (-30, 30):
        v.E(x + dx * s, y + 74 * s, 22 * s, 8 * s, fill="#e8587a")


def sh_buddha(v, k, rng, x, y, s=1.0):
    s *= k ** 0.5
    gold = "#e6b93c"
    v.R(x - 190 * s, y, 380 * s, 50 * s, v.shaded("#c8a878"), ol("#c8a878"), 5, 5)
    v.S([(x - 150 * s, y + 50 * s), (x - 170 * s, y + 90 * s), (x - 90 * s, y + 130 * s), (x + 90 * s, y + 130 * s), (x + 170 * s, y + 90 * s), (x + 150 * s, y + 50 * s)], v.shaded(gold), ol(gold), 5)
    v.S([(x - 80 * s, y + 120 * s), (x - 96 * s, y + 250 * s), (x - 50 * s, y + 330 * s), (x + 50 * s, y + 330 * s), (x + 96 * s, y + 250 * s), (x + 80 * s, y + 120 * s)], v.shaded(gold), ol(gold), 5)
    v.E(x, y + 380 * s, 50 * s, 56 * s, fill=v.shaded(gold), stroke=ol(gold), sw=5)
    v.E(x, y + 450 * s, 22 * s, 20 * s, fill=v.shaded(gold), stroke=ol(gold), sw=4)
    v.glow(x, y + 300 * s, 300 * s, "#ffe8a0", 0.35)
    v.L([(x - 26 * s, y + 380 * s), (x - 14 * s, y + 372 * s)], "#5a3a1a", 4)
    v.L([(x + 14 * s, y + 372 * s), (x + 26 * s, y + 380 * s)], "#5a3a1a", 4)


def sh_prayer_wheels(v, k, rng, x0, x1, y, n=9):
    for i in range(n):
        x = x0 + (x1 - x0) * i / max(1, n - 1)
        v.R(x - 18, y, 36, 90, v.shaded("#c0392b"), ol("#c0392b"), 4, 8)
        v.R(x - 22, y + 86, 44, 10, v.shaded("#e6b93c"), ol("#e6b93c"), 3, 4)
        v.L([(x - 12, y + 40), (x + 12, y + 40)], "#e6b93c", 4, smooth=False)


def sh_stairs(v, k, rng, x, y, w=600, n=6, step=28, col="#d8c8a8"):
    w *= k ** 0.5
    for i in range(n):
        ww = w * (1 - i * 0.06)
        v.R(x - ww / 2, y + i * step, ww, step + 2, v.shaded(mix(col, "#ffffff", i * 0.05)), ol(col), 4)


def sh_scarecrow(v, k, rng, x, y, s=1.0):
    s *= k ** 0.5
    v.R(x - 8 * s, y, 16 * s, 300 * s, "#7a5230", ol("#7a5230"), 3)
    v.R(x - 110 * s, y + 200 * s, 220 * s, 14 * s, "#7a5230", ol("#7a5230"), 3)
    v.R(x - 50 * s, y + 130 * s, 100 * s, 130 * s, v.shaded("#c0392b"), ol("#c0392b"), 4, 10)
    v.E(x, y + 310 * s, 40 * s, fill=v.shaded("#f2d9a0"), stroke=ol("#c0a070"), sw=4)
    v.P([(x - 56 * s, y + 330 * s), (x, y + 400 * s), (x + 56 * s, y + 330 * s)], "#d8a23a", ol("#7a5a2a"), 4)
    for dx in (-1, 1):
        for i in range(4):
            v.L([(x + dx * (100 + i * 4) * s, y + 204 * s), (x + dx * (118 + i * 6) * s, y + (160 - i * 12) * s)], "#d8c060", 4, smooth=False)


def sh_wheel(v, k, rng, x, y, s=1.0):
    s *= k ** 0.5
    v.R(x - 90 * s, y, 180 * s, 70 * s, v.shaded("#9a6a3a"), ol("#9a6a3a"), 5, 6)
    v.E(x, y + 74 * s, 78 * s, 20 * s, fill=v.shaded("#c9783c"), stroke=ol("#c9783c"), sw=4)
    v.S([(x - 40 * s, y + 84 * s), (x - 52 * s, y + 130 * s), (x - 24 * s, y + 170 * s), (x + 24 * s, y + 170 * s), (x + 52 * s, y + 130 * s), (x + 40 * s, y + 84 * s)], v.shaded("#c9783c"), ol("#c9783c"), 4)


def sh_anvil(v, k, rng, x, y, s=1.0):
    s *= k ** 0.5
    v.R(x - 40 * s, y, 80 * s, 70 * s, v.shaded("#6a4a2a"), ol("#6a4a2a"), 4, 4)
    v.P([(x - 110 * s, y + 70 * s), (x + 80 * s, y + 70 * s), (x + 130 * s, y + 96 * s), (x + 70 * s, y + 104 * s), (x - 90 * s, y + 104 * s)], v.shaded("#5a5a62"), ol("#5a5a62"), 4)


def sh_platform(v, k, rng, x, y, w=600, h=120, col="#9a6a3a", canopy=None):
    w *= k ** 0.5
    v.R(x - w / 2, y, w, h, v.shaded(col), ol(col), 5, 4)
    for i in range(int(w / 70)):
        v.L([(x - w / 2 + 35 + i * 70, y), (x - w / 2 + 35 + i * 70, y + h)], darken(col, 0.3), 3, 0.6, smooth=False)
    if canopy:
        for dx in (-0.46, 0.46):
            v.R(x + dx * w - 7, y + h, 14, 300, v.shaded("#7a5230"), ol("#7a5230"), 3)
        v.P([(x - w / 2 - 20, y + h + 300), (x - w * 0.3, y + h + 370), (x + w * 0.3, y + h + 370), (x + w / 2 + 20, y + h + 300)], v.shaded(canopy), ol(canopy), 5)


def sh_pyre(v, k, rng, x, y, s=1.0):
    s *= k ** 0.5
    for i in range(6):
        v.R(x - 150 * s + i * 4 * s, y + i * 18 * s, (300 - i * 8) * s, 16 * s, v.shaded("#7a5230"), ol("#7a5230"), 3, 3)
    for dx, hh, c in ((-60, 170, "#ff7a2a"), (0, 250, "#ffa83a"), (60, 180, "#ff7a2a")):
        v.S([(x + (dx - 46) * s, y + 100 * s), (x + (dx - 24) * s, y + (100 + hh * 0.5) * s), (x + dx * s, y + (100 + hh) * s), (x + (dx + 24) * s, y + (100 + hh * 0.5) * s), (x + (dx + 46) * s, y + 100 * s)], c, ol(c, 0.35), 2)
    v.glow(x, y + 160 * s, 360 * s, "#ff8a30", 0.55)


def sh_drum(v, k, rng, x, y, s=1.0):
    s *= k ** 0.5
    v.S([(x - 70 * s, y), (x - 84 * s, y + 60 * s), (x - 70 * s, y + 120 * s), (x + 70 * s, y + 120 * s), (x + 84 * s, y + 60 * s), (x + 70 * s, y)], v.shaded("#c0392b"), ol("#c0392b"), 5)
    v.E(x, y + 120 * s, 70 * s, 18 * s, fill="#f0e0b8", stroke=ol("#c0a070"), sw=4)
    for i in range(6):
        v.L([(x - 64 * s + i * 26 * s, y + 6 * s), (x - 52 * s + i * 22 * s, y + 114 * s)], "#e6b93c", 3, smooth=False)


def sh_flags(v, k, rng, x0, y0, x1, y1, sag=60, n=14):
    v.L([(x0, y0), ((x0 + x1) / 2, (y0 + y1) / 2 - sag), (x1, y1)], "#3a2a1a", 4)
    cols = ["#3a6ad8", "#f6f6f6", "#c0392b", "#3aa85a", "#f2c230"]
    for i in range(n):
        t = (i + 0.5) / n
        px = x0 + (x1 - x0) * t
        py = (y0 + (y1 - y0) * t) - sag * (1 - (2 * t - 1) ** 2)
        c = cols[i % 5]
        v.P([(px - 20, py), (px + 20, py), (px + 20, py - 52), (px, py - 44), (px - 20, py - 52)], v.shaded(c), ol(c), 3)


def sh_cushions(v, k, rng, xs, y, col="#c0392b"):
    for i, x in enumerate(xs):
        c = [col, "#3a6ad8", "#e6b93c", "#3aa85a"][i % 4]
        v.E(x, y, 62 * k ** 0.4, 22 * k ** 0.4, fill=v.shaded(c), stroke=ol(c), sw=4)


def sh_blackboard(v, k, rng, x, y, w=300, h=200):
    v.R(x - w / 2, y, w, h, v.shaded("#2f4a3a"), "#8a5a33", 9, 4)
    for i, ln in enumerate((0.7, 0.5, 0.62)):
        v.L([(x - w * 0.4, y + h * (0.75 - i * 0.2)), (x - w * 0.4 + w * ln, y + h * (0.75 - i * 0.2))], "#f0f0e8", 4, 0.8)


def sh_log(v, k, rng, x, y, s=1.0):
    s *= k ** 0.5
    v.R(x - 150 * s, y, 300 * s, 64 * s, v.shaded("#7a5230"), ol("#7a5230"), 5, 28 * s)
    v.E(x + 150 * s, y + 32 * s, 14 * s, 32 * s, fill="#d8b888", stroke=ol("#7a5230"), sw=3)
    v.L([(x - 90 * s, y + 20 * s), (x + 80 * s, y + 24 * s)], darken("#7a5230", 0.3), 3, 0.6)


def sh_milestone(v, k, rng, x, y, s=1.0):
    s *= k ** 0.5
    v.S([(x - 40 * s, y), (x - 36 * s, y + 90 * s), (x, y + 120 * s), (x + 36 * s, y + 90 * s), (x + 40 * s, y)], v.shaded("#b0a58a"), ol("#b0a58a"), 4)
    v.L([(x - 16 * s, y + 70 * s), (x + 16 * s, y + 70 * s)], darken("#b0a58a", 0.4), 4, smooth=False)


def sh_signpost(v, k, rng, x, y, s=1.0):
    s *= k ** 0.5
    v.R(x - 7 * s, y, 14 * s, 240 * s, v.shaded("#7a5230"), ol("#7a5230"), 3)
    for dy, dx in ((200, 1), (150, -1)):
        v.P([(x, y + (dy + 24) * s), (x + dx * 110 * s, y + (dy + 24) * s), (x + dx * 134 * s, y + (dy + 2) * s), (x + dx * 110 * s, y + (dy - 20) * s), (x, y + (dy - 20) * s)], v.shaded("#c8a070"), ol("#8a5a33"), 3)


def sh_tent_flags(v, k, rng, x, y, s=1.0, col="#c0392b"):
    s *= k ** 0.5
    v.R(x - 4 * s, y, 8 * s, 360 * s, "#7a5a3a", ol("#7a5a3a"), 3)
    v.P([(x + 4 * s, y + 360 * s), (x + 130 * s, y + 330 * s), (x + 4 * s, y + 290 * s)], v.shaded(col), ol(col), 3)


def sh_graves(v, k, rng, n=7, y0=190.0, y1=320.0):
    for i in range(n):
        sh_tombstone(v, k, rng, 120 + i * (1680 / max(1, n - 1)) + rng.uniform(-60, 60), rng.uniform(y0, y1), rng.uniform(0.6, 1.1))


def sh_smoke(v, k, rng, x, y, n=8, col="#d8d8e0"):
    for i in range(n):
        v.E(x + math.sin(i * 0.9) * 30 + i * 6, y + i * 54, 26 + i * 8, 20 + i * 7, fill=col, op=max(0.08, 0.5 - i * 0.06))


def sh_hay_roll(v, k, rng, x, y, s=1.0):
    s *= k ** 0.5
    v.E(x, y + 60 * s, 62 * s, fill=v.shaded("#e8c860"), stroke=ol("#c0a040"), sw=5)
    for r in (40, 22, 8):
        v.E(x, y + 60 * s, r * s, stroke="#c0a040", sw=3, op=0.7)


def sh_ghat(v, k, rng, x, y, w=700, n=7):
    sh_stairs(v, k, rng, x, y, w, n, 26, "#c8c0a8")


def sh_hill_slope(v, k, rng, pts, col="#7fbf78", edge=None):
    v.S(pts, v.G([(0, lighten(col, 0.14)), (1, col)]), ol(col, 0.4), 5)


SHAPES.update({"stove": sh_stove, "charpai": sh_charpai, "sacks": sh_sacks, "barrel": sh_barrel, "cart": sh_cart, "altar": sh_altar, "buddha": sh_buddha,
               "prayer_wheels": sh_prayer_wheels, "stairs": sh_stairs, "scarecrow": sh_scarecrow, "wheel": sh_wheel, "anvil": sh_anvil, "platform": sh_platform,
               "pyre": sh_pyre, "drum": sh_drum, "flags": sh_flags, "cushions": sh_cushions, "blackboard": sh_blackboard, "log": sh_log, "milestone": sh_milestone,
               "signpost": sh_signpost, "tent_flags": sh_tent_flags, "graves": sh_graves, "smoke": sh_smoke, "hay_roll": sh_hay_roll, "ghat": sh_ghat, "hill": sh_hill_slope})
