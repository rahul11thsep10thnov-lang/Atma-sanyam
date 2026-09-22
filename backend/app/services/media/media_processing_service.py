"""All FFmpeg shell invocations live here and nowhere else in the codebase
(build spec section 23). Every method raises MediaProcessingError with
FFmpeg's stderr on failure so job error fields are actionable.
"""
import json
import subprocess


class MediaProcessingError(Exception):
    pass


class MediaProcessingService:
    def __init__(self, ffmpeg_bin: str = "ffmpeg", ffprobe_bin: str = "ffprobe") -> None:
        self._ffmpeg = ffmpeg_bin
        self._ffprobe = ffprobe_bin

    def probe_duration_ms(self, path: str) -> int:
        try:
            out = subprocess.run(
                [
                    self._ffprobe,
                    "-v",
                    "error",
                    "-show_entries",
                    "format=duration",
                    "-of",
                    "json",
                    path,
                ],
                capture_output=True,
                text=True,
                check=True,
            )
        except (subprocess.CalledProcessError, FileNotFoundError) as exc:
            raise MediaProcessingError(f"ffprobe failed for {path}: {exc}") from exc
        data = json.loads(out.stdout or "{}")
        duration = float(data.get("format", {}).get("duration", 0.0))
        return int(duration * 1000)

    def normalize_audio(self, input_path: str, output_path: str) -> str:
        self._run(
            [
                self._ffmpeg,
                "-y",
                "-i",
                input_path,
                "-af",
                "loudnorm=I=-16:TP=-1.5:LRA=11",
                output_path,
            ]
        )
        return output_path

    def mux_audio_video(self, video_path: str, audio_path: str, output_path: str) -> str:
        self._run(
            [
                self._ffmpeg,
                "-y",
                "-i",
                video_path,
                "-i",
                audio_path,
                "-c:v",
                "copy",
                "-c:a",
                "aac",
                "-shortest",
                output_path,
            ]
        )
        return output_path

    def burn_subtitles(self, video_path: str, srt_path: str, output_path: str) -> str:
        self._run(
            [
                self._ffmpeg,
                "-y",
                "-i",
                video_path,
                "-vf",
                f"subtitles={srt_path}",
                "-c:a",
                "copy",
                output_path,
            ]
        )
        return output_path

    def extract_thumbnail(self, video_path: str, output_path: str, timestamp_s: float = 1.0) -> str:
        self._run(
            [
                self._ffmpeg,
                "-y",
                "-ss",
                str(timestamp_s),
                "-i",
                video_path,
                "-frames:v",
                "1",
                output_path,
            ]
        )
        return output_path

    def concat_videos(self, video_paths: list[str], concat_list_path: str, output_path: str) -> str:
        with open(concat_list_path, "w") as f:
            for p in video_paths:
                f.write(f"file '{p}'\n")
        self._run(
            [
                self._ffmpeg,
                "-y",
                "-f",
                "concat",
                "-safe",
                "0",
                "-i",
                concat_list_path,
                "-c",
                "copy",
                output_path,
            ]
        )
        return output_path

    def _run(self, cmd: list[str]) -> None:
        try:
            subprocess.run(cmd, capture_output=True, text=True, check=True)
        except FileNotFoundError as exc:
            raise MediaProcessingError(
                "ffmpeg is not installed or not on PATH. See docs/SETUP.md."
            ) from exc
        except subprocess.CalledProcessError as exc:
            raise MediaProcessingError(f"ffmpeg command failed: {exc.stderr}") from exc
