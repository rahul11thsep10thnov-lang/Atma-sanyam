import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { BoardAction } from "../types";
import { writingProgress } from "../utils/handwriting";
import { toPixelBox } from "../utils/geometry";

export const WhiteboardUnderline: React.FC<{ action: BoardAction; startMs: number }> = ({
  action,
  startMs,
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const progress = writingProgress(frame, fps, startMs, action.duration_ms, "medium");
  if (progress <= 0) return null;

  const box = toPixelBox(action.position, width, height);
  const fullWidth = box.width ?? width * 0.2;
  const y = box.top + (box.height ?? 0);

  return (
    <svg
      style={{ position: "absolute", left: 0, top: 0, overflow: "visible", pointerEvents: "none" }}
      width={width}
      height={height}
    >
      <line
        x1={box.left}
        y1={y}
        x2={box.left + fullWidth * progress}
        y2={y}
        stroke={action.style.color}
        strokeWidth={action.style.stroke_width}
        strokeLinecap="round"
      />
    </svg>
  );
};

export const WhiteboardHighlight: React.FC<{ action: BoardAction; startMs: number }> = ({
  action,
  startMs,
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const progress = writingProgress(frame, fps, startMs, action.duration_ms, "medium");
  if (progress <= 0) return null;

  const box = toPixelBox(action.position, width, height);
  const fullWidth = box.width ?? width * 0.2;
  const boxHeight = box.height ?? action.style.font_size * 1.2;

  return (
    <div
      style={{
        position: "absolute",
        left: box.left,
        top: box.top,
        width: fullWidth * progress,
        height: boxHeight,
        backgroundColor: action.style.color,
        opacity: 0.35,
      }}
    />
  );
};
