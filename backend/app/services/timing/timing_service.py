"""Computes the exact scene timeline (build spec section 19). Never assumes
every sentence has the same duration — uses the ACTUAL generated audio
duration for each scene, plus configured pauses and a minimum writing time
derived from board_actions so text isn't shown before it could plausibly be
"written".
"""
from dataclasses import dataclass

from app.schemas.lesson import Scene, TeachingPlan


@dataclass
class TimedScene:
    scene_id: str
    start_ms: int
    duration_ms: int
    audio_duration_ms: int
    board_action_starts_ms: list[int]


class TimingService:
    def compute_timeline(
        self, plan: TeachingPlan, scene_audio_durations_ms: dict[str, int]
    ) -> list[TimedScene]:
        timeline: list[TimedScene] = []
        cursor_ms = 0
        for scene in plan.scenes:
            audio_ms = scene_audio_durations_ms.get(scene.scene_id, 0)
            board_min_ms = self._min_writing_time_ms(scene)
            # A scene must last at least as long as its narration AND at
            # least as long as the board actions need to visually complete.
            content_ms = max(audio_ms, board_min_ms)

            start_ms = cursor_ms + scene.pause_before_ms
            duration_ms = content_ms + scene.pause_after_ms

            action_starts = self._distribute_action_starts(scene, start_ms, content_ms)

            timeline.append(
                TimedScene(
                    scene_id=scene.scene_id,
                    start_ms=start_ms,
                    duration_ms=duration_ms,
                    audio_duration_ms=audio_ms,
                    board_action_starts_ms=action_starts,
                )
            )
            cursor_ms = start_ms + duration_ms
        return timeline

    def _min_writing_time_ms(self, scene: Scene) -> int:
        if not scene.board_actions:
            return 0
        # Sequential minimum: each action needs its own duration to draw.
        return sum(action.duration_ms for action in scene.board_actions)

    def _distribute_action_starts(self, scene: Scene, scene_start_ms: int, content_ms: int) -> list[int]:
        if not scene.board_actions:
            return []
        total_action_ms = sum(a.duration_ms for a in scene.board_actions) or 1
        starts: list[int] = []
        cursor = scene_start_ms
        for action in scene.board_actions:
            starts.append(cursor)
            # Spread actions proportionally across whichever is longer:
            # narration audio or the actions' own total draw time.
            share = action.duration_ms / total_action_ms
            cursor += int(share * content_ms) if content_ms > total_action_ms else action.duration_ms
        return starts

    def total_duration_ms(self, timeline: list[TimedScene]) -> int:
        if not timeline:
            return 0
        last = timeline[-1]
        return last.start_ms + last.duration_ms
