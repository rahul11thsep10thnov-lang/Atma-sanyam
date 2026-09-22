import React from "react";
import { AbsoluteFill } from "remotion";
import { SubtitleSettings } from "../types";

export const SubtitleOverlay: React.FC<{ text: string; settings: SubtitleSettings }> = ({
  text,
  settings,
}) => {
  if (!settings.enabled || settings.burned_in || !text) return null;
  // Sidecar .srt/.vtt files are the default delivery (build spec section
  // 20); this in-preview overlay mirrors that same text for Remotion
  // Studio/preview convenience. "Burned in" videos instead get subtitles
  // baked by MediaProcessingService via ffmpeg (docs/VIDEO_RENDERING.md).
  return (
    <AbsoluteFill
      style={{
        justifyContent: settings.position === "bottom" ? "flex-end" : "flex-start",
        alignItems: "center",
        paddingBottom: settings.position === "bottom" ? 48 : 0,
        paddingTop: settings.position === "top" ? 48 : 0,
      }}
    >
      <div
        style={{
          maxWidth: "80%",
          padding: "8px 20px",
          backgroundColor: "rgba(0,0,0,0.55)",
          color: "#ffffff",
          fontFamily: settings.font,
          fontSize: settings.size,
          borderRadius: 6,
          textAlign: "center",
        }}
      >
        {text}
      </div>
    </AbsoluteFill>
  );
};
