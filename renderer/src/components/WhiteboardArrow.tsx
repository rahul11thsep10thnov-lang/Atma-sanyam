import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { BoardAction } from "../types";
import { writingProgress } from "../utils/handwriting";
import { toPixelBox } from "../utils/geometry";

export const WhiteboardArrow: React.FC<{ action: BoardAction; startMs: number }> = ({
  action,
  startMs,
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const progress = writingProgress(frame, fps, startMs, action.duration_ms, "medium");
  if (progress <= 0) return null;

  const box = toPixelBox(action.position, width, height);
  const dx = (box.width ?? width * 0.1) * progress;
  const dy = (box.height ?? 0) * progress;
  const x1 = box.left;
  const y1 = box.top;
  const x2 = box.left + dx;
  const y2 = box.top + dy;
  const angle = Math.atan2(y2 - y1, x2 - x1);
  const headLen = 14;

  return (
    <svg
      style={{ position: "absolute", left: 0, top: 0, overflow: "visible", pointerEvents: "none" }}
      width={width}
      height={height}
    >
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={action.style.color} strokeWidth={action.style.stroke_width} strokeLinecap="round" />
      {progress >= 0.98 && (
        <polygon
          points={`${x2},${y2} ${x2 - headLen * Math.cos(angle - Math.PI / 7)},${y2 - headLen * Math.sin(angle - Math.PI / 7)} ${x2 - headLen * Math.cos(angle + Math.PI / 7)},${y2 - headLen * Math.sin(angle + Math.PI / 7)}`}
          fill={action.style.color}
        />
      )}
    </svg>
  );
};
