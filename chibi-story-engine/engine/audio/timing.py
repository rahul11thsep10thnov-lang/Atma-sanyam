"""Where each spoken line sits on a shot's timeline, and how long the shot must be to fit them."""
from __future__ import annotations

import math
import re
from dataclasses import dataclass, field

from ..schema.story import Scene, Shot, Story

LEAD_IN = 0.3          # silence before the first line of a shot
GAP = 0.3              # silence between lines
TAIL = 0.45            # silence after the last line


@dataclass
class LineTiming:
    line_id: str
    speaker: str
    start: float
    duration: float
    envelope: list[float] | None = None      # loudness 0..1 per video frame, from the real audio when available
    audio_path: str | None = None


@dataclass
class ShotTiming:
    shot_id: str
    lines: list[LineTiming] = field(default_factory=list)

    def end(self) -> float:
        return max((l.start + l.duration for l in self.lines), default=0.0)


def estimate_seconds(text: str, seconds_per_word: float = 0.42) -> float:
    words = len(re.findall(r"[^\s,;:।?!.\"'-]+", text))
    return round(max(0.6, words * seconds_per_word + 0.2), 3)


def layout_shot(shot: Shot, durations: dict[str, float] | None = None) -> ShotTiming:
    """Lines play one after another unless a line has an explicit start_seconds."""
    cursor = LEAD_IN
    out = ShotTiming(shot.shot_id)
    for line in shot.dialogue:
        duration = (durations or {}).get(line.line_id) or estimate_seconds(line.text)
        start = line.start_seconds if line.start_seconds is not None else cursor
        out.lines.append(LineTiming(line.line_id, line.speaker, round(start, 3), round(duration, 3)))
        cursor = max(cursor, start + duration + GAP)
    return out


def synthetic_envelope(duration: float, fps: int) -> list[float]:
    """A plausible syllable rhythm for lip-sync when no audio exists yet (deterministic)."""
    n = max(1, int(round(duration * fps)))
    return [max(0.0, 0.55 + 0.45 * math.sin(i / fps * 2 * math.pi * 4.2)) * min(1.0, i / 2, (n - i) / 2) for i in range(n)]


def required_duration(shot: Shot, timing: ShotTiming) -> float:
    """Shortest shot length that fits its speech and its scheduled actions."""
    from ..schema.story import iter_actions
    need = timing.end() + TAIL if timing.lines else 0.0
    for action, start in iter_actions(shot.actions):
        need = max(need, start + (action.duration_seconds or 0.0) + 0.2)
    return need


def retime_story(story: Story, durations: dict[str, float], fps: int | None = None) -> tuple[Story, list[dict]]:
    """Return a copy of the story whose shots are long enough for their real audio (never shorter than authored actions need).

    `durations` maps line ids to measured seconds. Shots are only lengthened or tightened to the frame grid;
    the list of changes is returned so the edit can be recorded.
    """
    fps = fps or story.output.fps
    data = story.model_dump(mode="json")
    changes = []
    for scene, sd in zip(story.scenes, data["scenes"]):
        for shot, hd in zip(scene.shots, sd["shots"]):
            need = required_duration(shot, layout_shot(shot, durations))
            new = math.ceil(max(need, 1.0) * fps) / fps
            if abs(new - shot.duration_seconds) > 1e-3:        # durations are stored to 4 decimals
                changes.append({"shot_id": shot.shot_id, "from": shot.duration_seconds, "to": round(new, 4)})
                hd["duration_seconds"] = round(new, 4)
                for key in ("effects", "audio"):
                    for item in hd[key]:
                        if item.get("duration_seconds") and abs(item["start_seconds"]) < 1e-6 and \
                                abs(item["duration_seconds"] - shot.duration_seconds) < 1e-6:
                            item["duration_seconds"] = round(new, 4)      # things that spanned the shot still do
        sd["duration_seconds"] = None
    from ..schema.story import parse_story
    return parse_story(data), changes


def scene_offsets(scene: Scene) -> dict[str, float]:
    """Start time of every shot inside its scene."""
    out, t = {}, 0.0
    for shot in scene.shots:
        out[shot.shot_id] = t
        t += shot.duration_seconds
    return out
