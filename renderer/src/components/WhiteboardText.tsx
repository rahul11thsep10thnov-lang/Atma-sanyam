import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { BoardAction, WritingSpeed } from "../types";
import { revealedText, writingProgress } from "../utils/handwriting";
import { toPixelBox } from "../utils/geometry";

export const WhiteboardText: React.FC<{
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
        maxWidth: box.width ?? width * 0.8,
        fontFamily: "'Segoe Print', 'Comic Sans MS', cursive, sans-serif",
        fontSize: action.style.font_size,
        fontWeight: action.style.bold ? 700 : 400,
        color: action.style.color,
        whiteSpace: "pre-wrap",
      }}
    >
      {text}
    </div>
  );
};
