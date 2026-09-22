import React from "react";
import { AbsoluteFill, Audio, Sequence, useCurrentFrame, useVideoConfig, staticFile } from "remotion";
// `audio` values in props are paths relative to STORAGE_PATH (e.g.
// "audio/scene_001_ab12.wav"); staticFile() resolves them against the
// public dir configured in remotion.config.ts.
import { WhiteboardLessonProps } from "../types";
import { WhiteboardCanvas } from "../components/WhiteboardCanvas";
import { WhiteboardCamera } from "../components/WhiteboardCamera";
import { BoardActionRenderer } from "../components/BoardActionRenderer";
import { HandCursor } from "../components/HandCursor";
import { SubtitleOverlay } from "../components/SubtitleOverlay";
import { flattenBoardActions, computeErasedIds, currentSceneId } from "../utils/timeline";

/** Pure function of (Teaching Plan JSON, audio paths, timing) -> frames.
 * No AI logic, no text generation, no calculation lives here — see
 * docs/ARCHITECTURE.md "Why the renderer has no AI logic". */
export const WhiteboardLesson: React.FC<WhiteboardLessonProps> = (props) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const nowMs = (frame / fps) * 1000;

  const flatActions = flattenBoardActions(props);
  const erasedIds = computeErasedIds(flatActions, nowMs);
  const visibleActions = flatActions.filter(
    (fa) => !["erase", "camera_zoom", "camera_pan"].includes(fa.action.action) && !erasedIds.has(fa.id)
  );

  const activeSceneId = currentSceneId(props.plan, props.timeline, nowMs);
  const activeScene = props.plan.scenes.find((s) => s.scene_id === activeSceneId);
  const handMode = activeScene?.hand_mode ?? props.plan.whiteboard.hand_mode;

  return (
    <AbsoluteFill>
      <WhiteboardCanvas>
        <WhiteboardCamera flatActions={flatActions}>
          {visibleActions.map((fa) => (
            <BoardActionRenderer
              key={fa.id}
              action={fa.action}
              startMs={fa.startMs}
              writingSpeed={props.plan.whiteboard.writing_speed}
            />
          ))}
        </WhiteboardCamera>
        <HandCursor flatActions={flatActions} handMode={handMode} />
      </WhiteboardCanvas>

      {props.plan.scenes.map((scene) => {
        const timing = props.timeline[scene.scene_id];
        const audioPath = props.audio[scene.scene_id];
        if (!timing || !audioPath) return null;
        const fromFrame = Math.round((timing.startMs / 1000) * fps);
        const durationFrames = Math.max(1, Math.round((timing.audioDurationMs / 1000) * fps));
        return (
          <Sequence key={scene.scene_id} from={fromFrame} durationInFrames={durationFrames} name={scene.scene_id}>
            <Audio src={staticFile(audioPath)} />
          </Sequence>
        );
      })}

      <SubtitleOverlay text={activeScene?.narration ?? ""} settings={props.plan.subtitles} />
    </AbsoluteFill>
  );
};
