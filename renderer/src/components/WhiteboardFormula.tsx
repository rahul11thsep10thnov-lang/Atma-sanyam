import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { BoardAction, WritingSpeed } from "../types";
import { revealedText, writingProgress } from "../utils/handwriting";
import { toPixelBox } from "../utils/geometry";

/** Same progressive reveal as WhiteboardText but with formula-appropriate
 * styling (monospace-leaning, slightly larger, box-emphasized). */
export const WhiteboardFormula: React.FC<{
  action: BoardAction;
  startMs: number;
  writingSpeed: WritingSpeed;
}> = ({ action, startMs, writingSpeed }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const progress = writingProgress(frame, fps, startMs, action.duration_ms, writingSpeed);
  if (progress <= 0) return null;

  const box = toPixelBox(action.position, width, height);
  const text = revealedText(action.content, progress);

  return (
    <div
      style={{
        position: "absolute",
        left: box.left,
        top: box.top,
        fontFamily: "'Cambria Math', Georgia, serif",
        fontSize: action.style.font_size,
        fontWeight: action.style.bold ? 700 : 500,
        color: action.style.color,
        letterSpacing: 0.5,
      }}
    >
      {text}
    </div>
  );
};
