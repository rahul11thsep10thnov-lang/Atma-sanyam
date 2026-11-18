"""Independent verification of the registered vector library; prints counts and writes a machine-readable report.

    python -m tools.asset_forge.verify_ext [--out docs/generated/asset_verification.json]
Checks come from the files on disk, not from the build step: checksums, rig validity, SVG master <-> PNG alignment,
transparency, expression / pose coverage, layer rectangles and anchors inside the camera bounds.
"""
from __future__ import annotations

import argparse
import json
import re
from collections import Counter
from pathlib import Path

from PIL import Image

from engine.asset_manager.library import AssetLibrary
from engine.character_manager.registry import CharacterRegistry
from engine.schema.assets import AssetType

PROJECT_ROOT = Path(__file__).resolve().parents[2]
FACES = {"neutral", "happy", "sad", "angry", "surprised", "worried", "thinking", "laughing", "speaking", "crying", "frightened", "suspicious", "excited", "disappointed", "determined"}
POSES = {"standing", "walking", "running", "sitting", "sleeping", "jumping", "talking", "pointing", "waving", "fighting", "dancing", "kneeling", "falling", "climbing", "holding_object"}


def _svg_box(path: Path) -> tuple[float, float, float, float]:
    m = re.search(r'width="([\d.]+)" height="([\d.]+)" viewBox="([\d.\-]+) ([\d.\-]+) ([\d.]+) ([\d.]+)"', path.read_text(encoding="utf-8")[:400])
    if not m:
        raise ValueError(f"{path.name}: no viewBox")
    w, h, x, y, vw, vh = map(float, m.groups())
    return x, y, vw, vh


def _has_alpha(png: Path) -> bool:
    im = Image.open(png).convert("RGBA")
    lo, hi = im.getchannel("A").getextrema()
    return lo < 255 and hi > 0


def verify(lib: AssetLibrary, only_new: bool = True) -> dict:
    problems: list[str] = []
    stats: dict = {}
    reg = CharacterRegistry(lib)
    # ---- characters
    chars = [c for c in lib.list_ids(AssetType.character) if not only_new or c.startswith("char-")]
    cats = Counter()
    for cid in chars:
        m = lib.character(cid)
        cats[m.category or "?"] += 1
        if reg.rig_issues(m):
            problems.append(f"{cid}: rig issues {reg.rig_issues(m)[:1]}")
        if lib.verify(AssetType.character, cid):
            problems.append(f"{cid}: file checksum problems")
        if set(m.expressions) < FACES:
            problems.append(f"{cid}: missing expressions {sorted(FACES - set(m.expressions))}")
        if set(m.poses) < POSES:
            problems.append(f"{cid}: missing poses {sorted(POSES - set(m.poses))}")
        base = lib.asset_dir(AssetType.character, cid)
        for p in m.rig.parts:
            for vname, v in p.variants.items():
                png, svg = base / v.file, base / (v.svg or "")
                if not v.svg or not svg.exists():
                    problems.append(f"{cid}/{p.id}_{vname}: no SVG master")
                    continue
                x, y, vw, vh = _svg_box(svg)
                with Image.open(png) as im:
                    if (im.width, im.height) != (round(vw), round(vh)) or [x, y] != list(v.origin) or [vw, vh] != list(v.size):
                        problems.append(f"{cid}/{p.id}_{vname}: SVG/PNG misaligned")
                if not _has_alpha(png):
                    problems.append(f"{cid}/{p.id}_{vname}: PNG has no transparency")
    stats["characters"] = {"count": len(chars), "by_category": dict(cats)}
    # ---- environments
    envs = [e for e in lib.list_ids(AssetType.environment) if not only_new or e.startswith("env-")]
    ecats, nlayers, scare = Counter(), 0, 0
    for eid in envs:
        m = lib.environment(eid)
        ecats[m.category or "?"] += 1
        if lib.verify(AssetType.environment, eid):
            problems.append(f"{eid}: file checksum problems")
        base = lib.asset_dir(AssetType.environment, eid)
        bx0, by0, bx1, by1 = m.camera_bounds
        for l in m.layers:
            nlayers += 1
            scare += 1 if l.scare else 0
            png, svg = base / l.file, base / (l.svg or "")
            if not l.svg or not svg.exists():
                problems.append(f"{eid}/{l.id}: no SVG master")
                continue
            x, y, vw, vh = _svg_box(svg)
            with Image.open(png) as im:
                sx, sy = im.width / vw, im.height / vh
                if abs(sx - sy) > 0.01 or abs(l.rect[2] - vw) > 1.5 or abs(l.rect[3] - vh) > 1.5:
                    problems.append(f"{eid}/{l.id}: SVG/PNG/rect mismatch")
            if not _has_alpha(png) and not l.cover:
                problems.append(f"{eid}/{l.id}: PNG has no transparency")
        for name, a in m.anchors.items():
            if "offstage" not in name and not (bx0 <= a.x <= bx1 and by0 <= a.y <= by1):
                problems.append(f"{eid}: anchor {name} outside camera bounds")
        if not m.anchors:
            problems.append(f"{eid}: no anchors")
    stats["environments"] = {"count": len(envs), "by_category": dict(ecats), "layers": nlayers, "scare_layers": scare}
    # ---- components
    comps = lib.list_ids(AssetType.component)
    kinds = Counter()
    for cid in comps:
        m = lib.load(AssetType.component, cid)
        kinds[m.kind] += 1
        if lib.verify(AssetType.component, cid):
            problems.append(f"{cid}: file checksum problems")
        base = lib.asset_dir(AssetType.component, cid)
        x, y, vw, vh = _svg_box(base / m.svg)
        with Image.open(base / m.file) as im:
            if (im.width, im.height) != (round(vw), round(vh)):
                problems.append(f"{cid}: SVG/PNG misaligned")
    stats["components"] = {"count": len(comps), "by_kind": dict(kinds)}
    # ---- uniqueness / approval
    seen: dict[str, str] = {}
    pend = Counter()
    for t in (AssetType.character, AssetType.environment, AssetType.component):
        for aid in lib.list_ids(t):
            m = lib.load(t, aid)
            pend[(t.value, m.approval_status.value)] += 1
    stats["approval"] = {f"{a}:{b}": n for (a, b), n in pend.items()}
    return {"stats": stats, "problems": problems, "ok": not problems}


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--library", type=Path, default=PROJECT_ROOT / "asset_library")
    ap.add_argument("--out", type=Path, default=PROJECT_ROOT / "docs" / "generated" / "asset_verification.json")
    ap.add_argument("--all", action="store_true", help="include the original assets too")
    a = ap.parse_args()
    report = verify(AssetLibrary(a.library), only_new=not a.all)
    a.out.parent.mkdir(parents=True, exist_ok=True)
    a.out.write_text(json.dumps(report, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(json.dumps(report["stats"], indent=2, ensure_ascii=False))
    print("PROBLEMS:", len(report["problems"]))
    for p in report["problems"][:30]:
        print(" -", p)


if __name__ == "__main__":
    main()
