import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import { BoardAction } from "../types";

export interface FlatAction {
  id: string;
  action: BoardAction;
  startMs: number;
}

/** Finds the most recent camera_zoom/camera_pan action that has started,
 * and drives a CSS transform on its children toward that action's target
 * (position.x/y = focus point, style.font_size reused as 0-100 "zoom
 * percent" to avoid adding a bespoke numeric field to BoardAction). Absent
 * any camera action, children render untransformed. */
export const WhiteboardCamera: React.FC<{ flatActions: FlatAction[]; children: React.ReactNode }> = ({
  flatActions,
  children,
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const nowMs = (frame / fps) * 1000;

  const cameraActions = flatActions
    .filter((fa) => fa.action.action === "camera_zoom" || fa.action.action === "camera_pan")
    .filter((fa) => fa.startMs <= nowMs)
    .sort((a, b) => a.startMs - b.startMs);

  const active = cameraActions[cameraActions.length - 1];
  if (!active) {
    return <>{children}</>;
  }

  const progress = interpolate(nowMs, [active.startMs, active.startMs + active.action.duration_ms], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const targetScale = active.action.action === "camera_zoom" ? Math.max(1, active.action.style.font_size / 36) : 1;
  const scale = interpolate(progress, [0, 1], [1, targetScale]);
  const focusX = active.action.position.x * width;
  const focusY = active.action.position.y * height;
  const originX = interpolate(progress, [0, 1], [width / 2, focusX]);
  const originY = interpolate(progress, [0, 1], [height / 2, focusY]);

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        transform: `scale(${scale})`,
        transformOrigin: `${originX}px ${originY}px`,
      }}
    >
      {children}
    </div>
  );
};
