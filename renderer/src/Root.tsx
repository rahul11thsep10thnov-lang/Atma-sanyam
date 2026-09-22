import React from "react";
import { Composition, AnyZodObject } from "remotion";
import { WhiteboardLesson } from "./compositions/WhiteboardLesson";
import { WhiteboardLessonProps } from "./types";
import { totalDurationMs } from "./utils/timeline";
import demoProps from "../sample-input/demo_average_speed.json";

const DEFAULT_FPS = 30;

function dimensionsFor(videoFormat: string): { width: number; height: number } {
  const [w, h] = videoFormat.split("x").map(Number);
  return { width: w || 1920, height: h || 1080 };
}

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition<AnyZodObject, WhiteboardLessonProps>
        id="WhiteboardLesson"
        component={WhiteboardLesson}
        // Fallback defaults for Remotion Studio preview; actual renders
        // always pass real --props from RenderService, and calculateMetadata
        // recomputes duration/dimensions from those real props.
        durationInFrames={Math.max(30, Math.round((totalDurationMs(demoProps as WhiteboardLessonProps) / 1000) * DEFAULT_FPS))}
        fps={DEFAULT_FPS}
        width={1920}
        height={1080}
        defaultProps={demoProps as unknown as WhiteboardLessonProps}
        calculateMetadata={async ({ props }) => {
          const fps = props.plan.fps || DEFAULT_FPS;
          const { width, height } = dimensionsFor(props.plan.video_format);
          const durationMs = totalDurationMs(props);
          const durationInFrames = Math.max(1, Math.round((durationMs / 1000) * fps));
          return { fps, width, height, durationInFrames };
        }}
      />
    </>
  );
};
