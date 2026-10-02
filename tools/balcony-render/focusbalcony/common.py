import math
import bmesh
import bpy
from mathutils import Vector

DEG = math.pi / 180.0


def clear_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)


def link(obj, collection=None):
    (collection or bpy.context.scene.collection).objects.link(obj)
    return obj


def collection(name, parent=None):
    col = bpy.data.collections.get(name) or bpy.data.collections.new(name)
    if col.name not in [c.name for c in (parent or bpy.context.scene.collection).children]:
        (parent or bpy.context.scene.collection).children.link(col)
    return col


def mesh_object(name, bm, material=None, col=None, smooth=False):
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    if smooth:
        for p in me.polygons:
            p.use_smooth = True
    obj = bpy.data.objects.new(name, me)
    if material is not None:
        me.materials.append(material)
    link(obj, col)
    return obj


def box(name, size, location, material=None, col=None, bevel=0.0, segments=2):
    """Axis-aligned box: size (sx, sy, sz), location = centre. Optional bevel
    so no edge is a perfect CG knife edge."""
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    bmesh.ops.scale(bm, vec=Vector(size), verts=bm.verts)
    obj = mesh_object(name, bm, material, col)
    obj.location = location
    if bevel > 0:
        m = obj.modifiers.new("bevel", "BEVEL")
        m.width = bevel
        m.segments = segments
        m.limit_method = "ANGLE"
        m.harden_normals = False
    return obj


def cylinder(name, radius, depth, location, material=None, col=None, verts=48, radius_top=None, bevel=0.0):
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, cap_tris=False, segments=verts, radius1=radius,
                          radius2=radius if radius_top is None else radius_top, depth=depth)
    obj = mesh_object(name, bm, material, col, smooth=True)
    obj.location = location
    if bevel > 0:
        m = obj.modifiers.new("bevel", "BEVEL")
        m.width = bevel
        m.segments = 3
        m.limit_method = "ANGLE"
    obj.modifiers.new("ws", "WEIGHTED_NORMAL")
    return obj


def plane(name, size, location, material=None, col=None, rotation=(0, 0, 0)):
    bm = bmesh.new()
    bmesh.ops.create_grid(bm, x_segments=1, y_segments=1, size=0.5)
    bmesh.ops.scale(bm, vec=Vector((size[0], size[1], 1)), verts=bm.verts)
    obj = mesh_object(name, bm, material, col)
    obj.location = location
    obj.rotation_euler = rotation
    return obj


def add_subsurf(obj, levels=2):
    m = obj.modifiers.new("subsurf", "SUBSURF")
    m.levels = levels
    m.render_levels = levels
    return m


def set_parent(child, parent):
    child.parent = parent
    child.matrix_parent_inverse = parent.matrix_world.inverted()


class Rng:
    """Deterministic RNG so every render is reproducible."""

    def __init__(self, seed: int):
        self.s = (seed * 2654435761) & 0xFFFFFFFF or 1

    def random(self):
        # xorshift32
        x = self.s
        x ^= (x << 13) & 0xFFFFFFFF
        x ^= x >> 17
        x ^= (x << 5) & 0xFFFFFFFF
        self.s = x & 0xFFFFFFFF
        return self.s / 4294967296.0

    def uniform(self, a, b):
        return a + (b - a) * self.random()

    def choice(self, seq):
        return seq[int(self.random() * len(seq)) % len(seq)]
