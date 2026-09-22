"""RenderService: the only bridge between the Python backend and the
Remotion renderer (build spec section 22). Shells out to the Remotion CLI
as a subprocess rather than embedding Node in-process, keeping the render
layer independently scalable/containerizable (docs/VIDEO_RENDERING.md).
"""
import json
import os
import subprocess
from pathlib import Path

from app.schemas.lesson import TeachingPlan
from app.services.timing.timing_service import TimedScene


class RenderError(Exception):
    pass


class RenderService:
    def __init__(self, renderer_path: str, storage_path: str, concurrency: int = 2) -> None:
        self._renderer_path = Path(renderer_path).resolve()
        self._storage_path = Path(storage_path).resolve()
        self._concurrency = concurrency

    def render(
        self,
        plan: TeachingPlan,
        scene_audio_paths: dict[str, str],
        timeline: list[TimedScene],
        output_path: str,
        props_path: str,
    ) -> str:
        # Remotion's staticFile()/publicDir resolve assets relative to
        # STORAGE_PATH (see renderer/remotion.config.ts), not by arbitrary
        # absolute filesystem path, so audio paths are made relative here.
        relative_audio = {
            scene_id: str(Path(path).resolve().relative_to(self._storage_path))
            for scene_id, path in scene_audio_paths.items()
        }
        props = {
            "plan": plan.model_dump(),
            "audio": relative_audio,
            "timeline": {
                t.scene_id: {
                    "startMs": t.start_ms,
                    "durationMs": t.duration_ms,
                    "audioDurationMs": t.audio_duration_ms,
                    "boardActionStartsMs": t.board_action_starts_ms,
                }
                for t in timeline
            },
        }
        Path(props_path).parent.mkdir(parents=True, exist_ok=True)
        Path(props_path).write_text(json.dumps(props))

        Path(output_path).parent.mkdir(parents=True, exist_ok=True)
        cmd = [
            "npx",
            "remotion",
            "render",
            "src/index.ts",
            "WhiteboardLesson",
            str(Path(output_path).resolve()),
            f"--props={Path(props_path).resolve()}",
            f"--concurrency={self._concurrency}",
            # Passed explicitly rather than relying on remotion.config.ts's
            # Config.setPublicDir(), which was found not to reliably apply
            # to `remotion render` invocations in all environments.
            f"--public-dir={self._storage_path}",
        ]
        env = {**os.environ, "STORAGE_PATH": str(self._storage_path)}
        try:
            result = subprocess.run(
                cmd,
                cwd=str(self._renderer_path),
                capture_output=True,
                text=True,
                timeout=900,
                env=env,
            )
        except FileNotFoundError as exc:
            raise RenderError(
                "Could not invoke the Remotion renderer (npx not found). See docs/SETUP.md."
            ) from exc
        except subprocess.TimeoutExpired as exc:
            raise RenderError("Render timed out after 15 minutes.") from exc

        if result.returncode != 0:
            raise RenderError(f"Remotion render failed:\n{result.stderr[-4000:]}")
        if not Path(output_path).is_file():
            raise RenderError("Remotion reported success but no output file was produced.")
        return result.stdout
