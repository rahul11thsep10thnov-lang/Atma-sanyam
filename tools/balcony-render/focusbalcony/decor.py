"""Decor: lantern, wind chime, wall shelf, dhurrie rug, framed artwork."""
import math
import bmesh
import bpy
from mathutils import Vector

from . import materials as M
from . import plants as P
from . import textiles as T
from .common import DEG, Rng, box, cylinder, link, mesh_object
from .geo import Builder, tube


def _root(name, col):
    root = bpy.data.objects.new(name, None)
    link(root, col)
    return root


def _p(o, root):
    o.parent = root
    return o


def lantern(col, seed=1, lit=False):
    root = _root("lantern", col)
    iron = M.powder_coat((0.02, 0.019, 0.018), 0.45, "lantern_iron")
    S, H = 0.2, 0.36
    _p(box("ln_base", (S + 0.02, S + 0.02, 0.025), (0, 0, 0.0125), iron, col, bevel=0.004), root)
    for sx in (-1, 1):
        for sy in (-1, 1):
            _p(box(f"ln_post_{sx}{sy}", (0.012, 0.012, H), (sx * S / 2, sy * S / 2, 0.025 + H / 2), iron, col, bevel=0.002), root)
    g = M.glass((0.97, 0.95, 0.9), "lantern_glass")
    for i, (sx, sy, rz) in enumerate(((0, -1, 0), (0, 1, 0), (-1, 0, 90), (1, 0, 90))):
        pane = box(f"ln_glass_{i}", (S - 0.014, 0.004, H - 0.01), (sx * S / 2, sy * S / 2, 0.025 + H / 2), g, col)
        pane.rotation_euler = (0, 0, rz * DEG)
        _p(pane, root)
    _p(box("ln_top", (S + 0.03, S + 0.03, 0.02), (0, 0, 0.025 + H + 0.01), iron, col, bevel=0.004), root)
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, segments=4, radius1=(S + 0.03) * 0.72, radius2=0.02, depth=0.09)
    roof = mesh_object("ln_roof", bm, iron, col)
    roof.location = (0, 0, 0.025 + H + 0.065)
    roof.rotation_euler = (0, 0, 45 * DEG)
    _p(roof, root)
    ring = bpy.data.meshes.new("ln_ring")
    b = Builder()
    pts = [Vector((math.cos(a) * 0.035, 0, 0.025 + H + 0.14 + math.sin(a) * 0.035)) for a in [i * 2 * math.pi / 24 for i in range(25)]]
    tube(b, iron, pts, [0.004] * len(pts), 8)
    _p(b.finish("ln_ring", col), root)
    wax = M.matte((0.75, 0.7, 0.6), 0.6, "candle_wax")
    _p(cylinder("ln_candle", 0.035, 0.12, (0, 0, 0.025 + 0.06), wax, col, verts=32, bevel=0.004), root)
    if lit:
        _p(cylinder("ln_flame", 0.006, 0.025, (0, 0, 0.025 + 0.135), M.emissive((1, 0.6, 0.25), 25.0, "flame"), col, verts=12, radius_top=0.001), root)
    root["footprint"] = (S + 0.03, S + 0.03)
    return root


def wind_chime(col, seed=2, drop=0.55):
    """Origin = ceiling hook."""
    root = _root("wind_chime", col)
    rng = Rng(seed)
    wood = M.wood((0.09, 0.045, 0.02), (0.22, 0.11, 0.05), 0.5, 3.0, "chime_wood")
    brass = M.metal((0.72, 0.5, 0.22), 0.22, "chime_brass")
    thread = P.PM.stem("chime_thread", (0.4, 0.35, 0.28), 0.9)
    b = Builder()
    tube(b, thread, [Vector((0, 0, 0)), Vector((0, 0, -drop * 0.35))], [0.0012, 0.0012], 6)
    disc_z = -drop * 0.35
    _p(cylinder("chime_disc", 0.07, 0.018, (0, 0, disc_z), wood, col, verts=48, bevel=0.004), root)
    n = 6
    for k in range(n):
        a = k * 2 * math.pi / n
        x, y = math.cos(a) * 0.055, math.sin(a) * 0.055
        L = 0.14 + 0.035 * k
        tube(b, thread, [Vector((x, y, disc_z)), Vector((x, y, disc_z - 0.05))], [0.0008, 0.0008], 4)
        _p(cylinder(f"chime_tube_{k}", 0.0075, L, (x, y, disc_z - 0.05 - L / 2), brass, col, verts=24), root)
    tube(b, thread, [Vector((0, 0, disc_z)), Vector((0, 0, disc_z - 0.33))], [0.0008, 0.0008], 4)
    _p(cylinder("chime_striker", 0.03, 0.01, (0, 0, disc_z - 0.16), wood, col, verts=32), root)
    sail = box("chime_sail", (0.07, 0.004, 0.11), (0, 0, disc_z - 0.38), wood, col, bevel=0.002)
    _p(sail, root)
    _p(b.finish("chime_threads", col), root)
    root["sway"] = {"amp": 1.2, "speed": 0.3, "pivot": "top"}
    return root


def wall_shelf(col, seed=3):
    """Origin = wall surface at the shelf's centre height; shelf projects
    along local -Y (out of the wall)."""
    root = _root("wall_shelf", col)
    teak = M.wood((0.085, 0.04, 0.018), (0.24, 0.115, 0.05), 0.4, 4.0, "teak_shelf")
    W, D = 0.62, 0.2
    _p(box("shelf_board", (W, D, 0.035), (0, -D / 2, 0), teak, col, bevel=0.005, segments=3), root)
    rng = Rng(seed)
    cloths = [(0.05, 0.1, 0.09), (0.38, 0.12, 0.05), (0.55, 0.42, 0.18), (0.08, 0.06, 0.15), (0.6, 0.56, 0.48), (0.25, 0.2, 0.12)]
    x = -W / 2 + 0.03
    for i, c in enumerate(cloths):
        th = rng.uniform(0.022, 0.045)
        h = rng.uniform(0.18, 0.24)
        bk = box(f"shelf_book_{i}", (th, 0.15, h), (x + th / 2, -0.09, 0.0175 + h / 2), T.linen(f"spine_{i}", c, 0.2), col, bevel=0.002)
        bk.rotation_euler = (0, rng.uniform(-0.03, 0.03), 0)
        _p(bk, root)
        x += th + 0.002
    lean = box("shelf_book_lean", (0.03, 0.15, 0.2), (x + 0.05, -0.09, 0.0175 + 0.098), T.linen("spine_lean", (0.3, 0.05, 0.05), 0.2), col, bevel=0.002)
    lean.rotation_euler = (0, -0.28, 0)
    _p(lean, root)
    brass = M.metal((0.72, 0.5, 0.22), 0.25, "brass_diya")
    _p(cylinder("diya", 0.04, 0.025, (0.2, -0.09, 0.0175 + 0.0125), brass, col, verts=40, radius_top=0.05, bevel=0.004), root)
    # a small succulent in a white pot
    sp = P.snake_plant(col, seed=19, height=0.17, pot_kind="cylinder_glazed")
    sp.scale = (0.38, 0.38, 0.38)
    sp.location = (0.08, -0.09, 0.0175)
    sp.parent = root
    root["footprint"] = (W, D)
    return root


def dhurrie_rug(col, seed=4, length=2.2, width=1.5):
    root = _root("dhurrie_rug", col)
    bm = bmesh.new()
    uv = bm.loops.layers.uv.new("UVMap")
    nu, nv = 24, 32
    rng = Rng(seed)
    verts = []
    for j in range(nv + 1):
        row = []
        for i in range(nu + 1):
            x = -width / 2 + width * i / nu
            y = -length / 2 + length * j / nv
            z = 0.006 + (rng.uniform(-0.0015, 0.0015) if 0 < i < nu and 0 < j < nv else 0)
            row.append(bm.verts.new((x, y, z)))
        verts.append(row)
    for j in range(nv):
        for i in range(nu):
            f = bm.faces.new((verts[j][i], verts[j][i + 1], verts[j + 1][i + 1], verts[j + 1][i]))
            for loop, (jj, ii) in zip(f.loops, ((j, i), (j, i + 1), (j + 1, i + 1), (j + 1, i))):
                loop[uv].uv = (ii / nu, jj / nv)
    rug = mesh_object("rug", bm, T.dhurrie(), col)
    s = rug.modifiers.new("solid", "SOLIDIFY")
    s.thickness = 0.006
    _p(rug, root)
    # fringe at both short ends
    fringe = M.matte((0.6, 0.55, 0.45), 0.95, "fringe")
    b = Builder()
    for sy in (-1, 1):
        for k in range(60):
            x = -width / 2 + 0.02 + (width - 0.04) * k / 59
            y0 = sy * length / 2
            tube(b, fringe, [Vector((x, y0, 0.004)), Vector((x + rng.uniform(-0.006, 0.006), y0 + sy * rng.uniform(0.04, 0.06), 0.002))], [0.002, 0.0015], 4)
    _p(b.finish("fringe", col), root)
    root["footprint"] = (width, length)
    root["flat"] = True
    return root


def art_frame(col, seed=5, art_w=0.6, art_h=0.8, canvas=None):
    """Origin = wall surface at the artwork centre; the frame stands out along
    local -Y. `canvas` material fills the art opening (white for the light
    map). Returns root with custom props giving the art opening corners."""
    root = _root("art_frame", col)
    teak = M.wood((0.06, 0.03, 0.014), (0.17, 0.085, 0.04), 0.35, 6.0, "teak_frame")
    mat_board = M.matte((0.72, 0.7, 0.65), 0.9, "mat_board")
    mount = 0.07
    prof = 0.045
    ow, oh = art_w + 2 * (mount + prof), art_h + 2 * (mount + prof)
    for (sx, sz, w, h) in ((0, 1, ow, prof), (0, -1, ow, prof), (1, 0, prof, oh), (-1, 0, prof, oh)):
        x = sx * (ow - prof) / 2
        z = sz * (oh - prof) / 2
        _p(box(f"frame_{sx}{sz}", (w, 0.035, h), (x, -0.0175, z), teak, col, bevel=0.006, segments=3), root)
    _p(box("frame_mat", (ow - 2 * prof, 0.004, oh - 2 * prof), (0, -0.012, 0), mat_board, col), root)
    if canvas is not None:
        _p(box("frame_canvas", (art_w, 0.002, art_h), (0, -0.0145, 0), canvas, col), root)
    root["art_size"] = (art_w, art_h)
    root["art_inset_y"] = -0.0155
    return root


BUILDERS = {
    "lantern": lantern,
    "wind_chime": wind_chime,
    "wall_shelf": wall_shelf,
    "dhurrie_rug": dhurrie_rug,
    "art_frame": art_frame,
}
