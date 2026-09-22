import React from "react";
import { BoardAction, WritingSpeed } from "../types";
import { WhiteboardText } from "./WhiteboardText";
import { WhiteboardFormula } from "./WhiteboardFormula";
import { WhiteboardCircle } from "./WhiteboardCircle";
import { WhiteboardArrow } from "./WhiteboardArrow";
import { WhiteboardUnderline, WhiteboardHighlight } from "./WhiteboardUnderline";
import { WhiteboardDiagram } from "./WhiteboardDiagram";

/** Dispatches one BoardAction to its whiteboard component. `erase` and
 * `camera_*` actions are handled upstream (WhiteboardLesson filters erased
 * targets before reaching here; WhiteboardCamera reads camera actions
 * directly) so they render nothing here. */
export const BoardActionRenderer: React.FC<{
  action: BoardAction;
  startMs: number;
  writingSpeed: WritingSpeed;
}> = ({ action, startMs, writingSpeed }) => {
  switch (action.action) {
    case "write":
      return <WhiteboardText action={action} startMs={startMs} writingSpeed={writingSpeed} />;
    case "write_formula":
      return <WhiteboardFormula action={action} startMs={startMs} writingSpeed={writingSpeed} />;
    case "circle":
      return <WhiteboardCircle action={action} startMs={startMs} />;
    case "arrow":
      return <WhiteboardArrow action={action} startMs={startMs} />;
    case "underline":
      return <WhiteboardUnderline action={action} startMs={startMs} />;
    case "highlight":
      return <WhiteboardHighlight action={action} startMs={startMs} />;
    case "diagram":
    case "rectangle":
      return <WhiteboardDiagram action={action} startMs={startMs} />;
    case "erase":
    case "camera_zoom":
    case "camera_pan":
      return null;
    default:
      return null;
  }
};
