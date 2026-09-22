import { TeachingPlan, WhiteboardLessonProps } from "../types";
import { FlatAction } from "../components/WhiteboardCamera";

/** Flattens every scene's board_actions into one absolute-time list, using
 * the backend-computed `boardActionStartsMs` (build spec: the renderer
 * never invents timing — see docs/VIDEO_RENDERING.md). */
export function flattenBoardActions(props: WhiteboardLessonProps): FlatAction[] {
  const flat: FlatAction[] = [];
  props.plan.scenes.forEach((scene) => {
    const timing = props.timeline[scene.scene_id];
    if (!timing) return;
    scene.board_actions.forEach((action, i) => {
      const startMs = timing.boardActionStartsMs[i] ?? timing.startMs;
      flat.push({ id: `${scene.scene_id}__${i}`, action, startMs });
    });
  });
  return flat;
}

/** A WhiteboardErase action hides the action(s) whose id matches its
 * target_action_id from the moment the erase action starts. */
export function computeErasedIds(flatActions: FlatAction[], nowMs: number): Set<string> {
  const erased = new Set<string>();
  for (const fa of flatActions) {
    if (fa.action.action === "erase" && fa.startMs <= nowMs && fa.action.target_action_id) {
      erased.add(fa.action.target_action_id);
    }
  }
  return erased;
}

export function totalDurationMs(props: Pick<WhiteboardLessonProps, "timeline">): number {
  let max = 0;
  for (const t of Object.values(props.timeline)) {
    max = Math.max(max, t.startMs + t.durationMs);
  }
  return max;
}

export function currentSceneId(plan: TeachingPlan, timeline: WhiteboardLessonProps["timeline"], nowMs: number): string | null {
  for (const scene of plan.scenes) {
    const t = timeline[scene.scene_id];
    if (!t) continue;
    if (nowMs >= t.startMs && nowMs < t.startMs + t.durationMs) {
      return scene.scene_id;
    }
  }
  return null;
}
