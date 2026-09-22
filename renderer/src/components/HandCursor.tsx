import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { HandMode } from "../types";
import { FlatAction } from "./WhiteboardCamera";
import { toPixelBox } from "../utils/geometry";

/** A marker/hand indicator shown near whatever is currently being written,
 * per HAND_MODE (OFF/OCCASIONAL/CONTINUOUS, default OCCASIONAL — build
 * spec section 17: the hand should not be present continuously). */
export const HandCursor: React.FC<{ flatActions: FlatAction[]; handMode: HandMode }> = ({
  flatActions,
  handMode,
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  if (handMode === "OFF") return null;
  const nowMs = (frame / fps) * 1000;

  const writable = new Set(["write", "write_formula", "diagram"]);
  const active = flatActions.find(
    (fa) => writable.has(fa.action.action) && nowMs >= fa.startMs && nowMs < fa.startMs + fa.action.duration_ms
  );

  if (handMode === "OCCASIONAL" && !active) return null;
  if (!active) return null;

  const box = toPixelBox(active.action.position, width, height);
  const progress = Math.min(1, (nowMs - active.startMs) / Math.max(1, active.action.duration_ms));
  const x = box.left + (box.width ?? width * 0.2) * progress;
  const y = box.top + active.action.style.font_size * 0.5;

  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: 18,
        height: 18,
        borderRadius: "50%",
        backgroundColor: "#2d2d2d",
        opacity: 0.8,
        transform: "translate(2px, 2px)",
      }}
    />
  );
};
