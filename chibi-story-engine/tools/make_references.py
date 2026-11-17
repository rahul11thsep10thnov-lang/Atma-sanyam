"""Render the approved reference frames used by the visual regression tests.

    python -m tools.make_references            # writes tests/rendering/references/*.png

Run it only when a change to how things look is intended and has been reviewed.
"""
from __future__ import annotations

import json
import tempfile
from pathlib import Path

from engine.asset_manager.library import AssetLibrary
from engine.common.paths import PROJECT_ROOT, EnginePaths
from engine.rendering.service import RenderService
from engine.schema.story import parse_story

STORY = PROJECT_ROOT / "stories" / "panchatantra" / "monkey_and_crocodile.auto.json"
REFERENCES = PROJECT_ROOT / "tests" / "rendering" / "references"
FRAMES = [("scene_01", 3.0), ("scene_02", 8.0), ("scene_04", 15.0), ("scene_05", 12.0)]


def main() -> None:
    story = parse_story(json.loads(STORY.read_text(encoding="utf-8")))
    with tempfile.TemporaryDirectory() as tmp:
        base = EnginePaths.under(Path(tmp))
        service = RenderService(AssetLibrary(PROJECT_ROOT / "asset_library"), EnginePaths(PROJECT_ROOT / "asset_library", base.stories, base.renders, base.cache))
        REFERENCES.mkdir(parents=True, exist_ok=True)
        for scene_id, t in FRAMES:
            (still,) = service.render_stills(story, scene_id, [t], Path(tmp) / "stills")
            target = REFERENCES / f"{scene_id}_{t:.1f}s.png"
            still.replace(target)
            print(target.relative_to(PROJECT_ROOT))


if __name__ == "__main__":
    main()
