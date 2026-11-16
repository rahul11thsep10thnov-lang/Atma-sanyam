"""FFmpeg / ffprobe wrapper: encoding, assembly, muxing and inspection."""
from __future__ import annotations

import json
import re
import shutil
import subprocess
from dataclasses import dataclass
from pathlib import Path

from ..common.errors import RenderError


def _run(args: list[str], timeout: int = 1800) -> subprocess.CompletedProcess:
    exe = shutil.which(args[0])
    if exe is None:
        raise RenderError(f"{args[0]} is not installed")
    try:
        return subprocess.run([exe, *args[1:]], capture_output=True, text=True, timeout=timeout)
    except subprocess.TimeoutExpired as exc:
        raise RenderError(f"{args[0]} timed out after {timeout}s", recoverable=True) from exc


def _check(proc: subprocess.CompletedProcess, what: str) -> None:
    if proc.returncode != 0:
        tail = "\n".join(proc.stderr.strip().splitlines()[-6:])
        raise RenderError(f"{what} failed", details={"stderr": tail})


@dataclass
class MediaInfo:
    duration: float
    has_video: bool
    has_audio: bool
    width: int = 0
    height: int = 0
    fps: float = 0.0
    frames: int = 0
    video_codec: str = ""
    audio_codec: str = ""
    audio_duration: float = 0.0
    video_duration: float = 0.0
    sample_rate: int = 0
    size_bytes: int = 0


def probe(path: Path) -> MediaInfo:
    proc = _run(["ffprobe", "-v", "error", "-count_frames", "-show_streams", "-show_format", "-of", "json", str(path)], 600)
    if proc.returncode != 0 or not proc.stdout.strip():
        raise RenderError(f"'{Path(path).name}' is not a readable media file", details={"stderr": proc.stderr.strip()[-400:]})
    data = json.loads(proc.stdout)
    info = MediaInfo(duration=float(data.get("format", {}).get("duration", 0) or 0), has_video=False, has_audio=False,
                     size_bytes=int(data.get("format", {}).get("size", 0) or 0))
    for stream in data.get("streams", []):
        if stream.get("codec_type") == "video" and not info.has_video:
            num, _, den = stream.get("avg_frame_rate", "0/1").partition("/")
            info.has_video, info.width, info.height = True, int(stream["width"]), int(stream["height"])
            info.fps = float(num) / float(den or 1) if float(den or 1) else 0.0
            info.frames = int(stream.get("nb_read_frames") or stream.get("nb_frames") or 0)
            info.video_codec = stream.get("codec_name", "")
            info.video_duration = float(stream.get("duration") or info.duration)
        elif stream.get("codec_type") == "audio" and not info.has_audio:
            info.has_audio, info.audio_codec = True, stream.get("codec_name", "")
            info.audio_duration = float(stream.get("duration") or info.duration)
            info.sample_rate = int(stream.get("sample_rate") or 0)
    return info


def encode_frames(frames_dir: Path, fps: int, out: Path, *, n_frames: int, crf: int = 18, preset: str = "medium",
                  fade_in: float = 0.0, fade_out: float = 0.0, audio: Path | None = None) -> Path:
    """PNG sequence (frame_%06d.png) -> H.264 MP4 with constant frame rate, optional fades and audio."""
    duration = n_frames / fps
    filters = []
    if fade_in > 0:
        filters.append(f"fade=t=in:st=0:d={fade_in:.3f}")
    if fade_out > 0:
        filters.append(f"fade=t=out:st={max(0.0, duration - fade_out):.3f}:d={fade_out:.3f}")
    filters.append("format=yuv420p")
    out.parent.mkdir(parents=True, exist_ok=True)
    args = ["ffmpeg", "-y", "-v", "error", "-framerate", str(fps), "-start_number", "0", "-i", str(frames_dir / "frame_%06d.png")]
    if audio is not None:
        args += ["-i", str(audio)]
    args += ["-frames:v", str(n_frames), "-vf", ",".join(filters), "-c:v", "libx264", "-preset", preset, "-crf", str(crf),
             "-r", str(fps), "-g", str(fps * 2), "-bf", "2", "-video_track_timescale", "12288", "-movflags", "+faststart"]
    if audio is not None:
        args += ["-c:a", "aac", "-b:a", "160k", "-ar", "48000", "-t", f"{duration:.4f}"]
    _check(_run(args + [str(out)]), "Encoding the frames")
    return out


def concat_videos(videos: list[Path], out: Path) -> Path:
    """Join scene videos without re-encoding (they share codec, size and frame rate)."""
    out.parent.mkdir(parents=True, exist_ok=True)
    listing = out.with_suffix(".concat.txt")
    listing.write_text("".join(f"file '{Path(v).resolve().as_posix()}'\n" for v in videos), encoding="utf-8")
    try:
        _check(_run(["ffmpeg", "-y", "-v", "error", "-f", "concat", "-safe", "0", "-i", str(listing), "-an", "-c:v", "copy",
                     "-movflags", "+faststart", str(out)]), "Joining the scene videos")
    finally:
        listing.unlink(missing_ok=True)
    return out


def mux(video: Path, audio: Path, out: Path, duration: float | None = None) -> Path:
    """Add a soundtrack to a silent video (video copied, audio encoded to AAC)."""
    out.parent.mkdir(parents=True, exist_ok=True)
    args = ["ffmpeg", "-y", "-v", "error", "-i", str(video), "-i", str(audio), "-map", "0:v:0", "-map", "1:a:0", "-c:v", "copy",
            "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-movflags", "+faststart"]
    if duration is not None:
        args += ["-t", f"{duration:.4f}"]
    _check(_run(args + [str(out)]), "Adding the soundtrack")
    return out


def decode_errors(path: Path) -> list[str]:
    """Decode the whole file; any message means corruption."""
    proc = _run(["ffmpeg", "-v", "error", "-xerror", "-i", str(path), "-f", "null", "-"], 1800)
    lines = [l for l in proc.stderr.strip().splitlines() if l.strip()]
    if proc.returncode != 0 and not lines:
        lines = [f"decoder exited with status {proc.returncode}"]
    return lines


def black_segments(path: Path, min_duration: float = 0.7, pixel_threshold: float = 0.06) -> list[tuple[float, float]]:
    proc = _run(["ffmpeg", "-v", "info", "-i", str(path), "-vf", f"blackdetect=d={min_duration}:pix_th={pixel_threshold}",
                 "-an", "-f", "null", "-"], 1800)
    return [(float(a), float(b)) for a, b in re.findall(r"black_start:([\d.]+) black_end:([\d.]+)", proc.stderr)]


def extract_frame(path: Path, seconds: float, out: Path) -> Path:
    out.parent.mkdir(parents=True, exist_ok=True)
    _check(_run(["ffmpeg", "-y", "-v", "error", "-ss", f"{seconds:.3f}", "-i", str(path), "-frames:v", "1", str(out)]), "Extracting a frame")
    return out


def audio_levels(path: Path) -> dict[str, float]:
    """Peak and mean level (dBFS) of a file's audio."""
    proc = _run(["ffmpeg", "-v", "info", "-i", str(path), "-vn", "-af", "volumedetect", "-f", "null", "-"], 1800)
    out = {}
    for key in ("max_volume", "mean_volume"):
        m = re.search(rf"{key}: (-?[\d.]+) dB", proc.stderr)
        if m:
            out[key] = float(m.group(1))
    return out
