import { z } from "zod";
import { CAMERA_MOVES, PARTICLE_TYPES } from "../engine25d/spec";
import { cameraPreset } from "../engine25d/camera";
import { CompositionPlan } from "./visualCompositionPlanner";
import { BuildManifestInput } from "./scenePackage";

/**
 * What an editor may change on a shot in the Shot Inspector. Overrides are
 * stored on the shot and re-applied whenever its package is rebuilt, so a
 * re-plan never silently discards an editor's decision.
 */
export const shotOverridesSchema = z
  .object({
    camera: z.object({ type: z.enum(CAMERA_MOVES).optional(), intensity: z.number().min(0).max(3).optional(), focalLength: z.number().min(10).max(200).optional() }).strict().optional(),
    focus: z.object({ aperture: z.number().min(0).max(80).optional(), focusLayerKey: z.string().max(80).optional() }).strict().optional(),
    lighting: z.object({ ambientIntensity: z.number().min(0).max(3).optional() }).strict().optional(),
    effects: z
      .object({ grain: z.number().min(0).max(0.3).optional(), vignette: z.number().min(0).max(1).optional(), bloomIntensity: z.number().min(0).max(2).optional(), saturation: z.number().min(0).max(2).optional(), contrast: z.number().min(0.5).max(2).optional() })
      .strict()
      .optional(),
    environment: z.object({ disableParticles: z.array(z.enum(PARTICLE_TYPES)).max(15).optional() }).strict().optional(),
    layers: z
      .record(
        z
          .object({
            depth: z.number().min(0).max(1).optional(),
            placement: z.object({ x: z.number().min(-1).max(2).optional(), y: z.number().min(-1).max(4).optional(), height: z.number().min(0.01).max(5).optional() }).strict().optional(),
            extraBlur: z.number().min(0).max(40).optional(),
            silhouette: z.boolean().optional(),
          })
          .strict(),
      )
      .optional(),
    /** auto = follow the MotionRequirementAnalyzer; engine25d / i2v force a renderer. */
    renderer: z.enum(["auto", "engine25d", "i2v"]).optional(),
  })
  .strict();
export type ShotOverrides = z.infer<typeof shotOverridesSchema>;

/** Translates editor overrides into manifest overrides on top of the planned composition. */
export function manifestOverridesFor(raw: unknown, comp: CompositionPlan): BuildManifestInput["overrides"] {
  const parsed = shotOverridesSchema.safeParse(raw ?? {});
  if (!parsed.success) return undefined;
  const o = parsed.data;
  const out: NonNullable<BuildManifestInput["overrides"]> = {};
  if (o.camera) {
    out.camera = cameraPreset(o.camera.type ?? comp.camera.type, o.camera.intensity ?? comp.camera.intensity, { focalLength: o.camera.focalLength ?? comp.camera.focalLength, trackLayerKey: comp.camera.trackLayerKey });
  }
  if (o.focus) out.focus = { ...comp.focus, ...(o.focus.aperture !== undefined ? { aperture: o.focus.aperture } : {}), ...(o.focus.focusLayerKey ? { focusLayerKey: o.focus.focusLayerKey } : {}) };
  if (o.lighting?.ambientIntensity !== undefined) out.lighting = { ...comp.lighting, ambient: { ...comp.lighting.ambient, intensity: o.lighting.ambientIntensity } };
  if (o.effects) {
    const e = o.effects;
    out.effects = {
      ...comp.effects,
      ...(e.grain !== undefined ? { grain: e.grain } : {}),
      ...(e.vignette !== undefined ? { vignette: e.vignette } : {}),
      ...(e.bloomIntensity !== undefined ? { bloom: { ...comp.effects.bloom, intensity: e.bloomIntensity } } : {}),
      grade: { ...comp.effects.grade, ...(e.saturation !== undefined ? { saturation: e.saturation } : {}), ...(e.contrast !== undefined ? { contrast: e.contrast } : {}) },
    };
  }
  if (o.environment?.disableParticles?.length) out.environment = { ...comp.environment, particles: comp.environment.particles.filter((p) => !o.environment!.disableParticles!.includes(p.type)) };
  if (o.layers) out.layers = Object.fromEntries(Object.entries(o.layers).map(([k, v]) => [k, { depth: v.depth, extraBlur: v.extraBlur, silhouette: v.silhouette, placement: v.placement }]));
  return out;
}

export function rendererOverride(raw: unknown): "auto" | "engine25d" | "i2v" {
  const parsed = shotOverridesSchema.safeParse(raw ?? {});
  return parsed.success ? (parsed.data.renderer ?? "auto") : "auto";
}
