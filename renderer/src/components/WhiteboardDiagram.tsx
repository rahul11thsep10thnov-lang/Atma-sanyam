import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { BoardAction } from "../types";
import { writingProgress } from "../utils/handwriting";
import { toPixelBox } from "../utils/geometry";

/** A simple labeled-box diagram primitive. Complex multi-shape diagrams are
 * expressed as multiple `diagram`/`rectangle`/`arrow` actions composed
 * together by the teaching-plan generator, keeping this component (and the
 * renderer as a whole) free of any AI/layout-decision logic. */
export const WhiteboardDiagram: React.FC<{ action: BoardAction; startMs: number }> = ({
  action,
  startMs,
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const progress = writingProgress(frame, fps, startMs, action.duration_ms, "medium");
  if (progress <= 0) return null;

  const box = toPixelBox(action.position, width, height);
  const boxWidth = (box.width ?? width * 0.2) * Math.min(1, progress * 1.4);
  const boxHeight = box.height ?? height * 0.1;

  return (
    <div style={{ position: "absolute", left: box.left, top: box.top }}>
      <div
        style={{
          width: boxWidth,
          height: boxHeight,
          border: `${action.style.stroke_width}px solid ${action.style.color}`,
          borderRadius: 6,
          boxSizing: "border-box",
        }}
      />
      {progress > 0.5 && (
        <div
          style={{
            marginTop: 6,
            fontFamily: "'Segoe Print', 'Comic Sans MS', cursive, sans-serif",
            fontSize: action.style.font_size * 0.7,
            color: action.style.color,
          }}
        >
          {action.content}
        </div>
      )}
    </div>
  );
};
