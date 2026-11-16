"""A small software compositor (Pillow) for stills: thumbnails, reference sheets, plan previews.

It draws the same sprites with the same affines as the Blender worker, without depth or parallax
for layers at parallax 1; for full plans it applies the camera projection per sprite. It is used
for quick previews and tests, never for final frames.
"""
from __future__ import annotations

from functools import lru_cache
from pathlib import Path

import numpy as np
from PIL import Image

from ..camera.projection import STAGE_H, STAGE_W, CameraState, project
from ..character_manager.rig import Pose, Rig, scale, translate
from ..composition.plan import ShotPlan


@lru_cache(maxsize=256)
def _load(path: str) -> Image.Image:
    return Image.open(path).convert("RGBA")


def paste_affine(canvas: Image.Image, image: Image.Image, matrix: np.ndarray, opacity: float = 1.0,
                 tint: tuple[float, float, float] = (1.0, 1.0, 1.0)) -> None:
    """Draw `image` so that its unit square (v up) lands at `matrix` (3x3) in canvas pixels (y down)."""
    w, h = image.size
    unit_from_image = np.array([[1.0 / w, 0.0, 0.0], [0.0, -1.0 / h, 1.0], [0.0, 0.0, 1.0]])
    try:
        inv = np.linalg.inv(matrix @ unit_from_image)
    except np.linalg.LinAlgError:
        return
    layer = image.transform(canvas.size, Image.AFFINE, (inv[0, 0], inv[0, 1], inv[0, 2], inv[1, 0], inv[1, 1], inv[1, 2]),
                            resample=Image.BICUBIC)
    if opacity < 1.0 or tint != (1.0, 1.0, 1.0):
        arr = np.asarray(layer, dtype=np.float32)
        arr[..., 0:3] *= np.array(tint, dtype=np.float32)
        arr[..., 3] *= opacity
        layer = Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8), "RGBA")
    canvas.alpha_composite(layer)


def render_character(asset_dir: Path, rig: Rig, pose: Pose, size: tuple[int, int] | None = None, zoom: float = 1.0,
                     background: tuple[int, int, int, int] = (0, 0, 0, 0)) -> Image.Image:
    """The posed character on its own canvas."""
    cw, ch = rig.definition.canvas
    size = size or (int(cw * zoom), int(ch * zoom))
    canvas = Image.new("RGBA", size, background)
    gx, gy = rig.definition.ground
    # rig space (origin at ground, y up) -> canvas pixels (y down)
    to_canvas = np.array([[zoom, 0.0, gx * zoom], [0.0, -zoom, gy * zoom], [0.0, 0.0, 1.0]])
    for sprite in rig.solve(pose):
        paste_affine(canvas, _load(str(Path(asset_dir) / sprite.file)), to_canvas @ sprite.matrix)
    return canvas


def render_shot_frame(shot: ShotPlan, frame: int, width: int, height: int) -> Image.Image:
    """One frame of a shot plan, projected through the plan's camera."""
    canvas = Image.new("RGBA", (width, height), (0, 0, 0, 255))
    cam = CameraState(*shot.camera[frame])
    sx, sy = width / STAGE_W, height / STAGE_H

    def depth(s):                                      # far layers first, then by order
        return (s.parallax, s.order)

    for s in sorted(shot.sprites, key=depth):
        opacity = float(s.opacity[frame])
        if opacity <= 0.003:
            continue
        a, b, c, d, tx, ty = s.affine[frame]
        p0 = project(tx, ty, s.parallax, cam)
        pu = project(tx + a, ty + b, s.parallax, cam)
        pv = project(tx + c, ty + d, s.parallax, cam)
        m = np.array([[(pu[0] - p0[0]) * sx, (pv[0] - p0[0]) * sx, p0[0] * sx],
                      [-(pu[1] - p0[1]) * sy, -(pv[1] - p0[1]) * sy, height - p0[1] * sy],
                      [0.0, 0.0, 1.0]])
        paste_affine(canvas, _load(s.image), m, opacity, s.tint)
    return canvas


def contact_sheet(images: list[tuple[str, Image.Image]], columns: int = 4, cell: tuple[int, int] = (300, 300),
                  background: tuple[int, int, int, int] = (250, 246, 238, 255)) -> Image.Image:
    from PIL import ImageDraw
    rows = (len(images) + columns - 1) // columns
    sheet = Image.new("RGBA", (columns * cell[0], rows * (cell[1] + 28)), background)
    draw = ImageDraw.Draw(sheet)
    for i, (label, im) in enumerate(images):
        thumb = im.copy()
        thumb.thumbnail(cell)
        x = (i % columns) * cell[0] + (cell[0] - thumb.width) // 2
        y = (i // columns) * (cell[1] + 28) + (cell[1] - thumb.height) // 2
        sheet.alpha_composite(thumb, (x, y))
        draw.text(((i % columns) * cell[0] + 8, (i // columns) * (cell[1] + 28) + cell[1] + 6), label, fill=(60, 40, 30, 255))
    return sheet
