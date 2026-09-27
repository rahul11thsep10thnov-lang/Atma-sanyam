export interface SubstituteVisual {
  id: string;
  description: string; // used as the scene's visual prompt subject
  props: string[];
  camera: string;
}

// Contextual, non-graphic stand-ins for scenes that must not be depicted.
// Nothing here shows a person being harmed, a body, a weapon in use, a
// method of self-harm, or an identifiable face.
const LIBRARY: Record<string, SubstituteVisual[]> = {
  suicide: [
    { id: "window-dusk", description: "a closed window with drawn curtains at dusk, soft light, an empty quiet room", props: ["curtains", "window"], camera: "static wide shot, very slow push-in" },
    { id: "hallway-soft", description: "an empty hallway in soft, muted light", props: ["hallway"], camera: "slow dolly forward" },
    { id: "building-dusk", description: "the exterior of a residential building at dusk, a few windows lit", props: ["building"], camera: "static wide shot" },
  ],
  sexual_violence: [
    { id: "closed-door", description: "a closed wooden door in a dim corridor", props: ["door"], camera: "static medium shot" },
    { id: "police-station", description: "the exterior of a police station with its signboard (unreadable)", props: ["police station"], camera: "slow pan right" },
    { id: "court-steps", description: "the steps and pillars of a district court building, no people", props: ["court building"], camera: "slow tilt up" },
  ],
  graphic_violence: [
    { id: "police-vehicle", description: "a parked police vehicle with its lights off on a quiet lane", props: ["police vehicle"], camera: "static wide shot" },
    { id: "cordon", description: "a police barricade across an empty lane", props: ["barricade"], camera: "slow push-in" },
    { id: "building-night", description: "the exterior of a house at night, door closed, a single light on", props: ["house"], camera: "static wide shot" },
  ],
  dead_body: [
    { id: "ambulance", description: "an ambulance parked outside a hospital, doors closed", props: ["ambulance"], camera: "static wide shot" },
    { id: "hospital-exterior", description: "a hospital building exterior at night", props: ["hospital"], camera: "slow pan left" },
    { id: "hospital-corridor", description: "an empty hospital corridor with benches", props: ["corridor", "benches"], camera: "slow dolly forward" },
  ],
  weapons: [
    { id: "evidence-envelope", description: "a sealed brown evidence envelope on a desk in a police station", props: ["envelope", "desk"], camera: "static close-up" },
    { id: "police-station-2", description: "the exterior of a police station in daylight", props: ["police station"], camera: "slow pan right" },
  ],
  nudity: [{ id: "closed-door-2", description: "a closed door with a small lamp glowing nearby", props: ["door", "lamp"], camera: "static medium shot" }],
  violence: [
    { id: "silhouettes-apart", description: "silhouettes of two adults standing apart in a doorway, backlit, no faces", props: ["doorway"], camera: "static wide shot" },
    { id: "front-door", description: "the closed front door of a modest house", props: ["door"], camera: "slow push-in" },
    { id: "ceiling-fan", description: "a slowly turning ceiling fan in a quiet, dimly lit room", props: ["ceiling fan"], camera: "static low-angle shot" },
  ],
  minors: [
    { id: "empty-swing", description: "an empty swing in a quiet playground", props: ["swing"], camera: "static wide shot" },
    { id: "school-bag", description: "a school bag resting on an empty bench", props: ["school bag", "bench"], camera: "static close-up" },
  ],
  default: [
    { id: "building-exterior", description: "the exterior of a residential building", props: ["building"], camera: "static wide shot" },
    { id: "window-day", description: "a window with sunlight coming through thin curtains", props: ["window"], camera: "slow push-in" },
  ],
};

// Topic precedence when a scene touches several.
const PRECEDENCE = ["suicide", "sexual_violence", "minors", "dead_body", "graphic_violence", "weapons", "nudity", "violence"];

/**
 * Stage: SAFE VISUAL REPLACEMENT. Picks a deterministic substitute for a
 * restricted scene. For suicide stories the ceiling-fan image is never
 * used (it implies a method; WHO media guidelines).
 */
export function pickSubstitute(topics: string[], sceneNumber: number, storyTopics: string[] = []): SubstituteVisual {
  const topic = PRECEDENCE.find((t) => topics.includes(t)) ?? "default";
  let options = LIBRARY[topic] ?? LIBRARY.default;
  if (storyTopics.includes("suicide")) options = options.filter((o) => o.id !== "ceiling-fan");
  if (options.length === 0) options = LIBRARY.default;
  return options[sceneNumber % options.length];
}

export const SUICIDE_HELPLINE_TEXT = "If you or someone you know is struggling, call Tele-MANAS 14416 (free, 24x7).";
