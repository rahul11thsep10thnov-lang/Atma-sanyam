"""Geometry builders for organic objects: leaves, tubes, lathed pots."""
import math
import bmesh
import bpy
from mathutils import Matrix, Vector

from .common import Rng, link


class Builder:
    """Accumulates many parts into one bmesh with UVs and per-face
    attributes ('var' 0..1 per part for colour variation, 'dry' 0..1 for
    wilting), one material slot per material."""

    def __init__(self):
        self.bm = bmesh.new()
        self.uv = self.bm.loops.layers.uv.new("UVMap")
        self.var = self.bm.faces.layers.float.new("var")
        self.dry = self.bm.faces.layers.float.new("dry")
        self.mats: list = []

    def slot(self, mat):
        if mat not in self.mats:
            self.mats.append(mat)
        return self.mats.index(mat)

    def grid(self, pts, uvs, mat, var=0.5, dry=0.0, closed_u=False):
        """pts/uvs: rows (v) of columns (u). Builds quads."""
        idx = self.slot(mat)
        rows = [[self.bm.verts.new(p) for p in row] for row in pts]
        nv, nu = len(rows), len(rows[0])
        ucount = nu if closed_u else nu - 1
        for j in range(nv - 1):
            for i in range(ucount):
                i2 = (i + 1) % nu
                f = self.bm.faces.new((rows[j][i], rows[j][i2], rows[j + 1][i2], rows[j + 1][i]))
                f.material_index = idx
                f.smooth = True
                f[self.var] = var
                f[self.dry] = dry
                for loop, (jj, ii) in zip(f.loops, ((j, i), (j, i2), (j + 1, i2), (j + 1, i))):
                    u = uvs[jj][ii] if ii < len(uvs[jj]) else uvs[jj][0]
                    if closed_u and ii == 0 and i2 == 0:
                        u = (1.0, u[1])
                    loop[self.uv].uv = u
        return rows

    def finish(self, name, col=None, thickness=0.0):
        me = bpy.data.meshes.new(name)
        self.bm.normal_update()
        self.bm.to_mesh(me)
        self.bm.free()
        for m in self.mats:
            me.materials.append(m)
        obj = bpy.data.objects.new(name, me)
        link(obj, col)
        if thickness:
            s = obj.modifiers.new("solid", "SOLIDIFY")
            s.thickness = thickness
            s.offset = 0
        return obj


# ---- leaves ---------------------------------------------------------------

def shape_lanceolate(v):
    return math.sin(math.pi * min(1.0, v ** 0.85)) ** 0.9


def shape_ovate(v):
    return math.sin(math.pi * min(1.0, v ** 0.7)) ** 0.75


def shape_sword(v):
    return max(0.0, (1 - v ** 2.6)) ** 0.6 * (0.55 + 0.45 * math.sin(math.pi * min(1, v * 0.9 + 0.1)))


def shape_heart(v):
    # broad rounded base with shallow lobes, pointed tip
    return (math.sin(math.pi * min(1.0, (v + 0.12) / 1.12) ** 1.15)) ** 0.7


def shape_leaflet(v):
    return math.sin(math.pi * min(1.0, v ** 0.6)) ** 1.3


def leaf(b: Builder, mat, frame: Matrix, length, width, shape=shape_lanceolate,
         nu=8, nv=14, fold=0.25, arch=0.5, twist=0.0, wave=0.0, wave_freq=9.0,
         var=0.5, dry=0.0, droop_tip=0.0, rng: Rng | None = None):
    """A leaf blade. Local frame: base at origin, spine along +Y, width
    along X, face normal +Z. `arch` (radians) bends the blade down along its
    length; `fold` creases it along the midrib; `twist` rotates it about the
    spine; `wave` ripples the margins."""
    pts, uvs = [], []
    ang = 0.0
    spine = Vector((0, 0, 0))
    step = length / nv
    for j in range(nv + 1):
        v = j / nv
        a = arch * (v ** 1.4) + droop_tip * (v ** 4)
        tangent = Vector((0, math.cos(a), -math.sin(a)))
        normal = Vector((0, math.sin(a), math.cos(a)))
        tw = twist * v
        xa = Vector((math.cos(tw), 0, math.sin(tw)))
        # rotate width axis about the tangent by the twist
        xaxis = Vector((1, 0, 0)) * math.cos(tw) + normal.cross(Vector((1, 0, 0))) * 0 + normal * math.sin(tw)
        nrm = normal * math.cos(tw) - Vector((1, 0, 0)) * math.sin(tw)
        hw = width * 0.5 * shape(v)
        row, urow = [], []
        for i in range(nu + 1):
            u = -1 + 2 * i / nu
            x = u * hw
            z = fold * abs(u) * hw
            if wave:
                z += wave * hw * abs(u) ** 2 * math.sin(v * wave_freq + (1 if u > 0 else 2.3))
            p = spine + xaxis * x + nrm * z
            row.append(frame @ p)
            urow.append((u * 0.5 + 0.5, v))
        pts.append(row)
        uvs.append(urow)
        spine = spine + tangent * step
    b.grid(pts, uvs, mat, var, dry)


def tube(b: Builder, mat, points, radii, segments=8, var=0.5, dry=0.0):
    """A tube swept along points (world space) with per-point radius."""
    pts, uvs = [], []
    n = len(points)
    up = Vector((0, 0, 1))
    for j, p in enumerate(points):
        t = (points[min(j + 1, n - 1)] - points[max(j - 1, 0)]).normalized()
        ref = up if abs(t.dot(up)) < 0.95 else Vector((1, 0, 0))
        x = t.cross(ref).normalized()
        y = t.cross(x).normalized()
        row, urow = [], []
        for i in range(segments):
            a = 2 * math.pi * i / segments
            row.append(p + (x * math.cos(a) + y * math.sin(a)) * radii[j])
            urow.append((i / segments, j / max(1, n - 1)))
        pts.append(row)
        uvs.append(urow)
    b.grid(pts, uvs, mat, var, dry, closed_u=True)


def curve_points(start: Vector, direction: Vector, length, bend: Vector, n=10):
    """Quadratic-ish curve: starts along `direction`, drifts toward `bend`."""
    pts = []
    for i in range(n + 1):
        t = i / n
        pts.append(start + direction * (length * t) + bend * (length * t * t))
    return pts


def frame_at(origin: Vector, forward: Vector, up_hint=Vector((0, 0, 1))):
    """Matrix whose +Y is `forward` (leaf spine), +Z roughly up."""
    y = forward.normalized()
    x = y.cross(up_hint)
    if x.length < 1e-4:
        x = y.cross(Vector((1, 0, 0)))
    x.normalize()
    z = x.cross(y).normalized()
    m = Matrix((
        (x.x, y.x, z.x, origin.x),
        (x.y, y.y, z.y, origin.y),
        (x.z, y.z, z.z, origin.z),
        (0, 0, 0, 1),
    ))
    return m


# ---- lathe ------------------------------------------------------------------

def lathe(b: Builder, mat, profile, segments=56, var=0.5):
    """Revolve a (radius, z) profile around Z (closed loop in u)."""
    pts, uvs = [], []
    total = sum((Vector((profile[i][0] - profile[i - 1][0], profile[i][1] - profile[i - 1][1])).length for i in range(1, len(profile))))
    acc = 0.0
    for j, (r, z) in enumerate(profile):
        if j:
            acc += Vector((r - profile[j - 1][0], z - profile[j - 1][1])).length
        row, urow = [], []
        for i in range(segments):
            a = 2 * math.pi * i / segments
            row.append(Vector((r * math.cos(a), r * math.sin(a), z)))
            urow.append((i / segments, acc / total))
        pts.append(row)
        uvs.append(urow)
    b.grid(pts, uvs, mat, var, closed_u=True)


def disc(b: Builder, mat, radius, z, rings=6, segments=48, jitter=0.0, rng: Rng | None = None, var=0.5):
    pts, uvs = [], []
    for j in range(rings + 1):
        r = radius * j / rings
        row, urow = [], []
        for i in range(segments):
            a = 2 * math.pi * i / segments
            dz = (rng.uniform(-jitter, jitter) if (rng and j > 0 and j < rings) else 0.0)
            row.append(Vector((r * math.cos(a), r * math.sin(a), z + dz)))
            urow.append((0.5 + 0.5 * r / radius * math.cos(a), 0.5 + 0.5 * r / radius * math.sin(a)))
        pts.append(row)
        uvs.append(urow)
    # collapse the centre ring into one point by merging later
    rows = b.grid(pts, uvs, mat, var, closed_u=True)
    bmesh.ops.remove_doubles(b.bm, verts=rows[0], dist=1e-6)
