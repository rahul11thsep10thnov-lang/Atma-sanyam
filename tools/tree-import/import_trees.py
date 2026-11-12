"""Import the new tree pictures into the app's sprite pack.

    python tools/tree-import/import_trees.py incoming-trees

Replaces ONLY sizes 1-7 of: mango, banana, peepal, coconut, banyan, palm, and cedar
(the Deodar art). The seed picture, every other species, and the species data in
src/paradise/catalog.ts are not touched. Writes assets/paradise/sprites + thumbs
(same file names as before, so no code changes are needed), and updates the
matching entries in src/paradise/sprites.generated.ts and assets/paradise/sprites.json.
"""
import json, pathlib, re, sys
from PIL import Image

ROOT = pathlib.Path(__file__).resolve().parents[2]
SRC = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else ROOT / "incoming-trees")
PACK = ROOT / "assets" / "paradise"
TS = ROOT / "src" / "paradise" / "sprites.generated.ts"

# app species id -> picture prefix, how it is sized (by canopy 'w'idth or by tree 'h'eight), mature size in metres
SPECIES = {
    "mango": ("mango", "w", 6.6),
    "banana": ("banana", "w", 3.4),
    "peepal": ("peepal", "w", 7.4),
    "coconut": ("coconut", "h", 7.6),
    "banyan": ("banyan", "w", 9.6),
    "palm": ("palm", "h", 8.4),
    "cedar": ("deodar", "h", 8.8),
}
GROWTH = [0.08, 0.16, 0.29, 0.46, 0.64, 0.82, 1.0]   # share of the mature size at sizes 1..7
MAX_SIDE, THUMB = 760, 256


def prepare(path):
    im = Image.open(path).convert("RGBA")
    a = im.getchannel("A")
    box = a.point(lambda v: 255 if v > 12 else 0).getbbox()
    pad = 6
    box = (max(0, box[0] - pad), max(0, box[1] - pad), min(im.width, box[2] + pad), min(im.height, box[3] + pad))
    im = im.crop(box)
    k = MAX_SIDE / max(im.size)
    if k < 1:
        im = im.resize((round(im.width * k), round(im.height * k)), Image.LANCZOS)
    return im


def pivot_of(im):
    """Where the tree meets the ground: horizontally the centre of the lowest solid pixels, vertically just above the bottom edge."""
    a = im.getchannel("A")
    w, h = im.size
    rows = a.crop((0, int(h * 0.9), w, h)).point(lambda v: 255 if v > 60 else 0)
    bb = rows.getbbox()
    cx = (bb[0] + bb[2]) / 2 / w if bb else 0.5
    return [round(cx, 4), 0.965]


text = TS.read_text()
marker = "PARADISE_SPRITES: Record<string, SpeciesSprites> = "
i = text.index(marker) + len(marker)
data, end = json.JSONDecoder().raw_decode(text[i:])
manifest_path = PACK / "sprites.json"
manifest = json.loads(manifest_path.read_text()) if manifest_path.exists() else None

for sid, (prefix, by, mature) in SPECIES.items():
    stages = data[sid]["stages"]
    for n in range(1, 8):
        src = SRC / f"{prefix}_{n}.png"
        im = prepare(src)
        w, h = im.size
        old = stages[n]
        if by == "w":
            wm = mature * GROWTH[n - 1]
            hm = wm * h / w
        else:
            hm = mature * GROWTH[n - 1]
            wm = hm * w / h
        im.save(PACK / "sprites" / f"{sid}__size{n}.webp", "WEBP", quality=86, method=6)
        t = im.copy()
        t.thumbnail((THUMB, THUMB), Image.LANCZOS)
        t.save(PACK / "thumbs" / f"{sid}__size{n}.webp", "WEBP", quality=86, method=6)
        entry = {
            "file": f"sprites/{sid}__size{n}.webp",
            "thumb": f"thumbs/{sid}__size{n}.webp",
            "px": [w, h],
            "widthM": round(wm, 4),
            "heightM": round(hm, 4),
            "pivot": pivot_of(im),
            "boxM": [round(wm * 0.9, 3), round(wm * 0.9, 3), round(hm * 0.95, 3)],
        }
        if old.get("sway"):
            entry["sway"] = old["sway"]
        stages[n] = entry
        if manifest and sid in manifest.get("species", {}):
            try:
                manifest["species"][sid]["stages"][n] = entry
            except Exception:
                pass
    print("done", sid, "<-", prefix)

text = text[:i] + json.dumps(data, separators=(",", ":")) + text[i + end:]
TS.write_text(text)
if manifest:
    manifest_path.write_text(json.dumps(manifest, indent=1))
