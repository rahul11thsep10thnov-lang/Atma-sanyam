"""Generates SRT and WebVTT subtitle files from timed scenes (build spec
section 20)."""
from app.services.timing.timing_service import TimedScene


class SubtitleService:
    def generate_srt(self, scenes: list[TimedScene], narrations: dict[str, str]) -> str:
        lines: list[str] = []
        for i, scene in enumerate(scenes, start=1):
            text = narrations.get(scene.scene_id, "").strip()
            if not text:
                continue
            start = _format_srt_timestamp(scene.start_ms)
            end = _format_srt_timestamp(scene.start_ms + scene.audio_duration_ms)
            lines.append(str(i))
            lines.append(f"{start} --> {end}")
            lines.append(text)
            lines.append("")
        return "\n".join(lines)

    def generate_vtt(self, scenes: list[TimedScene], narrations: dict[str, str]) -> str:
        lines: list[str] = ["WEBVTT", ""]
        for scene in scenes:
            text = narrations.get(scene.scene_id, "").strip()
            if not text:
                continue
            start = _format_vtt_timestamp(scene.start_ms)
            end = _format_vtt_timestamp(scene.start_ms + scene.audio_duration_ms)
            lines.append(f"{start} --> {end}")
            lines.append(text)
            lines.append("")
        return "\n".join(lines)


def _format_srt_timestamp(ms: int) -> str:
    h, rem = divmod(ms, 3_600_000)
    m, rem = divmod(rem, 60_000)
    s, ms = divmod(rem, 1000)
    return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"


def _format_vtt_timestamp(ms: int) -> str:
    h, rem = divmod(ms, 3_600_000)
    m, rem = divmod(rem, 60_000)
    s, ms = divmod(rem, 1000)
    return f"{h:02d}:{m:02d}:{s:02d}.{ms:03d}"
