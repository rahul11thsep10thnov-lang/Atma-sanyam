"""ScenePlan: the fully resolved, purely numeric description of a scene that the renderer consumes.

Every sprite has, per frame, a 2D affine (unit square -> apparent stage pixels) and an opacity.
The plan is deterministic data: its digest identifies a render.
"""
from __future__ import annotations

import hashlib
import json
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

import numpy as np

PLAN_VERSION = 1


@dataclass
class SpriteTrack:
    id: str
    image: str                         # absolute path of the image file
    checksum: str                      # sha256 of that file (part of the plan digest)
    parallax: float
    order: float
    tint: tuple[float, float, float]
    affine: np.ndarray                 # (frames, 6): a, b, c, d, tx, ty  with  x = a*u + c*v + tx,  y = b*u + d*v + ty
    opacity: np.ndarray                # (frames,), 0 = not drawn

    @classmethod
    def static(cls, id: str, image: str, checksum: str, rect: tuple[float, float, float, float], n: int, *, parallax: float = 1.0,
               order: float = 0.0, tint: tuple[float, float, float] = (1.0, 1.0, 1.0)) -> "SpriteTrack":
        x, y, w, h = rect
        affine = np.tile(np.array([w, 0.0, 0.0, h, x, y]), (n, 1))
        return cls(id, image, checksum, parallax, order, tint, affine, np.ones(n))

    def corners(self, frame: int) -> list[tuple[float, float]]:
        a, b, c, d, tx, ty = self.affine[frame]
        return [(a * u + c * v + tx, b * u + d * v + ty) for u, v in ((0, 0), (1, 0), (1, 1), (0, 1))]

    def bounds(self, frame: int) -> tuple[float, float, float, float]:
        pts = self.corners(frame)
        return min(p[0] for p in pts), min(p[1] for p in pts), max(p[0] for p in pts), max(p[1] for p in pts)


@dataclass
class ShotPlan:
    shot_id: str
    n_frames: int
    camera: np.ndarray                 # (frames, 3): x, y, zoom
    sprites: list[SpriteTrack] = field(default_factory=list)
    notes: list[str] = field(default_factory=list)

    def sprite(self, sprite_id: str) -> SpriteTrack:
        return next(s for s in self.sprites if s.id == sprite_id)


@dataclass
class ScenePlan:
    scene_id: str
    fps: int
    width: int
    height: int
    shots: list[ShotPlan]
    fade_in: float = 0.0
    fade_out: float = 0.0
    meta: dict[str, Any] = field(default_factory=dict)

    @property
    def n_frames(self) -> int:
        return sum(s.n_frames for s in self.shots)

    @property
    def duration(self) -> float:
        return self.n_frames / self.fps

    def digest(self) -> str:
        """Stable hash of everything that affects the pixels (not of file locations)."""
        h = hashlib.sha256()
        head = {"v": PLAN_VERSION, "scene": self.scene_id, "fps": self.fps, "size": [self.width, self.height],
                "fade": [round(self.fade_in, 4), round(self.fade_out, 4)]}
        h.update(json.dumps(head, sort_keys=True).encode())
        for shot in self.shots:
            h.update(f"{shot.shot_id}:{shot.n_frames}".encode())
            h.update(np.round(shot.camera, 3).astype("<f8").tobytes())
            for s in shot.sprites:
                h.update(f"{s.id}|{s.checksum}|{s.parallax:.4f}|{s.order:.4f}|{s.tint}".encode())
                h.update(np.round(s.affine, 3).astype("<f8").tobytes())
                h.update(np.round(s.opacity, 3).astype("<f8").tobytes())
        return h.hexdigest()

    # --------------------------------------------------------------- storage
    def save(self, directory: Path) -> Path:
        directory = Path(directory)
        directory.mkdir(parents=True, exist_ok=True)
        arrays: dict[str, np.ndarray] = {}
        shots = []
        for si, shot in enumerate(self.shots):
            arrays[f"s{si}_camera"] = shot.camera
            sprites = []
            for pi, s in enumerate(shot.sprites):
                arrays[f"s{si}_p{pi}_affine"] = s.affine
                arrays[f"s{si}_p{pi}_opacity"] = s.opacity
                sprites.append({"id": s.id, "image": s.image, "checksum": s.checksum, "parallax": s.parallax, "order": s.order,
                                "tint": list(s.tint)})
            shots.append({"shot_id": shot.shot_id, "n_frames": shot.n_frames, "sprites": sprites, "notes": shot.notes})
        doc = {"plan_version": PLAN_VERSION, "scene_id": self.scene_id, "fps": self.fps, "width": self.width, "height": self.height,
               "fade_in": self.fade_in, "fade_out": self.fade_out, "meta": self.meta, "digest": self.digest(), "shots": shots}
        (directory / "plan.json").write_text(json.dumps(doc, ensure_ascii=False, indent=1), encoding="utf-8")
        np.savez_compressed(directory / "plan.npz", **arrays)
        return directory

    @classmethod
    def load(cls, directory: Path) -> "ScenePlan":
        directory = Path(directory)
        doc = json.loads((directory / "plan.json").read_text(encoding="utf-8"))
        arrays = np.load(directory / "plan.npz")
        shots = []
        for si, sd in enumerate(doc["shots"]):
            sprites = [SpriteTrack(p["id"], p["image"], p["checksum"], p["parallax"], p["order"], tuple(p["tint"]),
                                   arrays[f"s{si}_p{pi}_affine"], arrays[f"s{si}_p{pi}_opacity"])
                       for pi, p in enumerate(sd["sprites"])]
            shots.append(ShotPlan(sd["shot_id"], sd["n_frames"], arrays[f"s{si}_camera"], sprites, sd.get("notes", [])))
        return cls(doc["scene_id"], doc["fps"], doc["width"], doc["height"], shots, doc["fade_in"], doc["fade_out"], doc.get("meta", {}))
