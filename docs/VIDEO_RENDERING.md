# Video Rendering

## Pipeline

```
Teaching Plan JSON + Audio assets + Scene timings
          |
          v
   Remotion composition "WhiteboardLesson"
          |
          v
   Rendered MP4 (per-scene, no audio muxed by Remotion)
          |
          v
   MediaProcessingService (FFmpeg): normalize audio, mux, burn subtitles,
   generate thumbnail, final encode
          |
          v
   Final MP4 in /storage/video
```

## The Teaching Plan contract

The renderer's *only* input is the Teaching Plan JSON described in
`backend/app/schemas/lesson.py` / `shared/schema/teaching_plan.schema.json`,
plus resolved local file paths for each scene's audio. The renderer performs
no AI calls, no text generation, and no calculation — it is a deterministic
function of its input, which makes it independently testable and safe to run
inside a sandbox with no external network access.

## Whiteboard engine

`renderer/src/components/` implements one React component per board action
type from build spec section 15:

- `WhiteboardText` — progressive handwriting-style reveal (see below)
- `WhiteboardFormula` — LaTeX-like formula layout with the same reveal
- `WhiteboardArrow`, `WhiteboardCircle`, `WhiteboardUnderline` — SVG stroke
  animation via `stroke-dasharray`/`stroke-dashoffset`
- `WhiteboardDiagram` — simple shape/label diagrams
- `WhiteboardErase` — wipes a region before the next action
- `WhiteboardCamera` — pan/zoom via CSS transform driven by Remotion's
  `interpolate`
- `HandCursor` — an animated marker/hand icon shown per `HAND_MODE`
  (`OFF` / `OCCASIONAL` / `CONTINUOUS`, default `OCCASIONAL`)

Each action is driven by `start_time`, `duration`, `position`, `content`,
`style`, computed by the backend's `TimingService` and passed straight
through — the renderer does not invent timing.

## Handwriting effect

`renderer/src/utils/handwriting.ts` computes, for a given frame and a
`writing_speed` config, how many characters/path-length of an action should
be visible. SVG-representable content (formulas, arrows, circles,
underlines) animates via `stroke-dashoffset`; plain text uses a
word-by-word/character reveal driven by the same progress function so both
feel like one consistent "hand speed" rather than two different effects.
`writing_speed` presets: `realistic`, `medium`, `fast` (see
`renderer/src/types.ts: WritingSpeed`).

## Aspect ratio / format

Default composition: 1920x1080 @ 30fps. Width/height/fps are Remotion
`calculateMetadata` inputs taken from the lesson JSON's `video_format`
field, so `1080x1920` (vertical) and `1080x1080` (square) work without
renderer code changes — only the backend needs to pass a different
`video_format` (build spec section 21).

## Rendering a video

The backend's `RenderService` (`backend/app/services/render/render_service.py`)
writes a props JSON file for the lesson, then invokes:

```
npx remotion render src/index.ts WhiteboardLesson <out.mp4> --props=<props.json>
```

as a subprocess, captures stdout/stderr into the `RenderJob` log, and raises
a descriptive error on non-zero exit. It never embeds Node inside the Python
process, keeping the renderer independently scalable/containerizable.

## FFmpeg post-processing

`MediaProcessingService` wraps FFmpeg for:

- loudness-normalizing narration audio before Remotion picks it up
- muxing per-scene renders (if the renderer is invoked per-scene for very
  long lessons) into one file
- burning subtitles (`.srt`) into the final MP4 when the user enables
  "burned-in" subtitles (default is separate `.srt`/`.vtt` sidecar files)
- extracting a thumbnail frame

All shell invocations live in this one service — no `subprocess` calls to
`ffmpeg` exist anywhere else in the codebase (build spec section 23).
