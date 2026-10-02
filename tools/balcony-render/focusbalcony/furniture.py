"""Furniture. Convention: root Empty at floor level, centred; the piece's
front faces local -Y (toward the camera at rotation 0)."""
import math
import bmesh
import bpy
from mathutils import Matrix, Vector

from . import materials as M
from . import textiles as T
from .common import DEG, Rng, add_subsurf, box, cylinder, link, mesh_object
from .geo import Builder, tube


def _root(name, col):
    root = bpy.data.objects.new(name, None)
    link(root, col)
    return root


def _p(obj, root):
    obj.parent = root
    return obj


def cushion(name, size, location, mat, col, root, softness=0.035, tilt=0.0, sag=0.012):
    """A soft cushion: bevelled box, subdivided, with a slightly sunken top."""
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    bmesh.ops.scale(bm, vec=Vector(size), verts=bm.verts)
    bmesh.ops.subdivide_edges(bm, edges=bm.edges[:], cuts=6, use_grid_fill=True)
    for v in bm.verts:
        # belly: puff the faces outward, sink the top centre a touch
        nx, ny = v.co.x / (size[0] / 2), v.co.y / (size[1] / 2)
        if v.co.z > 0:
            v.co.z -= sag * (1 - nx * nx) * (1 - ny * ny)
        v.co.z *= 1.0 + 0.12 * (1 - nx * nx) * (1 - ny * ny)
    obj = mesh_object(name, bm, mat, col)
    b = obj.modifiers.new("bevel", "BEVEL")
    b.width = softness
    b.segments = 4
    add_subsurf(obj, 2)
    obj.location = location
    obj.rotation_euler = (tilt, 0, 0)
    return _p(obj, root)


def _webbing_panel(name, w, h, mat, col, root, location, rotation=(0, 0, 0), bow=0.0):
    """Flat cane panel in its own XZ plane, UVs in metres for the weave."""
    bm = bmesh.new()
    uv = bm.loops.layers.uv.new("UVMap")
    nu, nv = 12, 12
    verts = [[bm.verts.new((-w / 2 + w * i / nu, bow * math.sin(math.pi * i / nu) * math.sin(math.pi * j / nv), -h / 2 + h * j / nv))
              for i in range(nu + 1)] for j in range(nv + 1)]
    for j in range(nv):
        for i in range(nu):
            f = bm.faces.new((verts[j][i], verts[j][i + 1], verts[j + 1][i + 1], verts[j + 1][i]))
            for loop, (jj, ii) in zip(f.loops, ((j, i), (j, i + 1), (j + 1, i + 1), (j + 1, i))):
                loop[uv].uv = (w * ii / nu, h * jj / nv)
    obj = mesh_object(name, bm, mat, col)
    obj.location = location
    obj.rotation_euler = rotation
    return _p(obj, root)


def _teak_bar(name, length, w, h, mat, col, root, a: Vector, b: Vector, bevel=0.006):
    """A square-section bar from a to b (centre line)."""
    d = b - a
    obj = box(name, (w, h, d.length), (0, 0, 0), mat, col, bevel=bevel, segments=3)
    obj.location = (a + b) / 2
    obj.rotation_euler = Vector((0, 0, 1)).rotation_difference(d.normalized()).to_euler()
    return _p(obj, root)


# ---- cane lounge chair ------------------------------------------------------------

def cane_lounge_chair(col, seed=1, cushion_color=(0.74, 0.70, 0.62)):
    root = _root("cane_lounge_chair", col)
    teak = M.wood((0.085, 0.04, 0.018), (0.24, 0.115, 0.05), 0.4, 4.0, "teak_chair")
    cane = T.cane_webbing()
    W, D, SH = 0.68, 0.72, 0.36
    # legs (slightly splayed, tapered by bevel), seat rails, arms
    for sx in (-1, 1):
        for sy in (-1, 1):
            top = Vector((sx * (W / 2 - 0.04), sy * (D / 2 - 0.05), SH))
            bot = Vector((sx * (W / 2 - 0.01), sy * (D / 2 - 0.02), 0.0))
            _teak_bar(f"leg_{sx}_{sy}", 0, 0.038, 0.038, teak, col, root, bot, top)
        # arm: front post up to the arm, flat arm board sloping back slightly
        _teak_bar(f"arm_post_{sx}", 0, 0.034, 0.034, teak, col, root,
                  Vector((sx * (W / 2 - 0.04), -D / 2 + 0.06, SH)), Vector((sx * (W / 2 - 0.04), -D / 2 + 0.07, 0.6)))
        arm = box(f"arm_{sx}", (0.06, D - 0.02, 0.026), (sx * (W / 2 - 0.04), 0.0, 0.615), teak, col, bevel=0.009, segments=4)
        arm.rotation_euler = (-3 * DEG, 0, 0)
        _p(arm, root)
        _teak_bar(f"rail_side_{sx}", 0, 0.03, 0.05, teak, col, root,
                  Vector((sx * (W / 2 - 0.04), -D / 2 + 0.05, SH - 0.02)), Vector((sx * (W / 2 - 0.04), D / 2 - 0.05, SH - 0.02)))
    for sy in (-1, 1):
        _teak_bar(f"rail_fb_{sy}", 0, 0.05, 0.03, teak, col, root,
                  Vector((-W / 2 + 0.04, sy * (D / 2 - 0.05), SH - 0.02)), Vector((W / 2 - 0.04, sy * (D / 2 - 0.05), SH - 0.02)))
    # seat panel (cane) just under the cushion
    _webbing_panel("seat_cane", W - 0.1, D - 0.12, cane, col, root, (0, 0, SH - 0.005), (90 * DEG, 0, 0))
    # back: two raked posts, a curved top rail, cane panel between them
    rake = 16 * DEG
    back_h = 0.5
    for sx in (-1, 1):
        a = Vector((sx * (W / 2 - 0.06), D / 2 - 0.05, SH - 0.02))
        b = a + Vector((0, math.sin(rake), math.cos(rake))) * back_h
        _teak_bar(f"back_post_{sx}", 0, 0.034, 0.034, teak, col, root, a, b)
    top_c = Vector((0, D / 2 - 0.05, SH - 0.02)) + Vector((0, math.sin(rake), math.cos(rake))) * back_h
    tr = box("back_top", (W - 0.1, 0.03, 0.055), top_c, teak, col, bevel=0.01, segments=4)
    tr.rotation_euler = (-rake, 0, 0)
    _p(tr, root)
    mid = Vector((0, D / 2 - 0.05, SH - 0.02)) + Vector((0, math.sin(rake), math.cos(rake))) * (back_h * 0.5)
    _webbing_panel("back_cane", W - 0.14, back_h - 0.08, cane, col, root, mid, (-rake, 0, 0), bow=0.02)
    # cushions: seat + lumbar + a block-print throw pillow
    cushion("seat_cushion", (W - 0.12, D - 0.14, 0.085), (0, -0.01, SH + 0.045), T.linen("linen_chair", cushion_color), col, root, sag=0.015)
    cushion("back_cushion", (W - 0.16, 0.09, 0.32), (0, D / 2 - 0.13, SH + 0.27), T.linen("linen_chair", cushion_color), col, root,
            softness=0.03, tilt=-rake, sag=0.0)
    pillow = cushion("throw_pillow", (0.36, 0.12, 0.3), (0.12, D / 2 - 0.22, SH + 0.24), T.block_print(), col, root, softness=0.04, tilt=-rake - 0.15, sag=0.0)
    pillow.rotation_euler = (-rake - 0.12, 0.1, -0.15)
    root["footprint"] = (W, D)
    return root


# ---- low teak coffee table with a cup and books -------------------------------------

def teak_coffee_table(col, seed=2, styled=True):
    root = _root("teak_coffee_table", col)
    teak = M.wood((0.08, 0.037, 0.016), (0.23, 0.11, 0.048), 0.36, 5.0, "teak_table")
    R, H = 0.33, 0.42
    top = cylinder("table_top", R, 0.035, (0, 0, H - 0.0175), teak, col, verts=96, bevel=0.01)
    _p(top, root)
    for k in range(3):
        a = k * 2 * math.pi / 3 + 0.5
        t = Vector((math.cos(a) * R * 0.62, math.sin(a) * R * 0.62, H - 0.035))
        bt = Vector((math.cos(a) * R * 0.82, math.sin(a) * R * 0.82, 0.0))
        b = Builder()
        tube(b, teak, [bt, t], [0.016, 0.022], 16)
        leg = b.finish(f"table_leg_{k}", col)
        _p(leg, root)
    shelf = cylinder("table_shelf", R * 0.7, 0.02, (0, 0, 0.14), teak, col, verts=72, bevel=0.005)
    _p(shelf, root)
    if styled:
        # two hardback books and a ceramic cup of chai on a saucer
        cover_a = T.linen("book_cloth_a", (0.12, 0.2, 0.17), 0.2)
        cover_b = T.linen("book_cloth_b", (0.42, 0.13, 0.06), 0.2)
        pages = M.matte((0.68, 0.64, 0.56), 0.9, "book_pages")
        for i, (c, w, d, h, rz) in enumerate(((cover_a, 0.17, 0.24, 0.028, 0.18), (cover_b, 0.15, 0.21, 0.022, -0.1))):
            z = H + 0.002 + sum((0.028, 0.022)[:i]) + h / 2
            bk = box(f"book_{i}", (w, d, h), (-0.08, 0.06, z), c, col, bevel=0.003)
            bk.rotation_euler = (0, 0, rz)
            _p(bk, root)
            pg = box(f"pages_{i}", (w - 0.01, d - 0.012, h - 0.006), (-0.08 + 0.004, 0.06, z), pages, col)
            pg.rotation_euler = (0, 0, rz)
            _p(pg, root)
        glaze = M.matte((0.55, 0.47, 0.35), 0.25, "cup_glaze")
        sau = cylinder("saucer", 0.065, 0.012, (0.15, -0.07, H + 0.006), glaze, col, verts=48, radius_top=0.07, bevel=0.003)
        cup = cylinder("cup", 0.037, 0.07, (0.15, -0.07, H + 0.047), glaze, col, verts=48, radius_top=0.042, bevel=0.003)
        tea = cylinder("tea", 0.039, 0.002, (0.15, -0.07, H + 0.074), M.matte((0.18, 0.08, 0.03), 0.05, "chai"), col, verts=48)
        for o in (sau, cup, tea):
            _p(o, root)
    root["footprint"] = (2 * R, 2 * R)
    return root


# ---- daybed with bolsters and a folded throw ---------------------------------------

def daybed(col, seed=3):
    root = _root("daybed", col)
    teak = M.wood((0.08, 0.037, 0.016), (0.22, 0.105, 0.046), 0.42, 4.0, "teak_daybed")
    L, W, H = 1.85, 0.72, 0.3
    _p(box("db_frame", (L, W, 0.06), (0, 0, H - 0.03), teak, col, bevel=0.01, segments=4), root)
    for sx in (-1, 1):
        for sy in (-1, 1):
            _p(box(f"db_leg_{sx}{sy}", (0.06, 0.06, H - 0.06), (sx * (L / 2 - 0.05), sy * (W / 2 - 0.05), (H - 0.06) / 2), teak, col, bevel=0.008), root)
    cushion("db_mattress", (L - 0.04, W - 0.04, 0.13), (0, 0, H + 0.065), T.linen("linen_daybed", (0.7, 0.66, 0.58)), col, root, softness=0.045, sag=0.01)
    # bolsters at each end and three throw cushions against the glass side
    bol = T.handloom_stripes("bolster_stripes", ((0.32, 0.1, 0.04), (0.6, 0.55, 0.45), (0.05, 0.05, 0.1)), 0.025)
    for sx in (-1, 1):
        c = cylinder(f"bolster_{sx}", 0.1, W - 0.12, (sx * (L / 2 - 0.13), 0, H + 0.13 + 0.1), bol, col, verts=40, bevel=0.03)
        c.rotation_euler = (90 * DEG, 0, 0)
        _p(c, root)
    prints = [T.block_print("print_indigo"), T.linen("linen_mustard", (0.5, 0.33, 0.06), 0.4),
              T.block_print("print_rust", (0.32, 0.08, 0.03), (0.62, 0.52, 0.38), 12.0)]
    for i, m in enumerate(prints):
        p = cushion(f"db_pillow_{i}", (0.42, 0.13, 0.38), (-0.45 + i * 0.45, W / 2 - 0.12, H + 0.32), m, col, root, softness=0.045, tilt=-0.25, sag=0.0)
        p.rotation_euler = (-0.25, 0, (i - 1) * 0.12)
    throw = cushion("db_throw", (0.5, W - 0.1, 0.035), (L / 2 - 0.45, 0, H + 0.145), T.handloom_stripes(), col, root, softness=0.012, sag=0.0)
    root["footprint"] = (L, W)
    return root


# ---- study corner: writing desk, cane side chair, brass lamp -------------------------

def study_set(col, seed=4):
    root = _root("study_set", col)
    teak = M.wood((0.085, 0.04, 0.018), (0.24, 0.115, 0.05), 0.4, 4.0, "teak_desk")
    DW, DD, DH = 0.95, 0.5, 0.75
    _p(box("desk_top", (DW, DD, 0.03), (0, 0, DH - 0.015), teak, col, bevel=0.006, segments=3), root)
    _p(box("desk_apron", (DW - 0.06, DD - 0.06, 0.09), (0, 0, DH - 0.075), teak, col, bevel=0.004), root)
    for sx in (-1, 1):
        for sy in (-1, 1):
            _teak_bar(f"desk_leg_{sx}{sy}", 0, 0.04, 0.04, teak, col, root,
                      Vector((sx * (DW / 2 - 0.04), sy * (DD / 2 - 0.04), 0)), Vector((sx * (DW / 2 - 0.05), sy * (DD / 2 - 0.05), DH - 0.03)))
    brass = M.metal((0.7, 0.48, 0.2), 0.28, "brass")
    _p(cylinder("lamp_base", 0.07, 0.02, (0.3, 0.1, DH + 0.01), brass, col, verts=48, bevel=0.004), root)
    b = Builder()
    tube(b, brass, [Vector((0.3, 0.1, DH + 0.02)), Vector((0.3, 0.1, DH + 0.36)), Vector((0.22, 0.05, DH + 0.42))], [0.008, 0.008, 0.008], 12)
    _p(b.finish("lamp_arm", col), root)
    shade = cylinder("lamp_shade", 0.07, 0.11, (0.18, 0.02, DH + 0.38), brass, col, verts=48, radius_top=0.03)
    shade.rotation_euler = (0, 35 * DEG, 0)
    _p(shade, root)
    nb = box("notebook", (0.2, 0.27, 0.012), (-0.12, -0.05, DH + 0.006), T.linen("notebook", (0.05, 0.12, 0.1), 0.2), col, bevel=0.002)
    nb.rotation_euler = (0, 0, 0.12)
    _p(nb, root)
    pen = cylinder("pen", 0.005, 0.14, (-0.02, -0.08, DH + 0.016), brass, col, verts=12)
    pen.rotation_euler = (90 * DEG, 0, 1.2)
    _p(pen, root)
    # cane side chair tucked in front of the desk
    chair = cane_side_chair(col)
    chair.parent = root
    chair.location = (-0.05, -0.42, 0)
    chair.rotation_euler = (0, 0, 172 * DEG)
    root["footprint"] = (DW, DD + 0.5)
    return root


def cane_side_chair(col):
    root = _root("cane_side_chair", col)
    teak = M.wood((0.085, 0.04, 0.018), (0.24, 0.115, 0.05), 0.4, 4.0, "teak_chair")
    cane = T.cane_webbing()
    W, D, SH = 0.46, 0.48, 0.45
    for sx in (-1, 1):
        for sy in (-1, 1):
            top_z = SH if sy < 0 else SH + 0.42
            _teak_bar(f"sc_leg_{sx}{sy}", 0, 0.032, 0.032, teak, col, root,
                      Vector((sx * (W / 2 - 0.02), sy * (D / 2 - 0.02), 0)), Vector((sx * (W / 2 - 0.03), sy * (D / 2 - 0.03), top_z)))
    _p(box("sc_seat_frame", (W - 0.02, D - 0.02, 0.03), (0, 0, SH - 0.015), teak, col, bevel=0.006), root)
    _webbing_panel("sc_seat", W - 0.08, D - 0.08, cane, col, root, (0, 0, SH + 0.001), (90 * DEG, 0, 0))
    _webbing_panel("sc_back", W - 0.1, 0.26, cane, col, root, (0, D / 2 - 0.03, SH + 0.24), (0, 0, 0), bow=0.015)
    _p(box("sc_back_top", (W - 0.04, 0.03, 0.05), (0, D / 2 - 0.03, SH + 0.4), teak, col, bevel=0.008, segments=3), root)
    return root


BUILDERS = {
    "cane_lounge_chair": cane_lounge_chair,
    "teak_coffee_table": teak_coffee_table,
    "daybed": daybed,
    "study_set": study_set,
}
