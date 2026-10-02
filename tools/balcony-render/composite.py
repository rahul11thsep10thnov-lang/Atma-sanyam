"""Composite a balcony state from the asset pack exactly as the app does
(back-to-front), for checking the result with all UI hidden.

    python composite.py <pack dir> <out.png> '<state json>'

state: {"focus": {"stage": "flowering", "wilted": false},
        "placed": [{"item": "cane_lounge_chair", "slot": "seating", "variant": 0}, ...],
        "art": "<path to an artwork image or null>"}

Works on a raw render (full-frame layers) and on a post-processed pack
(gen_pack.py crops layers and records their rects).
"""
import json, sys, pathlib
import numpy as np
from PIL import Image, ImageDraw


def _layer(pack, entry, W, H):
    """A layer as a full-frame RGBA image, whether or not it was cropped."""
    if isinstance(entry, dict):
        img = Image.open(pack / entry["file"]).convert("RGBA")
        if "rect" in entry:
            full = Image.new("RGBA", (W, H), (0, 0, 0, 0))
            full.paste(img, tuple(entry["rect"][:2]))
            return full
        return img
    return Image.open(pack / entry).convert("RGBA")


def _paste_art(canvas, pack, m, art):
    """Perspective-map an artwork into the frame opening, lit by the scene."""
    W, H = canvas.size
    a = Image.open(art).convert("RGB")
    quad = m["art"]["quad"]
    dst = np.array(quad, dtype=np.float64)
    src = np.array([[0, 0], [a.width, 0], [a.width, a.height], [0, a.height]], dtype=np.float64)
    A, B = [], []
    for (x, y), (u, v) in zip(dst, src):
        A.append([x, y, 1, 0, 0, 0, -u * x, -u * y]); B.append(u)
        A.append([0, 0, 0, x, y, 1, -v * x, -v * y]); B.append(v)
    coeffs = np.linalg.solve(np.array(A), np.array(B))
    warped = a.transform((W, H), Image.PERSPECTIVE, tuple(coeffs), Image.BICUBIC)
    mask = Image.new("L", (W, H), 0)
    ImageDraw.Draw(mask).polygon([tuple(p) for p in quad], fill=255)
    lx, ly, lw, lh = m["art"]["light"]["rect"]
    light = np.asarray(Image.open(pack / m["art"]["light"]["file"]).convert("RGB"), dtype=np.float32) / 255.0
    wl = np.asarray(warped, dtype=np.float32)
    lm = np.ones_like(wl)
    lm[ly:ly + light.shape[0], lx:lx + light.shape[1]] = light
    lit = Image.fromarray(np.clip(wl * lm, 0, 255).astype(np.uint8), "RGB").convert("RGBA")
    canvas.paste(lit, (0, 0), mask)


def compose(pack, m, state):
    pack = pathlib.Path(pack)
    W, H = m["plate"]["width"], m["plate"]["height"]
    L = m["layers"]
    canvas = Image.new("RGBA", (W, H), (58, 46, 38, 255))
    canvas.alpha_composite(_layer(pack, L["sky"], W, H))
    c = L["clouds"]
    clouds = Image.open(pack / c["file"]).convert("RGBA")
    strip = clouds.crop((W // 3, 0, W // 3 + W, clouds.height))
    sky_only = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    sky_only.paste(strip, (0, c["top"]))
    if "rect" in c:  # clip to the open sky like the app does
        x, y, w, h = c["rect"]
        mask = Image.new("L", (W, H), 0)
        ImageDraw.Draw(mask).rectangle([x, y, x + w, y + h], fill=255)
        sky_only.putalpha(Image.fromarray(np.minimum(np.asarray(sky_only)[..., 3], np.asarray(mask))))
    canvas.alpha_composite(sky_only)
    canvas.alpha_composite(_layer(pack, L["landscape"], W, H))
    canvas.alpha_composite(_layer(pack, L["architecture"], W, H))

    layers = []
    for p in state.get("placed", []):
        v = m["items"][p["item"]]["variants"][p["slot"]][p.get("variant", 0)]
        flat = m["items"][p["item"]].get("flat", False)
        layers.append((-1e9 if flat else -v["depth"], v))
    f = state.get("focus")
    if f:
        st = next(s for s in m["focusPlant"]["stages"] if s["id"] == f["stage"])
        v = st["wilted" if f.get("wilted") else "healthy"] or st["healthy"]
        layers.append((-v["depth"], v))
    art = state.get("art") if "art" in m else None
    fr = m["items"].get("art_frame", {}).get("variants", {}).get("art")
    frame_file = fr[0]["file"] if fr else None
    pasted = False
    for _, v in sorted(layers, key=lambda t: t[0]):
        canvas.alpha_composite(Image.open(pack / v["file"]).convert("RGBA"), tuple(v["rect"][:2]))
        # the artwork lies on the frame's mount, so it goes right after it
        if art and v["file"] == frame_file:
            _paste_art(canvas, pack, m, art)
            pasted = True
    if art and not pasted:
        _paste_art(canvas, pack, m, art)
    return canvas.convert("RGB")


if __name__ == "__main__":
    pack = pathlib.Path(sys.argv[1])
    m = json.loads((pack / "manifest.json").read_text())
    compose(pack, m, json.loads(sys.argv[3])).save(sys.argv[2])
    print("saved", sys.argv[2])
