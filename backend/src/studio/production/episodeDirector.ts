import { z } from "zod";
import { ShotType } from "@prisma/client";
import { LLMProvider } from "../providers/llm/LLMProvider";
import { CAMERA_MOVES } from "../engine25d/spec";
import { directScene } from "./shotDirector";
import { DirectorContext, EpisodePlan, SceneInput, ShotPlan } from "./types";

const SHOT_TYPES = ["ESTABLISHING", "WIDE", "MEDIUM", "CLOSE_UP", "EXTREME_CLOSE_UP", "OVER_SHOULDER", "POV", "TRACKING", "LOW_ANGLE", "HIGH_ANGLE", "TOP_DOWN", "INSERT", "CUTAWAY"] as const;

const llmShotSchema = z.object({
  sceneNumber: z.number().int(),
  shots: z
    .array(
      z.object({
        shotType: z.enum(SHOT_TYPES),
        cameraMovement: z.enum(CAMERA_MOVES),
        viewerSees: z.string().min(3).max(200),
        emotionalPurpose: z.string().min(3).max(160),
      })
    )
    .min(1)
    .max(3),
});
const llmResponseSchema = z.object({ synopsis: z.string().max(600).optional(), scenes: z.array(llmShotSchema) });

const SYSTEM = `You are a documentary film director for calm, factual animated news explainers in India.
For each scene you get the narration and the rule-based shot list. You may only change, per shot: shotType,
cameraMovement, viewerSees and emotionalPurpose — keep the same number of shots per scene. Never add people
to a scene that has none, never depict violence, injury, bodies or minors, and keep camera motion restrained
(no whip pans unless a scene explicitly changes location). Return ONLY JSON:
{"synopsis":"...","scenes":[{"sceneNumber":1,"shots":[{"shotType":"WIDE","cameraMovement":"dolly_in","viewerSees":"...","emotionalPurpose":"..."}]}]}`;

function purposeFor(scene: SceneInput, i: number, total: number): string {
  if (i === 0) return "Open: establish the place and the stakes";
  if (i === total - 1) return "Close: current status and sourcing";
  if (scene.safetyLevel === "RESTRICTED") return "Carry a restricted fact through narration only";
  if (scene.dialogue.length > 0) return "Hear the verified statement";
  return "Follow the events in order";
}

/**
 * EpisodeDirector: turns the approved master script into one episode plan —
 * the emotional arc and, through the ShotDirector, every shot. An LLM may
 * refine shot grammar, but its output is validated and can never override
 * the safety rules applied by the rule-based director.
 */
export async function directEpisode(ctx: DirectorContext, scenes: SceneInput[], llm?: LLMProvider | null): Promise<EpisodePlan> {
  const planned = scenes.map((scene, i) => ({
    sceneNumber: scene.sceneNumber,
    shots: directScene(scene, ctx, { isFirst: i === 0, isLast: i === scenes.length - 1 && scenes.length > 1 }),
  }));
  const synopsis = scenes
    .slice(1, 3)
    .map((s) => s.narratorText)
    .join(" ")
    .slice(0, 400);
  const plan: EpisodePlan = {
    title: ctx.storyTitle,
    synopsis,
    emotionalArc: scenes.map((s, i) => ({ sceneNumber: s.sceneNumber, purpose: purposeFor(s, i, scenes.length) })),
    scenes: planned,
    provider: "rule-based",
  };
  if (!llm?.isConfigured()) return plan;

  try {
    const raw = await llm.completeJson<unknown>({
      system: SYSTEM,
      prompt: JSON.stringify({
        title: ctx.storyTitle,
        scenes: scenes.map((s) => ({
          sceneNumber: s.sceneNumber,
          narration: s.narratorText,
          safetyLevel: s.safetyLevel,
          tone: s.emotionalTone,
          shots: planned.find((p) => p.sceneNumber === s.sceneNumber)!.shots.map((sh) => ({ shotType: sh.shotType, cameraMovement: sh.cameraMovement, viewerSees: sh.viewerSees, hasPeople: sh.characterKeys.length > 0 })),
        })),
      }),
      maxTokens: 4000,
    });
    const parsed = llmResponseSchema.parse(raw);
    for (const sceneSuggestion of parsed.scenes) {
      const target = plan.scenes.find((p) => p.sceneNumber === sceneSuggestion.sceneNumber);
      const scene = scenes.find((s) => s.sceneNumber === sceneSuggestion.sceneNumber);
      if (!target || !scene || sceneSuggestion.shots.length !== target.shots.length) continue;
      target.shots = target.shots.map((shot, i) => mergeSuggestion(shot, sceneSuggestion.shots[i], scene));
    }
    if (parsed.synopsis) plan.synopsis = parsed.synopsis;
    plan.provider = `llm:${llm.key}`;
  } catch {
    // keep the rule-based plan
  }
  return plan;
}

function mergeSuggestion(shot: ShotPlan, s: z.infer<typeof llmShotSchema>["shots"][number], scene: SceneInput): ShotPlan {
  const peopleTypes: ShotType[] = ["MEDIUM", "CLOSE_UP", "EXTREME_CLOSE_UP", "OVER_SHOULDER"];
  // Safety: a shot without people cannot become a people shot; restricted scenes keep their substitute framing.
  if (scene.safetyLevel === "RESTRICTED" || (shot.characterKeys.length === 0 && peopleTypes.includes(s.shotType))) return shot;
  const camera = s.cameraMovement === "whip_pan" ? shot.cameraMovement : s.cameraMovement;
  return { ...shot, shotType: s.shotType, cameraMovement: camera, viewerSees: s.viewerSees, emotionalPurpose: s.emotionalPurpose };
}
