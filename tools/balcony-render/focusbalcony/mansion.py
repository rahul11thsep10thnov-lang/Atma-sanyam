"""The house the garden belongs to: a wide two-storey mansion front in cream
plaster with a colonnaded verandah, tall shuttered windows, a cornice and
a parapet, seen from the lawn. Rendered once as a sprite for the 3D garden."""
import math
from .common import box, cylinder, Rng
from . import materials as M


def _link(o, root):
    o.parent = root
    return o


def mansion(col, width=30.0, depth=10.0, storeys=2, seed=3):
    import bpy
    rng = Rng(seed)
    root = bpy.data.objects.new("mansion", None)
    col.objects.link(root)
    cream = M.plaster((0.78, 0.72, 0.6), "mansion_plaster")
    trim = M.plaster((0.9, 0.87, 0.8), "mansion_trim")
    stone = M.stone((0.42, 0.38, 0.32), "mansion_plinth")
    dark = M.wood((0.08, 0.04, 0.02), (0.2, 0.11, 0.05), 0.45, 4.0, "mansion_shutter")
    glass = M.glass((0.75, 0.82, 0.85), "mansion_glass")
    terracotta = M.terracotta_tiles(0.3)
    fh = 3.6  # storey height
    H = storeys * fh + 1.0
    # plinth and body
    _link(box("plinth", (width + 1.0, depth + 1.0, 0.8), (0, 0, 0.4), stone, col), root)
    _link(box("body", (width, depth, H - 0.8), (0, 0, 0.8 + (H - 0.8) / 2), cream, col), root)
    # string course between storeys and the cornice
    for z in [0.8 + fh, H - 0.05]:
        _link(box(f"course_{z:.1f}", (width + 0.5, depth + 0.5, 0.22), (0, 0, z), trim, col, bevel=0.02), root)
    # parapet with a balustrade
    _link(box("parapet", (width + 0.5, 0.3, 0.9), (0, -depth / 2 - 0.1, H + 0.45), trim, col), root)
    n = int(width / 0.45)
    for i in range(n):
        x = -width / 2 + 0.3 + i * (width - 0.6) / (n - 1)
        if abs(x) < width / 2 - 0.4:
            _link(cylinder(f"baluster_{i}", 0.06, 0.6, (x, -depth / 2 - 0.1, H + 0.35), trim, col, verts=10), root)
    # verandah: a flat roof on columns across the ground floor front
    vd = 2.6
    _link(box("verandah_roof", (width * 0.6, vd, 0.3), (0, -depth / 2 - vd / 2, 0.8 + fh - 0.15), trim, col), root)
    ncol = 8
    for i in range(ncol):
        x = -width * 0.3 + 0.4 + i * (width * 0.6 - 0.8) / (ncol - 1)
        _link(cylinder(f"column_{i}", 0.2, fh - 0.3, (x, -depth / 2 - vd + 0.3, 0.8 + (fh - 0.3) / 2), trim, col, verts=24), root)
        _link(box(f"cap_{i}", (0.55, 0.55, 0.12), (x, -depth / 2 - vd + 0.3, 0.8 + fh - 0.36), trim, col), root)
        _link(box(f"base_{i}", (0.55, 0.55, 0.1), (x, -depth / 2 - vd + 0.3, 0.85), trim, col), root)
    # steps up to the verandah
    for k in range(4):
        _link(box(f"step_{k}", (5.0 + k * 0.6, 0.35, 0.2), (0, -depth / 2 - vd - 0.2 - k * 0.35, 0.1 + (3 - k) * 0.2), stone, col), root)
    # verandah floor
    _link(box("verandah_floor", (width * 0.6, vd, 0.1), (0, -depth / 2 - vd / 2, 0.85), stone, col), root)
    # door
    _link(box("door", (1.8, 0.1, 2.6), (0, -depth / 2 - 0.05, 0.8 + 1.3), dark, col), root)
    _link(box("fanlight", (1.8, 0.08, 0.5), (0, -depth / 2 - 0.05, 0.8 + 2.9), glass, col), root)
    # windows on both storeys
    for s in range(storeys):
        z0 = 0.8 + s * fh
        nw = 10
        for i in range(nw):
            x = -width / 2 + 2.0 + i * (width - 4.0) / (nw - 1)
            if s == 0 and abs(x) < 1.6:
                continue
            _link(box(f"win_{s}_{i}", (1.2, 0.06, 2.2), (x, -depth / 2 - 0.03, z0 + 1.6), glass, col), root)
            _link(box(f"lintel_{s}_{i}", (1.6, 0.14, 0.18), (x, -depth / 2 - 0.08, z0 + 2.8), trim, col), root)
            _link(box(f"sill_{s}_{i}", (1.6, 0.18, 0.1), (x, -depth / 2 - 0.1, z0 + 0.45), trim, col), root)
            for side in (-1, 1):
                sh = box(f"shutter_{s}_{i}_{side}", (0.38, 0.05, 2.2), (x + side * 0.82, -depth / 2 - 0.05, z0 + 1.6), dark, col)
                sh.rotation_euler = (0, 0, side * 0.35)
                _link(sh, root)
    # a low tiled roof over the body (seen only as an edge from the lawn)
    _link(box("roof_edge", (width + 0.2, depth + 0.2, 0.25), (0, 0, H + 0.1), terracotta, col), root)
    return root
