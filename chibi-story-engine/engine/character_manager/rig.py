"""Layered 2D cutout rigs: validation and forward kinematics.

Rig space has its origin at the rig's ground point, x to the right and y up, in canvas pixels.
A solved rig is a list of sprites, each with a 2D affine that maps the unit square (u right, v up,
origin at the image's bottom-left corner) into rig space.
"""
from __future__ import annotations

import math
from dataclasses import dataclass, field

import numpy as np

from ..common.errors import RigError
from ..schema.assets import FACIAL_POSES, STANDARD_COMPONENTS, CharacterManifest, FacialPose, PartPose, RigDefinition, RigTemplate

HIDDEN = "none"   # variant name meaning "draw nothing for this part"


def translate(x: float, y: float) -> np.ndarray:
    return np.array([[1.0, 0.0, x], [0.0, 1.0, y], [0.0, 0.0, 1.0]])


def rotate(degrees: float) -> np.ndarray:
    r = math.radians(degrees)
    c, s = math.cos(r), math.sin(r)
    return np.array([[c, -s, 0.0], [s, c, 0.0], [0.0, 0.0, 1.0]])


def scale(sx: float, sy: float) -> np.ndarray:
    return np.array([[sx, 0.0, 0.0], [0.0, sy, 0.0], [0.0, 0.0, 1.0]])


def apply(m: np.ndarray, point: tuple[float, float]) -> tuple[float, float]:
    v = m @ np.array([point[0], point[1], 1.0])
    return float(v[0]), float(v[1])


@dataclass
class Pose:
    """Joint values and image choices for one instant. Missing parts are at rest."""

    parts: dict[str, PartPose] = field(default_factory=dict)
    variants: dict[str, str] = field(default_factory=dict)

    def get(self, part: str) -> PartPose:
        p = self.parts.get(part)
        if p is None:
            p = self.parts[part] = PartPose()
        return p

    def add(self, part: str, *, rotation: float = 0.0, x: float = 0.0, y: float = 0.0, sx: float = 1.0, sy: float = 1.0) -> None:
        p = self.get(part)
        p.rotation += rotation
        p.x += x
        p.y += y
        p.sx *= sx
        p.sy *= sy

    def copy(self) -> "Pose":
        return Pose({k: v.model_copy() for k, v in self.parts.items()}, dict(self.variants))

    def apply_facial(self, face: FacialPose) -> None:
        self.variants.update(face.variants)
        for part, pp in face.parts.items():
            self.add(part, rotation=pp.rotation, x=pp.x, y=pp.y, sx=pp.sx, sy=pp.sy)

    @staticmethod
    def blend(a: "Pose", b: "Pose", t: float) -> "Pose":
        """Linear blend of joint values; images switch at the halfway point."""
        t = min(1.0, max(0.0, t))
        out = Pose(variants=dict(b.variants if t >= 0.5 else a.variants))
        for part in set(a.parts) | set(b.parts):
            pa, pb = a.parts.get(part, PartPose()), b.parts.get(part, PartPose())
            out.parts[part] = PartPose(rotation=pa.rotation + (pb.rotation - pa.rotation) * t, x=pa.x + (pb.x - pa.x) * t,
                                       y=pa.y + (pb.y - pa.y) * t, sx=pa.sx + (pb.sx - pa.sx) * t, sy=pa.sy + (pb.sy - pa.sy) * t)
        return out


@dataclass(frozen=True)
class SolvedSprite:
    part: str
    variant: str
    file: str
    order: int
    matrix: np.ndarray          # unit square -> rig space


class Rig:
    """A character's rig, ready to be posed."""

    def __init__(self, definition: RigDefinition) -> None:
        self.definition = definition
        self.gx, self.gy = definition.ground
        self.parts = {p.id: p for p in definition.parts}
        self.order = self._topological()

    def _topological(self) -> list[str]:
        out: list[str] = []
        seen: set[str] = set()

        def visit(pid: str, chain: tuple[str, ...]) -> None:
            if pid in chain:
                raise RigError(f"Rig has a parent cycle through '{pid}'")
            if pid in seen:
                return
            parent = self.parts[pid].parent
            if parent is not None:
                if parent not in self.parts:
                    raise RigError(f"Part '{pid}' has unknown parent '{parent}'")
                visit(parent, chain + (pid,))
            seen.add(pid)
            out.append(pid)

        for pid in self.parts:
            visit(pid, ())
        return out

    def to_rig(self, canvas_point: tuple[float, float]) -> tuple[float, float]:
        return canvas_point[0] - self.gx, self.gy - canvas_point[1]

    def clamp(self, part_id: str, rotation: float) -> float:
        limits = self.parts[part_id].rotation_limits
        return rotation if limits is None else min(limits[1], max(limits[0], rotation))

    def world_matrices(self, pose: Pose) -> dict[str, np.ndarray]:
        world: dict[str, np.ndarray] = {}
        for pid in self.order:
            part = self.parts[pid]
            pp = pose.parts.get(pid, PartPose())
            px, py = self.to_rig(part.pivot)
            local = translate(px + pp.x, py + pp.y) @ rotate(self.clamp(pid, pp.rotation)) @ scale(pp.sx, pp.sy) @ translate(-px, -py)
            world[pid] = world[part.parent] @ local if part.parent else local
        return world

    def solve(self, pose: Pose) -> list[SolvedSprite]:
        """Sprites of the posed character in draw order (back to front)."""
        world = self.world_matrices(pose)
        sprites: list[SolvedSprite] = []
        for pid in self.order:
            part = self.parts[pid]
            if not part.variants:
                continue
            variant = pose.variants.get(pid, part.default_variant)
            if variant == HIDDEN:
                continue
            if variant not in part.variants:
                raise RigError(f"Part '{pid}' has no variant '{variant}' (has: {', '.join(part.variants)})")
            image = part.variants[variant]
            left, top = self.to_rig(image.origin)
            w, h = image.size
            unit = translate(left, top - h) @ scale(w, h)
            sprites.append(SolvedSprite(pid, variant, image.file, part.order, world[pid] @ unit))
        sprites.sort(key=lambda s: s.order)
        return sprites

    def attach_point(self, name: str, pose: Pose, world: dict[str, np.ndarray] | None = None) -> tuple[float, float]:
        ap = self.definition.attach_points.get(name)
        if ap is None:
            raise RigError(f"Rig has no attach point '{name}' (has: {', '.join(self.definition.attach_points) or 'none'})")
        world = world or self.world_matrices(pose)
        return apply(world[ap.part], self.to_rig(ap.point))

    def bounds(self, pose: Pose) -> tuple[float, float, float, float]:
        """Axis-aligned bounds (min x, min y, max x, max y) of the posed character in rig space."""
        xs, ys = [], []
        for s in self.solve(pose):
            for corner in ((0, 0), (1, 0), (1, 1), (0, 1)):
                x, y = apply(s.matrix, corner)
                xs.append(x)
                ys.append(y)
        if not xs:
            return 0.0, 0.0, 0.0, 0.0
        return min(xs), min(ys), max(xs), max(ys)


def validate_rig(manifest: CharacterManifest, template: RigTemplate | None) -> list[dict[str, str]]:
    """Everything that would make this rig unusable, found before any rendering."""
    issues: list[dict[str, str]] = []

    def add(path: str, message: str) -> None:
        issues.append({"path": path, "message": message})

    rig = manifest.rig
    ids = rig.part_ids()
    if len(ids) != len(set(ids)):
        add("rig.parts", "part ids must be unique")
    if template is None:
        add("rig.template", f"unknown rig template '{rig.template}'")
    else:
        for component in STANDARD_COMPONENTS + (("tail",) if template.has_tail else ()):
            wanted = template.components.get(component)
            if not wanted:
                if component not in template.optional_components:
                    add("rig.template", f"template '{template.id}' does not define the component '{component}'")
                continue
            for pid in wanted:
                if pid not in ids:
                    add("rig.parts", f"missing rig component '{component}': part '{pid}' is not defined")
    roots = [p.id for p in rig.parts if p.parent is None]
    if len(roots) != 1:
        add("rig.parts", f"a rig needs exactly one root part, found {len(roots)}: {roots}")
    try:
        Rig(rig)
    except RigError as exc:
        add("rig.parts", exc.message)
    cw, ch = rig.canvas
    for part in rig.parts:
        if not (-cw <= part.pivot[0] <= 2 * cw and -ch <= part.pivot[1] <= 2 * ch):
            add(f"rig.parts.{part.id}", "pivot is far outside the canvas")
        if part.component != "root" and not part.variants:
            add(f"rig.parts.{part.id}", "a visible part needs at least one image variant")
        if part.rotation_limits and part.rotation_limits[0] > part.rotation_limits[1]:
            add(f"rig.parts.{part.id}", "rotation_limits must be (min, max)")
    for name, ap in rig.attach_points.items():
        if ap.part not in ids:
            add(f"rig.attach_points.{name}", f"refers to unknown part '{ap.part}'")
    talk = rig.part(rig.talk_part)
    if talk is None:
        add("rig.talk_part", f"talk part '{rig.talk_part}' is not defined")
    elif rig.talk_mode == "variants":
        for v in rig.talk_variants:
            if v not in talk.variants:
                add("rig.talk_variants", f"mouth shape '{v}' is not a variant of '{talk.id}'")
    elif rig.jaw_part not in ids:
        add("rig.jaw_part", f"jaw part '{rig.jaw_part}' is not defined")
    for name in FACIAL_POSES:
        if name not in manifest.expressions:
            add("expressions", f"missing facial pose '{name}'")
    for name, face in manifest.expressions.items():
        for pid, variant in face.variants.items():
            part = rig.part(pid)
            if part is None:
                add(f"expressions.{name}", f"refers to unknown part '{pid}'")
            elif variant != HIDDEN and variant not in part.variants:
                add(f"expressions.{name}", f"part '{pid}' has no variant '{variant}'")
        for pid in face.parts:
            if pid not in ids:
                add(f"expressions.{name}", f"refers to unknown part '{pid}'")
    for name, pose in manifest.poses.items():
        for pid in pose:
            if pid not in ids:
                add(f"poses.{name}", f"refers to unknown part '{pid}'")
    return issues


VIEWS = ("front", "side", "three_quarter", "back")
FACE_PARTS = {"eyes", "pupils", "brow_l", "brow_r", "mouth"}


def validate_views(manifest: CharacterManifest) -> list[dict[str, str]]:
    """Extra viewing angles: same part ids and attach points as the front rig, valid images, a buildable rig.

    A view may leave out face parts it cannot show (a back view has no face); it may not leave out body parts.
    """
    issues: list[dict[str, str]] = []
    front = manifest.rig
    body_ids = {p.id for p in front.parts if p.id not in FACE_PARTS}
    for name, view in manifest.views.items():
        def add(path: str, message: str) -> None:
            issues.append({"path": f"views.{name}.{path}", "message": message})

        primary = manifest.compatibility.get("primary_view", "front")
        if name not in VIEWS or name == primary:
            add("", f"'{name}' is not an extra view (use the angles other than the primary view '{primary}')")
            continue
        ids = set(view.part_ids())
        missing = body_ids - ids
        if missing:
            add("parts", f"missing body parts {sorted(missing)}")
        extra = ids - {p.id for p in front.parts}
        if extra:
            add("parts", f"parts not in the front rig: {sorted(extra)}")
        for part in view.parts:
            if part.component != "root" and not part.variants:
                add(part.id, "a visible part needs at least one image variant")
        for ap_name in front.attach_points:
            if ap_name not in view.attach_points:
                add("attach_points", f"missing attach point '{ap_name}'")
        for ap_name, ap in view.attach_points.items():
            if ap.part not in ids:
                add("attach_points", f"'{ap_name}' refers to unknown part '{ap.part}'")
        try:
            Rig(view)
        except RigError as exc:
            add("parts", exc.message)
    return issues
