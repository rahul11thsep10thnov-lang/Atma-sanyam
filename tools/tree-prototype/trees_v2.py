"""PROTOTYPE tree generator (not used by the app yet): six species with
species-specific trunks, branching and foliage, each in seven growth stages.
Built on the same Blender helpers as the existing sprite pipeline
(tools/balcony-render/focusbalcony), so it can be rendered the same way.

Design rules taken from the owner's reference sheet:
  * a trunk you can see, with flare, taper and bark;
  * foliage as separate readable clumps at branch ends, with gaps between them
    (never one green ball);
  * each stage a different structure: more levels of branching, bigger crown,
    flowers or fruit at the late stages;
  * mature size is much larger than the sapling and species-specific.
"""
import math, sys, pathlib
import bmesh
import bpy
from mathutils import Vector

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1] / "balcony-render"))
from focusbalcony import materials as M
from focusbalcony import plant_materials as PM
from focusbalcony.common import DEG, Rng, link, mesh_object
from focusbalcony.geo import Builder, frame_at, leaf, shape_lanceolate, shape_ovate, shape_heart, shape_leaflet, tube
from focusbalcony.trees import bark, _flower_mat, _flower

TAU = math.tau


def _root(name, col):
    r = bpy.data.objects.new(name, None)
    link(r, col)
    return r


def leafmat(name, dark, light, rough=0.5, trans=0.35, gloss=0.0):
    return PM.leaf(name, dark, light, rough, trans, gloss_coat=gloss)


def ball(col, root, mat, pos, rx, ry, rz, name="fruit"):
    bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=12, v_segments=8, radius=1.0)
    bmesh.ops.scale(bm, vec=Vector((rx, ry, rz)), verts=bm.verts)
    o = mesh_object(name, bm, mat, col, smooth=True)
    o.location = pos
    o.parent = root
    return o


# ---- the shared branching skeleton ----------------------------------------------------------------

def walk(rng, start, d, length, n, gnarl, up, droop=0.0):
    """A natural, slightly wandering path: heading drifts, rises by `up`, sags by `droop` towards the end."""
    pts = [start.copy()]
    p = start.copy()
    d = d.normalized()
    step = length / n
    for i in range(n):
        t = (i + 1) / n
        d = (d + Vector((rng.uniform(-1, 1), rng.uniform(-1, 1), rng.uniform(-0.6, 0.6))) * gnarl + Vector((0, 0, up * (1 - t) * 0.25 - droop * t * 0.45))).normalized()
        p = p + d * step
        pts.append(p.copy())
    return pts


def radii_for(pts, r0, r1, rng, wobble=0.07, flare=0.0):
    n = len(pts)
    ph = rng.uniform(0, 6)
    out = []
    for j in range(n):
        t = j / max(1, n - 1)
        r = (r0 + (r1 - r0) * t ** 0.9) * (1 + wobble * math.sin(j * 1.9 + ph))
        if flare and j < 3:
            r *= 1 + flare * (1 - j / 3) ** 1.5
        out.append(max(0.0015, r))
    return out


def clump(b, mat, rng, centre, radius, count, length, width, shape, up=0.35, flat=0.65, droop=0.25, fold=0.25, outward=1.0):
    """A readable cluster of leaves: placed inside a flattened ellipsoid, facing out and up."""
    for _ in range(count):
        u = rng.uniform(-1, 1)
        th = rng.uniform(0, TAU)
        s = math.sqrt(1 - u * u)
        r = radius * (rng.random() ** 0.45)
        off = Vector((math.cos(th) * s * r, math.sin(th) * s * r, u * r * flat))
        p = centre + off
        d = (off.normalized() * outward + Vector((rng.uniform(-0.4, 0.4), rng.uniform(-0.4, 0.4), up))).normalized()
        L = length * rng.uniform(0.75, 1.25)
        leaf(b, mat, frame_at(p, d), L, width * rng.uniform(0.8, 1.2) * (L / length), shape, nu=2, nv=4, fold=fold, arch=droop * rng.uniform(0.3, 1.2), twist=rng.uniform(-0.4, 0.4), var=rng.random())


def spray(b, mat, stem_mat, rng, p, d, length, pairs, leaflet, width, droop=0.5, shape=shape_leaflet):
    """A compound leaf: a rachis with paired leaflets (neem, gulmohar)."""
    d = d.normalized()
    side = d.cross(Vector((0, 0, 1)))
    if side.length < 1e-3:
        side = Vector((1, 0, 0))
    side.normalize()
    pts = [p + d * (length * t) + Vector((0, 0, -droop * length * t * t)) for t in (0, 0.25, 0.5, 0.75, 1.0)]
    tube(b, stem_mat, pts, [0.0025, 0.002, 0.0017, 0.0013, 0.0008], segments=3)
    for i in range(pairs):
        t = (i + 1) / (pairs + 1)
        q = p + d * (length * t) + Vector((0, 0, -droop * length * t * t))
        k = leaflet * (1 - 0.45 * abs(t - 0.45))
        for sg in (-1, 1):
            dd = (side * sg * 1.0 + d * 0.5 + Vector((0, 0, 0.1))).normalized()
            leaf(b, mat, frame_at(q, dd), k, width, shape, nu=2, nv=3, fold=0.2, arch=0.25, var=rng.random())
    leaf(b, mat, frame_at(p + d * length, d), leaflet * 0.9, width, shape, nu=2, nv=3, fold=0.2, arch=0.3, var=rng.random())


class Skeleton:
    """Wood and the points where foliage goes."""

    def __init__(self, wood, bark_mat, rng):
        self.wood, self.bark, self.rng = wood, bark_mat, rng
        self.tips = []   # (pos, dir, radius, depth)
        self.mid = []    # points along outer branches

    def branch(self, start, d, length, r0, level, max_level, sp, n_kids):
        rng = self.rng
        n = 6 if level < 2 else 4
        pts = walk(rng, start, d, length, n, sp["gnarl"] * (1 + 0.3 * level), sp["up"] * (1 - 0.35 * level), sp["droop"] * level)
        radii = radii_for(pts, r0, r0 * sp["taper"], rng)
        tube(self.wood, self.bark, pts, radii, segments=8 if level < 2 else 5, var=rng.random())
        if level >= max_level:
            self.tips.append((pts[-1], (pts[-1] - pts[-2]).normalized(), radii[-1], level))
            for q in pts[len(pts) // 2:-1]:
                self.mid.append(q)
            return
        for k in range(n_kids):
            t = rng.uniform(0.3 if level else sp["crown_start"], 0.95)
            idx = min(len(pts) - 2, int(t * (len(pts) - 1)))
            q = pts[idx].lerp(pts[idx + 1], t * (len(pts) - 1) - idx)
            axis = (pts[idx + 1] - pts[idx]).normalized()
            az = rng.uniform(0, TAU) + k * 2.399
            ref = Vector((0, 0, 1)) if abs(axis.z) < 0.9 else Vector((1, 0, 0))
            side = axis.cross(ref).normalized()
            side = side * math.cos(az) + axis.cross(side) * math.sin(az)
            ang = math.radians(sp["spread"]) * rng.uniform(0.7, 1.3)
            nd = (axis * math.cos(ang) + side * math.sin(ang) + Vector((0, 0, sp["up"] * 0.5))).normalized()
            self.branch(q, nd, length * sp["lenf"] * rng.uniform(0.75, 1.2), radii[idx] * sp["radf"] * rng.uniform(0.85, 1.1), level + 1, max_level, sp, max(2, sp["kids"] + rng.randint(-1, 1)))
        # the end of the branch carries on
        self.tips.append((pts[-1], (pts[-1] - pts[-2]).normalized(), radii[-1], level))


def trunk_and_roots(b, mat, rng, H, r0, lean, flare, roots=5, rootlen=0.45):
    pts = walk(rng, Vector((0, 0, 0)), Vector((lean * rng.uniform(-1, 1), lean * rng.uniform(-1, 1), 1)), H, 9, 0.05, 0.1)
    radii = radii_for(pts, r0, r0 * 0.62, rng, 0.05, flare)
    tube(b, mat, pts, radii, segments=10, var=rng.random())
    for i in range(roots):
        a = i / roots * TAU + rng.uniform(-0.3, 0.3)
        d = Vector((math.cos(a), math.sin(a), 0))
        L = r0 * rootlen * 6 * rng.uniform(0.8, 1.3)
        rp = [Vector((d.x * r0 * 0.5, d.y * r0 * 0.5, r0 * 0.9)), Vector((d.x * r0 * 1.2, d.y * r0 * 1.2, r0 * 0.35)), d * L * 0.7 + Vector((0, 0, r0 * 0.05)), d * L + Vector((0, 0, -r0 * 0.05))]
        tube(b, mat, rp, [r0 * 0.38, r0 * 0.3, r0 * 0.17, r0 * 0.07], segments=5, var=rng.random())
    return pts, radii


def seedling(col, root, rng, leafm, stemm, shape, size, count=6, sw=0.5):
    b = Builder()
    pts = walk(rng, Vector((0, 0, 0)), Vector((0.03, 0, 1)), size * 1.6, 4, 0.04, 0.2)
    tube(b, stemm, pts, [0.006, 0.005, 0.004, 0.003, 0.002], segments=5)
    top = pts[-1]
    for i in range(count):
        a = i * 2.4
        d = Vector((math.cos(a), math.sin(a), 0.5 if i < count - 2 else 1.2)).normalized()
        q = pts[min(len(pts) - 1, 2 + (i * 3) // count)] if i < count - 1 else top
        leaf(b, leafm, frame_at(q, d), size * rng.uniform(0.9, 1.2), size * sw, shape, nu=3, nv=5, fold=0.3, arch=0.4, var=rng.random())
    b.finish("seedling", col).parent = root


# ---- the six species ---------------------------------------------------------------------------------

HEIGHTS = {
    "mango": [0, 0.45, 1.1, 1.9, 2.9, 3.9, 4.8, 5.6],
    "neem": [0, 0.45, 1.2, 2.1, 3.2, 4.3, 5.2, 6.0],
    "pine": [0, 0.45, 1.3, 2.4, 3.7, 5.0, 6.2, 7.4],
    "banyan": [0, 0.5, 1.3, 2.3, 3.4, 4.5, 5.4, 6.2],
    "coconut": [0, 0.5, 1.0, 1.8, 2.9, 4.0, 5.1, 6.2],
    "gulmohar": [0, 0.5, 1.2, 2.1, 3.1, 4.1, 5.0, 5.8],
}


def build(col, name, stage, seed=1):
    rng = Rng(seed * 97 + stage * 13 + sum(map(ord, name)))
    root = _root(name, col)
    H = HEIGHTS[name][stage]
    k = stage / 7.0
    fn = {"mango": mango, "neem": neem, "pine": pine, "banyan": banyan, "coconut": coconut, "gulmohar": gulmohar}[name]
    fn(col, root, rng, stage, H, k)
    return root


def levels_for(stage):
    return 0 if stage <= 1 else 1 if stage == 2 else 2 if stage <= 4 else 3


def broadleaf(col, root, rng, stage, H, k, sp, leafm, shape, leaf_len, leaf_w, bark_mat, stemm, clump_r, per_clump, extra=None, trunk_frac=0.42, r_scale=0.042, flare=0.8):
    wood = Builder()
    foliage = Builder()
    if stage == 1:
        seedling(col, root, rng, leafm, stemm, shape, 0.1, 6)
        return
    r0 = r_scale * H ** 0.85 * (0.75 + 0.06 * stage)
    th = H * trunk_frac
    tpts, trad = trunk_and_roots(wood, bark_mat, rng, th, r0, 0.05, flare if stage >= 3 else 0.2, roots=5 if stage >= 4 else 0)
    sk = Skeleton(wood, bark_mat, rng)
    sk.wood = wood
    mx = levels_for(stage)
    main = {2: 2, 3: 3, 4: 4, 5: 5, 6: 6, 7: 7}[stage]
    base = tpts[-1]
    # primary limbs spread from the top of the trunk, plus a few lower on it
    for i in range(main):
        a = i / main * TAU + rng.uniform(-0.4, 0.4)
        att = tpts[-1] if i % 3 else tpts[max(0, len(tpts) - 3)]
        d = Vector((math.cos(a) * math.sin(math.radians(sp["spread"])), math.sin(a) * math.sin(math.radians(sp["spread"])), math.cos(math.radians(sp["spread"])) + sp["up"] * 0.4)).normalized()
        sk.branch(att, d, (H - th * 0.7) * sp["limb"] * rng.uniform(0.8, 1.15), trad[-1] * sp["limb_r"] * rng.uniform(0.85, 1.1), 1, mx, sp, sp["kids"])
    if stage >= 3:
        pass
    cs = 0.55 + 0.45 * k
    ls = 0.8 + 0.5 * k
    for pos, d, r, lv in sk.tips:
        if pos.z < th * 1.12:
            continue   # keep the trunk readable: no foliage low on the tree
        clump(foliage, leafm, rng, pos + Vector((0, 0, clump_r * 0.18)), clump_r * cs, int(per_clump * (0.8 + 0.9 * k)), leaf_len * ls, leaf_w * ls, shape, up=sp.get("leaf_up", 0.35), flat=sp.get("flat", 0.65), droop=sp.get("leaf_droop", 0.3))
    # a few clumps along the outer branches so the crown has depth
    for q in [q for q in sk.mid if q.z >= th * 1.12][:: max(1, len(sk.mid) // (6 + 4 * stage))]:
        clump(foliage, leafm, rng, q + Vector((0, 0, clump_r * 0.1)), clump_r * 0.6 * cs, int(per_clump * 0.6), leaf_len * 0.9 * ls, leaf_w * ls, shape, up=0.3, flat=0.6)
    if extra:
        extra(col, root, rng, stage, sk, foliage, H, k)
    wood.finish(f"{root.name}_wood", col).parent = root
    foliage.finish(f"{root.name}_leaves", col).parent = root


def mango(col, root, rng, stage, H, k):
    leafm = leafmat("m2_mango", (0.008, 0.05, 0.01), (0.07, 0.3, 0.025), 0.4, 0.18, 0.2)
    bm = bark("m2_mango_bark", (0.04, 0.03, 0.025), (0.17, 0.13, 0.1))
    sm = PM.stem("m2_stem")
    fruitm = M.matte((0.95, 0.5, 0.04), 0.45, "m2_mango_fruit")
    sp = dict(gnarl=0.1, up=0.15, droop=0.18, taper=0.55, crown_start=0.9, spread=62, lenf=0.6, radf=0.62, kids=3, limb=0.55, limb_r=0.8, flat=0.65, leaf_up=0.3, leaf_droop=0.35)

    def fruits(col, root, rng, stage, sk, foliage, H, k):
        if stage < 5:
            return
        n = {5: 5, 6: 10, 7: 16}[stage]
        for _ in range(n):
            pos, d, r, lv = sk.tips[rng.randint(0, len(sk.tips) - 1)]
            p = pos + Vector((rng.uniform(-0.25, 0.25), rng.uniform(-0.25, 0.25), -0.12 - rng.uniform(0, 0.2)))
            wood = Builder()
            tube(wood, sm, [p + Vector((0, 0, 0.14)), p + Vector((0, 0, 0.04))], [0.004, 0.004], segments=3)
            wood.finish("stalk", col).parent = root
            ball(col, root, fruitm, p, 0.085, 0.085, 0.14, "mango")

    broadleaf(col, root, rng, stage, H, k, sp, leafm, shape_lanceolate, 0.17, 0.055, bm, sm, 0.85 * (0.55 + 0.5 * k), 110, extra=fruits, trunk_frac=0.46)


def neem(col, root, rng, stage, H, k):
    leafm = leafmat("m2_neem", (0.02, 0.1, 0.01), (0.18, 0.42, 0.04), 0.45, 0.22)
    bm = bark("m2_neem_bark", (0.06, 0.045, 0.035), (0.26, 0.2, 0.15))
    sm = PM.stem("m2_nstem", (0.14, 0.2, 0.06))
    sp = dict(gnarl=0.16, up=0.28, droop=0.12, taper=0.5, crown_start=0.85, spread=52, lenf=0.6, radf=0.62, kids=3, limb=0.6, limb_r=0.75, flat=0.55)
    wood = Builder()
    fol = Builder()
    if stage == 1:
        seedling(col, root, rng, leafm, sm, shape_leaflet, 0.09, 7, 0.35)
        return
    r0 = 0.04 * H ** 0.85 * (0.75 + 0.06 * stage)
    th = H * 0.46
    tpts, trad = trunk_and_roots(wood, bark("m2_neem_bark", (0.06, 0.045, 0.035), (0.26, 0.2, 0.15)), rng, th, r0, 0.07, 0.8 if stage >= 3 else 0.2, 5 if stage >= 4 else 0)
    sk = Skeleton(wood, bark("m2_neem_bark", (0.06, 0.045, 0.035), (0.26, 0.2, 0.15)), rng)
    mx = levels_for(stage)
    main = {2: 2, 3: 3, 4: 4, 5: 5, 6: 6, 7: 7}[stage]
    for i in range(main):
        a = i / main * TAU + rng.uniform(-0.5, 0.5)
        att = tpts[-1] if i % 2 else tpts[max(0, len(tpts) - 3)]
        d = Vector((math.cos(a) * 0.8, math.sin(a) * 0.8, 0.75 + sp["up"])).normalized()
        sk.branch(att, d, (H - th * 0.6) * sp["limb"] * rng.uniform(0.75, 1.15), trad[-1] * sp["limb_r"] * rng.uniform(0.85, 1.1), 1, mx, sp, sp["kids"])
    cs = 0.55 + 0.45 * k
    for pos, d, r, lv in sk.tips:
        for _ in range(int(14 + 18 * k)):
            a = rng.uniform(0, TAU)
            dd = (Vector((math.cos(a), math.sin(a), rng.uniform(0.1, 0.8)))).normalized()
            spray(fol, leafm, sm, rng, pos + dd * rng.uniform(0, 0.2), dd, (0.42 + 0.3 * k) * cs, 8, 0.1, 0.045, droop=0.55)
    for q in sk.mid[:: max(1, len(sk.mid) // (5 + 3 * stage))]:
        a = rng.uniform(0, TAU)
        spray(fol, leafm, sm, rng, q, Vector((math.cos(a), math.sin(a), 0.3)).normalized(), 0.4 * cs, 8, 0.1, 0.045, droop=0.5)
    wood.finish("neem_wood", col).parent = root
    fol.finish("neem_leaves", col).parent = root


def gulmohar(col, root, rng, stage, H, k):
    leafm = leafmat("m2_gul", (0.04, 0.14, 0.015), (0.2, 0.42, 0.05), 0.45, 0.25)
    bm = bark("m2_gul_bark", (0.07, 0.055, 0.04), (0.3, 0.23, 0.17))
    sm = PM.stem("m2_gstem", (0.16, 0.22, 0.07))
    flow = _flower_mat("m2_gulflower", (0.92, 0.12, 0.04), (0.95, 0.75, 0.1))
    sp = dict(gnarl=0.13, up=0.1, droop=0.2, taper=0.5, crown_start=0.85, spread=70, lenf=0.62, radf=0.62, kids=3, limb=0.75, limb_r=0.75, flat=0.4)
    wood = Builder()
    fol = Builder()
    if stage == 1:
        seedling(col, root, rng, leafm, sm, shape_leaflet, 0.08, 8, 0.3)
        return
    r0 = 0.04 * H ** 0.85 * (0.75 + 0.06 * stage)
    th = H * 0.45
    tpts, trad = trunk_and_roots(wood, bm, rng, th, r0, 0.07, 0.8 if stage >= 3 else 0.2, 5 if stage >= 4 else 0)
    sk = Skeleton(wood, bm, rng)
    mx = levels_for(stage)
    main = {2: 2, 3: 3, 4: 4, 5: 5, 6: 6, 7: 6}[stage]
    for i in range(main):
        a = i / main * TAU + rng.uniform(-0.4, 0.4)
        att = tpts[-1] if i % 2 else tpts[max(0, len(tpts) - 3)]
        d = Vector((math.cos(a) * 1.1, math.sin(a) * 1.1, 0.7)).normalized()
        sk.branch(att, d, (H - th * 0.5) * sp["limb"] * rng.uniform(0.8, 1.15), trad[-1] * sp["limb_r"], 1, mx, sp, sp["kids"])
    cs = 0.55 + 0.45 * k
    bloom = {1: 0, 2: 0, 3: 0, 4: 0.25, 5: 0.55, 6: 0.8, 7: 1.0}[stage]
    fl = Builder()
    fmat = flow
    for pos, d, r, lv in sk.tips:
        for _ in range(int(14 + 16 * k)):
            a = rng.uniform(0, TAU)
            dd = Vector((math.cos(a), math.sin(a), rng.uniform(0.15, 0.7))).normalized()
            spray(fol, leafm, sm, rng, pos + dd * rng.uniform(0, 0.2), dd, (0.36 + 0.26 * k) * cs, 9, 0.075, 0.034, droop=0.4)
        if rng.random() < bloom:
            for _ in range(int(5 + 9 * k)):
                c = pos + Vector((rng.uniform(-0.45, 0.45) * cs, rng.uniform(-0.45, 0.45) * cs, rng.uniform(0.0, 0.3) * cs))
                _flower(fl, fmat, c, Vector((rng.uniform(-0.4, 0.4), rng.uniform(-0.4, 0.4), 1)).normalized(), 0.1 * (0.8 + 0.3 * k), rng, petals=5, layers=1)
    wood.finish("gul_wood", col).parent = root
    fol.finish("gul_leaves", col).parent = root
    if fl.mats:
        fl.finish("gul_flowers", col).parent = root


def banyan(col, root, rng, stage, H, k):
    leafm = leafmat("m2_banyan", (0.006, 0.05, 0.01), (0.06, 0.28, 0.02), 0.35, 0.18, 0.3)
    bm = bark("m2_banyan_bark", (0.05, 0.04, 0.03), (0.2, 0.16, 0.12))
    sm = PM.stem("m2_bstem")
    rootm = bark("m2_banyan_root", (0.08, 0.055, 0.035), (0.24, 0.17, 0.11))
    sp = dict(gnarl=0.11, up=0.04, droop=0.1, taper=0.62, crown_start=0.8, spread=78, lenf=0.62, radf=0.65, kids=3, limb=0.78, limb_r=0.85, flat=0.5, leaf_up=0.25)
    wood = Builder()
    fol = Builder()
    if stage == 1:
        seedling(col, root, rng, leafm, sm, shape_ovate, 0.11, 6, 0.55)
        return
    r0 = 0.062 * H ** 0.85 * (0.8 + 0.07 * stage)
    th = H * 0.38
    tpts, trad = trunk_and_roots(wood, bm, rng, th, r0, 0.05, 1.1 if stage >= 3 else 0.2, 7 if stage >= 4 else 0, 0.55)
    sk = Skeleton(wood, bm, rng)
    mx = levels_for(stage)
    main = {2: 2, 3: 3, 4: 5, 5: 6, 6: 7, 7: 8}[stage]
    for i in range(main):
        a = i / main * TAU + rng.uniform(-0.4, 0.4)
        att = tpts[-1] if i % 2 else tpts[max(0, len(tpts) - 3)]
        d = Vector((math.cos(a) * 1.3, math.sin(a) * 1.3, 0.55)).normalized()
        sk.branch(att, d, (H - th * 0.4) * sp["limb"] * rng.uniform(0.8, 1.15), trad[-1] * sp["limb_r"], 1, mx, sp, sp["kids"])
    cs = 0.55 + 0.45 * k
    for pos, d, r, lv in sk.tips:
        clump(fol, leafm, rng, pos + Vector((0, 0, 0.1)), 0.95 * cs, int(260 * (0.6 + 0.7 * k)), 0.17 * (0.8 + 0.4 * k), 0.095, shape_ovate, up=0.25, flat=0.5, droop=0.3, fold=0.3)
    for q in sk.mid[:: max(1, len(sk.mid) // (7 + 4 * stage))]:
        clump(fol, leafm, rng, q + Vector((0, 0, 0.1)), 0.7 * cs, 60, 0.15, 0.09, shape_ovate, up=0.3, flat=0.55, droop=0.3)
    # aerial roots hang from the limbs: none at first, then more and thicker, the oldest reaching the ground as pillar roots
    if stage >= 3 and sk.mid:
        n = {3: 3, 4: 8, 5: 16, 6: 26, 7: 40}[stage]
        for i in range(n):
            q = sk.mid[rng.randint(0, len(sk.mid) - 1)]
            reach = q.z * (rng.uniform(0.35, 0.8) if (stage < 6 or i % 4) else 1.0)
            pts = [q + Vector((rng.uniform(-0.03, 0.03) * j, rng.uniform(-0.03, 0.03) * j, -reach * j / 6)) for j in range(7)]
            thick = 0.024 + 0.014 * k + (0.05 if reach >= q.z * 0.99 else 0)
            tube(wood, rootm, pts, [thick * (1.1 - 0.5 * j / 6) for j in range(7)], segments=5, var=rng.random())
    wood.finish("banyan_wood", col).parent = root
    fol.finish("banyan_leaves", col).parent = root


def pine(col, root, rng, stage, H, k):
    needlem = leafmat("m2_pine", (0.004, 0.045, 0.02), (0.04, 0.2, 0.07), 0.5, 0.15)
    bm = bark("m2_pine_bark", (0.08, 0.045, 0.03), (0.34, 0.2, 0.12))
    sm = PM.stem("m2_pstem", (0.12, 0.08, 0.04))
    wood = Builder()
    fol = Builder()
    if stage == 1:
        seedling(col, root, rng, needlem, sm, shape_lanceolate, 0.1, 9, 0.07)
        return
    r0 = 0.03 * H ** 0.9 * (0.8 + 0.07 * stage)
    pts = walk(rng, Vector((0, 0, 0)), Vector((0.01, 0, 1)), H * 0.94, 12, 0.02, 0.1)
    radii = radii_for(pts, r0, r0 * 0.12, rng, 0.04, 0.5 if stage >= 3 else 0.1)
    tube(wood, bm, pts, radii, segments=9, var=rng.random())
    tiers = {2: 3, 3: 5, 4: 7, 5: 9, 6: 11, 7: 13}[stage]
    for i in range(tiers):
        t = 0.2 + 0.78 * i / max(1, tiers - 1)
        idx = min(len(pts) - 2, int(t * (len(pts) - 1)))
        base = pts[idx]
        Lb = (1.08 - t) ** 0.95 * H * 0.27 * (0.8 + 0.2 * k) + 0.12
        arms = 5 + (i % 2)
        for a in range(arms):
            th = a / arms * TAU + i * 0.9 + rng.uniform(-0.25, 0.25)
            L = Lb * rng.uniform(0.8, 1.1)
            d = Vector((math.cos(th), math.sin(th), 0.1 - 0.2 * (1 - t)))
            bp = walk(rng, base, d, L, 4, 0.04, 0.0, droop=0.3 * (1 - t))
            rb = max(0.006, radii[idx] * 0.34 * (1 - 0.5 * t))
            tube(wood, bm, bp, [rb, rb * 0.8, rb * 0.55, rb * 0.3, rb * 0.15], segments=4)
            for j in range(1, 5):
                c = bp[j]
                c = c + Vector((0, 0, 0.0))
                dd = (bp[j] - bp[j - 1]).normalized()
                tuftn = int(34 * (0.7 + 0.5 * k))
                for _ in range(tuftn):
                    nd = (dd * 0.6 + Vector((rng.uniform(-0.8, 0.8), rng.uniform(-0.8, 0.8), rng.uniform(-0.2, 0.9)))).normalized()
                    leaf(fol, needlem, frame_at(c + nd * 0.01, nd), 0.3 * (0.8 + 0.4 * k) * rng.uniform(0.7, 1.2), 0.035, shape_lanceolate, nu=1, nv=2, fold=0.0, arch=0.15, var=rng.random())
    # a leader of needles at the top
    for _ in range(40):
        nd = Vector((rng.uniform(-0.5, 0.5), rng.uniform(-0.5, 0.5), 1)).normalized()
        leaf(fol, needlem, frame_at(pts[-1] - Vector((0, 0, 0.15)), nd), 0.3, 0.035, shape_lanceolate, nu=1, nv=2, fold=0, arch=0.1, var=rng.random())
    wood.finish("pine_wood", col).parent = root
    fol.finish("pine_needles", col).parent = root


def coconut(col, root, rng, stage, H, k):
    frondm = leafmat("m2_coco", (0.02, 0.1, 0.01), (0.14, 0.42, 0.04), 0.4, 0.25)
    bm = bark("m2_coco_bark", (0.07, 0.05, 0.035), (0.24, 0.18, 0.12), 0.7)
    sm = PM.stem("m2_cstem", (0.1, 0.14, 0.03))
    nutm = M.matte((0.15, 0.2, 0.03), 0.5, "m2_coconut")
    wood = Builder()
    fol = Builder()
    if stage == 1:
        seedling(col, root, rng, frondm, sm, shape_lanceolate, 0.16, 3, 0.12)
        return
    lean = Vector((0.5, 0.18, 0)) * (0.2 + 0.6 * k)
    pts = []
    n = 14
    for i in range(n + 1):
        t = i / n
        pts.append(Vector((lean.x * t ** 2 * H * 0.3, lean.y * t ** 2 * H * 0.3, H * t)))
    r0 = 0.065 * (H ** 0.7) * (0.75 + 0.05 * stage)
    # ringed trunk: swell at each leaf scar, thicker at the base
    radii = []
    for i, p in enumerate(pts):
        t = i / n
        base = (1 + 0.9 * (1 - t) ** 6) * (1 - 0.3 * t)
        radii.append(r0 * base * (1 + 0.09 * math.sin(p.z * 14)))
    tube(wood, bm, pts, radii, segments=10, var=rng.random())
    top = pts[-1]
    nf = {2: 4, 3: 6, 4: 8, 5: 10, 6: 12, 7: 14}[stage]
    FL = {2: 0.5, 3: 0.8, 4: 1.2, 5: 1.7, 6: 2.1, 7: 2.5}[stage]
    for i in range(nf):
        a = i / nf * TAU + rng.uniform(-0.2, 0.2)
        up = 0.9 if i % 3 == 0 else rng.uniform(0.2, 0.55)
        d0 = Vector((math.cos(a) * 0.55, math.sin(a) * 0.55, up)).normalized()
        L = FL * rng.uniform(0.85, 1.15)
        rach = []
        for j in range(9):
            t = j / 8
            hd = Vector((math.cos(a), math.sin(a), 0))
            rach.append(top + hd * (L * 0.95 * t) + Vector((0, 0, up * L * 0.55 * math.sin(t * 2.0) - L * 0.55 * t ** 2.2)))
        tube(wood, sm, rach, [0.014 * (1 - 0.8 * j / 8) for j in range(9)], segments=4)
        side = Vector((-math.sin(a), math.cos(a), 0))
        for j in range(1, 9):
            p = rach[j]
            tv = (rach[min(8, j + 1)] - rach[j - 1]).normalized()
            ll = L * 0.3 * (1 - 0.5 * abs(j / 8 - 0.35))
            for sg in (-1, 1):
                for rep in range(2):
                    dd = (side * sg * 1.0 + Vector((0, 0, -0.55)) + tv * (0.25 + 0.3 * rep)).normalized()
                    leaf(fol, frondm, frame_at(p + tv * 0.02 * rep, dd), ll, 0.05, shape_lanceolate, nu=1, nv=3, fold=0.3, arch=0.2, var=rng.random())
    if stage >= 5:
        for i in range(3 + (stage - 5) * 4):
            a = rng.uniform(0, TAU)
            ball(col, root, nutm, top + Vector((math.cos(a) * 0.14, math.sin(a) * 0.14, -0.14 - rng.uniform(0, 0.1))), 0.07, 0.07, 0.09, "coconut")
    wood.finish("coco_trunk", col).parent = root
    fol.finish("coco_fronds", col).parent = root
