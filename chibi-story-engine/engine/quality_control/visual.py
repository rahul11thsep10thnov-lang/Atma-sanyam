"""Visual regression: compare a render with an approved reference frame, with tolerances.

Pixel-perfect equality is not expected (encoders, sampling). Three measures are used instead:
the mean difference, the share of pixels that changed noticeably, and the largest change of any
coarse block, which is what catches a missing object or a character in the wrong place.
"""
from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

import numpy as np
from PIL import Image


@dataclass(frozen=True)
class Tolerance:
    mean: float = 4.0              # average absolute difference, 0..255
    changed_share: float = 0.03    # share of pixels differing by more than `pixel`
    pixel: float = 40.0
    block: float = 38.0            # largest mean difference of any block
    grid: tuple[int, int] = (16, 9)


@dataclass
class Comparison:
    mean: float
    changed_share: float
    worst_block: float
    worst_block_at: tuple[int, int]
    passed: bool
    reasons: list[str]

    def to_dict(self) -> dict:
        return {"mean": round(self.mean, 3), "changed_share": round(self.changed_share, 4), "worst_block": round(self.worst_block, 2),
                "worst_block_at": list(self.worst_block_at), "passed": self.passed, "reasons": self.reasons}


def _load(image: Path | Image.Image, size: tuple[int, int] | None = None) -> np.ndarray:
    im = image if isinstance(image, Image.Image) else Image.open(image)
    im = im.convert("RGB")
    if size and im.size != size:
        im = im.resize(size, Image.BILINEAR)
    return np.asarray(im, dtype=np.float32)


def compare(candidate: Path | Image.Image, reference: Path | Image.Image, tolerance: Tolerance = Tolerance()) -> Comparison:
    ref = _load(reference)
    cand = _load(candidate, (ref.shape[1], ref.shape[0]))
    diff = np.abs(cand - ref).mean(axis=2)
    mean = float(diff.mean())
    changed = float((diff > tolerance.pixel).mean())
    gx, gy = tolerance.grid
    h, w = diff.shape
    blocks = diff[: h // gy * gy, : w // gx * gx].reshape(gy, h // gy, gx, w // gx).mean(axis=(1, 3))
    worst = float(blocks.max())
    by, bx = np.unravel_index(int(blocks.argmax()), blocks.shape)
    reasons = []
    if mean > tolerance.mean:
        reasons.append(f"overall difference {mean:.1f} exceeds {tolerance.mean}")
    if changed > tolerance.changed_share:
        reasons.append(f"{changed:.1%} of the picture changed (limit {tolerance.changed_share:.0%})")
    if worst > tolerance.block:
        reasons.append(f"a region around column {bx + 1}/{gx}, row {by + 1}/{gy} changed strongly ({worst:.0f}): an object may be missing or moved")
    return Comparison(mean, changed, worst, (int(bx), int(by)), not reasons, reasons)


def difference_image(candidate: Path, reference: Path, out: Path) -> Path:
    """A picture of where two frames differ, for a reviewer."""
    ref = _load(reference)
    cand = _load(candidate, (ref.shape[1], ref.shape[0]))
    diff = np.clip(np.abs(cand - ref).mean(axis=2) * 3, 0, 255).astype(np.uint8)
    heat = np.stack([diff, np.zeros_like(diff), 255 - diff], axis=2)
    out.parent.mkdir(parents=True, exist_ok=True)
    Image.fromarray((0.5 * ref + 0.5 * heat).astype(np.uint8)).save(out)
    return out
