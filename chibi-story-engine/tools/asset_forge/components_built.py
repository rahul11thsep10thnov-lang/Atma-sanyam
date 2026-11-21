"""Reusable vector components, part 2: built things (buildings, doors and windows, fences and walls, lamps).

Same drawer signature as the nature components. Buildings call the door and window components so a change to
a door design shows up in every house that uses it.
"""
from __future__ import annotations

import math

from .components_nature import _P
from .kit import PAL, REGISTRY, V, ol, register, shade
from .svg import darken, lighten, mix


def _use(v: V, cid: str, x, y, s, rng=None, **kw):
    REGISTRY[cid].render(v, x, y, s, seed=int(x + y), **kw)


def _wallbox(v: V, x, y, w, h, col, s, rx=6, sw=6):
    v.R(x - w * s / 2, y, w * s, h * s, shade(v, col), ol(col), sw, rx=rx * s)


def _band(v: V, x, y, w, col, s, h=22):
    v.R(x - w * s / 2, y, w * s, h * s, shade(v, col), ol(col), 4, rx=4 * s)


# ------------------------------------------------------------------------------------------- doors
def d_arched(v, x, y, s, rng, pal, w=130, h=230, col="#7a4a2a", frame="#d8c8a8"):
    v.S([(x - w * s / 2 - 10 * s, y), (x - w * s / 2 - 10 * s, y + h * s * 0.72), (x, y + h * s + 8 * s), (x + w * s / 2 + 10 * s, y + h * s * 0.72), (x + w * s / 2 + 10 * s, y)],
        shade(v, frame), ol(frame), 5)
    v.S([(x - w * s / 2, y), (x - w * s / 2, y + h * s * 0.7), (x, y + h * s), (x + w * s / 2, y + h * s * 0.7), (x + w * s / 2, y)], shade(v, col), ol(col), 5)
    v.L([(x, y), (x, y + h * s * 0.98)], darken(col, 0.4), 4, 0.8, smooth=False)
    for k in (0.25, 0.5):
        v.L([(x - w * s / 2, y + h * s * k), (x + w * s / 2, y + h * s * k)], darken(col, 0.3), 3, 0.6, smooth=False)
    v.E(x - 14 * s, y + h * s * 0.42, 6 * s, fill="#e6b93c", stroke=ol("#e6b93c"), sw=2)


def d_plank(v, x, y, s, rng, pal, w=110, h=210, col="#9a6a3a"):
    v.R(x - w * s / 2, y, w * s, h * s, shade(v, col), ol(col), 5, rx=4 * s)
    for k in range(1, 4):
        v.L([(x - w * s / 2 + k * w * s / 4, y), (x - w * s / 2 + k * w * s / 4, y + h * s)], darken(col, 0.3), 3, 0.7, smooth=False)
    v.L([(x - w * s / 2, y + h * s * 0.25), (x + w * s / 2, y + h * s * 0.25)], darken(col, 0.4), 6 * s, 0.9, smooth=False)
    v.L([(x - w * s / 2, y + h * s * 0.75), (x + w * s / 2, y + h * s * 0.75)], darken(col, 0.4), 6 * s, 0.9, smooth=False)
    v.E(x + w * s * 0.3, y + h * s * 0.45, 6 * s, fill="#3a2a1a")


def d_double(v, x, y, s, rng, pal, w=230, h=250, col="#6b3f22"):
    _wallbox(v, x, y, w + 24, h + 20, "#d8c8a8", s, 4)
    for sgn in (-1, 1):
        v.R(x + (0 if sgn > 0 else -w * s / 2) + 2 * s, y, w * s / 2 - 4 * s, h * s, shade(v, col), ol(col), 5, rx=3 * s)
        for k in range(2):
            v.R(x + sgn * (w * s * 0.25) - 34 * s, y + (24 + k * 112) * s, 68 * s, 84 * s, darken(col, 0.18), ol(col), 3, rx=3 * s)
        v.E(x + sgn * 14 * s, y + h * s * 0.45, 7 * s, fill="#e6b93c", stroke=ol("#e6b93c"), sw=2)


def d_temple(v, x, y, s, rng, pal, w=170, h=300):
    gold, wood = "#e6b93c", "#7a3a1a"
    v.R(x - w * s / 2 - 16 * s, y, 18 * s, h * s + 20 * s, shade(v, "#d8c098"), ol("#d8c098"), 4)
    v.R(x + w * s / 2 - 2 * s, y, 18 * s, h * s + 20 * s, shade(v, "#d8c098"), ol("#d8c098"), 4)
    v.S([(x - w * s / 2, y), (x - w * s / 2, y + h * s * 0.6), (x - w * s * 0.2, y + h * s * 0.88), (x, y + h * s), (x + w * s * 0.2, y + h * s * 0.88), (x + w * s / 2, y + h * s * 0.6), (x + w * s / 2, y)],
        shade(v, wood), ol(wood), 5)
    for k in range(5):
        v.E(x + (k - 2) * w * s * 0.2, y + h * s * (0.3 + 0.1 * (k % 2)), 11 * s, fill=gold, stroke=ol(gold), sw=3)
    v.L([(x, y), (x, y + h * s * 0.95)], darken(wood, 0.5), 4, smooth=False)
    v.E(x, y + h * s * 0.78, 18 * s, fill=gold, stroke=ol(gold), sw=3)


def d_gate(v, x, y, s, rng, pal, w=300, h=300):
    iron = "#4a4a52"
    v.R(x - w * s / 2 - 30 * s, y, 34 * s, (h + 40) * s, shade(v, "#b0a58a"), ol("#b0a58a"), 5)
    v.R(x + w * s / 2 - 4 * s, y, 34 * s, (h + 40) * s, shade(v, "#b0a58a"), ol("#b0a58a"), 5)
    for k in range(14):
        xx = x - w * s / 2 + 12 * s + k * (w - 24) * s / 13
        v.L([(xx, y), (xx, y + h * s - abs(k - 6.5) * 4 * s)], ol(iron), 8 * s, smooth=False)
        v.L([(xx, y), (xx, y + h * s - abs(k - 6.5) * 4 * s)], iron, 4 * s, smooth=False)
        v.P([(xx - 8 * s, y + h * s - abs(k - 6.5) * 4 * s), (xx, y + (h + 24) * s - abs(k - 6.5) * 4 * s), (xx + 8 * s, y + h * s - abs(k - 6.5) * 4 * s)], iron, None, 0)
    for k in (0.3, 0.7):
        v.L([(x - w * s / 2, y + h * s * k), (x + w * s / 2, y + h * s * k)], ol(iron), 9 * s, smooth=False)


def d_curtain(v, x, y, s, rng, pal, w=150, h=230, col="#c0392b"):
    v.R(x - w * s / 2 - 8 * s, y, w * s + 16 * s, h * s + 12 * s, "#2a1a14", ol("#2a1a14"), 4)
    for sgn in (-1, 1):
        v.S([(x + sgn * 6 * s, y + h * s), (x + sgn * w * s / 2, y + h * s), (x + sgn * w * s * 0.46, y + h * s * 0.5), (x + sgn * w * s * 0.18, y + 4 * s), (x + sgn * 8 * s, y + h * s * 0.3)],
            shade(v, col), ol(col), 4)
        v.L([(x + sgn * w * s * 0.3, y + h * s), (x + sgn * w * s * 0.26, y + 20 * s)], darken(col, 0.35), 4, 0.6)
    v.R(x - w * s / 2 - 12 * s, y + h * s + 6 * s, w * s + 24 * s, 10 * s, "#e6b93c", ol("#e6b93c"), 3, rx=5 * s)


def d_moon(v, x, y, s, rng, pal, r=130):
    v.E(x, y + r * s, r * s + 18 * s, fill=shade(v, "#d8c8a8"), stroke=ol("#d8c8a8"), sw=6)
    v.E(x, y + r * s, r * s, fill="#2a3a2a", stroke=ol("#2a3a2a"), sw=3)
    v.E(x, y + r * s, r * s * 0.86, stroke="#6a9a5a", sw=3, op=0.6)


def d_hut_low(v, x, y, s, rng, pal, w=100, h=170):
    v.S([(x - w * s / 2, y), (x - w * s / 2, y + h * s * 0.75), (x, y + h * s), (x + w * s / 2, y + h * s * 0.75), (x + w * s / 2, y)], "#2a1c14", ol("#2a1c14"), 4)
    v.E(x, y + h * s * 0.35, w * s * 0.28, h * s * 0.2, fill="#4a3424", op=0.5)


def d_palace(v, x, y, s, rng, pal, w=360, h=460):
    gold = "#e6b93c"
    _wallbox(v, x, y, w + 60, h + 40, "#f3e0b8", s, 6)
    v.S([(x - w * s / 2, y), (x - w * s / 2, y + h * s * 0.66), (x - w * s * 0.22, y + h * s * 0.92), (x, y + h * s), (x + w * s * 0.22, y + h * s * 0.92), (x + w * s / 2, y + h * s * 0.66), (x + w * s / 2, y)],
        shade(v, "#7a2a22"), ol("#7a2a22"), 6)
    v.S([(x - w * s * 0.42, y), (x - w * s * 0.42, y + h * s * 0.6), (x, y + h * s * 0.9), (x + w * s * 0.42, y + h * s * 0.6), (x + w * s * 0.42, y)], "#3a1a18", None, 0, 0.7)
    v.L([(x - w * s / 2, y + h * s * 0.66), (x - w * s * 0.22, y + h * s * 0.92), (x, y + h * s), (x + w * s * 0.22, y + h * s * 0.92), (x + w * s / 2, y + h * s * 0.66)], gold, 7 * s)
    for k in range(5):
        v.E(x + (k - 2) * w * s * 0.18, y + h * s * 0.5, 9 * s, fill=gold, stroke=ol(gold), sw=2)


def d_stable(v, x, y, s, rng, pal, w=130, h=230, col="#9a6a3a"):
    v.R(x - w * s / 2, y, w * s, h * s, "#2a1c14", ol("#2a1c14"), 4)
    v.R(x - w * s / 2, y, w * s, h * s * 0.5, shade(v, col), ol(col), 4, rx=3 * s)
    for k in range(1, 4):
        v.L([(x - w * s / 2 + k * w * s / 4, y), (x - w * s / 2 + k * w * s / 4, y + h * s * 0.5)], darken(col, 0.3), 3, 0.7, smooth=False)


def d_trellis(v, x, y, s, rng, pal, w=150, h=230):
    col = "#8a5a33"
    v.S([(x - w * s / 2, y), (x - w * s / 2, y + h * s * 0.7), (x, y + h * s), (x + w * s / 2, y + h * s * 0.7), (x + w * s / 2, y)], "#2a3a2a", ol(col), 6)
    for k in range(-3, 4):
        v.L([(x + k * w * s / 7 - 30 * s, y), (x + k * w * s / 7 + 30 * s, y + h * s * 0.9)], col, 4, 0.9, smooth=False)
        v.L([(x + k * w * s / 7 + 30 * s, y), (x + k * w * s / 7 - 30 * s, y + h * s * 0.9)], col, 4, 0.9, smooth=False)


def _pointed(v, x, y, w, h, fill, stroke, sw=6, inset=0.0):
    """A pointed (Mughal) arch opening: straight jambs to 60 % of the height, then two curves meeting at the apex."""
    xl, xr, yb = x - w / 2 + inset, x + w / 2 - inset, y + h * 0.6
    v.D(f"M {xl:.1f} {y:.1f} L {xl:.1f} {yb:.1f} Q {xl:.1f} {y + h * 0.82:.1f} {x:.1f} {y + h:.1f} Q {xr:.1f} {y + h * 0.82:.1f} {xr:.1f} {yb:.1f} L {xr:.1f} {y:.1f} Z", fill, stroke, sw)


def d_portcullis(v, x, y, s, rng, pal, w=260, h=320):
    iron = "#3a3a42"
    stone = "#9a8a78"
    _pointed(v, x, y, (w + 44) * s, (h + 22) * s, shade(v, stone), ol(stone), 6)                    # stone surround
    _pointed(v, x, y, w * s, h * s, "#1a1418", ol(iron), 5)                                          # the opening
    n = 7
    for k in range(n):
        xx = x - w * s / 2 + 16 * s + k * (w - 32) * s / (n - 1)
        top = h * s * (0.6 + 0.4 * (1 - abs(xx - x) / (w * s / 2)) ** 0.9) - 8 * s
        v.L([(xx, y), (xx, y + top)], iron, 7 * s, smooth=False)
    for k in range(1, 5):
        yy = y + k * h * s * 0.17
        half = w * s / 2 if yy < y + h * s * 0.6 else (w * s / 2) * max(0.1, 1 - (yy - y - h * s * 0.6) / (h * s * 0.4)) ** 0.6
        v.L([(x - half, yy), (x + half, yy)], iron, 6 * s, smooth=False)
    for k in range(n):
        xx = x - w * s / 2 + 16 * s + k * (w - 32) * s / (n - 1)
        v.P([(xx - 4 * s, y), (xx, y - 14 * s), (xx + 4 * s, y)], iron, ol(iron), 2)               # spike tips at the bottom


# ----------------------------------------------------------------------------------------- windows
def w_arched(v, x, y, s, rng, pal, w=96, h=150, col="#5b7fa6", frame="#e8d8b8"):
    v.S([(x - w * s / 2 - 8 * s, y), (x - w * s / 2 - 8 * s, y + h * s * 0.66), (x, y + h * s + 8 * s), (x + w * s / 2 + 8 * s, y + h * s * 0.66), (x + w * s / 2 + 8 * s, y)],
        shade(v, frame), ol(frame), 4)
    v.S([(x - w * s / 2, y + 4 * s), (x - w * s / 2, y + h * s * 0.64), (x, y + h * s), (x + w * s / 2, y + h * s * 0.64), (x + w * s / 2, y + 4 * s)], v.G([(0, lighten(col, 0.3)), (1, col)]), ol(col), 3)
    v.L([(x, y + 4 * s), (x, y + h * s)], ol(col), 4, smooth=False)
    v.L([(x - w * s / 2, y + h * s * 0.4), (x + w * s / 2, y + h * s * 0.4)], ol(col), 4, smooth=False)


def w_jali(v, x, y, s, rng, pal, w=120, h=140, col="#d8c098"):
    v.R(x - w * s / 2, y, w * s, h * s, "#2a1c14", ol(col), 5, rx=6 * s)
    for i in range(5):
        for j in range(5):
            cx, cy = x - w * s / 2 + (i + 0.5) * w * s / 5, y + (j + 0.5) * h * s / 5
            v.P([(cx, cy - 11 * s), (cx + 11 * s, cy), (cx, cy + 11 * s), (cx - 11 * s, cy)], col, ol(col), 2)
    v.R(x - w * s / 2 - 8 * s, y - 10 * s, w * s + 16 * s, 12 * s, shade(v, col), ol(col), 3, rx=4 * s)


def w_round(v, x, y, s, rng, pal, r=60, col="#5b7fa6"):
    v.E(x, y + r * s, r * s + 9 * s, fill=shade(v, "#e8d8b8"), stroke=ol("#e8d8b8"), sw=4)
    v.E(x, y + r * s, r * s, fill=v.G([(0, lighten(col, 0.3)), (1, col)]), stroke=ol(col), sw=3)
    v.L([(x - r * s, y + r * s), (x + r * s, y + r * s)], ol(col), 3, smooth=False)
    v.L([(x, y), (x, y + 2 * r * s)], ol(col), 3, smooth=False)


def w_shutters(v, x, y, s, rng, pal, w=100, h=120, col="#4a8a5a"):
    v.R(x - w * s / 2, y, w * s, h * s, "#2a3a4a", ol("#2a3a4a"), 4)
    v.L([(x, y), (x, y + h * s)], "#8ab0c8", 3, 0.6, smooth=False)
    for sgn in (-1, 1):
        x0 = x + sgn * (w * s / 2 + 12 * s)
        v.R(x0 - 12 * s, y - 4 * s, 24 * s, h * s + 8 * s, shade(v, col), ol(col), 3)
        for k in range(1, 7):
            v.L([(x0 - 9 * s, y + k * h * s / 7), (x0 + 9 * s, y + k * h * s / 7)], darken(col, 0.3), 2, 0.8, smooth=False)


def w_slit(v, x, y, s, rng, pal, w=34, h=130):
    v.S([(x - w * s / 2, y), (x - w * s / 2, y + h * s * 0.85), (x, y + h * s), (x + w * s / 2, y + h * s * 0.85), (x + w * s / 2, y)], "#10141a", "#6a6258", 5)


def w_barred(v, x, y, s, rng, pal, w=100, h=110):
    v.R(x - w * s / 2, y, w * s, h * s, "#1c242c", ol("#b0a58a"), 5, rx=4 * s)
    for k in range(5):
        v.L([(x - w * s / 2 + (k + 0.5) * w * s / 5, y), (x - w * s / 2 + (k + 0.5) * w * s / 5, y + h * s)], "#4a4a52", 5 * s, smooth=False)


def w_triple(v, x, y, s, rng, pal, w=330, h=170):
    for k in range(3):
        w_arched(v, x + (k - 1) * w * s / 3, y, s, rng, pal, w=w / 3 - 22, h=h * (1.12 if k == 1 else 1.0), col="#8ab0d0", frame="#f0e0c0")
    v.R(x - w * s / 2 - 10 * s, y - 10 * s, w * s + 20 * s, 14 * s, shade(v, "#f0e0c0"), ol("#f0e0c0"), 3)


def w_jharokha(v, x, y, s, rng, pal, w=170, h=190):
    st = "#e8d0a0"
    v.R(x - w * s / 2, y, w * s, 26 * s, shade(v, st), ol(st), 4, rx=4 * s)
    for sgn in (-1, 1):
        v.R(x + sgn * w * s * 0.42 - 8 * s, y + 26 * s, 16 * s, h * s * 0.8, shade(v, st), ol(st), 3)
    w_arched(v, x, y + 30 * s, s * 0.8, rng, pal, w=w * 0.6, h=h * 0.7, col="#6a4a3a", frame="#e8d0a0")
    v.S([(x - w * s / 2 - 8 * s, y + h * s * 0.78), (x - w * s * 0.35, y + h * s * 0.98), (x, y + h * s * 1.1), (x + w * s * 0.35, y + h * s * 0.98), (x + w * s / 2 + 8 * s, y + h * s * 0.78)],
        shade(v, "#c0392b"), ol("#c0392b"), 4)


def _reg_openings():
    O = "opening"
    reg = lambda cid, name, fn, tags, pal=None, **kw: register(O, cid, name, fn, pal, tags, **kw)
    reg("door-arched", "Arched wooden door", d_arched, ["door", "house"])
    reg("door-plank", "Plank door", d_plank, ["door", "village", "hut"])
    reg("door-double", "Double door", d_double, ["door", "house", "merchant"])
    reg("door-temple", "Carved temple door", d_temple, ["door", "temple"])
    reg("door-iron-gate", "Iron-barred gate", d_gate, ["door", "gate", "fort", "palace"])
    reg("door-curtain", "Curtained doorway", d_curtain, ["door", "palace", "tent", "shop"])
    reg("door-moon-gate", "Round moon gate", d_moon, ["door", "garden", "monastery"])
    reg("door-hut-low", "Low hut doorway", d_hut_low, ["door", "hut", "village"])
    reg("door-palace-great", "Great palace door", d_palace, ["door", "palace", "court"])
    reg("door-stable", "Stable half-door", d_stable, ["door", "stable", "shed", "farm"])
    reg("door-trellis", "Trellis garden door", d_trellis, ["door", "garden"])
    reg("door-portcullis", "Portcullis gate", d_portcullis, ["door", "fort", "dark"])
    reg("window-arched", "Arched window", w_arched, ["window", "house", "palace"])
    reg("window-jali", "Lattice (jali) window", w_jali, ["window", "palace", "haveli"])
    reg("window-round", "Round window", w_round, ["window", "house"])
    reg("window-shutters", "Shuttered window", w_shutters, ["window", "village", "house"])
    reg("window-slit", "Arrow slit", w_slit, ["window", "fort", "dark"])
    reg("window-barred", "Barred window", w_barred, ["window", "prison", "dark", "storage"])
    reg("window-triple", "Triple arched window", w_triple, ["window", "palace", "court"])
    reg("window-jharokha", "Jharokha balcony window", w_jharokha, ["window", "haveli", "palace"])


# ------------------------------------------------------------------------------------------ buildings
def bd_hut(v, x, y, s, rng, pal, w=330, h=190, wall="#c9a070", roof="#c8a850", kind="gable", veranda=False, stilts=False, round_=False):
    base = y + (90 * s if stilts else 0)
    if stilts:
        for dx in (-0.4, -0.13, 0.13, 0.4):
            v.R(x + dx * w * s - 8 * s, y, 16 * s, 100 * s, shade(v, "#8a5a33"), ol("#8a5a33"), 3)
    if round_:
        v.S([(x - w * s / 2, base), (x - w * s / 2 - 4 * s, base + h * s * 0.7), (x - w * s / 2, base + h * s), (x + w * s / 2, base + h * s), (x + w * s / 2 + 4 * s, base + h * s * 0.7), (x + w * s / 2, base)],
            shade(v, wall), ol(wall), 6)
        v.P([(x - w * s / 2 - 36 * s, base + h * s - 8 * s), (x, base + (h + 190) * s), (x + w * s / 2 + 36 * s, base + h * s - 8 * s)], shade(v, roof), ol(roof), 6)
        for k in range(6):
            v.L([(x - w * s / 2 - 36 * s + k * (w * s + 72 * s) / 5, base + h * s - 8 * s), (x, base + (h + 190) * s)], darken(roof, 0.25), 3, 0.7, smooth=False)
        _use(v, "door-hut-low", x, base, s * 0.85)
        return
    _wallbox(v, x, base, w, h, wall, s, 8)
    rise = 150 if kind == "gable" else 90
    v.P([(x - w * s / 2 - 34 * s, base + h * s - 6 * s), (x - w * s * 0.1, base + (h + rise) * s), (x + w * s * 0.1, base + (h + rise) * s), (x + w * s / 2 + 34 * s, base + h * s - 6 * s)],
        shade(v, roof), ol(roof), 6)
    for k in range(7):
        t = k / 6
        v.L([(x - w * s / 2 - 34 * s + t * (w * s + 68 * s), base + h * s - 4 * s), (x - w * s * 0.1 + t * w * s * 0.2, base + (h + rise) * s - 3 * s)], darken(roof, 0.28), 3, 0.7, smooth=False)
    _use(v, "door-plank" if veranda is False else "door-hut-low", x - w * s * 0.12, base, s * 0.75)
    _use(v, "window-shutters", x + w * s * 0.26, base + h * s * 0.38, s * 0.7)
    if veranda:
        v.R(x - w * s / 2 - 40 * s, base, w * s + 80 * s, 14 * s, shade(v, "#8a5a33"), ol("#8a5a33"), 3)
        for dx in (-0.5, 0.5):
            v.R(x + dx * w * s - 6 * s, base, 12 * s, h * s * 0.9, shade(v, "#8a5a33"), ol("#8a5a33"), 3)


def bd_house(v, x, y, s, rng, pal, w=420, h=250, wall="#f0e0c0", roof="#b8503a", floors=1, chimney=False, sign=None, balcony=False):
    fh = h * s
    for f in range(floors):
        _wallbox(v, x, y + f * fh, w, h, wall, s, 6)
        if f:
            _band(v, x, y + f * fh - 6 * s, w + 16, darken(wall, 0.12), s, 14)
    top = y + floors * fh
    v.P([(x - w * s / 2 - 30 * s, top - 4 * s), (x - w * s * 0.18, top + 120 * s), (x + w * s * 0.18, top + 120 * s), (x + w * s / 2 + 30 * s, top - 4 * s)], shade(v, roof), ol(roof), 6)
    for k in range(5):
        yy = top + k * 22 * s
        v.L([(x - w * s * (0.52 - k * 0.07), yy), (x + w * s * (0.52 - k * 0.07), yy)], darken(roof, 0.25), 3, 0.7, smooth=False)
    if chimney:
        v.R(x + w * s * 0.28, top + 30 * s, 44 * s, 120 * s, shade(v, "#b0a58a"), ol("#b0a58a"), 4)
    _use(v, "door-arched", x - w * s * 0.1, y, s * 0.8)
    _use(v, "window-arched", x + w * s * 0.26, y + 70 * s, s * 0.7)
    _use(v, "window-arched", x - w * s * 0.34, y + 70 * s, s * 0.7)
    if floors > 1:
        for dx in (-0.3, 0.0, 0.3):
            _use(v, "window-shutters" if dx else "window-arched", x + dx * w * s, y + fh + 70 * s, s * 0.7)
    if balcony:
        v.R(x - w * s * 0.42, y + fh - 4 * s, w * s * 0.84, 14 * s, shade(v, "#8a5a33"), ol("#8a5a33"), 3)
        for k in range(10):
            v.R(x - w * s * 0.4 + k * w * s * 0.088, y + fh + 8 * s, 6 * s, 48 * s, "#8a5a33", None, 0)
    if sign:
        v.R(x + w * s * 0.1, y + h * s * 0.75, 110 * s, 54 * s, shade(v, sign), ol(sign), 3, rx=4 * s)


def bd_haveli(v, x, y, s, rng, pal, w=620, floors=3, domes=True):
    wall, accent = "#f6e0b0", "#c0392b"
    fh = 190 * s
    for f in range(floors):
        _wallbox(v, x, y + f * fh, w * (1 - f * 0.06), 190, wall, s, 4)
        _band(v, x, y + (f + 1) * fh - 14 * s, w * (1 - f * 0.06) + 20, accent, s, 16)
        for k in range(5):
            cx = x + (k - 2) * w * s * 0.19 * (1 - f * 0.06)
            if f == 0 and k == 2:
                _use(v, "door-palace-great", cx, y, s * 0.42)
            elif f == 1 and k == 2:
                _use(v, "window-jharokha", cx, y + fh + 6 * s, s * 0.7)
            else:
                _use(v, "window-arched" if k % 2 else "window-jali", cx, y + f * fh + 40 * s, s * 0.62)
    top = y + floors * fh
    if domes:
        for dx in (-0.38, 0.38, 0):
            r = 54 if dx else 76
            v.R(x + dx * w * s * 0.9 - r * s, top, r * 2 * s, 14 * s, shade(v, wall), ol(wall), 3)
            for pxx in (-1, 1):
                v.R(x + dx * w * s * 0.9 + pxx * r * s * 0.8 - 5 * s, top + 14 * s, 10 * s, 68 * s, shade(v, wall), ol(wall), 3)
            v.S([(x + dx * w * s * 0.9 - r * s, top + 80 * s), (x + dx * w * s * 0.9 - r * s * 0.95, top + 130 * s), (x + dx * w * s * 0.9, top + (80 + r * 1.9) * s),
                 (x + dx * w * s * 0.9 + r * s * 0.95, top + 130 * s), (x + dx * w * s * 0.9 + r * s, top + 80 * s)], shade(v, "#e8c860" if dx else "#f6ecd0"), ol("#c0a040"), 4)
            v.L([(x + dx * w * s * 0.9, top + (80 + r * 1.9) * s), (x + dx * w * s * 0.9, top + (80 + r * 1.9 + 34) * s)], "#c0a040", 4, smooth=False)


def bd_shikhara(v, x, y, s, rng, pal, w=360, h=620):
    st = "#e8c898"
    _wallbox(v, x, y, w * 0.8, 150, st, s, 4)
    v.R(x - w * s * 0.5, y, w * s, 40 * s, shade(v, darken(st, 0.1)), ol(st), 4)
    _use(v, "door-temple", x, y + 40 * s, s * 0.45)
    pts = [(x - w * s * 0.36, y + 150 * s), (x - w * s * 0.32, y + h * s * 0.45), (x - w * s * 0.2, y + h * s * 0.8), (x, y + h * s), (x + w * s * 0.2, y + h * s * 0.8), (x + w * s * 0.32, y + h * s * 0.45), (x + w * s * 0.36, y + 150 * s)]
    v.S(pts, shade(v, st), ol(st), 6)
    for k in range(1, 8):
        t = k / 8
        half = w * s * 0.36 * (1 - t * 0.85)
        v.L([(x - half, y + 150 * s + t * (h - 150) * s * 0.92), (x + half, y + 150 * s + t * (h - 150) * s * 0.92)], darken(st, 0.3), 4, 0.7, smooth=False)
    v.E(x, y + h * s * 0.98, 30 * s, 12 * s, fill=shade(v, st), stroke=ol(st), sw=4)
    v.L([(x, y + h * s), (x, y + (h + 80) * s)], "#c0a040", 5, smooth=False)
    v.P([(x, y + (h + 80) * s), (x + 60 * s, y + (h + 64) * s), (x, y + (h + 48) * s)], "#e8602a", None, 0)


def bd_gopuram(v, x, y, s, rng, pal, w=420, tiers=6):
    cols = ["#d8a870", "#c0583a", "#e8c860", "#8a9ad0", "#d8a870", "#c0583a"]
    th = 90 * s
    for k in range(tiers):
        ww = w * s * (1 - k * 0.12)
        _wallbox(v, x, y + k * th, ww / s, 90, cols[k % len(cols)], s, 4)
        v.R(x - ww / 2 - 10 * s, y + k * th + 84 * s, ww + 20 * s, 12 * s, shade(v, "#f0e0b8"), ol("#f0e0b8"), 3, rx=3 * s)
        for j in range(5 - k // 2):
            v.E(x + (j - (4 - k // 2) / 2) * ww / (5 - k // 2) * 0.9, y + k * th + 44 * s, 14 * s, 22 * s, fill="#fff0d0", stroke=ol("#d8a870"), sw=2)
    top = y + tiers * th
    v.S([(x - w * s * 0.2, top), (x - w * s * 0.14, top + 70 * s), (x, top + 110 * s), (x + w * s * 0.14, top + 70 * s), (x + w * s * 0.2, top)], shade(v, "#e8c860"), ol("#c0a040"), 4)
    for dx in (-0.1, 0, 0.1):
        v.E(x + dx * w * s, top + 120 * s, 8 * s, 14 * s, fill="#e8c860", stroke=ol("#c0a040"), sw=2)
    _use(v, "door-temple", x, y, s * 0.55)


def bd_shrine(v, x, y, s, rng, pal, w=200, h=200):
    st = "#d8c8a8"
    v.R(x - w * s * 0.6, y, w * s * 1.2, 24 * s, shade(v, darken(st, 0.1)), ol(st), 4)
    for dx in (-0.4, 0.4):
        v.R(x + dx * w * s - 10 * s, y + 24 * s, 20 * s, 130 * s, shade(v, st), ol(st), 4)
    v.P([(x - w * s * 0.55, y + 154 * s), (x, y + (h + 80) * s), (x + w * s * 0.55, y + 154 * s)], shade(v, "#c0583a"), ol("#c0583a"), 5)
    v.S([(x - 36 * s, y + 24 * s), (x - 30 * s, y + 90 * s), (x, y + 110 * s), (x + 30 * s, y + 90 * s), (x + 36 * s, y + 24 * s)], "#3a2418", None, 0, 0.9)
    v.E(x, y + 60 * s, 18 * s, 24 * s, fill="#e8602a", stroke=ol("#e8602a"), sw=3)
    v.glow(x, y + 60 * s, 70 * s, "#ffb040", 0.6)


def bd_stupa(v, x, y, s, rng, pal, w=480):
    wh = "#f6f0e0"
    v.R(x - w * s / 2, y, w * s, 40 * s, shade(v, "#e0d4b8"), ol("#e0d4b8"), 5, rx=4 * s)
    v.R(x - w * s * 0.42, y + 40 * s, w * s * 0.84, 30 * s, shade(v, "#e0d4b8"), ol("#e0d4b8"), 5, rx=4 * s)
    v.S([(x - w * s * 0.4, y + 70 * s), (x - w * s * 0.4, y + 150 * s), (x - w * s * 0.2, y + 290 * s), (x, y + 330 * s), (x + w * s * 0.2, y + 290 * s), (x + w * s * 0.4, y + 150 * s), (x + w * s * 0.4, y + 70 * s)],
        shade(v, wh), ol("#c8b898"), 6)
    v.R(x - 56 * s, y + 326 * s, 112 * s, 44 * s, shade(v, "#e8c860"), ol("#c0a040"), 4)
    for k in range(5):
        v.R(x - (48 - k * 8) * s, y + (370 + k * 18) * s, (96 - k * 16) * s, 14 * s, shade(v, "#e8c860"), ol("#c0a040"), 3, rx=3 * s)
    v.L([(x, y + 462 * s), (x, y + 520 * s)], "#c0a040", 5, smooth=False)
    for k in range(-3, 4):
        v.L([(x + k * 64 * s, y + 300 * s), (x + k * 94 * s, y + 360 * s)], "#e85a3a", 4, 0.85, smooth=False)
        v.P([(x + k * 94 * s, y + 360 * s), (x + k * 94 * s + 12 * s, y + 340 * s), (x + k * 94 * s - 12 * s, y + 340 * s)], ["#e85a3a", "#e8c030", "#3a8ad8"][k % 3], None, 0)


def bd_monastery(v, x, y, s, rng, pal, w=560, tiers=3):
    for k in range(tiers):
        ww = w * (1 - k * 0.2)
        by = y + k * 190 * s
        _wallbox(v, x, by, ww, 120, "#e8d8b0" if k % 2 else "#c8a070", s, 4)
        v.P([(x - ww * s / 2 - 70 * s, by + 120 * s), (x - ww * s * 0.3, by + 190 * s), (x + ww * s * 0.3, by + 190 * s), (x + ww * s / 2 + 70 * s, by + 120 * s)], shade(v, "#b0402a"), ol("#b0402a"), 6)
        v.L([(x - ww * s / 2 - 70 * s, by + 120 * s), (x - ww * s / 2 - 90 * s, by + 136 * s)], "#e8c030", 6)
        v.L([(x + ww * s / 2 + 70 * s, by + 120 * s), (x + ww * s / 2 + 90 * s, by + 136 * s)], "#e8c030", 6)
        for j in range(4 - k):
            _use(v, "window-arched", x + (j - (3 - k) / 2) * ww * s / (4 - k) * 0.7, by + 26 * s, s * 0.5, col="#6a4a3a")
    _use(v, "door-moon-gate" if False else "door-temple", x, y, s * 0.4)
    v.E(x, y + tiers * 190 * s + 40 * s, 26 * s, 36 * s, fill="#e8c860", stroke=ol("#c0a040"), sw=4)


def bd_mandapa(v, x, y, s, rng, pal, w=520, h=280, col="#e8d8b0"):
    """An open pillared hall with a flat roof."""
    v.R(x - w * s / 2 - 20 * s, y, w * s + 40 * s, 30 * s, shade(v, darken(col, 0.1)), ol(col), 4)
    n = 6
    for k in range(n):
        px = x - w * s / 2 + k * w * s / (n - 1)
        v.R(px - 18 * s, y + 30 * s, 36 * s, h * s - 30 * s, shade(v, col), ol(col), 4, rx=6 * s)
        v.R(px - 26 * s, y + 30 * s, 52 * s, 20 * s, shade(v, darken(col, 0.1)), ol(col), 3, rx=4 * s)
        v.R(px - 26 * s, y + h * s - 24 * s, 52 * s, 26 * s, shade(v, darken(col, 0.1)), ol(col), 3, rx=4 * s)
    v.R(x - w * s / 2 - 36 * s, y + h * s, w * s + 72 * s, 34 * s, shade(v, "#c8a070"), ol("#c8a070"), 5, rx=6 * s)
    v.P([(x - w * s / 2 - 36 * s, y + (h + 34) * s), (x - w * s * 0.3, y + (h + 120) * s), (x + w * s * 0.3, y + (h + 120) * s), (x + w * s / 2 + 36 * s, y + (h + 34) * s)], shade(v, "#b0402a"), ol("#b0402a"), 6)


def bd_palace(v, x, y, s, rng, pal, w=860):
    wall = "#f6e8c8"
    _wallbox(v, x, y, w, 300, wall, s, 6)
    for sgn in (-1, 1):
        _wallbox(v, x + sgn * w * s * 0.38, y, w * 0.24, 400, "#f0dcb0", s, 4)
        v.S([(x + sgn * w * s * 0.38 - 80 * s, y + 400 * s), (x + sgn * w * s * 0.38 - 70 * s, y + 470 * s), (x + sgn * w * s * 0.38, y + 560 * s), (x + sgn * w * s * 0.38 + 70 * s, y + 470 * s),
             (x + sgn * w * s * 0.38 + 80 * s, y + 400 * s)], shade(v, "#e8c860"), ol("#c0a040"), 5)
        _use(v, "window-arched", x + sgn * w * s * 0.38, y + 170 * s, s * 0.9)
    v.S([(x - 150 * s, y + 300 * s), (x - 150 * s, y + 400 * s), (x - 90 * s, y + 520 * s), (x, y + 600 * s), (x + 90 * s, y + 520 * s), (x + 150 * s, y + 400 * s), (x + 150 * s, y + 300 * s)],
        shade(v, "#f8f2e0"), ol("#c8b898"), 6)
    v.L([(x, y + 600 * s), (x, y + 680 * s)], "#c0a040", 5, smooth=False)
    v.E(x, y + 600 * s, 10 * s, fill="#e8c860", stroke=ol("#c0a040"), sw=2)
    _use(v, "door-palace-great", x, y, s * 0.7)
    for k in (-2, -1, 1, 2):
        if abs(k) == 1:
            _use(v, "window-triple", x + k * w * s * 0.17, y + 150 * s, s * 0.5)
    for k in range(-5, 6):
        v.R(x + k * 34 * s - 12 * s, y + 296 * s, 24 * s, 28 * s, shade(v, wall), ol(wall), 3, rx=3 * s)


def bd_darwaza(v, x, y, s, rng, pal, w=520, h=520):
    st = "#d8c098"
    for sgn in (-1, 1):
        _wallbox(v, x + sgn * w * s * 0.36, y, w * 0.28, h, st, s, 4)
        v.S([(x + sgn * w * s * 0.36 - 64 * s, y + h * s), (x + sgn * w * s * 0.36 - 56 * s, y + (h + 56) * s), (x + sgn * w * s * 0.36, y + (h + 120) * s), (x + sgn * w * s * 0.36 + 56 * s, y + (h + 56) * s),
             (x + sgn * w * s * 0.36 + 64 * s, y + h * s)], shade(v, "#c0583a"), ol("#c0583a"), 5)
    v.R(x - w * s * 0.24, y + h * s * 0.62, w * s * 0.48, h * s * 0.38, shade(v, st), ol(st), 5, rx=4 * s)
    _use(v, "door-iron-gate", x, y, s * 0.9, w=w * 0.4, h=h * 0.62)
    for k in range(5):
        v.E(x + (k - 2) * 56 * s, y + h * s * 0.8, 12 * s, 18 * s, fill="#f0e0b8", stroke=ol(st), sw=2)


def bd_fortgate(v, x, y, s, rng, pal, w=560, h=470):
    st = "#9a8a78"
    for sgn in (-1, 1):
        v.S([(x + sgn * w * s * 0.5, y), (x + sgn * w * s * 0.5, y + h * s * 1.1), (x + sgn * w * s * 0.26, y + h * s * 1.1), (x + sgn * w * s * 0.26, y)], shade(v, st), ol(st), 6)
        v.R(x + sgn * w * s * 0.38 - 52 * s, y + h * s * 1.1 - 4 * s, 104 * s, 34 * s, shade(v, darken(st, 0.1)), ol(st), 4)
        for k in range(3):
            v.R(x + sgn * w * s * 0.38 - 48 * s + k * 40 * s, y + h * s * 1.1 + 30 * s, 26 * s, 36 * s, shade(v, st), ol(st), 3)
        _use(v, "window-slit", x + sgn * w * s * 0.38, y + h * s * 0.6, s * 0.7)
    v.R(x - w * s * 0.26, y + h * s * 0.74, w * s * 0.52, h * s * 0.36, shade(v, st), ol(st), 6)
    _use(v, "door-portcullis", x, y, s * 1.0, w=w * 0.42, h=h * 0.74)
    for k in range(5):
        v.R(x - w * s * 0.26 + k * w * s * 0.11, y + h * s * 1.1, 34 * s, 36 * s, shade(v, st), ol(st), 3)


def bd_tower(v, x, y, s, rng, pal, w=200, h=620, st="#a89a86"):
    v.R(x - w * s / 2, y, w * s, h * s, v.G([(0, lighten(st, 0.12)), (1, darken(st, 0.08))], False), ol(st), 6)
    for k in range(1, 6):
        v.L([(x - w * s / 2, y + k * h * s / 6), (x + w * s / 2, y + k * h * s / 6)], darken(st, 0.25), 3, 0.5, smooth=False)
    v.R(x - w * s * 0.62, y + h * s, w * s * 1.24, 28 * s, shade(v, darken(st, 0.1)), ol(st), 5)
    for k in range(4):
        v.R(x - w * s * 0.6 + k * w * s * 0.4, y + h * s + 28 * s, w * s * 0.25, 40 * s, shade(v, st), ol(st), 4)
    _use(v, "window-slit", x, y + h * s * 0.55, s)
    _use(v, "window-slit", x, y + h * s * 0.8, s * 0.8)


def bd_tent(v, x, y, s, rng, pal, w=460, h=300, col="#c0392b", col2="#f0e0b8"):
    v.P([(x - w * s / 2, y), (x - w * s * 0.1, y + h * s), (x + w * s * 0.1, y + h * s), (x + w * s / 2, y)], shade(v, col), ol(col), 6)
    for k in range(-3, 4):
        v.P([(x + k * w * s * 0.07 - 20 * s, y), (x + k * w * s * 0.02, y + h * s * 0.95), (x + k * w * s * 0.07 + 20 * s, y)], col2 if k % 2 == 0 else col, None, 0, 0.9)
    v.S([(x - w * s * 0.1, y), (x - w * s * 0.06, y + h * s * 0.5), (x, y + h * s * 0.58), (x + w * s * 0.06, y + h * s * 0.5), (x + w * s * 0.1, y)], "#2a1810", None, 0, 0.9)
    v.L([(x, y + h * s), (x, y + (h + 50) * s)], "#c0a040", 5, smooth=False)
    v.P([(x, y + (h + 50) * s), (x + 44 * s, y + (h + 38) * s), (x, y + (h + 26) * s)], "#e8602a", None, 0)


def bd_stall(v, x, y, s, rng, pal, w=330, h=230, awning="#c0392b", goods="fruit", wood="#9a6a3a"):
    for dx in (-0.46, 0.46):
        v.R(x + dx * w * s - 7 * s, y, 14 * s, h * s, shade(v, wood), ol(wood), 3)
    v.R(x - w * s / 2, y + 70 * s, w * s, 18 * s, shade(v, wood), ol(wood), 4, rx=3 * s)
    v.R(x - w * s / 2 + 8 * s, y, w * s - 16 * s, 70 * s, shade(v, darken(wood, 0.08)), ol(wood), 4)
    v.P([(x - w * s / 2 - 18 * s, y + h * s), (x - w * s / 2 - 8 * s, y + (h - 70) * s), (x + w * s / 2 + 8 * s, y + (h - 70) * s), (x + w * s / 2 + 18 * s, y + h * s)], shade(v, awning), ol(awning), 5)
    for k in range(7):
        v.P([(x - w * s / 2 - 8 * s + k * (w + 16) * s / 7, y + (h - 70) * s), (x - w * s / 2 - 8 * s + (k + 1) * (w + 16) * s / 7, y + (h - 70) * s),
             (x - w * s / 2 - 8 * s + (k + 0.5) * (w + 16) * s / 7, y + (h - 96) * s)], "#f6ecd8" if k % 2 else awning, ol(awning), 2)
    for k in range(9):
        gx = x - w * s * 0.42 + k * w * s * 0.105
        if goods == "fruit":
            c = ["#d8342a", "#f0a020", "#6bb85a", "#8a3a8a"][k % 4]
            v.E(gx, y + 98 * s, 17 * s, fill=shade(v, c), stroke=ol(c), sw=2)
        elif goods == "veg":
            c = ["#5fae4e", "#e86a2a", "#8a3a8a", "#f2d83a"][k % 4]
            v.E(gx, y + 98 * s, 15 * s, 20 * s, fill=shade(v, c), stroke=ol(c), sw=2)
        elif goods == "cloth":
            c = ["#c0392b", "#3a6ad8", "#e8b030", "#3aa85a", "#8a3a8a"][k % 5]
            v.R(gx - 17 * s, y + 90 * s, 34 * s, 22 * s, shade(v, c), ol(c), 2)
        else:
            c = ["#c8a070", "#e8d8b0", "#9a6a3a"][k % 3]
            v.E(gx, y + 94 * s, 16 * s, 14 * s, fill=shade(v, c), stroke=ol(c), sw=2)
            v.R(gx - 13 * s, y + 70 * s, 26 * s, 24 * s, shade(v, c), ol(c), 2, rx=4 * s)


def bd_shop(v, x, y, s, rng, pal, w=460, h=330, wall="#e8d0a0", sign="#c0392b", jewel=False):
    _wallbox(v, x, y, w, h, wall, s, 6)
    v.P([(x - w * s / 2 - 20 * s, y + h * s), (x - w * s * 0.35, y + (h + 60) * s), (x + w * s * 0.35, y + (h + 60) * s), (x + w * s / 2 + 20 * s, y + h * s)], shade(v, "#b0402a"), ol("#b0402a"), 5)
    v.R(x - w * s * 0.42, y + h * s * 0.62, w * s * 0.84, 64 * s, shade(v, sign), ol(sign), 4, rx=5 * s)
    v.R(x - w * s * 0.4, y, w * s * 0.8, h * s * 0.55, "#2a1c14", ol("#2a1c14"), 4)
    for k in range(5):
        gx = x - w * s * 0.34 + k * w * s * 0.17
        if jewel:
            v.E(gx, y + h * s * 0.3, 13 * s, fill=shade(v, "#e6b93c"), stroke=ol("#e6b93c"), sw=2)
            v.E(gx, y + h * s * 0.3, 6 * s, fill="#d83a58")
        else:
            v.R(gx - 22 * s, y + h * s * 0.12, 44 * s, 50 * s, shade(v, ["#c8a070", "#e8d8b0", "#9a6a3a"][k % 3]), ol("#9a6a3a"), 3, rx=6 * s)
    v.R(x - w * s * 0.44, y + h * s * 0.5, w * s * 0.88, 16 * s, shade(v, "#8a5a33"), ol("#8a5a33"), 4)


def bd_kiln(v, x, y, s, rng, pal, w=300):
    v.S([(x - w * s / 2, y), (x - w * s * 0.42, y + 160 * s), (x - w * s * 0.2, y + 250 * s), (x + w * s * 0.2, y + 250 * s), (x + w * s * 0.42, y + 160 * s), (x + w * s / 2, y)],
        shade(v, "#b86a42"), ol("#b86a42"), 6)
    v.S([(x - 60 * s, y), (x - 60 * s, y + 80 * s), (x, y + 110 * s), (x + 60 * s, y + 80 * s), (x + 60 * s, y)], "#1a1010", None, 0)
    v.glow(x, y + 50 * s, 80 * s, "#ff9a30", 0.7)
    for k in range(4):
        v.L([(x - w * s * 0.4 + k * 4 * s, y + 40 * s + k * 52 * s), (x + w * s * 0.4 - k * 4 * s, y + 40 * s + k * 52 * s)], darken("#b86a42", 0.3), 4, 0.6)
    for dx, h in ((-0.9, 80), (-0.7, 54), (0.8, 70)):
        v.S([(x + dx * w * s * 0.5 - 30 * s, y), (x + dx * w * s * 0.5 - 38 * s, y + h * s * 0.6), (x + dx * w * s * 0.5 - 14 * s, y + h * s), (x + dx * w * s * 0.5 + 14 * s, y + h * s),
             (x + dx * w * s * 0.5 + 38 * s, y + h * s * 0.6), (x + dx * w * s * 0.5 + 30 * s, y)], shade(v, "#c97a42"), ol("#c97a42"), 4)


def bd_smithy(v, x, y, s, rng, pal, w=420):
    for dx in (-0.48, 0.48):
        v.R(x + dx * w * s - 10 * s, y, 20 * s, 250 * s, shade(v, "#7a5230"), ol("#7a5230"), 4)
    v.P([(x - w * s / 2 - 20 * s, y + 250 * s), (x - w * s * 0.3, y + 340 * s), (x + w * s * 0.3, y + 340 * s), (x + w * s / 2 + 20 * s, y + 250 * s)], shade(v, "#6a5a4a"), ol("#6a5a4a"), 6)
    v.R(x - 110 * s, y, 160 * s, 100 * s, shade(v, "#6a6a72"), ol("#6a6a72"), 5, rx=8 * s)
    v.glow(x - 30 * s, y + 90 * s, 110 * s, "#ff8a30", 0.7)
    v.E(x - 30 * s, y + 92 * s, 60 * s, 16 * s, fill="#ff9a40")
    v.R(x + 120 * s, y, 56 * s, 70 * s, shade(v, "#3a3a42"), ol("#3a3a42"), 4)
    v.P([(x + 100 * s, y + 70 * s), (x + 196 * s, y + 70 * s), (x + 176 * s, y + 98 * s), (x + 120 * s, y + 98 * s)], shade(v, "#5a5a62"), ol("#5a5a62"), 4)
    v.L([(x - 190 * s, y + 160 * s), (x - 190 * s, y + 220 * s)], "#3a3a42", 6)
    v.L([(x - 150 * s, y + 170 * s), (x - 150 * s, y + 224 * s)], "#3a3a42", 6)


def bd_well(v, x, y, s, rng, pal, w=240, roof=True):
    st = "#b0a58a"
    v.R(x - w * s / 2, y, w * s, 110 * s, shade(v, st), ol(st), 6, rx=10 * s)
    for k in range(1, 3):
        v.L([(x - w * s / 2 + 8 * s, y + k * 36 * s), (x + w * s / 2 - 8 * s, y + k * 36 * s)], darken(st, 0.3), 3, 0.6, smooth=False)
    v.E(x, y + 110 * s, w * s / 2, 20 * s, fill="#1c2a3a", stroke=ol(st), sw=5)
    if roof:
        for dx in (-0.4, 0.4):
            v.R(x + dx * w * s - 6 * s, y + 110 * s, 12 * s, 180 * s, shade(v, "#7a5230"), ol("#7a5230"), 3)
        v.P([(x - w * s * 0.62, y + 290 * s), (x, y + 360 * s), (x + w * s * 0.62, y + 290 * s)], shade(v, "#b0402a"), ol("#b0402a"), 5)
        v.L([(x, y + 290 * s), (x, y + 150 * s)], "#6a5a4a", 3)
        v.R(x - 14 * s, y + 126 * s, 28 * s, 30 * s, shade(v, "#8a5a33"), ol("#8a5a33"), 3, rx=4 * s)


def bd_shed(v, x, y, s, rng, pal, w=520, h=230):
    for dx in (-0.48, -0.16, 0.16, 0.48):
        v.R(x + dx * w * s - 8 * s, y, 16 * s, h * s, shade(v, "#7a5230"), ol("#7a5230"), 3)
    v.P([(x - w * s / 2 - 30 * s, y + h * s), (x - w * s * 0.3, y + (h + 70) * s), (x + w * s * 0.3, y + (h + 70) * s), (x + w * s / 2 + 30 * s, y + h * s)], shade(v, "#c8a850"), ol("#c8a850"), 5)
    v.R(x - w * s * 0.42, y, w * s * 0.84, 50 * s, shade(v, "#9a6a3a"), ol("#9a6a3a"), 4)
    for k in range(6):
        v.E(x - w * s * 0.35 + k * w * s * 0.14, y + 64 * s, 30 * s, 20 * s, fill="#e8c860", stroke=ol("#c0a040"), sw=2)


def bd_bridge(v, x, y, s, rng, pal, w=760, stone=False):
    col = "#b0a58a" if stone else "#9a6a3a"
    if stone:
        half = w * s / 2
        deck = 54 * s
        # body of the bridge: two end masses and the roadway slab
        v.R(x - half, y, w * s, 150 * s, shade(v, col), ol(col), 6, rx=6 * s)
        v.R(x - half - 10 * s, y + 150 * s, w * s + 20 * s, deck, shade(v, lighten(col, 0.1)), ol(col), 6, rx=6 * s)
        v.R(x - half - 4 * s, y + 150 * s + deck - 6 * s, w * s + 8 * s, 12 * s, lighten(col, 0.18), ol(col), 3)         # coping
        for k in range(9):                                                                                               # parapet posts
            v.R(x - half + 6 * s + k * (w * s - 24 * s) / 8, y + 150 * s + deck + 4 * s, 16 * s, 26 * s, shade(v, col), ol(col), 3)
        for k in range(1, 7):                                                                                            # stone courses
            v.L([(x - half + 4 * s, y + k * 21 * s), (x + half - 4 * s, y + k * 21 * s)], darken(col, 0.28), 3, 0.55, smooth=False)
        for cx, r, hh in ((-0.3, 0.105, 16), (0.0, 0.15, 16), (0.3, 0.105, 16)):                                            # three arches
            xc, rr, h0 = x + cx * w * s, r * w * s, hh * s
            v.D(f"M {xc - rr:.1f} {y:.1f} L {xc - rr:.1f} {y + h0:.1f} C {xc - rr:.1f} {y + h0 + rr * 1.35:.1f} {xc + rr:.1f} {y + h0 + rr * 1.35:.1f} {xc + rr:.1f} {y + h0:.1f} L {xc + rr:.1f} {y:.1f} Z",
                "#2a3a4a", ol(col), 6)
            v.D(f"M {xc - rr - 12 * s:.1f} {y + h0:.1f} C {xc - rr - 12 * s:.1f} {y + h0 + rr * 1.5:.1f} {xc + rr + 12 * s:.1f} {y + h0 + rr * 1.5:.1f} {xc + rr + 12 * s:.1f} {y + h0:.1f}",
                None, lighten(col, 0.2), 9)
    else:
        v.S([(x - w * s / 2, y + 70 * s), (x - w * s * 0.2, y + 110 * s), (x + w * s * 0.2, y + 110 * s), (x + w * s / 2, y + 70 * s), (x + w * s * 0.2, y + 86 * s), (x - w * s * 0.2, y + 86 * s)], shade(v, col), ol(col), 6)
        for k in range(12):
            v.R(x - w * s / 2 + k * w * s / 12 + 3 * s, y + 80 * s, w * s / 12 - 4 * s, 12 * s, "#7a5230", None, 0)
        for k in range(8):
            v.R(x - w * s * 0.46 + k * w * s * 0.131, y + 90 * s, 12 * s, 72 * s, shade(v, col), ol(col), 3)
        v.L([(x - w * s * 0.46, y + 150 * s), (x + w * s * 0.46, y + 150 * s)], ol(col), 9, smooth=False)
        v.L([(x - w * s * 0.46, y + 150 * s), (x + w * s * 0.46, y + 150 * s)], col, 6, smooth=False)


def _reg_buildings():
    B = "building"
    reg = lambda cid, name, fn, tags, pal=None, **kw: register(B, cid, name, fn, pal, tags, **kw)
    reg("bld-mud-hut", "Mud hut", bd_hut, ["building", "hut", "village", "house"])
    reg("bld-thatched-hut", "Thatched hut", bd_hut, ["building", "hut", "village", "house"], wall="#d8b88a", roof="#c8a040", kind="flat")
    reg("bld-hut-veranda", "Hut with veranda", bd_hut, ["building", "hut", "village", "house"], wall="#e0c090", roof="#b88a3a", veranda=True, w=400)
    reg("bld-round-hut", "Round hut with conical roof", bd_hut, ["building", "hut", "village", "ashram"], round_=True, w=280, wall="#d8b080", roof="#c8a040")
    reg("bld-stilt-hut", "Bamboo hut on stilts", bd_hut, ["building", "hut", "forest", "house"], wall="#c8b070", roof="#9aa850", stilts=True, kind="gable", w=300)
    reg("bld-village-house", "Tiled village house", bd_house, ["building", "house", "village"])
    reg("bld-whitewash-house", "Whitewashed house with chimney", bd_house, ["building", "house", "village"], wall="#fbf6ea", roof="#a84632", chimney=True)
    reg("bld-two-storey", "Two-storey house", bd_house, ["building", "house", "market", "merchant"], wall="#ecd8a8", roof="#8a4a3a", floors=2, balcony=True, w=460)
    reg("bld-merchant-house", "Merchant's house with sign", bd_house, ["building", "house", "merchant", "market"], wall="#f0d0a0", roof="#7a3a2a", floors=2, sign="#c0392b", w=500)
    reg("bld-haveli", "Haveli mansion", bd_haveli, ["building", "haveli", "mansion", "merchant", "house"])
    reg("bld-mansion-domes", "Mansion with domes", bd_haveli, ["building", "mansion", "palace", "haveli"], floors=2, w=720)
    reg("bld-shikhara-temple", "Shikhara temple", bd_shikhara, ["building", "temple"])
    reg("bld-gopuram", "Gopuram temple tower", bd_gopuram, ["building", "temple", "south"])
    reg("bld-shrine", "Village shrine", bd_shrine, ["building", "temple", "shrine", "village"])
    reg("bld-stupa", "Buddhist stupa", bd_stupa, ["building", "temple", "buddhist", "monastery"])
    reg("bld-monastery", "Tiered monastery", bd_monastery, ["building", "monastery", "buddhist", "mountain"])
    reg("bld-mandapa", "Pillared mandapa hall", bd_mandapa, ["building", "temple", "hall", "assembly"])
    reg("bld-palace", "Palace facade with domes", bd_palace, ["building", "palace", "court"])
    reg("bld-darwaza", "Palace gateway (darwaza)", bd_darwaza, ["building", "palace", "gate"])
    reg("bld-fort-gate", "Fort gate with bastions", bd_fortgate, ["building", "fort", "gate", "dark"])
    reg("bld-watchtower", "Stone watchtower", bd_tower, ["building", "fort", "tower"])
    reg("bld-royal-tent", "Royal striped tent", bd_tent, ["building", "tent", "palace", "festival", "camp"])
    reg("bld-caravan-tent", "Caravan tent", bd_tent, ["building", "tent", "desert", "camp"], col="#b8863a", col2="#e8d0a0", w=400, h=240)
    reg("bld-fruit-stall", "Fruit stall", bd_stall, ["building", "stall", "market", "fruit"], goods="fruit")
    reg("bld-veg-stall", "Vegetable stall", bd_stall, ["building", "stall", "market", "vegetable"], goods="veg", awning="#3a8a4a")
    reg("bld-cloth-stall", "Cloth stall", bd_stall, ["building", "stall", "market", "cloth"], goods="cloth", awning="#3a6ad8")
    reg("bld-grocery-stall", "Grocery stall", bd_stall, ["building", "stall", "market", "grocery"], goods="grocery", awning="#d8902a")
    reg("bld-shop", "Shop front", bd_shop, ["building", "shop", "market"])
    reg("bld-jewellery-shop", "Jewellery shop", bd_shop, ["building", "shop", "market", "jewellery"], jewel=True, sign="#3a2a8a", wall="#f0e0c0")
    reg("bld-kiln", "Potter's kiln", bd_kiln, ["building", "potter", "village", "workshop"])
    reg("bld-smithy", "Blacksmith's forge", bd_smithy, ["building", "blacksmith", "village", "workshop"])
    reg("bld-village-well", "Village well with roof", bd_well, ["building", "well", "village"])
    reg("bld-cattle-shed", "Cattle shed", bd_shed, ["building", "shed", "farm", "village"])
    reg("bld-wooden-bridge", "Wooden bridge", bd_bridge, ["building", "bridge", "river"])
    reg("bld-stone-bridge", "Stone arch bridge", bd_bridge, ["building", "bridge", "river", "road"], stone=True)


# ------------------------------------------------------------------------------------------ barriers
def fn_picket(v, x, y, s, rng, pal, w=420, h=120, col="#d8c8a8"):
    for k in range(int(w / 36) + 1):
        px = x - w * s / 2 + k * 36 * s
        v.P([(px - 13 * s, y), (px - 13 * s, y + h * s - 14 * s), (px, y + h * s), (px + 13 * s, y + h * s - 14 * s), (px + 13 * s, y)], shade(v, col), ol(col), 3)
    for yy in (0.25, 0.65):
        v.R(x - w * s / 2 - 6 * s, y + h * s * yy, w * s + 12 * s, 12 * s, shade(v, darken(col, 0.08)), ol(col), 3)


def fn_bamboo(v, x, y, s, rng, pal, w=420, h=150):
    for k in range(int(w / 30) + 1):
        px = x - w * s / 2 + k * 30 * s
        hh = h * s * rng.uniform(0.9, 1.1)
        v.R(px - 9 * s, y, 18 * s, hh, shade(v, "#b8c860"), ol("#8a9a40"), 3, rx=6 * s)
        v.R(px - 9 * s, y + hh * 0.4, 18 * s, 4 * s, "#7a8a30", None, 0)
    for yy in (0.2, 0.68):
        v.L([(x - w * s / 2 - 8 * s, y + h * s * yy), (x + w * s / 2 + 8 * s, y + h * s * yy)], "#6a7a30", 8 * s, smooth=False)


def fn_rail(v, x, y, s, rng, pal, w=480, h=110):
    for k in range(int(w / 140) + 1):
        px = x - w * s / 2 + k * 140 * s
        v.R(px - 9 * s, y, 18 * s, h * s, shade(v, "#8a5a33"), ol("#8a5a33"), 3)
    for yy in (0.3, 0.7):
        v.R(x - w * s / 2, y + h * s * yy, w * s, 12 * s, shade(v, "#9a6a3a"), ol("#9a6a3a"), 3)


def fn_rope(v, x, y, s, rng, pal, w=480, h=90):
    for k in range(4):
        px = x - w * s / 2 + k * w * s / 3
        v.R(px - 8 * s, y, 16 * s, h * s, shade(v, "#7a5230"), ol("#7a5230"), 3)
    for k in range(3):
        x0, x1 = x - w * s / 2 + k * w * s / 3, x - w * s / 2 + (k + 1) * w * s / 3
        v.L([(x0, y + h * s * 0.9), ((x0 + x1) / 2, y + h * s * 0.62), (x1, y + h * s * 0.9)], "#d8c090", 6 * s)


def fn_thorn(v, x, y, s, rng, pal, w=460, h=120):
    for _ in range(int(w / 12)):
        px = x + rng.uniform(-w / 2, w / 2) * s
        v.L([(px, y), (px + rng.uniform(-20, 20) * s, y + rng.uniform(0.4, 1.0) * h * s)], "#6a5a3a", 5 * s, 0.95)
        v.L([(px, y + h * s * 0.4), (px + rng.uniform(-30, 30) * s, y + h * s * 0.7)], "#7a6a4a", 3 * s, 0.9, smooth=False)


def wl_mud(v, x, y, s, rng, pal, w=560, h=150, col="#c49a68"):
    v.S([(x - w * s / 2, y), (x - w * s / 2 + 6 * s, y + h * s), (x + w * s / 2 - 6 * s, y + h * s + 8 * s), (x + w * s / 2, y)], shade(v, col), ol(col), 5)
    v.R(x - w * s / 2 - 6 * s, y + h * s - 6 * s, w * s + 12 * s, 22 * s, shade(v, darken(col, 0.1)), ol(col), 4, rx=8 * s)
    for k in range(5):
        v.L([(x - w * s * 0.4 + k * w * s * 0.2, y + 20 * s), (x - w * s * 0.4 + k * w * s * 0.2 + 12 * s, y + 70 * s)], darken(col, 0.25), 3, 0.5)


def wl_stone(v, x, y, s, rng, pal, w=560, h=170, col="#a9a59c"):
    v.R(x - w * s / 2, y, w * s, h * s, shade(v, col), ol(col), 5, rx=6 * s)
    for r_ in range(int(h / 34)):
        off = (r_ % 2) * 44 * s
        for k in range(int(w / 88) + 1):
            v.R(x - w * s / 2 + k * 88 * s + off, y + r_ * 34 * s, 86 * s, 32 * s, shade(v, mix(col, "#c8c2b4", rng.random() * 0.5)), ol(col, 0.4), 2, rx=4 * s)


def wl_brick(v, x, y, s, rng, pal, w=540, h=150, col="#b8553a"):
    v.R(x - w * s / 2, y, w * s, h * s, shade(v, col), ol(col), 5)
    for r_ in range(int(h / 24)):
        off = (r_ % 2) * 30 * s
        for k in range(int(w / 60) + 1):
            v.R(x - w * s / 2 + k * 60 * s + off, y + r_ * 24 * s, 58 * s, 22 * s, shade(v, mix(col, "#d8704a", rng.random() * 0.5)), ol(col, 0.4), 1.5)
    v.R(x - w * s / 2 - 6 * s, y + h * s, w * s + 12 * s, 16 * s, shade(v, darken(col, 0.1)), ol(col), 3)


def wl_white(v, x, y, s, rng, pal, w=560, h=160):
    v.R(x - w * s / 2, y, w * s, h * s, v.G([(0, "#fffaf0"), (1, "#f0e6d0")]), ol("#d8c8a8", 0.2), 5, rx=4 * s)
    v.R(x - w * s / 2 - 8 * s, y + h * s - 4 * s, w * s + 16 * s, 20 * s, shade(v, "#e8dcc0"), ol("#d8c8a8"), 4, rx=6 * s)
    v.R(x - w * s / 2, y, w * s, 20 * s, "#c0583a", None, 0)


def wl_battlement(v, x, y, s, rng, pal, w=640, h=210, col="#a89a86"):
    v.R(x - w * s / 2, y, w * s, h * s, shade(v, col), ol(col), 6)
    for k in range(int(w / 70) + 1):
        v.R(x - w * s / 2 + k * 70 * s, y + h * s, 42 * s, 44 * s, shade(v, col), ol(col), 5)
    for r_ in range(int(h / 30)):
        v.L([(x - w * s / 2, y + r_ * 30 * s), (x + w * s / 2, y + r_ * 30 * s)], darken(col, 0.25), 3, 0.5, smooth=False)


def wl_balustrade(v, x, y, s, rng, pal, w=520, h=120, col="#f2ead8"):
    v.R(x - w * s / 2, y, w * s, 16 * s, shade(v, col), ol(col), 4)
    v.R(x - w * s / 2, y + h * s - 16 * s, w * s, 16 * s, shade(v, col), ol(col), 4)
    for k in range(int(w / 44) + 1):
        px = x - w * s / 2 + 12 * s + k * 44 * s
        v.S([(px - 8 * s, y + 16 * s), (px - 14 * s, y + 50 * s), (px - 8 * s, y + h * s - 16 * s), (px + 8 * s, y + h * s - 16 * s), (px + 14 * s, y + 50 * s), (px + 8 * s, y + 16 * s)],
            shade(v, col), ol(col), 3)


def fn_iron(v, x, y, s, rng, pal, w=480, h=170):
    iron = "#3a3a44"
    v.R(x - w * s / 2, y + 10 * s, w * s, 10 * s, iron, None, 0)
    v.R(x - w * s / 2, y + h * s * 0.8, w * s, 10 * s, iron, None, 0)
    for k in range(int(w / 28) + 1):
        px = x - w * s / 2 + k * 28 * s
        v.L([(px, y), (px, y + h * s)], iron, 6 * s, smooth=False)
        v.P([(px - 7 * s, y + h * s), (px, y + (h + 22) * s), (px + 7 * s, y + h * s)], iron, None, 0)


def fn_farm_gate(v, x, y, s, rng, pal, w=300, h=150):
    for dx in (-1, 1):
        v.R(x + dx * w * s / 2 - 12 * s, y, 24 * s, h * s + 20 * s, shade(v, "#7a5230"), ol("#7a5230"), 4)
    for yy in (0.15, 0.5, 0.82):
        v.R(x - w * s / 2, y + h * s * yy, w * s, 14 * s, shade(v, "#a87a48"), ol("#a87a48"), 3)
    v.L([(x - w * s / 2, y + h * s * 0.15), (x + w * s / 2, y + h * s * 0.82)], "#a87a48", 10 * s, smooth=False)


def fn_screen(v, x, y, s, rng, pal, w=440, h=210, col="#d8c098"):
    v.R(x - w * s / 2, y, w * s, h * s, "#2a1c14", ol(col), 6, rx=6 * s)
    for i in range(int(w / 46)):
        for j in range(int(h / 46)):
            cx, cy = x - w * s / 2 + (i + 0.5) * 46 * s, y + (j + 0.5) * 46 * s
            v.P([(cx, cy - 18 * s), (cx + 18 * s, cy), (cx, cy + 18 * s), (cx - 18 * s, cy)], col, ol(col), 2)


def fn_pen(v, x, y, s, rng, pal, w=480, h=120):
    for k in range(int(w / 70) + 1):
        px = x - w * s / 2 + k * 70 * s
        v.R(px - 9 * s, y, 18 * s, h * s, shade(v, "#8a5a33"), ol("#8a5a33"), 3)
    for yy in (0.25, 0.55, 0.85):
        v.R(x - w * s / 2, y + h * s * yy - 6 * s, w * s, 12 * s, shade(v, "#a87a48"), ol("#a87a48"), 3)
    v.E(x - w * s * 0.2, y + 18 * s, 38 * s, 12 * s, fill="#e8d8a0", op=0.8)
    v.E(x + w * s * 0.18, y + 14 * s, 30 * s, 10 * s, fill="#e8d8a0", op=0.8)


def _reg_barriers():
    R = "barrier"
    reg = lambda cid, name, fn, tags, pal=None, **kw: register(R, cid, name, fn, pal, tags, **kw)
    reg("fence-picket", "Picket fence", fn_picket, ["fence", "garden", "village"])
    reg("fence-bamboo", "Bamboo fence", fn_bamboo, ["fence", "village", "forest"])
    reg("fence-rail", "Post-and-rail fence", fn_rail, ["fence", "farm", "field"])
    reg("fence-rope", "Rope-and-post fence", fn_rope, ["fence", "market", "festival"])
    reg("fence-thorn", "Thorn-brush fence", fn_thorn, ["fence", "village", "desert", "farm"])
    reg("wall-mud", "Mud wall", wl_mud, ["wall", "village", "house"])
    reg("wall-stone", "Stone wall", wl_stone, ["wall", "garden", "mountain"])
    reg("wall-brick", "Brick wall", wl_brick, ["wall", "house", "market"])
    reg("wall-whitewash", "Whitewashed courtyard wall", wl_white, ["wall", "house", "temple", "palace"])
    reg("wall-battlement", "Battlement wall", wl_battlement, ["wall", "fort", "palace", "dark"])
    reg("wall-balustrade", "Marble balustrade", wl_balustrade, ["wall", "palace", "balcony", "garden"])
    reg("fence-iron", "Iron railing", fn_iron, ["fence", "palace", "garden", "dark"])
    reg("fence-farm-gate", "Farm gate", fn_farm_gate, ["fence", "farm", "field", "village"])
    reg("fence-jali-screen", "Lattice screen", fn_screen, ["fence", "palace", "temple", "haveli"])
    reg("fence-cattle-pen", "Cattle pen", fn_pen, ["fence", "farm", "village", "shed"])


# -------------------------------------------------------------------------------------------- lamps
def lp_flame(v, x, y, s, size=1.0, col="#ffb83a", glow=True, glow_r=110):
    if glow:
        v.glow(x, y + 12 * s * size, glow_r * s * size, "#ffb040", 0.7)
    v.S([(x - 10 * s * size, y), (x - 12 * s * size, y + 14 * s * size), (x, y + 38 * s * size), (x + 12 * s * size, y + 14 * s * size), (x + 10 * s * size, y)], col, ol(col, 0.35), 2)
    v.S([(x - 5 * s * size, y + 2 * s * size), (x, y + 22 * s * size), (x + 5 * s * size, y + 2 * s * size)], "#fff2a8")


def l_diya(v, x, y, s, rng, pal):
    v.S([(x - 36 * s, y + 20 * s), (x - 24 * s, y), (x + 24 * s, y), (x + 36 * s, y + 20 * s), (x + 14 * s, y + 12 * s), (x - 14 * s, y + 12 * s)], shade(v, "#c9783c"), ol("#c9783c"), 4)
    lp_flame(v, x, y + 14 * s, s)


def l_deepstambh(v, x, y, s, rng, pal, tiers=5):
    br = "#d8a830"
    v.R(x - 8 * s, y, 16 * s, tiers * 60 * s + 40 * s, shade(v, br), ol(br), 3)
    v.E(x, y + 6 * s, 40 * s, 12 * s, fill=shade(v, br), stroke=ol(br), sw=3)
    for k in range(tiers):
        yy = y + 40 * s + k * 60 * s
        for sgn in (-1, 1):
            arm = (tiers - k) * 14 * s + 20 * s
            v.L([(x, yy), (x + sgn * arm, yy + 22 * s)], br, 6)
            v.S([(x + sgn * arm - 14 * s, yy + 22 * s), (x + sgn * arm + 14 * s, yy + 22 * s), (x + sgn * arm + 8 * s, yy + 34 * s), (x + sgn * arm - 8 * s, yy + 34 * s)], shade(v, br), ol(br), 2)
            lp_flame(v, x + sgn * arm, yy + 34 * s, s, 0.6, glow_r=70)
    lp_flame(v, x, y + tiers * 60 * s + 44 * s, s, 0.8, glow_r=90)


def l_paper(v, x, y, s, rng, pal, col="#e8402a"):
    v.L([(x, y + 150 * s), (x, y + 200 * s)], "#7a5a3a", 3, smooth=False)
    v.E(x, y + 100 * s, 44 * s, 56 * s, fill=shade(v, col), stroke=ol(col), sw=4)
    for k in (-0.5, 0, 0.5):
        v.L([(x + k * 44 * s, y + 46 * s), (x + k * 26 * s, y + 154 * s)], darken(col, 0.3), 2, 0.7)
    v.R(x - 20 * s, y + 150 * s, 40 * s, 10 * s, "#c0a040", ol("#c0a040"), 2)
    v.R(x - 20 * s, y + 40 * s, 40 * s, 10 * s, "#c0a040", ol("#c0a040"), 2)
    v.glow(x, y + 100 * s, 110 * s, "#ffb040", 0.45)


def l_iron(v, x, y, s, rng, pal):
    iron = "#3a3a44"
    v.L([(x, y + 160 * s), (x, y + 210 * s)], iron, 4, smooth=False)
    v.P([(x - 34 * s, y + 20 * s), (x - 24 * s, y + 130 * s), (x + 24 * s, y + 130 * s), (x + 34 * s, y + 20 * s)], "#ffe8a0", ol(iron), 4, 0.9)
    for dx in (-34, 34, 0):
        v.L([(x + dx * s, y + 20 * s), (x + dx * 0.7 * s, y + 130 * s)], iron, 4, smooth=False)
    v.P([(x - 40 * s, y + 130 * s), (x, y + 160 * s), (x + 40 * s, y + 130 * s)], iron, None, 0)
    v.R(x - 40 * s, y + 12 * s, 80 * s, 12 * s, iron, None, 0)
    lp_flame(v, x, y + 28 * s, s, 0.9, glow_r=130)


def l_walltorch(v, x, y, s, rng, pal):
    v.R(x - 24 * s, y, 48 * s, 14 * s, shade(v, "#4a4a52"), ol("#4a4a52"), 3)
    v.P([(x - 10 * s, y + 14 * s), (x - 16 * s, y + 90 * s), (x + 16 * s, y + 90 * s), (x + 10 * s, y + 14 * s)], shade(v, "#8a5a33"), ol("#8a5a33"), 3)
    v.E(x, y + 94 * s, 20 * s, 10 * s, fill="#3a3a42")
    lp_flame(v, x, y + 96 * s, s, 1.6, glow_r=150)


def l_standtorch(v, x, y, s, rng, pal):
    v.R(x - 7 * s, y, 14 * s, 240 * s, shade(v, "#7a5230"), ol("#7a5230"), 3)
    v.R(x - 24 * s, y, 48 * s, 12 * s, shade(v, "#5a3a20"), ol("#5a3a20"), 3, rx=4 * s)
    v.E(x, y + 244 * s, 22 * s, 11 * s, fill="#3a3a42")
    lp_flame(v, x, y + 246 * s, s, 1.8, glow_r=170)


def l_post(v, x, y, s, rng, pal):
    iron = "#2f3a3f"
    v.R(x - 10 * s, y, 20 * s, 340 * s, shade(v, iron), ol(iron), 3)
    v.R(x - 22 * s, y, 44 * s, 24 * s, shade(v, iron), ol(iron), 3, rx=6 * s)
    v.R(x - 28 * s, y + 330 * s, 56 * s, 10 * s, iron, None, 0)
    v.P([(x - 30 * s, y + 340 * s), (x - 22 * s, y + 410 * s), (x + 22 * s, y + 410 * s), (x + 30 * s, y + 340 * s)], "#ffe8a0", ol(iron), 4, 0.95)
    v.P([(x - 36 * s, y + 410 * s), (x, y + 436 * s), (x + 36 * s, y + 410 * s)], iron, None, 0)
    v.glow(x, y + 376 * s, 140 * s, "#ffcc60", 0.55)


def l_hanging(v, x, y, s, rng, pal):
    br = "#c9a030"
    v.L([(x, y + 260 * s), (x, y + 150 * s)], "#5a4a3a", 3, smooth=False)
    v.S([(x - 40 * s, y + 130 * s), (x - 30 * s, y + 70 * s), (x, y + 50 * s), (x + 30 * s, y + 70 * s), (x + 40 * s, y + 130 * s), (x + 20 * s, y + 150 * s), (x - 20 * s, y + 150 * s)], shade(v, br), ol(br), 4)
    v.E(x, y + 100 * s, 14 * s, 20 * s, fill="#fff2b8")
    v.glow(x, y + 100 * s, 120 * s, "#ffb040", 0.55)


def l_candle(v, x, y, s, rng, pal):
    v.R(x - 18 * s, y, 36 * s, 90 * s, shade(v, "#f6ecd0"), ol("#d8c8a8"), 3, rx=4 * s)
    v.E(x + 20 * s, y + 70 * s, 5 * s, 16 * s, fill="#f6ecd0")
    v.R(x - 36 * s, y - 6 * s, 72 * s, 10 * s, shade(v, "#c9a030"), ol("#c9a030"), 3, rx=5 * s)
    lp_flame(v, x, y + 92 * s, s, 0.8, glow_r=110)


def l_candelabra(v, x, y, s, rng, pal):
    br = "#d8a830"
    v.R(x - 10 * s, y, 20 * s, 220 * s, shade(v, br), ol(br), 3)
    v.E(x, y + 6 * s, 50 * s, 12 * s, fill=shade(v, br), stroke=ol(br), sw=3)
    for dx in (-90, -45, 0, 45, 90):
        top = y + 230 * s - abs(dx) * 0.5 * s
        v.L([(x, y + 150 * s), (x + dx * s * 0.6, y + 170 * s), (x + dx * s, top - 18 * s)], br, 7, smooth=True)
        v.R(x + dx * s - 8 * s, top - 18 * s, 16 * s, 18 * s, shade(v, "#f6ecd0"), ol("#d8c8a8"), 2)
        lp_flame(v, x + dx * s, top, s, 0.5, glow_r=60)


def l_chandelier(v, x, y, s, rng, pal):
    br = "#d8a830"
    v.L([(x, y + 300 * s), (x, y + 210 * s)], "#7a6a3a", 4, smooth=False)
    v.S([(x - 190 * s, y + 80 * s), (x - 120 * s, y + 130 * s), (x, y + 150 * s), (x + 120 * s, y + 130 * s), (x + 190 * s, y + 80 * s), (x + 100 * s, y + 110 * s), (x - 100 * s, y + 110 * s)], shade(v, br), ol(br), 5)
    v.S([(x - 40 * s, y + 210 * s), (x - 50 * s, y + 160 * s), (x, y + 140 * s), (x + 50 * s, y + 160 * s), (x + 40 * s, y + 210 * s)], shade(v, br), ol(br), 4)
    for dx in (-170, -100, -40, 40, 100, 170):
        yy = y + 96 * s - abs(dx) * 0.0 + (130 * s * (1 - abs(dx) / 220) * 0.0)
        v.R(x + dx * s - 7 * s, y + 98 * s + (abs(dx) < 120) * 18 * s, 14 * s, 22 * s, shade(v, "#f6ecd0"), ol("#d8c8a8"), 2)
        lp_flame(v, x + dx * s, y + 122 * s + (abs(dx) < 120) * 18 * s, s, 0.5, glow_r=70)
    for dx in (-130, -60, 0, 60, 130):
        v.E(x + dx * s, y + 70 * s, 6 * s, 14 * s, fill="#bfe6f8", stroke="#7fc4e8", sw=1.5)


def l_brazier(v, x, y, s, rng, pal):
    iron = "#3a3a44"
    for dx in (-1, 1):
        v.L([(x + dx * 24 * s, y + 90 * s), (x + dx * 42 * s, y)], iron, 6, smooth=False)
    v.S([(x - 70 * s, y + 130 * s), (x - 50 * s, y + 80 * s), (x + 50 * s, y + 80 * s), (x + 70 * s, y + 130 * s)], shade(v, iron), ol(iron), 5)
    for dx, hh, c in ((-26, 70, "#ff9a30"), (0, 110, "#ffb83a"), (26, 76, "#ff9a30")):
        v.S([(x + (dx - 24) * s, y + 128 * s), (x + (dx - 16) * s, y + (128 + hh * 0.5) * s), (x + dx * s, y + (128 + hh) * s), (x + (dx + 16) * s, y + (128 + hh * 0.5) * s), (x + (dx + 24) * s, y + 128 * s)], c, ol(c, 0.35), 2)
    v.glow(x, y + 170 * s, 190 * s, "#ff9a30", 0.65)


def l_campfire(v, x, y, s, rng, pal):
    for ang in (20, -20, 90, 160, 200):
        v.L([(x + math.cos(math.radians(ang)) * 80 * s, y + 12 * s + math.sin(math.radians(ang)) * 10 * s), (x, y + 22 * s)], "#6a4a2a", 14 * s, smooth=False)
        v.L([(x + math.cos(math.radians(ang)) * 80 * s, y + 12 * s + math.sin(math.radians(ang)) * 10 * s), (x, y + 22 * s)], "#8a6a3a", 8 * s, smooth=False)
    for dx, hh, c in ((-30, 90, "#ff7a2a"), (0, 140, "#ffa83a"), (30, 100, "#ff7a2a")):
        v.S([(x + (dx - 34) * s, y + 24 * s), (x + (dx - 20) * s, y + (24 + hh * 0.5) * s), (x + dx * s, y + (24 + hh) * s), (x + (dx + 20) * s, y + (24 + hh * 0.5) * s), (x + (dx + 34) * s, y + 24 * s)], c, ol(c, 0.35), 2)
    v.S([(x - 14 * s, y + 24 * s), (x, y + 76 * s), (x + 14 * s, y + 24 * s)], "#fff2a8")
    v.glow(x, y + 70 * s, 220 * s, "#ff9a30", 0.6)
    for _ in range(7):
        v.E(x + rng.uniform(-50, 50) * s, y + 150 * s + rng.uniform(0, 90) * s, 3 * s, fill="#ffcc60", op=0.9)


def l_orb(v, x, y, s, rng, pal, col="#9ad8ff"):
    v.glow(x, y + 60 * s, 160 * s, col, 0.55)
    v.E(x, y + 60 * s, 34 * s, fill=v.radial("#ffffff", col), stroke=lighten(col, 0.4), sw=3)
    for k in range(8):
        a = k * math.tau / 8 + rng.uniform(-0.2, 0.2)
        v.E(x + math.cos(a) * 70 * s, y + 60 * s + math.sin(a) * 70 * s, 4 * s, fill="#ffffff", op=0.85)


def l_strings(v, x, y, s, rng, pal, w=620, cols=("#e8402a", "#f2c230", "#3aa85a", "#3a6ad8", "#e86a9a")):
    v.L([(x - w * s / 2, y + 90 * s), (x, y + 30 * s), (x + w * s / 2, y + 90 * s)], "#3a2a1a", 4)
    for k in range(9):
        t = k / 8
        bx = x - w * s / 2 + t * w * s
        by = y + 90 * s - (1 - (2 * t - 1) ** 2) * 60 * s - 4 * s
        v.E(bx, by - 10 * s, 11 * s, fill=cols[k % len(cols)], stroke=ol(cols[k % len(cols)]), sw=2)
        v.glow(bx, by - 10 * s, 36 * s, cols[k % len(cols)], 0.5)


def _reg_lamps():
    L = "lamp"
    reg = lambda cid, name, fn, tags, pal=None, **kw: register(L, cid, name, fn, pal, tags, **kw)
    reg("lamp-diya", "Clay diya", l_diya, ["lamp", "diya", "temple", "festival", "house"])
    reg("lamp-deepstambh", "Brass lamp tower", l_deepstambh, ["lamp", "temple", "festival"])
    reg("lamp-paper-lantern", "Paper lantern", l_paper, ["lamp", "festival", "market"])
    reg("lamp-iron-lantern", "Iron lantern", l_iron, ["lamp", "village", "road", "house"])
    reg("lamp-wall-torch", "Wall torch", l_walltorch, ["lamp", "torch", "fort", "cave", "dark"])
    reg("lamp-standing-torch", "Standing torch", l_standtorch, ["lamp", "torch", "palace", "camp"])
    reg("lamp-post", "Lamp post", l_post, ["lamp", "road", "city", "palace"])
    reg("lamp-hanging-brass", "Hanging brass lamp", l_hanging, ["lamp", "temple", "palace", "house"])
    reg("lamp-candle", "Candle", l_candle, ["lamp", "candle", "house", "dark"])
    reg("lamp-candelabra", "Candelabra", l_candelabra, ["lamp", "palace", "court"])
    reg("lamp-chandelier", "Chandelier", l_chandelier, ["lamp", "palace", "court", "hall"])
    reg("lamp-brazier", "Fire brazier", l_brazier, ["lamp", "fire", "palace", "fort", "camp"])
    reg("lamp-campfire", "Campfire", l_campfire, ["lamp", "fire", "camp", "forest", "desert"])
    reg("lamp-magic-orb", "Magic light orb", l_orb, ["lamp", "magic", "enchanted", "cave"])
    reg("lamp-string-lights", "Festival string lights", l_strings, ["lamp", "festival", "wedding", "market"])


def register_all() -> None:
    _reg_openings()
    _reg_buildings()
    _reg_barriers()
    _reg_lamps()
