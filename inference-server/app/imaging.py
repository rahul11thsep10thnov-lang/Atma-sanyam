"""Image helpers shared by the handlers. numpy + Pillow only (no torch), so they are unit-testable on CPU."""
import io

import numpy as np
from PIL import Image


class BadInput(ValueError):
    pass


def load_image(data: bytes, mode: str = "RGB") -> Image.Image:
    try:
        img = Image.open(io.BytesIO(data))
        img.load()
    except Exception as exc:  # Pillow raises several types for corrupt input
        raise BadInput(f"cannot decode image: {exc}") from exc
    if img.width * img.height > 40_000_000:
        raise BadInput("image too large")
    if mode == "RGB" and img.mode in ("RGBA", "LA", "P"):
        # Composite transparent cut-outs on mid grey so models see a neutral background.
        rgba = img.convert("RGBA")
        bg = Image.new("RGBA", rgba.size, (128, 128, 128, 255))
        return Image.alpha_composite(bg, rgba).convert("RGB")
    return img.convert(mode)


def png_bytes(img: Image.Image) -> bytes:
    buf = io.BytesIO()
    img.save(buf, format="PNG", optimize=False)
    return buf.getvalue()


def gray_png(values: np.ndarray) -> bytes:
    return png_bytes(Image.fromarray(np.ascontiguousarray(values.astype(np.uint8)), mode="L"))


def normalize_depth(pred: np.ndarray) -> np.ndarray:
    """Relative inverse depth (larger = nearer) → uint8, white = near; robust to outliers (1st–99th percentile)."""
    d = pred.astype(np.float64)
    lo, hi = np.percentile(d, 1), np.percentile(d, 99)
    norm = np.clip((d - lo) / max(hi - lo, 1e-6), 0.0, 1.0)
    return np.round(norm * 255).astype(np.uint8)


def snap_size(width: int, height: int, multiple: int, max_pixels: int) -> tuple[int, int]:
    """Clamp to a pixel budget keeping aspect ratio, then round down to the model's size multiple."""
    w, h = max(multiple, int(width)), max(multiple, int(height))
    scale = min(1.0, (max_pixels / (w * h)) ** 0.5)
    w, h = int(w * scale), int(h * scale)
    return max(multiple, w - w % multiple), max(multiple, h - h % multiple)


def wan_num_frames(duration_seconds: float, fps: int) -> int:
    """Wan needs 4k+1 frames; clamp to 3–5 s like the backend."""
    n = round(max(3.0, min(5.0, float(duration_seconds))) * fps)
    return (n // 4) * 4 + 1


def pad_to_multiple(arr: np.ndarray, multiple: int) -> np.ndarray:
    h, w = arr.shape[:2]
    ph, pw = (-h) % multiple, (-w) % multiple
    if not ph and not pw:
        return arr
    pad = ((0, ph), (0, pw)) + ((0, 0),) * (arr.ndim - 2)
    return np.pad(arr, pad, mode="symmetric")
