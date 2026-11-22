"""Reusable vector components, part 1: nature (trees, bushes, flowers, grass, rocks, clouds, mountains, water).

Every drawer has the signature  draw(v, x, y, s, rng, pal, **params)  where (x, y) is the base point in stage
coordinates and s the scale. Palettes use leaf / leaf2 / leaf3 (light, dark, highlight) so seasons recolour them.
"""
from __future__ import annotations

import math
import random

from .kit import PAL, V, ol, register, shade
from .svg import darken, lighten, mix


def _P(pal, **defaults):
    return {**PAL, **defaults, **{k: v for k, v in pal.items() if v}}


# ---------------------------------------------------------------------------------------------- helpers
def _lobes(v: V, cx, cy, r, pal, rng, n=11, flat=0.62, sw=8.0):
    """A cluster of overlapping discs: outline pass first so the silhouette is one clean shape, then fills and highlights."""
    blobs = [(cx + rng.uniform(-r, r) * 0.9, cy + rng.uniform(-r * flat, r * flat) * 0.9, rng.uniform(0.38, 0.62) * r) for _ in range(n)]
    edge = ol(pal["leaf2"])
    for x, y, rr in blobs:
        v.E(x, y, rr, stroke=edge, sw=sw)
    for x, y, rr in blobs:
        v.E(x, y, rr, fill=mix(pal["leaf"], pal["leaf3"], rng.random() * 0.6))
    for x, y, rr in blobs[::2]:
        v.E(x - rr * 0.25, y + rr * 0.28, rr * 0.45, fill=lighten(pal["leaf3"], 0.3), op=0.45)
    return blobs


def _trunk(v: V, x, y, h, w, bark, lean=0.0, flare=1.5, sw=7.0, top_w=0.55):
    """A tapering trunk with a flared root; returns the top centre."""
    tx = x + lean
    pts = [(x - w * flare, y), (x - w * 0.55, y + h * 0.22), (tx - w * top_w, y + h), (tx + w * top_w, y + h),
           (x + w * 0.55, y + h * 0.22), (x + w * flare, y)]
    v.S(pts, shade(v, bark), ol(bark), sw)
    for k in (0.28, 0.55, 0.78):
        v.L([(x - w * 0.2 + lean * k, y + h * k), (x + w * 0.1 + lean * k, y + h * k + 20)], darken(bark, 0.3), 4, 0.7)
    return tx, y + h


def _branch(v: V, x0, y0, x1, y1, w, bark):
    v.L([(x0, y0), ((x0 + x1) / 2 + (y1 - y0) * 0.1, (y0 + y1) / 2), (x1, y1)], ol(bark), w + 7)
    v.L([(x0, y0), ((x0 + x1) / 2 + (y1 - y0) * 0.1, (y0 + y1) / 2), (x1, y1)], bark, w)


# ---------------------------------------------------------------------------------------------- trees
def t_broadleaf(v, x, y, s, rng, pal, h=520, spread=1.0, lobes=11, trunk=44, fruit=None, blossom=None, glow=None, lean=0, flat=0.62):
    p = _P(pal)
    tx, ty = _trunk(v, x, y, h * 0.62 * s, trunk * s, p["bark"], lean * s)
    cy, r = y + h * 0.8 * s, 215 * spread * s
    _branch(v, tx, ty - 60 * s, tx - r * 0.55, cy - r * 0.1, 22 * s, p["bark"])
    _branch(v, tx, ty - 60 * s, tx + r * 0.55, cy - r * 0.05, 22 * s, p["bark"])
    if glow:
        v.glow(x, cy, r * 1.5, glow, 0.5)
    blobs = _lobes(v, tx, cy, r, p, rng, lobes, flat)
    for _ in range(int(lobes * 1.2) if fruit else 0):
        bx, by, br = blobs[rng.randrange(len(blobs))]
        px, py = bx + rng.uniform(-br, br) * 0.8, by + rng.uniform(-br, br) * 0.5
        for dx, dy in ((0, 0), (13 * s, -9 * s), (-11 * s, -10 * s)):
            v.E(px + dx, py + dy, 9 * s, fill=fruit, stroke=ol(fruit), sw=2)
            v.E(px + dx - 3 * s, py + dy + 3 * s, 2.6 * s, fill="#ffffff", op=0.7)
    if blossom:
        for _ in range(int(lobes * 5)):
            bx, by, br = blobs[rng.randrange(len(blobs))]
            v.E(bx + rng.uniform(-br, br) * 0.9, by + rng.uniform(-br, br) * 0.7, rng.uniform(5, 9) * s, fill=blossom, op=0.85)
        for _ in range(9):
            v.E(x + rng.uniform(-r, r) * 1.1, y + rng.uniform(-10, 24) * s, 6 * s, 3 * s, fill=blossom, op=0.8)
    if glow:
        for _ in range(16):
            bx, by, br = blobs[rng.randrange(len(blobs))]
            v.E(bx + rng.uniform(-br, br), by + rng.uniform(-br, br), rng.uniform(4, 7) * s, fill="#fffbd0")


def t_conifer(v, x, y, s, rng, pal, h=640, tiers=6, w=290, snow=False, droop=0.0, trunk=34):
    p = _P(pal, leaf="#2f7d4a", leaf2="#24633b", leaf3="#4a9a62")
    v.R(x - trunk * s / 2, y, trunk * s, h * 0.2 * s, shade(v, p["bark"]), ol(p["bark"]), 6)
    for i in range(tiers):
        k = i / max(1, tiers - 1)
        by = y + h * s * (0.12 + 0.76 * k)
        half = w * s * (1.0 - 0.72 * k) / 2 + 12 * s
        th = h * s * 0.28
        pts = [(x - half, by), (x - half * 0.6, by + th * 0.34 - droop * s), (x - half * 0.74, by + th * 0.3), (x - half * 0.3, by + th * 0.78),
               (x - half * 0.42, by + th * 0.74), (x, by + th), (x + half * 0.42, by + th * 0.74), (x + half * 0.3, by + th * 0.78),
               (x + half * 0.74, by + th * 0.3), (x + half * 0.6, by + th * 0.34 - droop * s), (x + half, by)]
        v.S(pts, shade(v, mix(p["leaf"], p["leaf3"], k * 0.5)), ol(p["leaf2"]), 6)
        if snow:
            v.S([(x - half * 0.8, by + 6 * s), (x - half * 0.3, by + th * 0.62), (x, by + th * 0.95), (x + half * 0.3, by + th * 0.62), (x + half * 0.8, by + 6 * s),
                 (x + half * 0.3, by + th * 0.36), (x - half * 0.3, by + th * 0.36)], "#f4f9ff", op=0.92)


def t_palm(v, x, y, s, rng, pal, h=620, fronds=9, lean=70, kind="coconut", frond_len=230):
    p = _P(pal, leaf="#3f9a4a", leaf2="#2f7a3a", leaf3="#5fb85a", bark="#9a7a4a")
    top = (x + lean * s, y + h * s)
    pts = [(x - 22 * s, y), (x + lean * 0.3 * s - 14 * s, y + h * 0.5 * s), (top[0] - 10 * s, top[1]),
           (top[0] + 10 * s, top[1]), (x + lean * 0.3 * s + 14 * s, y + h * 0.5 * s), (x + 22 * s, y)]
    v.S(pts, shade(v, p["bark"]), ol(p["bark"]), 7)
    for k in range(1, 9):
        t = k / 9
        cx = x + lean * s * (0.3 * t + 0.7 * t * t) * 0.9
        v.L([(cx - 16 * s * (1 - t * 0.5), y + h * s * t), (cx + 16 * s * (1 - t * 0.5), y + h * s * t + 8 * s)], darken(p["bark"], 0.35), 4, 0.7)
    if kind == "areca":
        frond_len, fronds = 170, 7
    for i in range(fronds):
        ang = math.pi * (0.06 + 0.88 * i / max(1, fronds - 1))
        ln = frond_len * s * (0.8 + 0.3 * math.sin(i * 1.7))
        dx, dy = math.cos(ang) * ln, math.sin(ang) * ln * 0.55
        droop = 70 * s
        ex, ey = top[0] + dx, top[1] + dy - droop * (abs(math.cos(ang)))
        mx, my = top[0] + dx * 0.55, top[1] + dy * 1.15
        wdt = 26 * s if kind != "date" else 18 * s
        leaf = [(top[0], top[1]), (mx, my + wdt), (ex, ey), (mx, my - wdt * 0.2)]
        v.S(leaf, shade(v, mix(p["leaf"], p["leaf3"], (i % 3) / 3)), ol(p["leaf2"]), 5)
        v.L([(top[0], top[1]), (mx, my + wdt * 0.3), (ex, ey)], darken(p["leaf2"], 0.2), 3, 0.8)
    if kind == "coconut":
        for dx in (-22, 4, 26):
            v.E(top[0] + dx * s, top[1] - 24 * s, 17 * s, fill=shade(v, "#6b8a2a"), stroke=ol("#6b8a2a"), sw=4)
    if kind == "date":
        for dx in (-26, 0, 24):
            v.E(top[0] + dx * s, top[1] - 28 * s, 11 * s, 18 * s, fill="#c97a1a", stroke=ol("#c97a1a"), sw=3)


def t_fanpalm(v, x, y, s, rng, pal, h=420):
    p = _P(pal, leaf="#4aa55a", leaf2="#2f7a3a", leaf3="#7acb6a")
    v.R(x - 16 * s, y, 32 * s, h * s, shade(v, p["bark"]), ol(p["bark"]), 6, rx=10 * s)
    cy = y + h * s
    for i in range(11):
        a = math.pi * (0.04 + 0.92 * i / 10)
        ln = 210 * s
        v.S([(x, cy), (x + math.cos(a - 0.14) * ln, cy + math.sin(a - 0.14) * ln * 0.8), (x + math.cos(a) * ln * 1.08, cy + math.sin(a) * ln * 0.86),
             (x + math.cos(a + 0.14) * ln, cy + math.sin(a + 0.14) * ln * 0.8)], shade(v, mix(p["leaf"], p["leaf3"], i / 14)), ol(p["leaf2"]), 4)


def t_bamboo(v, x, y, s, rng, pal, culms=5, h=720, col="#6fbf52"):
    p = _P(pal, leaf="#5fae4e", leaf2="#3f8a3c", leaf3="#8ad06a")
    for i in range(culms):
        cx = x + (i - (culms - 1) / 2) * 46 * s + rng.uniform(-10, 10) * s
        ch = h * s * rng.uniform(0.72, 1.0)
        lean = rng.uniform(-30, 30) * s
        v.L([(cx, y), (cx + lean * 0.4, y + ch * 0.5), (cx + lean, y + ch)], ol(col), 26 * s)
        v.L([(cx, y), (cx + lean * 0.4, y + ch * 0.5), (cx + lean, y + ch)], col, 17 * s)
        for k in range(1, 8):
            t = k / 8
            nx = cx + lean * (0.8 * t * t + 0.2 * t)
            v.R(nx - 12 * s, y + ch * t - 3 * s, 24 * s, 7 * s, darken(col, 0.25), None, 0, rx=3)
            if k > 3 and k % 2 == 0:
                for sgn in (-1, 1):
                    v.S([(nx, y + ch * t), (nx + sgn * 60 * s, y + ch * t + 16 * s), (nx + sgn * 120 * s, y + ch * t - 8 * s), (nx + sgn * 62 * s, y + ch * t + 30 * s)],
                        shade(v, mix(p["leaf"], p["leaf3"], rng.random())), ol(p["leaf2"]), 3)


def t_willow(v, x, y, s, rng, pal, h=520):
    p = _P(pal, leaf="#7fc46a", leaf2="#4f9a4a", leaf3="#a6dc84")
    tx, ty = _trunk(v, x, y, h * 0.6 * s, 50 * s, p["bark"], 20 * s)
    cy = y + h * 0.82 * s
    v.E(tx, cy, 190 * s, 110 * s, fill=shade(v, p["leaf"]), stroke=ol(p["leaf2"]), sw=6)
    for i in range(26):
        sx = tx + (i - 12.5) * 14 * s
        ln = rng.uniform(190, 300) * s * (1 - abs(i - 12.5) / 26)
        v.L([(sx, cy - 30 * s), (sx + rng.uniform(-14, 14) * s, cy - ln * 0.5), (sx + rng.uniform(-18, 18) * s, cy - ln)], ol(p["leaf2"]), 9 * s)
        v.L([(sx, cy - 30 * s), (sx + rng.uniform(-14, 14) * s, cy - ln * 0.5), (sx + rng.uniform(-18, 18) * s, cy - ln)], mix(p["leaf"], p["leaf3"], rng.random()), 6 * s)


def t_acacia(v, x, y, s, rng, pal, h=520, width=420, thorn=False):
    p = _P(pal, leaf="#6aa84a" if not thorn else "#8a9a4a", leaf2="#4f8a3a" if not thorn else "#6a7a3a", leaf3="#93c564")
    top = y + h * s
    v.L([(x, y), (x + 10 * s, y + h * 0.4 * s), (x - 20 * s, top - 40 * s)], ol(p["bark"]), 38 * s)
    v.L([(x, y), (x + 10 * s, y + h * 0.4 * s), (x - 20 * s, top - 40 * s)], p["bark"], 28 * s)
    v.L([(x, y + h * 0.45 * s), (x + 150 * s, top - 20 * s)], p["bark"], 14 * s)
    for dx, dy, wd in ((-width * 0.28, 0, 0.55), (0, 24, 0.7), (width * 0.3, -6, 0.5), (width * 0.05, 52, 0.4)):
        v.E(x + dx * s, top + dy * s, width * wd * s / 2 * 1.4, 46 * s, fill=shade(v, mix(p["leaf"], p["leaf3"], 0.3)), stroke=ol(p["leaf2"]), sw=6)
    if thorn:
        for _ in range(8):
            v.L([(x + rng.uniform(-90, 90) * s, top - 30 * s), (x + rng.uniform(-120, 120) * s, top - 70 * s)], "#d8d0b0", 3, 0.9, smooth=False)


def t_banana(v, x, y, s, rng, pal, h=330):
    p = _P(pal, leaf="#5fb04a", leaf2="#3f8a3a", leaf3="#8ad06a")
    v.R(x - 18 * s, y, 36 * s, h * 0.7 * s, shade(v, "#a8b86a"), ol("#a8b86a"), 6, rx=14 * s)
    top = y + h * 0.7 * s
    for i in range(7):
        a = math.pi * (0.1 + 0.8 * i / 6)
        ln = 250 * s
        ex, ey = x + math.cos(a) * ln, top + math.sin(a) * ln * 0.55 - 60 * s * abs(math.cos(a))
        v.S([(x, top), (x + math.cos(a) * ln * 0.5, top + math.sin(a) * ln * 0.4 + 36 * s), (ex, ey), (x + math.cos(a) * ln * 0.5, top + math.sin(a) * ln * 0.55 - 10 * s)],
            shade(v, mix(p["leaf"], p["leaf3"], i / 9)), ol(p["leaf2"]), 5)
        v.L([(x, top), (ex, ey)], darken(p["leaf2"], 0.25), 3, 0.8, smooth=False)
    v.L([(x + 8 * s, top - 8 * s), (x + 60 * s, top - 90 * s)], "#7a8a3a", 6)
    for k in range(5):
        v.E(x + 58 * s + k * 5 * s, top - 96 * s - k * 12 * s, 14 * s, 22 * s, fill="#f2cf3a", stroke=ol("#f2cf3a"), sw=3, rot=-20)


def t_dead(v, x, y, s, rng, pal, h=520, kind="gnarled", hollow=False):
    bark = pal.get("bark") or ("#4a3a30" if kind in ("gnarled", "haunted") else "#6b5a4a")
    base = 46 if kind in ("gnarled", "haunted") else 28

    def limb(px, py, ang, ln, w, depth):
        ex, ey = px + math.cos(ang) * ln, py + math.sin(ang) * ln
        mx, my = (px + ex) / 2 + rng.uniform(-18, 18) * s, (py + ey) / 2 + rng.uniform(-10, 10) * s
        v.L([(px, py), (mx, my), (ex, ey)], ol(bark), (w + 6) * s)
        v.L([(px, py), (mx, my), (ex, ey)], bark, w * s)
        if depth > 0:
            for da in (-0.55, 0.5) if kind != "haunted" else (-0.8, 0.7, 0.05):
                limb(ex, ey, ang + da + rng.uniform(-0.2, 0.2), ln * rng.uniform(0.62, 0.78), max(4, w * 0.62), depth - 1)

    v.S([(x - base * 1.8 * s, y), (x - base * 0.7 * s, y + h * 0.25 * s), (x - base * 0.5 * s, y + h * 0.5 * s), (x + base * 0.5 * s, y + h * 0.5 * s),
         (x + base * 0.7 * s, y + h * 0.25 * s), (x + base * 1.8 * s, y)], shade(v, bark), ol(bark), 7)
    if hollow:
        v.E(x, y + h * 0.22 * s, 30 * s, 52 * s, fill="#1a1410", stroke=ol(bark), sw=5)
        v.E(x - 9 * s, y + h * 0.24 * s, 4 * s, 4 * s, fill="#ffd84a")
        v.E(x + 9 * s, y + h * 0.24 * s, 4 * s, 4 * s, fill="#ffd84a")
    top = y + h * 0.5 * s
    limb(x, top, math.pi / 2 + 0.05, h * 0.3 * s, base * 0.7, 3)
    limb(x, top - 20 * s, math.pi / 2 + 0.7, h * 0.28 * s, base * 0.5, 3)
    limb(x, top - 20 * s, math.pi / 2 - 0.75, h * 0.28 * s, base * 0.5, 3)


def t_banyan(v, x, y, s, rng, pal, width=720, roots=9, ancient=False):
    p = _P(pal, leaf="#3f8a45", leaf2="#2f6a38", leaf3="#5fae58")
    cy = y + (470 if not ancient else 560) * s
    for i in range(roots):
        rx = x + (i - (roots - 1) / 2) * (width * 0.9 / roots) * s + rng.uniform(-14, 14) * s
        w = rng.uniform(16, 30) * s * (1.5 if abs(i - roots // 2) < 1 else 1)
        v.L([(rx, cy - 40 * s), (rx + rng.uniform(-10, 10) * s, y + (cy - y) * 0.5), (rx, y)], ol(p["bark"]), w + 7)
        v.L([(rx, cy - 40 * s), (rx + rng.uniform(-10, 10) * s, y + (cy - y) * 0.5), (rx, y)], p["bark"], w)
    v.S([(x - 70 * s, y), (x - 44 * s, y + 200 * s), (x - 30 * s, cy - 60 * s), (x + 30 * s, cy - 60 * s), (x + 44 * s, y + 200 * s), (x + 70 * s, y)],
        shade(v, p["bark"]), ol(p["bark"]), 7)
    _lobes(v, x, cy + 90 * s, width * 0.5 * s, p, rng, 16 if not ancient else 20, 0.42)


def t_poplar(v, x, y, s, rng, pal, h=640):
    p = _P(pal, leaf="#5aa84a", leaf2="#3f8a3c", leaf3="#8ad06a")
    v.R(x - 14 * s, y, 28 * s, h * 0.3 * s, shade(v, p["bark"]), ol(p["bark"]), 6)
    blobs = []
    for i in range(9):
        k = i / 8
        r = (96 - 38 * abs(k - 0.4)) * s
        blobs.append((x + rng.uniform(-14, 14) * s, y + h * s * (0.22 + 0.74 * k), r))
    for bx, by, br in blobs:
        v.E(bx, by, br, br * 1.08, stroke=ol(p["leaf2"]), sw=7)
    for i, (bx, by, br) in enumerate(blobs):
        v.E(bx, by, br, br * 1.08, fill=shade(v, mix(p["leaf"], p["leaf3"], i / 12)))


def t_baobab(v, x, y, s, rng, pal, h=500):
    p = _P(pal, leaf="#7ab04a", leaf2="#5a8a3a", leaf3="#9ccb64", bark="#9a7a5a")
    v.S([(x - 130 * s, y), (x - 96 * s, y + h * 0.35 * s), (x - 70 * s, y + h * 0.78 * s), (x + 70 * s, y + h * 0.78 * s), (x + 96 * s, y + h * 0.35 * s), (x + 130 * s, y)],
        shade(v, p["bark"]), ol(p["bark"]), 7)
    top = y + h * 0.78 * s
    for dx, ang in ((-90, 2.3), (-20, 1.8), (60, 1.2), (110, 0.8)):
        ex, ey = x + dx * s + math.cos(ang) * 120 * s, top + math.sin(ang) * 130 * s
        v.L([(x + dx * 0.4 * s, top), (ex, ey)], ol(p["bark"]), 30 * s)
        v.L([(x + dx * 0.4 * s, top), (ex, ey)], p["bark"], 22 * s)
        for _ in range(3):
            v.E(ex + rng.uniform(-30, 30) * s, ey + rng.uniform(0, 30) * s, rng.uniform(30, 44) * s, fill=shade(v, p["leaf"]), stroke=ol(p["leaf2"]), sw=5)


def _reg_trees():
    T = "tree"
    reg = lambda cid, name, fn, tags, pal=None, **kw: register(T, cid, name, fn, pal, tags, **kw)
    reg("tree-oak", "Oak-like broadleaf tree", t_broadleaf, ["tree", "forest"])
    reg("tree-mango", "Mango tree with fruit", t_broadleaf, ["tree", "mango", "orchard", "fruit"], {"leaf": "#3a8a3f", "leaf2": "#2a6a32", "leaf3": "#5aa850"}, fruit="#f0a020", spread=1.05)
    reg("tree-jamun", "Jamun tree with berries", t_broadleaf, ["tree", "jamun", "fruit"], {"leaf": "#3f9a4a", "leaf2": "#2f7a3a"}, fruit="#4b2a78", lobes=13)
    reg("tree-neem", "Neem tree", t_broadleaf, ["tree", "neem", "village"], {"leaf": "#6bb85a", "leaf2": "#4a9a45", "leaf3": "#9ad57c"}, lobes=15, spread=0.95, h=470)
    reg("tree-peepal", "Peepal tree", t_broadleaf, ["tree", "peepal", "sacred", "temple"], {"leaf": "#58a848", "leaf2": "#3f8a3a"}, spread=1.25, h=480, trunk=34, flat=0.5, lobes=13)
    reg("tree-blossom", "Flowering blossom tree", t_broadleaf, ["tree", "flowering", "spring", "garden"], {"leaf": "#f1a9c0", "leaf2": "#d97a9c", "leaf3": "#fbd5e0", "bark": "#7a4a3a"}, blossom="#ffe4ee", spread=1.0, h=440)
    reg("tree-autumn", "Autumn maple", t_broadleaf, ["tree", "autumn"], {"leaf": "#d9702a", "leaf2": "#b4521c", "leaf3": "#f0a23a"}, lobes=12)
    reg("tree-magic", "Glowing magical tree", t_broadleaf, ["tree", "magic", "enchanted"], {"leaf": "#4fc2b0", "leaf2": "#2f8a8c", "leaf3": "#8fe8d6", "bark": "#5a4a7a"}, glow="#b6fff0", spread=1.1)
    reg("tree-pine", "Pine tree", t_conifer, ["tree", "pine", "mountain"], tiers=6)
    reg("tree-deodar", "Deodar cedar", t_conifer, ["tree", "deodar", "himalaya", "mountain"], {"leaf": "#3a7a50", "leaf2": "#2a5e3c"}, tiers=7, w=350, droop=18, h=700)
    reg("tree-fir-tall", "Tall narrow fir", t_conifer, ["tree", "fir", "mountain"], {"leaf": "#2a6a48", "leaf2": "#1f4e36"}, tiers=9, w=200, h=780)
    reg("tree-pine-snow", "Snow-covered pine", t_conifer, ["tree", "pine", "snow", "winter"], {"leaf": "#3a7a58"}, tiers=6, snow=True, w=310)
    reg("tree-coconut", "Coconut palm", t_palm, ["tree", "palm", "coconut", "coast"], kind="coconut")
    reg("tree-date", "Date palm", t_palm, ["tree", "palm", "date", "desert", "oasis"], {"leaf": "#6aa84a", "leaf2": "#4a8a3a"}, kind="date", h=520, lean=40, fronds=11)
    reg("tree-areca", "Slender areca palm", t_palm, ["tree", "palm", "village"], {"bark": "#b8a878"}, kind="areca", h=700, lean=26, fronds=7)
    reg("tree-fanpalm", "Fan palm", t_fanpalm, ["tree", "palm", "tropical"])
    reg("tree-bamboo", "Green bamboo clump", t_bamboo, ["tree", "bamboo", "forest"])
    reg("tree-bamboo-gold", "Golden bamboo clump", t_bamboo, ["tree", "bamboo"], {"leaf": "#9ac94a", "leaf2": "#6a9a3a"}, col="#d8b640", culms=6, h=640)
    reg("tree-willow", "Weeping willow", t_willow, ["tree", "willow", "riverside", "pond"])
    reg("tree-acacia", "Flat-topped acacia", t_acacia, ["tree", "acacia", "savanna", "desert"])
    reg("tree-babul", "Thorny babul", t_acacia, ["tree", "babul", "thorn", "desert", "dry"], {"bark": "#6b4a2a"}, thorn=True, h=400, width=300)
    reg("tree-banana", "Banana plant", t_banana, ["tree", "banana", "village", "tropical"])
    reg("tree-gnarled", "Gnarled dead tree", t_dead, ["tree", "dead", "haunted"], kind="gnarled")
    reg("tree-bare", "Bare winter tree", t_dead, ["tree", "bare", "winter", "dry"], kind="bare", h=560)
    reg("tree-hollow", "Hollow tree with glowing eyes", t_dead, ["tree", "haunted", "hollow", "magic"], kind="haunted", hollow=True)
    reg("tree-haunted", "Twisted haunted tree", t_dead, ["tree", "haunted"], {"bark": "#3a2a3a"}, kind="haunted", h=600)
    reg("tree-banyan", "Banyan tree", t_banyan, ["tree", "banyan", "village", "sacred"], roots=8)
    reg("tree-banyan-ancient", "Ancient banyan", t_banyan, ["tree", "banyan", "ancient", "forest"], {"leaf": "#2f7a3a", "leaf2": "#245a2c"}, ancient=True, roots=11, width=900)
    reg("tree-poplar", "Tall poplar", t_poplar, ["tree", "poplar", "garden"])
    reg("tree-baobab", "Baobab", t_baobab, ["tree", "baobab", "savanna", "desert"])


# --------------------------------------------------------------------------------------------- bushes
def b_round(v, x, y, s, rng, pal, r=96, n=7, berry=None, flower=None, snow=False, glow=None, width=1.3):
    p = _P(pal)
    if glow:
        v.glow(x, y + r * 0.6 * s, r * 1.9 * s, glow, 0.5)
    blobs = [(x + rng.uniform(-r, r) * width * 0.8 * s, y + r * 0.55 * s + rng.uniform(-0.2, 0.4) * r * s, rng.uniform(0.5, 0.78) * r * s) for _ in range(n)]
    for bx, by, br in blobs:
        v.E(bx, by, br, stroke=ol(p["leaf2"]), sw=7)
    for i, (bx, by, br) in enumerate(blobs):
        v.E(bx, by, br, fill=shade(v, mix(p["leaf"], p["leaf3"], rng.random() * 0.7)))
    for _ in range(n * 2 if berry else 0):
        bx, by, br = blobs[rng.randrange(n)]
        v.E(bx + rng.uniform(-br, br) * 0.7, by + rng.uniform(-br, br) * 0.6, 7 * s, fill=berry, stroke=ol(berry), sw=2)
    for _ in range(n * 2 if flower else 0):
        bx, by, br = blobs[rng.randrange(n)]
        fx, fy = bx + rng.uniform(-br, br) * 0.8, by + rng.uniform(-br, br) * 0.6
        for k in range(5):
            a = k * 1.2566
            v.E(fx + math.cos(a) * 6 * s, fy + math.sin(a) * 6 * s, 5 * s, fill=flower)
        v.E(fx, fy, 3.4 * s, fill="#ffd84a")
    if snow:
        for bx, by, br in blobs:
            v.E(bx, by + br * 0.5, br * 0.78, br * 0.4, fill="#f4f9ff", op=0.95)


def b_fern(v, x, y, s, rng, pal, n=11, ln=200):
    p = _P(pal, leaf="#4aa550", leaf2="#2f7a3a", leaf3="#7acb6a")
    for i in range(n):
        a = math.pi * (0.1 + 0.8 * i / (n - 1))
        ex, ey = x + math.cos(a) * ln * s, y + math.sin(a) * ln * s * 0.9
        v.L([(x, y), ((x + ex) / 2, y + (ey - y) * 0.7 + 30 * s), (ex, ey)], ol(p["leaf2"]), 8 * s)
        for k in range(1, 9):
            t = k / 9
            px, py = x + (ex - x) * t, y + (ey - y) * (0.7 * t + 0.3 * t * t) + 30 * s * (t - t * t) * 2
            sz = (1 - t) * 38 * s + 8 * s
            for sgn in (-1, 1):
                v.L([(px, py), (px + sgn * sz * 0.8, py - sz * 0.3)], mix(p["leaf"], p["leaf3"], t), 7 * s, 0.95, smooth=False)


def b_cactus(v, x, y, s, rng, pal, kind="saguaro"):
    c = pal.get("leaf") or "#5fa060"
    if kind == "saguaro":
        v.R(x - 28 * s, y, 56 * s, 300 * s, shade(v, c), ol(c), 6, rx=26 * s)
        for sgn, hh in ((-1, 150), (1, 200)):
            v.S([(x + sgn * 28 * s, y + hh * s), (x + sgn * 80 * s, y + hh * s), (x + sgn * 80 * s, y + (hh + 90) * s), (x + sgn * 56 * s, y + (hh + 110) * s),
                 (x + sgn * 54 * s, y + (hh + 24) * s), (x + sgn * 28 * s, y + (hh - 24) * s)], shade(v, c), ol(c), 6)
        for k in range(8):
            v.L([(x - 8 * s, y + (30 + k * 32) * s), (x - 8 * s, y + (46 + k * 32) * s)], lighten(c, 0.5), 3, 0.7, smooth=False)
    else:
        for i, (dx, dy, r) in enumerate(((0, 40, 54), (-44, 120, 44), (46, 130, 40), (6, 190, 36))):
            v.E(x + dx * s, y + dy * s, r * s, r * 0.82 * s, fill=shade(v, c), stroke=ol(c), sw=6, rot=rng.uniform(-14, 14))
            for _ in range(5):
                v.E(x + (dx + rng.uniform(-r, r) * 0.6) * s, y + (dy + rng.uniform(-r, r) * 0.5) * s, 2.5 * s, fill="#f4e8c0")
        v.E(x + 6 * s, y + 232 * s, 14 * s, fill="#e0457a", stroke=ol("#e0457a"), sw=3)


def b_agave(v, x, y, s, rng, pal, n=13):
    c = pal.get("leaf") or "#6fa89a"
    for i in range(n):
        a = math.pi * (0.1 + 0.8 * i / (n - 1))
        ln = 170 * s * (0.75 + 0.3 * math.sin(i * 2))
        ex, ey = x + math.cos(a) * ln, y + 14 * s + math.sin(a) * ln
        v.S([(x - 18 * s, y), (x + math.cos(a) * ln * 0.5 - 22 * s * math.sin(a), y + math.sin(a) * ln * 0.5), (ex, ey),
             (x + math.cos(a) * ln * 0.5 + 22 * s * math.sin(a), y + math.sin(a) * ln * 0.5), (x + 18 * s, y)], shade(v, mix(c, "#9ad0bc", i / (2 * n))), ol(c), 4)


def b_tulsi(v, x, y, s, rng, pal):
    v.S([(x - 46 * s, y + 110 * s), (x - 56 * s, y + 70 * s), (x - 36 * s, y), (x + 36 * s, y), (x + 56 * s, y + 70 * s), (x + 46 * s, y + 110 * s)],
        shade(v, "#c9783c"), ol("#c9783c"), 6)
    v.R(x - 52 * s, y + 100 * s, 104 * s, 18 * s, shade(v, "#d98a4a"), ol("#d98a4a"), 5, rx=8)
    b_round(v, x, y + 112 * s, s * 0.8, rng, {"leaf": "#4aa850", "leaf2": "#2f7a3a", "leaf3": "#7acb6a"}, r=70, n=6, width=0.9)


def b_pampas(v, x, y, s, rng, pal):
    for i in range(16):
        a = math.pi * (0.28 + 0.44 * i / 15)
        ex, ey = x + math.cos(a) * 190 * s + rng.uniform(-14, 14) * s, y + math.sin(a) * 230 * s
        v.L([(x, y), ((x + ex) / 2, y + (ey - y) * 0.6), (ex, ey)], mix("#c8b46a", "#e8dca0", rng.random()), 5 * s, 0.95)
    for i in range(5):
        px, py = x + (i - 2) * 38 * s, y + 220 * s + rng.uniform(0, 70) * s
        v.E(px, py, 18 * s, 56 * s, fill="#f0e8d0", stroke=ol("#f0e8d0", 0.3), sw=3, rot=rng.uniform(-18, 18))


def b_hedge(v, x, y, s, rng, pal, w=420, h=150):
    p = _P(pal, leaf="#3f8a45", leaf2="#2a6a32", leaf3="#5fae58")
    v.R(x - w * s / 2, y, w * s, h * s, shade(v, p["leaf"]), ol(p["leaf2"]), 6, rx=34 * s)
    for _ in range(int(w / 26)):
        v.E(x + rng.uniform(-w / 2.1, w / 2.1) * s, y + rng.uniform(20, h - 12) * s, rng.uniform(9, 15) * s, fill=p["leaf3"], op=0.55)


def _reg_bushes():
    B = "bush"
    reg = lambda cid, name, fn, tags, pal=None, **kw: register(B, cid, name, fn, pal, tags, **kw)
    reg("bush-round", "Round green bush", b_round, ["bush"])
    reg("bush-dark", "Dark leafy shrub", b_round, ["bush", "forest"], {"leaf": "#2f7a3a", "leaf2": "#1f5a2a", "leaf3": "#4a9a48"}, n=8, r=110)
    reg("bush-berry-red", "Red berry bush", b_round, ["bush", "berry"], berry="#d8342a")
    reg("bush-berry-blue", "Blue berry bush", b_round, ["bush", "berry"], {"leaf": "#3f9a4a"}, berry="#3a5fc0", n=8)
    reg("bush-hibiscus", "Hibiscus bush", b_round, ["bush", "flowering", "garden"], flower="#e03a4a")
    reg("bush-jasmine", "Jasmine bush", b_round, ["bush", "flowering", "garden"], {"leaf": "#4aa550"}, flower="#ffffff", n=8)
    reg("bush-rose", "Rose bush", b_round, ["bush", "flowering", "garden", "palace"], {"leaf": "#3a8a45", "leaf2": "#2a6a32"}, flower="#e8587a", r=84)
    reg("bush-lantana", "Lantana bush", b_round, ["bush", "flowering"], flower="#f09030", n=6)
    reg("bush-hydrangea", "Hydrangea bush", b_round, ["bush", "flowering"], flower="#7a8cf0", r=104)
    reg("bush-dry", "Dry thorny scrub", b_round, ["bush", "dry", "desert"], {"leaf": "#a89a58", "leaf2": "#7a6a3a", "leaf3": "#c8ba78"}, n=6, r=88, width=1.5)
    reg("bush-snow", "Snow-covered bush", b_round, ["bush", "snow", "winter"], {"leaf": "#4a8a5a"}, snow=True)
    reg("bush-magic", "Glowing magic bush", b_round, ["bush", "magic"], {"leaf": "#5fd0c0", "leaf2": "#2f8a9a", "leaf3": "#a8f0e0"}, glow="#b6fff0", flower="#fff6a8")
    reg("bush-fern", "Fern", b_fern, ["bush", "fern", "forest"])
    reg("bush-fern-small", "Small fern", b_fern, ["bush", "fern"], {"leaf": "#5fb860"}, n=8, ln=130)
    reg("bush-cactus", "Saguaro cactus", b_cactus, ["bush", "cactus", "desert"], kind="saguaro")
    reg("bush-prickly-pear", "Prickly pear", b_cactus, ["bush", "cactus", "desert"], kind="pear")
    reg("bush-agave", "Agave", b_agave, ["bush", "desert", "dry"])
    reg("bush-tulsi", "Tulsi plant in a pot", b_tulsi, ["bush", "tulsi", "village", "temple", "house"])
    reg("bush-pampas", "Pampas grass", b_pampas, ["bush", "grass", "riverside", "marsh"])
    reg("bush-hedge", "Clipped hedge", b_hedge, ["bush", "hedge", "garden", "palace"])


# -------------------------------------------------------------------------------------------- flowers
def f_flower(v, x, y, s, rng, pal, petals=8, pr=26, pl=44, col="#ffffff", centre="#f2c230", stem=150, kind="daisy", leaf_col="#4aa550"):
    v.L([(x, y), (x + rng.uniform(-10, 10) * s, y + stem * 0.5 * s), (x, y + stem * s)], "#2f7a3a", 7 * s)
    v.S([(x, y + stem * 0.25 * s), (x + 44 * s, y + stem * 0.36 * s), (x + 4 * s, y + stem * 0.3 * s)], leaf_col, ol(leaf_col), 3)
    cx, cy = x, y + stem * s
    if kind == "tulip":
        v.S([(cx - 24 * s, cy), (cx - 28 * s, cy + 50 * s), (cx, cy + 66 * s), (cx + 28 * s, cy + 50 * s), (cx + 24 * s, cy)], shade(v, col), ol(col), 4)
        v.P([(cx - 26 * s, cy + 52 * s), (cx - 14 * s, cy + 74 * s), (cx, cy + 54 * s), (cx + 14 * s, cy + 74 * s), (cx + 26 * s, cy + 52 * s), (cx, cy + 40 * s)], col, ol(col), 3)
        return
    if kind == "bell":
        for k in range(3):
            v.S([(cx + k * 14 * s - 14 * s, cy - k * 36 * s), (cx + k * 14 * s - 22 * s, cy - k * 36 * s - 42 * s), (cx + k * 14 * s + 2 * s, cy - k * 36 * s - 48 * s), (cx + k * 14 * s + 10 * s, cy - k * 36 * s - 4 * s)], shade(v, col), ol(col), 3)
        return
    if kind == "lavender":
        for k in range(12):
            v.E(cx + (k % 2) * 6 * s - 3 * s, cy - 36 * s + k * 12 * s, 7 * s, 11 * s, fill=col, stroke=ol(col), sw=2)
        return
    for k in range(petals):
        a = k * math.tau / petals
        v.E(cx + math.cos(a) * pr * s, cy + math.sin(a) * pr * s, pl * s / 2, pl * s / 3.4, fill=shade(v, col), stroke=ol(col), sw=3, rot=math.degrees(a))
    v.E(cx, cy, pr * 0.62 * s, fill=shade(v, centre), stroke=ol(centre), sw=3)


def f_lotus(v, x, y, s, rng, pal, bud=False, open_=1.0):
    pink = pal.get("leaf") or "#f5a8c8"
    v.L([(x, y), (x + 4 * s, y + 120 * s)], "#3f8a3c", 8 * s)
    cx, cy = x, y + 124 * s
    n = 9 if not bud else 5
    for k in range(n):
        a = math.pi * (0.08 + 0.84 * k / (n - 1))
        ln = 70 * s * (1.0 if not bud else 0.75)
        w = 26 * s * (1 if not bud else 0.8)
        spread = 1.0 if not bud else 0.28
        ex, ey = cx + math.cos(a) * ln * spread * 1.4, cy + math.sin(a) * ln
        v.S([(cx, cy - 6 * s), (cx + math.cos(a) * ln * 0.5 * spread * 1.4 - w * 0.5, cy + math.sin(a) * ln * 0.5), (ex, ey), (cx + math.cos(a) * ln * 0.5 * spread * 1.4 + w * 0.5, cy + math.sin(a) * ln * 0.5)],
            shade(v, mix(pink, "#ffe8f0", k / (2 * n))), ol(pink), 3)
    if not bud:
        v.E(cx, cy + 10 * s, 14 * s, 8 * s, fill="#f2c230")


def f_patch(v, x, y, s, rng, pal, cols=("#f2c230", "#ffffff", "#e8587a", "#7a8cf0"), n=7, stem=70):
    for i in range(n):
        fx = x + (i - (n - 1) / 2) * 24 * s + rng.uniform(-8, 8) * s
        sh = stem * rng.uniform(0.7, 1.3) * s
        col = cols[rng.randrange(len(cols))]
        v.L([(fx, y), (fx + rng.uniform(-6, 6) * s, y + sh)], "#3f8a3c", 5 * s)
        for k in range(5):
            a = k * 1.2566
            v.E(fx + math.cos(a) * 8 * s, y + sh + math.sin(a) * 8 * s, 7 * s, fill=col, stroke=ol(col), sw=2)
        v.E(fx, y + sh, 4.4 * s, fill="#ffd84a")


def f_dandelion(v, x, y, s, rng, pal):
    v.L([(x, y), (x + 8 * s, y + 90 * s), (x, y + 150 * s)], "#3f8a3c", 5 * s)
    for k in range(26):
        a = k * math.tau / 26
        v.L([(x, y + 150 * s), (x + math.cos(a) * 40 * s, y + 150 * s + math.sin(a) * 40 * s)], "#f4f4ee", 2.5 * s, 0.95, smooth=False)
        v.E(x + math.cos(a) * 42 * s, y + 150 * s + math.sin(a) * 42 * s, 3.5 * s, fill="#ffffff", stroke="#d8d8d0", sw=1)


def f_waterlily(v, x, y, s, rng, pal):
    v.E(x, y, 110 * s, 34 * s, fill=shade(v, "#4aa84a"), stroke=ol("#3a8a3a"), sw=5)
    v.P([(x, y), (x + 108 * s, y + 8 * s), (x + 100 * s, y - 10 * s)], "#5fbfe0", None, 0, 0.0)
    for k in range(7):
        a = math.pi * (0.1 + 0.8 * k / 6)
        v.E(x + math.cos(a) * 26 * s * 0.9, y + 10 * s + math.sin(a) * 26 * s, 13 * s, 24 * s, fill="#fff0f6", stroke=ol("#f5a8c8", 0.3), sw=3, rot=math.degrees(a) - 90)


def _reg_flowers():
    F = "flower"
    reg = lambda cid, name, fn, tags, pal=None, **kw: register(F, cid, name, fn, pal, tags, **kw)
    reg("flower-daisy", "Daisy", f_flower, ["flower", "meadow"], petals=11, col="#ffffff", centre="#f2c230")
    reg("flower-marigold", "Marigold", f_flower, ["flower", "marigold", "temple", "festival"], petals=14, pr=20, pl=34, col="#f5a020", centre="#d8801a")
    reg("flower-sunflower", "Sunflower", f_flower, ["flower", "farm"], petals=16, pr=34, pl=48, col="#f6c320", centre="#6b4a1a", stem=220)
    reg("flower-rose", "Rose", f_flower, ["flower", "garden", "palace"], petals=7, pr=16, pl=38, col="#d83a58", centre="#a82040")
    reg("flower-hibiscus", "Hibiscus", f_flower, ["flower", "garden"], petals=5, pr=24, pl=56, col="#e8383a", centre="#f2c230")
    reg("flower-jasmine", "Jasmine", f_flower, ["flower", "garden", "festival"], petals=6, pr=14, pl=32, col="#fffaf0", centre="#f2e8a0", stem=110)
    reg("flower-tulip", "Tulip", f_flower, ["flower", "garden"], kind="tulip", col="#e8486a")
    reg("flower-bluebell", "Bluebell", f_flower, ["flower", "meadow", "forest"], kind="bell", col="#6a7cf0")
    reg("flower-lavender", "Lavender", f_flower, ["flower", "meadow"], kind="lavender", col="#9a7ad8", stem=170)
    reg("flower-poppy", "Poppy", f_flower, ["flower", "meadow", "farm"], petals=5, pr=22, pl=50, col="#e8382a", centre="#2a1a1a")
    reg("flower-buttercup", "Buttercup", f_flower, ["flower", "meadow"], petals=5, pr=14, pl=30, col="#f6d83a", stem=100)
    reg("flower-orchid", "Orchid", f_flower, ["flower", "forest", "tropical"], petals=5, pr=18, pl=50, col="#c870d8", centre="#f2e070")
    reg("flower-lily", "Lily", f_flower, ["flower", "garden"], petals=6, pr=22, pl=60, col="#fff0e8", centre="#f0a030", stem=190)
    reg("flower-chrysanthemum", "Chrysanthemum", f_flower, ["flower", "garden", "autumn"], petals=18, pr=22, pl=30, col="#f2b0c8", centre="#f2c230")
    reg("flower-morning-glory", "Morning glory", f_flower, ["flower", "village", "fence"], petals=5, pr=20, pl=48, col="#8a7af0", centre="#ffffff", stem=120)
    reg("flower-lotus", "Lotus bloom", f_lotus, ["flower", "lotus", "lake", "temple", "pond"])
    reg("flower-lotus-bud", "Lotus bud", f_lotus, ["flower", "lotus", "lake", "pond"], bud=True)
    reg("flower-waterlily", "Water lily on a pad", f_waterlily, ["flower", "pond", "lake"])
    reg("flower-patch", "Wildflower patch", f_patch, ["flower", "meadow", "forest"])
    reg("flower-dandelion", "Dandelion clock", f_dandelion, ["flower", "meadow"])


# ---------------------------------------------------------------------------------------------- grass
def g_tuft(v, x, y, s, rng, pal, n=7, h=60, col=None, lean=24):
    c = col or pal.get("leaf") or "#3f8a3c"
    for i in range(n):
        dx = (i - (n - 1) / 2) * 9 * s
        hh = h * s * rng.uniform(0.6, 1.2)
        v.L([(x + dx, y), (x + dx + rng.uniform(-lean, lean) * s * 0.4, y + hh * 0.5), (x + dx + rng.uniform(-lean, lean) * s, y + hh)], mix(c, lighten(c, 0.35), i / n), 5 * s, 0.95)


def g_wheat(v, x, y, s, rng, pal, n=9, h=190, col="#d8b64a"):
    for i in range(n):
        dx = (i - (n - 1) / 2) * 16 * s + rng.uniform(-5, 5) * s
        hh = h * s * rng.uniform(0.8, 1.1)
        top = (x + dx + rng.uniform(-14, 14) * s, y + hh)
        v.L([(x + dx, y), (x + dx, y + hh * 0.5), top], "#c8a84a", 4 * s)
        for k in range(6):
            v.E(top[0] + (k % 2 * 2 - 1) * 4 * s, top[1] - k * 9 * s + 10 * s, 5 * s, 9 * s, fill=col, stroke=ol(col, 0.4), sw=1.5, rot=(k % 2 * 2 - 1) * 20)


def g_paddy(v, x, y, s, rng, pal):
    for row in range(3):
        for i in range(9):
            g_tuft(v, x + (i - 4) * 46 * s + row * 14 * s, y - row * 18 * s, s * (1 - row * 0.12), rng, {"leaf": "#7ac048"}, n=5, h=58)
    v.R(x - 230 * s, y - 52 * s, 480 * s, 10 * s, "#6fb8d8", None, 0, 0, 0.6)


def g_reed(v, x, y, s, rng, pal, n=6, h=240):
    for i in range(n):
        dx = (i - (n - 1) / 2) * 24 * s
        hh = h * s * rng.uniform(0.7, 1.15)
        top = (x + dx + rng.uniform(-18, 18) * s, y + hh)
        v.L([(x + dx, y), (x + dx + 4 * s, y + hh * 0.5), top], ol("#5a9a45"), 9 * s)
        v.L([(x + dx, y), (x + dx + 4 * s, y + hh * 0.5), top], "#6fb055", 5.5 * s)
        if i % 2 == 0:
            v.E(top[0], top[1] - 16 * s, 8 * s, 28 * s, fill="#8a5a33", stroke=ol("#8a5a33"), sw=2)


def g_clover(v, x, y, s, rng, pal):
    for _ in range(14):
        cx, cy = x + rng.uniform(-110, 110) * s, y + rng.uniform(0, 26) * s
        for k in range(3):
            a = math.pi / 2 + (k - 1) * 1.1
            v.E(cx + math.cos(a) * 9 * s, cy + 9 * s + math.sin(a) * 9 * s, 9 * s, fill="#5fae4e", stroke=ol("#3f8a3c"), sw=1.5)


def g_moss(v, x, y, s, rng, pal):
    v.S([(x - 130 * s, y), (x - 100 * s, y + 24 * s), (x - 30 * s, y + 32 * s), (x + 60 * s, y + 26 * s), (x + 130 * s, y + 6 * s), (x + 60 * s, y - 6 * s), (x - 60 * s, y - 6 * s)],
        shade(v, "#5f9a45"), ol("#4a7a38"), 4)
    for _ in range(26):
        v.E(x + rng.uniform(-110, 110) * s, y + rng.uniform(2, 24) * s, rng.uniform(3, 6) * s, fill="#8ad06a", op=0.7)


def g_sugarcane(v, x, y, s, rng, pal):
    for i in range(6):
        dx = (i - 2.5) * 22 * s
        hh = rng.uniform(250, 330) * s
        v.L([(x + dx, y), (x + dx + 6 * s, y + hh)], ol("#8a9a3a"), 14 * s)
        v.L([(x + dx, y), (x + dx + 6 * s, y + hh)], "#a8b84a", 9 * s)
        for k in range(1, 6):
            v.R(x + dx - 7 * s + k * s, y + hh * k / 6, 14 * s, 4 * s, "#6a7a2a", None, 0)
        for sgn in (-1, 1):
            v.L([(x + dx + 6 * s, y + hh), (x + dx + sgn * 70 * s, y + hh - 30 * s)], "#5fae4e", 6 * s)


def g_snow(v, x, y, s, rng, pal):
    for i in range(6):
        v.E(x + (i - 2.5) * 40 * s, y + 6 * s, rng.uniform(26, 42) * s, rng.uniform(9, 16) * s, fill="#fbfdff", stroke="#c8d8e8", sw=2)


def g_pebbles(v, x, y, s, rng, pal):
    for _ in range(10):
        r = rng.uniform(8, 18) * s
        c = mix("#9a958a", "#c8c2b4", rng.random())
        v.E(x + rng.uniform(-120, 120) * s, y + r * 0.5 + rng.uniform(0, 18) * s, r, r * 0.66, fill=shade(v, c), stroke=ol(c), sw=2)


def _reg_grass():
    G = "grass"
    reg = lambda cid, name, fn, tags, pal=None, **kw: register(G, cid, name, fn, pal, tags, **kw)
    reg("grass-tuft", "Grass tuft", g_tuft, ["grass"])
    reg("grass-tall", "Tall grass", g_tuft, ["grass", "meadow"], n=9, h=130, lean=40)
    reg("grass-dry", "Dry grass tuft", g_tuft, ["grass", "dry", "desert"], {"leaf": "#c8b060"}, n=8, h=84)
    reg("grass-wheat", "Wheat stalks", g_wheat, ["grass", "farm", "field"])
    reg("grass-millet", "Millet stalks", g_wheat, ["grass", "farm", "field"], col="#b8863a", h=240, n=7)
    reg("grass-rice-paddy", "Rice paddy", g_paddy, ["grass", "farm", "field", "water"])
    reg("grass-cattail", "Cattail reeds", g_reed, ["grass", "reed", "marsh", "pond"])
    reg("grass-reed-tall", "Tall river reeds", g_reed, ["grass", "reed", "river"], n=9, h=330)
    reg("grass-clover", "Clover patch", g_clover, ["grass", "meadow"])
    reg("grass-moss", "Moss patch", g_moss, ["grass", "moss", "forest", "cave"])
    reg("grass-sugarcane", "Sugarcane", g_sugarcane, ["grass", "farm", "village"])
    reg("grass-snow", "Snow drifts", g_snow, ["grass", "snow", "winter"])
    reg("grass-pebbles", "Pebbles", g_pebbles, ["grass", "ground", "path"])
    reg("grass-weeds", "Wild weeds", g_tuft, ["grass", "wild"], {"leaf": "#6a9a3a"}, n=11, h=96, lean=60)
    reg("grass-fern-floor", "Forest-floor sprouts", g_tuft, ["grass", "forest"], {"leaf": "#58b058"}, n=5, h=46, lean=14)


# ---------------------------------------------------------------------------------------------- rocks
def r_boulder(v, x, y, s, rng, pal, w=240, h=170, angular=False, col=None, moss=False, snow=False, cracks=False, crystal=None):
    c = col or pal.get("stone") or "#a9a59c"
    hw, hh = w * s / 2, h * s
    if angular:
        pts = [(x - hw, y), (x - hw * 0.82, y + hh * 0.55), (x - hw * 0.3, y + hh), (x + hw * 0.25, y + hh * 0.9), (x + hw * 0.85, y + hh * 0.5), (x + hw, y)]
        v.P(pts, shade(v, c), ol(c), 6)
        v.P([(x - hw * 0.3, y + hh), (x + hw * 0.25, y + hh * 0.9), (x + hw * 0.1, y + hh * 0.3), (x - hw * 0.4, y + hh * 0.35)], lighten(c, 0.25), None, 0, 0.55)
    else:
        v.S([(x - hw, y), (x - hw * 0.95, y + hh * 0.5), (x - hw * 0.45, y + hh * 0.95), (x + hw * 0.3, y + hh), (x + hw * 0.9, y + hh * 0.6), (x + hw, y)],
            shade(v, c), ol(c), 6)
    if cracks:
        v.L([(x - hw * 0.1, y + hh * 0.95), (x + hw * 0.05, y + hh * 0.6), (x - hw * 0.15, y + hh * 0.35), (x + hw * 0.05, y + hh * 0.08)], darken(c, 0.5), 4, 0.8)
    if moss:
        v.S([(x - hw * 0.8, y + hh * 0.5), (x - hw * 0.4, y + hh * 0.92), (x + hw * 0.2, y + hh * 0.96), (x + hw * 0.7, y + hh * 0.6), (x + hw * 0.3, y + hh * 0.72), (x - hw * 0.3, y + hh * 0.68)],
            "#5f9a45", None, 0, 0.9)
    if snow:
        v.S([(x - hw * 0.8, y + hh * 0.55), (x - hw * 0.4, y + hh * 0.95), (x + hw * 0.3, y + hh), (x + hw * 0.85, y + hh * 0.58), (x + hw * 0.3, y + hh * 0.72), (x - hw * 0.2, y + hh * 0.66)], "#f6faff", None, 0, 0.95)
    if crystal:
        for dx, ang, ln in ((-0.2, -14, 0.8), (0.1, 4, 1.0), (0.35, 20, 0.7)):
            cx = x + hw * dx
            v.P([(cx - 14 * s, y + hh * 0.7), (cx - 8 * s, y + hh * 0.7 + ln * 90 * s), (cx + 6 * s, y + hh * 0.7 + ln * 110 * s), (cx + 14 * s, y + hh * 0.7)], crystal, ol(crystal), 3)


def r_stalag(v, x, y, s, rng, pal, hang=False, h=300, w=90):
    c = pal.get("stone") or "#8a8478"
    sgn = -1 if hang else 1
    pts = [(x - w * s, y), (x - w * 0.4 * s, y + sgn * h * 0.6 * s), (x, y + sgn * h * s), (x + w * 0.4 * s, y + sgn * h * 0.6 * s), (x + w * s, y)]
    v.S(pts, shade(v, c), ol(c), 6)
    v.L([(x - w * 0.2 * s, y + sgn * 20 * s), (x - w * 0.05 * s, y + sgn * h * 0.8 * s)], lighten(c, 0.3), 4, 0.6)


def r_slab(v, x, y, s, rng, pal, w=380):
    c = pal.get("stone") or "#b0aa9a"
    v.P([(x - w * s / 2, y), (x - w * s * 0.45, y + 52 * s), (x + w * s * 0.45, y + 66 * s), (x + w * s / 2, y)], shade(v, c), ol(c), 6)
    v.P([(x - w * s * 0.45, y + 52 * s), (x + w * s * 0.45, y + 66 * s), (x + w * s * 0.4, y + 40 * s), (x - w * s * 0.4, y + 32 * s)], lighten(c, 0.22), None, 0, 0.6)


def r_cairn(v, x, y, s, rng, pal):
    c = pal.get("stone") or "#a9a59c"
    w = 130
    for i in range(5):
        ww = w * (1 - i * 0.17) * s
        v.E(x + rng.uniform(-6, 6) * s, y + (i * 40 + 22) * s, ww / 2, 24 * s, fill=shade(v, mix(c, "#c8c2b4", i / 6)), stroke=ol(c), sw=5)


def r_arch(v, x, y, s, rng, pal):
    c = pal.get("stone") or "#b09a78"
    v.S([(x - 230 * s, y), (x - 210 * s, y + 280 * s), (x - 110 * s, y + 360 * s), (x + 110 * s, y + 360 * s), (x + 210 * s, y + 280 * s), (x + 230 * s, y),
         (x + 120 * s, y), (x + 120 * s, y + 220 * s), (x, y + 270 * s), (x - 120 * s, y + 220 * s), (x - 120 * s, y)], shade(v, c), ol(c), 7)


def r_crystal(v, x, y, s, rng, pal, col="#8ad6f0"):
    for i in range(7):
        cx = x + (i - 3) * 34 * s + rng.uniform(-10, 10) * s
        hh = rng.uniform(120, 300) * s
        w = rng.uniform(20, 32) * s
        a = rng.uniform(-0.25, 0.25)
        v.P([(cx - w, y), (cx - w * 0.6 + a * hh, y + hh * 0.85), (cx + a * hh, y + hh), (cx + w * 0.6 + a * hh, y + hh * 0.85), (cx + w, y)], shade(v, mix(col, "#ffffff", i / 12)), ol(col), 4)
    v.glow(x, y + 120 * s, 240 * s, col, 0.35)


def r_pebble_stack(v, x, y, s, rng, pal):
    for i in range(7):
        r = rng.uniform(22, 44) * s
        c = mix("#9a958a", "#cfc8b8", rng.random())
        v.E(x + rng.uniform(-110, 110) * s, y + r * 0.55 + rng.uniform(0, 30) * s, r, r * 0.68, fill=shade(v, c), stroke=ol(c), sw=3)


def r_mesa(v, x, y, s, rng, pal, w=420, h=300, col="#c98a5a"):
    pts = [(x - w * s / 2, y), (x - w * s * 0.42, y + h * 0.72 * s), (x - w * s * 0.36, y + h * s), (x + w * s * 0.36, y + h * s), (x + w * s * 0.42, y + h * 0.72 * s), (x + w * s / 2, y)]
    v.P(pts, shade(v, col), ol(col), 6)
    for k in range(1, 5):
        v.L([(x - w * s * (0.46 - k * 0.012), y + h * k * 0.2 * s), (x + w * s * (0.46 - k * 0.012), y + h * k * 0.2 * s)], darken(col, 0.2), 4, 0.5, smooth=False)


def _reg_rocks():
    K = "rock"
    reg = lambda cid, name, fn, tags, pal=None, **kw: register(K, cid, name, fn, pal, tags, **kw)
    reg("rock-boulder", "Round boulder", r_boulder, ["rock"])
    reg("rock-boulder-angular", "Angular boulder", r_boulder, ["rock", "mountain"], angular=True)
    reg("rock-mossy", "Mossy rock", r_boulder, ["rock", "forest", "moss"], moss=True)
    reg("rock-snowy", "Snow-capped rock", r_boulder, ["rock", "snow", "winter"], snow=True)
    reg("rock-cracked", "Cracked boulder", r_boulder, ["rock", "cave"], cracks=True, col="#8a8478")
    reg("rock-big", "Large boulder", r_boulder, ["rock", "mountain"], w=420, h=300, col="#9a948a")
    reg("rock-small", "Small stone", r_boulder, ["rock", "ground"], w=110, h=70)
    reg("rock-sandstone", "Sandstone boulder", r_boulder, ["rock", "desert"], col="#d4a86a", w=300, h=200)
    reg("rock-volcanic", "Dark volcanic rock", r_boulder, ["rock", "haunted", "dark"], col="#3a3440", angular=True, w=280)
    reg("rock-gold-ore", "Gold-flecked rock", r_boulder, ["rock", "treasure", "cave"], col="#7a6a48", cracks=True)
    reg("rock-river", "Smooth river stone", r_boulder, ["rock", "river"], col="#8a9aa0", w=200, h=110)
    reg("rock-lichen", "Lichen rock", r_boulder, ["rock", "forest"], col="#9aa088", moss=True, w=260)
    reg("rock-crystal-cluster", "Rock with crystals", r_boulder, ["rock", "crystal", "magic", "cave"], crystal="#8ad6f0", col="#6a6a88")
    reg("rock-slab", "Flat slab", r_slab, ["rock", "path"])
    reg("rock-cairn", "Stacked-stone cairn", r_cairn, ["rock", "mountain", "path"])
    reg("rock-arch", "Natural rock arch", r_arch, ["rock", "mountain", "desert"])
    reg("rock-stalagmite", "Stalagmite", r_stalag, ["rock", "cave"])
    reg("rock-stalactite", "Stalactite", r_stalag, ["rock", "cave"], hang=True)
    reg("rock-mesa", "Red mesa block", r_mesa, ["rock", "desert", "mountain"])
    reg("rock-crystal-spikes", "Glowing crystal spikes", r_crystal, ["rock", "crystal", "magic", "cave"])


# ---------------------------------------------------------------------------------------------- clouds
def c_cumulus(v, x, y, s, rng, pal, w=420, puffs=6, col="#ffffff", flat=0.8, shadow="#dce8f4"):
    blobs = []
    for i in range(puffs):
        k = i / max(1, puffs - 1)
        r = (0.2 + 0.18 * math.sin(math.pi * k)) * w * s
        blobs.append((x + (k - 0.5) * w * s * 0.9, y + rng.uniform(-0.04, 0.1) * w * s, r))
    for bx, by, br in blobs:
        v.E(bx, by, br, br * flat, fill=shadow)
    for bx, by, br in blobs:
        v.E(bx, by + br * 0.12, br * 0.94, br * flat * 0.9, fill=col)
    v.E(x, y - w * 0.06 * s, w * 0.42 * s, w * 0.07 * s, fill=shadow, op=0.5)


def c_stratus(v, x, y, s, rng, pal, w=760, col="#f4f8fc"):
    for k in range(3):
        v.S([(x - w * s / 2, y + k * 20 * s), (x - w * s * 0.3, y + (k * 20 + 22) * s), (x + w * s * 0.2, y + (k * 20 + 16) * s), (x + w * s / 2, y + k * 20 * s),
             (x + w * s * 0.2, y + (k * 20 - 20) * s), (x - w * s * 0.3, y + (k * 20 - 16) * s)], col, None, 0, 0.8 - k * 0.2)


def c_wisp(v, x, y, s, rng, pal, col="#ffffff"):
    for k in range(4):
        v.L([(x - 280 * s, y + k * 16 * s), (x - 60 * s, y + k * 16 * s + 22 * s), (x + 120 * s, y + k * 16 * s - 6 * s), (x + 300 * s, y + k * 16 * s + 18 * s)], col, 10 * s - k * 1.4, 0.7 - k * 0.12)


def _reg_clouds():
    C = "cloud"
    reg = lambda cid, name, fn, tags, pal=None, **kw: register(C, cid, name, fn, pal, tags, **kw)
    reg("cloud-cumulus-1", "Fluffy cumulus", c_cumulus, ["cloud", "day"])
    reg("cloud-cumulus-2", "Wide cumulus", c_cumulus, ["cloud", "day"], w=620, puffs=8)
    reg("cloud-cumulus-3", "Small cumulus", c_cumulus, ["cloud", "day"], w=260, puffs=4)
    reg("cloud-puff", "Single puff", c_cumulus, ["cloud", "day"], w=180, puffs=3)
    reg("cloud-stratus", "Flat stratus layer", c_stratus, ["cloud", "overcast"])
    reg("cloud-cirrus", "Wispy cirrus", c_wisp, ["cloud", "high"])
    reg("cloud-storm", "Dark storm cloud", c_cumulus, ["cloud", "storm", "rain"], col="#6a7488", shadow="#4a5468", w=620, puffs=8, flat=0.7)
    reg("cloud-thunderhead", "Towering thunderhead", c_cumulus, ["cloud", "storm"], col="#8a94a8", shadow="#5a6478", w=420, puffs=9, flat=1.2)
    reg("cloud-sunset", "Sunset cloud", c_cumulus, ["cloud", "sunset"], col="#ffc89a", shadow="#e8907a", w=520, puffs=7)
    reg("cloud-sunset-streak", "Sunset streaks", c_stratus, ["cloud", "sunset"], col="#ffb88a", w=900)
    reg("cloud-night", "Moonlit cloud", c_cumulus, ["cloud", "night"], col="#8a96c0", shadow="#5a668e", w=480, puffs=6)
    reg("cloud-mist-band", "Low mist band", c_stratus, ["cloud", "mist", "fog"], col="#f0f4f8", w=1100)


# ------------------------------------------------------------------------------------------- mountains
def m_peak(v, x, y, s, rng, pal, w=1100, h=620, col="#8a96a8", snow=True, jag=0.14, rolling=False, terraces=0, forest=None, dark=None):
    hw = w * s / 2
    n = 26
    ridge = []
    for i in range(n + 1):
        k = i / n
        base = math.sin(math.pi * k) ** (0.8 if rolling else 1.0) if rolling else (1 - abs(2 * k - 1)) ** 0.95
        noise = 0.0 if rolling else rng.uniform(-jag, jag) * (0.25 + base)
        ridge.append((x - hw + w * s * k, y + h * s * max(0.0, base * (1 + noise))))
    ridge[0] = (ridge[0][0], y)
    ridge[-1] = (ridge[-1][0], y)
    if rolling:
        v.S(ridge, v.G([(0, lighten(col, 0.15)), (1, col)]), ol(col, 0.35), 5)
    else:
        v.P(ridge, v.G([(0, lighten(col, 0.1)), (1, darken(col, 0.1))]), ol(col, 0.35), 5)
        peak = max(range(len(ridge)), key=lambda i: ridge[i][1])
        v.P([ridge[peak]] + ridge[peak:] + [(ridge[-1][0], y), (ridge[peak][0] - hw * 0.22, y)], darken(col, 0.18), None, 0, 0.55)
    if snow and not rolling:
        line = y + h * s * 0.64
        cap = [(px, py) for px, py in ridge if py > line]
        if len(cap) > 2:
            zig = []
            for i, (px, py) in enumerate(reversed(cap)):
                zig.append((px, line + (-30 if i % 2 else 10) * s - (py - line) * 0.18))
            v.P(cap + zig, "#f6faff", ol("#c8d8e8", 0.2), 3)
    for k in range(terraces):
        yy = y + (k + 1) * h * s / (terraces + 2)
        v.L([(x - hw * (0.9 - k * 0.17), yy), (x + hw * (0.9 - k * 0.17), yy)], darken(col, 0.22), 4, 0.5, smooth=True)
    if forest:
        for i in range(int(w / 50)):
            fx = x - hw * 0.85 + i * (hw * 1.7 / max(1, int(w / 50)))
            fy = y + 8 * s + rng.uniform(0, 26) * s
            v.P([(fx - 18 * s, fy), (fx, fy + 54 * s), (fx + 18 * s, fy)], forest, ol(forest, 0.35), 2)


def m_dune(v, x, y, s, rng, pal, w=1400, h=230, col="#e0b870"):
    hw = w * s / 2
    v.S([(x - hw, y), (x - hw * 0.5, y + h * 0.85 * s), (x - hw * 0.1, y + h * s), (x + hw * 0.4, y + h * 0.5 * s), (x + hw, y), (x, y - 20 * s)], v.G([(0, lighten(col, 0.2)), (1, col)]), ol(col, 0.3), 4)
    v.S([(x - hw * 0.1, y + h * s), (x + hw * 0.4, y + h * 0.5 * s), (x + hw, y), (x + hw * 0.2, y - 10 * s)], darken(col, 0.12), None, 0, 0.55)


def m_cliff(v, x, y, s, rng, pal, w=620, h=760, col="#8a7a6a"):
    """A faceted cliff: jagged skyline, a lit plane and a shadowed plane, rock ledges with pale lips, cracks and a scree skirt."""
    hw = w * s / 2
    top = [(x - hw + i * (2 * hw) / 8, y + rng.uniform(-30, 14) * s + (18 * s if i in (0, 8) else 0)) for i in range(9)]
    left = [(x - hw * 0.93, y + h * 0.35 * s), (x - hw * 0.86, y + h * 0.7 * s), (x - hw * 0.6, y + h * s)]
    right = [(x + hw * 0.55, y + h * 0.97 * s), (x + hw * 0.9, y + h * 0.62 * s), (x + hw * 0.98, y + h * 0.3 * s)]
    outline = top + right[::-1][::-1] if False else top + list(reversed(right)) + list(reversed(left))
    v.P(outline, shade(v, col), ol(col), 6)
    # shadowed plane on the right, lit plane on the left, split by a diagonal fault
    v.P([(x + hw * 0.05, y - 10 * s), (x + hw * 0.28, y + h * 0.3 * s), (x + hw * 0.12, y + h * 0.62 * s), (x + hw * 0.5, y + h * 0.95 * s)] + list(reversed(right)) + [top[-1], top[-2], top[-3], top[-4]],
        darken(col, 0.22), None, 0, 0.55)
    v.P([top[0], top[1], (x - hw * 0.45, y + h * 0.25 * s), (x - hw * 0.6, y + h * 0.5 * s)] + [left[0]], lighten(col, 0.16), None, 0, 0.5)
    for k in range(5):                                                                  # ledges: a dark underside and a pale lip
        yy = y + h * s * (0.14 + 0.17 * k)
        x0 = x - hw * rng.uniform(0.75, 0.9)
        x1 = x + hw * rng.uniform(0.5, 0.85)
        mid = (x0 + x1) / 2 + rng.uniform(-40, 40) * s
        v.L([(x0, yy), (mid, yy + rng.uniform(-12, 12) * s), (x1, yy + rng.uniform(-8, 8) * s)], darken(col, 0.38), 5, 0.65)
        v.L([(x0 + 10 * s, yy - 6 * s), (mid, yy - 6 * s + rng.uniform(-10, 10) * s), (x1 - 12 * s, yy - 5 * s)], lighten(col, 0.22), 3, 0.6)
    for k in range(6):                                                                  # cracks
        cx0 = x + rng.uniform(-0.7, 0.6) * hw
        cy0 = y + rng.uniform(0.1, 0.6) * h * s
        v.L([(cx0, cy0), (cx0 + rng.uniform(-18, 18) * s, cy0 + 40 * s), (cx0 + rng.uniform(-24, 24) * s, cy0 + 84 * s)], darken(col, 0.45), 3, 0.6)
    for k in range(10):                                                                 # scree at the foot
        bx = x + rng.uniform(-0.8, 0.7) * hw
        by = y + h * s * rng.uniform(0.9, 0.99)
        r = rng.uniform(10, 24) * s
        v.E(bx, by, r * 1.3, r * 0.8, shade(v, darken(col, 0.1)), ol(col), 3)


def _reg_mountains():
    M = "mountain"
    reg = lambda cid, name, fn, tags, pal=None, **kw: register(M, cid, name, fn, pal, tags, **kw)
    reg("mountain-snow-peak", "Snow-capped peak", m_peak, ["mountain", "snow", "himalaya"])
    reg("mountain-green-hills", "Rolling green hills", m_peak, ["hill", "green"], rolling=True, snow=False, col="#7fbf78", h=300, w=1500)
    reg("mountain-rocky", "Jagged rocky range", m_peak, ["mountain", "rocky"], snow=False, col="#8a8478", jag=0.2, h=560)
    reg("mountain-himalaya", "Distant Himalayan range", m_peak, ["mountain", "snow", "himalaya"], col="#98a4c0", w=1800, h=700, jag=0.18)
    reg("mountain-forested", "Forested ridge", m_peak, ["mountain", "forest"], snow=False, col="#5f9a68", forest="#2f7a48", rolling=False, h=420)
    reg("mountain-mesa-range", "Desert mesa ridge", m_peak, ["mountain", "desert"], snow=False, col="#c98a5a", h=360, w=1300, jag=0.05)
    reg("mountain-terraced", "Terraced green hill", m_peak, ["hill", "farm", "village"], rolling=True, snow=False, col="#8fc878", terraces=5, h=360, w=1300)
    reg("mountain-blue-range", "Hazy blue range", m_peak, ["mountain", "distant"], snow=False, col="#9ab4d8", w=1900, h=420, jag=0.14)
    reg("mountain-dune-ridge", "Sand dune ridge", m_dune, ["dune", "desert"])
    reg("mountain-cliff", "Cliff face", m_cliff, ["cliff", "mountain", "rocky"])


# ------------------------------------------------------------------------------------------------ water
def w_waves(v, x, y, s, rng, pal, n=5, w=380, col="#ffffff", amp=9):
    for k in range(n):
        yy = y + k * 22 * s
        xs = x - w * s / 2 + rng.uniform(-30, 30) * s
        v.L([(xs, yy), (xs + w * s * 0.25, yy + amp * s), (xs + w * s * 0.5, yy), (xs + w * s * 0.75, yy + amp * s), (xs + w * s, yy)], col, 5 * s, 0.7)


def w_ripples(v, x, y, s, rng, pal):
    for k in range(4):
        v.E(x, y, (60 + k * 54) * s, (14 + k * 11) * s, stroke="#ffffff", sw=4 * s, op=0.7 - k * 0.14)


def w_lilypads(v, x, y, s, rng, pal, n=5):
    for i in range(n):
        px, py = x + (i - (n - 1) / 2) * 84 * s + rng.uniform(-20, 20) * s, y + rng.uniform(-12, 12) * s
        r = rng.uniform(42, 62) * s
        v.E(px, py, r, r * 0.3, fill=shade(v, "#4aa84a"), stroke=ol("#3a8a3a"), sw=4)
        v.P([(px, py), (px + r, py + 6 * s), (px + r * 0.9, py - 8 * s)], "#5fbfe0", None, 0, 0.0)


def w_reedsw(v, x, y, s, rng, pal):
    g_reed(v, x, y, s, rng, pal, n=7, h=260)
    v.E(x, y - 4 * s, 130 * s, 14 * s, stroke="#ffffff", sw=3, op=0.6)


def w_rapids(v, x, y, s, rng, pal):
    for k in range(7):
        r = rng.uniform(24, 46) * s
        v.E(x + (k - 3) * 56 * s, y + rng.uniform(0, 26) * s, r, r * 0.5, fill="#eef8ff", stroke="#a8d4e8", sw=3)
    w_waves(v, x, y - 20 * s, s, rng, pal, n=3, w=420)


def w_waterfall(v, x, y, s, rng, pal, w=180, h=520):
    v.R(x - w * s / 2, y, w * s, h * s, v.G([(0, "#e8f6ff"), (1, "#7fc4e8")]), None, 0, 14 * s)
    for k in range(9):
        xx = x - w * s * 0.4 + k * w * s * 0.1
        v.L([(xx, y + h * s), (xx + rng.uniform(-6, 6) * s, y + h * s * 0.55), (xx, y + 10 * s)], "#ffffff", 5 * s, 0.7)
    v.E(x, y + 6 * s, w * 0.78 * s, 36 * s, fill="#ffffff", op=0.8)
    for _ in range(7):
        v.E(x + rng.uniform(-w, w) * 0.7 * s, y + rng.uniform(-6, 34) * s, rng.uniform(14, 30) * s, fill="#ffffff", op=0.7)


def w_foam(v, x, y, s, rng, pal):
    for k in range(9):
        v.E(x + (k - 4) * 40 * s, y + rng.uniform(-6, 8) * s, rng.uniform(14, 26) * s, rng.uniform(6, 11) * s, fill="#ffffff", op=0.85)


def w_stones(v, x, y, s, rng, pal, n=5):
    for i in range(n):
        r = rng.uniform(46, 66) * s
        v.E(x + i * 120 * s - n * 60 * s, y + rng.uniform(-8, 8) * s, r, r * 0.46, fill=shade(v, "#9aa0a0"), stroke=ol("#9aa0a0"), sw=4)
        v.E(x + i * 120 * s - n * 60 * s, y - 22 * s, r * 1.2, 7 * s, stroke="#ffffff", sw=3, op=0.6)


def w_boat(v, x, y, s, rng, pal, sail=False):
    wd = pal.get("wood") or "#9a6a3a"
    v.S([(x - 190 * s, y + 80 * s), (x - 120 * s, y + 6 * s), (x + 120 * s, y + 6 * s), (x + 190 * s, y + 80 * s), (x + 100 * s, y + 60 * s), (x - 100 * s, y + 60 * s)],
        shade(v, wd), ol(wd), 6)
    v.L([(x - 150 * s, y + 52 * s), (x + 150 * s, y + 52 * s)], darken(wd, 0.35), 5, 0.7, smooth=False)
    if sail:
        v.R(x - 5 * s, y + 70 * s, 10 * s, 300 * s, "#7a5a3a", ol("#7a5a3a"), 3)
        v.P([(x + 8 * s, y + 90 * s), (x + 8 * s, y + 360 * s), (x + 170 * s, y + 120 * s)], "#f6ecd8", ol("#c8b898", 0.2), 4)
    v.E(x, y + 2 * s, 210 * s, 14 * s, stroke="#ffffff", sw=3, op=0.6)


def w_fountain(v, x, y, s, rng, pal):
    st = pal.get("stone") or "#cfc8b8"
    v.S([(x - 180 * s, y + 70 * s), (x - 180 * s, y), (x + 180 * s, y), (x + 180 * s, y + 70 * s), (x + 150 * s, y + 90 * s), (x - 150 * s, y + 90 * s)], shade(v, st), ol(st), 6)
    v.E(x, y + 88 * s, 150 * s, 22 * s, fill="#7fc4e8", stroke=ol(st), sw=4)
    v.R(x - 18 * s, y + 80 * s, 36 * s, 180 * s, shade(v, st), ol(st), 5, rx=8 * s)
    v.S([(x - 70 * s, y + 250 * s), (x - 90 * s, y + 280 * s), (x + 90 * s, y + 280 * s), (x + 70 * s, y + 250 * s)], shade(v, st), ol(st), 5)
    for k in range(9):
        a = math.pi * (0.1 + 0.8 * k / 8)
        v.L([(x, y + 290 * s), (x + math.cos(a) * 90 * s, y + 340 * s + math.sin(a) * 40 * s), (x + math.cos(a) * 170 * s, y + 200 * s)], "#bfe6f8", 5 * s, 0.85)


def w_jetty(v, x, y, s, rng, pal):
    wd = pal.get("wood") or "#9a6a3a"
    for k in range(8):
        v.R(x + k * 56 * s - 224 * s, y + 24 * s, 52 * s, 16 * s, shade(v, wd), ol(wd), 3)
    for k in range(5):
        v.R(x + k * 112 * s - 224 * s, y - 70 * s, 16 * s, 110 * s, shade(v, darken(wd, 0.15)), ol(wd), 3)


def w_bubbles(v, x, y, s, rng, pal):
    for _ in range(14):
        r = rng.uniform(5, 18) * s
        v.E(x + rng.uniform(-40, 40) * s, y + rng.uniform(0, 260) * s, r, fill="#e8f8ff", stroke="#ffffff", sw=2, op=0.7)


def w_seaweed(v, x, y, s, rng, pal):
    for i in range(7):
        bx = x + (i - 3) * 22 * s
        hh = rng.uniform(150, 320) * s
        v.L([(bx, y), (bx + 28 * s, y + hh * 0.35), (bx - 24 * s, y + hh * 0.7), (bx + 16 * s, y + hh)], ol("#2f8a5a"), 12 * s)
        v.L([(bx, y), (bx + 28 * s, y + hh * 0.35), (bx - 24 * s, y + hh * 0.7), (bx + 16 * s, y + hh)], mix("#3fa86a", "#6ad08a", rng.random()), 8 * s)


def w_fish(v, x, y, s, rng, pal, col="#f09a3a"):
    v.S([(x - 70 * s, y), (x - 30 * s, y + 34 * s), (x + 40 * s, y + 24 * s), (x + 70 * s, y), (x + 40 * s, y - 24 * s), (x - 30 * s, y - 34 * s)], shade(v, col), ol(col), 4)
    v.P([(x - 66 * s, y), (x - 104 * s, y + 34 * s), (x - 104 * s, y - 34 * s)], mix(col, "#ffffff", 0.2), ol(col), 4)
    v.E(x + 38 * s, y + 7 * s, 6 * s, fill="#ffffff", stroke="#2b2019", sw=2)
    v.E(x + 40 * s, y + 7 * s, 3 * s, fill="#2b2019")


def _reg_water():
    W = "water"
    reg = lambda cid, name, fn, tags, pal=None, **kw: register(W, cid, name, fn, pal, tags, **kw)
    reg("water-waves", "Wave lines", w_waves, ["water", "river", "lake"])
    reg("water-ripples", "Ripple rings", w_ripples, ["water", "pond"])
    reg("water-lilypads", "Lily pads", w_lilypads, ["water", "pond", "lake"])
    reg("water-reeds", "Reeds in water", w_reedsw, ["water", "marsh", "pond"])
    reg("water-rapids", "Rapids", w_rapids, ["water", "river", "stream"])
    reg("water-waterfall", "Waterfall", w_waterfall, ["water", "waterfall", "mountain"])
    reg("water-foam", "Foam edge", w_foam, ["water", "river"])
    reg("water-stepping-stones", "Stepping stones", w_stones, ["water", "stream", "river"])
    reg("water-boat", "Wooden rowing boat", w_boat, ["water", "boat", "river", "lake"])
    reg("water-sailboat", "Sailing boat", w_boat, ["water", "boat", "harbour", "port"], sail=True)
    reg("water-fountain", "Stone fountain", w_fountain, ["water", "garden", "palace"])
    reg("water-jetty", "Wooden jetty", w_jetty, ["water", "lake", "harbour"])
    reg("water-bubbles", "Rising bubbles", w_bubbles, ["water", "underwater"])
    reg("water-seaweed", "Seaweed", w_seaweed, ["water", "underwater"])
    reg("water-fish", "Fish", w_fish, ["water", "underwater", "pond"])


def register_all() -> None:
    _reg_trees()
    _reg_bushes()
    _reg_flowers()
    _reg_grass()
    _reg_rocks()
    _reg_clouds()
    _reg_mountains()
    _reg_water()
