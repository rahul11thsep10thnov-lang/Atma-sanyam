import React from "react";
import { AbsoluteFill } from "remotion";

/** The whiteboard background: clean, off-white, subtle border — a
 * professional teaching surface rather than a literal texture
 * (docs "UI style": clean/professional/modern/simple applies to the video
 * output too). */
export const WhiteboardCanvas: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <AbsoluteFill style={{ backgroundColor: "#fdfdfb" }}>
      <AbsoluteFill
        style={{
          boxShadow: "inset 0 0 0 2px #e5e2d8",
        }}
      />
      {children}
    </AbsoluteFill>
  );
};
