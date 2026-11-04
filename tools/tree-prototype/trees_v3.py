"""PROTOTYPE, seven species for the isometric game style (option E):
Mango, Banana, Peepal, Coconut, Banyan, Deodar, Palm, seven growth stages each.
Builds on trees_v2 (shared branching skeleton, clumps, sprays). Not used by the app yet."""
import math
from mathutils import Vector

import trees_v2 as T2
from trees_v2 import (TAU, Builder, PM, M, bark, leafmat, ball, seedling, walk, radii_for, tube, frame_at, leaf, shape_lanceolate, shape_ovate, shape_leaflet,
                      Skeleton, trunk_and_roots, broadleaf, levels_for, _root, clump)
from focusbalcony.common import Rng

HEIGHTS = {
    "mango": [0, 0.45, 1.1, 1.9, 2.9, 3.9, 4.8, 5.6],
    "banana": [0, 0.4, 0.9, 1.5, 2.2, 2.8, 3.4, 3.9],
    "peepal": [0, 0.5, 1.2, 2.1, 3.2, 4.3, 5.3, 6.2],
    "coconut": [0, 0.5, 1.0, 1.8, 2.9, 4.0, 5.1, 6.2],
    "banyan": [0, 0.5, 1.3, 2.3, 3.4, 4.5, 5.4, 6.2],
    "deodar": [0, 0.5, 1.4, 2.6, 4.0, 5.4, 6.8, 8.0],
    "palm": [0, 0.5, 1.1, 2.2, 3.6, 5.0, 6.5, 8.0],
}
T2.HEIGHTS.update(HEIGHTS)


def shape_peepal(v):
    """Heart-shaped blade with a long drawn-out tip (the drip tip of Ficus religiosa)."""
    if v < 0.6:
        return math.sin((v / 0.6) ** 0.7 * math.pi / 2) ** 0.9
    return max(0.03, (1 - (v - 0.6) / 0.4) ** 1.7)


def peepal(col, root, rng, stage, H, k):
    leafm = leafmat("v3_peepal", (0.02, 0.12, 0.01), (0.22, 0.5, 0.04), 0.35, 0.3, 0.3)
    bm = bark("v3_peepal_bark", (0.05, 0.04, 0.03), (0.22, 0.17, 0.12))
    sm = PM.stem("v3_pestem")
    figm = M.matte((0.75, 0.32, 0.28), 0.5, "v3_fig")
    rootm = bark("v3_peepal_root", (0.12, 0.09, 0.06), (0.45, 0.36, 0.27))
    sp = dict(gnarl=0.12, up=0.4, droop=0.04, taper=0.55, crown_start=0.9, spread=55, lenf=0.6, radf=0.66, kids=3, limb=0.62, limb_r=0.85, flat=0.7, leaf_up=0.25, leaf_droop=0.5)

    def extra(col, root, rng, stage, sk, fol, H, k):
        wood = Builder()
        if stage >= 6 and sk.mid:
            for i in range(2 + (stage - 6) * 3):
                q = sk.mid[rng.randint(0, len(sk.mid) - 1)]
                pts = [q + Vector((rng.uniform(-0.03, 0.03) * j, rng.uniform(-0.03, 0.03) * j, -q.z * 0.8 * j / 6)) for j in range(7)]
                tube(wood, rootm, pts, [0.02 * (1.1 - 0.5 * j / 6) for j in range(7)], segments=5)
            wood.finish("peepal_aerial", col).parent = root
        if stage >= 7:
            for _ in range(10):
                pos, d, r, lv = sk.tips[rng.randint(0, len(sk.tips) - 1)]
                ball(col, root, figm, pos + Vector((rng.uniform(-0.3, 0.3), rng.uniform(-0.3, 0.3), -0.1)), 0.035, 0.035, 0.032, "fig")

    broadleaf(col, root, rng, stage, H, k, sp, leafm, shape_peepal, 0.2, 0.15, bm, sm, 1.0 * (0.55 + 0.5 * k), 120, extra=extra, trunk_frac=0.56, r_scale=0.058)


def banana(col, root, rng, stage, H, k):
    leafm = leafmat("v3_banana", (0.02, 0.1, 0.01), (0.2, 0.5, 0.05), 0.4, 0.3, 0.2)
    stemm = M.matte((0.1, 0.22, 0.035), 0.55, "v3_pseudostem")
    ribm = PM.stem("v3_bribs", (0.08, 0.16, 0.03))
    fruitm = M.matte((0.5, 0.5, 0.05), 0.45, "v3_bananas")
    budm = M.matte((0.35, 0.05, 0.18), 0.4, "v3_bud")
    if stage == 1:
        b = Builder()
        for i in range(3):
            a = i * 2.2
            leaf(b, leafm, frame_at(Vector((0, 0, 0.02)), Vector((math.cos(a) * 0.6, math.sin(a) * 0.6, 0.8))), 0.28, 0.09, shape_lanceolate, nu=3, nv=6, fold=0.3, arch=0.7, var=rng.random())
        b.finish("banana_seedling", col).parent = root
        return
    wood = Builder()
    fol = Builder()
    stems = {2: 1, 3: 2, 4: 3, 5: 4, 6: 5, 7: 6}[stage]
    tops = []
    for s in range(stems):
        a = s / max(1, stems) * TAU + rng.uniform(-0.4, 0.4)
        off = Vector((math.cos(a), math.sin(a), 0)) * (0.0 if s == 0 else 0.1 + 0.09 * k * rng.uniform(0.8, 1.3))
        h = H * (0.7 if s else 0.85) * rng.uniform(0.85, 1.05) * (1 - 0.1 * s / max(1, stems))
        r0 = 0.045 * (H ** 0.7) * rng.uniform(0.85, 1.1)
        pts = [off + Vector((math.cos(a) * 0.03 * j, math.sin(a) * 0.03 * j, h * j / 7)) for j in range(8)]
        tube(wood, stemm, pts, [r0 * (1.25 if j == 0 else 1.0 - 0.38 * j / 7) for j in range(8)], segments=9, var=rng.random())
        top = pts[-1]
        tops.append((top, a, h))
        nleaf = 3 + int(stage * 0.9)
        for i in range(nleaf):
            la = a + i * 2.4 + rng.uniform(-0.3, 0.3)
            L = (0.75 + 1.1 * k) * rng.uniform(0.85, 1.1) * (0.9 if s else 1.0) * (H / 3.0) ** 0.5
            up = 1.3 if i < 2 else rng.uniform(0.35, 0.9)
            hd = Vector((math.cos(la), math.sin(la), 0))
            rach = [top + hd * (L * 0.9 * t) + Vector((0, 0, up * L * 0.5 * math.sin(t * 2.0) - L * 0.3 * t ** 2.6)) for t in [j / 9 for j in range(10)]]
            tube(wood, ribm, rach, [0.012 * (1 - 0.8 * j / 9) for j in range(10)], segments=4)
            side = Vector((-math.sin(la), math.cos(la), 0))
            W = L * 0.34
            for j in range(1, 16):
                f = j / 16
                p = rach[min(9, int(f * 9))].lerp(rach[min(9, int(f * 9) + 1)], (f * 9) % 1)
                tvec = (rach[min(9, int(f * 9) + 1)] - rach[max(0, int(f * 9) - 1)]).normalized()
                for sg in (-1, 1):
                    if rng.random() < 0.06:
                        continue  # a tear between strips
                    ln = W * math.sin(math.pi * min(1, f * 0.95 + 0.06)) ** 0.6 * rng.uniform(0.85, 1.05)
                    dd = (side * sg + Vector((0, 0, -0.22)) + tvec * 0.3).normalized()
                    leaf(fol, leafm, frame_at(p, dd), ln, L * 0.085, shape_ovate, nu=1, nv=2, fold=0.08, arch=0.28, var=rng.random())
    if stage >= 6 and tops:
        top, a, h = tops[0]
        base = top + Vector((math.cos(a) * 0.1, math.sin(a) * 0.1, -0.1))
        stalk = [base + Vector((math.cos(a) * 0.08 * j, math.sin(a) * 0.08 * j, -0.07 * j)) for j in range(7)]
        tube(wood, ribm, stalk, [0.016] * 7, segments=5)
        hands = 3 if stage == 6 else 6
        for hnd in range(hands):
            c = stalk[min(6, 1 + hnd)]
            for f in range(7):
                aa = f / 7 * TAU
                ball(col, root, fruitm, c + Vector((math.cos(aa) * 0.045, math.sin(aa) * 0.045, -0.05 * hnd)), 0.02, 0.02, 0.075, "banana")
        if stage == 7:
            ball(col, root, budm, stalk[-1] + Vector((0, 0, -0.12)), 0.045, 0.045, 0.11, "bud")
    wood.finish("banana_stems", col).parent = root
    fol.finish("banana_leaves", col).parent = root


def conifer_deodar(col, root, rng, stage, H, k):
    needlem = leafmat("v3_deodar", (0.004, 0.05, 0.03), (0.05, 0.24, 0.12), 0.5, 0.12)
    bm = bark("v3_deodar_bark", (0.1, 0.06, 0.04), (0.4, 0.26, 0.17))
    sm = PM.stem("v3_dstem", (0.1, 0.07, 0.04))
    wood = Builder()
    fol = Builder()
    if stage == 1:
        seedling(col, root, rng, needlem, sm, shape_lanceolate, 0.1, 10, 0.06)
        return
    r0 = 0.032 * H ** 0.9 * (0.8 + 0.07 * stage)
    pts = walk(rng, Vector((0, 0, 0)), Vector((0.01, 0, 1)), H * 0.95, 12, 0.02, 0.1)
    radii = radii_for(pts, r0, r0 * 0.1, rng, 0.04, 0.6 if stage >= 3 else 0.1)
    tube(wood, bm, pts, radii, segments=9, var=rng.random())
    tiers = {2: 4, 3: 6, 4: 8, 5: 10, 6: 12, 7: 14}[stage]
    for i in range(tiers):
        t = 0.12 + 0.86 * i / max(1, tiers - 1)
        idx = min(len(pts) - 2, int(t * (len(pts) - 1)))
        base = pts[idx]
        Lb = (1.05 - t) ** 0.85 * H * 0.42 * (0.8 + 0.2 * k) + 0.2
        arms = 6
        for a in range(arms):
            th = a / arms * TAU + i * 1.1 + rng.uniform(-0.3, 0.3)
            L = Lb * rng.uniform(0.75, 1.1)
            d = Vector((math.cos(th), math.sin(th), 0.12))
            bp = walk(rng, base, d, L, 5, 0.04, 0.0, droop=1.6)   # branches sweep out and droop at the tips
            rb = max(0.006, radii[idx] * 0.3 * (1 - 0.5 * t))
            tube(wood, bm, bp, [rb * (1 - 0.8 * j / 5) + 0.002 for j in range(6)], segments=4)
            for j in range(1, 6):
                c = bp[j]
                dd = (bp[j] - bp[j - 1]).normalized()
                for _ in range(int(46 * (0.7 + 0.5 * k))):
                    nd = (dd * 0.5 + Vector((rng.uniform(-0.9, 0.9), rng.uniform(-0.9, 0.9), rng.uniform(-0.9, 0.2)))).normalized()
                    leaf(fol, needlem, frame_at(c, nd), 0.34 * (0.8 + 0.4 * k) * rng.uniform(0.7, 1.2), 0.05, shape_lanceolate, nu=1, nv=2, fold=0.0, arch=0.3, var=rng.random())
    for _ in range(36):
        nd = Vector((rng.uniform(-0.5, 0.5), rng.uniform(-0.5, 0.5), 1)).normalized()
        leaf(fol, needlem, frame_at(pts[-1] - Vector((0, 0, 0.12)), nd), 0.26, 0.03, shape_lanceolate, nu=1, nv=2, fold=0, arch=0.3, var=rng.random())
    wood.finish("deodar_wood", col).parent = root
    fol.finish("deodar_needles", col).parent = root


def palm_royal(col, root, rng, stage, H, k):
    frondm = leafmat("v3_palm", (0.01, 0.09, 0.02), (0.1, 0.38, 0.05), 0.4, 0.25)
    trunkm = M.matte((0.085, 0.07, 0.055), 0.8, "v3_palm_trunk")
    shaftm = M.matte((0.03, 0.09, 0.015), 0.6, "v3_crownshaft")
    ribm = PM.stem("v3_palmrib", (0.06, 0.14, 0.03))
    wood = Builder()
    fol = Builder()
    if stage == 1:
        seedling(col, root, rng, frondm, ribm, shape_lanceolate, 0.16, 3, 0.1)
        return
    h = H * 0.62
    r0 = 0.05 * (H ** 0.65) * (0.75 + 0.05 * stage)
    pts = [Vector((0.02 * math.sin(j) * 0.2, 0, h * j / 12)) for j in range(13)]
    # straight, smooth, slightly swollen in the lower third, with faint rings
    radii = [r0 * (1.35 if j == 0 else 1.0 + 0.25 * math.sin(math.pi * min(1, j / 8)) - 0.25 * j / 12) * (1 + 0.025 * math.sin(pts[j].z * 22)) for j in range(13)]
    tube(wood, trunkm, pts, radii, segments=10, var=rng.random())
    top = pts[-1]
    csh = H * 0.16
    tube(wood, shaftm, [top, top + Vector((0, 0, csh))], [radii[-1] * 0.95, radii[-1] * 0.8], segments=10)
    cr = top + Vector((0, 0, csh))
    nf = {2: 5, 3: 7, 4: 9, 5: 11, 6: 13, 7: 15}[stage]
    FL = {2: 0.5, 3: 0.9, 4: 1.4, 5: 2.0, 6: 2.5, 7: 3.0}[stage]
    for i in range(nf):
        a = i / nf * TAU + rng.uniform(-0.2, 0.2)
        up = 1.4 if i % 3 == 0 else rng.uniform(0.7, 1.0)
        L = FL * rng.uniform(0.85, 1.1)
        hd = Vector((math.cos(a), math.sin(a), 0))
        rach = [cr + hd * (L * 0.85 * t) + Vector((0, 0, up * L * 0.5 * math.sin(t * 1.7) - L * 0.38 * t ** 2.4)) for t in [j / 9 for j in range(10)]]
        tube(wood, ribm, rach, [0.014 * (1 - 0.8 * j / 9) for j in range(10)], segments=4)
        side = Vector((-math.sin(a), math.cos(a), 0))
        for j in range(2, 10):
          for sub in range(2):
            p = rach[j].lerp(rach[min(9, j + 1)], sub * 0.5)
            tvec = (rach[min(9, j + 1)] - rach[j - 1]).normalized()
            ll = L * 0.34 * (1 - 0.45 * abs(j / 9 - 0.4))
            for sg in (-1, 1):
                dd = (side * sg * 0.9 + Vector((0, 0, 0.45)) + tvec * 0.2).normalized()   # leaflets rise in a stiff V
                leaf(fol, frondm, frame_at(p, dd), ll, 0.075, shape_lanceolate, nu=1, nv=3, fold=0.2, arch=0.12, var=rng.random())
    wood.finish("palm_trunk", col).parent = root
    fol.finish("palm_fronds", col).parent = root


def build(col, name, stage, seed=1):
    rng = Rng(seed * 97 + stage * 13 + sum(map(ord, name)))
    root = _root(name, col)
    H = HEIGHTS[name][stage]
    k = stage / 7.0
    fn = {"mango": T2.mango, "banana": banana, "peepal": peepal, "coconut": T2.coconut, "banyan": T2.banyan, "deodar": conifer_deodar, "palm": palm_royal}[name]
    fn(col, root, rng, stage, H, k)
    return root
