import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { BoardAction } from "../types";
import { writingProgress } from "../utils/handwriting";
import { toPixelBox } from "../utils/geometry";

/** Hand-drawn-looking circle around an answer/target using the
 * `pathLength` SVG attribute so dasharray/dashoffset can be expressed as a
 * simple 0-100 percentage regardless of the ellipse's actual geometry. */
export const WhiteboardCircle: React.FC<{ action: BoardAction; startMs: number }> = ({
  action,
  startMs,
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const progress = writingProgress(frame, fps, startMs, action.duration_ms, "medium");
  if (progress <= 0) return null;

  const box = toPixelBox(action.position, width, height);
  const boxWidth = box.width ?? width * 0.2;
  const boxHeight = box.height ?? height * 0.08;
  const cx = box.left + boxWidth / 2;
  const cy = box.top + boxHeight / 2;
  const rx = boxWidth / 2 + 12;
  const ry = boxHeight / 2 + 10;

  return (
    <svg
      style={{ position: "absolute", left: 0, top: 0, overflow: "visible", pointerEvents: "none" }}
      width={width}
      height={height}
    >
      <ellipse
        cx={cx}
        cy={cy}
        rx={rx}
        ry={ry}
        fill="none"
        stroke={action.style.color}
        strokeWidth={action.style.stroke_width}
        strokeLinecap="round"
        pathLength={100}
        strokeDasharray={100}
        strokeDashoffset={100 * (1 - progress)}
      />
    </svg>
  );
};
