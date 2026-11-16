"""Command line for the engine (no database or server needed):  python -m engine.cli <command> ...

  storyboard TEXT.txt --story-id ID [-o story.json]     analyse a story and write a Story Definition
  validate   story.json                                 schema + asset checks (quality-control report)
  speech     story.json [--retime -o story.json]        generate narration/dialogue; optionally re-time shots to it
  render     story.json [--preview] [--scenes a,b]      render scenes and, when complete, the final video
  frame      story.json SCENE SECONDS -o out.png        one still frame through the software compositor
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from .asset_manager.library import AssetLibrary
from .audio.providers import make_provider
from .audio.speech import AudioCache, DialogueService, NarrationService, produce_speech
from .audio.timing import retime_story
from .audio.voices import VoiceRegistry
from .common.errors import EngineError
from .common.paths import EnginePaths
from .quality_control.checks import QualityControl
from .rendering.service import RenderService, RenderSettings
from .schema.story import parse_story
from .story_intelligence.analyser import RuleBasedAnalyser
from .story_intelligence.storyboard import StoryboardBuilder


def _speech(library: AssetLibrary, paths: EnginePaths, provider: str):
    narration = NarrationService(make_provider(provider), VoiceRegistry(library.root / "voices"), AudioCache(paths.renders / "audio" / "cache"))
    return DialogueService(narration, library)


def _load(path: Path):
    return parse_story(json.loads(Path(path).read_text(encoding="utf-8")))


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="engine.cli", description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--data-root", type=Path, default=None, help="where asset_library/ and renders/ live (default: project root)")
    parser.add_argument("--voice-provider", default="espeak")
    sub = parser.add_subparsers(dest="command", required=True)
    sb = sub.add_parser("storyboard")
    sb.add_argument("text", type=Path)
    sb.add_argument("--story-id", required=True)
    sb.add_argument("-o", "--out", type=Path)
    va = sub.add_parser("validate")
    va.add_argument("story", type=Path)
    sp = sub.add_parser("speech")
    sp.add_argument("story", type=Path)
    sp.add_argument("--retime", action="store_true")
    sp.add_argument("-o", "--out", type=Path)
    rn = sub.add_parser("render")
    rn.add_argument("story", type=Path)
    rn.add_argument("--preview", action="store_true")
    rn.add_argument("--scenes")
    rn.add_argument("--workers", type=int, default=2)
    rn.add_argument("--force", action="store_true")
    rn.add_argument("--no-audio", action="store_true")
    fr = sub.add_parser("frame")
    fr.add_argument("story", type=Path)
    fr.add_argument("scene")
    fr.add_argument("seconds", type=float)
    fr.add_argument("-o", "--out", type=Path, required=True)
    args = parser.parse_args(argv)

    paths = (EnginePaths.under(args.data_root) if args.data_root else EnginePaths.default()).ensure()
    library = AssetLibrary(paths.asset_library)
    try:
        if args.command == "storyboard":
            index = library.index()
            analysis = RuleBasedAnalyser(index).analyse(args.text.read_text(encoding="utf-8"))
            board = StoryboardBuilder(index).build(analysis, story_id=args.story_id)
            text = board.story.model_dump_json(indent=1)
            (args.out.write_text(text, encoding="utf-8") if args.out else print(text))
            for m in board.missing_assets:
                print(f"MISSING {m.kind}: {m.suggested_id} ({m.reason})", file=sys.stderr)
            for w in analysis.warnings + board.warnings:
                print(f"warning: {w}", file=sys.stderr)
            print(f"{len(board.story.scenes)} scenes, {board.story.total_duration:.1f}s", file=sys.stderr)
            return 1 if board.missing_assets else 0
        story = _load(args.story)
        if args.command == "validate":
            report = QualityControl(library).check_story(story)
            print(json.dumps(report.to_dict(), ensure_ascii=False, indent=1))
            return 0 if report.passed else 1
        if args.command == "speech":
            speech = produce_speech(story, _speech(library, paths, args.voice_provider))
            print(f"generated {speech.generated}, reused {speech.reused}, problems {len(speech.problems)}", file=sys.stderr)
            if args.retime:
                story, changes = retime_story(story, speech.durations())
                print(f"re-timed {len(changes)} shots; story now {story.total_duration:.2f}s", file=sys.stderr)
                (args.out or args.story).write_text(story.model_dump_json(indent=1), encoding="utf-8")
            return 1 if speech.problems else 0
        if args.command == "render":
            speech = None if args.no_audio else produce_speech(story, _speech(library, paths, args.voice_provider))
            service = RenderService(library, paths)
            settings = (RenderSettings.preview if args.preview else RenderSettings.final)(story, workers=args.workers)
            shown = {"t": 0.0}

            def progress(scene_id: str, fraction: float, phase: str) -> None:
                import time
                if time.time() - shown["t"] > 15 or phase in ("rendered", "cached"):
                    shown["t"] = time.time()
                    print(f"  {scene_id or 'story'}: {phase} {fraction:.0%}", file=sys.stderr, flush=True)

            result = service.render_story(story, settings, speech, args.scenes.split(",") if args.scenes else None, progress, force=args.force)
            for sid, r in result.scenes.items():
                print(f"{sid}: {r.status} ({r.frames} frames, {r.seconds:.0f}s)" + (f"  {r.error}" if r.error else ""))
            if result.final:
                qc = QualityControl(library).check_video(story, result.final, settings, result.duration, result.audio, speech is not None)
                print(f"final: {result.final}  ({result.duration:.2f}s)  QC {'passed' if qc.passed else 'FAILED'}")
                for item in qc.automatic:
                    print(f"  {item.severity}: {item.message}")
                return 0 if qc.passed else 1
            print(f"no final video: {result.error}")
            return 1
        if args.command == "frame":
            from .composition.composer import SceneComposer
            from .rendering.raster import render_shot_frame
            plan, _ = SceneComposer(library).compose(story, args.scene)
            frame = int(args.seconds * plan.fps)
            for shot in plan.shots:
                if frame < shot.n_frames:
                    render_shot_frame(shot, frame, plan.width // 2, plan.height // 2).convert("RGB").save(args.out)
                    return 0
                frame -= shot.n_frames
            print("that time is after the end of the scene", file=sys.stderr)
            return 1
    except EngineError as exc:
        print(f"error: {exc.message}", file=sys.stderr)
        for issue in exc.details.get("issues", [])[:20]:
            print(f"  {issue.get('path', '')}: {issue.get('message', '')}", file=sys.stderr)
        return 2
    return 0


if __name__ == "__main__":
    sys.exit(main())
