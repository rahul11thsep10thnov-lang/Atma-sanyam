"""QualityControlService (build spec section 32). Runs deterministic,
non-AI checks over the teaching plan + timing + rendered asset metadata.
"""
from app.schemas.lesson import TeachingPlan
from app.schemas.quality import QualityIssue, QualityReportResult
from app.services.timing.timing_service import TimedScene

MAX_READABLE_CHARS_PER_LINE = 60
MIN_NARRATION_WPM = 90
MAX_NARRATION_WPM = 220
MAX_SCENE_SECONDS = 45
MAX_SILENCE_MS = 4000


class QualityControlService:
    def check(
        self,
        plan: TeachingPlan,
        timeline: list[TimedScene],
        *,
        video_duration_ms: int | None = None,
        render_succeeded: bool = True,
        render_error: str | None = None,
    ) -> QualityReportResult:
        issues: list[QualityIssue] = []
        timeline_by_id = {t.scene_id: t for t in timeline}

        if not render_succeeded:
            issues.append(
                QualityIssue(
                    type="RENDER_FAILURE",
                    message=render_error or "Rendering failed.",
                    severity="FAIL",
                )
            )

        for scene in plan.scenes:
            timed = timeline_by_id.get(scene.scene_id)

            if scene.type != "PAUSE" and not scene.narration.strip() and not scene.board_actions:
                issues.append(
                    QualityIssue(
                        type="EMPTY_SCENE",
                        message="Scene has no narration and no board actions.",
                        scene_id=scene.scene_id,
                        severity="FAIL",
                    )
                )

            if scene.type in ("SPEAK_ONLY", "WRITE_AND_SPEAK") and not scene.narration.strip():
                issues.append(
                    QualityIssue(
                        type="MISSING_NARRATION",
                        message="Scene type requires narration but none was provided.",
                        scene_id=scene.scene_id,
                        severity="FAIL",
                    )
                )

            if timed is None:
                continue

            if scene.narration.strip() and timed.audio_duration_ms <= 0:
                issues.append(
                    QualityIssue(
                        type="MISSING_AUDIO",
                        message="Scene has narration text but no generated audio duration.",
                        scene_id=scene.scene_id,
                        severity="FAIL",
                    )
                )

            if scene.narration.strip() and timed.audio_duration_ms > 0:
                word_count = len(scene.narration.split())
                wpm = word_count / (timed.audio_duration_ms / 60000)
                if wpm > MAX_NARRATION_WPM:
                    issues.append(
                        QualityIssue(
                            type="FAST_NARRATION",
                            message=f"Narration pace is {wpm:.0f} wpm, faster than natural teaching speech.",
                            scene_id=scene.scene_id,
                            severity="WARNING",
                        )
                    )

            if timed.duration_ms > MAX_SCENE_SECONDS * 1000:
                issues.append(
                    QualityIssue(
                        type="LONG_SCENE",
                        message=f"Scene lasts {timed.duration_ms / 1000:.0f}s, longer than {MAX_SCENE_SECONDS}s.",
                        scene_id=scene.scene_id,
                        severity="WARNING",
                    )
                )

            silence_ms = timed.duration_ms - timed.audio_duration_ms
            if silence_ms > MAX_SILENCE_MS:
                issues.append(
                    QualityIssue(
                        type="LONG_SILENCE",
                        message=f"Scene has {silence_ms}ms of silence after narration ends.",
                        scene_id=scene.scene_id,
                        severity="WARNING",
                    )
                )

            for action in scene.board_actions:
                if len(action.content) > MAX_READABLE_CHARS_PER_LINE and action.action in (
                    "write",
                    "write_formula",
                ):
                    issues.append(
                        QualityIssue(
                            type="UNREADABLE_BOARD_TEXT",
                            message=(
                                f"Board text '{action.content[:30]}...' is "
                                f"{len(action.content)} characters, likely too long for one line."
                            ),
                            scene_id=scene.scene_id,
                            severity="WARNING",
                        )
                    )

        if video_duration_ms is not None and timeline:
            expected_ms = timeline[-1].start_ms + timeline[-1].duration_ms
            if abs(video_duration_ms - expected_ms) > 1500:
                issues.append(
                    QualityIssue(
                        type="AV_DURATION_MISMATCH",
                        message=(
                            f"Rendered video duration {video_duration_ms}ms differs from "
                            f"expected timeline duration {expected_ms}ms by more than 1.5s."
                        ),
                        severity="WARNING",
                    )
                )

        status = "PASS"
        if any(i.severity == "FAIL" for i in issues):
            status = "FAIL"
        elif issues:
            status = "WARNING"
        return QualityReportResult(status=status, issues=issues)
